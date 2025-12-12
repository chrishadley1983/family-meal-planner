/**
 * Staples Calculations Tests
 * Tests for staple due dates, frequencies, filtering, and sorting
 */

import {
  getFrequencyDays,
  calculateNextDueDate,
  calculateDueStatus,
  calculateDaysUntilDue,
  enrichStapleWithDueStatus,
  sortStaplesByDueStatus,
  sortStaples,
  filterStaples,
  formatFrequency,
  formatDueStatus,
  formatDate,
  parseFrequency,
  parseBoolean,
  getUniqueCategories,
  isDueOrOverdue,
} from '@/lib/staples/calculations'
import { mockDate, restoreDate } from '../setup'
import { testStaples } from '../fixtures/test-data'
import type { StapleFrequency, StapleDueStatus, StapleWithDueStatus } from '@/lib/types/staples'

describe('Staples Calculations', () => {
  const TODAY = new Date('2024-01-10')

  beforeEach(() => {
    mockDate(TODAY)
  })

  afterEach(() => {
    restoreDate()
  })

  describe('getFrequencyDays', () => {
    it('should return correct days for weekly', () => {
      expect(getFrequencyDays('weekly')).toBe(7)
    })

    it('should return correct days for every_2_weeks', () => {
      expect(getFrequencyDays('every_2_weeks')).toBe(14)
    })

    it('should return correct days for every_4_weeks', () => {
      expect(getFrequencyDays('every_4_weeks')).toBe(28)
    })

    it('should return correct days for every_3_months', () => {
      expect(getFrequencyDays('every_3_months')).toBe(91)
    })

    it('should default to 7 for unknown frequency', () => {
      expect(getFrequencyDays('unknown' as StapleFrequency)).toBe(7)
    })
  })

  describe('calculateNextDueDate', () => {
    it('should return null for null lastAddedDate', () => {
      const nextDue = calculateNextDueDate(null, 'weekly')
      expect(nextDue).toBeNull()
    })

    it('should calculate weekly due date correctly', () => {
      const lastAdded = new Date('2024-01-03')
      const nextDue = calculateNextDueDate(lastAdded, 'weekly')

      expect(nextDue).not.toBeNull()
      expect(nextDue!.getDate()).toBe(10) // 3 + 7 = 10
    })

    it('should calculate bi-weekly due date correctly', () => {
      const lastAdded = new Date('2024-01-01')
      const nextDue = calculateNextDueDate(lastAdded, 'every_2_weeks')

      expect(nextDue).not.toBeNull()
      expect(nextDue!.getDate()).toBe(15) // 1 + 14 = 15
    })

    it('should calculate monthly due date correctly', () => {
      const lastAdded = new Date('2024-01-01')
      const nextDue = calculateNextDueDate(lastAdded, 'every_4_weeks')

      expect(nextDue).not.toBeNull()
      expect(nextDue!.getDate()).toBe(29) // 1 + 28 = 29
    })

    it('should handle month boundaries', () => {
      const lastAdded = new Date('2024-01-25')
      const nextDue = calculateNextDueDate(lastAdded, 'weekly')

      expect(nextDue).not.toBeNull()
      expect(nextDue!.getMonth()).toBe(1) // February
      expect(nextDue!.getDate()).toBe(1) // 25 + 7 = 32 -> Feb 1
    })
  })

  describe('calculateDueStatus', () => {
    it('should return dueToday for null (never added)', () => {
      expect(calculateDueStatus(null)).toBe('dueToday')
    })

    it('should return overdue for past dates', () => {
      const pastDate = new Date('2024-01-05') // 5 days ago
      expect(calculateDueStatus(pastDate)).toBe('overdue')
    })

    it('should return dueToday for today', () => {
      const today = new Date('2024-01-10')
      expect(calculateDueStatus(today)).toBe('dueToday')
    })

    it('should return dueSoon for next 1-3 days', () => {
      expect(calculateDueStatus(new Date('2024-01-11'))).toBe('dueSoon') // tomorrow
      expect(calculateDueStatus(new Date('2024-01-12'))).toBe('dueSoon') // 2 days
      expect(calculateDueStatus(new Date('2024-01-13'))).toBe('dueSoon') // 3 days
    })

    it('should return upcoming for 4-7 days', () => {
      expect(calculateDueStatus(new Date('2024-01-14'))).toBe('upcoming') // 4 days
      expect(calculateDueStatus(new Date('2024-01-17'))).toBe('upcoming') // 7 days
    })

    it('should return notDue for more than 7 days', () => {
      expect(calculateDueStatus(new Date('2024-01-18'))).toBe('notDue') // 8 days
      expect(calculateDueStatus(new Date('2024-02-10'))).toBe('notDue') // 31 days
    })
  })

  describe('calculateDaysUntilDue', () => {
    it('should return 0 for null (immediately due)', () => {
      expect(calculateDaysUntilDue(null)).toBe(0)
    })

    it('should return negative for overdue', () => {
      const pastDate = new Date('2024-01-05')
      expect(calculateDaysUntilDue(pastDate)).toBe(-5)
    })

    it('should return 0 for today', () => {
      const today = new Date('2024-01-10')
      expect(calculateDaysUntilDue(today)).toBe(0)
    })

    it('should return positive for future dates', () => {
      const futureDate = new Date('2024-01-15')
      expect(calculateDaysUntilDue(futureDate)).toBe(5)
    })
  })

  describe('enrichStapleWithDueStatus', () => {
    it('should add calculated fields to staple', () => {
      const rawStaple = {
        id: 'test-1',
        userId: 'user-1',
        itemName: 'Bread',
        quantity: 1,
        unit: 'loaf',
        category: 'Bakery',
        frequency: 'weekly' as StapleFrequency,
        isActive: true,
        lastAddedDate: new Date('2024-01-03'),
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      }

      const enriched = enrichStapleWithDueStatus(rawStaple)

      expect(enriched.nextDueDate).not.toBeNull()
      expect(enriched.nextDueDate!.getDate()).toBe(10) // Jan 3 + 7 days
      expect(enriched.dueStatus).toBe('dueToday')
      expect(enriched.daysUntilDue).toBe(0)
    })

    it('should handle never-added staples', () => {
      const rawStaple = {
        id: 'test-2',
        userId: 'user-1',
        itemName: 'Eggs',
        quantity: 12,
        unit: 'each',
        category: 'Dairy & Eggs',
        frequency: 'weekly' as StapleFrequency,
        isActive: true,
        lastAddedDate: null,
        notes: null,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      }

      const enriched = enrichStapleWithDueStatus(rawStaple)

      expect(enriched.nextDueDate).toBeNull()
      expect(enriched.dueStatus).toBe('dueToday')
      expect(enriched.daysUntilDue).toBe(0)
    })
  })

  describe('sortStaplesByDueStatus', () => {
    it('should sort overdue first, then dueToday, etc.', () => {
      const staples: StapleWithDueStatus[] = [
        { ...testStaples[0], dueStatus: 'notDue', daysUntilDue: 21 },
        { ...testStaples[1], dueStatus: 'overdue', daysUntilDue: -3 },
        { ...testStaples[2], dueStatus: 'dueToday', daysUntilDue: 0 },
      ]

      const sorted = sortStaplesByDueStatus(staples)

      expect(sorted[0].dueStatus).toBe('overdue')
      expect(sorted[1].dueStatus).toBe('dueToday')
      expect(sorted[2].dueStatus).toBe('notDue')
    })

    it('should sort by days within same status', () => {
      const staples: StapleWithDueStatus[] = [
        { ...testStaples[0], dueStatus: 'overdue', daysUntilDue: -2 },
        { ...testStaples[1], dueStatus: 'overdue', daysUntilDue: -5 },
        { ...testStaples[2], dueStatus: 'overdue', daysUntilDue: -1 },
      ]

      const sorted = sortStaplesByDueStatus(staples)

      expect(sorted[0].daysUntilDue).toBe(-5) // Most overdue first
      expect(sorted[1].daysUntilDue).toBe(-2)
      expect(sorted[2].daysUntilDue).toBe(-1)
    })
  })

  describe('sortStaples', () => {
    it('should sort by item name ascending', () => {
      const sorted = sortStaples(testStaples, { field: 'itemName', order: 'asc' })

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].itemName.localeCompare(sorted[i + 1].itemName)).toBeLessThanOrEqual(0)
      }
    })

    it('should sort by item name descending', () => {
      const sorted = sortStaples(testStaples, { field: 'itemName', order: 'desc' })

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].itemName.localeCompare(sorted[i + 1].itemName)).toBeGreaterThanOrEqual(0)
      }
    })

    it('should sort by frequency', () => {
      const sorted = sortStaples(testStaples, { field: 'frequency', order: 'asc' })

      for (let i = 0; i < sorted.length - 1; i++) {
        const freq1 = getFrequencyDays(sorted[i].frequency)
        const freq2 = getFrequencyDays(sorted[i + 1].frequency)
        expect(freq1).toBeLessThanOrEqual(freq2)
      }
    })

    it('should sort by next due date with nulls first in ascending', () => {
      const staplesWithMixedDates: StapleWithDueStatus[] = [
        { ...testStaples[0], nextDueDate: new Date('2024-01-20') },
        { ...testStaples[1], nextDueDate: null },
        { ...testStaples[2], nextDueDate: new Date('2024-01-15') },
      ]

      const sorted = sortStaples(staplesWithMixedDates, { field: 'nextDueDate', order: 'asc' })

      expect(sorted[0].nextDueDate).toBeNull()
    })
  })

  describe('filterStaples', () => {
    it('should filter by category', () => {
      const filtered = filterStaples(testStaples, { category: 'Bakery' })
      expect(filtered.every(s => s.category === 'Bakery')).toBe(true)
    })

    it('should filter by frequency', () => {
      const filtered = filterStaples(testStaples, { frequency: 'weekly' })
      expect(filtered.every(s => s.frequency === 'weekly')).toBe(true)
    })

    it('should filter by active status', () => {
      const filtered = filterStaples(testStaples, { isActive: true })
      expect(filtered.every(s => s.isActive === true)).toBe(true)
    })

    it('should filter by due status', () => {
      const filtered = filterStaples(testStaples, { dueStatus: 'dueToday' })
      expect(filtered.every(s => s.dueStatus === 'dueToday')).toBe(true)
    })

    it('should combine multiple filters', () => {
      const filtered = filterStaples(testStaples, {
        frequency: 'weekly',
        isActive: true,
      })

      filtered.forEach(s => {
        expect(s.frequency).toBe('weekly')
        expect(s.isActive).toBe(true)
      })
    })

    it('should return all with empty filters', () => {
      const filtered = filterStaples(testStaples, {})
      expect(filtered.length).toBe(testStaples.length)
    })
  })

  describe('formatFrequency', () => {
    it('should format frequency labels correctly', () => {
      expect(formatFrequency('weekly')).toBe('Weekly')
      expect(formatFrequency('every_2_weeks')).toBe('Every 2 weeks')
      expect(formatFrequency('every_4_weeks')).toBe('Every 4 weeks')
      expect(formatFrequency('every_3_months')).toBe('Every 3 months')
    })
  })

  describe('formatDueStatus', () => {
    it('should format overdue status', () => {
      expect(formatDueStatus('overdue', -1)).toBe('1 day overdue')
      expect(formatDueStatus('overdue', -5)).toBe('5 days overdue')
    })

    it('should format dueToday', () => {
      expect(formatDueStatus('dueToday', 0)).toBe('Due today')
    })

    it('should format dueSoon', () => {
      expect(formatDueStatus('dueSoon', 1)).toBe('Due tomorrow')
      expect(formatDueStatus('dueSoon', 3)).toBe('Due in 3 days')
    })

    it('should format upcoming', () => {
      expect(formatDueStatus('upcoming', 5)).toBe('Due in 5 days')
    })

    it('should format notDue', () => {
      expect(formatDueStatus('notDue', 14)).toBe('Due in 14 days')
      expect(formatDueStatus('notDue', null)).toBe('')
    })
  })

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2024-01-15')
      const formatted = formatDate(date)
      expect(formatted).toMatch(/15.*Jan.*2024/)
    })

    it('should return "Never" for null', () => {
      expect(formatDate(null)).toBe('Never')
    })
  })

  describe('parseFrequency', () => {
    it('should parse standard frequency names', () => {
      expect(parseFrequency('weekly')).toBe('weekly')
      expect(parseFrequency('every_2_weeks')).toBe('every_2_weeks')
      expect(parseFrequency('every_4_weeks')).toBe('every_4_weeks')
      expect(parseFrequency('every_3_months')).toBe('every_3_months')
    })

    it('should parse alternative names', () => {
      expect(parseFrequency('biweekly')).toBe('every_2_weeks')
      expect(parseFrequency('fortnightly')).toBe('every_2_weeks')
      expect(parseFrequency('monthly')).toBe('every_4_weeks')
      expect(parseFrequency('quarterly')).toBe('every_3_months')
    })

    it('should handle variations in formatting', () => {
      expect(parseFrequency('Every Week')).toBe('weekly')
      expect(parseFrequency('EVERY 2 WEEKS')).toBe('every_2_weeks')
      expect(parseFrequency('every two weeks')).toBe('every_2_weeks')
    })

    it('should return null for invalid input', () => {
      expect(parseFrequency('invalid')).toBeNull()
      expect(parseFrequency('daily')).toBeNull()
      expect(parseFrequency('yearly')).toBeNull()
    })
  })

  describe('parseBoolean', () => {
    it('should parse truthy values', () => {
      expect(parseBoolean('true')).toBe(true)
      expect(parseBoolean('yes')).toBe(true)
      expect(parseBoolean('1')).toBe(true)
      expect(parseBoolean('y')).toBe(true)
      expect(parseBoolean('active')).toBe(true)
      expect(parseBoolean('on')).toBe(true)
    })

    it('should parse falsy values', () => {
      expect(parseBoolean('false')).toBe(false)
      expect(parseBoolean('no')).toBe(false)
      expect(parseBoolean('0')).toBe(false)
      expect(parseBoolean('n')).toBe(false)
      expect(parseBoolean('inactive')).toBe(false)
      expect(parseBoolean('off')).toBe(false)
    })

    it('should be case-insensitive', () => {
      expect(parseBoolean('TRUE')).toBe(true)
      expect(parseBoolean('Yes')).toBe(true)
      expect(parseBoolean('FALSE')).toBe(false)
    })
  })

  describe('getUniqueCategories', () => {
    it('should return unique categories sorted', () => {
      const categories = getUniqueCategories(testStaples)

      // Check no duplicates
      expect(categories.length).toBe(new Set(categories).size)

      // Check sorted
      for (let i = 0; i < categories.length - 1; i++) {
        expect(categories[i].localeCompare(categories[i + 1])).toBeLessThanOrEqual(0)
      }
    })

    it('should exclude null categories', () => {
      const staplesWithNull: StapleWithDueStatus[] = [
        { ...testStaples[0], category: null },
        { ...testStaples[1], category: 'Bakery' },
      ]

      const categories = getUniqueCategories(staplesWithNull)
      expect(categories).not.toContain(null)
    })
  })

  describe('isDueOrOverdue', () => {
    it('should return true for overdue', () => {
      const staple: StapleWithDueStatus = { ...testStaples[0], dueStatus: 'overdue' }
      expect(isDueOrOverdue(staple)).toBe(true)
    })

    it('should return true for dueToday', () => {
      const staple: StapleWithDueStatus = { ...testStaples[0], dueStatus: 'dueToday' }
      expect(isDueOrOverdue(staple)).toBe(true)
    })

    it('should return true for dueSoon', () => {
      const staple: StapleWithDueStatus = { ...testStaples[0], dueStatus: 'dueSoon' }
      expect(isDueOrOverdue(staple)).toBe(true)
    })

    it('should return false for upcoming', () => {
      const staple: StapleWithDueStatus = { ...testStaples[0], dueStatus: 'upcoming' }
      expect(isDueOrOverdue(staple)).toBe(false)
    })

    it('should return false for notDue', () => {
      const staple: StapleWithDueStatus = { ...testStaples[0], dueStatus: 'notDue' }
      expect(isDueOrOverdue(staple)).toBe(false)
    })
  })
})
