/**
 * USDA FoodData Central API Integration
 *
 * Provides authoritative nutrition data for ingredients.
 * Free API with 1000 requests/hour limit.
 *
 * Documentation: https://fdc.nal.usda.gov/api-guide/
 */

import {
  USDASearchResponse,
  USDAFoodSearchResult,
  NutrientsPer100g,
  USDA_NUTRIENT_IDS,
  UNIT_TO_GRAMS
} from './types'
import { getIngredientWeight, GENERIC_UNITS } from './ingredient-weights'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

/**
 * Search USDA database for a food item
 */
export async function searchUSDAFood(
  query: string,
  apiKey?: string
): Promise<USDAFoodSearchResult[]> {
  const key = apiKey || process.env.USDA_API_KEY || 'DEMO_KEY'

  // Clean up the query - remove quantities and common modifiers
  const cleanQuery = normalizeIngredientName(query)

  console.log(`🔍 USDA search: "${cleanQuery}" (original: "${query}")`)

  try {
    const response = await fetch(
      `${USDA_API_BASE}/foods/search?api_key=${key}&query=${encodeURIComponent(cleanQuery)}&pageSize=5&dataType=Foundation,SR%20Legacy`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`❌ USDA API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: USDASearchResponse = await response.json()
    console.log(`🟢 USDA found ${data.totalHits} results for "${cleanQuery}"`)

    return data.foods || []
  } catch (error) {
    console.error('❌ USDA API request failed:', error)
    return []
  }
}

/**
 * Get nutrition data for a specific food by FDC ID
 */
export async function getUSDAFoodDetails(
  fdcId: number,
  apiKey?: string
): Promise<USDAFoodSearchResult | null> {
  const key = apiKey || process.env.USDA_API_KEY || 'DEMO_KEY'

  try {
    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${key}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      console.error(`❌ USDA API error: ${response.status}`)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('❌ USDA API request failed:', error)
    return null
  }
}

/**
 * Extract nutrients per 100g from USDA food data
 */
export function extractNutrientsPer100g(food: USDAFoodSearchResult): NutrientsPer100g {
  const nutrients = food.foodNutrients || []

  const findNutrient = (nutrientId: number): number => {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId)
    return nutrient?.value || 0
  }

  return {
    calories: Math.round(findNutrient(USDA_NUTRIENT_IDS.ENERGY)),
    protein: Math.round(findNutrient(USDA_NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs: Math.round(findNutrient(USDA_NUTRIENT_IDS.CARBS) * 10) / 10,
    fat: Math.round(findNutrient(USDA_NUTRIENT_IDS.FAT) * 10) / 10,
    fiber: Math.round(findNutrient(USDA_NUTRIENT_IDS.FIBER) * 10) / 10,
    sugar: Math.round(findNutrient(USDA_NUTRIENT_IDS.SUGAR) * 10) / 10,
    sodium: Math.round(findNutrient(USDA_NUTRIENT_IDS.SODIUM)),
  }
}

/**
 * Normalize ingredient name for better USDA search matching
 */
export function normalizeIngredientName(ingredientName: string): string {
  return ingredientName
    // Remove common prefixes
    .replace(/^(fresh|frozen|canned|dried|chopped|diced|sliced|minced|grated|peeled|trimmed)\s+/gi, '')
    // Remove common suffixes
    .replace(/\s*(fresh|frozen|canned|dried|chopped|diced|sliced|minced|grated|peeled|trimmed)$/gi, '')
    // Remove preparation notes in parentheses
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    // Remove quantities and measurements that might have slipped through
    .replace(/^\d+(\.\d+)?\s*(g|kg|ml|l|oz|lb|cups?|tbsp|tsp|pieces?)\s+/gi, '')
    // Remove brand-like prefixes
    .replace(/^(organic|free-range|grass-fed|wild-caught)\s+/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Convert quantity and unit to grams
 *
 * If ingredientName is provided and unit is generic (whole, piece, etc.),
 * uses smart ingredient-specific weight lookup for more accurate conversion.
 */
export function convertToGrams(quantity: number, unit: string, ingredientName?: string): number {
  const normalizedUnit = unit.toLowerCase().trim()

  // If unit is generic AND we have an ingredient name, try smart lookup
  if (ingredientName && GENERIC_UNITS.includes(normalizedUnit)) {
    const smartWeight = getIngredientWeight(ingredientName)
    if (smartWeight !== null) {
      console.log(`🎯 Smart weight: "${ingredientName}" (${quantity} ${unit}) → ${quantity * smartWeight}g (not default ${quantity * (UNIT_TO_GRAMS[normalizedUnit] || 100)}g)`)
      return quantity * smartWeight
    } else {
      console.warn(`⚠️ No smart weight for "${ingredientName}" with unit "${unit}" - using default ${UNIT_TO_GRAMS[normalizedUnit] || 100}g per ${unit}`)
    }
  }

  const factor = UNIT_TO_GRAMS[normalizedUnit] || 100 // Default to 100g if unknown
  return quantity * factor
}

/**
 * Calculate nutrition for an ingredient based on quantity and unit
 *
 * @param nutrientsPer100g - Nutrition data per 100g
 * @param quantity - Amount of the ingredient
 * @param unit - Unit of measurement
 * @param ingredientName - Optional ingredient name for smart weight lookup
 */
export function calculateIngredientNutrition(
  nutrientsPer100g: NutrientsPer100g,
  quantity: number,
  unit: string,
  ingredientName?: string
): NutrientsPer100g {
  const grams = convertToGrams(quantity, unit, ingredientName)
  const factor = grams / 100

  return {
    calories: Math.round(nutrientsPer100g.calories * factor),
    protein: Math.round(nutrientsPer100g.protein * factor * 10) / 10,
    carbs: Math.round(nutrientsPer100g.carbs * factor * 10) / 10,
    fat: Math.round(nutrientsPer100g.fat * factor * 10) / 10,
    fiber: Math.round(nutrientsPer100g.fiber * factor * 10) / 10,
    sugar: Math.round(nutrientsPer100g.sugar * factor * 10) / 10,
    sodium: Math.round(nutrientsPer100g.sodium * factor),
  }
}

/**
 * Look up nutrition for an ingredient, using best USDA match
 */
export async function lookupIngredientNutrition(
  ingredientName: string,
  quantity: number,
  unit: string,
  apiKey?: string
): Promise<{ nutrition: NutrientsPer100g; fdcId: number; matchedName: string } | null> {
  const results = await searchUSDAFood(ingredientName, apiKey)

  if (results.length === 0) {
    console.log(`⚠️ No USDA match found for: ${ingredientName}`)
    return null
  }

  // Use the first (best) match
  const bestMatch = results[0]
  const nutrientsPer100g = extractNutrientsPer100g(bestMatch)
  const nutrition = calculateIngredientNutrition(nutrientsPer100g, quantity, unit, ingredientName)

  console.log(`✅ USDA match: "${ingredientName}" → "${bestMatch.description}" (FDC: ${bestMatch.fdcId})`)

  return {
    nutrition,
    fdcId: bestMatch.fdcId,
    matchedName: bestMatch.description,
  }
}
