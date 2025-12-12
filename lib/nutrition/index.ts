/**
 * Nutrition Service
 *
 * Provides consistent, authoritative nutrition calculations using:
 * 1. In-memory cache (fastest)
 * 2. Seed data for common ingredients (fast, consistent)
 * 3. USDA FoodData Central API (authoritative, but slower)
 *
 * This replaces AI-estimated nutrition with actual nutritional data.
 */

import { NutrientsPer100g, UNIT_TO_GRAMS } from './types'
import {
  lookupIngredientNutrition,
  calculateIngredientNutrition,
  normalizeIngredientName,
  convertToGrams,
} from './usda-api'
import {
  getCachedNutrition,
  cacheNutrition,
  hasNutritionData,
} from './nutrition-cache'

export interface RecipeIngredient {
  ingredientName: string
  quantity: number
  unit: string
  notes?: string
}

export interface RecipeNutrition {
  perServing: NutrientsPer100g
  total: NutrientsPer100g
  ingredientBreakdown: Array<{
    ingredientName: string
    nutrition: NutrientsPer100g
    source: 'cache' | 'usda' | 'estimate'
  }>
  confidence: 'high' | 'medium' | 'low'  // Based on how many ingredients had USDA matches
}

/**
 * Calculate nutrition for a complete recipe
 * Uses cache first, then USDA API, with intelligent fallbacks
 */
export async function calculateRecipeNutrition(
  ingredients: RecipeIngredient[],
  servings: number = 4,
  useUSDAApi: boolean = true // Set false to only use cache/seed data
): Promise<RecipeNutrition> {
  const breakdown: RecipeNutrition['ingredientBreakdown'] = []

  let cachedCount = 0
  let usdaCount = 0
  let estimateCount = 0

  const totals: NutrientsPer100g = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  }

  for (const ingredient of ingredients) {
    const { ingredientName, quantity, unit } = ingredient

    // Step 1: Try cache/seed data first (fastest, most consistent)
    const cachedNutrition = getCachedNutrition(ingredientName)

    if (cachedNutrition) {
      const nutrition = calculateIngredientNutrition(cachedNutrition, quantity, unit)
      addToTotals(totals, nutrition)
      breakdown.push({ ingredientName, nutrition, source: 'cache' })
      cachedCount++
      continue
    }

    // Step 2: Try USDA API if enabled
    if (useUSDAApi) {
      try {
        const usdaResult = await lookupIngredientNutrition(ingredientName, quantity, unit)

        if (usdaResult) {
          addToTotals(totals, usdaResult.nutrition)
          breakdown.push({ ingredientName, nutrition: usdaResult.nutrition, source: 'usda' })

          // Cache for future use
          const grams = convertToGrams(quantity, unit)
          const per100g = scaleNutritionTo100g(usdaResult.nutrition, grams)
          cacheNutrition(ingredientName, usdaResult.fdcId, per100g)

          usdaCount++
          continue
        }
      } catch (error) {
        console.warn(`⚠️ USDA lookup failed for ${ingredientName}:`, error)
      }
    }

    // Step 3: Use rough estimate for unknown ingredients
    // This is a conservative fallback - better than nothing
    const estimatedNutrition = estimateNutrition(ingredientName, quantity, unit)
    addToTotals(totals, estimatedNutrition)
    breakdown.push({ ingredientName, nutrition: estimatedNutrition, source: 'estimate' })
    estimateCount++
  }

  // Calculate per-serving values
  const perServing: NutrientsPer100g = {
    calories: Math.round(totals.calories / servings),
    protein: Math.round((totals.protein / servings) * 10) / 10,
    carbs: Math.round((totals.carbs / servings) * 10) / 10,
    fat: Math.round((totals.fat / servings) * 10) / 10,
    fiber: Math.round((totals.fiber / servings) * 10) / 10,
    sugar: Math.round((totals.sugar / servings) * 10) / 10,
    sodium: Math.round(totals.sodium / servings),
  }

  // Determine confidence based on data sources
  const totalIngredients = ingredients.length
  const knownIngredients = cachedCount + usdaCount
  let confidence: RecipeNutrition['confidence']

  if (knownIngredients >= totalIngredients * 0.9) {
    confidence = 'high'
  } else if (knownIngredients >= totalIngredients * 0.6) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  console.log(`📊 Nutrition calculated: ${cachedCount} cached, ${usdaCount} USDA, ${estimateCount} estimated (${confidence} confidence)`)

  return {
    perServing,
    total: totals,
    ingredientBreakdown: breakdown,
    confidence,
  }
}

/**
 * Quick nutrition calculation using only cache/seed data (no API calls)
 * Use this for real-time UI updates where speed matters
 */
