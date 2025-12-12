/**
 * Action handlers for nutritionist-suggested database operations
 * All actions require user confirmation before execution
 */

import { PrismaClient, StapleFrequency, StorageLocation } from '@prisma/client'
import {
  NutritionistAction,
  UpdateMacrosAction,
  CreateRecipeAction,
  AddInventoryAction,
  AddStapleAction,
} from './types'

const prisma = new PrismaClient()

export interface ActionResult {
  success: boolean
  message: string
  data?: unknown
  error?: string
}

/**
 * Execute a nutritionist action after user confirmation
 */
export async function executeAction(
  action: NutritionistAction,
  userId: string
): Promise<ActionResult> {
  switch (action.type) {
    case 'UPDATE_MACROS':
      return handleUpdateMacros(action as UpdateMacrosAction, userId)
    case 'CREATE_RECIPE':
      return handleCreateRecipe(action as CreateRecipeAction, userId)
    case 'ADD_INVENTORY_ITEM':
      return handleAddInventory(action as AddInventoryAction, userId)
    case 'ADD_STAPLE':
      return handleAddStaple(action as AddStapleAction, userId)
    default:
      return {
        success: false,
        message: 'Unknown action type',
        error: `Action type not recognized`,
      }
  }
}

/**
 * Handle UPDATE_MACROS action - update a profile's macro targets
 */
async function handleUpdateMacros(
  action: UpdateMacrosAction,
  userId: string
): Promise<ActionResult> {
  try {
    // Verify the profile belongs to this user
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: action.data.profileId,
        userId: userId,
      },
    })

    if (!profile) {
      return {
        success: false,
        message: 'Profile not found',
        error: 'The specified profile does not exist or does not belong to you',
      }
    }

    // Update the profile with new macro targets
    const updatedProfile = await prisma.familyProfile.update({
      where: { id: action.data.profileId },
      data: {
        dailyCalorieTarget: action.data.dailyCalorieTarget,
        dailyProteinTarget: action.data.dailyProteinTarget,
        dailyCarbsTarget: action.data.dailyCarbsTarget,
        dailyFatTarget: action.data.dailyFatTarget,
        dailyFiberTarget: action.data.dailyFiberTarget || null,
        macroTrackingEnabled: true,
      },
    })

    return {
      success: true,
      message: `Macro targets updated for ${profile.profileName}`,
      data: updatedProfile,
    }
  } catch (error) {
    console.error('❌ Error updating macros:', error)
    return {
      success: false,
      message: 'Failed to update macro targets',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle CREATE_RECIPE action - create a new recipe with full details
 */
async function handleCreateRecipe(
  action: CreateRecipeAction,
  userId: string
): Promise<ActionResult> {
  try {
    const { data } = action

    // Validate required fields
    if (!data.name || !data.ingredients || !data.instructions) {
      return {
        success: false,
        message: 'Missing required recipe data',
        error: 'Recipe must have name, ingredients, and instructions',
      }
    }

    // Create the recipe with all related data
    const recipe = await prisma.recipe.create({
      data: {
        userId,
        recipeName: data.name,
        description: data.description || '',
        servings: data.servings || 4,
        prepTimeMinutes: data.prepTimeMinutes || null,
        cookTimeMinutes: data.cookTimeMinutes || null,
        totalTimeMinutes: (data.prepTimeMinutes || 0) + (data.cookTimeMinutes || 0) || null,
        cuisineType: data.cuisineType || null,
        mealType: data.mealCategory || [],
        recipeSource: 'ai_nutritionist',
        caloriesPerServing: data.caloriesPerServing || null,
        proteinPerServing: data.proteinPerServing || null,
        carbsPerServing: data.carbsPerServing || null,
        fatPerServing: data.fatPerServing || null,
        fiberPerServing: data.fiberPerServing || null,
        nutritionAutoCalculated: true,
        ingredients: {
          create: data.ingredients.map((ing, idx) => ({
            ingredientName: ing.name,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category || null,
            sortOrder: idx,
          })),
        },
        instructions: {
          create: data.instructions.map((inst) => ({
            stepNumber: inst.stepNumber,
            instruction: inst.instruction,
            sortOrder: inst.stepNumber,
          })),
        },
      },
      include: {
        ingredients: true,
        instructions: true,
      },
    })

    return {
      success: true,
      message: `Recipe "${data.name}" created successfully!`,
      data: recipe,
    }
  } catch (error) {
    console.error('❌ Error creating recipe:', error)
    return {
      success: false,
      message: 'Failed to create recipe',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle ADD_INVENTORY_ITEM action - add item to inventory
 */
async function handleAddInventory(
  action: AddInventoryAction,
  userId: string
): Promise<ActionResult> {
  try {
    const { data } = action

    // Map location string to enum
    const locationMap: Record<string, StorageLocation> = {
      fridge: StorageLocation.fridge,
      freezer: StorageLocation.freezer,
      cupboard: StorageLocation.cupboard,
      pantry: StorageLocation.pantry,
    }

    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        userId,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        location: data.location ? locationMap[data.location] : null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        addedBy: 'ai_nutritionist',
        isActive: true,
      },
    })

    return {
      success: true,
      message: `Added ${data.itemName} to your inventory`,
      data: inventoryItem,
    }
  } catch (error) {
    console.error('❌ Error adding inventory item:', error)
    return {
      success: false,
      message: 'Failed to add inventory item',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Handle ADD_STAPLE action - add item to staples list
 */
async function handleAddStaple(
  action: AddStapleAction,
  userId: string
): Promise<ActionResult> {
  try {
    const { data } = action

    // Map frequency string to enum
    const frequencyMap: Record<string, StapleFrequency> = {
      weekly: StapleFrequency.weekly,
      every_2_weeks: StapleFrequency.every_2_weeks,
      every_4_weeks: StapleFrequency.every_4_weeks,
      every_3_months: StapleFrequency.every_3_months,
    }

    const staple = await prisma.staple.create({
      data: {
        userId,
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category || null,
        frequency: data.frequency ? frequencyMap[data.frequency] : StapleFrequency.weekly,
        isActive: true,
      },
    })

    return {
      success: true,
      message: `Added ${data.itemName} to your staples (${data.frequency || 'weekly'})`,
      data: staple,
    }
  } catch (error) {
    console.error('❌ Error adding staple:', error)
    return {
      success: false,
      message: 'Failed to add staple',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
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
