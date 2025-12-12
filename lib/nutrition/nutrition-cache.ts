/**
 * Nutrition Cache
 *
 * In-memory cache with optional database persistence for ingredient nutrition data.
 * Reduces USDA API calls by caching looked-up ingredients.
 */

import { NutrientsPer100g, CachedIngredient } from './types'
import { normalizeIngredientName } from './usda-api'

// In-memory cache
const memoryCache = new Map<string, CachedIngredient>()

// Common ingredient seed data (per 100g) - fallback when USDA lookup fails
const COMMON_INGREDIENTS: Record<string, NutrientsPer100g> = {
  // Proteins
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, sodium: 74 },
  'chicken thigh': { calories: 209, protein: 26, carbs: 0, fat: 10.9, fiber: 0, sugar: 0, sodium: 84 },
  'beef mince': { calories: 254, protein: 17.2, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 66 },
  'ground beef': { calories: 254, protein: 17.2, carbs: 0, fat: 20, fiber: 0, sugar: 0, sodium: 66 },
  'pork': { calories: 242, protein: 27, carbs: 0, fat: 14, fiber: 0, sugar: 0, sodium: 62 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, sugar: 0, sodium: 59 },
  'cod': { calories: 82, protein: 18, carbs: 0, fat: 0.7, fiber: 0, sugar: 0, sodium: 54 },
  'prawns': { calories: 99, protein: 24, carbs: 0.2, fat: 0.3, fiber: 0, sugar: 0, sodium: 111 },
  'eggs': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124 },
  'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, fiber: 0, sugar: 1.1, sodium: 124 },
  'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 0.3, sugar: 0.6, sodium: 7 },

  // Dairy
  'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, fiber: 0, sugar: 5, sodium: 44 },
  'cheese': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'cheddar': { calories: 402, protein: 25, carbs: 1.3, fat: 33, fiber: 0, sugar: 0.5, sodium: 621 },
  'cream': { calories: 340, protein: 2.1, fat: 37, carbs: 2.8, fiber: 0, sugar: 2.8, sodium: 34 },
  'butter': { calories: 717, protein: 0.9, carbs: 0.1, fat: 81, fiber: 0, sugar: 0.1, sodium: 11 },
  'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.7, fiber: 0, sugar: 3.2, sodium: 36 },

  // Vegetables
  'onion': { calories: 40, protein: 1.1, carbs: 9.3, fat: 0.1, fiber: 1.7, sugar: 4.2, sodium: 4 },
  'garlic': { calories: 149, protein: 6.4, carbs: 33, fat: 0.5, fiber: 2.1, sugar: 1, sodium: 17 },
  'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'tomatoes': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, sugar: 2.6, sodium: 5 },
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6 },
  'potatoes': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, sugar: 0.8, sodium: 6 },
  'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
  'carrots': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, sugar: 4.7, sodium: 69 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, sugar: 1.7, sodium: 33 },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, sugar: 0.4, sodium: 79 },
  'pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'peppers': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'bell pepper': { calories: 31, protein: 1, carbs: 6, fat: 0.3, fiber: 2.1, sugar: 4.2, sodium: 4 },
  'mushroom': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'mushrooms': { calories: 22, protein: 3.1, carbs: 3.3, fat: 0.3, fiber: 1, sugar: 2, sodium: 5 },
  'courgette': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 2.5, sodium: 8 },
  'zucchini': { calories: 17, protein: 1.2, carbs: 3.1, fat: 0.3, fiber: 1, sugar: 2.5, sodium: 8 },
  'aubergine': { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3, sugar: 3.5, sodium: 2 },
  'eggplant': { calories: 25, protein: 1, carbs: 6, fat: 0.2, fiber: 3, sugar: 3.5, sodium: 2 },
  'cabbage': { calories: 25, protein: 1.3, carbs: 5.8, fat: 0.1, fiber: 2.5, sugar: 3.2, sodium: 18 },
  'lettuce': { calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2, fiber: 1.3, sugar: 0.8, sodium: 28 },
  'cucumber': { calories: 16, protein: 0.7, carbs: 3.6, fat: 0.1, fiber: 0.5, sugar: 1.7, sodium: 2 },
  'celery': { calories: 16, protein: 0.7, carbs: 3, fat: 0.2, fiber: 1.6, sugar: 1.3, sodium: 80 },
  'sweetcorn': { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7, sugar: 6.3, sodium: 15 },
  'corn': { calories: 86, protein: 3.3, carbs: 19, fat: 1.4, fiber: 2.7, sugar: 6.3, sodium: 15 },
  'peas': { calories: 81, protein: 5.4, carbs: 14, fat: 0.4, fiber: 5.1, sugar: 5.7, sodium: 5 },
  'green beans': { calories: 31, protein: 1.8, carbs: 7, fat: 0.1, fiber: 3.4, sugar: 3.3, sodium: 6 },

  // Grains & Carbs
  'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0, sodium: 1 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'spaghetti': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, sugar: 0.6, sodium: 1 },
  'noodles': { calories: 138, protein: 4.5, carbs: 25, fat: 2.1, fiber: 1.2, sugar: 0.5, sodium: 5 },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, sugar: 5, sodium: 491 },
  'flour': { calories: 364, protein: 10, carbs: 76, fat: 1, fiber: 2.7, sugar: 0.3, sodium: 2 },
  'oats': { calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, sugar: 1, sodium: 2 },

  // Oils & Fats
  'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 2 },
  'vegetable oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },
  'coconut oil': { calories: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, sugar: 0, sodium: 0 },

  // Legumes
  'chickpeas': { calories: 164, protein: 8.9, carbs: 27, fat: 2.6, fiber: 7.6, sugar: 4.8, sodium: 7 },
  'lentils': { calories: 116, protein: 9, carbs: 20, fat: 0.4, fiber: 7.9, sugar: 1.8, sodium: 2 },
  'black beans': { calories: 132, protein: 8.9, carbs: 24, fat: 0.5, fiber: 8.7, sugar: 0.3, sodium: 1 },
  'kidney beans': { calories: 127, protein: 8.7, carbs: 23, fat: 0.5, fiber: 6.4, sugar: 2.1, sodium: 2 },

  // Sauces & Condiments
  'soy sauce': { calories: 53, protein: 8.1, carbs: 4.9, fat: 0.6, fiber: 0.8, sugar: 0.4, sodium: 5493 },
  'tomato sauce': { calories: 29, protein: 1.3, carbs: 6.3, fat: 0.2, fiber: 1.5, sugar: 4.2, sodium: 331 },
  'tomato passata': { calories: 24, protein: 1.3, carbs: 4.4, fat: 0.2, fiber: 1.8, sugar: 3.3, sodium: 10 },
  'stock': { calories: 4, protein: 0.5, carbs: 0.3, fat: 0.1, fiber: 0, sugar: 0.2, sodium: 300 },
  'chicken stock': { calories: 4, protein: 0.5, carbs: 0.3, fat: 0.1, fiber: 0, sugar: 0.2, sodium: 300 },
  'beef stock': { calories: 7, protein: 0.7, carbs: 0.4, fat: 0.2, fiber: 0, sugar: 0.2, sodium: 300 },
  'vegetable stock': { calories: 3, protein: 0.2, carbs: 0.5, fat: 0, fiber: 0, sugar: 0.3, sodium: 250 },

  // Herbs & Spices (negligible nutrition but included for completeness)
  'salt': { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 38758 },
  'black pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20 },
  'ground pepper': { calories: 251, protein: 10, carbs: 64, fat: 3.3, fiber: 25, sugar: 0.6, sodium: 20 },
  'cumin': { calories: 375, protein: 18, carbs: 44, fat: 22, fiber: 11, sugar: 2.3, sodium: 168 },
  'paprika': { calories: 282, protein: 14, carbs: 54, fat: 13, fiber: 35, sugar: 10, sodium: 68 },
  'oregano': { calories: 265, protein: 9, carbs: 69, fat: 4.3, fiber: 43, sugar: 4.1, sodium: 25 },
  'basil': { calories: 23, protein: 3.2, carbs: 2.7, fat: 0.6, fiber: 1.6, sugar: 0.3, sodium: 4 },
  'thyme': { calories: 101, protein: 5.6, carbs: 24, fat: 1.7, fiber: 14, sugar: 0, sodium: 9 },
  'rosemary': { calories: 131, protein: 3.3, carbs: 21, fat: 5.9, fiber: 14, sugar: 0, sodium: 26 },
  'parsley': { calories: 36, protein: 3, carbs: 6.3, fat: 0.8, fiber: 3.3, sugar: 0.9, sodium: 56 },
  'coriander': { calories: 23, protein: 2.1, carbs: 3.7, fat: 0.5, fiber: 2.8, sugar: 0.9, sodium: 46 },
  'ginger': { calories: 80, protein: 1.8, carbs: 18, fat: 0.8, fiber: 2, sugar: 1.7, sodium: 13 },

  // Nuts & Seeds
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 13, sugar: 4.4, sodium: 1 },
  'walnuts': { calories: 654, protein: 15, carbs: 14, fat: 65, fiber: 6.7, sugar: 2.6, sodium: 2 },
  'peanuts': { calories: 567, protein: 26, carbs: 16, fat: 49, fiber: 8.5, sugar: 4.7, sodium: 18 },
  'cashews': { calories: 553, protein: 18, carbs: 30, fat: 44, fiber: 3.3, sugar: 5.9, sodium: 12 },
  'sesame seeds': { calories: 573, protein: 18, carbs: 23, fat: 50, fiber: 12, sugar: 0.3, sodium: 11 },

  // Fruits
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, sugar: 10, sodium: 1 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, sugar: 12, sodium: 1 },
  'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, fiber: 2.4, sugar: 9.4, sodium: 0 },
  'lemon': { calories: 29, protein: 1.1, carbs: 9.3, fat: 0.3, fiber: 2.8, sugar: 2.5, sodium: 2 },
  'lime': { calories: 30, protein: 0.7, carbs: 11, fat: 0.2, fiber: 2.8, sugar: 1.7, sodium: 2 },
}

