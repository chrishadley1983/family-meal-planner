/**
 * Staples Engine Types
 */

// Staple frequency options
export type StapleFrequency = 'weekly' | 'every_2_weeks' | 'every_4_weeks' | 'every_3_months'

export const STAPLE_FREQUENCIES: { value: StapleFrequency; label: string; days: number }[] = [
  { value: 'weekly', label: 'Weekly', days: 7 },
  { value: 'every_2_weeks', label: 'Every 2 weeks', days: 14 },
  { value: 'every_4_weeks', label: 'Every 4 weeks', days: 28 },
  { value: 'every_3_months', label: 'Every 3 months', days: 91 },
]

// Due status for staples
export type StapleDueStatus = 'overdue' | 'due' | 'not_due'

// Core staple entity
export interface Staple {
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

// Staple with calculated due fields (for display)
export interface StapleWithDueStatus extends Staple {
  nextDueDate: Date | null  // null if never added = immediately due
  dueStatus: StapleDueStatus
  daysUntilDue: number | null  // negative = overdue
}

// Staple import tracking record
export interface StapleImport {
  id: string
  stapleId: string
  shoppingListId: string
  importedAt: Date
  wasForceAdd: boolean
  finalizedAt: Date | null
}

// API Request types
export interface CreateStapleRequest {
  itemName: string
  quantity: number
  unit: string
  category?: string
  frequency?: StapleFrequency
  isActive?: boolean
  notes?: string
}

export interface UpdateStapleRequest {
  itemName?: string
  quantity?: number
  unit?: string
  category?: string
  frequency?: StapleFrequency
  isActive?: boolean
  notes?: string
}

// CSV Import types
export interface CSVStapleRow {
  name: string
  quantity: string
  unit: string
  category: string
  frequency: string
  active: string
}

export interface CSVValidationResult {
  row: number
  data: CSVStapleRow
  status: 'valid' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  parsedData?: CreateStapleRequest
}

export interface CSVImportSummary {
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  results: CSVValidationResult[]
}

// Import to shopping list types
export interface StapleForImport extends StapleWithDueStatus {
  alreadyImported: boolean
}

export interface ImportStaplesRequest {
  stapleIds: string[]
}

export interface ImportStaplesResponse {
  message: string
  importedCount: number
  items: unknown[]  // ShoppingListItem[]
  stapleImports: StapleImport[]
}

// Response wrappers
export interface StapleResponse {
  success: boolean
  staple?: Staple
  error?: string
}

export interface StaplesResponse {
  success: boolean
  staples?: StapleWithDueStatus[]
  error?: string
}

// Filter and sort options for dashboard
export type StapleSortField = 'itemName' | 'nextDueDate' | 'lastAddedDate' | 'category' | 'frequency'
export type StapleSortOrder = 'asc' | 'desc'

export interface StapleFilters {
  category?: string
  frequency?: StapleFrequency
  isActive?: boolean
  dueStatus?: StapleDueStatus
}

export interface StapleSortOptions {
  field: StapleSortField
  order: StapleSortOrder
}
