// Type definitions for Meal Plan Settings and AI generation

export type MacroMode = 'balanced' | 'strict' | 'weekday_discipline' | 'calorie_banking'
export type ShoppingMode = 'mild' | 'moderate' | 'aggressive'
export type ExpiryPriority = 'soft' | 'moderate' | 'strong'
export type FeedbackDetail = 'light' | 'medium' | 'detailed'
export type PriorityType = 'macros' | 'ratings' | 'variety' | 'shopping' | 'prep' | 'time'

export interface MealPlanSettings {
  // Macro Targeting
  macroMode: MacroMode

  // Recipe Variety
  varietyEnabled: boolean
  dinnerCooldown: number
  lunchCooldown: number
  breakfastCooldown: number
  snackCooldown: number
  minCuisines: number
  maxSameCuisine: number

  // Shopping Efficiency
  shoppingMode: ShoppingMode

  // Inventory & Expiry
  expiryPriority: ExpiryPriority
  expiryWindow: number
  useItUpItems: string[]

  // Batch Cooking
  batchCookingEnabled: boolean
  maxLeftoverDays: number

  // Priority Ordering
  priorityOrder: PriorityType[]

  // Emilia's Feedback
  feedbackDetail: FeedbackDetail
}

export const DEFAULT_SETTINGS: MealPlanSettings = {
  macroMode: 'balanced',
  varietyEnabled: true,
  dinnerCooldown: 14,
  lunchCooldown: 7,
  breakfastCooldown: 3,
  snackCooldown: 2,
  minCuisines: 3,
  maxSameCuisine: 2,
  shoppingMode: 'moderate',
  expiryPriority: 'moderate',
  expiryWindow: 5,
  useItUpItems: [],
  batchCookingEnabled: true,
  maxLeftoverDays: 4,
  priorityOrder: ['macros', 'ratings', 'variety', 'shopping', 'prep', 'time'],
  feedbackDetail: 'medium'
}

// Pantry staples list (excluded from unique ingredient counting for shopping efficiency)
export const PANTRY_STAPLES = [
  'salt',
  'pepper',
  'black pepper',
  'white pepper',
  'olive oil',
  'vegetable oil',
  'canola oil',
  'cooking oil',
  'butter',
  'flour',
  'all-purpose flour',
  'sugar',
  'white sugar',
  'brown sugar',
  'garlic',
  'garlic powder',
  'onion',
  'onion powder',
  'baking powder',
  'baking soda',
  'vanilla extract',
  'soy sauce',
  'vinegar',
  'white vinegar',
  'apple cider vinegar',
  'lemon juice',
  'lime juice',
  'cornstarch',
  'cooking spray',
  'water',
  'milk',
  'eggs',
  'breadcrumbs',
  'parsley',
  'oregano',
  'basil',
  'thyme',
  'cumin',
  'paprika',
  'chili powder',
  'cinnamon',
  'ginger',
  'nutmeg'
]

// Leftover shelf life rules by ingredient type (in days)
export const LEFTOVER_SHELF_LIFE: Record<string, number> = {
  chicken: 3,
  turkey: 3,
  beef: 4,
  pork: 4,
  lamb: 4,
  fish: 2,
  salmon: 2,
  tuna: 2,
  seafood: 2,
  shrimp: 2,
  shellfish: 2,
  dairy: 3,
  cheese: 5,
  eggs: 3,
  vegetables_cooked: 4,
  vegetables_raw: 5,
  grains: 5,
  rice: 5,
  pasta: 5,
  beans: 5,
  lentils: 5,
  soup: 4,
  stew: 4,
  casserole: 3,
  salad: 2,
  default: 3
}

// Macro mode descriptions for UI
export const MACRO_MODE_DESCRIPTIONS: Record<MacroMode, string> = {
  balanced: 'Flexible approach with ±10% tolerance on all macros',
  strict: 'Precise tracking with ±5% tolerance on all macros',
  weekday_discipline: 'Strict on weekdays (±5%), relaxed on weekends (±25%)',
  calorie_banking: 'Weekday deficit compensated by weekend surplus, weekly balance maintained'
}

