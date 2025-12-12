/**
 * Inventory Expiry Calculation Utilities
 *
 * Handles all expiry-related calculations for inventory items including:
 * - Days until expiry
 * - Shelf life calculation
 * - Expiry status determination
 * - Item enrichment with calculated fields
 * - Sorting and filtering
 */

import type {
  ExpiryStatus,
  InventoryItem,
  InventoryItemWithExpiry,
  InventoryFilters,
  InventorySortOptions,
  StorageLocation,
  InventoryStatistics,
} from '@/lib/types/inventory'

/**
 * Calculate days until expiry from an expiry date
 * Returns negative number if expired, null if no expiry date
 */
export function calculateDaysUntilExpiry(expiryDate: Date | null): number | null {
  if (!expiryDate) {
    return null
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate shelf life in days from purchase date to expiry date
 */
export function calculateShelfLifeDays(purchaseDate: Date, expiryDate: Date | null): number | null {
  if (!expiryDate) {
    return null
  }

  const purchase = new Date(purchaseDate)
  purchase.setHours(0, 0, 0, 0)

  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - purchase.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate the expiry status based on days until expiry and shelf life
 *
 * Rules:
 * - expired: days_until_expiry < 0
 * - expiringSoon: days_until_expiry >= 0 AND days_until_expiry <= MAX(2, shelf_life_days * 0.2)
 * - fresh: otherwise (or no expiry date)
 *
 * The "expiring soon" threshold is the greater of:
 * - 2 days (minimum)
 * - 20% of the shelf life
 *
 * This means short-shelf-life items (like milk) still get 2 days warning,
 * while long-shelf-life items (like canned goods) get a proportional warning.
 */
export function calculateExpiryStatus(daysUntilExpiry: number | null, shelfLifeDays: number | null): ExpiryStatus {
  // No expiry date = always fresh
  if (daysUntilExpiry === null) {
    return 'fresh'
  }

  // Already expired
  if (daysUntilExpiry < 0) {
    return 'expired'
  }

  // Calculate "expiring soon" threshold
  // Minimum 2 days, or 20% of shelf life if that's greater
  const proportionalThreshold = shelfLifeDays ? Math.ceil(shelfLifeDays * 0.2) : 2
  const expiringSoonThreshold = Math.max(2, proportionalThreshold)

  // Expiring soon
  if (daysUntilExpiry <= expiringSoonThreshold) {
    return 'expiringSoon'
  }

  return 'fresh'
}

/**
 * Raw inventory item type (before enrichment with calculated fields)
 */
interface RawInventoryItem {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: StorageLocation | null
  purchaseDate: Date
  expiryDate: Date | null
  expiryIsEstimated: boolean
  isActive: boolean
  addedBy: string
  notes: string | null
  isUsedInPlannedMeal: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Enrich an inventory item with calculated expiry fields
 */
export function enrichInventoryItemWithExpiry(item: RawInventoryItem): InventoryItemWithExpiry {
  const daysUntilExpiry = calculateDaysUntilExpiry(item.expiryDate)
  const shelfLifeDays = calculateShelfLifeDays(item.purchaseDate, item.expiryDate)
  const expiryStatus = calculateExpiryStatus(daysUntilExpiry, shelfLifeDays)

  return {
    ...item,
    addedBy: item.addedBy as InventoryItem['addedBy'],
    daysUntilExpiry,
    shelfLifeDays,
    expiryStatus,
  }
}

/**
 * Enrich multiple inventory items with expiry data
 */
export function enrichInventoryItems(items: RawInventoryItem[]): InventoryItemWithExpiry[] {
  return items.map(enrichInventoryItemWithExpiry)
}

/**
 * Sort inventory items by expiry status priority (expired first, then expiring soon, then fresh)
 */
export function sortByExpiryStatusPriority(items: InventoryItemWithExpiry[]): InventoryItemWithExpiry[] {
  return [...items].sort((a, b) => {
    // Priority order: expired (0) > expiringSoon (1) > fresh (2)
    const statusOrder: Record<ExpiryStatus, number> = {
      expired: 0,
      expiringSoon: 1,
      fresh: 2,
    }
    const statusDiff = statusOrder[a.expiryStatus] - statusOrder[b.expiryStatus]

    if (statusDiff !== 0) return statusDiff

    // Within same status, sort by days until expiry (ascending)
    // Items with no expiry go last within their status
    const aDays = a.daysUntilExpiry ?? Infinity
    const bDays = b.daysUntilExpiry ?? Infinity
    return aDays - bDays
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
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '')
        break
      case 'location':
        comparison = (a.location || '').localeCompare(b.location || '')
        break
      case 'quantity':
        comparison = a.quantity - b.quantity
        break
      case 'purchaseDate':
        comparison = new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()
        break
      case 'expiryDate':
        // null (no expiry) should go last in ascending order
        if (!a.expiryDate && !b.expiryDate) comparison = 0
        else if (!a.expiryDate) comparison = 1
        else if (!b.expiryDate) comparison = -1
        else comparison = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
        break
      default:
        comparison = 0
    }

    return comparison * multiplier
  })
}

/**
 * Filter inventory items by criteria
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

    // Search filter (case-insensitive, searches item name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (!item.itemName.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    return true
  })
}

/**
 * Get unique categories from inventory items
 */
export function getUniqueCategories(items: InventoryItemWithExpiry[]): string[] {
  const categories = new Set<string>()
  items.forEach(item => {
    if (item.category) categories.add(item.category)
  })
  return Array.from(categories).sort()
}

/**
 * Get unique locations from inventory items
 */
export function getUniqueLocations(items: InventoryItemWithExpiry[]): (StorageLocation | null)[] {
  const locations = new Set<StorageLocation | null>()
  items.forEach(item => {
    locations.add(item.location)
  })
  return Array.from(locations)
}

/**
 * Calculate inventory statistics
 */
export function calculateInventoryStatistics(items: InventoryItemWithExpiry[]): InventoryStatistics {
  const stats: InventoryStatistics = {
    totalItems: items.length,
    activeItems: 0,
    expiredCount: 0,
    expiringSoonCount: 0,
    freshCount: 0,
    byCategory: {},
    byLocation: {
      fridge: 0,
      freezer: 0,
      cupboard: 0,
      pantry: 0,
      unassigned: 0,
    },
  }

  for (const item of items) {
    // Active count
    if (item.isActive) {
      stats.activeItems++
    }

    // Expiry status counts (only for active items)
    if (item.isActive) {
      switch (item.expiryStatus) {
        case 'expired':
          stats.expiredCount++
          break
        case 'expiringSoon':
          stats.expiringSoonCount++
          break
        case 'fresh':
          stats.freshCount++
          break
      }
    }

    // Category counts
    const category = item.category || 'Other'
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1

    // Location counts
    if (item.location) {
      stats.byLocation[item.location]++
    } else {
      stats.byLocation.unassigned++
    }
  }

  return stats
}

/**
 * Format expiry status for display
 */
export function formatExpiryStatus(status: ExpiryStatus, daysUntilExpiry: number | null): string {
  if (daysUntilExpiry === null) {
    return 'No expiry'
  }

  switch (status) {
    case 'expired': {
      const days = Math.abs(daysUntilExpiry)
      return days === 1 ? 'Expired 1 day ago' : `Expired ${days} days ago`
    }
    case 'expiringSoon':
      if (daysUntilExpiry === 0) return 'Expires today'
      if (daysUntilExpiry === 1) return 'Expires tomorrow'
      return `Expires in ${daysUntilExpiry} days`
    case 'fresh':
      if (daysUntilExpiry === 0) return 'Expires today'
      if (daysUntilExpiry === 1) return 'Expires tomorrow'
      return `Expires in ${daysUntilExpiry} days`
    default:
      return ''
  }
}

/**
 * Format date for display (e.g., "10 Dec 2025" or "No date")
 */
export function formatDate(date: Date | null): string {
  if (!date) return 'No date'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Format date as ISO string for API/forms (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | null): string {
  if (!date) return ''
  const d = new Date(date)
  return d.toISOString().split('T')[0]
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

/**
 * Check if an item is expiring within the next N days
 */
export function isExpiringWithinDays(item: InventoryItemWithExpiry, days: number): boolean {
  if (item.daysUntilExpiry === null) return false
  return item.daysUntilExpiry >= 0 && item.daysUntilExpiry <= days
}

/**
 * Check if an item is expired
 */
export function isExpired(item: InventoryItemWithExpiry): boolean {
  return item.expiryStatus === 'expired'
}

/**
 * Calculate an estimated expiry date based on typical shelf life
 */
export function calculateEstimatedExpiry(purchaseDate: Date, shelfLifeDays: number): Date {
  const expiry = new Date(purchaseDate)
  expiry.setDate(expiry.getDate() + shelfLifeDays)
  return expiry
}

/**
 * Get the CSS color class for expiry status badges
 */
export function getExpiryStatusColor(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'bg-red-100 text-red-800'
    case 'expiringSoon':
      return 'bg-amber-100 text-amber-800'
    case 'fresh':
      return 'bg-green-100 text-green-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

/**
 * Get the label for expiry status
 */
export function getExpiryStatusLabel(status: ExpiryStatus): string {
  switch (status) {
    case 'expired':
      return 'Expired'
    case 'expiringSoon':
      return 'Expiring Soon'
    case 'fresh':
      return 'Fresh'
    default:
      return 'Unknown'
  }
}

/**
 * Parse boolean from various input formats (for CSV import)
 */
export function parseBoolean(input: string): boolean {
  const normalized = input.toLowerCase().trim()
  return ['true', 'yes', '1', 'y', 'active', 'on'].includes(normalized)
}

/**
 * Parse storage location from string input (for CSV import)
 */
export function parseStorageLocation(input: string): StorageLocation | null {
  const normalized = input.toLowerCase().trim()
  const locationMap: Record<string, StorageLocation> = {
    'fridge': 'fridge',
    'refrigerator': 'fridge',
    'freezer': 'freezer',
    'cupboard': 'cupboard',
    'cabinet': 'cupboard',
    'pantry': 'pantry',
  }
  return locationMap[normalized] || null
}

/**
 * Get the display label for a storage location
 */
export function getLocationLabel(location: StorageLocation | null): string {
  if (!location) return ''
  const labels: Record<StorageLocation, string> = {
    fridge: 'Fridge',
    freezer: 'Freezer',
    cupboard: 'Cupboard',
    pantry: 'Pantry',
  }
  return labels[location] || location
}
