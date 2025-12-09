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

/**
 * Get ordered array of day names starting from a given date
 * @param weekStartDate - The date the week starts on
 * @returns Array of day names in chronological order (e.g., ['Tuesday', 'Wednesday', ..., 'Monday'])
 */
export function getDayOrderFromStartDate(weekStartDate: Date | string): string[] {
  const dateObj = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : weekStartDate
  const dayIndex = dateObj.getDay() // 0=Sunday, 1=Monday, etc.

  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Rotate the array to start from the given day
  return [...allDays.slice(dayIndex), ...allDays.slice(0, dayIndex)]
}

/**
 * Get ordered array of day names (lowercase) starting from a given date
 * @param weekStartDate - The date the week starts on
 * @returns Array of lowercase day names (e.g., ['tuesday', 'wednesday', ..., 'monday'])
 */
export function getDayOrderLowercase(weekStartDate: Date | string): string[] {
  return getDayOrderFromStartDate(weekStartDate).map(day => day.toLowerCase())
}

/**
 * Get array of objects with day names and their corresponding dates for a week
 * @param weekStartDate - The date the week starts on
 * @returns Array of {day: string, date: Date, formatted: string} objects
 */
export function getWeekDaysWithDates(weekStartDate: Date | string): Array<{
  day: string
  dayLower: string
  date: Date
  shortDate: string
  fullDate: string
}> {
  const startDate = typeof weekStartDate === 'string' ? parseISO(weekStartDate) : weekStartDate
  const days = getDayOrderFromStartDate(startDate)

  return days.map((day, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)

    return {
      day,
      dayLower: day.toLowerCase(),
      date,
      shortDate: format(date, 'd MMM'), // e.g., "9 Dec"
      fullDate: format(date, 'dd/MM/yyyy') // e.g., "09/12/2025"
    }
  })
}