// Shopping mode descriptions for UI
export const SHOPPING_MODE_DESCRIPTIONS: Record<ShoppingMode, string> = {
  mild: 'Slight preference for ingredient overlap (0.3 rating boost)',
  moderate: 'Moderate preference for efficiency (0.5 rating boost)',
  aggressive: 'Strong preference for minimal shopping (0.8 rating boost)'
}

// Expiry priority descriptions for UI
export const EXPIRY_PRIORITY_DESCRIPTIONS: Record<ExpiryPriority, string> = {
  soft: 'Consider expiring items, but don\'t force them (0.3 rating boost)',
  moderate: 'Prioritize expiring items when possible (0.5 rating boost)',
  strong: 'Strongly favour recipes using expiring items (1.0 rating boost)'
}

// Feedback detail descriptions for UI
export const FEEDBACK_DETAIL_DESCRIPTIONS: Record<FeedbackDetail, string> = {
  light: '2-3 sentence overview with key highlights',
  medium: 'Structured summary with macro analysis and variety notes',
  detailed: 'Comprehensive feedback with specific recommendations and insights'
}

// Priority type labels for UI
export const PRIORITY_LABELS: Record<PriorityType, string> = {
  macros: 'Macro Targets',
  ratings: 'Recipe Ratings',
  variety: 'Recipe Variety',
  shopping: 'Shopping Efficiency',
  prep: 'Meal Prep / Batch Cooking',
  time: 'Cooking Time'
}

// Helper to get cooldown period for a meal type
export function getCooldownForMealType(mealType: string, settings: MealPlanSettings): number {
  const normalizedType = mealType.toLowerCase()

  if (normalizedType.includes('dinner')) {
    return settings.dinnerCooldown
  } else if (normalizedType.includes('lunch')) {
    return settings.lunchCooldown
  } else if (normalizedType.includes('breakfast')) {
    return settings.breakfastCooldown
  } else if (normalizedType.includes('snack') || normalizedType.includes('dessert')) {
    return settings.snackCooldown
  }

  return settings.dinnerCooldown // Default to dinner cooldown
}

// Helper to determine ingredient category for leftover shelf life
export function getLeftoverShelfLife(ingredientName: string): number {
  const lower = ingredientName.toLowerCase()

  // Check each category
  for (const [category, days] of Object.entries(LEFTOVER_SHELF_LIFE)) {
    if (lower.includes(category.replace('_', ' '))) {
      return days
    }
  }

  return LEFTOVER_SHELF_LIFE.default
}

// Helper to check if an ingredient is a pantry staple
export function isPantryStaple(ingredientName: string): boolean {
  const lower = ingredientName.toLowerCase().trim()
  return PANTRY_STAPLES.some(staple => {
    return lower === staple || lower.includes(staple) || staple.includes(lower)
  })
}

// AI Prompt Builder Types
export interface RecipeUsageHistory {
  id: string
  userId: string
  recipeId: string
  mealPlanId: string
  usedDate: Date
  mealType: string
  wasManual: boolean
  createdAt: Date
}

export interface InventoryItem {
  id: string
  userId: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location: string
  expiryDate: Date | null
  autoPopulatedExpiry: boolean
  dateAdded: Date
  addedBy: string
  notes: string | null
  isUsedInPlannedMeal: boolean
  updatedAt: Date
}

export interface RecipeWithScore {
  id: string
  recipeName: string
  [key: string]: any
  cooldownDaysRemaining?: number
  bonusPoints?: number
  lastUsedDate?: string
}

export interface PromptBuilderParams {
  profiles: any[]
  recipes: any[]
  weekStartDate: string
  weekProfileSchedules: any[]
  settings: MealPlanSettings
  recipeHistory: RecipeUsageHistory[]
  inventory: InventoryItem[]
  servingsMap?: Record<string, Record<string, number>> // day -> mealType -> servings count
}

// Quick options for generation page (temporary overrides)
export interface QuickOptions {
  prioritizeShopping?: boolean
  useExpiring?: boolean
  maximizeBatch?: boolean
}
