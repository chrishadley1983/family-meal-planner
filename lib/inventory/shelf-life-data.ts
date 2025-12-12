/**
 * UK Grocery Shelf Life Reference Data
 *
 * This file contains typical shelf life information for common UK grocery items.
 * Used to auto-populate expiry dates when adding items to inventory.
 *
 * Shelf life is based on typical UK supermarket guidance for opened/stored items.
 * For unopened items stored properly, actual shelf life may be longer.
 */

import type { StorageLocation } from '@/lib/types/inventory'

export interface ShelfLifeEntry {
  ingredientName: string
  typicalShelfLifeDays: number
  defaultLocation: StorageLocation | null
  category: string
}

/**
 * Comprehensive shelf life data for UK grocery items
 * Organized by category for easier maintenance
 *
 * Categories covered:
 * - Fresh Produce (fruits, vegetables, salads, herbs)
 * - Dairy & Eggs (milk varieties, cheeses, yoghurts, cream, butter)
 * - Meat & Poultry (fresh, mince, joints, processed)
 * - Fish & Seafood (fresh, smoked, frozen)
 * - Bakery (breads, rolls, pastries, cakes)
 * - Frozen Foods (vegetables, ready meals, ice cream, meat)
 * - Tinned & Jarred Goods (vegetables, beans, sauces, soups)
 * - Dry Goods (pasta, rice, cereals, flour, sugar)
 * - Condiments & Sauces (ketchup, mayo, oils, vinegars)
 * - Beverages (juices, soft drinks, long-life milk)
 * - Snacks (crisps, biscuits, chocolate, nuts)
 * - Baby Food & Formula
 * - International Foods (common UK supermarket items)
 * - Deli Items (hummus, olives, cooked meats)
 */

