/**
 * Types for the Recipe Discovery scraping system
 */

export interface DiscoveryResult {
  urls: string[]
  site: string
  category: string
  scrapedAt: Date
}

export interface ImportResult {
  success: boolean
  recipeId?: string
  error?: string
  skipped?: boolean
  reason?: string
}

export interface ScrapingJobProgress {
  urlsDiscovered: number
  urlsProcessed: number
  urlsSucceeded: number
  urlsFailed: number
  urlsSkipped: number
}

export interface ParsedIngredient {
  name: string
  quantity: number
  unit: string
  category?: string
  original: string
}

export interface ParsedInstruction {
  stepNumber: number
  instruction: string
}

export interface ParsedRecipeData {
  name: string
  description?: string
  imageUrl?: string
  servings?: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  cuisineType?: string
  mealCategory?: string[]
  dietaryTags?: string[]
  ingredients: ParsedIngredient[]
  instructions: ParsedInstruction[]
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
  fiberPerServing?: number
  sugarPerServing?: number
  sodiumPerServing?: number
  nutritionSource?: string
}

// Common allergen categories
export const ALLERGEN_CATEGORIES = [
  'dairy',
  'gluten',
  'nuts',
  'peanuts',
  'eggs',
  'shellfish',
  'fish',
  'soy',
  'sesame',
  'celery',
  'mustard',
  'sulphites'
] as const

export type AllergenCategory = typeof ALLERGEN_CATEGORIES[number]
