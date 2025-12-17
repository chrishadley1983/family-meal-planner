/**
 * Products Management Types
 *
 * Types for managing branded products (snacks, ready meals, convenience items)
 * that can be used in meal plans, recipes, inventory, and staples.
 */

// Product categories specific to branded products
export const PRODUCT_CATEGORIES = [
  'Ready Meals',
  'Snack Bars',
  'Crisps & Savoury Snacks',
  'Yoghurts & Dairy Snacks',
  'Biscuits & Sweet Snacks',
  'Nuts & Seeds',
  'Fruit Snacks',
  'Frozen Snacks',
  'Drinks & Smoothies',
  'Other'
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]

// Meal slot types for snack assignment in meal plans
export const MEAL_SLOTS = ['Morning Snack', 'Afternoon Snack', 'Evening Snack'] as const
export type MealSlot = typeof MEAL_SLOTS[number]

// Days of week for meal planning
export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
export type DayOfWeek = typeof DAYS_OF_WEEK[number]

/**
 * Core Product entity matching database schema
 */
export interface Product {
  id: string
  userId: string
  name: string
  brand: string | null
  notes: string | null
  quantity: number
  unitOfMeasure: string
  category: string
  barcode: string | null
  imageUrl: string | null
  sourceUrl: string | null

  // Nutritional info (per serving)
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
  fiberPerServing: number | null
  sugarPerServing: number | null
  saturatedFatPerServing: number | null
  sodiumPerServing: number | null
  servingSize: string | null
  servingsPerPackage: number | null

  // Flags and metrics
  isSnack: boolean
  isActive: boolean
  familyRating: number | null  // 1-10 scale
  timesUsed: number

  // Recipe sync (for snack products)
  linkedRecipeId: string | null

  // Audit
  createdAt: Date | string
  updatedAt: Date | string
  createdBy: string | null
}

/**
 * Product with joined linked recipe data
 */
export interface ProductWithLinkedRecipe extends Product {
  linkedRecipe?: {
    id: string
    recipeName: string
    isArchived: boolean
  } | null
}

/**
 * Request type for creating a new product
 */
export interface CreateProductRequest {
  name: string
  brand?: string
  notes?: string
  quantity: number
  unitOfMeasure: string
  category: string
  barcode?: string
  imageUrl?: string
  sourceUrl?: string

  // Nutritional info
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
  fiberPerServing?: number
  sugarPerServing?: number
  saturatedFatPerServing?: number
  sodiumPerServing?: number
  servingSize?: string
  servingsPerPackage?: number

  // Flags
  isSnack?: boolean
  familyRating?: number
}

/**
 * Request type for updating an existing product
 */
export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean
  timesUsed?: number
}

/**
 * Filter options for product list queries
 */
export interface ProductFilters {
  category?: string
  brand?: string
  isSnack?: boolean
  isActive?: boolean
  search?: string
}

/**
 * Sort options for product list queries
 */
export type ProductSortField = 'name' | 'brand' | 'familyRating' | 'timesUsed' | 'createdAt' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface ProductSortOptions {
  field: ProductSortField
  direction: SortDirection
}

/**
 * Meal plan product assignment (for snack slots)
 */
export interface MealPlanProduct {
  id: string
  mealPlanId: string
  productId: string
  dayOfWeek: string
  mealSlot: MealSlot
  quantity: number
  createdAt: Date | string

  // Joined data
  product?: Product
}

/**
 * Request type for assigning a product to a meal plan snack slot
 */
export interface AssignProductToMealPlanRequest {
  mealPlanId: string
  productId: string
  dayOfWeek: string
  mealSlot: MealSlot
  quantity?: number
}

/**
 * Recipe ingredient that can be either a regular ingredient or a product
 */
export interface RecipeIngredientWithProduct {
  id: string
  recipeId: string
  ingredientName: string
  quantity: number
  unit: string
  category: string | null
  notes: string | null
  sortOrder: number
  unitCode: string | null

  // Product fields
  productId: string | null
  isProduct: boolean

  // Joined data (when isProduct = true)
  product?: Product
}

/**
 * Extended Recipe type with product-recipe sync fields
 */
export interface RecipeWithProductInfo {
  id: string
  userId: string
  recipeName: string
  // ... other recipe fields
  isProductRecipe: boolean
  sourceProductId: string | null

  // Joined data
  sourceProduct?: Product | null
}

