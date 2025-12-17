/**
 * Unified Nutrition Service
 *
 * Single source of truth for all nutrition calculations in the application.
 *
 * Priority order:
 * 1. Check if recipe already has valid cached nutrition (ingredientsHash matches)
 * 2. For each ingredient:
 *    a) Check persistent DB cache (IngredientNutritionCache)
 *    b) Check in-memory seed data cache
 *    c) Call USDA API (and save to DB cache)
 *    d) Use AI estimation as fallback (and save to DB cache)
 * 3. Aggregate and save results to recipe
 */

import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { NutrientsPer100g, UNIT_TO_GRAMS } from './types'
import {
  lookupIngredientNutrition,
  normalizeIngredientName,
  convertToGrams,
  calculateIngredientNutrition as calcIngredientNutritionFromPer100g,
} from './usda-api'
import { getCachedNutrition as getSeedDataNutrition } from './nutrition-cache'
import Anthropic from '@anthropic-ai/sdk'

// Types
export interface RecipeIngredient {
  ingredientName: string
  quantity: number
  unit: string
  notes?: string | null
  // Product ingredient fields
  isProduct?: boolean
  productId?: string | null
}

export interface NutritionResult {
  perServing: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  total: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  ingredientBreakdown: Array<{
    ingredientName: string
    nutrition: NutrientsPer100g
    source: 'product' | 'db_cache' | 'seed_data' | 'usda' | 'ai_estimate'
    confidence: 'high' | 'medium' | 'low'
  }>
  confidence: 'high' | 'medium' | 'low'
  ingredientsHash: string
  source: 'cached' | 'calculated'
}

/**
 * Calculate SHA256 hash of ingredients for change detection
 */
export function calculateIngredientsHash(ingredients: RecipeIngredient[]): string {
  // Sort ingredients by name for consistent hashing
  const sorted = [...ingredients]
    .sort((a, b) => a.ingredientName.localeCompare(b.ingredientName))
    .map(ing => ({
      name: normalizeIngredientName(ing.ingredientName).toLowerCase(),
      quantity: ing.quantity,
      unit: ing.unit.toLowerCase().trim(),
    }))

  const json = JSON.stringify(sorted)
  return createHash('sha256').update(json).digest('hex')
}

/**
 * Main unified nutrition calculation function
 *
 * This is the SINGLE entry point for all nutrition calculations.
 */