export function calculateRecipeNutritionSync(
  ingredients: RecipeIngredient[],
  servings: number = 4
): RecipeNutrition {
  const breakdown: RecipeNutrition['ingredientBreakdown'] = []

  const totals: NutrientsPer100g = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
  }

  let cachedCount = 0
  let estimateCount = 0

  for (const ingredient of ingredients) {
    const { ingredientName, quantity, unit } = ingredient

    const cachedNutrition = getCachedNutrition(ingredientName)

    if (cachedNutrition) {
      const nutrition = calculateIngredientNutrition(cachedNutrition, quantity, unit)
      addToTotals(totals, nutrition)
      breakdown.push({ ingredientName, nutrition, source: 'cache' })
      cachedCount++
    } else {
      const estimatedNutrition = estimateNutrition(ingredientName, quantity, unit)
      addToTotals(totals, estimatedNutrition)
      breakdown.push({ ingredientName, nutrition: estimatedNutrition, source: 'estimate' })
      estimateCount++
    }
  }

  const perServing: NutrientsPer100g = {
    calories: Math.round(totals.calories / servings),
    protein: Math.round((totals.protein / servings) * 10) / 10,
    carbs: Math.round((totals.carbs / servings) * 10) / 10,
    fat: Math.round((totals.fat / servings) * 10) / 10,
    fiber: Math.round((totals.fiber / servings) * 10) / 10,
    sugar: Math.round((totals.sugar / servings) * 10) / 10,
    sodium: Math.round(totals.sodium / servings),
  }

  const totalIngredients = ingredients.length
  const confidence: RecipeNutrition['confidence'] =
    cachedCount >= totalIngredients * 0.9 ? 'high' :
    cachedCount >= totalIngredients * 0.6 ? 'medium' : 'low'

  return {
    perServing,
    total: totals,
    ingredientBreakdown: breakdown,
    confidence,
  }
}

// Helper: Add nutrition values to totals
function addToTotals(totals: NutrientsPer100g, addition: NutrientsPer100g): void {
  totals.calories += addition.calories
  totals.protein += addition.protein
  totals.carbs += addition.carbs
  totals.fat += addition.fat
  totals.fiber += addition.fiber
  totals.sugar += addition.sugar
  totals.sodium += addition.sodium
}

// Helper: Scale nutrition to per-100g equivalent
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

// Helper: Rough estimate for completely unknown ingredients
// This is conservative - assumes average food values
function estimateNutrition(ingredientName: string, quantity: number, unit: string): NutrientsPer100g {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase()
  const grams = convertToGrams(quantity, unit)
  const factor = grams / 100

  // Try to categorize the unknown ingredient for better estimates
  let base: NutrientsPer100g

  if (normalized.includes('oil') || normalized.includes('fat')) {
    base = { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 }
  } else if (normalized.includes('sauce') || normalized.includes('paste')) {
    base = { calories: 50, protein: 1, carbs: 10, fat: 1, fiber: 1, sugar: 5, sodium: 400 }
  } else if (normalized.includes('spice') || normalized.includes('herb') || normalized.includes('seasoning')) {
    base = { calories: 250, protein: 5, carbs: 50, fat: 5, fiber: 10, sugar: 2, sodium: 50 }
  } else if (normalized.includes('vegetable') || normalized.includes('veg')) {
    base = { calories: 25, protein: 1.5, carbs: 5, fat: 0.2, fiber: 2, sugar: 2, sodium: 10 }
  } else if (normalized.includes('fruit')) {
    base = { calories: 50, protein: 0.5, carbs: 12, fat: 0.2, fiber: 2, sugar: 10, sodium: 1 }
  } else if (normalized.includes('meat') || normalized.includes('chicken') || normalized.includes('beef') || normalized.includes('pork')) {
    base = { calories: 200, protein: 25, carbs: 0, fat: 10, fiber: 0, sugar: 0, sodium: 70 }
  } else if (normalized.includes('fish') || normalized.includes('seafood')) {
    base = { calories: 100, protein: 20, carbs: 0, fat: 2, fiber: 0, sugar: 0, sodium: 80 }
  } else {
    // Generic average
    base = { calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 2, sugar: 3, sodium: 100 }
  }

  return {
    calories: Math.round(base.calories * factor),
    protein: Math.round(base.protein * factor * 10) / 10,
    carbs: Math.round(base.carbs * factor * 10) / 10,
    fat: Math.round(base.fat * factor * 10) / 10,
    fiber: Math.round(base.fiber * factor * 10) / 10,
    sugar: Math.round(base.sugar * factor * 10) / 10,
    sodium: Math.round(base.sodium * factor),
  }
}

// Re-export types and utilities
export type { NutrientsPer100g } from './types'
export { normalizeIngredientName, convertToGrams } from './usda-api'
export { getCachedNutrition, hasNutritionData, getCommonIngredientNames } from './nutrition-cache'
