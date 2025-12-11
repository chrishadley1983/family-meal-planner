/**
 * Duplicate Detection Utilities
 * Detect and handle duplicate inventory items
 */

import { normalizeIngredientName } from '@/lib/ingredient-normalization'
import type { InventoryItem, InventoryItemWithExpiry } from '@/lib/types/inventory'

/**
 * Result of a duplicate check
 */
export interface DuplicateCheckResult {
  isDuplicate: boolean
  matchType: 'exact' | 'similar' | 'none'
  matchingItems: InventoryItemWithExpiry[]
  confidence: 'high' | 'medium' | 'low'
}

/**
 * Normalize item name for comparison
 * Handles common variations in naming
 */
function normalizeForComparison(name: string): string {
  return normalizeIngredientName(name)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate similarity score between two strings
 * Returns a value between 0 (no match) and 1 (exact match)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeForComparison(str1)
  const s2 = normalizeForComparison(str2)

  // Exact match
  if (s1 === s2) return 1.0

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const shorter = s1.length < s2.length ? s1 : s2
    const longer = s1.length < s2.length ? s2 : s1
    return shorter.length / longer.length
  }

  // Word overlap
  const words1 = s1.split(/\s+/).filter(w => w.length > 2)
  const words2 = s2.split(/\s+/).filter(w => w.length > 2)

  if (words1.length === 0 || words2.length === 0) return 0

  const commonWords = words1.filter(w1 =>
    words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1))
  )

  return commonWords.length / Math.max(words1.length, words2.length)
}

/**
 * Check if a new item would be a duplicate of existing items
 */
export function checkForDuplicates(
  newItemName: string,
  existingItems: InventoryItemWithExpiry[],
  options?: {
    category?: string
    location?: string
    similarityThreshold?: number
  }
): DuplicateCheckResult {
  const threshold = options?.similarityThreshold ?? 0.7
  const normalizedNew = normalizeForComparison(newItemName)

  if (!normalizedNew) {
    return { isDuplicate: false, matchType: 'none', matchingItems: [], confidence: 'low' }
  }

  // Filter to active items only
  const activeItems = existingItems.filter(item => item.isActive)

  // Check for exact matches
  const exactMatches = activeItems.filter(item =>
    normalizeForComparison(item.itemName) === normalizedNew
  )

  if (exactMatches.length > 0) {
    return {
      isDuplicate: true,
      matchType: 'exact',
      matchingItems: exactMatches,
      confidence: 'high',
    }
  }

  // Check for similar matches
  const similarMatches: Array<{ item: InventoryItemWithExpiry; score: number }> = []

  for (const item of activeItems) {
    const score = calculateSimilarity(newItemName, item.itemName)

    if (score >= threshold) {
      // Boost score if category matches
      const categoryBoost = options?.category && item.category === options.category ? 0.1 : 0
      // Boost score if location matches
      const locationBoost = options?.location && item.location === options.location ? 0.05 : 0

      similarMatches.push({
        item,
        score: Math.min(1.0, score + categoryBoost + locationBoost),
      })
    }
  }

  if (similarMatches.length > 0) {
    // Sort by score descending
    similarMatches.sort((a, b) => b.score - a.score)

    return {
      isDuplicate: true,
      matchType: 'similar',
      matchingItems: similarMatches.map(m => m.item),
      confidence: similarMatches[0].score >= 0.9 ? 'high' : 'medium',
    }
  }

  return {
    isDuplicate: false,
    matchType: 'none',
    matchingItems: [],
    confidence: 'low',
  }
}

/**
 * Find the best matching existing item for merging
 */
export function findBestMatchForMerge(
  newItemName: string,
  existingItems: InventoryItemWithExpiry[],
  options?: {
    category?: string
    location?: string
  }
): InventoryItemWithExpiry | null {
  const result = checkForDuplicates(newItemName, existingItems, {
    ...options,
    similarityThreshold: 0.8,
  })

  if (result.isDuplicate && result.matchingItems.length > 0) {
    return result.matchingItems[0]
  }

  return null
}

/**
 * Suggest merged quantity for duplicate items
 */
export function suggestMergedQuantity(
  existingQuantity: number,
  newQuantity: number,
  existingUnit: string,
  newUnit: string
): { quantity: number; unit: string; canMerge: boolean } {
  // Same unit - simple addition
  if (existingUnit.toLowerCase() === newUnit.toLowerCase()) {
    return {
      quantity: existingQuantity + newQuantity,
      unit: existingUnit,
      canMerge: true,
    }
  }

  // Different units - can't auto-merge
  return {
    quantity: existingQuantity,
    unit: existingUnit,
    canMerge: false,
  }
}