/**
 * Get nutrition from cache or fallback data
 */
export function getCachedNutrition(ingredientName: string): NutrientsPer100g | null {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase()

  // Check memory cache first
  const cached = memoryCache.get(normalized)
  if (cached) {
    return cached.nutrientsPer100g
  }

  // Check seed data fallbacks
  if (COMMON_INGREDIENTS[normalized]) {
    return COMMON_INGREDIENTS[normalized]
  }

  // Try partial matching for common ingredients
  for (const [key, nutrition] of Object.entries(COMMON_INGREDIENTS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return nutrition
    }
  }

  return null
}

/**
 * Cache nutrition data for an ingredient
 */
export function cacheNutrition(
  ingredientName: string,
  fdcId: number,
  nutrientsPer100g: NutrientsPer100g
): void {
  const normalized = normalizeIngredientName(ingredientName).toLowerCase()

  memoryCache.set(normalized, {
    ingredientName,
    normalizedName: normalized,
    fdcId,
    nutrientsPer100g,
    lastUpdated: new Date(),
    source: 'usda',
  })
}

/**
 * Get all seed data keys (for debugging/testing)
 */
export function getCommonIngredientNames(): string[] {
  return Object.keys(COMMON_INGREDIENTS)
}

/**
 * Check if we have data for an ingredient (cached or seed)
 */
export function hasNutritionData(ingredientName: string): boolean {
  return getCachedNutrition(ingredientName) !== null
}
