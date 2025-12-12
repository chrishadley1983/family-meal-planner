/**
 * TypeScript interfaces for the interactive nutritionist chat feature
 */

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface IngredientModification {
  action: 'add' | 'remove' | 'replace' | 'adjust'
  ingredientName: string // Existing ingredient name (for replace/remove/adjust)
  newIngredient?: {
    name: string
    quantity: number
    unit: string
    notes?: string
  }
  reason: string
}

export interface InstructionModification {
  action: 'add' | 'update'
  stepNumber?: number // For 'update' - which step to modify
  instruction: string // The instruction text
  reason: string
}

export interface NutritionistChatRequest {
  recipe: {
    recipeName: string
    servings: number
    mealType: string[]
    ingredients: Array<{
      ingredientName: string
      quantity: number
      unit: string
      notes?: string
    }>
    instructions: Array<{
      stepNumber: number
      instruction: string
    }>
  }
  macroAnalysis: {
    perServing: {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
      sugar: number
      sodium: number
    }
    overallRating: 'green' | 'yellow' | 'red'
    overallExplanation: string
  }
  userProfile: {
    profileName: string
    dailyCalorieTarget?: number | null
    dailyProteinTarget?: number | null
    dailyCarbsTarget?: number | null
    dailyFatTarget?: number | null
    macroTrackingEnabled: boolean
  }
  conversationHistory: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  userMessage: string
}

export interface ProjectedNutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
}

export interface ValidatedNutrition {
  isValidated: boolean // True if nutrition was calculated via macro analysis (not Emilia's estimate)
  impact: {
    calories: number
    protein: number
    carbs: number
    fat: number
  }
  meetsGoal: boolean // Whether the changes move in the right direction
}

export interface NutritionistChatResponse {
  message: string
  suggestedPrompts: string[]
  ingredientModifications?: IngredientModification[]
  instructionModifications?: InstructionModification[]
  modificationsPending: boolean // Whether there are unapplied modifications awaiting confirmation
  projectedNutrition?: ProjectedNutrition // Nutrition per serving if modifications are applied
  validatedNutrition?: ValidatedNutrition // Validation metadata (present if macro analysis was run)
}

export interface SuggestedPromptsContext {
  overallRating: 'green' | 'yellow' | 'red'
  proteinPerServing: number
  fatPerServing: number
  carbsPerServing: number
  sodiumPerServing: number
  fiberPerServing: number
  userProteinTarget?: number | null
  userFatTarget?: number | null
  userCarbsTarget?: number | null
  macroTrackingEnabled: boolean
}
