import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'
import { getRecipeNutrition, calculateIngredientsHash } from '@/lib/nutrition/nutrition-service'

const ingredientSchema = z.object({
  ingredientName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const instructionSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1),
  timerMinutes: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().default(0),
})

const recipeSchema = z.object({
  recipeName: z.string().min(1, 'Recipe name is required'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  servings: z.number().int().positive().default(4),
  prepTimeMinutes: z.number().int().positive().optional().nullable(),
  cookTimeMinutes: z.number().int().positive().optional().nullable(),
  cuisineType: z.string().optional().nullable(),
  mealType: z.array(z.string()).default([]),
  difficultyLevel: z.string().optional().nullable(),
  recipeSource: z.string().optional().nullable(),
  sourceUrl: z.string().url().optional().nullable(),
  notes: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  isVegetarian: z.boolean().default(false),
  isVegan: z.boolean().default(false),
  containsMeat: z.boolean().default(false),
  containsSeafood: z.boolean().default(false),
  isDairyFree: z.boolean().default(false),
  isGlutenFree: z.boolean().default(false),
  containsNuts: z.boolean().default(false),
  yieldsMultipleMeals: z.boolean().default(false),
  mealsYielded: z.number().int().positive().optional().nullable(),
  leftoverInstructions: z.string().optional().nullable(),
  freezable: z.boolean().default(false),
  reheatingInstructions: z.string().optional().nullable(),
  caloriesPerServing: z.number().int().positive().optional().nullable(),
  proteinPerServing: z.number().positive().optional().nullable(),
  carbsPerServing: z.number().positive().optional().nullable(),
  fatPerServing: z.number().positive().optional().nullable(),
  fiberPerServing: z.number().positive().optional().nullable(),
  sugarPerServing: z.number().positive().optional().nullable(),
  sodiumPerServing: z.number().int().positive().optional().nullable(),
  ingredients: z.array(ingredientSchema).default([]),
  instructions: z.array(instructionSchema).default([]),
})

// GET - List all recipes for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const recipes = await prisma.recipe.findMany({
      where: {
        userId: session.user.id,
        ...(includeArchived ? {} : { isArchived: false })
      },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' }
        },
        instructions: {
          orderBy: { sortOrder: 'asc' }
        },
      },
      orderBy: [
        { familyRating: 'desc' },
        { timesUsed: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ recipes })
  } catch (error) {
    console.error('Error fetching recipes:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new recipe
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = recipeSchema.parse(body)

    // Generate SVG image if no image provided
    if (!data.imageUrl) {
      console.log('🎨 No image provided, generating SVG for:', data.recipeName)
      data.imageUrl = generateRecipeSVG(data.recipeName, data.mealType)
      console.log('✅ SVG generated successfully')
    }

    // Calculate total time if prep and cook times are provided
    const totalTimeMinutes =
      (data.prepTimeMinutes || 0) + (data.cookTimeMinutes || 0) || null

    const { ingredients, instructions, ...recipeData } = data

    // Calculate ingredients hash before creating
    const ingredientsHash = ingredients.length > 0
      ? calculateIngredientsHash(ingredients)
      : null

    const recipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        totalTimeMinutes,
        userId: session.user.id,
        ingredientsHash,
        ingredients: {
          create: ingredients.map((ing, index) => ({
            ...ing,
            sortOrder: index
          }))
        },
        instructions: {
          create: instructions.map((inst, index) => ({
            ...inst,
            sortOrder: index
          }))
        }
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

    // Calculate nutrition automatically if we have ingredients and no nutrition was provided
    if (
      ingredients.length > 0 &&
      !data.caloriesPerServing &&
      !data.proteinPerServing
    ) {
      console.log('📊 Auto-calculating nutrition for new recipe:', recipe.recipeName)

      // Run nutrition calculation in background (don't block response)
      getRecipeNutrition({
        recipeId: recipe.id,
        ingredients,
        servings: data.servings || 4,
      }).then(result => {
        console.log(`✅ Nutrition calculated for ${recipe.recipeName}: ${result.perServing.calories} cal (${result.confidence})`)
      }).catch(error => {
        console.error('❌ Failed to auto-calculate nutrition:', error)
      })
    }

    return NextResponse.json({ recipe }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating recipe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
