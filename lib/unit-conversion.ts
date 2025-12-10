/**
 * Unit Conversion Utilities
 * Converts common cooking measurements to metric (grams/millilitres)
 */

// Standard conversion factors
const CONVERSIONS: Record<string, { toMetric: number; metricUnit: string; type: 'weight' | 'volume' }> = {
  // Weight conversions (to grams)
  'oz': { toMetric: 28.3495, metricUnit: 'g', type: 'weight' },
  'ounce': { toMetric: 28.3495, metricUnit: 'g', type: 'weight' },
  'ounces': { toMetric: 28.3495, metricUnit: 'g', type: 'weight' },
  'lb': { toMetric: 453.592, metricUnit: 'g', type: 'weight' },
  'lbs': { toMetric: 453.592, metricUnit: 'g', type: 'weight' },
  'pound': { toMetric: 453.592, metricUnit: 'g', type: 'weight' },
  'pounds': { toMetric: 453.592, metricUnit: 'g', type: 'weight' },
  'g': { toMetric: 1, metricUnit: 'g', type: 'weight' },
  'gram': { toMetric: 1, metricUnit: 'g', type: 'weight' },
  'grams': { toMetric: 1, metricUnit: 'g', type: 'weight' },
  'kg': { toMetric: 1000, metricUnit: 'g', type: 'weight' },
  'kilogram': { toMetric: 1000, metricUnit: 'g', type: 'weight' },
  'kilograms': { toMetric: 1000, metricUnit: 'g', type: 'weight' },

  // Volume conversions (to millilitres)
  'ml': { toMetric: 1, metricUnit: 'ml', type: 'volume' },
  'milliliter': { toMetric: 1, metricUnit: 'ml', type: 'volume' },
  'millilitre': { toMetric: 1, metricUnit: 'ml', type: 'volume' },
  'milliliters': { toMetric: 1, metricUnit: 'ml', type: 'volume' },
  'millilitres': { toMetric: 1, metricUnit: 'ml', type: 'volume' },
  'l': { toMetric: 1000, metricUnit: 'ml', type: 'volume' },
  'liter': { toMetric: 1000, metricUnit: 'ml', type: 'volume' },
  'litre': { toMetric: 1000, metricUnit: 'ml', type: 'volume' },
  'liters': { toMetric: 1000, metricUnit: 'ml', type: 'volume' },
  'litres': { toMetric: 1000, metricUnit: 'ml', type: 'volume' },
  'cup': { toMetric: 236.588, metricUnit: 'ml', type: 'volume' },
  'cups': { toMetric: 236.588, metricUnit: 'ml', type: 'volume' },
  'tbsp': { toMetric: 14.7868, metricUnit: 'ml', type: 'volume' },
  'tablespoon': { toMetric: 14.7868, metricUnit: 'ml', type: 'volume' },
  'tablespoons': { toMetric: 14.7868, metricUnit: 'ml', type: 'volume' },
  'tsp': { toMetric: 4.92892, metricUnit: 'ml', type: 'volume' },
  'teaspoon': { toMetric: 4.92892, metricUnit: 'ml', type: 'volume' },
  'teaspoons': { toMetric: 4.92892, metricUnit: 'ml', type: 'volume' },
  'fl oz': { toMetric: 29.5735, metricUnit: 'ml', type: 'volume' },
  'fluid ounce': { toMetric: 29.5735, metricUnit: 'ml', type: 'volume' },
  'fluid ounces': { toMetric: 29.5735, metricUnit: 'ml', type: 'volume' },
  'pint': { toMetric: 473.176, metricUnit: 'ml', type: 'volume' },
  'pints': { toMetric: 473.176, metricUnit: 'ml', type: 'volume' },
  'quart': { toMetric: 946.353, metricUnit: 'ml', type: 'volume' },
  'quarts': { toMetric: 946.353, metricUnit: 'ml', type: 'volume' },
  'gallon': { toMetric: 3785.41, metricUnit: 'ml', type: 'volume' },
  'gallons': { toMetric: 3785.41, metricUnit: 'ml', type: 'volume' },
}

