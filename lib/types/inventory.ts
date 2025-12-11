/**
 * Inventory Management System Types
 */

// Storage location options for inventory items
export type StorageLocation = 'fridge' | 'freezer' | 'cupboard' | 'pantry'

export const STORAGE_LOCATIONS: { value: StorageLocation; label: string }[] = [
  { value: 'fridge', label: 'Fridge' },
  { value: 'freezer', label: 'Freezer' },
  { value: 'cupboard', label: 'Cupboard' },
  { value: 'pantry', label: 'Pantry' },
]

// Expiry status for inventory items
// expired: expiry date has passed
// expiringSoon: within MAX(2, shelf_life_days * 0.2) days of expiry
// fresh: not expired and not expiring soon
export type ExpiryStatus = 'expired' | 'expiringSoon' | 'fresh'

// Core inventory item entity (from database)
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
  addedBy: 'Manual' | 'Photo' | 'CSV' | 'ShoppingList'
  notes: string | null
  isUsedInPlannedMeal: boolean
  createdAt: Date
  updatedAt: Date
}

// Inventory item with calculated expiry fields (for display)
export interface InventoryItemWithExpiry extends InventoryItem {
  daysUntilExpiry: number | null  // negative = expired, null = no expiry set
  shelfLifeDays: number | null    // expiry_date - purchase_date
  expiryStatus: ExpiryStatus
}

// Shelf life reference data
export interface IngredientShelfLife {
  id: string
  ingredientName: string
  typicalShelfLifeDays: number
  defaultLocation: StorageLocation | null
  category: string | null
  createdAt: Date
  updatedAt: Date
}

// Shopping list excluded items (due to inventory)
export interface ShoppingListExcludedItem {
  id: string
  shoppingListId: string
  itemName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryQuantity: number
  inventoryItemId: string
  excludedAt: Date
  addedBackAt: Date | null
  addedBackQuantity: number | null
}

// User settings for inventory behavior
export interface InventorySettings {
  id: string
  userId: string
  skipInventoryCheck: boolean
  smallQuantityThresholdGrams: number
  smallQuantityThresholdMl: number
  createdAt: Date
  updatedAt: Date
}

// Default inventory settings
export const DEFAULT_INVENTORY_SETTINGS: Omit<InventorySettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
  skipInventoryCheck: false,
  smallQuantityThresholdGrams: 5,
  smallQuantityThresholdMl: 5,
}

// API Request types
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

// CSV Import types
export interface CSVInventoryRow {
  name: string
  quantity: string
  unit: string
  category: string
  location: string
  expiry_date: string
  active: string
}

export interface CSVInventoryValidationResult {
  row: number
  data: CSVInventoryRow
  status: 'valid' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  parsedData?: CreateInventoryItemRequest
  calculatedExpiry?: Date  // For items without explicit expiry
  expiryIsEstimated?: boolean
}

export interface CSVInventoryImportSummary {
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  results: CSVInventoryValidationResult[]
}

// Photo extraction types
export interface PhotoExtractionResult {
  items: ExtractedInventoryItem[]
  processingErrors: string[]
}

export interface ExtractedInventoryItem {
  name: string
  quantity?: number
  unit?: string
  expiryDate?: string  // If visible on packaging
  brand?: string       // For context, not stored separately
  confidence: 'high' | 'medium' | 'low'
  suggestedCategory?: string
  suggestedLocation?: StorageLocation
  calculatedExpiry?: Date  // If no expiry visible, calculated from shelf life
  expiryIsEstimated?: boolean
}

// Inventory check results (for shopping list integration)
export interface InventoryCheckResult {
  itemName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryMatch: InventoryItem | null
  inventoryQuantity: number
  action: 'exclude' | 'reduce' | 'add'  // exclude = full match, reduce = partial, add = no match
  netQuantityNeeded: number
}

export interface InventoryExclusionReport {
  checkedItems: InventoryCheckResult[]
  excludedCount: number
  reducedCount: number
  addedCount: number
}

// Cooking deduction types
export interface CookingDeductionItem {
  ingredientName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryMatch: InventoryItem | null
  currentInventoryQuantity: number
  quantityAfterDeduction: number
  shortfall: number  // If recipe needs more than inventory has
  isSmallQuantity: boolean  // Below threshold, excluded by default
  selected: boolean  // User can toggle
}

export interface CookingDeductionResult {
  deductions: CookingDeductionItem[]
  itemsToRemove: string[]  // IDs of items that reached 0
  success: boolean
  message: string
}

// Filter and sort options for dashboard
export type InventorySortField = 'itemName' | 'expiryDate' | 'purchaseDate' | 'category' | 'location' | 'quantity'
export type InventorySortOrder = 'asc' | 'desc'

export interface InventoryFilters {
  category?: string
  location?: StorageLocation
  expiryStatus?: ExpiryStatus
  isActive?: boolean
  search?: string
}

export interface InventorySortOptions {
  field: InventorySortField
  order: InventorySortOrder
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

// Duplicate detection for add/import
export interface DuplicateInventoryMatch {
  existingItem: InventoryItem
  matchConfidence: 'exact' | 'similar'
  suggestedAction: 'merge' | 'createNew'
}
