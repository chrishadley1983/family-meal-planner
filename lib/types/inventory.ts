/**
 * Inventory Management Types
 * Types for inventory items, shelf life, settings, and related functionality
 */

// Storage locations for inventory items
export type StorageLocation = 'fridge' | 'freezer' | 'cupboard' | 'pantry'

// Expiry status for display
// Note: Using camelCase 'expiringSoon' for consistency with calculations code
export type ExpiryStatus = 'expired' | 'expiringSoon' | 'fresh'

// Source of how item was added
export type AddedBySource = 'manual' | 'csv' | 'photo' | 'shopping_list'

/**
 * Core inventory item as stored in database
 */
export interface InventoryItem {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: StorageLocation | null
  purchaseDate: Date
  expiryDate: Date | null
  expiryIsEstimated: boolean
  isActive: boolean
  addedBy: AddedBySource
  notes: string | null
  isUsedInPlannedMeal?: boolean
  createdAt: Date
  updatedAt: Date
}

/**
 * Inventory item with calculated expiry fields for display
 */
export interface InventoryItemWithExpiry extends InventoryItem {
  daysUntilExpiry: number | null
  shelfLifeDays: number | null
  expiryStatus: ExpiryStatus
}

/**
 * Input for creating a new inventory item
 */
export interface CreateInventoryItemInput {
  itemName: string
  quantity: number
  unit: string
  category: string
  location?: StorageLocation | null
  purchaseDate?: Date
  expiryDate?: Date | null
  expiryIsEstimated?: boolean
  isActive?: boolean
  addedBy?: AddedBySource
  notes?: string | null
}

/**
 * Input for updating an existing inventory item
 */
export interface UpdateInventoryItemInput {
  itemName?: string
  quantity?: number
  unit?: string
  category?: string
  location?: StorageLocation | null
  purchaseDate?: Date
  expiryDate?: Date | null
  expiryIsEstimated?: boolean
  isActive?: boolean
  notes?: string | null
}

/**
 * Shelf life reference data for auto-calculating expiry dates
 */
export interface IngredientShelfLife {
  id: string
  ingredientName: string
  shelfLifeDays: number
  defaultLocation: StorageLocation | null
  category: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

/**
 * User settings for inventory management
 */
export interface InventorySettings {
  id: string
  userId: string
  skipInventoryCheck: boolean
  smallQuantityThresholdGrams: number
  smallQuantityThresholdMl: number
  createdAt: Date
  updatedAt: Date
}

/**
 * Default inventory settings
 */
export const DEFAULT_INVENTORY_SETTINGS: Omit<InventorySettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  skipInventoryCheck: false,
  smallQuantityThresholdGrams: 5,
  smallQuantityThresholdMl: 5,
}

/**
 * Excluded item from shopping list due to inventory
 */
export interface ShoppingListExcludedItem {
  id: string
  shoppingListId: string
  itemName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryQuantity: number
  inventoryItemId: string | null
  excludedAt: Date
  addedBackAt: Date | null
  addedBackQuantity: number | null
}

/**
 * Filter options for inventory list
 */
export interface InventoryFilters {
  category?: string
  location?: StorageLocation
  expiryStatus?: ExpiryStatus
  isActive?: boolean
  searchTerm?: string
  search?: string  // Alias for searchTerm for convenience
}

/**
 * Sort options for inventory list
 */
export type InventorySortField = 'itemName' | 'expiryDate' | 'purchaseDate' | 'category' | 'quantity' | 'location'

export interface InventorySortOptions {
  field: InventorySortField
  order: 'asc' | 'desc'
}

/**
 * Duplicate detection result
 */
export interface DuplicateMatch {
  existingItem: InventoryItem
  similarity: number // 0-1 score
  quantityCanBeCombined: boolean
}

/**
 * CSV Import types
 */
export interface CSVInventoryRow {
  name: string
  quantity: string  // String from CSV, parsed to number during validation
  unit: string
  category: string
  location?: string
  expiryDate?: string
  notes?: string
  // Aliases for backwards compatibility
  expiry_date?: string
  active?: string
}

export interface CSVValidationResult {
  row: number
  data: CSVInventoryRow
  status: 'valid' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  parsedData?: CreateInventoryItemRequest
  calculatedExpiry?: Date
  expiryIsEstimated?: boolean
  calculatedLocation?: StorageLocation
  // Backwards compat alias
  isValid?: boolean
}

export interface CSVImportSummary {
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  results: CSVValidationResult[]
  // Backwards compat aliases
  validRows?: number
  invalidRows?: number
  warningRows?: number
}

