/**
 * Inventory Deduction Utilities
 * Deduct ingredients from inventory when meals are cooked
 */

import { prisma } from '@/lib/prisma'
import { normalizeIngredientName } from '@/lib/ingredient-normalization'
import type { InventoryItem } from '@/lib/types/inventory'

export interface DeductionItem {
  ingredientName: string
  quantity: number
  unit: string
}

export interface DeductionResult {
  ingredientName: string
  requestedQuantity: number
  requestedUnit: string
  deductedQuantity: number
  deductedFromId: string | null
  status: 'fully_deducted' | 'partially_deducted' | 'not_found' | 'unit_mismatch'
  remainingInInventory: number | null
  message: string
}

export interface DeductionSummary {
  success: boolean
  totalItems: number
  fullyDeducted: number
  partiallyDeducted: number
  notFound: number
  unitMismatch: number
  results: DeductionResult[]
}

/**
 * Normalize unit for comparison
 */
function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim()

  // Weight units
  if (['g', 'gram', 'grams'].includes(lower)) return 'g'
  if (['kg', 'kilogram', 'kilograms', 'kilo'].includes(lower)) return 'kg'
  if (['oz', 'ounce', 'ounces'].includes(lower)) return 'oz'
  if (['lb', 'lbs', 'pound', 'pounds'].includes(lower)) return 'lb'

  // Volume units
  if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(lower)) return 'ml'
  if (['l', 'liter', 'liters', 'litre', 'litres'].includes(lower)) return 'l'
  if (['cup', 'cups'].includes(lower)) return 'cup'
  if (['tbsp', 'tablespoon', 'tablespoons'].includes(lower)) return 'tbsp'
  if (['tsp', 'teaspoon', 'teaspoons'].includes(lower)) return 'tsp'

  // Count units
  if (['each', 'piece', 'pieces', 'unit', 'units', 'item', 'items', ''].includes(lower)) return 'each'
  if (['pack', 'packs', 'package', 'packages'].includes(lower)) return 'pack'
  if (['bunch', 'bunches'].includes(lower)) return 'bunch'
  if (['can', 'cans', 'tin', 'tins'].includes(lower)) return 'can'
  if (['bottle', 'bottles'].includes(lower)) return 'bottle'
  if (['jar', 'jars'].includes(lower)) return 'jar'
  if (['clove', 'cloves'].includes(lower)) return 'clove'
  if (['slice', 'slices'].includes(lower)) return 'slice'

  return lower
}

/**
 * Convert quantity between compatible units
 */
function convertQuantity(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit)
  const to = normalizeUnit(toUnit)

  if (from === to) return quantity

  // Weight conversions
  const weightConversions: Record<string, Record<string, number>> = {
    'g': { 'kg': 0.001, 'oz': 0.035274, 'lb': 0.00220462 },
    'kg': { 'g': 1000, 'oz': 35.274, 'lb': 2.20462 },
    'oz': { 'g': 28.3495, 'kg': 0.0283495, 'lb': 0.0625 },
    'lb': { 'g': 453.592, 'kg': 0.453592, 'oz': 16 },
  }

  // Volume conversions
  const volumeConversions: Record<string, Record<string, number>> = {
    'ml': { 'l': 0.001, 'cup': 0.00422675, 'tbsp': 0.067628, 'tsp': 0.202884 },
    'l': { 'ml': 1000, 'cup': 4.22675, 'tbsp': 67.628, 'tsp': 202.884 },
    'cup': { 'ml': 236.588, 'l': 0.236588, 'tbsp': 16, 'tsp': 48 },
    'tbsp': { 'ml': 14.7868, 'l': 0.0147868, 'cup': 0.0625, 'tsp': 3 },
    'tsp': { 'ml': 4.92892, 'l': 0.00492892, 'cup': 0.0208333, 'tbsp': 0.333333 },
  }

  // Check weight conversions
  if (weightConversions[from]?.[to]) {
    return quantity * weightConversions[from][to]
  }

  // Check volume conversions
  if (volumeConversions[from]?.[to]) {
    return quantity * volumeConversions[from][to]
  }

  // No conversion possible
  return null
}

