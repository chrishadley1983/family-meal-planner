import type {
  StapleFrequency,
  StapleDueStatus,
  StapleWithDueStatus,
  StapleFilters,
  StapleSortOptions,
} from '@/lib/types/staples'

import { STAPLE_FREQUENCIES } from '@/lib/types/staples'

// Re-export frequencies for convenience
export { STAPLE_FREQUENCIES }

/**
 * Get the number of days for a frequency
 */
export function getFrequencyDays(frequency: StapleFrequency): number {
  const frequencies: Record<StapleFrequency, number> = {
    weekly: 7,
    every_2_weeks: 14,
    every_4_weeks: 28,
    every_3_months: 91,
  }
  return frequencies[frequency] ?? 7
}

/**
 * Calculate next due date from last added date and frequency
 */
export function calculateNextDueDate(lastAddedDate: Date | null, frequency: StapleFrequency): Date | null {
  if (!lastAddedDate) {
    return null // null means immediately due
  }

  const days = getFrequencyDays(frequency)
  const nextDue = new Date(lastAddedDate)
  nextDue.setDate(nextDue.getDate() + days)
  return nextDue
}

/**
 * Calculate due status based on next due date
 */
export function calculateDueStatus(nextDueDate: Date | null): StapleDueStatus {
  // If never added (null), it's immediately due
  if (!nextDueDate) {
    return 'due'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(nextDueDate)
  dueDate.setHours(0, 0, 0, 0)

  if (dueDate < today) {
    return 'overdue'
  } else if (dueDate.getTime() === today.getTime()) {
    return 'due'
  }
  return 'not_due'
}

/**
 * Calculate days until due (negative = overdue)
 */
export function calculateDaysUntilDue(nextDueDate: Date | null): number | null {
  if (!nextDueDate) {
    return 0 // immediately due
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dueDate = new Date(nextDueDate)
  dueDate.setHours(0, 0, 0, 0)

  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Type for raw staple from database (before enrichment)
 */
interface RawStaple {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  frequency: StapleFrequency
  isActive: boolean
  lastAddedDate: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Enrich a staple with calculated due status fields
 */
export function enrichStapleWithDueStatus(staple: RawStaple): StapleWithDueStatus {
  const nextDueDate = calculateNextDueDate(staple.lastAddedDate, staple.frequency)
  const dueStatus = calculateDueStatus(nextDueDate)
  const daysUntilDue = calculateDaysUntilDue(nextDueDate)

  return {
    ...staple,
    nextDueDate,
    dueStatus,
    daysUntilDue,
  }
}

/**
 * Sort staples by due status priority (overdue first, then due, then by next due date)
 */
export function sortStaplesByDueStatus(staples: StapleWithDueStatus[]): StapleWithDueStatus[] {
  return [...staples].sort((a, b) => {
    // Priority order: overdue (0) > due (1) > not_due (2)
    const statusOrder: Record<StapleDueStatus, number> = { overdue: 0, due: 1, not_due: 2 }
    const statusDiff = statusOrder[a.dueStatus] - statusOrder[b.dueStatus]

    if (statusDiff !== 0) return statusDiff

    // Within same status, sort by days until due (ascending)
    const aDays = a.daysUntilDue ?? 0
    const bDays = b.daysUntilDue ?? 0
    return aDays - bDays
  })
}

/**
 * Sort staples by specified field and order
 */
export function sortStaples(
  staples: StapleWithDueStatus[],
  options: StapleSortOptions
): StapleWithDueStatus[] {
  const { field, order } = options
  const multiplier = order === 'asc' ? 1 : -1

  return [...staples].sort((a, b) => {
    let comparison = 0

    switch (field) {
      case 'itemName':
        comparison = a.itemName.localeCompare(b.itemName)
        break
      case 'category':
        comparison = (a.category || '').localeCompare(b.category || '')
        break
      case 'frequency':
        comparison = getFrequencyDays(a.frequency) - getFrequencyDays(b.frequency)
        break
      case 'lastAddedDate':
        const aDate = a.lastAddedDate?.getTime() ?? 0
        const bDate = b.lastAddedDate?.getTime() ?? 0
        comparison = aDate - bDate
        break
      case 'nextDueDate':
        // null (immediately due) should come first in ascending order
        if (!a.nextDueDate && !b.nextDueDate) comparison = 0
        else if (!a.nextDueDate) comparison = -1
        else if (!b.nextDueDate) comparison = 1
        else comparison = a.nextDueDate.getTime() - b.nextDueDate.getTime()
        break
      default:
        comparison = 0
    }

    return comparison * multiplier
  })
}

/**
 * Filter staples by criteria
 */
export function filterStaples(
  staples: StapleWithDueStatus[],
  filters: StapleFilters
): StapleWithDueStatus[] {
  return staples.filter(staple => {
    if (filters.category && staple.category !== filters.category) {
      return false
    }
    if (filters.frequency && staple.frequency !== filters.frequency) {
      return false
    }
    if (filters.isActive !== undefined && staple.isActive !== filters.isActive) {
      return false
    }
    if (filters.dueStatus && staple.dueStatus !== filters.dueStatus) {
      return false
    }
    return true
  })
}

/**
 * Format frequency for display
 */
export function formatFrequency(frequency: StapleFrequency): string {
  const labels: Record<StapleFrequency, string> = {
    weekly: 'Weekly',
    every_2_weeks: 'Every 2 weeks',
    every_4_weeks: 'Every 4 weeks',
    every_3_months: 'Every 3 months',
  }
  return labels[frequency] ?? frequency
}

/**
 * Format due status for display
 */
export function formatDueStatus(status: StapleDueStatus, daysUntilDue: number | null): string {
  if (status === 'overdue') {
    const days = Math.abs(daysUntilDue ?? 0)
    return days === 1 ? '1 day overdue' : `${days} days overdue`
  }
  if (status === 'due') {
    return 'Due today'
  }
  if (daysUntilDue !== null && daysUntilDue > 0) {
    return daysUntilDue === 1 ? 'Due tomorrow' : `Due in ${daysUntilDue} days`
  }
  return ''
}

/**
 * Format date for display (e.g., "Dec 10, 2025" or "Never")
 */
export function formatDate(date: Date | null): string {
  if (!date) return 'Never'
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Parse frequency from various input formats (for CSV import)
 */
export function parseFrequency(input: string): StapleFrequency | null {
  const normalized = input.toLowerCase().trim().replace(/\s+/g, '_')

  const mappings: Record<string, StapleFrequency> = {
    'weekly': 'weekly',
    'every_week': 'weekly',
    'every_2_weeks': 'every_2_weeks',
    'every_two_weeks': 'every_2_weeks',
    'biweekly': 'every_2_weeks',
    'fortnightly': 'every_2_weeks',
    'every_4_weeks': 'every_4_weeks',
    'every_four_weeks': 'every_4_weeks',
    'monthly': 'every_4_weeks',
    'every_3_months': 'every_3_months',
    'every_three_months': 'every_3_months',
    'quarterly': 'every_3_months',
  }

  return mappings[normalized] ?? null
}

/**
 * Parse boolean from various input formats (for CSV import)
 */
export function parseBoolean(input: string): boolean {
  const normalized = input.toLowerCase().trim()
  return ['true', 'yes', '1', 'y', 'active', 'on'].includes(normalized)
}

/**
 * Get unique categories from staples
 */
export function getUniqueCategories(staples: StapleWithDueStatus[]): string[] {
  const categories = new Set<string>()
  staples.forEach(s => {
    if (s.category) categories.add(s.category)
  })
  return Array.from(categories).sort()
}

/**
 * Check if a staple is due or overdue (for import pre-selection)
 */
export function isDueOrOverdue(staple: StapleWithDueStatus): boolean {
  return staple.dueStatus === 'due' || staple.dueStatus === 'overdue'
}
