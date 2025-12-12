/**
 * Expiry Calculations Tests
 * Tests for inventory expiry status, shelf life calculations, and filtering
 */

import {
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
} from '@/lib/inventory/expiry-calculations'
import { mockDate, restoreDate } from '../setup'
import { testInventoryItems } from '../fixtures/test-data'
import type { InventoryItem, InventoryItemWithExpiry } from '@/lib/types/inventory'

describe('Expiry Calculations', () => {
  // Use a fixed date for all tests
  const TODAY = new Date('2024-01-10')

  beforeEach(() => {
    mockDate(TODAY)
  })

  afterEach(() => {
    restoreDate()
  })

  describe('calculateDaysUntilExpiry', () => {
    it('should return positive days for future expiry', () => {
      const futureDate = new Date('2024-01-15')
      const days = calculateDaysUntilExpiry(futureDate)
      expect(days).toBe(5)
    })

    it('should return 0 for today', () => {
      const today = new Date('2024-01-10')
      const days = calculateDaysUntilExpiry(today)
      expect(days).toBe(0)
    })

    it('should return negative days for past expiry', () => {
      const pastDate = new Date('2024-01-05')
      const days = calculateDaysUntilExpiry(pastDate)
      expect(days).toBe(-5)
    })

    it('should return null for null expiry date', () => {
      const days = calculateDaysUntilExpiry(null)
      expect(days).toBeNull()
    })

    it('should handle dates far in the future', () => {
      const farFuture = new Date('2025-01-10')
      const days = calculateDaysUntilExpiry(farFuture)
      expect(days).toBe(366) // 2024 is a leap year
    })
  })

  describe('calculateShelfLifeDays', () => {
    it('should calculate shelf life between purchase and expiry', () => {
      const purchase = new Date('2024-01-01')
      const expiry = new Date('2024-01-15')
      const days = calculateShelfLifeDays(purchase, expiry)
      expect(days).toBe(14)
    })

    it('should return null for null expiry date', () => {
      const purchase = new Date('2024-01-01')
      const days = calculateShelfLifeDays(purchase, null)
      expect(days).toBeNull()
    })

    it('should handle same day purchase and expiry', () => {
      const sameDay = new Date('2024-01-10')
      const days = calculateShelfLifeDays(sameDay, sameDay)
      expect(days).toBe(0)
    })
  })

  describe('calculateExpiryStatus', () => {
    it('should return "expired" for negative days', () => {
      expect(calculateExpiryStatus(-1, 7)).toBe('expired')
      expect(calculateExpiryStatus(-10, 14)).toBe('expired')
    })

    it('should return "expiring_soon" for items within threshold', () => {
      // With 10-day shelf life, threshold is max(2, 10*0.2) = 2
      expect(calculateExpiryStatus(0, 10)).toBe('expiring_soon')
      expect(calculateExpiryStatus(1, 10)).toBe('expiring_soon')
      expect(calculateExpiryStatus(2, 10)).toBe('expiring_soon')
    })

    it('should return "fresh" for items with plenty of time', () => {
      expect(calculateExpiryStatus(10, 14)).toBe('fresh')
      expect(calculateExpiryStatus(7, 10)).toBe('fresh')
    })

    it('should return "fresh" for null days (no expiry date)', () => {
      expect(calculateExpiryStatus(null, null)).toBe('fresh')
      expect(calculateExpiryStatus(null, 7)).toBe('fresh')
    })

    it('should use minimum threshold of 2 days', () => {
      // With 5-day shelf life, 20% = 1, but minimum is 2
      expect(calculateExpiryStatus(2, 5)).toBe('expiring_soon')
      expect(calculateExpiryStatus(3, 5)).toBe('fresh')
    })

    it('should use 20% of shelf life when greater than 2', () => {
      // With 20-day shelf life, 20% = 4
      expect(calculateExpiryStatus(3, 20)).toBe('expiring_soon')
      expect(calculateExpiryStatus(4, 20)).toBe('expiring_soon')
      expect(calculateExpiryStatus(5, 20)).toBe('fresh')
    })
  })

  describe('enrichInventoryItemWithExpiry', () => {
    it('should add calculated expiry fields', () => {
      const item: InventoryItem = {
        ...testInventoryItems[0],
        expiryDate: new Date('2024-01-15'),
        purchaseDate: new Date('2024-01-05'),
      }

      const enriched = enrichInventoryItemWithExpiry(item)

      expect(enriched.daysUntilExpiry).toBe(5)
      expect(enriched.shelfLifeDays).toBe(10)
      expect(enriched.expiryStatus).toBe('fresh')
    })

    it('should handle items without expiry date', () => {
      const item: InventoryItem = {
        ...testInventoryItems[2],
        expiryDate: null,
      }

      const enriched = enrichInventoryItemWithExpiry(item)

      expect(enriched.daysUntilExpiry).toBeNull()
      expect(enriched.shelfLifeDays).toBeNull()
      expect(enriched.expiryStatus).toBe('fresh')
    })

    it('should mark expired items correctly', () => {
      const item: InventoryItem = {
        ...testInventoryItems[0],
        expiryDate: new Date('2024-01-05'), // 5 days ago
        purchaseDate: new Date('2024-01-01'),
      }

      const enriched = enrichInventoryItemWithExpiry(item)

      expect(enriched.daysUntilExpiry).toBe(-5)
      expect(enriched.expiryStatus).toBe('expired')
    })
  })

  describe('enrichInventoryItemsWithExpiry', () => {
    it('should enrich all items in array', () => {
      const enriched = enrichInventoryItemsWithExpiry(testInventoryItems)

      expect(enriched.length).toBe(testInventoryItems.length)
      enriched.forEach(item => {
        expect(item).toHaveProperty('daysUntilExpiry')
        expect(item).toHaveProperty('shelfLifeDays')
        expect(item).toHaveProperty('expiryStatus')
      })
    })
  })

  describe('filterInventoryItems', () => {
    let enrichedItems: InventoryItemWithExpiry[]

    beforeEach(() => {
      enrichedItems = enrichInventoryItemsWithExpiry(testInventoryItems)
    })

    it('should filter by category', () => {
      const filtered = filterInventoryItems(enrichedItems, { category: 'Dairy & Eggs' })
      expect(filtered.every(item => item.category === 'Dairy & Eggs')).toBe(true)
    })

    it('should filter by location', () => {
      const filtered = filterInventoryItems(enrichedItems, { location: 'fridge' })
      expect(filtered.every(item => item.location === 'fridge')).toBe(true)
    })

    it('should filter by expiry status', () => {
      const filtered = filterInventoryItems(enrichedItems, { expiryStatus: 'expired' })
      expect(filtered.every(item => item.expiryStatus === 'expired')).toBe(true)
    })

    it('should filter by active status', () => {
      const filtered = filterInventoryItems(enrichedItems, { isActive: true })
      expect(filtered.every(item => item.isActive === true)).toBe(true)
    })

    it('should filter by search term in name', () => {
      const filtered = filterInventoryItems(enrichedItems, { searchTerm: 'chicken' })
      expect(filtered.some(item => item.itemName.toLowerCase().includes('chicken'))).toBe(true)
    })

    it('should filter by search term in category', () => {
      const filtered = filterInventoryItems(enrichedItems, { searchTerm: 'dairy' })
      expect(filtered.some(item => item.category.toLowerCase().includes('dairy'))).toBe(true)
    })

    it('should combine multiple filters', () => {
      const filtered = filterInventoryItems(enrichedItems, {
        category: 'Dairy & Eggs',
        location: 'fridge',
        isActive: true,
      })

      filtered.forEach(item => {
        expect(item.category).toBe('Dairy & Eggs')
        expect(item.location).toBe('fridge')
        expect(item.isActive).toBe(true)
      })
    })

    it('should return all items with empty filters', () => {
      const filtered = filterInventoryItems(enrichedItems, {})
      expect(filtered.length).toBe(enrichedItems.length)
    })
  })

  describe('sortByExpiryPriority', () => {
    it('should sort expired items first', () => {
      const items: InventoryItemWithExpiry[] = [
        { ...testInventoryItems[0], daysUntilExpiry: 5, shelfLifeDays: 7, expiryStatus: 'fresh' },
        { ...testInventoryItems[1], daysUntilExpiry: -2, shelfLifeDays: 7, expiryStatus: 'expired' },
        { ...testInventoryItems[2], daysUntilExpiry: 1, shelfLifeDays: 7, expiryStatus: 'expiring_soon' },
      ]

      const sorted = sortByExpiryPriority(items)

      expect(sorted[0].expiryStatus).toBe('expired')
      expect(sorted[1].expiryStatus).toBe('expiring_soon')
      expect(sorted[2].expiryStatus).toBe('fresh')
    })

    it('should sort by days within same status', () => {
      const items: InventoryItemWithExpiry[] = [
        { ...testInventoryItems[0], daysUntilExpiry: 10, shelfLifeDays: 14, expiryStatus: 'fresh', itemName: 'A' },
        { ...testInventoryItems[1], daysUntilExpiry: 5, shelfLifeDays: 14, expiryStatus: 'fresh', itemName: 'B' },
        { ...testInventoryItems[2], daysUntilExpiry: 7, shelfLifeDays: 14, expiryStatus: 'fresh', itemName: 'C' },
      ]

      const sorted = sortByExpiryPriority(items)

      expect(sorted[0].daysUntilExpiry).toBe(5)
      expect(sorted[1].daysUntilExpiry).toBe(7)
      expect(sorted[2].daysUntilExpiry).toBe(10)
    })

    it('should sort items without expiry date last', () => {
      const items: InventoryItemWithExpiry[] = [
        { ...testInventoryItems[0], daysUntilExpiry: null, shelfLifeDays: null, expiryStatus: 'fresh', itemName: 'A' },
        { ...testInventoryItems[1], daysUntilExpiry: 5, shelfLifeDays: 7, expiryStatus: 'fresh', itemName: 'B' },
      ]

      const sorted = sortByExpiryPriority(items)

      expect(sorted[0].daysUntilExpiry).toBe(5)
      expect(sorted[1].daysUntilExpiry).toBeNull()
    })
  })

  describe('sortInventoryItems', () => {
    let enrichedItems: InventoryItemWithExpiry[]

    beforeEach(() => {
      enrichedItems = enrichInventoryItemsWithExpiry(testInventoryItems)
    })

    it('should sort by item name ascending', () => {
      const sorted = sortInventoryItems(enrichedItems, { field: 'itemName', order: 'asc' })
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].itemName.localeCompare(sorted[i + 1].itemName)).toBeLessThanOrEqual(0)
      }
    })

    it('should sort by item name descending', () => {
      const sorted = sortInventoryItems(enrichedItems, { field: 'itemName', order: 'desc' })
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].itemName.localeCompare(sorted[i + 1].itemName)).toBeGreaterThanOrEqual(0)
      }
    })

    it('should sort by quantity', () => {
      const sorted = sortInventoryItems(enrichedItems, { field: 'quantity', order: 'asc' })
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].quantity).toBeLessThanOrEqual(sorted[i + 1].quantity)
      }
    })

    it('should sort by category', () => {
      const sorted = sortInventoryItems(enrichedItems, { field: 'category', order: 'asc' })
      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].category.localeCompare(sorted[i + 1].category)).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('getUniqueCategories', () => {
    it('should return unique categories sorted alphabetically', () => {
      const enrichedItems = enrichInventoryItemsWithExpiry(testInventoryItems)
      const categories = getUniqueCategories(enrichedItems)

      expect(categories).toContain('Meat & Fish')
      expect(categories).toContain('Dairy & Eggs')
      expect(categories).toContain('Cupboard Staples')

      // Check alphabetical order
      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].localeCompare(categories[i + 1])).toBeLessThanOrEqual(0)
      }
    })
  })

  describe('formatDaysUntilExpiry', () => {
    it('should format positive days', () => {
      expect(formatDaysUntilExpiry(5)).toBe('Expires in 5 days')
      expect(formatDaysUntilExpiry(1)).toBe('Expires tomorrow')
      expect(formatDaysUntilExpiry(0)).toBe('Expires today')
    })

    it('should format negative days (expired)', () => {
      expect(formatDaysUntilExpiry(-1)).toBe('Expired 1 day ago')
      expect(formatDaysUntilExpiry(-5)).toBe('Expired 5 days ago')
    })

    it('should handle null', () => {
      expect(formatDaysUntilExpiry(null)).toBe('No expiry')
    })
  })

  describe('formatExpiryDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-15')
      const formatted = formatExpiryDate(date)
      expect(formatted).toMatch(/15.*Jan.*2024/)
    })

    it('should indicate estimated dates', () => {
      const date = new Date('2024-01-15')
      const formatted = formatExpiryDate(date, true)
      expect(formatted).toContain('(Est.)')
    })

    it('should handle null date', () => {
      expect(formatExpiryDate(null)).toBe('No expiry set')
    })
  })

  describe('calculateExpiryFromShelfLife', () => {
    it('should calculate expiry from purchase date and shelf life', () => {
      const purchase = new Date('2024-01-10')
      const expiry = calculateExpiryFromShelfLife(purchase, 7)

      expect(expiry.getFullYear()).toBe(2024)
      expect(expiry.getMonth()).toBe(0) // January
      expect(expiry.getDate()).toBe(17)
    })

    it('should handle month boundaries', () => {
      const purchase = new Date('2024-01-28')
      const expiry = calculateExpiryFromShelfLife(purchase, 7)

      expect(expiry.getMonth()).toBe(1) // February
      expect(expiry.getDate()).toBe(4)
    })
  })

  describe('isSmallQuantity', () => {
    it('should identify small gram quantities', () => {
      expect(isSmallQuantity(3, 'g', 5, 5)).toBe(true)
      expect(isSmallQuantity(5, 'g', 5, 5)).toBe(true)
      expect(isSmallQuantity(10, 'g', 5, 5)).toBe(false)
    })

    it('should convert kg to grams for comparison', () => {
      expect(isSmallQuantity(0.003, 'kg', 5, 5)).toBe(true)
      expect(isSmallQuantity(0.01, 'kg', 5, 5)).toBe(false)
    })

    it('should identify small ml quantities', () => {
      expect(isSmallQuantity(3, 'ml', 5, 5)).toBe(true)
      expect(isSmallQuantity(10, 'ml', 5, 5)).toBe(false)
    })

    it('should convert L to ml for comparison', () => {
      expect(isSmallQuantity(0.003, 'L', 5, 5)).toBe(true)
      expect(isSmallQuantity(0.01, 'L', 5, 5)).toBe(false)
    })

    it('should never consider count units as small', () => {
      expect(isSmallQuantity(1, 'piece', 5, 5)).toBe(false)
      expect(isSmallQuantity(1, 'each', 5, 5)).toBe(false)
    })
  })

  describe('getInventoryStats', () => {
    it('should calculate inventory statistics', () => {
      const enrichedItems = enrichInventoryItemsWithExpiry(testInventoryItems)
      const stats = getInventoryStats(enrichedItems)

      expect(stats.total).toBe(testInventoryItems.length)
      expect(stats.active).toBeLessThanOrEqual(stats.total)
      expect(stats.expired + stats.expiringSoon + stats.fresh).toBeLessThanOrEqual(stats.active)
    })

    it('should handle empty inventory', () => {
      const stats = getInventoryStats([])

      expect(stats.total).toBe(0)
      expect(stats.active).toBe(0)
      expect(stats.expired).toBe(0)
      expect(stats.expiringSoon).toBe(0)
      expect(stats.fresh).toBe(0)
    })
  })
})
