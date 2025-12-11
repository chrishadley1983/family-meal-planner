/**
 * Inventory Check Utilities
 * Check if items are available in inventory before adding to shopping list
 */

import { prisma } from '@/lib/prisma'
import { normalizeIngredientName } from '@/lib/ingredient-normalization'
import type { InventoryItem, StorageLocation } from '@/lib/types/inventory'

export interface InventoryCheckResult {
  itemName: string
  requestedQuantity: number
  requestedUnit: string
  availableQuantity: number
  availableUnit: string
  inventoryItemId: string | null
  isAvailable: boolean
  isSufficientQuantity: boolean
}

/**
 * Check if items are available in user's inventory
 */
export async function checkInventoryForItems(
  userId: string,
  items: Array<{
    itemName: string
    quantity: number
    unit: string
  }>
): Promise<InventoryCheckResult[]> {
  // Fetch user's active inventory items
  const inventory = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  const results: InventoryCheckResult[] = []

  for (const item of items) {
    const normalizedItemName = normalizeIngredientName(item.itemName)

    // Find matching inventory item
    const match = inventory.find((inv: { itemName: string; quantity: number; unit: string; id: string }) => {
      const normalizedInvName = normalizeIngredientName(inv.itemName)
      return (
        normalizedInvName === normalizedItemName ||
        normalizedInvName.includes(normalizedItemName) ||
        normalizedItemName.includes(normalizedInvName)
      )
    })

    if (match) {
      // Check if units are compatible for quantity comparison
      const unitsMatch = normalizeUnit(match.unit) === normalizeUnit(item.unit)
      const isSufficientQuantity = unitsMatch ? match.quantity >= item.quantity : true // Assume sufficient if units don't match

      results.push({
        itemName: item.itemName,
        requestedQuantity: item.quantity,
        requestedUnit: item.unit,
        availableQuantity: match.quantity,
        availableUnit: match.unit,
        inventoryItemId: match.id,
        isAvailable: true,
        isSufficientQuantity,
      })
    } else {
      results.push({
        itemName: item.itemName,
        requestedQuantity: item.quantity,
        requestedUnit: item.unit,
        availableQuantity: 0,
        availableUnit: item.unit,
        inventoryItemId: null,
        isAvailable: false,
        isSufficientQuantity: false,
      })
    }
  }

  return results
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
  if (['each', 'piece', 'pieces', 'unit', 'units', 'item', 'items'].includes(lower)) return 'each'
  if (['pack', 'packs', 'package', 'packages'].includes(lower)) return 'pack'
  if (['bunch', 'bunches'].includes(lower)) return 'bunch'
  if (['can', 'cans', 'tin', 'tins'].includes(lower)) return 'can'
  if (['bottle', 'bottles'].includes(lower)) return 'bottle'
  if (['jar', 'jars'].includes(lower)) return 'jar'

  return lower
}

/**
 * Get user's inventory settings (if they want to skip inventory check)
 */
export async function getInventorySettings(userId: string) {
  const settings = await prisma.inventorySettings.findUnique({
    where: { userId },
  })

  return {
    skipInventoryCheck: settings?.skipInventoryCheck ?? false,
    smallQuantityThresholdGrams: settings?.smallQuantityThresholdGrams ?? 5,
    smallQuantityThresholdMl: settings?.smallQuantityThresholdMl ?? 5,
  }
}

/**
 * Record excluded items that were available in inventory
 */
export async function recordExcludedItems(
  shoppingListId: string,
  excludedItems: Array<{
    itemName: string
    recipeQuantity: number
    recipeUnit: string
    inventoryQuantity: number
    inventoryItemId: string | null
  }>
) {
  if (excludedItems.length === 0) return

  await prisma.shoppingListExcludedItem.createMany({
    data: excludedItems.map(item => ({
      shoppingListId,
      itemName: item.itemName,
      recipeQuantity: item.recipeQuantity,
      recipeUnit: item.recipeUnit,
      inventoryQuantity: item.inventoryQuantity,
      inventoryItemId: item.inventoryItemId,
    })),
  })
}

/**
 * Get excluded items for a shopping list
 */
export async function getExcludedItems(shoppingListId: string) {
  return prisma.shoppingListExcludedItem.findMany({
    where: {
      shoppingListId,
      addedBackAt: null,
    },
    include: {
      inventoryItem: true,
    },
  })
}

/**
 * Add back an excluded item to the shopping list
 */
export async function addBackExcludedItem(
  excludedItemId: string,
  quantity?: number
) {
  const excludedItem = await prisma.shoppingListExcludedItem.findUnique({
    where: { id: excludedItemId },
  })

  if (!excludedItem) {
    throw new Error('Excluded item not found')
  }

  // Get max display order
  const maxOrder = await prisma.shoppingListItem.findFirst({
    where: { shoppingListId: excludedItem.shoppingListId },
    orderBy: { displayOrder: 'desc' },
    select: { displayOrder: true },
  })

  const quantityToAdd = quantity ?? excludedItem.recipeQuantity

  // Create the shopping list item
  await prisma.shoppingListItem.create({
    data: {
      shoppingListId: excludedItem.shoppingListId,
      itemName: excludedItem.itemName,
      quantity: quantityToAdd,
      unit: excludedItem.recipeUnit,
      source: 'manual',
      priority: 'Medium',
      displayOrder: (maxOrder?.displayOrder ?? -1) + 1,
    },
  })

  // Mark the excluded item as added back
  await prisma.shoppingListExcludedItem.update({
    where: { id: excludedItemId },
    data: {
      addedBackAt: new Date(),
      addedBackQuantity: quantityToAdd,
    },
  })
}
