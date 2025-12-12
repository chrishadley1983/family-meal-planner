/**
 * Client-safe action display and validation functions
 * These can be safely imported by client components (no Prisma/Node.js dependencies)
 */

import {
  NutritionistAction,
  UpdateMacrosAction,
  CreateRecipeAction,
  AddInventoryAction,
  AddStapleAction,
} from './types'

export interface ActionResult {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

/**
 * Validate an action before showing confirmation to user
 */
export function validateAction(action: NutritionistAction): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  switch (action.type) {
    case 'UPDATE_MACROS': {
      const data = (action as UpdateMacrosAction).data
      if (!data.profileId) errors.push('Missing profile ID')
      if (!data.dailyCalorieTarget || data.dailyCalorieTarget < 800) {
        errors.push('Calories must be at least 800')
      }
      if (!data.dailyProteinTarget || data.dailyProteinTarget < 30) {
        errors.push('Protein must be at least 30g')
      }
      if (!data.dailyCarbsTarget || data.dailyCarbsTarget < 50) {
        errors.push('Carbs must be at least 50g')
      }
      if (!data.dailyFatTarget || data.dailyFatTarget < 20) {
        errors.push('Fat must be at least 20g')
      }
      break
    }
    case 'CREATE_RECIPE': {
      const data = (action as CreateRecipeAction).data
      if (!data.name) errors.push('Missing recipe name')
      if (!data.ingredients || data.ingredients.length === 0) {
        errors.push('Recipe must have at least one ingredient')
      }
      if (!data.instructions || data.instructions.length === 0) {
        errors.push('Recipe must have at least one instruction')
      }
      if (!data.servings || data.servings < 1) {
        errors.push('Servings must be at least 1')
      }
      break
    }
    case 'ADD_INVENTORY_ITEM': {
      const data = (action as AddInventoryAction).data
      if (!data.itemName) errors.push('Missing item name')
      if (!data.quantity || data.quantity <= 0) errors.push('Quantity must be positive')
      if (!data.unit) errors.push('Missing unit')
      if (!data.category) errors.push('Missing category')
      break
    }
    case 'ADD_STAPLE': {
      const data = (action as AddStapleAction).data
      if (!data.itemName) errors.push('Missing item name')
      if (!data.quantity || data.quantity <= 0) errors.push('Quantity must be positive')
      if (!data.unit) errors.push('Missing unit')
      break
    }
    default:
      errors.push('Unknown action type')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format action for display in confirmation modal
 */
export function formatActionForDisplay(action: NutritionistAction): {
  title: string
  description: string
  details: Record<string, string | number | string[]>
} {
  switch (action.type) {
    case 'UPDATE_MACROS': {
      const data = (action as UpdateMacrosAction).data
      return {
        title: 'Update Macro Targets',
        description: 'This will update your daily nutritional targets:',
        details: {
          'Daily Calories': `${data.dailyCalorieTarget} kcal`,
          'Protein': `${data.dailyProteinTarget}g`,
          'Carbs': `${data.dailyCarbsTarget}g`,
          'Fat': `${data.dailyFatTarget}g`,
          'Fiber': data.dailyFiberTarget ? `${data.dailyFiberTarget}g` : 'Not set',
        },
      }
    }
    case 'CREATE_RECIPE': {
      const data = (action as CreateRecipeAction).data
      return {
        title: 'Create New Recipe',
        description: `Add "${data.name}" to your recipe collection:`,
        details: {
          'Name': data.name,
          'Servings': data.servings,
          'Prep Time': `${data.prepTimeMinutes} mins`,
          'Cook Time': `${data.cookTimeMinutes} mins`,
          'Cuisine': data.cuisineType || 'Not specified',
          'Meal Type': data.mealCategory,
          'Calories': `${data.caloriesPerServing} per serving`,
          'Protein': `${data.proteinPerServing}g per serving`,
          'Ingredients': data.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`),
        },
      }
    }
    case 'ADD_INVENTORY_ITEM': {
      const data = (action as AddInventoryAction).data
      return {
        title: 'Add to Inventory',
        description: 'Add this item to your inventory:',
        details: {
          'Item': data.itemName,
          'Quantity': `${data.quantity} ${data.unit}`,
          'Category': data.category,
          'Location': data.location || 'Not specified',
          'Expiry': data.expiryDate || 'Not set',
        },
      }
    }
    case 'ADD_STAPLE': {
      const data = (action as AddStapleAction).data
      return {
        title: 'Add to Staples',
        description: 'Add this to your shopping staples:',
        details: {
          'Item': data.itemName,
          'Quantity': `${data.quantity} ${data.unit}`,
          'Frequency': (data.frequency || 'weekly').replace('_', ' '),
        },
      }
    }
    default:
      return {
        title: 'Unknown Action',
        description: 'Action type not recognized',
        details: {},
      }
  }
}
