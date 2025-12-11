/**
 * Inventory Check Utilities for Shopping List Integration
 *
 * Checks shopping list items against current inventory to:
 * - Exclude items fully covered by inventory
 * - Reduce quantities for items partially covered
 * - Track what was excluded for user review
 */

import { prisma } from '@/lib/prisma'
import type { InventoryCheckResult, InventoryExclusionReport, StorageLocation } from '@/lib/types/inventory'

interface ShoppingListItem {
  itemName: string
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
  expiryDate: Date | null
  isActive: boolean
}

/**
 * Normalize item name for matching (lowercase, remove plurals, trim)
 */
function normalizeItemName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Remove common suffixes
    .replace(/s$/, '') // Remove plural 's'
    .replace(/es$/, '') // Remove plural 'es'
    .replace(/ies$/, 'y') // candies -> candy
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
    'kilograms': 'kg',
    'ml': 'ml',
    'milliliter': 'ml',
    'millilitre': 'ml',
    'l': 'l',
    'liter': 'l',
    'litre': 'l',
    'whole': 'whole',
    'piece': 'whole',
    'pieces': 'whole',
    'item': 'whole',
    'items': 'whole',
    'pack': 'pack',
    'packs': 'pack',
    'packet': 'pack',
    'packets': 'pack',
    'bottle': 'bottle',
    'bottles': 'bottle',
    'tin': 'tin',
    'tins': 'tin',
    'can': 'tin',
    'cans': 'tin',
    'carton': 'carton',
    'cartons': 'carton',
    'bunch': 'bunch',
    'bunches': 'bunch',
    'bag': 'bag',
    'bags': 'bag',
    'loaf': 'loaf',
    'loaves': 'loaf',
    'tbsp': 'tbsp',
    'tablespoon': 'tbsp',
    'tablespoons': 'tbsp',
    'tsp': 'tsp',
    'teaspoon': 'tsp',
    'teaspoons': 'tsp',
    'cup': 'cup',
    'cups': 'cup',
  }

  return unitMap[unit.toLowerCase().trim()] || unit.toLowerCase().trim()
}

/**
 * Check if units are compatible for quantity comparison
 */
function areUnitsCompatible(unit1: string, unit2: string): boolean {
  const norm1 = normalizeUnit(unit1)
  const norm2 = normalizeUnit(unit2)

  // Exact match
  if (norm1 === norm2) return true

  // Weight units are compatible
  const weightUnits = ['g', 'kg']
  if (weightUnits.includes(norm1) && weightUnits.includes(norm2)) return true

  // Volume units are compatible
  const volumeUnits = ['ml', 'l']
  if (volumeUnits.includes(norm1) && volumeUnits.includes(norm2)) return true

  return false
}

/**
 * Convert quantity to base unit for comparison
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
 * Find matching inventory item for a shopping list item
 */
function findInventoryMatch(
  shoppingItem: ShoppingListItem,
  inventoryItems: InventoryItem[]
): InventoryItem | null {
  const normalizedName = normalizeItemName(shoppingItem.itemName)

  // Try exact normalized match first
  let match = inventoryItems.find(
    inv => normalizeItemName(inv.itemName) === normalizedName && inv.isActive
  )

  if (match) return match

  // Try partial match (inventory item contains shopping item name or vice versa)
  match = inventoryItems.find(inv => {
    if (!inv.isActive) return false
    const invNorm = normalizeItemName(inv.itemName)
    return invNorm.includes(normalizedName) || normalizedName.includes(invNorm)
  })

  return match || null
}

/**
 * Check a single shopping list item against inventory
 */