export async function getRecipeNutrition(params: {
  recipeId?: string
  ingredients: RecipeIngredient[]
  servings: number
  forceRecalculate?: boolean
}): Promise<NutritionResult> {
  const { recipeId, ingredients, servings, forceRecalculate = false } = params

  console.log(`📊 getRecipeNutrition called for ${recipeId || 'new recipe'} with ${ingredients.length} ingredients`)

  // Step 1: Calculate current ingredients hash
  const currentHash = calculateIngredientsHash(ingredients)
  console.log(`🔑 Ingredients hash: ${currentHash.substring(0, 16)}...`)

  // Step 2: Check if we can use cached nutrition from recipe
  if (recipeId && !forceRecalculate) {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: {
        ingredientsHash: true,
        nutritionCalculatedAt: true,
        nutritionSource: true,
        nutritionConfidence: true,
        caloriesPerServing: true,
        proteinPerServing: true,
        carbsPerServing: true,
        fatPerServing: true,
        fiberPerServing: true,
        sugarPerServing: true,
        sodiumPerServing: true,
        servings: true,
      },
    })

    // If hash matches and we have calculated values, return cached
    if (
      recipe?.ingredientsHash === currentHash &&
      recipe.nutritionCalculatedAt &&
      recipe.caloriesPerServing !== null
    ) {
      console.log('✅ Using cached nutrition (hash matches)')

      const perServing = {
        calories: recipe.caloriesPerServing || 0,
        protein: recipe.proteinPerServing || 0,
        carbs: recipe.carbsPerServing || 0,
        fat: recipe.fatPerServing || 0,
        fiber: recipe.fiberPerServing || 0,
        sugar: recipe.sugarPerServing || 0,
        sodium: recipe.sodiumPerServing || 0,
      }

      return {
        perServing,
        total: scaleNutrition(perServing, recipe.servings || servings),
        ingredientBreakdown: [], // Not available for cached results
        confidence: (recipe.nutritionConfidence as NutritionResult['confidence']) || 'medium',
        ingredientsHash: currentHash,
        source: 'cached',
      }
    }

    console.log('🔄 Hash mismatch or no cached data, recalculating...')
  }

  // Step 3: Calculate nutrition for each ingredient
  const breakdown: NutritionResult['ingredientBreakdown'] = []
  const totals: NutrientsPer100g = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  }

  let productHits = 0
  let dbCacheHits = 0
  let seedDataHits = 0
  let usdaHits = 0
  let aiEstimates = 0

  for (const ingredient of ingredients) {
    const result = await getIngredientNutrition(ingredient)

    addToTotals(totals, result.nutrition)
    breakdown.push({
      ingredientName: ingredient.ingredientName,
      nutrition: result.nutrition,
      source: result.source,
      confidence: result.confidence,
    })

    // Track sources for logging
    switch (result.source) {
      case 'product': productHits++; break
      case 'db_cache': dbCacheHits++; break
      case 'seed_data': seedDataHits++; break
      case 'usda': usdaHits++; break
      case 'ai_estimate': aiEstimates++; break
    }
  }

  console.log(`📊 Sources: ${productHits} products, ${dbCacheHits} DB cache, ${seedDataHits} seed data, ${usdaHits} USDA, ${aiEstimates} AI estimates`)

  // Calculate per-serving values
  const perServing = {
    calories: Math.round(totals.calories / servings),
    protein: Math.round((totals.protein / servings) * 10) / 10,
    carbs: Math.round((totals.carbs / servings) * 10) / 10,
    fat: Math.round((totals.fat / servings) * 10) / 10,
    fiber: Math.round((totals.fiber / servings) * 10) / 10,
    sugar: Math.round((totals.sugar / servings) * 10) / 10,
    sodium: Math.round(totals.sodium / servings),
  }

  // Determine overall confidence
  const totalIngredients = ingredients.length
  const highConfidenceCount = breakdown.filter(b => b.confidence === 'high').length
  let confidence: NutritionResult['confidence']

  if (highConfidenceCount >= totalIngredients * 0.9) {
    confidence = 'high'
  } else if (highConfidenceCount >= totalIngredients * 0.6) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // Step 4: Save to recipe if we have a recipeId
  if (recipeId) {
    await saveRecipeNutrition(recipeId, perServing, currentHash, confidence)
  }

  console.log(`✅ Nutrition calculated (${confidence} confidence)`)

  return {
    perServing,
    total: totals,
    ingredientBreakdown: breakdown,
    confidence,
    ingredientsHash: currentHash,
    source: 'calculated',
  }
}

/**
 * Get nutrition for a single ingredient
 * Checks: Product → DB cache → Seed data → USDA API → AI estimate
 */
