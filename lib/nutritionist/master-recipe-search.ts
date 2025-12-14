/**
 * Search utility for master recipes database
 * Used by nutritionist to suggest curated recipes
 */

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export interface MasterRecipeSearchParams {
  // Content filters
  keywords?: string[]           // Search in name/description/ingredients
  cuisineType?: string
  mealCategory?: string[]       // 'breakfast', 'lunch', 'dinner', 'snack'
  dietaryTags?: string[]        // 'vegetarian', 'vegan', 'gluten-free'

  // Nutrition filters
  maxCalories?: number
  minCalories?: number
  minProtein?: number
  maxProtein?: number
  minCarbs?: number
  maxCarbs?: number
  minFat?: number
  maxFat?: number

  // Time filters
  maxTotalTime?: number         // Minutes
  maxPrepTime?: number
  maxCookTime?: number

  // Safety filters
  excludeAllergens?: string[]   // 'dairy', 'gluten', 'nuts', 'eggs', etc.

  // Pagination
  limit?: number                // Default 10
  offset?: number
}

export interface MasterRecipeSearchResult {
  id: string
  name: string
  description: string | null
  imageUrl: string | null
  sourceUrl: string
  sourceSiteName: string
  servings: number | null
  prepTimeMinutes: number | null
  cookTimeMinutes: number | null
  totalTimeMinutes: number | null
  cuisineType: string | null
  mealCategory: string[]
  dietaryTags: string[]
  allergens: string[]
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
  fiberPerServing: number | null
  dataQualityScore: number
}

/**
 * Search master recipes with flexible filtering
 */