function checkItemAgainstInventory(
  shoppingItem: ShoppingListItem,
  inventoryItems: InventoryItem[]
): InventoryCheckResult {
  const match = findInventoryMatch(shoppingItem, inventoryItems)

  if (!match) {
    return {
      itemName: shoppingItem.itemName,
      recipeQuantity: shoppingItem.quantity,
      recipeUnit: shoppingItem.unit,
      inventoryMatch: null,
      inventoryQuantity: 0,
      action: 'add',
      netQuantityNeeded: shoppingItem.quantity,
    }
  }

  // Check if units are compatible
  if (!areUnitsCompatible(shoppingItem.unit, match.unit)) {
    // Units not compatible - assume we need to add (can't compare apples to oranges)
    return {
      itemName: shoppingItem.itemName,
      recipeQuantity: shoppingItem.quantity,
      recipeUnit: shoppingItem.unit,
      inventoryMatch: match,
      inventoryQuantity: match.quantity,
      action: 'add',
      netQuantityNeeded: shoppingItem.quantity,
    }
  }

  // Convert to base units for comparison
  const shopping = convertToBaseUnit(shoppingItem.quantity, shoppingItem.unit)
  const inventory = convertToBaseUnit(match.quantity, match.unit)

  if (inventory.quantity >= shopping.quantity) {
    // Full match - exclude from shopping list
    return {
      itemName: shoppingItem.itemName,
      recipeQuantity: shoppingItem.quantity,
      recipeUnit: shoppingItem.unit,
      inventoryMatch: match,
      inventoryQuantity: match.quantity,
      action: 'exclude',
      netQuantityNeeded: 0,
    }
  } else {
    // Partial match - reduce quantity
    const ratio = inventory.quantity / shopping.quantity
    const netNeeded = shoppingItem.quantity * (1 - ratio)

    return {
      itemName: shoppingItem.itemName,
      recipeQuantity: shoppingItem.quantity,
      recipeUnit: shoppingItem.unit,
      inventoryMatch: match,
      inventoryQuantity: match.quantity,
      action: 'reduce',
      netQuantityNeeded: Math.round(netNeeded * 10) / 10, // Round to 1 decimal
    }
  }
}

/**
 * Check shopping list items against user's inventory
 */
export async function checkInventoryForShoppingList(
  userId: string,
  items: ShoppingListItem[]
): Promise<InventoryExclusionReport> {
  // Fetch user's active inventory
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: {
      userId,
      isActive: true,
    },
  })

  const results: InventoryCheckResult[] = []
  let excludedCount = 0
  let reducedCount = 0
  let addedCount = 0

  for (const item of items) {
    const result = checkItemAgainstInventory(item, inventoryItems)
    results.push(result)

    switch (result.action) {
      case 'exclude':
        excludedCount++
        break
      case 'reduce':
        reducedCount++
        break
      case 'add':
        addedCount++
        break
    }
  }

  return {
    checkedItems: results,
    excludedCount,
    reducedCount,
    addedCount,
  }
}

/**
 * Apply inventory exclusions to shopping list items
 * Returns the modified items list
 */
export function applyInventoryExclusions(
  items: ShoppingListItem[],
  checkResults: InventoryCheckResult[]
): ShoppingListItem[] {
  return items
    .map((item, index) => {
      const result = checkResults[index]

      if (result.action === 'exclude') {
        return null // Exclude this item
      }

      if (result.action === 'reduce') {
        return {
          ...item,
          quantity: result.netQuantityNeeded,
        }
      }

      return item // Add as-is
    })
    .filter((item): item is ShoppingListItem => item !== null)
}

/**
 * Record excluded items in the database for tracking
 */
export async function recordExcludedItems(
  shoppingListId: string,
  checkResults: InventoryCheckResult[]
): Promise<void> {
  const excludedRecords = checkResults
    .filter(r => r.action === 'exclude' || r.action === 'reduce')
    .filter(r => r.inventoryMatch !== null)
    .map(r => ({
      shoppingListId,
      itemName: r.itemName,
      recipeQuantity: r.recipeQuantity,
      recipeUnit: r.recipeUnit,
      inventoryQuantity: r.inventoryMatch!.quantity,
      inventoryItemId: r.inventoryMatch!.id,
    }))

  if (excludedRecords.length > 0) {
    await prisma.shoppingListExcludedItem.createMany({
      data: excludedRecords,
    })
  }
}

/**
 * Get user's inventory settings for shopping list behavior
 */
export async function getInventorySettings(userId: string) {
  const settings = await prisma.inventorySettings.findUnique({
    where: { userId },
  })

  return settings || {
    skipInventoryCheck: false,
    smallQuantityThresholdGrams: 5,
    smallQuantityThresholdMl: 5,
  }
}
