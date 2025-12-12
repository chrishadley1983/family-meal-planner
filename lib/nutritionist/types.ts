/**
 * TypeScript interfaces for the "Ask the Nutritionist" feature
 * Extends beyond recipe-specific interactions to holistic nutrition guidance
 */

import { FamilyProfile, Recipe, InventoryItem, Staple } from '@prisma/client'

// ============================================================================
// Conversation Types
// ============================================================================

export interface NutritionistConversationWithMessages {
  id: string
  userId: string
  profileId: string
  title: string | null
  createdAt: Date
  updatedAt: Date
  profile: FamilyProfile
  messages: NutritionistMessageRecord[]
}

export interface NutritionistMessageRecord {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  metadata: MessageMetadata | null
  createdAt: Date
}

export interface MessageMetadata {
  suggestedActions?: NutritionistAction[]
  appliedActions?: AppliedAction[]
  suggestedPrompts?: string[]
  context?: ConversationContext
}

// ============================================================================
// Action Types
// ============================================================================

export type NutritionistActionType =
  | 'UPDATE_MACROS'
  | 'UPDATE_PREFERENCES'
  | 'CREATE_RECIPE'
  | 'ADD_INVENTORY_ITEM'
  | 'ADD_STAPLE'

export interface BaseAction {
  type: NutritionistActionType
  label: string
}

export interface UpdateMacrosAction extends BaseAction {
  type: 'UPDATE_MACROS'
  data: {
    profileId: string
    dailyCalorieTarget: number
    dailyProteinTarget: number
    dailyCarbsTarget: number
    dailyFatTarget: number
    dailyFiberTarget?: number
  }
}

export interface UpdatePreferencesAction extends BaseAction {
  type: 'UPDATE_PREFERENCES'
  data: {
    profileId: string
    addLikes?: string[]      // Foods to add to likes
    removeLikes?: string[]   // Foods to remove from likes
    addDislikes?: string[]   // Foods to add to dislikes
    removeDislikes?: string[] // Foods to remove from dislikes
  }
}

/**
 * Calculated macros from unified nutrition service
 * These are the AUTHORITATIVE values - not Claude's estimates
 */
export interface CalculatedMacros {
  caloriesPerServing: number
  proteinPerServing: number
  carbsPerServing: number
  fatPerServing: number
  fiberPerServing: number
  sugarPerServing?: number
  sodiumPerServing?: number
  source: 'usda' | 'seed_data' | 'ai_estimated' | 'mixed'
  confidence: 'high' | 'medium' | 'low'
}

export interface CreateRecipeAction extends BaseAction {
  type: 'CREATE_RECIPE'
  data: {
    name: string
    description: string
    servings: number
    prepTimeMinutes: number
    cookTimeMinutes: number
    cuisineType: string
    mealCategory: string[]
    ingredients: Array<{
      name: string
      quantity: number
      unit: string
      category?: string
    }>
    instructions: Array<{
      stepNumber: number
      instruction: string
    }>
    // Macros are now OPTIONAL - Claude should NOT provide these
    // They will be calculated by the unified nutrition service
    caloriesPerServing?: number
    proteinPerServing?: number
    carbsPerServing?: number
    fatPerServing?: number
    fiberPerServing?: number
  }
  // Calculated macros from unified nutrition service (attached after validation)
  calculatedMacros?: CalculatedMacros
}

export interface AddInventoryAction extends BaseAction {
  type: 'ADD_INVENTORY_ITEM'
  data: {
    itemName: string
    quantity: number
    unit: string
    category: string
    location?: 'fridge' | 'freezer' | 'cupboard' | 'pantry'
    expiryDate?: string
  }
}

export interface AddStapleAction extends BaseAction {
  type: 'ADD_STAPLE'
  data: {
    itemName: string
    quantity: number
    unit: string
    category?: string
    frequency?: 'weekly' | 'every_2_weeks' | 'every_4_weeks' | 'every_3_months'
  }
}

