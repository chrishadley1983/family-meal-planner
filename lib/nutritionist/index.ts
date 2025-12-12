/**
 * Nutritionist module exports
 * Provides holistic nutrition guidance via the Emilia persona
 */

// Types
export * from './types'

// Calculations
export {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
  getActivityLevelDescription,
  getProteinPerMeal,
  getGoalDescription,
} from './calculations'

// Analysis
export {
  analyzeRecipes,
  analyzeInventory,
  analyzeStaples,
  buildRecipeContextString,
  buildInventoryContextString,
  buildStaplesContextString,
} from './analysis'

// Prompts
export {
  getHolisticNutritionistSystemPrompt,
  buildProfileContext,
  getInitialGreeting,
  getContextAwareSuggestedPrompts,
  parseAIResponse,
  getMacroCalculationPrompt,
} from './prompts'

// Actions (client-safe display/validation functions)
// Note: executeAction is server-only and should be imported directly from './actions'
export {
  validateAction,
  formatActionForDisplay,
} from './actions-display'

export type { ActionResult } from './actions-display'
