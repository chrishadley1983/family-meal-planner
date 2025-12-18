/**
 * CSV Validator for Inventory Import
 */

import type {
  CSVInventoryRow,
  CSVValidationResult,
  CSVImportSummary,
  CreateInventoryItemRequest,
  StorageLocation,
} from '@/lib/types/inventory'

// Use base types directly (aliases removed for cleaner code)
type CSVInventoryValidationResult = CSVValidationResult
type CSVInventoryImportSummary = CSVImportSummary
import { parseBoolean, parseStorageLocation, calculateEstimatedExpiry } from './calculations'
import { fuzzyLookupShelfLife } from './shelf-life-data'
import { DEFAULT_CATEGORIES } from '@/lib/unit-conversion'

// Valid category names (case-insensitive matching)
const validCategories = DEFAULT_CATEGORIES.map(c => c.name.toLowerCase())

/**
 * Validate a single CSV row
 */
export function validateRow(
  row: CSVInventoryRow,
  rowNumber: number,
  existingNames: Set<string>,
  seenNames: Set<string>
): CSVInventoryValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let parsedData: CreateInventoryItemRequest | undefined
  let calculatedExpiry: Date | undefined
  let expiryIsEstimated = false

  // Validate required fields
  const name = row.name.trim()
  if (!name) {
    errors.push('Name is required')
  }

  const quantity = parseFloat(row.quantity)
  if (row.quantity.trim() === '') {
    errors.push('Quantity is required')
  } else if (isNaN(quantity) || quantity <= 0) {
    errors.push('Quantity must be a positive number')
  }

  const unit = row.unit.trim()
  if (!unit) {
    errors.push('Unit is required')
  }

  // Validate category
  let category = row.category.trim()
  if (!category) {
    errors.push('Category is required')
  } else {
    // Try to match to a valid category (case-insensitive)
    const categoryLower = category.toLowerCase()
    const matchedCategory = DEFAULT_CATEGORIES.find(
      c => c.name.toLowerCase() === categoryLower
    )
    if (matchedCategory) {
      category = matchedCategory.name
    } else {
      warnings.push(`Unknown category "${category}" - verify it matches your categories`)
    }
  }

  // Validate location (optional)
  let location: StorageLocation | null = null
  const locationStr = row.location?.trim() || ''
  if (locationStr) {
    location = parseStorageLocation(locationStr)
    if (!location) {
      warnings.push(`Invalid location "${locationStr}". Use: fridge, freezer, cupboard, or pantry`)
    }
  }

  // Validate/calculate expiry date
  let expiryDate: Date | null = null
  const expiryStr = (row.expiry_date || row.expiryDate || '').trim()
  if (expiryStr) {
    const parsed = new Date(expiryStr)
    if (isNaN(parsed.getTime())) {
      errors.push(`Invalid date format "${expiryStr}". Use YYYY-MM-DD`)
    } else {
      expiryDate = parsed
      // Warn if date is in the past
      if (parsed < new Date()) {
        warnings.push('Expiry date is in the past')
      }
    }
  } else if (name) {
    // Try to calculate from shelf life data
    const shelfLife = fuzzyLookupShelfLife(name)
    if (shelfLife) {
      calculatedExpiry = calculateEstimatedExpiry(new Date(), shelfLife.typicalShelfLifeDays)
      expiryIsEstimated = true
      warnings.push(`Expiry will be estimated (${shelfLife.typicalShelfLifeDays} days from now)`)
      // Also suggest location if not provided
      if (!location && shelfLife.defaultLocation) {
        location = shelfLife.defaultLocation
      }
    }
  }

  // Parse active status
  const activeStr = row.active?.trim() || ''
  const isActive = activeStr ? parseBoolean(activeStr) : true

  // Check for duplicates
  const normalizedName = name.toLowerCase()
  if (existingNames.has(normalizedName)) {
    warnings.push('Item already exists in inventory')
  } else if (seenNames.has(normalizedName)) {
    warnings.push('Duplicate in CSV')
  }

  // Mark name as seen
  if (name) {
    seenNames.add(normalizedName)
  }

  // Determine status
  let status: 'valid' | 'warning' | 'error' = 'valid'
  if (errors.length > 0) {
    status = 'error'
  } else if (warnings.length > 0) {
    status = 'warning'
  }

  // Create parsed data if valid
  if (errors.length === 0) {
    parsedData = {
      itemName: name,
      quantity: quantity,
      unit: unit,
      category: category,
      location: location || undefined,
      expiryDate: expiryDate?.toISOString().split('T')[0],
      isActive: isActive,
    }
  }

  return {
    row: rowNumber,
    data: row,
    status,
    errors,
    warnings,
    parsedData,
    calculatedExpiry,
    expiryIsEstimated,
  }
}

/**
 * Validate all CSV rows and return summary
 */
export function validateCSVData(
  rows: CSVInventoryRow[],
  existingItemNames: string[]
): CSVInventoryImportSummary {
  const existingNames = new Set(existingItemNames.map(n => n.toLowerCase()))
  const seenNames = new Set<string>()

  const results: CSVInventoryValidationResult[] = []
  let validCount = 0
  let warningCount = 0
  let errorCount = 0
  let duplicateCount = 0

  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], i + 1, existingNames, seenNames)
    results.push(result)

    if (result.status === 'error') {
      errorCount++
    } else if (result.status === 'warning') {
      warningCount++
      if (result.warnings.some(w => w.includes('Duplicate') || w.includes('already exists'))) {
        duplicateCount++
      }
    } else {
      validCount++
    }
  }

  return {
    totalRows: rows.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    results,
  }
}

/**
 * Get items ready for import (valid items, optionally including those with warnings)
 */
export function getImportableItems(
  summary: CSVInventoryImportSummary,
  includeWarnings: boolean = false
): { data: CreateInventoryItemRequest; expiryIsEstimated: boolean }[] {
  return summary.results
    .filter(r => {
      if (r.status === 'valid' && r.parsedData) return true
      if (includeWarnings && r.status === 'warning' && r.parsedData) {
        // Exclude duplicates
        const isDuplicate = r.warnings.some(w =>
          w.includes('Duplicate') || w.includes('already exists')
        )
        return !isDuplicate
      }
      return false
    })
    .map(r => ({
      data: r.parsedData!,
      expiryIsEstimated: r.expiryIsEstimated || false,
    }))
}

/**
 * Generate error report CSV
 */
export function generateErrorReport(summary: CSVInventoryImportSummary): string {
  const headers = ['Row', 'Name', 'Quantity', 'Unit', 'Category', 'Location', 'Expiry', 'Active', 'Status', 'Issues']

  const rows = summary.results.map((r: CSVValidationResult) => [
    r.row.toString(),
    r.data.name || '',
    String(r.data.quantity || ''),
    r.data.unit || '',
    r.data.category || '',
    r.data.location || '',
    r.data.expiry_date || r.data.expiryDate || '',
    r.data.active || '',
    r.status.toUpperCase(),
    [...r.errors, ...r.warnings].join('; '),
  ])

  const csvLines = [
    headers.join(','),
    ...rows.map((row: string[]) => row.map(escapeCSVValue).join(','))
  ]

  return csvLines.join('\n')
}

/**
 * Escape a value for CSV
 */
function escapeCSVValue(value: string): string {
  if (value.includes(',') || value.includes('\n') || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
