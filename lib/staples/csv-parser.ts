/**
 * CSV Parser for Staples Import
 */

import type { CSVStapleRow } from '@/lib/types/staples'

/**
 * Parse CSV string into array of row objects
 */
export function parseCSV(csvContent: string): CSVStapleRow[] {
  const lines = csvContent.trim().split(/\r?\n/)

  if (lines.length < 2) {
    return []
  }

  // Parse header row
  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim())

  // Map expected columns
  const nameIndex = findColumnIndex(headers, ['name', 'item', 'itemname', 'item_name', 'item name'])
  const quantityIndex = findColumnIndex(headers, ['quantity', 'qty', 'amount'])
  const unitIndex = findColumnIndex(headers, ['unit', 'units', 'measurement'])
  const categoryIndex = findColumnIndex(headers, ['category', 'cat', 'type'])
  const frequencyIndex = findColumnIndex(headers, ['frequency', 'freq', 'interval'])
  const activeIndex = findColumnIndex(headers, ['active', 'isactive', 'is_active', 'enabled', 'status'])

  if (nameIndex === -1) {
    throw new Error('CSV must have a "name" column')
  }

  // Parse data rows
  const rows: CSVStapleRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue // Skip empty lines

    const values = parseCSVLine(line)

    rows.push({
      name: values[nameIndex] || '',
      quantity: quantityIndex !== -1 ? values[quantityIndex] || '' : '',
      unit: unitIndex !== -1 ? values[unitIndex] || '' : '',
      category: categoryIndex !== -1 ? values[categoryIndex] || '' : '',
      frequency: frequencyIndex !== -1 ? values[frequencyIndex] || '' : '',
      active: activeIndex !== -1 ? values[activeIndex] || '' : 'yes',
    })
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  // Don't forget the last value
  values.push(current.trim())

  return values
}

/**
 * Find column index by checking multiple possible header names
 */
function findColumnIndex(headers: string[], possibleNames: string[]): number {
  for (const name of possibleNames) {
    const index = headers.indexOf(name)
    if (index !== -1) return index
  }
  return -1
}

/**
 * Generate CSV template content
 */
export function generateCSVTemplate(): string {
  const headers = ['name', 'quantity', 'unit', 'category', 'frequency', 'active']
  const exampleRows = [
    ['Milk', '2', 'L', 'Dairy & Eggs', 'weekly', 'yes'],
    ['Bread', '1', 'loaf', 'Bakery', 'weekly', 'yes'],
    ['Olive Oil', '500', 'ml', 'Pantry', 'every_4_weeks', 'yes'],
    ['Eggs', '12', 'pack', 'Dairy & Eggs', 'weekly', 'yes'],
    ['Butter', '250', 'g', 'Dairy & Eggs', 'every_2_weeks', 'yes'],
  ]

  const csvLines = [
    headers.join(','),
    ...exampleRows.map(row => row.map(escapeCSVValue).join(','))
  ]

  return csvLines.join('\n')
}

/**
 * Escape a value for CSV (add quotes if contains comma, newline, or quote)
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Download CSV content as a file
 */
export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
