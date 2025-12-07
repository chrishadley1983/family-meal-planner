import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ingredientSchema = z.object({
  id: z.string().optional(),
  ingredientName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const instructionSchema = z.object({
  id: z.string().optional(),
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1),
  timerMinutes: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const recipeUpdateSchema = z.object({
  recipeName: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  servings: z.number().int().positive().optional(),
  prepTimeMinutes: z.number().int().positive().optional().nullable(),
  cookTimeMinutes: z.number().int().positive().optional().nullable(),
  cuisineType: z.string().optional().nullable(),
  mealType: z.array(z.string()).optional(),
  difficultyLevel: z.string().optional().nullable(),
  recipeSource: z.string().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isVegetarian: z.boolean().optional(),
  isVegan: z.boolean().optional(),
  containsMeat: z.boolean().optional(),
  containsSeafood: z.boolean().optional(),
  isDairyFree: z.boolean().optional(),
  isGlutenFree: z.boolean().optional(),
  containsNuts: z.boolean().optional(),
  yieldsMultipleMeals: z.boolean().optional(),
  mealsYielded: z.number().int().positive().optional().nullable(),
  leftoverInstructions: z.string().optional().nullable(),
  freezable: z.boolean().optional(),
  reheatingInstructions: z.string().optional().nullable(),
  caloriesPerServing: z.number().int().positive().optional().nullable(),
  proteinPerServing: z.number().positive().optional().nullable(),
  carbsPerServing: z.number().positive().optional().nullable(),
  fatPerServing: z.number().positive().optional().nullable(),
  fiberPerServing: z.number().positive().optional().nullable(),
  sugarPerServing: z.number().positive().optional().nullable(),
  sodiumPerServing: z.number().int().positive().optional().nullable(),
  familyRating: z.number().min(1).max(5).optional().nullable(),
  isArchived: z.boolean().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.array(instructionSchema).optional(),
})

// GET - Get a specific recipe
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' }
        },
        instructions: {
          orderBy: { sortOrder: 'asc' }
        },
      }
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (recipe.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ recipe })
  } catch (error) {
    console.error('Error fetching recipe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update a recipe
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = recipeUpdateSchema.parse(body)

    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (existingRecipe.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate total time if prep and cook times are being updated
    let totalTimeMinutes = existingRecipe.totalTimeMinutes
    let isQuickMeal = existingRecipe.isQuickMeal
    if (data.prepTimeMinutes !== undefined || data.cookTimeMinutes !== undefined) {
      const prepTime = data.prepTimeMinutes ?? existingRecipe.prepTimeMinutes ?? 0
      const cookTime = data.cookTimeMinutes ?? existingRecipe.cookTimeMinutes ?? 0
      totalTimeMinutes = prepTime + cookTime || null
      // Update isQuickMeal based on new total time
      isQuickMeal = totalTimeMinutes !== null && totalTimeMinutes < 30
    }

    // If rating is being updated, set rating date
    const ratingDate = data.familyRating !== undefined ? new Date() : existingRecipe.ratingDate

    const { ingredients, instructions, ...recipeData } = data

    // Handle ingredients update
    if (ingredients !== undefined) {
      // Delete existing ingredients
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: id }
      })
    }

    // Handle instructions update
    if (instructions !== undefined) {
      // Delete existing instructions
      await prisma.recipeInstruction.deleteMany({
        where: { recipeId: id }
      })
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        totalTimeMinutes,
        isQuickMeal,
        ratingDate,
        ...(ingredients !== undefined && {
          ingredients: {
            create: ingredients.map((ing, index) => ({
              ingredientName: ing.ingredientName,
              quantity: ing.quantity,
              unit: ing.unit,
              category: ing.category,
              notes: ing.notes,
              sortOrder: ing.sortOrder ?? index,
            }))
          }
        }),
        ...(instructions !== undefined && {
          instructions: {
            create: instructions.map((inst, index) => ({
              stepNumber: inst.stepNumber,
              instruction: inst.instruction,
              timerMinutes: inst.timerMinutes,
              sortOrder: inst.sortOrder ?? index,
            }))
          }
        }),
      },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' }
        },
        instructions: {
          orderBy: { sortOrder: 'asc' }
        },
      }
    })

    return NextResponse.json({ recipe })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating recipe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a recipe
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (existingRecipe.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.recipe.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Recipe deleted successfully' })
  } catch (error) {
    console.error('Error deleting recipe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
