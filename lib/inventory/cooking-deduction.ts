/**
 * Cooking Deduction Utilities
 *
 * Handles deducting ingredients from inventory when a meal is cooked.
 * Supports partial matches and unit conversions.
 */

import { prisma } from '@/lib/prisma'
import type { CookingDeductionItem, CookingDeductionResult, StorageLocation } from '@/lib/types/inventory'

interface RecipeIngredient {
  ingredientName: string
  quantity: number
  unit: string
}

interface InventoryItem {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: StorageLocation | null
  isActive: boolean
}

// Small quantity thresholds (default values)
const DEFAULT_SMALL_QTY_GRAMS = 5
const DEFAULT_SMALL_QTY_ML = 5

/**
 * Normalize item name for matching
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/s$/, '')
    .replace(/es$/, '')
    .replace(/ies$/, 'y')
}

/**
 * Normalize unit for comparison
 */
function normalizeUnit(unit: string): string {
  const unitMap: Record<string, string> = {
    'g': 'g',
    'gram': 'g',
    'grams': 'g',
    'kg': 'kg',
    'kilogram': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'l': 'l',
    'liter': 'l',
    'whole': 'whole',
    'piece': 'whole',
    'pieces': 'whole',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'cup': 'cup',
    'cups': 'cup',
    'pinch': 'pinch',
  }
  return unitMap[unit.toLowerCase().trim()] || unit.toLowerCase().trim()
}

/**
 * Check if units are compatible for deduction
 */
function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1)
  const norm2 = normalizeUnit(unit2)

  if (norm1 === norm2) return true

  const weightUnits = ['g', 'kg']
  if (weightUnits.includes(norm1) && weightUnits.includes(norm2)) return true

  const volumeUnits = ['ml', 'l']
  if (volumeUnits.includes(norm1) && volumeUnits.includes(norm2)) return true

  return false
}

/**
 * Convert to base units (grams for weight, ml for volume)
 */
function convertToBaseUnit(quantity: number, unit: string): { quantity: number; baseUnit: string } {
  const norm = normalizeUnit(unit)

  switch (norm) {
    case 'kg':
      return { quantity: quantity * 1000, baseUnit: 'g' }
    case 'l':
      return { quantity: quantity * 1000, baseUnit: 'ml' }
    default:
      return { quantity, baseUnit: norm }
  }
}

/**
 * Convert from base unit back to display unit
 */
function convertFromBaseUnit(quantity: number, baseUnit: string, targetUnit: string): number {
  const norm = normalizeUnit(targetUnit)

  switch (norm) {
    case 'kg':
      return quantity / 1000
    case 'l':
      return quantity / 1000
    default:
      return quantity
  }
}

/**
 * Check if a quantity is considered "small" and should be excluded by default
 */
function isSmallQuantity(
  quantity: number,
  unit: string,
  thresholdGrams: number = DEFAULT_SMALL_QTY_GRAMS,
  thresholdMl: number = DEFAULT_SMALL_QTY_ML
): boolean {
  const { quantity: baseQty, baseUnit } = convertToBaseUnit(quantity, unit)

  if (baseUnit === 'g' && baseQty <= thresholdGrams) return true
  if (baseUnit === 'ml' && baseQty <= thresholdMl) return true
  if (baseUnit === 'pinch' || baseUnit === 'tsp') return true // Pinches and teaspoons are always small

  return false
}

/**
 * Find matching inventory item for a recipe ingredient
 */
function findInventoryMatch(
  ingredient: RecipeIngredient,
  inventoryItems: InventoryItem[]
): InventoryItem | null {
  const normalizedName = normalizeItemName(ingredient.ingredientName)

  // Try exact normalized match first
  let match = inventoryItems.find(
    inv => normalizeItemName(inv.itemName) === normalizedName && inv.isActive
  )

  if (match) return match

  // Try partial match
  match = inventoryItems.find(inv => {
    if (!inv.isActive) return false
    const invNorm = normalizeItemName(inv.itemName)
    return invNorm.includes(normalizedName) || normalizedName.includes(invNorm)
  })

  return match || null
}

/**
 * Calculate deductions for cooking a recipe
 */
