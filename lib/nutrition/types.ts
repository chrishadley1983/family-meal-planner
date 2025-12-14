/**
 * Types for nutrition data from USDA FoodData Central API
 */

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

export interface USDAFoodSearchResult {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: USDANutrient[]
  brandOwner?: string
  ingredients?: string
  servingSize?: number
  servingSizeUnit?: string
}

export interface USDASearchResponse {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFoodSearchResult[]
}

export interface NutrientsPer100g {
  calories: number      // kcal
  protein: number       // g
  carbs: number         // g
  fat: number           // g
  fiber: number         // g
  sugar: number         // g
  sodium: number        // mg
}

export interface CachedIngredient {
  ingredientName: string
  normalizedName: string
  fdcId: number
  nutrientsPer100g: NutrientsPer100g
  servingSize?: number
  servingSizeUnit?: string
  lastUpdated: Date
  source: 'usda' | 'manual'
}

// USDA nutrient IDs we care about
export const USDA_NUTRIENT_IDS = {
  ENERGY: 1008,        // Energy (kcal)
  PROTEIN: 1003,       // Protein
  FAT: 1004,           // Total lipid (fat)
  CARBS: 1005,         // Carbohydrate, by difference
  FIBER: 1079,         // Fiber, total dietary
  SUGAR: 2000,         // Sugars, total including NLEA
  SODIUM: 1093,        // Sodium, Na
} as const

// Unit conversion factors to get to 100g equivalent
export const UNIT_TO_GRAMS: Record<string, number> = {
  // Weight
  'g': 1,
  'gram': 1,
  'grams': 1,
  'kg': 1000,
  'kilogram': 1000,
  'kilograms': 1000,
  'oz': 28.35,
  'ounce': 28.35,
  'ounces': 28.35,
  'lb': 453.6,
  'pound': 453.6,
  'pounds': 453.6,

  // Volume (approximate for liquids, assuming water density)
  'ml': 1,
  'millilitre': 1,
  'millilitres': 1,
  'l': 1000,
  'litre': 1000,
  'litres': 1000,

  // Common cooking measurements (approximate)
  'tsp': 5,
  'teaspoon': 5,
  'teaspoons': 5,
  'tbsp': 15,
  'tablespoon': 15,
  'tablespoons': 15,
  'cup': 240,
  'cups': 240,

  // Count-based (very approximate)
  'whole': 100,       // Default estimate
  'piece': 100,
  'pieces': 100,
  'each': 100,
  'clove': 3,         // Garlic clove
  'cloves': 3,

  // Small measurements (spices, seasonings)
  'pinch': 0.3,       // ~1/16 tsp
  'pinches': 0.3,
  'dash': 0.5,        // ~1/8 tsp
  'dashes': 0.5,
  'smidgen': 0.2,
  'drop': 0.05,
  'drops': 0.05,
}
