import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  previewDeduction,
  performDeduction,
  getRecipeIngredientsForDeduction,
} from '@/lib/inventory'

// Schema for marking meal as cooked
const cookMealSchema = z.object({
  deductFromInventory: z.boolean().optional().default(true),
  allowPartialDeduction: z.boolean().optional().default(true),
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
          select: { id: true, name: true },
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

    // Preview deduction
    const preview = await previewDeduction(session.user.id, ingredients)

    return NextResponse.json({
      success: true,
      meal: {
        id: meal.id,
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeName: meal.recipe.name,
        scalingFactor,
      },
      hasRecipe: true,
      hasIngredients: true,
      preview,
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
          select: { id: true, name: true },
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
        console.log('🔷 Deducting ingredients for meal:', meal.recipe.name)
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
      recipeName: meal.recipe?.name || meal.recipeName,
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
