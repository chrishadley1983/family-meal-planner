/**
 * Import recipes from URLs into the master recipe database
 * Reuses existing import logic, targets master_recipes table
 */

import { prisma } from '../prisma'
import { parseRecipeFromUrl, calculateNutrition } from '../claude'
import { RecipeSourceSite, MasterRecipe } from '@prisma/client'
import { ImportResult, ParsedRecipeData, ParsedIngredient } from './types'
import { detectAllergens } from './allergens'
import { calculateQualityScore } from './quality-score'

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch URL content with retry
 */
async function fetchUrlContent(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  return response.text()
}

/**
 * Convert existing recipe format to our master recipe format
 */
function normalizeRecipeData(rawRecipe: any): ParsedRecipeData {
  // Map ingredient format
  const ingredients: ParsedIngredient[] = (rawRecipe.ingredients || []).map((ing: any) => ({
    name: ing.ingredientName || ing.name || '',
    quantity: ing.quantity || 0,
    unit: ing.unit || '',
    category: ing.category,
    original: ing.notes || `${ing.quantity} ${ing.unit} ${ing.ingredientName || ing.name}`
  }))

  // Determine meal categories from mealType
  const mealCategory = Array.isArray(rawRecipe.mealType)
    ? rawRecipe.mealType.map((t: string) => t.toLowerCase())
    : rawRecipe.mealType
      ? [rawRecipe.mealType.toLowerCase()]
      : []

  // Build dietary tags
  const dietaryTags: string[] = []
  if (rawRecipe.isVegetarian) dietaryTags.push('vegetarian')
  if (rawRecipe.isVegan) dietaryTags.push('vegan')
  if (rawRecipe.isDairyFree) dietaryTags.push('dairy-free')
  if (rawRecipe.isGlutenFree) dietaryTags.push('gluten-free')
  if (rawRecipe.containsNuts === false) dietaryTags.push('nut-free')

  return {
    name: rawRecipe.recipeName || rawRecipe.name || '',
    description: rawRecipe.description || null,
    imageUrl: rawRecipe.imageUrl || null,
    servings: rawRecipe.servings || 4,
    prepTimeMinutes: rawRecipe.prepTimeMinutes || null,
    cookTimeMinutes: rawRecipe.cookTimeMinutes || null,
    cuisineType: rawRecipe.cuisineType || null,
    mealCategory,
    dietaryTags,
    ingredients,
    instructions: (rawRecipe.instructions || []).map((inst: any, idx: number) => ({
      stepNumber: inst.stepNumber || idx + 1,
      instruction: inst.instruction || ''
    })),
    caloriesPerServing: rawRecipe.caloriesPerServing,
    proteinPerServing: rawRecipe.proteinPerServing,
    carbsPerServing: rawRecipe.carbsPerServing,
    fatPerServing: rawRecipe.fatPerServing,
    fiberPerServing: rawRecipe.fiberPerServing,
    sugarPerServing: rawRecipe.sugarPerServing,
    sodiumPerServing: rawRecipe.sodiumPerServing,
    nutritionSource: rawRecipe.nutritionSource
  }
}

/**
 * Import a single recipe URL into the master database
 */
