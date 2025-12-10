/**
 * Shopping List Types
 */

// Shopping list status values (matches meal plan statuses)
export type ShoppingListStatus = 'Draft' | 'Finalized' | 'Archived'

export const SHOPPING_LIST_STATUSES: ShoppingListStatus[] = ['Draft', 'Finalized', 'Archived']

// Shopping list item source types
export type ShoppingListItemSource = 'recipe' | 'staple' | 'manual'

// Shopping list item priority
export type ShoppingListItemPriority = 'Low' | 'Medium' | 'High'

export const SHOPPING_LIST_ITEM_PRIORITIES: ShoppingListItemPriority[] = ['Low', 'Medium', 'High']

// Source detail for tracking where an item came from
export interface SourceDetail {
  type: ShoppingListItemSource
  id?: string        // ID of the recipe, staple, or undefined for manual
  name?: string      // Name of the recipe or staple
  quantity: number   // Original quantity from this source
  unit: string       // Original unit from this source
  mealPlanId?: string // Meal plan the recipe came from (if applicable)
}

// Shopping list item
export interface ShoppingListItem {
  id: string
  shoppingListId: string
  itemName: string
  quantity: number
  unit: string
  category: string | null
  source: ShoppingListItemSource | null
  sourceDetails: SourceDetail[]
  isConsolidated: boolean
  inInventory: boolean
  inventoryQuantity: number | null
  netQuantityNeeded: number | null
  isPurchased: boolean
  customNote: string | null
  priority: ShoppingListItemPriority
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

// Shopping list with relations
export interface ShoppingList {
  id: string
  userId: string
  name: string
  notes: string | null
  weekStartDate: Date | null
  status: ShoppingListStatus
  categoryOrder: string[]
  createdAt: Date
  updatedAt: Date
  finalizedAt: Date | null
  archivedAt: Date | null
  items?: ShoppingListItem[]
  mealPlans?: ShoppingListMealPlan[]
}

// Join table for shopping list to meal plan
export interface ShoppingListMealPlan {
  id: string
  shoppingListId: string
  mealPlanId: string
  importedAt: Date
  mealPlan?: {
    id: string
    weekStartDate: Date
    weekEndDate: Date
    status: string
  }
}

// Shopping list category
export interface ShoppingListCategory {
  id: string
  userId: string
  name: string
  displayOrder: number
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
}

// API Request/Response types

export interface CreateShoppingListRequest {
  name?: string
  notes?: string
  weekStartDate?: string // ISO date string
}

export interface UpdateShoppingListRequest {
  name?: string
  notes?: string
  status?: ShoppingListStatus
  categoryOrder?: string[]
}

export interface CreateShoppingListItemRequest {
  itemName: string
  quantity: number
  unit: string
  category?: string
  source?: ShoppingListItemSource
  sourceDetails?: SourceDetail[]
  customNote?: string
  priority?: ShoppingListItemPriority
}

export interface UpdateShoppingListItemRequest {
  itemName?: string
  quantity?: number
  unit?: string
  category?: string
  isPurchased?: boolean
  customNote?: string
  priority?: ShoppingListItemPriority
  displayOrder?: number
}

export interface ImportStaplesRequest {
  stapleIds: string[] // IDs of staples to import
}

export interface ImportMealPlanRequest {
  mealPlanId: string // ID of the finalized meal plan to import from
}

export interface DeduplicateRequest {
  itemIds: string[] // IDs of items to consolidate into one
}

export interface CategorySuggestionRequest {
  itemName: string
}

export interface CategorySuggestionResponse {
  suggestedCategory: string
  confidence: number
}

// Response wrappers
export interface ShoppingListResponse {
  success: boolean
  shoppingList?: ShoppingList
  error?: string
}

export interface ShoppingListsResponse {
  success: boolean
  shoppingLists?: ShoppingList[]
  error?: string
}

export interface ShoppingListItemResponse {
  success: boolean
  item?: ShoppingListItem
  error?: string
}

export interface ShoppingListItemsResponse {
  success: boolean
  items?: ShoppingListItem[]
  error?: string
}

export interface CategoriesResponse {
  success: boolean
  categories?: ShoppingListCategory[]
  error?: string
}

// Helper function to generate default shopping list name
export function generateDefaultShoppingListName(weekStartDate?: Date | null): string {
  if (!weekStartDate) {
    return `Shopping List - ${new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })}`
  }

  return `Week of ${weekStartDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })}`
}

// Validation helpers
export function isValidStatus(status: string): status is ShoppingListStatus {
  return SHOPPING_LIST_STATUSES.includes(status as ShoppingListStatus)
}

export function isValidPriority(priority: string): priority is ShoppingListItemPriority {
  return SHOPPING_LIST_ITEM_PRIORITIES.includes(priority as ShoppingListItemPriority)
}

export function isValidSource(source: string): source is ShoppingListItemSource {
  return ['recipe', 'staple', 'manual'].includes(source)
}
