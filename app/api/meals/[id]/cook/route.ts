import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  previewDeduction,
  performDeduction,
  getRecipeIngredientsForDeduction,
  getInventorySettings,
} from '@/lib/inventory/server'
import { DEFAULT_INVENTORY_SETTINGS } from '@/lib/types/inventory'

// Schema for marking meal as cooked
const cookMealSchema = z.object({
  deductFromInventory: z.boolean().optional().default(true),
  allowPartialDeduction: z.boolean().optional().default(true),
  itemsToRemove: z.array(z.string()).optional().default([]),
})

// GET /api/meals/[id]/cook - Preview deduction for a meal
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mealId } = await params

    // Fetch meal with recipe
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        mealPlan: {
          select: { userId: true },
        },
        recipe: {
          select: { id: true, recipeName: true },
        },
      },
    })

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    if (meal.mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already cooked
    if (meal.isCooked) {
      return NextResponse.json({
        success: true,
        alreadyCooked: true,
        cookedAt: meal.cookedAt,
        inventoryDeducted: meal.inventoryDeducted,
        message: 'This meal has already been marked as cooked',
      })
    }

    // If no recipe linked, nothing to deduct
    if (!meal.recipeId || !meal.recipe) {
      return NextResponse.json({
        success: true,
        hasRecipe: false,
        message: 'No recipe linked to this meal',
      })
    }

    // Get recipe ingredients
    const scalingFactor = meal.scalingFactor || 1
    const ingredients = await getRecipeIngredientsForDeduction(meal.recipeId, scalingFactor)

    if (ingredients.length === 0) {
      return NextResponse.json({
        success: true,
        hasRecipe: true,
        hasIngredients: false,
        message: 'Recipe has no ingredients to deduct',
      })
    }

    // Get inventory settings for small quantity threshold
    const settings = await getInventorySettings(session.user.id)
    const thresholdGrams = settings?.smallQuantityThresholdGrams ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdGrams
    const thresholdMl = settings?.smallQuantityThresholdMl ?? DEFAULT_INVENTORY_SETTINGS.smallQuantityThresholdMl

    // Preview deduction
    const preview = await previewDeduction(session.user.id, ingredients)

    // Enrich preview items with small quantity info
    const enrichedItems = preview.results.map(result => {
      let isSmallQuantity = false
      if (result.remainingInInventory !== null && result.remainingInInventory > 0) {
        // Check if remaining quantity is below threshold based on unit
        const unit = result.requestedUnit?.toLowerCase() || ''
        const remaining = result.remainingInInventory

        // Weight units
        if (['g', 'gram', 'grams'].includes(unit)) {
          isSmallQuantity = remaining <= thresholdGrams
        } else if (['kg', 'kilogram', 'kilograms'].includes(unit)) {
          isSmallQuantity = remaining * 1000 <= thresholdGrams
        }
        // Volume units
        else if (['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'].includes(unit)) {
          isSmallQuantity = remaining <= thresholdMl
        } else if (['l', 'liter', 'liters', 'litre', 'litres'].includes(unit)) {
          isSmallQuantity = remaining * 1000 <= thresholdMl
        }
        // Count units - any value of 1 or less is considered small for count-based items
        else if (['each', 'piece', 'pieces', 'unit', 'units'].includes(unit)) {
          isSmallQuantity = remaining <= 1
        }
      } else if (result.remainingInInventory === 0) {
        // Will be zero after deduction
        isSmallQuantity = true
      }

      return {
        ingredientName: result.ingredientName,
        recipeQuantity: result.requestedQuantity,
        recipeUnit: result.requestedUnit,
        inventoryQuantity: result.remainingInInventory !== null
          ? result.remainingInInventory + result.deductedQuantity
          : null,
        inventoryUnit: result.requestedUnit,
        quantityAfter: result.remainingInInventory ?? 0,
        inventoryItem: result.deductedFromId,
        isInsufficient: result.status === 'partially_deducted',
        isSmallQuantity,
        status: result.status,
      }
    })

    return NextResponse.json({
      success: true,
      meal: {
        id: meal.id,
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeName: meal.recipe.recipeName,
        scalingFactor,
      },
      hasRecipe: true,
      hasIngredients: true,
      preview: {
        ...preview,
        items: enrichedItems,
        thresholds: {
          grams: thresholdGrams,
          ml: thresholdMl,
        },
      },
    })
  } catch (error) {
    console.error('❌ Error previewing meal deduction:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meals/[id]/cook - Mark meal as cooked and optionally deduct from inventory
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mealId } = await params
    const body = await req.json()
    const data = cookMealSchema.parse(body)

    // Fetch meal with recipe
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        mealPlan: {
          select: { userId: true },
        },
        recipe: {
          select: { id: true, recipeName: true },
        },
      },
    })

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    if (meal.mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if already cooked
    if (meal.isCooked) {
      return NextResponse.json({
        success: true,
        alreadyCooked: true,
        message: 'This meal was already marked as cooked',
      })
    }

    let deductionResult = null

    // Deduct from inventory if requested and recipe exists
    if (data.deductFromInventory && meal.recipeId && meal.recipe) {
      const scalingFactor = meal.scalingFactor || 1
      const ingredients = await getRecipeIngredientsForDeduction(meal.recipeId, scalingFactor)

      if (ingredients.length > 0) {
        console.log('🔷 Deducting ingredients for meal:', meal.recipe.recipeName)
        deductionResult = await performDeduction(session.user.id, ingredients, {
          allowPartial: data.allowPartialDeduction,
          removeEmptyItems: true,
        })
        console.log('🟢 Deduction complete:', {
          fullyDeducted: deductionResult.fullyDeducted,
          partiallyDeducted: deductionResult.partiallyDeducted,
          notFound: deductionResult.notFound,
        })
      }
    }

    // Remove selected small quantity items from inventory
    if (data.itemsToRemove && data.itemsToRemove.length > 0) {
      console.log('🔷 Removing selected items from inventory:', data.itemsToRemove)
      for (const itemId of data.itemsToRemove) {
        // Verify the item belongs to the user before removing
        const item = await prisma.inventoryItem.findUnique({
          where: { id: itemId },
          select: { userId: true },
        })

        if (item && item.userId === session.user.id) {
          await prisma.inventoryItem.update({
            where: { id: itemId },
            data: { isActive: false },
          })
        }
      }
      console.log('🟢 Removed', data.itemsToRemove.length, 'items from inventory')
    }

    // Mark meal as cooked
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        isCooked: true,
        cookedAt: new Date(),
        inventoryDeducted: deductionResult !== null,
      },
    })

    console.log('🟢 Meal marked as cooked:', meal.recipeName || mealId)

    return NextResponse.json({
      success: true,
      mealId,
      recipeName: meal.recipe?.recipeName || meal.recipeName,
      cookedAt: new Date().toISOString(),
      deduction: deductionResult,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('❌ Error marking meal as cooked:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meals/[id]/cook - Unmark meal as cooked (doesn't restore inventory)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: mealId } = await params

    // Fetch meal
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: {
        mealPlan: {
          select: { userId: true },
        },
      },
    })

    if (!meal) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    if (meal.mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Unmark meal as cooked
    await prisma.meal.update({
      where: { id: mealId },
      data: {
        isCooked: false,
        cookedAt: null,
        // Note: We don't reset inventoryDeducted because we can't restore the inventory
      },
    })

    console.log('🟢 Meal unmarked as cooked:', mealId)

    return NextResponse.json({
      success: true,
      mealId,
      message: meal.inventoryDeducted
        ? 'Meal unmarked as cooked. Note: Inventory was not restored.'
        : 'Meal unmarked as cooked.',
    })
  } catch (error) {
    console.error('❌ Error unmarking meal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
