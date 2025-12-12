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

// Actions
export {
  executeAction,
  validateAction,
  formatActionForDisplay,
} from './actions'
