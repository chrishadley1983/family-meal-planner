/**
 * Shelf Life Lookup Utilities
 * Look up shelf life data for ingredients and calculate expiry dates
 */

import type { IngredientShelfLife, StorageLocation } from '@/lib/types/inventory'
import { normalizeIngredientName } from '@/lib/ingredient-normalization'
import { calculateExpiryFromShelfLife } from './expiry-calculations'

/**
 * Result of a shelf life lookup
 */
export interface ShelfLifeLookupResult {
  found: boolean
  shelfLifeDays: number | null
  defaultLocation: StorageLocation | null
  category: string | null
  source: 'database' | 'ai' | 'default'
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Default shelf life values when no match is found
 * These are conservative estimates
 */
export const DEFAULT_SHELF_LIFE: Record<string, { days: number; location: StorageLocation }> = {
  // Fresh produce defaults
  'Fresh Produce': { days: 7, location: 'fridge' },
  'Meat & Fish': { days: 2, location: 'fridge' },
  'Dairy & Eggs': { days: 7, location: 'fridge' },
  'Bakery': { days: 3, location: 'cupboard' },
  'Chilled & Deli': { days: 3, location: 'fridge' },
  'Frozen': { days: 180, location: 'freezer' },
  'Cupboard Staples': { days: 365, location: 'cupboard' },
  'Baking & Cooking Ingredients': { days: 365, location: 'cupboard' },
  'Breakfast': { days: 90, location: 'cupboard' },
  'Drinks': { days: 7, location: 'fridge' },
  'Snacks & Treats': { days: 60, location: 'cupboard' },
  'Household': { days: 365, location: 'cupboard' },
  'Other': { days: 7, location: 'fridge' },
}

/**
 * Fallback default when category is unknown
 */
export const FALLBACK_SHELF_LIFE = { days: 7, location: 'fridge' as StorageLocation }

/**
 * Find best match in shelf life database using fuzzy matching
 */
export async function findShelfLifeMatch(
  ingredientName: string,
  shelfLifeData: IngredientShelfLife[]
): Promise<IngredientShelfLife | null> {
  const normalizedInput = normalizeIngredientName(ingredientName)

  // Try exact match first (case-insensitive)
  const exactMatch = shelfLifeData.find(
    item => item.ingredientName.toLowerCase() === ingredientName.toLowerCase()
  )
  if (exactMatch) return exactMatch

  // Try normalized match
  const normalizedMatch = shelfLifeData.find(
    item => normalizeIngredientName(item.ingredientName) === normalizedInput
  )
  if (normalizedMatch) return normalizedMatch

  // Try partial match (input contains reference or vice versa)
  const inputLower = ingredientName.toLowerCase()
  const partialMatch = shelfLifeData.find(item => {
    const refLower = item.ingredientName.toLowerCase()
    return inputLower.includes(refLower) || refLower.includes(inputLower)
  })
  if (partialMatch) return partialMatch

  // Try word-based matching (any significant word matches)
  const inputWords = normalizedInput.split(/\s+/).filter(w => w.length > 2)
  const wordMatch = shelfLifeData.find(item => {
    const refWords = normalizeIngredientName(item.ingredientName).split(/\s+/)
    return inputWords.some(iw => refWords.some(rw => rw.includes(iw) || iw.includes(rw)))
  })

  return wordMatch || null
}

/**
 * Look up shelf life for an ingredient
 * Tries database first, then falls back to category defaults
 */
export async function lookupShelfLife(
  ingredientName: string,
  category: string | null,
  shelfLifeData: IngredientShelfLife[]
): Promise<ShelfLifeLookupResult> {
  // Try to find a match in the database
  const match = await findShelfLifeMatch(ingredientName, shelfLifeData)

  if (match) {
    return {
      found: true,
      shelfLifeDays: match.shelfLifeDays,
      defaultLocation: match.defaultLocation,
      category: match.category,
      source: 'database',
      confidence: 'high',
    }
  }

  // Fall back to category defaults
  if (category && DEFAULT_SHELF_LIFE[category]) {
    const defaults = DEFAULT_SHELF_LIFE[category]
    return {
      found: false,
      shelfLifeDays: defaults.days,
      defaultLocation: defaults.location,
      category,
      source: 'default',
      confidence: 'low',
    }
  }

  // Ultimate fallback
  return {
    found: false,
    shelfLifeDays: FALLBACK_SHELF_LIFE.days,
    defaultLocation: FALLBACK_SHELF_LIFE.location,
    category: null,
    source: 'default',
    confidence: 'low',
  }
}

/**
 * Calculate expiry date and location for a new inventory item
 * Returns the expiry date and whether it was estimated
 */
export async function calculateItemExpiry(
  ingredientName: string,
  category: string | null,
  purchaseDate: Date,
  shelfLifeData: IngredientShelfLife[]
): Promise<{
  expiryDate: Date
  expiryIsEstimated: boolean
  suggestedLocation: StorageLocation | null
}> {
  const lookup = await lookupShelfLife(ingredientName, category, shelfLifeData)

  const expiryDate = calculateExpiryFromShelfLife(
    purchaseDate,
    lookup.shelfLifeDays || FALLBACK_SHELF_LIFE.days
  )

  return {
    expiryDate,
    expiryIsEstimated: true, // Always estimated when auto-calculated
    suggestedLocation: lookup.defaultLocation,
  }
}

/**
 * Get AI estimation for shelf life (stub for future implementation)
 * This will call Claude API to estimate shelf life for unknown items
 */
export async function getAIShelfLifeEstimate(
  ingredientName: string,
  category: string | null
): Promise<{
  shelfLifeDays: number
  defaultLocation: StorageLocation
  confidence: 'high' | 'medium' | 'low'
} | null> {
  // TODO: Implement AI-based shelf life estimation
  // For now, return null to fall back to defaults
  return null
}

/**
 * Convert storage method string to StorageLocation enum
 */
export function parseStorageLocation(storageMethod: string): StorageLocation | null {
  const lower = storageMethod.toLowerCase()

  if (lower.includes('fridge') || lower.includes('refrigerat')) {
    return 'fridge'
  }
  if (lower.includes('freezer') || lower.includes('frozen')) {
    return 'freezer'
  }
  if (lower.includes('cupboard') || lower.includes('cabinet')) {
    return 'cupboard'
  }
  if (lower.includes('pantry') || lower.includes('ambient') || lower.includes('room temp')) {
    return 'pantry'
  }

  return null
}

/**
 * Batch lookup shelf life for multiple items
 * More efficient than individual lookups
 */
export async function batchLookupShelfLife(
  items: Array<{ name: string; category: string | null }>,
  shelfLifeData: IngredientShelfLife[]
): Promise<Map<string, ShelfLifeLookupResult>> {
  const results = new Map<string, ShelfLifeLookupResult>()

  for (const item of items) {
    const result = await lookupShelfLife(item.name, item.category, shelfLifeData)
    results.set(item.name, result)
  }

  return results
}