export async function searchMasterRecipes(
  params: MasterRecipeSearchParams
): Promise<MasterRecipeSearchResult[]> {
  const {
    keywords,
    cuisineType,
    mealCategory,
    dietaryTags,
    maxCalories,
    minCalories,
    minProtein,
    maxProtein,
    minCarbs,
    maxCarbs,
    minFat,
    maxFat,
    maxTotalTime,
    maxPrepTime,
    maxCookTime,
    excludeAllergens,
    limit = 10,
    offset = 0
  } = params

  // Build where conditions
  const where: Prisma.MasterRecipeWhereInput = {
    isActive: true,
    dataQualityScore: { gte: 50 } // Only high-quality recipes
  }

  // Keyword search (name, description, ingredient names)
  if (keywords && keywords.length > 0) {
    where.OR = keywords.flatMap(keyword => [
      { name: { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
      { ingredientNames: { has: keyword.toLowerCase() } }
    ])
  }

  // Cuisine filter
  if (cuisineType) {
    where.cuisineType = { equals: cuisineType, mode: 'insensitive' }
  }

  // Meal category filter (any match)
  if (mealCategory && mealCategory.length > 0) {
    where.mealCategory = { hasSome: mealCategory }
  }

  // Dietary tags filter (must have all)
  if (dietaryTags && dietaryTags.length > 0) {
    where.dietaryTags = { hasEvery: dietaryTags }
  }

  // Nutrition filters
  if (maxCalories !== undefined) {
    where.caloriesPerServing = { ...where.caloriesPerServing as any, lte: maxCalories }
  }
  if (minCalories !== undefined) {
    where.caloriesPerServing = { ...where.caloriesPerServing as any, gte: minCalories }
  }
  if (minProtein !== undefined) {
    where.proteinPerServing = { ...where.proteinPerServing as any, gte: minProtein }
  }
  if (maxProtein !== undefined) {
    where.proteinPerServing = { ...where.proteinPerServing as any, lte: maxProtein }
  }
  if (minCarbs !== undefined) {
    where.carbsPerServing = { ...where.carbsPerServing as any, gte: minCarbs }
  }
  if (maxCarbs !== undefined) {
    where.carbsPerServing = { ...where.carbsPerServing as any, lte: maxCarbs }
  }
  if (minFat !== undefined) {
    where.fatPerServing = { ...where.fatPerServing as any, gte: minFat }
  }
  if (maxFat !== undefined) {
    where.fatPerServing = { ...where.fatPerServing as any, lte: maxFat }
  }

  // Time filters
  if (maxTotalTime !== undefined) {
    where.totalTimeMinutes = { lte: maxTotalTime }
  }
  if (maxPrepTime !== undefined) {
    where.prepTimeMinutes = { lte: maxPrepTime }
  }
  if (maxCookTime !== undefined) {
    where.cookTimeMinutes = { lte: maxCookTime }
  }

  // Allergen exclusion (none of the excluded allergens)
  if (excludeAllergens && excludeAllergens.length > 0) {
    // Recipe allergens array should not contain any of the excluded allergens
    where.NOT = excludeAllergens.map(allergen => ({
      allergens: { has: allergen }
    }))
  }

  // Execute query
  const recipes = await prisma.masterRecipe.findMany({
    where,
    include: {
      sourceSite: {
        select: { displayName: true }
      }
    },
    orderBy: [
      { dataQualityScore: 'desc' },
      { name: 'asc' }
    ],
    take: limit,
    skip: offset
  })

  // Map to result type
  return recipes.map(recipe => ({
    id: recipe.id,
    name: recipe.name,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    sourceUrl: recipe.sourceUrl,
    sourceSiteName: recipe.sourceSite.displayName,
    servings: recipe.servings,
    prepTimeMinutes: recipe.prepTimeMinutes,
    cookTimeMinutes: recipe.cookTimeMinutes,
    totalTimeMinutes: recipe.totalTimeMinutes,
    cuisineType: recipe.cuisineType,
    mealCategory: recipe.mealCategory,
    dietaryTags: recipe.dietaryTags,
    allergens: recipe.allergens,
    caloriesPerServing: recipe.caloriesPerServing,
    proteinPerServing: recipe.proteinPerServing ? Number(recipe.proteinPerServing) : null,
    carbsPerServing: recipe.carbsPerServing ? Number(recipe.carbsPerServing) : null,
    fatPerServing: recipe.fatPerServing ? Number(recipe.fatPerServing) : null,
    fiberPerServing: recipe.fiberPerServing ? Number(recipe.fiberPerServing) : null,
    dataQualityScore: recipe.dataQualityScore
  }))
}

/**
 * Search master recipes based on natural language requirements
 * Extracts filters from text like "high protein", "under 500 calories", "vegetarian"
 */
export function parseSearchRequirements(text: string): MasterRecipeSearchParams {
  const params: MasterRecipeSearchParams = {}
  const lowerText = text.toLowerCase()

  // Protein requirements
  if (lowerText.includes('high protein') || lowerText.includes('high-protein')) {
    params.minProtein = 30
  }
  if (lowerText.includes('low protein')) {
    params.maxProtein = 15
  }

  // Calorie requirements
  const calorieMatch = lowerText.match(/under (\d+) cal/)
  if (calorieMatch) {
    params.maxCalories = parseInt(calorieMatch[1])
  }
  if (lowerText.includes('low calorie') || lowerText.includes('low-calorie')) {
    params.maxCalories = 400
  }

  // Carb requirements
  if (lowerText.includes('low carb') || lowerText.includes('low-carb')) {
    params.maxCarbs = 20
  }

  // Fat requirements
  if (lowerText.includes('low fat') || lowerText.includes('low-fat')) {
    params.maxFat = 10
  }

  // Dietary tags
  const dietaryTags: string[] = []
  if (lowerText.includes('vegetarian')) dietaryTags.push('vegetarian')
  if (lowerText.includes('vegan')) dietaryTags.push('vegan')
  if (lowerText.includes('gluten-free') || lowerText.includes('gluten free')) dietaryTags.push('gluten-free')
  if (lowerText.includes('dairy-free') || lowerText.includes('dairy free')) dietaryTags.push('dairy-free')
  if (lowerText.includes('keto')) dietaryTags.push('keto')
  if (dietaryTags.length > 0) {
    params.dietaryTags = dietaryTags
  }

  // Meal categories
  const mealCategories: string[] = []
  if (lowerText.includes('breakfast')) mealCategories.push('breakfast')
  if (lowerText.includes('lunch')) mealCategories.push('lunch')
  if (lowerText.includes('dinner')) mealCategories.push('dinner')
  if (lowerText.includes('snack')) mealCategories.push('snack')
  if (mealCategories.length > 0) {
    params.mealCategory = mealCategories
  }

  // Time requirements
  if (lowerText.includes('quick') || lowerText.includes('fast') || lowerText.includes('15 min')) {
    params.maxTotalTime = 30
  }
  const timeMatch = lowerText.match(/under (\d+) min/)
  if (timeMatch) {
    params.maxTotalTime = parseInt(timeMatch[1])
  }

  // Cuisine types
  const cuisines = ['italian', 'mexican', 'indian', 'chinese', 'thai', 'japanese',
                    'mediterranean', 'greek', 'spanish', 'french', 'korean', 'vietnamese']
  for (const cuisine of cuisines) {
    if (lowerText.includes(cuisine)) {
      params.cuisineType = cuisine
      break
    }
  }

  // Protein keywords for search
  const proteins = ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'prawns',
                    'shrimp', 'turkey', 'tofu', 'tempeh']
  const foundProteins = proteins.filter(p => lowerText.includes(p))
  if (foundProteins.length > 0) {
    params.keywords = foundProteins
  }

  // Dish type keywords
  const dishes = ['pasta', 'curry', 'soup', 'stew', 'salad', 'stir-fry', 'stir fry',
                  'casserole', 'pie', 'burger', 'tacos', 'wrap', 'sandwich', 'noodles', 'rice']
  const foundDishes = dishes.filter(d => lowerText.includes(d))
  if (foundDishes.length > 0) {
    params.keywords = [...(params.keywords || []), ...foundDishes]
  }

  return params
}

/**
 * Check if a master recipe is already in user's library
 */
export async function isRecipeInUserLibrary(
  masterRecipeId: string,
  userId: string
): Promise<boolean> {
  const masterRecipe = await prisma.masterRecipe.findUnique({
    where: { id: masterRecipeId },
    select: { sourceUrl: true }
  })

  if (!masterRecipe) return false

  const existing = await prisma.recipe.findFirst({
    where: {
      userId,
      sourceUrl: masterRecipe.sourceUrl
    }
  })

  return !!existing
}

/**
 * Get master recipes that match user's profile requirements
 */
export async function getRecommendedRecipes(
  userId: string,
  profileId: string,
  limit: number = 5
): Promise<MasterRecipeSearchResult[]> {
  // Get user profile for preferences
  const profile = await prisma.familyProfile.findUnique({
    where: { id: profileId },
    select: {
      allergies: true,
      foodLikes: true,
      dailyCalorieTarget: true,
      dailyProteinTarget: true
    }
  })

  if (!profile) {
    return searchMasterRecipes({ limit })
  }

  // Build search params from profile
  const params: MasterRecipeSearchParams = { limit }

  // Exclude allergens (allergies is Json, convert to string array)
  const allergies = Array.isArray(profile.allergies) ? profile.allergies as string[] : []
  if (allergies.length > 0) {
    // Map common allergy names to allergen tags
    const allergenMap: Record<string, string> = {
      'dairy': 'dairy',
      'milk': 'dairy',
      'lactose': 'dairy',
      'gluten': 'gluten',
      'wheat': 'gluten',
      'nuts': 'nuts',
      'tree nuts': 'nuts',
      'peanuts': 'peanuts',
      'eggs': 'eggs',
      'egg': 'eggs',
      'fish': 'fish',
      'shellfish': 'shellfish',
      'soy': 'soy',
      'soya': 'soy',
      'sesame': 'sesame'
    }

    params.excludeAllergens = allergies
      .map((a: string) => allergenMap[a.toLowerCase()])
      .filter(Boolean) as string[]
  }

  // Apply dietary preferences from foodLikes
  if (profile.foodLikes && profile.foodLikes.length > 0) {
    const dietaryTags: string[] = []
    for (const pref of profile.foodLikes) {
      const lower = pref.toLowerCase()
      if (lower.includes('vegetarian')) dietaryTags.push('vegetarian')
      if (lower.includes('vegan')) dietaryTags.push('vegan')
      if (lower.includes('gluten')) dietaryTags.push('gluten-free')
      if (lower.includes('dairy')) dietaryTags.push('dairy-free')
    }
    if (dietaryTags.length > 0) {
      params.dietaryTags = dietaryTags
    }
  }

  // Target nutrition (allow some variance)
  if (profile.dailyCalorieTarget) {
    // Per-meal target is roughly daily/3, allow 50% variance
    const perMealTarget = profile.dailyCalorieTarget / 3
    params.maxCalories = Math.round(perMealTarget * 1.5)
  }

  if (profile.dailyProteinTarget) {
    // Per-meal target is roughly daily/3
    const perMealTarget = profile.dailyProteinTarget / 3
    params.minProtein = Math.round(perMealTarget * 0.5)
  }

  return searchMasterRecipes(params)
}