/**
 * Photo extraction types
 */
export interface PhotoExtractionItem {
  name: string
  quantity?: number
  unit?: string
  expiryDate?: string
  confidence: 'high' | 'medium' | 'low'
}

export interface PhotoExtractionResult {
  items: PhotoExtractionItem[]
  processingTime: number
  photoId: string
}

/**
 * Inventory check result for shopping list integration
 */
export interface InventoryCheckResult {
  itemName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryMatch: InventoryItem | null
  inventoryQuantity: number
  action: 'exclude' | 'reduce' | 'add_full'
  quantityToAdd: number
  unitToAdd: string
}

/**
 * Cooking deduction preview
 */
export interface DeductionPreviewItem {
  ingredientName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryItem: InventoryItem | null
  inventoryQuantity: number
  quantityAfter: number
  isSmallQuantity: boolean
  isInsufficient: boolean
  selected: boolean
}

/**
 * Storage location display helpers
 */
export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'cupboard', label: 'Cupboard' },
  { value: 'pantry', label: 'Pantry' },
]

export const STORAGE_LOCATION_LABELS: Record<StorageLocation, string> = {
  fridge: 'Fridge',
  freezer: 'Freezer',
  cupboard: 'Cupboard',
  pantry: 'Pantry',
}

/**
 * Expiry status display helpers
 */
export const EXPIRY_STATUS_LABELS: Record<ExpiryStatus, string> = {
  expired: 'Expired',
  expiringSoon: 'Expiring Soon',
  fresh: 'Fresh',
}

export const EXPIRY_STATUS_COLORS: Record<ExpiryStatus, { bg: string; text: string; border: string }> = {
  expired: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500' },
  expiringSoon: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500' },
  fresh: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500' },
}

// API Request types (from other branch)
export interface CreateInventoryItemRequest {
  itemName: string
  quantity: number
  unit: string
  category: string
  location?: StorageLocation
  purchaseDate?: string  // ISO date string
  expiryDate?: string    // ISO date string
  notes?: string
  isActive?: boolean
}

export interface UpdateInventoryItemRequest {
  itemName?: string
  quantity?: number
  unit?: string
  category?: string
  location?: StorageLocation | null
  purchaseDate?: string
  expiryDate?: string | null
  expiryIsEstimated?: boolean
  isActive?: boolean
  notes?: string | null
}

export interface BulkUpdateInventoryRequest {
  ids: string[]
  expiryDate?: string
  isActive?: boolean
}

export interface BulkDeleteInventoryRequest {
  ids: string[]
}

// Response wrappers
export interface InventoryItemResponse {
  success: boolean
  item?: InventoryItem
  error?: string
}

export interface InventoryItemsResponse {
  success: boolean
  items?: InventoryItemWithExpiry[]
  total?: number
  error?: string
}

export interface InventorySettingsResponse {
  success: boolean
  settings?: InventorySettings
  error?: string
}

// Dashboard statistics
export interface InventoryStatistics {
  totalItems: number
  activeItems: number
  expiredCount: number
  expiringSoonCount: number
  freshCount: number
  byCategory: Record<string, number>
  byLocation: Record<StorageLocation | 'unassigned', number>
}

/**
 * Photo/AI extraction types
 */
export interface ExtractedInventoryItem {
  name: string
  quantity?: number
  unit?: string
  category?: string
  location?: StorageLocation | null
  expiryDate?: string | null
  confidence: 'high' | 'medium' | 'low'
}

/**
 * CSV Import summary (alias for CSVImportSummary for backwards compatibility)
 */
export type CSVInventoryImportSummary = CSVImportSummary
export type CSVInventoryValidationResult = CSVValidationResult

/**
 * Inventory match info for cooking deduction
 */
export interface CookingDeductionInventoryMatch {
  id: string
  itemName: string
  quantity: number
  unit: string
}

/**
 * Cooking deduction types
 */
export interface CookingDeductionItem {
  ingredientName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryMatch: CookingDeductionInventoryMatch | null
  currentInventoryQuantity: number
  quantityAfterDeduction: number
  shortfall: number
  isSmallQuantity: boolean
  selected: boolean
  // Legacy fields for backwards compatibility
  inventoryItemId?: string | null
  inventoryQuantity?: number
  deductionAmount?: number
  willBeFullyUsed?: boolean
}

export interface CookingDeductionResult {
  success: boolean
  deductions: CookingDeductionItem[]
  itemsToRemove?: string[]
  message?: string
  // Legacy fields for backwards compatibility
  itemsUpdated?: number
  itemsDeleted?: number
  errors?: string[]
}