async function getIngredientNutrition(ingredient: RecipeIngredient): Promise<{
  nutrition: NutrientsPer100g
  source: 'product' | 'db_cache' | 'seed_data' | 'usda' | 'ai_estimate'
  confidence: 'high' | 'medium' | 'low'
}> {
  const { ingredientName, quantity, unit, isProduct, productId } = ingredient
  const normalizedName = normalizeIngredientName(ingredientName).toLowerCase()

  // 0. Check if this is a product ingredient - use product's nutrition directly
  if (isProduct && productId) {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        caloriesPerServing: true,
        proteinPerServing: true,
        carbsPerServing: true,
        fatPerServing: true,
        fiberPerServing: true,
        sugarPerServing: true,
        sodiumPerServing: true,
      },
    })

    if (product && product.caloriesPerServing !== null) {
      // Product nutrition is per serving, so we multiply by quantity
      const nutrition: NutrientsPer100g = {
        calories: (product.caloriesPerServing || 0) * quantity,
        protein: (product.proteinPerServing || 0) * quantity,
        carbs: (product.carbsPerServing || 0) * quantity,
        fat: (product.fatPerServing || 0) * quantity,
        fiber: (product.fiberPerServing || 0) * quantity,
        sugar: (product.sugarPerServing || 0) * quantity,
        sodium: (product.sodiumPerServing || 0) * quantity,
      }

      console.log(`📦 Using product nutrition for: ${ingredientName} (${quantity}x)`)
      return {
        nutrition,
        source: 'product',
        confidence: 'high',
      }
    }
    console.log(`⚠️ Product ${productId} has no nutrition data, falling back to lookup`)
  }

  // 1. Check persistent DB cache first
  const dbCached = await prisma.ingredientNutritionCache.findFirst({
    where: {
      OR: [
        { ingredientName: { equals: ingredientName, mode: 'insensitive' } },
        { normalizedName: { equals: normalizedName, mode: 'insensitive' } },
      ],
    },
  })

  if (dbCached) {
    const per100g: NutrientsPer100g = {
      calories: dbCached.caloriesPer100g,
      protein: dbCached.proteinPer100g,
      carbs: dbCached.carbsPer100g,
      fat: dbCached.fatPer100g,
      fiber: dbCached.fiberPer100g,
      sugar: dbCached.sugarPer100g,
      sodium: dbCached.sodiumPer100g,
    }
    const nutrition = calcIngredientNutritionFromPer100g(per100g, quantity, unit, ingredientName)

    return {
      nutrition,
      source: 'db_cache',
      confidence: dbCached.confidence as 'high' | 'medium' | 'low',
    }
  }

  // 2. Check in-memory seed data cache
  const seedData = getSeedDataNutrition(ingredientName)
  if (seedData) {
    const nutrition = calcIngredientNutritionFromPer100g(seedData, quantity, unit, ingredientName)

    // Save to persistent cache for next time
    await saveToPersistentCache({
      ingredientName,
      normalizedName,
      per100g: seedData,
      source: 'seed_data',
      confidence: 'high',
    })

    return {
      nutrition,
      source: 'seed_data',
      confidence: 'high',
    }
  }

  // 3. Try USDA API
  try {
    const usdaResult = await lookupIngredientNutrition(ingredientName, quantity, unit)

    if (usdaResult) {
      // Calculate per 100g for caching
      const grams = convertToGrams(quantity, unit, ingredientName)
      const per100g = scaleNutritionTo100g(usdaResult.nutrition, grams)

      // Save to persistent cache
      await saveToPersistentCache({
        ingredientName,
        normalizedName,
        per100g,
        fdcId: usdaResult.fdcId,
        source: 'usda',
        confidence: 'high',
      })

      return {
        nutrition: usdaResult.nutrition,
        source: 'usda',
        confidence: 'high',
      }
    }
  } catch (error) {
    console.warn(`⚠️ USDA lookup failed for ${ingredientName}:`, error)
  }

  // 4. Fall back to AI estimation
  console.log(`🤖 Using AI estimate for: ${ingredientName}`)
  const aiEstimate = await getAIEstimate(ingredientName, quantity, unit)

  // Save AI estimate to cache (with low confidence)
  await saveToPersistentCache({
    ingredientName,
    normalizedName,
    per100g: aiEstimate.per100g,
    source: 'ai_estimate',
    confidence: 'low',
  })

  return {
    nutrition: aiEstimate.nutrition,
    source: 'ai_estimate',
    confidence: 'low',
  }
}

/**
 * Get AI-estimated nutrition for unknown ingredients
 */
