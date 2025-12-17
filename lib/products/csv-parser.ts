/**
 * CSV Parser for Products Import
 *
 * Handles parsing, validation, and transformation of CSV data
 * for bulk product imports.
 */

import {
  CSVProductRow,
  CSVValidationResult,
  CSVImportSummary,
  CreateProductRequest,
  PRODUCT_CATEGORIES,
  ProductCategory,
} from '@/lib/types/product'

// Expected CSV headers (case-insensitive matching)
const EXPECTED_HEADERS = [
  'name',
  'brand',
  'category',
  'quantity',
  'unit_of_measure',
  'serving_size',
  'calories_per_serving',
  'protein_per_serving',
  'carbs_per_serving',
  'fat_per_serving',
  'fiber_per_serving',
  'sugar_per_serving',
  'saturated_fat_per_serving',
  'sodium_per_serving',
  'is_snack',
  'notes',
  'barcode',
]

// Header aliases for flexible matching
const HEADER_ALIASES: Record<string, string> = {
  'product_name': 'name',
  'product name': 'name',
  'item': 'name',
  'item_name': 'name',
  'brand_name': 'brand',
  'brand name': 'brand',
  'manufacturer': 'brand',
  'cat': 'category',
  'type': 'category',
  'qty': 'quantity',
  'amount': 'quantity',
  'unit': 'unit_of_measure',
  'uom': 'unit_of_measure',
  'units': 'unit_of_measure',
  'serving': 'serving_size',
  'portion': 'serving_size',
  'portion_size': 'serving_size',
  'calories': 'calories_per_serving',
  'kcal': 'calories_per_serving',
  'energy': 'calories_per_serving',
  'protein': 'protein_per_serving',
  'carbs': 'carbs_per_serving',
  'carbohydrates': 'carbs_per_serving',
  'fat': 'fat_per_serving',
  'total_fat': 'fat_per_serving',
  'fiber': 'fiber_per_serving',
  'fibre': 'fiber_per_serving',
  'dietary_fiber': 'fiber_per_serving',
  'sugar': 'sugar_per_serving',
  'sugars': 'sugar_per_serving',
  'saturated_fat': 'saturated_fat_per_serving',
  'sat_fat': 'saturated_fat_per_serving',
  'sodium': 'sodium_per_serving',
  'salt': 'sodium_per_serving',
  'snack': 'is_snack',
  'is_a_snack': 'is_snack',
  'note': 'notes',
  'comments': 'notes',
  'description': 'notes',
  'upc': 'barcode',
  'ean': 'barcode',
  'product_code': 'barcode',
}

