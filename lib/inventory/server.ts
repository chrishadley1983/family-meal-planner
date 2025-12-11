/**
 * Server-only Inventory Utilities
 *
 * These functions use Prisma and can only be used in:
 * - API routes
 * - Server components
 * - Server actions
 *
 * DO NOT import this file in client components!
 */

// Inventory Check (Shopping List Integration)
export {
  checkInventoryForItems,
  getInventorySettings,
  recordExcludedItems,
  getExcludedItems,
  addBackExcludedItem,
} from './inventory-check'
export type { InventoryCheckResult } from './inventory-check'

// Inventory Deduction (Meal Cooking Integration)
export {
  previewDeduction,
  performDeduction,
  getRecipeIngredientsForDeduction,
} from './inventory-deduction'
export type { DeductionItem, DeductionResult, DeductionSummary } from './inventory-deduction'