// Units that should not be converted (count-based or already suitable)
const NON_CONVERTIBLE_UNITS = new Set([
  'piece', 'pieces', 'pcs',
  'whole', 'each',
  'clove', 'cloves',
  'slice', 'slices',
  'bunch', 'bunches',
  'sprig', 'sprigs',
  'head', 'heads',
  'stalk', 'stalks',
  'leaf', 'leaves',
  'can', 'cans',
  'jar', 'jars',
  'bottle', 'bottles',
  'pack', 'packs', 'packet', 'packets',
  'bag', 'bags',
  'box', 'boxes',
  'pinch', 'pinches',
  'dash', 'dashes',
  'handful', 'handfuls',
  'small', 'medium', 'large',
  'to taste',
])

export interface ConversionResult {
  quantity: number
  unit: string
  wasConverted: boolean
  originalQuantity: number
  originalUnit: string
}

/**
 * Normalizes a unit string for comparison
 */
function normalizeUnit(unit: string): string {
  return unit.toLowerCase().trim()
}

/**
 * Converts a quantity and unit to metric (grams or millilitres)
 * Returns the original if conversion is not applicable
 */
export function convertToMetric(quantity: number, unit: string): ConversionResult {
  const normalizedUnit = normalizeUnit(unit)

  // Check if this is a non-convertible unit
  if (NON_CONVERTIBLE_UNITS.has(normalizedUnit)) {
    return {
      quantity,
      unit,
      wasConverted: false,
      originalQuantity: quantity,
      originalUnit: unit,
    }
  }

  // Look up conversion
  const conversion = CONVERSIONS[normalizedUnit]

  if (!conversion) {
    // Unknown unit - return as-is
    return {
      quantity,
      unit,
      wasConverted: false,
      originalQuantity: quantity,
      originalUnit: unit,
    }
  }

  // Already metric - just normalize the unit name
  if (conversion.toMetric === 1) {
    return {
      quantity,
      unit: conversion.metricUnit,
      wasConverted: false,
      originalQuantity: quantity,
      originalUnit: unit,
    }
  }

  // Convert to metric
  const convertedQuantity = Math.round(quantity * conversion.toMetric * 100) / 100

  return {
    quantity: convertedQuantity,
    unit: conversion.metricUnit,
    wasConverted: true,
    originalQuantity: quantity,
    originalUnit: unit,
  }
}

/**
 * Checks if two units are compatible for combining (same type: weight or volume)
 */
export function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const normalized1 = normalizeUnit(unit1)
  const normalized2 = normalizeUnit(unit2)

  // Same unit is always compatible
  if (normalized1 === normalized2) return true

  const conv1 = CONVERSIONS[normalized1]
  const conv2 = CONVERSIONS[normalized2]

  // If either is unknown, only compatible if they're the same
  if (!conv1 || !conv2) {
    return normalized1 === normalized2
  }

  // Compatible if same type (both weight or both volume)
  return conv1.type === conv2.type
}

/**
 * Combines two quantities with potentially different units
 * Converts to a common metric unit if possible
 */
export function combineQuantities(
  qty1: number,
  unit1: string,
  qty2: number,
  unit2: string
): ConversionResult | null {
  // Convert both to metric
  const converted1 = convertToMetric(qty1, unit1)
  const converted2 = convertToMetric(qty2, unit2)

  // Check if they're compatible after conversion
  if (converted1.unit !== converted2.unit) {
    // Not compatible - can't combine
    return null
  }

  // Combine quantities
  const combinedQty = Math.round((converted1.quantity + converted2.quantity) * 100) / 100

  return {
    quantity: combinedQty,
    unit: converted1.unit,
    wasConverted: converted1.wasConverted || converted2.wasConverted,
    originalQuantity: qty1 + qty2, // Sum of original quantities (may not be meaningful)
    originalUnit: unit1, // Keep first unit as reference
  }
}

/**
 * Formats a quantity for display (removes unnecessary decimal places)
 */
export function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) {
    return quantity.toString()
  }

  // Round to 2 decimal places and remove trailing zeros
  const rounded = Math.round(quantity * 100) / 100
  return rounded.toString()
}

/**
 * Formats a quantity and unit for display
 */
export function formatQuantityWithUnit(quantity: number, unit: string): string {
  const formattedQty = formatQuantity(quantity)
  return `${formattedQty} ${unit}`
}

/**
 * Default shopping list categories with display order
 */