// Category aliases for flexible matching
const CATEGORY_ALIASES: Record<string, ProductCategory> = {
  'ready meal': 'Ready Meals',
  'ready meals': 'Ready Meals',
  'prepared meal': 'Ready Meals',
  'prepared meals': 'Ready Meals',
  'microwave meal': 'Ready Meals',
  'snack bar': 'Snack Bars',
  'snack bars': 'Snack Bars',
  'protein bar': 'Snack Bars',
  'protein bars': 'Snack Bars',
  'granola bar': 'Snack Bars',
  'energy bar': 'Snack Bars',
  'crisps': 'Crisps & Savoury Snacks',
  'chips': 'Crisps & Savoury Snacks',
  'savoury snacks': 'Crisps & Savoury Snacks',
  'savory snacks': 'Crisps & Savoury Snacks',
  'crackers': 'Crisps & Savoury Snacks',
  'popcorn': 'Crisps & Savoury Snacks',
  'yoghurt': 'Yoghurts & Dairy Snacks',
  'yogurt': 'Yoghurts & Dairy Snacks',
  'yoghurts': 'Yoghurts & Dairy Snacks',
  'yogurts': 'Yoghurts & Dairy Snacks',
  'dairy snack': 'Yoghurts & Dairy Snacks',
  'dairy snacks': 'Yoghurts & Dairy Snacks',
  'cheese snack': 'Yoghurts & Dairy Snacks',
  'biscuit': 'Biscuits & Sweet Snacks',
  'biscuits': 'Biscuits & Sweet Snacks',
  'cookie': 'Biscuits & Sweet Snacks',
  'cookies': 'Biscuits & Sweet Snacks',
  'sweet snack': 'Biscuits & Sweet Snacks',
  'sweet snacks': 'Biscuits & Sweet Snacks',
  'chocolate': 'Biscuits & Sweet Snacks',
  'candy': 'Biscuits & Sweet Snacks',
  'sweets': 'Biscuits & Sweet Snacks',
  'nuts': 'Nuts & Seeds',
  'seeds': 'Nuts & Seeds',
  'nuts and seeds': 'Nuts & Seeds',
  'trail mix': 'Nuts & Seeds',
  'mixed nuts': 'Nuts & Seeds',
  'fruit snack': 'Fruit Snacks',
  'fruit snacks': 'Fruit Snacks',
  'dried fruit': 'Fruit Snacks',
  'fruit leather': 'Fruit Snacks',
  'fruit bar': 'Fruit Snacks',
  'frozen snack': 'Frozen Snacks',
  'frozen snacks': 'Frozen Snacks',
  'ice cream': 'Frozen Snacks',
  'frozen dessert': 'Frozen Snacks',
  'ice lolly': 'Frozen Snacks',
  'popsicle': 'Frozen Snacks',
  'drink': 'Drinks & Smoothies',
  'drinks': 'Drinks & Smoothies',
  'smoothie': 'Drinks & Smoothies',
  'smoothies': 'Drinks & Smoothies',
  'juice': 'Drinks & Smoothies',
  'beverage': 'Drinks & Smoothies',
  'beverages': 'Drinks & Smoothies',
  'other': 'Other',
  'misc': 'Other',
  'miscellaneous': 'Other',
}

/**
 * Parse CSV text into rows
 */
export function parseCSVText(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim())
  const rows: string[][] = []

  for (const line of lines) {
    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++ // Skip next quote
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        row.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }

    row.push(current.trim())
    rows.push(row)
  }

  return rows
}

/**
 * Normalize header names to standard format
 */
export function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim().replace(/\s+/g, '_')
  return HEADER_ALIASES[normalized] || normalized
}

/**
 * Map CSV row to typed object based on headers
 */
export function mapRowToObject(headers: string[], row: string[]): CSVProductRow {
  const obj: Record<string, string> = {}

  headers.forEach((header, index) => {
    const normalizedHeader = normalizeHeader(header)
    obj[normalizedHeader] = row[index] || ''
  })

  return {
    name: obj.name || '',
    brand: obj.brand || '',
    category: obj.category || '',
    quantity: obj.quantity || '',
    unit_of_measure: obj.unit_of_measure || '',
    serving_size: obj.serving_size || '',
    calories_per_serving: obj.calories_per_serving || '',
    protein_per_serving: obj.protein_per_serving || '',
    carbs_per_serving: obj.carbs_per_serving || '',
    fat_per_serving: obj.fat_per_serving || '',
    fiber_per_serving: obj.fiber_per_serving || '',
    sugar_per_serving: obj.sugar_per_serving || '',
    saturated_fat_per_serving: obj.saturated_fat_per_serving || '',
    sodium_per_serving: obj.sodium_per_serving || '',
    is_snack: obj.is_snack || '',
    notes: obj.notes || '',
    barcode: obj.barcode || '',
  }
}

/**
 * Normalize category to valid ProductCategory
 */
export function normalizeCategory(category: string): ProductCategory | null {
  if (!category) return null

  const normalized = category.toLowerCase().trim()

  // Check aliases first
  if (CATEGORY_ALIASES[normalized]) {
    return CATEGORY_ALIASES[normalized]
  }

  // Check exact match (case-insensitive)
  const exactMatch = PRODUCT_CATEGORIES.find(
    c => c.toLowerCase() === normalized
  )
  if (exactMatch) return exactMatch

  // Check partial match
  const partialMatch = PRODUCT_CATEGORIES.find(
    c => c.toLowerCase().includes(normalized) || normalized.includes(c.toLowerCase())
  )
  if (partialMatch) return partialMatch

  return null
}