async function getAIEstimate(
  ingredientName: string,
  quantity: number,
  unit: string
): Promise<{ nutrition: NutrientsPer100g; per100g: NutrientsPer100g }> {
  try {
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const prompt = `Estimate the nutrition per 100g for this ingredient: "${ingredientName}"

Return ONLY a valid JSON object with these exact fields:
{
  "calories": number (kcal),
  "protein": number (grams),
  "carbs": number (grams),
  "fat": number (grams),
  "fiber": number (grams),
  "sugar": number (grams),
  "sodium": number (mg)
}

Use your knowledge of food nutrition to provide reasonable estimates. Be conservative.`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0])
      const per100g: NutrientsPer100g = {
        calories: Math.round(data.calories) || 100,
        protein: Math.round((data.protein || 5) * 10) / 10,
        carbs: Math.round((data.carbs || 15) * 10) / 10,
        fat: Math.round((data.fat || 3) * 10) / 10,
        fiber: Math.round((data.fiber || 2) * 10) / 10,
        sugar: Math.round((data.sugar || 3) * 10) / 10,
        sodium: Math.round(data.sodium) || 100,
      }

      const nutrition = calcIngredientNutritionFromPer100g(per100g, quantity, unit, ingredientName)
      return { nutrition, per100g }
    }
  } catch (error) {
    console.error('❌ AI estimation failed:', error)
  }

  // Ultimate fallback: generic estimates based on ingredient type
  const per100g = getGenericEstimate(ingredientName)
  const nutrition = calcIngredientNutritionFromPer100g(per100g, quantity, unit, ingredientName)
  return { nutrition, per100g }
}

/**
 * Get generic nutrition estimate based on ingredient name patterns
 */
function getGenericEstimate(ingredientName: string): NutrientsPer100g {
  const name = ingredientName.toLowerCase()

  if (name.includes('oil') || name.includes('butter') || name.includes('fat')) {
    return { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 }
  }
  if (name.includes('meat') || name.includes('chicken') || name.includes('beef') || name.includes('pork')) {
    return { calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 70 }
  }
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) {
    return { calories: 150, protein: 22, carbs: 0, fat: 6, fiber: 0, sugar: 0, sodium: 60 }
  }
  if (name.includes('vegetable') || name.includes('veg') || name.includes('broccoli') || name.includes('carrot')) {
    return { calories: 30, protein: 2, carbs: 6, fat: 0.3, fiber: 2.5, sugar: 3, sodium: 30 }
  }
  if (name.includes('fruit') || name.includes('apple') || name.includes('banana')) {
    return { calories: 60, protein: 0.5, carbs: 15, fat: 0.2, fiber: 2, sugar: 12, sodium: 1 }
  }
  if (name.includes('rice') || name.includes('pasta') || name.includes('noodle')) {
    return { calories: 130, protein: 2.5, carbs: 28, fat: 0.3, fiber: 0.5, sugar: 0.1, sodium: 1 }
  }
  if (name.includes('cheese')) {
    return { calories: 350, protein: 22, carbs: 2, fat: 28, fiber: 0, sugar: 1, sodium: 600 }
  }
  if (name.includes('sauce') || name.includes('paste')) {
    return { calories: 50, protein: 1, carbs: 10, fat: 1, fiber: 1, sugar: 5, sodium: 400 }
  }
  if (name.includes('spice') || name.includes('herb') || name.includes('seasoning')) {
    return { calories: 250, protein: 5, carbs: 50, fat: 5, fiber: 10, sugar: 2, sodium: 50 }
  }

  // Default generic
  return { calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 2, sugar: 3, sodium: 100 }
}

/**
 * Save ingredient nutrition to persistent cache
 */