export const DEFAULT_CATEGORIES = [
  { name: 'Produce', displayOrder: 0 },
  { name: 'Dairy & Eggs', displayOrder: 1 },
  { name: 'Meat & Seafood', displayOrder: 2 },
  { name: 'Bakery', displayOrder: 3 },
  { name: 'Frozen', displayOrder: 4 },
  { name: 'Pantry', displayOrder: 5 },
  { name: 'Canned Goods', displayOrder: 6 },
  { name: 'Condiments & Sauces', displayOrder: 7 },
  { name: 'Beverages', displayOrder: 8 },
  { name: 'Snacks', displayOrder: 9 },
  { name: 'Household', displayOrder: 10 },
  { name: 'Other', displayOrder: 99 },
]

/**
 * Gets a normalized ingredient name for deduplication
 * Handles common variations like plural forms
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim()

  // Remove common suffixes
  const suffixesToRemove = [
    ', diced', ', chopped', ', sliced', ', minced', ', grated',
    ', fresh', ', dried', ', frozen', ', canned',
    ', large', ', medium', ', small',
    ' (optional)',
  ]

  for (const suffix of suffixesToRemove) {
    if (normalized.endsWith(suffix)) {
      normalized = normalized.slice(0, -suffix.length)
    }
  }

  // Handle common plural forms
  const pluralMappings: Record<string, string> = {
    'tomatoes': 'tomato',
    'potatoes': 'potato',
    'onions': 'onion',
    'carrots': 'carrot',
    'eggs': 'egg',
    'apples': 'apple',
    'oranges': 'orange',
    'lemons': 'lemon',
    'limes': 'lime',
    'peppers': 'pepper',
    'mushrooms': 'mushroom',
    'cloves': 'clove',
    'leaves': 'leaf',
    'breasts': 'breast',
    'thighs': 'thigh',
    'fillets': 'fillet',
  }

  if (pluralMappings[normalized]) {
    normalized = pluralMappings[normalized]
  }

  // Generic plural removal (words ending in 's' but not 'ss')
  if (normalized.endsWith('s') && !normalized.endsWith('ss') && normalized.length > 3) {
    const singular = normalized.slice(0, -1)
    // Only apply if it makes sense (basic heuristic)
    if (!['this', 'is', 'has', 'was', 'does'].includes(singular)) {
      // Keep the plural form in the mapping check already handled above
    }
  }

  return normalized.trim()
}

/**
 * Groups items by their normalized name for deduplication suggestions
 */
export interface DuplicateGroup {
  normalizedName: string
  items: Array<{
    id: string
    itemName: string
    quantity: number
    unit: string
    source?: string
  }>
  canCombine: boolean
  combinedResult?: ConversionResult
}

export function findDuplicates(
  items: Array<{
    id: string
    itemName: string
    quantity: number
    unit: string
    source?: string
  }>
): DuplicateGroup[] {
  const groups = new Map<string, DuplicateGroup>()

  for (const item of items) {
    const normalizedName = normalizeIngredientName(item.itemName)

    if (!groups.has(normalizedName)) {
      groups.set(normalizedName, {
        normalizedName,
        items: [],
        canCombine: false,
      })
    }

    groups.get(normalizedName)!.items.push(item)
  }

  // Filter to only groups with 2+ items and check if they can be combined
  const duplicateGroups: DuplicateGroup[] = []

  for (const group of groups.values()) {
    if (group.items.length < 2) continue

    // Check if all items can be combined (compatible units)
    let canCombine = true
    let combinedResult: ConversionResult | null = null

    for (let i = 1; i < group.items.length; i++) {
      if (!areUnitsCompatible(group.items[0].unit, group.items[i].unit)) {
        canCombine = false
        break
      }
    }

    if (canCombine) {
      // Calculate combined result
      combinedResult = convertToMetric(group.items[0].quantity, group.items[0].unit)

      for (let i = 1; i < group.items.length; i++) {
        const nextConverted = convertToMetric(group.items[i].quantity, group.items[i].unit)
        if (combinedResult && combinedResult.unit === nextConverted.unit) {
          combinedResult = {
            ...combinedResult,
            quantity: Math.round((combinedResult.quantity + nextConverted.quantity) * 100) / 100,
            wasConverted: combinedResult.wasConverted || nextConverted.wasConverted,
          }
        } else {
          canCombine = false
          combinedResult = null
          break
        }
      }
    }

    duplicateGroups.push({
      ...group,
      canCombine,
      combinedResult: combinedResult || undefined,
    })
  }

  return duplicateGroups
}
