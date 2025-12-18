/**
 * Expiry Calculation Utilities
 * Calculate expiry status and related metrics for inventory items
 */

import type {
  InventoryItem,
  InventoryItemWithExpiry,
  ExpiryStatus,
  InventoryFilters,
  InventorySortOptions,
  InventorySortField,
} from '@/lib/types/inventory'

/**
 * Calculate days until expiry (negative if expired)
 */
export function calculateDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculate shelf life in days (expiry date - purchase date)
 */
export function calculateShelfLifeDays(purchaseDate: Date, expiryDate: Date | null): number | null {
  if (!expiryDate) return null

  const purchase = new Date(purchaseDate)
  purchase.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - purchase.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays
}

/**
 * Calculate expiry status based on days until expiry and shelf life
 *
 * Rules:
 * - expired: days_until_expiry < 0
 * - expiring_soon: days_until_expiry >= 0 AND days_until_expiry <= MAX(2, shelf_life_days * 0.2)
 * - fresh: otherwise
 */
export function calculateExpiryStatus(
  daysUntilExpiry: number | null,
  shelfLifeDays: number | null
): ExpiryStatus {
  // No expiry date means we consider it fresh
  if (daysUntilExpiry === null) return 'fresh'

  // Expired
  if (daysUntilExpiry < 0) return 'expired'

  // Calculate "expiring soon" threshold
  // Minimum 2 days, or 20% of shelf life, whichever is greater
  const shelfLifeThreshold = shelfLifeDays ? Math.ceil(shelfLifeDays * 0.2) : 2
  const expiringThreshold = Math.max(2, shelfLifeThreshold)

  // Expiring soon
  if (daysUntilExpiry <= expiringThreshold) return 'expiringSoon'

  // Fresh
  return 'fresh'
}

/**
 * Enrich an inventory item with calculated expiry fields
 */
export function enrichInventoryItemWithExpiry(item: InventoryItem): InventoryItemWithExpiry {
  const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate)
  const shelfLifeDays = calculateShelfLifeDays(item.purchaseDate, item.expiryDate)
  const expiryStatus = calculateExpiryStatus(daysUntilExpiry, shelfLifeDays)

  return {
    ...item,
    daysUntilExpiry,
    shelfLifeDays,
    expiryStatus,
  }
}

/**
 * Enrich multiple inventory items with calculated expiry fields
 */
export function enrichInventoryItemsWithExpiry(items: InventoryItem[]): InventoryItemWithExpiry[] {
  return items.map(enrichInventoryItemWithExpiry)
}

/**
 * Filter inventory items based on filter criteria
 */
export function filterInventoryItems(
  items: InventoryItemWithExpiry[],
  filters: InventoryFilters
): InventoryItemWithExpiry[] {
  return items.filter(item => {
    // Category filter
    if (filters.category && item.category !== filters.category) {
      return false
    }

    // Location filter
    if (filters.location && item.location !== filters.location) {
      return false
    }

    // Expiry status filter
    if (filters.expiryStatus && item.expiryStatus !== filters.expiryStatus) {
      return false
    }

    // Active filter
    if (filters.isActive !== undefined && item.isActive !== filters.isActive) {
      return false
    }

    // Search term filter (case-insensitive)
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      const nameMatch = item.itemName.toLowerCase().includes(searchLower)
      const categoryMatch = item.category.toLowerCase().includes(searchLower)
      const notesMatch = item.notes?.toLowerCase().includes(searchLower) || false

      if (!nameMatch && !categoryMatch && !notesMatch) {
        return false
      }
    }

    return true
  })
}

/**
 * Sort inventory items by expiry priority (expired first, then expiring soon)
 * This is the default sort order
 */
export function sortByExpiryPriority(items: InventoryItemWithExpiry[]): InventoryItemWithExpiry[] {
  return [...items].sort((a, b) => {
    // Status priority: expired > expiringSoon > fresh
    const statusPriority: Record<ExpiryStatus, number> = {
      expired: 0,
      expiringSoon: 1,
      fresh: 2,
    }

    const statusDiff = statusPriority[a.expiryStatus] - statusPriority[b.expiryStatus]
    if (statusDiff !== 0) return statusDiff

    // Within same status, sort by days until expiry (soonest first)
    if (a.daysUntilExpiry !== null && b.daysUntilExpiry !== null) {
      return a.daysUntilExpiry - b.daysUntilExpiry
    }

    // Items without expiry date go last within their status group
    if (a.daysUntilExpiry === null && b.daysUntilExpiry !== null) return 1
    if (a.daysUntilExpiry !== null && b.daysUntilExpiry === null) return -1

    // Finally, sort alphabetically by name
    return a.itemName.localeCompare(b.itemName)
  })
}