export type NutritionistAction =
  | UpdateMacrosAction
  | UpdatePreferencesAction
  | CreateRecipeAction
  | AddInventoryAction
  | AddStapleAction

export interface AppliedAction {
  actionType: NutritionistActionType
  timestamp: Date
  result: unknown
  success: boolean
}

// ============================================================================
// Chat Request/Response Types
// ============================================================================

export interface HolisticNutritionistRequest {
  conversationId: string
  profileId: string
  userMessage: string
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
}

export interface HolisticNutritionistResponse {
  message: string
  suggestedActions?: NutritionistAction[]
  suggestedPrompts?: string[]
}

// ============================================================================
// Context Types for AI
// ============================================================================

export interface ProfileContext {
  profileId: string  // Required for UPDATE_MACROS action
  profileName: string
  age?: number | null
  gender?: string | null
  heightCm?: number | null
  currentWeightKg?: number | null
  targetWeightKg?: number | null
  goalType?: string | null
  goalTimeframeWeeks?: number | null
  activityLevel?: string | null
  dailyCalorieTarget?: number | null
  dailyProteinTarget?: number | null
  dailyCarbsTarget?: number | null
  dailyFatTarget?: number | null
  dailyFiberTarget?: number | null
  macroTrackingEnabled: boolean
  allergies: string[]
  foodLikes: string[]
  foodDislikes: string[]
}

export interface RecipeContext {
  id: string
  name: string
  servings: number
  mealType: string[]
  cuisineType?: string | null
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
  fiberPerServing?: number | null
  timesUsed: number
  familyRating?: number | null
  isFavorite: boolean
}

export interface InventoryContext {
  id: string
  itemName: string
  quantity: number
  unit: string
  category: string
  location?: string | null
  expiryDate?: Date | null
  daysUntilExpiry?: number | null
}

export interface StapleContext {
  id: string
  itemName: string
  quantity: number
  unit: string
  category?: string | null
  frequency: string
}

export interface ConversationContext {
  capability?: 'macros' | 'recipes' | 'inventory' | 'analysis' | 'general'
  recipes?: RecipeContext[]
  inventory?: InventoryContext[]
  staples?: StapleContext[]
  recipeAnalysis?: RecipeAnalysisResult
}

// ============================================================================
// Analysis Types
// ============================================================================

export interface RecipeAnalysisResult {
  totalRecipes: number
  byMealType: {
    breakfast: number
    lunch: number
    dinner: number
    snack: number
  }
  averageMacros: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  proteinSources: Array<{ source: string; count: number }>
  cuisineBreakdown: Array<{ cuisine: string; count: number }>
  mostUsedRecipes: Array<{ name: string; timesUsed: number }>
  leastUsedRecipes: Array<{ name: string; timesUsed: number }>
  favoriteRecipes: string[]
  gaps: string[]
  recommendations: string[]
}

export interface InventoryAnalysisResult {
  totalItems: number
  byLocation: Record<string, number>
  byCategory: Record<string, number>
  expiringItems: Array<{ name: string; daysUntilExpiry: number }>
  nutritionalBalance: {
    hasProtein: boolean
    hasCarbs: boolean
    hasFats: boolean
    hasVegetables: boolean
    hasFruits: boolean
  }
  suggestions: string[]
}

export interface StaplesAnalysisResult {
  totalStaples: number
  byFrequency: Record<string, number>
  byCategory: Record<string, number>
  gaps: string[]
  suggestions: string[]
}

// ============================================================================
// TDEE/Macro Calculation Types
// ============================================================================

export interface TDEEInput {
  weightKg: number
  heightCm: number
  age: number
  gender: 'male' | 'female' | 'other'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
}

export interface TDEEResult {
  bmr: number
  tdee: number
  activityMultiplier: number
}

export interface MacroCalculationInput {
  tdee: number
  goalType: 'lose' | 'maintain' | 'gain'
  targetWeightKg?: number
  currentWeightKg?: number
  goalTimeframeWeeks?: number
}

export interface MacroCalculationResult {
  dailyCalories: number
  deficit: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  weightChangePerWeek: number
}