export async function importToMasterDB(
  url: string,
  sourceSite: RecipeSourceSite
): Promise<ImportResult> {
  try {
    console.log(`🔷 Importing to master DB: ${url}`)

    // Check if already exists
    const existing = await prisma.masterRecipe.findUnique({
      where: { sourceUrl: url },
      select: { id: true }
    })

    if (existing) {
      console.log(`⚠️ Already exists: ${url}`)
      return {
        success: true,
        recipeId: existing.id,
        skipped: true,
        reason: 'Already in master database'
      }
    }

    // Fetch the page content
    console.log(`   Fetching page content...`)
    const htmlContent = await fetchUrlContent(url)

    // Parse recipe using existing AI function
    console.log(`   Parsing with Claude AI...`)
    const rawRecipe = await parseRecipeFromUrl(url, htmlContent)

    if (!rawRecipe) {
      return { success: false, error: 'AI returned no data' }
    }

    // Normalize to our format
    const recipeData = normalizeRecipeData(rawRecipe)

    // Validate minimum requirements
    if (!recipeData.name || recipeData.name.length === 0) {
      return { success: false, error: 'Missing recipe name' }
    }

    if (!recipeData.ingredients || recipeData.ingredients.length === 0) {
      return { success: false, error: 'Missing ingredients' }
    }

    // Calculate nutrition if not present
    let nutritionSource = 'source_site'
    if (!recipeData.caloriesPerServing && recipeData.ingredients.length > 0) {
      try {
        console.log(`   Calculating nutrition with AI...`)
        const nutrition = await calculateNutrition(
          recipeData.ingredients.map(i => ({
            ingredientName: i.name,
            quantity: i.quantity,
            unit: i.unit
          })),
          recipeData.servings || 4
        )

        if (nutrition) {
          recipeData.caloriesPerServing = nutrition.caloriesPerServing
          recipeData.proteinPerServing = nutrition.proteinPerServing
          recipeData.carbsPerServing = nutrition.carbsPerServing
          recipeData.fatPerServing = nutrition.fatPerServing
          recipeData.fiberPerServing = nutrition.fiberPerServing
          recipeData.sugarPerServing = nutrition.sugarPerServing
          recipeData.sodiumPerServing = nutrition.sodiumPerServing
          nutritionSource = 'ai_estimated'
        }
      } catch (err) {
        console.warn(`   ⚠️ Nutrition calculation failed, continuing without:`, err)
      }
    }

    // Derive allergens from ingredients
    const allergens = detectAllergens(recipeData.ingredients)

    // Flatten ingredient names for search
    const ingredientNames = recipeData.ingredients.map(i => i.name.toLowerCase())

    // Calculate quality score
    const qualityScore = calculateQualityScore(recipeData)

    // Calculate total time
    const totalTimeMinutes = (recipeData.prepTimeMinutes || 0) + (recipeData.cookTimeMinutes || 0)

    console.log(`   Creating master recipe record...`)

    // Save to master DB
    const recipe = await prisma.masterRecipe.create({
      data: {
        sourceUrl: url,
        sourceSiteId: sourceSite.id,
        sourceScrapedAt: new Date(),

        name: recipeData.name,
        description: recipeData.description,
        imageUrl: recipeData.imageUrl,
        servings: recipeData.servings,
        prepTimeMinutes: recipeData.prepTimeMinutes,
        cookTimeMinutes: recipeData.cookTimeMinutes,
        totalTimeMinutes: totalTimeMinutes || null,

        cuisineType: recipeData.cuisineType,
        mealCategory: recipeData.mealCategory || [],
        dietaryTags: recipeData.dietaryTags || [],

        ingredients: recipeData.ingredients as any,
        ingredientNames,
        instructions: recipeData.instructions as any,

        caloriesPerServing: recipeData.caloriesPerServing,
        proteinPerServing: recipeData.proteinPerServing,
        carbsPerServing: recipeData.carbsPerServing,
        fatPerServing: recipeData.fatPerServing,
        fiberPerServing: recipeData.fiberPerServing,
        sugarPerServing: recipeData.sugarPerServing,
        sodiumPerServing: recipeData.sodiumPerServing,
        nutritionSource,

        allergens,
        dataQualityScore: qualityScore,
        isActive: qualityScore >= 50 // Only show high-quality recipes to users
      }
    })

    console.log(`🟢 Successfully imported: "${recipe.name}" (quality: ${qualityScore})`)
    return { success: true, recipeId: recipe.id }

  } catch (error) {
    console.error(`❌ Failed to import ${url}:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

/**
 * Batch import multiple URLs
 */
export async function batchImportToMasterDB(
  urls: string[],
  sourceSite: RecipeSourceSite,
  options?: {
    delayBetweenUrls?: number
    onProgress?: (current: number, total: number, result: ImportResult) => void
  }
): Promise<{
  succeeded: string[]
  failed: { url: string; error: string }[]
  skipped: { url: string; reason: string }[]
}> {
  const { delayBetweenUrls = 2000, onProgress } = options || {}

  const results = {
    succeeded: [] as string[],
    failed: [] as { url: string; error: string }[],
    skipped: [] as { url: string; reason: string }[]
  }

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]
    const result = await importToMasterDB(url, sourceSite)

    if (result.success && !result.skipped) {
      results.succeeded.push(url)
    } else if (result.skipped) {
      results.skipped.push({ url, reason: result.reason || 'Unknown' })
    } else {
      results.failed.push({ url, error: result.error || 'Unknown error' })
    }

    if (onProgress) {
      onProgress(i + 1, urls.length, result)
    }

    // Rate limiting
    if (i < urls.length - 1 && !result.skipped) {
      await sleep(delayBetweenUrls)
    }
  }

  return results
}

/**
 * Add a master recipe to a user's personal collection
 */
export async function addMasterRecipeToUserLibrary(
  masterRecipeId: string,
  userId: string
): Promise<ImportResult> {
  try {
    // Get master recipe
    const masterRecipe = await prisma.masterRecipe.findUnique({
      where: { id: masterRecipeId },
      include: {
        sourceSite: { select: { displayName: true } }
      }
    })

    if (!masterRecipe) {
      return { success: false, error: 'Master recipe not found' }
    }

    // Check for duplicate in user's library
    const existing = await prisma.recipe.findFirst({
      where: {
        userId,
        sourceUrl: masterRecipe.sourceUrl
      }
    })

    if (existing) {
      return {
        success: false,
        skipped: true,
        reason: 'Recipe already in your library',
        recipeId: existing.id
      }
    }

    // Parse ingredients from JSON
    const ingredients = masterRecipe.ingredients as any[]
    const instructions = masterRecipe.instructions as any[]

    // Create user's copy of the recipe
    const userRecipe = await prisma.recipe.create({
      data: {
        userId,

        // Core data
        recipeName: masterRecipe.name,
        description: masterRecipe.description,
        imageUrl: masterRecipe.imageUrl,
        servings: masterRecipe.servings || 4,
        prepTimeMinutes: masterRecipe.prepTimeMinutes,
        cookTimeMinutes: masterRecipe.cookTimeMinutes,
        totalTimeMinutes: masterRecipe.totalTimeMinutes,

        // Categorisation
        cuisineType: masterRecipe.cuisineType,
        mealType: masterRecipe.mealCategory,

        // Dietary flags (derive from dietaryTags)
        isVegetarian: masterRecipe.dietaryTags.includes('vegetarian'),
        isVegan: masterRecipe.dietaryTags.includes('vegan'),
        isDairyFree: masterRecipe.dietaryTags.includes('dairy-free'),
        isGlutenFree: masterRecipe.dietaryTags.includes('gluten-free'),
        containsNuts: masterRecipe.allergens.includes('nuts') || masterRecipe.allergens.includes('peanuts'),
        containsMeat: !masterRecipe.dietaryTags.includes('vegetarian') && !masterRecipe.dietaryTags.includes('vegan'),
        containsSeafood: masterRecipe.allergens.includes('fish') || masterRecipe.allergens.includes('shellfish'),

        // Nutrition
        caloriesPerServing: masterRecipe.caloriesPerServing,
        proteinPerServing: masterRecipe.proteinPerServing ? Number(masterRecipe.proteinPerServing) : null,
        carbsPerServing: masterRecipe.carbsPerServing ? Number(masterRecipe.carbsPerServing) : null,
        fatPerServing: masterRecipe.fatPerServing ? Number(masterRecipe.fatPerServing) : null,
        fiberPerServing: masterRecipe.fiberPerServing ? Number(masterRecipe.fiberPerServing) : null,
        sugarPerServing: masterRecipe.sugarPerServing ? Number(masterRecipe.sugarPerServing) : null,
        sodiumPerServing: masterRecipe.sodiumPerServing,
        nutritionAutoCalculated: masterRecipe.nutritionSource !== 'source_site',
        nutritionSource: masterRecipe.nutritionSource,

        // Source tracking
        recipeSource: `master_db:${masterRecipe.sourceSite.displayName}`,
        sourceUrl: masterRecipe.sourceUrl,

        // Create ingredients
        ingredients: {
          create: ingredients.map((ing: any, idx: number) => ({
            ingredientName: ing.name,
            quantity: ing.quantity || 0,
            unit: ing.unit || '',
            category: ing.category || null,
            notes: ing.original !== ing.name ? ing.original : null,
            sortOrder: idx
          }))
        },

        // Create instructions
        instructions: {
          create: instructions.map((inst: any, idx: number) => ({
            stepNumber: inst.stepNumber || idx + 1,
            instruction: inst.instruction,
            sortOrder: idx
          }))
        }
      },
      include: {
        ingredients: true,
        instructions: true
      }
    })

    return { success: true, recipeId: userRecipe.id }

  } catch (error) {
    console.error('❌ Failed to add master recipe to user library:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
