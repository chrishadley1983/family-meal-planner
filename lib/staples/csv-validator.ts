/**
 * CSV Validator for Staples Import
 */

import type {
  CSVStapleRow,
  CSVValidationResult,
  CSVImportSummary,
  CreateStapleRequest,
  StapleFrequency,
} from '@/lib/types/staples'
import { parseFrequency, parseBoolean } from './calculations'

/**
 * Validate a single CSV row
 */
export function validateRow(
  row: CSVStapleRow,
  rowNumber: number,
  existingNames: Set<string>,
  seenNames: Set<string>
): CSVValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let parsedData: CreateStapleRequest | undefined

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

  // Validate frequency
  let frequency: StapleFrequency = 'weekly'
  if (row.frequency.trim()) {
    const parsedFreq = parseFrequency(row.frequency)
    if (!parsedFreq) {
      errors.push(`Invalid frequency "${row.frequency}". Use: weekly, every_2_weeks, every_4_weeks, or every_3_months`)
    } else {
      frequency = parsedFreq
    }
  }

  // Parse active status
  const isActive = row.active.trim() ? parseBoolean(row.active) : true

  // Check for duplicates
  const normalizedName = name.toLowerCase()
  if (existingNames.has(normalizedName)) {
    warnings.push('Item already exists - will be skipped')
  } else if (seenNames.has(normalizedName)) {
    warnings.push('Duplicate in CSV - will be skipped')
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
      category: row.category.trim() || undefined,
      frequency: frequency,
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
  }
}

/**
 * Validate all CSV rows and return summary
 */
export function validateCSVData(
  rows: CSVStapleRow[],
  existingStapleNames: string[]
): CSVImportSummary {
  const existingNames = new Set(existingStapleNames.map(n => n.toLowerCase()))
  const seenNames = new Set<string>()

  const results: CSVValidationResult[] = []
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
 * Get items ready for import (valid items that aren't duplicates)
 */
export function getImportableItems(summary: CSVImportSummary): CreateStapleRequest[] {
  return summary.results
    .filter(r => r.status === 'valid' && r.parsedData)
    .map(r => r.parsedData!)
}

/**
 * Generate error report CSV
 */
export function generateErrorReport(summary: CSVImportSummary): string {
  const headers = ['Row', 'Name', 'Quantity', 'Unit', 'Category', 'Frequency', 'Active', 'Status', 'Issues']

  const rows = summary.results.map(r => [
    r.row.toString(),
    r.data.name,
    r.data.quantity,
    r.data.unit,
    r.data.category,
    r.data.frequency,
    r.data.active,
    r.status.toUpperCase(),
    [...r.errors, ...r.warnings].join('; '),
  ])

  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSVValue).join(','))
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