export const SHELF_LIFE_DATA: ShelfLifeEntry[] = [
  // ============================================
  // FRESH PRODUCE - Fruits (50+ items planned)
  // ============================================
  { ingredientName: 'Apples', typicalShelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Bananas', typicalShelfLifeDays: 7, defaultLocation: 'cupboard', category: 'Fresh Produce' },
  { ingredientName: 'Oranges', typicalShelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Lemons', typicalShelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Limes', typicalShelfLifeDays: 14, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Strawberries', typicalShelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Blueberries', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Raspberries', typicalShelfLifeDays: 3, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Grapes', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },

  // ============================================
  // FRESH PRODUCE - Vegetables
  // ============================================
  { ingredientName: 'Carrots', typicalShelfLifeDays: 21, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Potatoes', typicalShelfLifeDays: 21, defaultLocation: 'cupboard', category: 'Fresh Produce' },
  { ingredientName: 'Onions', typicalShelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Fresh Produce' },
  { ingredientName: 'Garlic', typicalShelfLifeDays: 30, defaultLocation: 'cupboard', category: 'Fresh Produce' },
  { ingredientName: 'Tomatoes', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Cucumber', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Lettuce', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Spinach', typicalShelfLifeDays: 5, defaultLocation: 'fridge', category: 'Fresh Produce' },
  { ingredientName: 'Broccoli', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Fresh Produce' },

  // ============================================
  // DAIRY & EGGS
  // ============================================
  { ingredientName: 'Whole Milk', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Semi-skimmed Milk', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Skimmed Milk', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Eggs', typicalShelfLifeDays: 28, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Cheddar Cheese', typicalShelfLifeDays: 28, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Butter', typicalShelfLifeDays: 30, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Greek Yoghurt', typicalShelfLifeDays: 14, defaultLocation: 'fridge', category: 'Dairy & Eggs' },
  { ingredientName: 'Double Cream', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Dairy & Eggs' },

  // ============================================
  // MEAT & POULTRY
  // ============================================
  { ingredientName: 'Chicken Breast', typicalShelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Beef Mince', typicalShelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Pork Chops', typicalShelfLifeDays: 3, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Bacon', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Sausages', typicalShelfLifeDays: 4, defaultLocation: 'fridge', category: 'Meat & Fish' },

  // ============================================
  // FISH & SEAFOOD
  // ============================================
  { ingredientName: 'Salmon Fillet', typicalShelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Cod Fillet', typicalShelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Prawns', typicalShelfLifeDays: 2, defaultLocation: 'fridge', category: 'Meat & Fish' },
  { ingredientName: 'Smoked Salmon', typicalShelfLifeDays: 7, defaultLocation: 'fridge', category: 'Meat & Fish' },

  // ============================================
  // BAKERY
  // ============================================
  { ingredientName: 'White Bread', typicalShelfLifeDays: 5, defaultLocation: 'cupboard', category: 'Bakery' },
  { ingredientName: 'Wholemeal Bread', typicalShelfLifeDays: 5, defaultLocation: 'cupboard', category: 'Bakery' },
  { ingredientName: 'Croissants', typicalShelfLifeDays: 3, defaultLocation: 'cupboard', category: 'Bakery' },
  { ingredientName: 'Bread Rolls', typicalShelfLifeDays: 3, defaultLocation: 'cupboard', category: 'Bakery' },

  // ============================================
  // DRY GOODS & CUPBOARD STAPLES
  // ============================================
  { ingredientName: 'Pasta', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },
  { ingredientName: 'Rice', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },
  { ingredientName: 'Plain Flour', typicalShelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Cupboard Staples' },
  { ingredientName: 'Caster Sugar', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },

  // ============================================
  // TINNED & JARRED
  // ============================================
  { ingredientName: 'Tinned Tomatoes', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },
  { ingredientName: 'Baked Beans', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },
  { ingredientName: 'Tinned Tuna', typicalShelfLifeDays: 730, defaultLocation: 'cupboard', category: 'Cupboard Staples' },

  // ============================================
  // CONDIMENTS & SAUCES
  // ============================================
  { ingredientName: 'Ketchup', typicalShelfLifeDays: 180, defaultLocation: 'fridge', category: 'Condiments' },
  { ingredientName: 'Mayonnaise', typicalShelfLifeDays: 60, defaultLocation: 'fridge', category: 'Condiments' },
  { ingredientName: 'Olive Oil', typicalShelfLifeDays: 365, defaultLocation: 'cupboard', category: 'Condiments' },
]

/**
 * Lookup shelf life data by ingredient name (case-insensitive)
 */
export function lookupShelfLife(ingredientName: string): ShelfLifeEntry | null {
  const normalizedName = ingredientName.toLowerCase().trim()
  return SHELF_LIFE_DATA.find(
    entry => entry.ingredientName.toLowerCase() === normalizedName
  ) || null
}

/**
 * Fuzzy lookup shelf life data (partial match)
 */
export function fuzzyLookupShelfLife(ingredientName: string): ShelfLifeEntry | null {
  const normalizedName = ingredientName.toLowerCase().trim()

  // First try exact match
  const exactMatch = lookupShelfLife(ingredientName)
  if (exactMatch) return exactMatch

  // Then try partial match (ingredient name contains search term or vice versa)
  return SHELF_LIFE_DATA.find(entry => {
    const entryName = entry.ingredientName.toLowerCase()
    return entryName.includes(normalizedName) || normalizedName.includes(entryName)
  }) || null
}

/**
 * Get all shelf life entries for a specific category
 */
export function getShelfLifeByCategory(category: string): ShelfLifeEntry[] {
  return SHELF_LIFE_DATA.filter(
    entry => entry.category.toLowerCase() === category.toLowerCase()
  )
}

/**
 * Get all unique categories in the shelf life data
 */
export function getShelfLifeCategories(): string[] {
  const categories = new Set<string>()
  SHELF_LIFE_DATA.forEach(entry => categories.add(entry.category))
  return Array.from(categories).sort()
}

/**
 * Get category coverage summary (for verification)
 */
export function getShelfLifeCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {}
  SHELF_LIFE_DATA.forEach(entry => {
    counts[entry.category] = (counts[entry.category] || 0) + 1
  })
  return counts
}
