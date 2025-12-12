import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  calculateCookingDeductions,
  applyCookingDeductions,
} from '@/lib/inventory/cooking-deduction'

const previewDeductionSchema = z.object({
  recipeId: z.string().uuid().optional(),
  mealId: z.string().uuid().optional(),
  ingredients: z.array(z.object({
    ingredientName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
  })),
  scalingFactor: z.number().positive().default(1),
})

const applyDeductionSchema = z.object({
  deductions: z.array(z.object({
    ingredientName: z.string().min(1),
    recipeQuantity: z.number(),
    recipeUnit: z.string().min(1),
    inventoryMatch: z.object({
      id: z.string().uuid(),
      itemName: z.string(),
      quantity: z.number(),
      unit: z.string(),
    }).nullable(),
    currentInventoryQuantity: z.number(),
    quantityAfterDeduction: z.number(),
    shortfall: z.number(),
    isSmallQuantity: z.boolean(),
    selected: z.boolean(),
  })),
})

/**
 * POST /api/inventory/deduct
 * Preview deductions for cooking a recipe/meal
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = previewDeductionSchema.parse(body)

    console.log('🔷 Calculating cooking deductions for', data.ingredients.length, 'ingredients')

    // If recipeId is provided, fetch ingredients from recipe
    let ingredients = data.ingredients
    if (data.recipeId && ingredients.length === 0) {
      const recipe = await prisma.recipe.findUnique({
        where: { id: data.recipeId },
        include: { ingredients: true },
      })

      if (!recipe) {
        return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
      }

      if (recipe.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      ingredients = recipe.ingredients.map((i: { ingredientName: string; quantity: number; unit: string }) => ({
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unit: i.unit,
      }))
    }

    // If mealId is provided, fetch ingredients and scaling from meal
    if (data.mealId && ingredients.length === 0) {
      const meal = await prisma.mealPlanMeal.findUnique({
        where: { id: data.mealId },
        include: {
          recipe: {
            include: { ingredients: true },
          },
          mealPlan: true,
        },
      })

      if (!meal || !meal.recipe) {
        return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
      }

      if (meal.mealPlan.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const scalingFactor = meal.servings / (meal.recipe.servings || 4)

      ingredients = meal.recipe.ingredients.map((i: { ingredientName: string; quantity: number; unit: string }) => ({
        ingredientName: i.ingredientName,
        quantity: i.quantity * scalingFactor,
        unit: i.unit,
      }))
    }

    // Calculate deductions
    const deductions = await calculateCookingDeductions(
      session.user.id,
      ingredients,
      data.scalingFactor
    )

    const selectedCount = deductions.filter(d => d.selected).length
    const shortfallCount = deductions.filter(d => d.shortfall > 0).length

    console.log('🟢 Deduction preview calculated:', {
      total: deductions.length,
      selected: selectedCount,
      shortfalls: shortfallCount,
    })

    return NextResponse.json({
      deductions,
      summary: {
        totalIngredients: deductions.length,
        canDeduct: selectedCount,
        withShortfall: shortfallCount,
        noMatch: deductions.filter(d => !d.inventoryMatch).length,
      },
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error calculating deductions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/inventory/deduct
 * Apply selected cooking deductions to inventory
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = applyDeductionSchema.parse(body)

    console.log('🔷 Applying cooking deductions for', data.deductions.filter(d => d.selected).length, 'items')

    interface DeductionItem {
      ingredientName: string
      recipeQuantity: number
      recipeUnit: string
      inventoryMatch: { id: string; itemName: string; quantity: number; unit: string } | null
      currentInventoryQuantity: number
      quantityAfterDeduction: number
      shortfall: number
      isSmallQuantity: boolean
      selected: boolean
    }

    // Verify all inventory items belong to this user
    const selectedWithMatch = data.deductions.filter((d: DeductionItem) => d.selected && d.inventoryMatch)
    const itemIds = selectedWithMatch.map((d: DeductionItem) => d.inventoryMatch!.id)

    const userItems = await prisma.inventoryItem.findMany({
      where: {
        id: { in: itemIds },
        userId: session.user.id,
      },
    })

    if (userItems.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Some items do not belong to you' },
        { status: 403 }
      )
    }

    // Apply deductions
    const result = await applyCookingDeductions(session.user.id, data.deductions)

    console.log('🟢 Deductions applied:', result.message)

    return NextResponse.json(result)
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error applying deductions:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