/**
 * Preview deduction without actually modifying inventory
 */
export async function previewDeduction(
  userId: string,
  items: DeductionItem[]
): Promise<DeductionSummary> {
  // Fetch user's active inventory items
  const inventory = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  const results: DeductionResult[] = []
  let fullyDeducted = 0
  let partiallyDeducted = 0
  let notFound = 0
  let unitMismatch = 0

  for (const item of items) {
    const normalizedItemName = normalizeIngredientName(item.ingredientName)

    // Find matching inventory item
    const match = inventory.find((inv: { itemName: string }) => {
      const normalizedInvName = normalizeIngredientName(inv.itemName)
      return (
        normalizedInvName === normalizedItemName ||
        normalizedInvName.includes(normalizedItemName) ||
        normalizedItemName.includes(normalizedInvName)
      )
    })

    if (!match) {
      notFound++
      results.push({
        ingredientName: item.ingredientName,
        requestedQuantity: item.quantity,
        requestedUnit: item.unit,
        deductedQuantity: 0,
        deductedFromId: null,
        status: 'not_found',
        remainingInInventory: null,
        message: `${item.ingredientName} not found in inventory`,
      })
      continue
    }

    // Check unit compatibility
    const normalizedReqUnit = normalizeUnit(item.unit)
    const normalizedInvUnit = normalizeUnit(match.unit)

    if (normalizedReqUnit !== normalizedInvUnit) {
      // Try to convert
      const convertedQty = convertQuantity(item.quantity, item.unit, match.unit)

      if (convertedQty === null) {
        unitMismatch++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: 0,
          deductedFromId: match.id,
          status: 'unit_mismatch',
          remainingInInventory: match.quantity,
          message: `Unit mismatch: recipe needs ${item.unit}, inventory has ${match.unit}`,
        })
        continue
      }

      // Use converted quantity
      const remaining = match.quantity - convertedQty
      if (remaining >= 0) {
        fullyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: convertedQty,
          deductedFromId: match.id,
          status: 'fully_deducted',
          remainingInInventory: remaining,
          message: `Will deduct ${convertedQty.toFixed(2)} ${match.unit} (converted from ${item.quantity} ${item.unit})`,
        })
      } else {
        partiallyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: match.quantity,
          deductedFromId: match.id,
          status: 'partially_deducted',
          remainingInInventory: 0,
          message: `Only ${match.quantity} ${match.unit} available (need ${convertedQty.toFixed(2)} ${match.unit})`,
        })
      }
    } else {
      // Units match
      const remaining = match.quantity - item.quantity
      if (remaining >= 0) {
        fullyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: item.quantity,
          deductedFromId: match.id,
          status: 'fully_deducted',
          remainingInInventory: remaining,
          message: `Will deduct ${item.quantity} ${item.unit}`,
        })
      } else {
        partiallyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: match.quantity,
          deductedFromId: match.id,
          status: 'partially_deducted',
          remainingInInventory: 0,
          message: `Only ${match.quantity} ${match.unit} available (need ${item.quantity})`,
        })
      }
    }
  }

  return {
    success: notFound === 0 && unitMismatch === 0 && partiallyDeducted === 0,
    totalItems: items.length,
    fullyDeducted,
    partiallyDeducted,
    notFound,
    unitMismatch,
    results,
  }
}

/**
 * Perform actual deduction from inventory
 */
