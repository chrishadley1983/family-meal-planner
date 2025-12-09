import { format, parseISO } from 'date-fns'

/**
 * Format date to DD/MM/YYYY format
 */
export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy')
}

/**
 * Format date and time to DD/MM/YYYY HH:mm format (24-hour)
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'dd/MM/yyyy HH:mm')
}

/**
 * Format time only to HH:mm format (24-hour)
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'HH:mm')
}

/**
 * Format date to a more readable format (e.g., "Mon 07/12/2025")
 */
export function formatDateWithDay(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'EEE dd/MM/yyyy')
}

/**
 * Format date range (e.g., "07/12/2025 - 13/12/2025")
 */
export function formatDateRange(startDate: Date | string, endDate: Date | string): string {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

/**
 * Format week range with year (e.g., "Week of 07/12/2025")
 */
export function formatWeekRange(startDate: Date | string): string {
  return `Week of ${formatDate(startDate)}`
}