// ============================================
// CSV Import Types
// ============================================

/**
 * Raw CSV row data before parsing
 */
export interface CSVProductRow {
  name: string
  brand: string
  category: string
  quantity: string
  unit_of_measure: string
  serving_size: string
  calories_per_serving: string
  protein_per_serving: string
  carbs_per_serving: string
  fat_per_serving: string
  fiber_per_serving: string
  sugar_per_serving: string
  saturated_fat_per_serving: string
  sodium_per_serving: string
  is_snack: string
  notes: string
  barcode: string
}

/**
 * CSV validation result for a single row
 */
export interface CSVValidationResult {
  row: number
  data: CSVProductRow
  status: 'valid' | 'warning' | 'error'
  errors: string[]
  warnings: string[]
  parsedData?: CreateProductRequest
}

/**
 * Summary of CSV import validation
 */
export interface CSVImportSummary {
  totalRows: number
  validCount: number
  warningCount: number
  errorCount: number
  duplicateCount: number
  results: CSVValidationResult[]
}

/**
 * Request to confirm CSV import
 */
export interface ConfirmCSVImportRequest {
  products: CreateProductRequest[]
  syncSnacksToRecipes: boolean
}

/**
 * Response from CSV import confirmation
 */
export interface CSVImportResponse {
  imported: number
  skipped: number
  recipesCreated: number
  errors: string[]
}

// ============================================
// AI Parsing Types
// ============================================

/**
 * Result from AI product URL parsing
 */
export interface ParsedProductFromUrl {
  name?: string
  brand?: string
  quantity?: number
  unitOfMeasure?: string
  category?: string
  servingSize?: string
  servingsPerPackage?: number
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
  fiberPerServing?: number
  sugarPerServing?: number
  saturatedFatPerServing?: number
  sodiumPerServing?: number
  isSnack?: boolean
  imageUrl?: string
}

/**
 * Result from AI product image parsing
 */
export interface ParsedProductFromImage {
  name?: string
  brand?: string
  quantity?: number
  unitOfMeasure?: string
  category?: string
  servingSize?: string
  servingsPerPackage?: number
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
  fiberPerServing?: number
  sugarPerServing?: number
  saturatedFatPerServing?: number
  sodiumPerServing?: number
  isSnack?: boolean
  imageUrl?: string
}

/**
 * Result from AI product text parsing (clipboard paste)
 */
export interface ParsedProductFromText {
  name?: string
  brand?: string
  quantity?: number
  unitOfMeasure?: string
  category?: string
  servingSize?: string
  servingsPerPackage?: number
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
  fiberPerServing?: number
  sugarPerServing?: number
  saturatedFatPerServing?: number
  sodiumPerServing?: number
  isSnack?: boolean
}

// ============================================
// API Response Types
// ============================================

/**
 * Standard API response for single product operations
 */
export interface ProductResponse {
  success: boolean
  product?: Product
  error?: string
}

/**
 * Standard API response for product list operations
 */
export interface ProductsResponse {
  success: boolean
  products?: Product[]
  total?: number
  page?: number
  pageSize?: number
  error?: string
}

/**
 * Response from product-recipe sync operation
 */
export interface ProductRecipeSyncResponse {
  success: boolean
  recipeId?: string
  created?: boolean
  error?: string
}

// ============================================
// Quick Actions Types
// ============================================

/**
 * Request to add product to inventory
 */
export interface AddProductToInventoryRequest {
  productId: string
  expiryDate?: string
  quantity?: number
}

/**
 * Request to add product to staples
 */
export interface AddProductToStaplesRequest {
  productId: string
  frequency: 'weekly' | 'every_2_weeks' | 'every_4_weeks' | 'every_3_months'
}

// ============================================
// Validation Constants
// ============================================

export const PRODUCT_VALIDATION = {
  name: { required: true, maxLength: 255 },
  brand: { required: false, maxLength: 255 },
  category: { required: true, enum: PRODUCT_CATEGORIES },
  quantity: { required: true, min: 0.01 },
  familyRating: { min: 1, max: 10 },
  caloriesPerServing: { min: 0 },
  proteinPerServing: { min: 0 },
  carbsPerServing: { min: 0 },
  fatPerServing: { min: 0 },
  fiberPerServing: { min: 0 },
  sugarPerServing: { min: 0 },
  saturatedFatPerServing: { min: 0 },
  sodiumPerServing: { min: 0 },
} as const