export async function performDeduction(
  userId: string,
  items: DeductionItem[],
  options: {
    allowPartial?: boolean // If true, deduct what's available even if insufficient
    removeEmptyItems?: boolean // If true, set isActive=false for items with 0 quantity
  } = {}
): Promise<DeductionSummary> {
  const { allowPartial = true, removeEmptyItems = true } = options

  // Fetch user's active inventory items
  const inventory = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  const results: DeductionResult[] = []
  let fullyDeducted = 0
  let partiallyDeducted = 0
  let notFound = 0
  let unitMismatch = 0

  for (const item of items) {
    const normalizedItemName = normalizeIngredientName(item.ingredientName)

    // Find matching inventory item
    const match = inventory.find((inv: { itemName: string }) => {
      const normalizedInvName = normalizeIngredientName(inv.itemName)
      return (
        normalizedInvName === normalizedItemName ||
        normalizedInvName.includes(normalizedItemName) ||
        normalizedItemName.includes(normalizedInvName)
      )
    })

    if (!match) {
      notFound++
      results.push({
        ingredientName: item.ingredientName,
        requestedQuantity: item.quantity,
        requestedUnit: item.unit,
        deductedQuantity: 0,
        deductedFromId: null,
        status: 'not_found',
        remainingInInventory: null,
        message: `${item.ingredientName} not found in inventory`,
      })
      continue
    }

    // Check unit compatibility
    const normalizedReqUnit = normalizeUnit(item.unit)
    const normalizedInvUnit = normalizeUnit(match.unit)
    let quantityToDeduct = item.quantity

    if (normalizedReqUnit !== normalizedInvUnit) {
      const convertedQty = convertQuantity(item.quantity, item.unit, match.unit)

      if (convertedQty === null) {
        unitMismatch++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: 0,
          deductedFromId: match.id,
          status: 'unit_mismatch',
          remainingInInventory: match.quantity,
          message: `Unit mismatch: recipe needs ${item.unit}, inventory has ${match.unit}`,
        })
        continue
      }

      quantityToDeduct = convertedQty
    }

    // Calculate new quantity
    const remaining = match.quantity - quantityToDeduct
    const actualDeduction = remaining >= 0 ? quantityToDeduct : match.quantity
    const newQuantity = Math.max(0, remaining)

    // Only deduct if allowed (full deduction or partial with allowPartial)
    if (remaining >= 0 || allowPartial) {
      // Update inventory
      await prisma.inventoryItem.update({
        where: { id: match.id },
        data: {
          quantity: newQuantity,
          isActive: removeEmptyItems && newQuantity === 0 ? false : true,
        },
      })

      // Update local copy for subsequent items
      match.quantity = newQuantity

      if (remaining >= 0) {
        fullyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: actualDeduction,
          deductedFromId: match.id,
          status: 'fully_deducted',
          remainingInInventory: newQuantity,
          message: `Deducted ${actualDeduction} ${match.unit}`,
        })
      } else {
        partiallyDeducted++
        results.push({
          ingredientName: item.ingredientName,
          requestedQuantity: item.quantity,
          requestedUnit: item.unit,
          deductedQuantity: actualDeduction,
          deductedFromId: match.id,
          status: 'partially_deducted',
          remainingInInventory: 0,
          message: `Partially deducted ${actualDeduction} ${match.unit} (needed ${quantityToDeduct})`,
        })
      }
    } else {
      results.push({
        ingredientName: item.ingredientName,
        requestedQuantity: item.quantity,
        requestedUnit: item.unit,
        deductedQuantity: 0,
        deductedFromId: match.id,
        status: 'partially_deducted',
        remainingInInventory: match.quantity,
        message: `Insufficient: need ${quantityToDeduct} ${match.unit}, have ${match.quantity}`,
      })
    }
  }

  return {
    success: notFound === 0 && unitMismatch === 0 && partiallyDeducted === 0,
    totalItems: items.length,
    fullyDeducted,
    partiallyDeducted,
    notFound,
    unitMismatch,
    results,
  }
}

/**
 * Get recipe ingredients for deduction
 */
export async function getRecipeIngredientsForDeduction(
  recipeId: string,
  scalingFactor: number = 1
): Promise<DeductionItem[]> {
  const ingredients = await prisma.recipeIngredient.findMany({
    where: { recipeId },
  })

  return ingredients.map((ing: { ingredientName: string; quantity: number | null; unit: string | null }) => ({
    ingredientName: ing.ingredientName,
    quantity: (ing.quantity || 0) * scalingFactor,
    unit: ing.unit || 'each',
  }))
}
