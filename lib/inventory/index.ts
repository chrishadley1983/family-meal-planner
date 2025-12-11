/**
 * Inventory Management Module
 * Re-exports all inventory-related utilities
 */

// Types
export * from '@/lib/types/inventory'

// Calculations
export {
  calculateDaysUntilExpiry,
  calculateShelfLifeDays,
  calculateExpiryStatus,
  enrichInventoryItemWithExpiry,
  enrichInventoryItemsWithExpiry,
  filterInventoryItems,
  sortByExpiryPriority,
  sortInventoryItems,
  getUniqueCategories,
  formatDaysUntilExpiry,
  formatExpiryDate,
  calculateExpiryFromShelfLife,
  isSmallQuantity,
  getInventoryStats,
} from './expiry-calculations'

// Shelf Life Lookup
export {
  findShelfLifeMatch,
  lookupShelfLife,
  calculateItemExpiry,
  getAIShelfLifeEstimate,
  parseStorageLocation,
  batchLookupShelfLife,
  DEFAULT_SHELF_LIFE,
  FALLBACK_SHELF_LIFE,
} from './shelf-life-lookup'
export type { ShelfLifeLookupResult } from './shelf-life-lookup'

// Seed Data
export {
  SHELF_LIFE_SEED_DATA,
  getSeedDataCategories,
  getSeedDataByCategory,
  getSeedDataCategoryCounts,
} from './shelf-life-seed-data'
export type { ShelfLifeSeedItem } from './shelf-life-seed-data'

// Duplicate Detection
export {
  checkForDuplicates,
  findBestMatchForMerge,
  suggestMergedQuantity,
} from './duplicate-detection'
export type { DuplicateCheckResult } from './duplicate-detection'