/**
 * Parse boolean value from various formats
 */
export function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim()
  return ['true', 'yes', 'y', '1', 'x', '✓', '✔'].includes(normalized)
}

/**
 * Parse numeric value, returning null for empty/invalid
 */
export function parseNumber(value: string): number | null {
  if (!value || value.trim() === '') return null

  // Remove common formatting (commas, spaces, units)
  const cleaned = value.replace(/[,\s]/g, '').replace(/[a-zA-Z]+$/, '')
  const num = parseFloat(cleaned)

  return isNaN(num) ? null : num
}

/**
 * Parse integer value, returning null for empty/invalid
 */
export function parseInt(value: string): number | null {
  const num = parseNumber(value)
  return num !== null ? Math.round(num) : null
}

/**
 * Validate a single CSV row and return validation result
 */
export function validateRow(
  row: CSVProductRow,
  rowIndex: number,
  existingProducts: string[] = []
): CSVValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field: name
  if (!row.name || row.name.trim() === '') {
    errors.push('Product name is required')
  } else if (row.name.length > 255) {
    errors.push('Product name exceeds 255 characters')
  }

  // Check for duplicates
  const productKey = `${row.name.toLowerCase().trim()}|${row.brand.toLowerCase().trim()}`
  if (existingProducts.includes(productKey)) {
    warnings.push(`Duplicate product: "${row.name}" by "${row.brand || 'Unknown'}" already exists`)
  }

  // Required field: quantity (with default)
  const quantity = parseNumber(row.quantity)
  if (row.quantity && quantity !== null && quantity <= 0) {
    errors.push('Quantity must be positive')
  }

  // Category validation
  const category = normalizeCategory(row.category)
  if (row.category && !category) {
    warnings.push(`Unknown category "${row.category}", will use "Other"`)
  }

  // Numeric field validations
  const numericFields = [
    { name: 'calories_per_serving', value: row.calories_per_serving },
    { name: 'protein_per_serving', value: row.protein_per_serving },
    { name: 'carbs_per_serving', value: row.carbs_per_serving },
    { name: 'fat_per_serving', value: row.fat_per_serving },
    { name: 'fiber_per_serving', value: row.fiber_per_serving },
    { name: 'sugar_per_serving', value: row.sugar_per_serving },
    { name: 'saturated_fat_per_serving', value: row.saturated_fat_per_serving },
    { name: 'sodium_per_serving', value: row.sodium_per_serving },
  ]

  for (const field of numericFields) {
    if (field.value && field.value.trim() !== '') {
      const num = parseNumber(field.value)
      if (num === null) {
        warnings.push(`Invalid number for ${field.name.replace(/_/g, ' ')}: "${field.value}"`)
      } else if (num < 0) {
        errors.push(`${field.name.replace(/_/g, ' ')} cannot be negative`)
      }
    }
  }

  // Brand validation (optional but warn if missing for snacks)
  const isSnack = parseBoolean(row.is_snack)
  if (isSnack && !row.brand) {
    warnings.push('Snack products should have a brand for better organization')
  }

  // Build parsed data if valid
  let parsedData: CreateProductRequest | undefined

  if (errors.length === 0) {
    parsedData = {
      name: row.name.trim(),
      brand: row.brand?.trim() || undefined,
      category: category || 'Other',
      quantity: quantity || 1,
      unitOfMeasure: row.unit_of_measure?.trim() || 'pieces',
      servingSize: row.serving_size?.trim() || undefined,
      caloriesPerServing: parseInt(row.calories_per_serving) ?? undefined,
      proteinPerServing: parseNumber(row.protein_per_serving) ?? undefined,
      carbsPerServing: parseNumber(row.carbs_per_serving) ?? undefined,
      fatPerServing: parseNumber(row.fat_per_serving) ?? undefined,
      fiberPerServing: parseNumber(row.fiber_per_serving) ?? undefined,
      sugarPerServing: parseNumber(row.sugar_per_serving) ?? undefined,
      saturatedFatPerServing: parseNumber(row.saturated_fat_per_serving) ?? undefined,
      sodiumPerServing: parseNumber(row.sodium_per_serving) ?? undefined,
      isSnack: isSnack,
      notes: row.notes?.trim() || undefined,
      barcode: row.barcode?.trim() || undefined,
    }
  }

  return {
    row: rowIndex,
    data: row,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
    parsedData,
  }
}

