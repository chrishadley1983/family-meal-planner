/**
 * Display formatting utilities for nutritionist actions
 * This file is safe to import in client components (no Prisma imports)
 */

import {
  NutritionistAction,
  UpdateMacrosAction,
  UpdatePreferencesAction,
  CreateRecipeAction,
  AddInventoryAction,
  AddStapleAction,
} from './types'

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
    case 'UPDATE_PREFERENCES': {
      const data = (action as UpdatePreferencesAction).data
      const changes: string[] = []
      if (data.addLikes?.length) changes.push(`Add to likes: ${data.addLikes.join(', ')}`)
      if (data.removeLikes?.length) changes.push(`Remove from likes: ${data.removeLikes.join(', ')}`)
      if (data.addDislikes?.length) changes.push(`Add to dislikes: ${data.addDislikes.join(', ')}`)
      if (data.removeDislikes?.length) changes.push(`Remove from dislikes: ${data.removeDislikes.join(', ')}`)
      return {
        title: 'Update Food Preferences',
        description: 'This will update your food likes and dislikes:',
        details: {
          'Changes': changes,
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