/**
 * Sort inventory items by specified field and order
 */
export function sortInventoryItems(
  items: InventoryItemWithExpiry[],
  options: InventorySortOptions
): InventoryItemWithExpiry[] {
  const { field, order } = options
  const multiplier = order === 'asc' ? 1 : -1

  return [...items].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'itemName':
        comparison = a.itemName.localeCompare(b.itemName)
        break

      case 'expiryDate':
        // Handle null expiry dates
        if (a.expiryDate === null && b.expiryDate === null) {
          comparison = 0
        } else if (a.expiryDate === null) {
          comparison = 1 // nulls go last in ascending
        } else if (b.expiryDate === null) {
          comparison = -1
        } else {
          comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        }
        break

      case 'purchaseDate':
        comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        break

      case 'category':
        comparison = a.category.localeCompare(b.category)
        break

      case 'quantity':
        comparison = a.quantity - b.quantity
        break

      default:
        comparison = 0
    }

    return comparison * multiplier
  })
}

/**
 * Get unique categories from inventory items
 */
export function getUniqueCategories(items: InventoryItemWithExpiry[]): string[] {
  const categories = new Set(items.map(item => item.category))
  return Array.from(categories).sort()
}

/**
 * Format days until expiry for display
 */
export function formatDaysUntilExpiry(daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) return 'No expiry'

  if (daysUntilExpiry < 0) {
    const daysExpired = Math.abs(daysUntilExpiry)
    return daysExpired === 1 ? 'Expired 1 day ago' : `Expired ${daysExpired} days ago`
  }

  if (daysUntilExpiry === 0) return 'Expires today'
  if (daysUntilExpiry === 1) return 'Expires tomorrow'

  return `Expires in ${daysUntilExpiry} days`
}

/**
 * Format expiry date for display
 */
export function formatExpiryDate(expiryDate: Date | null, isEstimated: boolean = false): string {
  if (!expiryDate) return 'No expiry set'

  const date = new Date(expiryDate)
  const formatted = date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return isEstimated ? `${formatted} (Est.)` : formatted
}

/**
 * Calculate new expiry date from purchase date and shelf life days
 */
export function calculateExpiryFromShelfLife(purchaseDate: Date, shelfLifeDays: number): Date {
  const expiry = new Date(purchaseDate)
  expiry.setDate(expiry.getDate() + shelfLifeDays)
  return expiry
}

/**
 * Check if an item should be excluded from deduction due to small quantity
 */
export function isSmallQuantity(
  quantity: number,
  unit: string,
  thresholdGrams: number,
  thresholdMl: number
): boolean {
  const unitLower = unit.toLowerCase()

  // Weight units
  if (['g', 'gram', 'grams'].includes(unitLower)) {
    return quantity <= thresholdGrams
  }
  if (['kg', 'kilogram', 'kilograms'].includes(unitLower)) {
    return quantity * 1000 <= thresholdGrams
  }

  // Volume units
  if (['ml', 'milliliter', 'millilitre', 'milliliters', 'millilitres'].includes(unitLower)) {
    return quantity <= thresholdMl
  }
  if (['l', 'liter', 'litre', 'liters', 'litres'].includes(unitLower)) {
    return quantity * 1000 <= thresholdMl
  }

  // For count-based units, never consider them "small"
  return false
}

/**
 * Get statistics for inventory items
 */
export function getInventoryStats(items: InventoryItemWithExpiry[]): {
  total: number
  active: number
  expired: number
  expiringSoon: number
  fresh: number
} {
  const activeItems = items.filter(i => i.isActive)

  return {
    total: items.length,
    active: activeItems.length,
    expired: activeItems.filter(i => i.expiryStatus === 'expired').length,
    expiringSoon: activeItems.filter(i => i.expiryStatus === 'expiringSoon').length,
    fresh: activeItems.filter(i => i.expiryStatus === 'fresh').length,
  }
}