/**
 * Parse and validate entire CSV file
 */
export function parseAndValidateCSV(
  csvText: string,
  existingProducts: string[] = []
): CSVImportSummary {
  const rows = parseCSVText(csvText)

  if (rows.length === 0) {
    return {
      totalRows: 0,
      validCount: 0,
      warningCount: 0,
      errorCount: 0,
      duplicateCount: 0,
      results: [],
    }
  }

  // First row is headers
  const headers = rows[0]
  const dataRows = rows.slice(1)

  // Validate headers
  const normalizedHeaders = headers.map(normalizeHeader)
  if (!normalizedHeaders.includes('name')) {
    return {
      totalRows: dataRows.length,
      validCount: 0,
      warningCount: 0,
      errorCount: dataRows.length,
      duplicateCount: 0,
      results: [{
        row: 0,
        data: {} as CSVProductRow,
        status: 'error',
        errors: ['CSV must have a "name" column'],
        warnings: [],
      }],
    }
  }

  // Track seen products for duplicate detection within the import
  const seenInImport: string[] = []

  // Validate each row
  const results: CSVValidationResult[] = []
  let validCount = 0
  let warningCount = 0
  let errorCount = 0
  let duplicateCount = 0

  for (let i = 0; i < dataRows.length; i++) {
    const rowData = mapRowToObject(headers, dataRows[i])

    // Skip completely empty rows
    if (!rowData.name && !rowData.brand && !rowData.category) {
      continue
    }

    // Check for duplicates in this import batch
    const productKey = `${rowData.name.toLowerCase().trim()}|${rowData.brand.toLowerCase().trim()}`
    const allExisting = [...existingProducts, ...seenInImport]

    const result = validateRow(rowData, i + 2, allExisting) // +2 for 1-based index + header row

    if (allExisting.includes(productKey)) {
      duplicateCount++
    }

    seenInImport.push(productKey)
    results.push(result)

    if (result.status === 'valid') validCount++
    else if (result.status === 'warning') warningCount++
    else if (result.status === 'error') errorCount++
  }

  return {
    totalRows: results.length,
    validCount,
    warningCount,
    errorCount,
    duplicateCount,
    results,
  }
}

/**
 * Generate sample CSV template
 */
export function generateCSVTemplate(): string {
  const headers = EXPECTED_HEADERS.join(',')
  const sampleRows = [
    'Nature Valley Oats & Honey,Nature Valley,Snack Bars,6,bars,42g,190,4,29,6,2,12,0.5,180,true,Family favourite,5010029216660',
    'Greek Style Yoghurt,Fage,Yoghurts & Dairy Snacks,500,g,100g,97,9,4,5,0,4,3.5,40,true,,',
    'Kettle Chips Sea Salt,Kettle,Crisps & Savoury Snacks,150,g,30g,160,2,15,11,1,0.5,1,170,true,For packed lunches,',
    'Chicken Tikka Masala,Sainsburys,Ready Meals,400,g,400g,520,28,52,20,3,8,4,1200,false,Midweek dinner,',
  ]

  return [headers, ...sampleRows].join('\n')
}

/**
 * Get list of valid categories for reference
 */
export function getValidCategories(): string[] {
  return [...PRODUCT_CATEGORIES]
}