async function saveToPersistentCache(params: {
  ingredientName: string
  normalizedName: string
  per100g: NutrientsPer100g
  fdcId?: number
  source: string
  confidence: string
}): Promise<void> {
  try {
    await prisma.ingredientNutritionCache.upsert({
      where: { ingredientName: params.ingredientName },
      create: {
        ingredientName: params.ingredientName,
        normalizedName: params.normalizedName,
        fdcId: params.fdcId,
        caloriesPer100g: params.per100g.calories,
        proteinPer100g: params.per100g.protein,
        carbsPer100g: params.per100g.carbs,
        fatPer100g: params.per100g.fat,
        fiberPer100g: params.per100g.fiber,
        sugarPer100g: params.per100g.sugar,
        sodiumPer100g: params.per100g.sodium,
        source: params.source,
        confidence: params.confidence,
      },
      update: {
        normalizedName: params.normalizedName,
        fdcId: params.fdcId,
        caloriesPer100g: params.per100g.calories,
        proteinPer100g: params.per100g.protein,
        carbsPer100g: params.per100g.carbs,
        fatPer100g: params.per100g.fat,
        fiberPer100g: params.per100g.fiber,
        sugarPer100g: params.per100g.sugar,
        sodiumPer100g: params.per100g.sodium,
        source: params.source,
        confidence: params.confidence,
      },
    })
  } catch (error) {
    console.error('Failed to save to persistent cache:', error)
    // Non-fatal - continue without caching
  }
}

/**
 * Save calculated nutrition to recipe
 */
async function saveRecipeNutrition(
  recipeId: string,
  perServing: NutritionResult['perServing'],
  hash: string,
  confidence: string
): Promise<void> {
  try {
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        caloriesPerServing: perServing.calories,
        proteinPerServing: perServing.protein,
        carbsPerServing: perServing.carbs,
        fatPerServing: perServing.fat,
        fiberPerServing: perServing.fiber,
        sugarPerServing: perServing.sugar,
        sodiumPerServing: perServing.sodium,
        ingredientsHash: hash,
        nutritionCalculatedAt: new Date(),
        nutritionSource: 'calculated',
        nutritionConfidence: confidence,
        nutritionAutoCalculated: true,
      },
    })
    console.log(`💾 Saved nutrition to recipe ${recipeId}`)
  } catch (error) {
    console.error('Failed to save recipe nutrition:', error)
    throw error
  }
}

// Helper functions

function addToTotals(totals: NutrientsPer100g, addition: NutrientsPer100g): void {
  totals.calories += addition.calories
  totals.protein += addition.protein
  totals.carbs += addition.carbs
  totals.fat += addition.fat
  totals.fiber += addition.fiber
  totals.sugar += addition.sugar
  totals.sodium += addition.sodium
}

function scaleNutritionTo100g(nutrition: NutrientsPer100g, actualGrams: number): NutrientsPer100g {
  if (actualGrams === 0) return nutrition
  const factor = 100 / actualGrams

  return {
    calories: Math.round(nutrition.calories * factor),
    protein: Math.round(nutrition.protein * factor * 10) / 10,
    carbs: Math.round(nutrition.carbs * factor * 10) / 10,
    fat: Math.round(nutrition.fat * factor * 10) / 10,
    fiber: Math.round(nutrition.fiber * factor * 10) / 10,
    sugar: Math.round(nutrition.sugar * factor * 10) / 10,
    sodium: Math.round(nutrition.sodium * factor),
  }
}

function scaleNutrition(
  perServing: NutritionResult['perServing'],
  servings: number
): NutritionResult['total'] {
  return {
    calories: Math.round(perServing.calories * servings),
    protein: Math.round(perServing.protein * servings * 10) / 10,
    carbs: Math.round(perServing.carbs * servings * 10) / 10,
    fat: Math.round(perServing.fat * servings * 10) / 10,
    fiber: Math.round(perServing.fiber * servings * 10) / 10,
    sugar: Math.round(perServing.sugar * servings * 10) / 10,
    sodium: Math.round(perServing.sodium * servings),
  }
}

/**
 * Check if ingredients have changed since last nutrition calculation
 */
export async function hasIngredientsChanged(
  recipeId: string,
  currentIngredients: RecipeIngredient[]
): Promise<boolean> {
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: { ingredientsHash: true },
  })

  if (!recipe?.ingredientsHash) {
    return true // No hash means never calculated
  }

  const currentHash = calculateIngredientsHash(currentIngredients)
  return recipe.ingredientsHash !== currentHash
}