export async function calculateCookingDeductions(
  userId: string,
  ingredients: RecipeIngredient[],
  scalingFactor: number = 1
): Promise<CookingDeductionItem[]> {
  // Fetch user's active inventory
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  // Get user's settings for small quantity thresholds
  const settings = await prisma.inventorySettings.findUnique({
    where: { userId },
  })

  const thresholdGrams = settings?.smallQuantityThresholdGrams || DEFAULT_SMALL_QTY_GRAMS
  const thresholdMl = settings?.smallQuantityThresholdMl || DEFAULT_SMALL_QTY_ML

  const deductions: CookingDeductionItem[] = []

  for (const ingredient of ingredients) {
    const scaledQuantity = ingredient.quantity * scalingFactor
    const match = findInventoryMatch(ingredient, inventoryItems)

    if (!match) {
      // No inventory match - show as shortfall
      deductions.push({
        ingredientName: ingredient.ingredientName,
        recipeQuantity: scaledQuantity,
        recipeUnit: ingredient.unit,
        inventoryMatch: null,
        currentInventoryQuantity: 0,
        quantityAfterDeduction: 0,
        shortfall: scaledQuantity,
        isSmallQuantity: isSmallQuantity(scaledQuantity, ingredient.unit, thresholdGrams, thresholdMl),
        selected: false, // Can't deduct what we don't have
      })
      continue
    }

    // Check unit compatibility
    if (!areUnitsCompatible(ingredient.unit, match.unit)) {
      // Units not compatible - can't deduct automatically
      deductions.push({
        ingredientName: ingredient.ingredientName,
        recipeQuantity: scaledQuantity,
        recipeUnit: ingredient.unit,
        inventoryMatch: match,
        currentInventoryQuantity: match.quantity,
        quantityAfterDeduction: match.quantity, // No change
        shortfall: 0,
        isSmallQuantity: isSmallQuantity(scaledQuantity, ingredient.unit, thresholdGrams, thresholdMl),
        selected: false, // Can't auto-deduct incompatible units
      })
      continue
    }

    // Convert both to base units for comparison
    const recipe = convertToBaseUnit(scaledQuantity, ingredient.unit)
    const inventory = convertToBaseUnit(match.quantity, match.unit)

    const isSmall = isSmallQuantity(scaledQuantity, ingredient.unit, thresholdGrams, thresholdMl)

    if (inventory.quantity >= recipe.quantity) {
      // Have enough - can deduct fully
      const remainingBase = inventory.quantity - recipe.quantity
      const remainingDisplay = convertFromBaseUnit(remainingBase, inventory.baseUnit, match.unit)

      deductions.push({
        ingredientName: ingredient.ingredientName,
        recipeQuantity: scaledQuantity,
        recipeUnit: ingredient.unit,
        inventoryMatch: match,
        currentInventoryQuantity: match.quantity,
        quantityAfterDeduction: Math.round(remainingDisplay * 100) / 100,
        shortfall: 0,
        isSmallQuantity: isSmall,
        selected: !isSmall, // Don't auto-select small quantities
      })
    } else {
      // Don't have enough - partial deduction with shortfall
      const shortfallBase = recipe.quantity - inventory.quantity
      const shortfallDisplay = convertFromBaseUnit(shortfallBase, recipe.baseUnit, ingredient.unit)

      deductions.push({
        ingredientName: ingredient.ingredientName,
        recipeQuantity: scaledQuantity,
        recipeUnit: ingredient.unit,
        inventoryMatch: match,
        currentInventoryQuantity: match.quantity,
        quantityAfterDeduction: 0, // Would use all of it
        shortfall: Math.round(shortfallDisplay * 100) / 100,
        isSmallQuantity: isSmall,
        selected: !isSmall, // Don't auto-select small quantities
      })
    }
  }

  return deductions
}

/**
 * Apply cooking deductions to inventory
 */
export async function applyCookingDeductions(
  userId: string,
  deductions: CookingDeductionItem[]
): Promise<CookingDeductionResult> {
  const selectedDeductions = deductions.filter(d => d.selected && d.inventoryMatch)

  if (selectedDeductions.length === 0) {
    return {
      deductions: [],
      itemsToRemove: [],
      success: true,
      message: 'No items selected for deduction',
    }
  }

  const itemsToRemove: string[] = []
  const updatedDeductions: CookingDeductionItem[] = []

  for (const deduction of selectedDeductions) {
    if (!deduction.inventoryMatch) continue

    try {
      if (deduction.quantityAfterDeduction <= 0) {
        // Remove the item completely
        await prisma.inventoryItem.update({
          where: { id: deduction.inventoryMatch.id },
          data: { isActive: false },
        })
        itemsToRemove.push(deduction.inventoryMatch.id)
      } else {
        // Update quantity
        await prisma.inventoryItem.update({
          where: { id: deduction.inventoryMatch.id },
          data: { quantity: deduction.quantityAfterDeduction },
        })
      }

      updatedDeductions.push(deduction)
    } catch (error) {
      console.error(`❌ Error deducting ${deduction.ingredientName}:`, error)
    }
  }

  return {
    deductions: updatedDeductions,
    itemsToRemove,
    success: true,
    message: `Deducted ${updatedDeductions.length} items from inventory${itemsToRemove.length > 0 ? ` (${itemsToRemove.length} depleted)` : ''}`,
  }
}
