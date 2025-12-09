import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership and get existing plan
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    if (existingPlan.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Can only regenerate Draft meal plans' },
        { status: 400 }
      )
    }

    // Get locked meals to preserve
    const lockedMeals = existingPlan.meals.filter(m => m.isLocked)

    // Fetch user's profiles and recipes
    const [profiles, recipes] = await Promise.all([
      prisma.familyProfile.findMany({
        where: { userId: session.user.id }
      }),
      prisma.recipe.findMany({
        where: {
          userId: session.user.id,
          isArchived: false
        },
        include: {
          ingredients: true
        },
        take: 50
      })
    ])

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: 'Please add some recipes before regenerating' },
        { status: 400 }
      )
    }

    // Generate new meal plan with Claude
    const generatedPlan = await generateMealPlan({
      profiles,
      recipes,
      weekStartDate: existingPlan.weekStartDate.toISOString(),
      weekProfileSchedules: existingPlan.customSchedule as any,
    })

    // Validate recipe IDs
    const validRecipeIds = new Set(recipes.map(r => r.id))
    const validatedMeals = generatedPlan.meals.map((meal: any) => {
      const recipeId = meal.recipeId && validRecipeIds.has(meal.recipeId) ? meal.recipeId : null

      if (meal.recipeId && !recipeId) {
        console.warn(`⚠️ Claude suggested invalid recipe ID: ${meal.recipeId} for ${meal.recipeName}`)
      }

      return {
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeId,
        recipeName: meal.recipeName || null,
        notes: meal.notes || null,
        isLocked: false
      }
    })

    // Calculate servings based on who's eating each meal
    console.log('🧮 Calculating servings for regenerated meals...')
    const mealsWithServings = calculateServingsForMeals(
      validatedMeals,
      existingPlan.customSchedule as any
    )

    // Filter out meals with 0 servings
    const mealsWithValidServings = filterZeroServingMeals(mealsWithServings)

    // Filter out meals that conflict with locked meals
    const lockedMealKeys = new Set(
      lockedMeals.map(m => `${m.dayOfWeek}-${m.mealType}`)
    )

    const newMeals = mealsWithValidServings.filter((meal: any) =>
      !lockedMealKeys.has(`${meal.dayOfWeek}-${meal.mealType}`)
    )

    const filteredCount = mealsWithServings.length - mealsWithValidServings.length
    console.log(`✅ Regenerated ${newMeals.length} meals (filtered ${filteredCount} with 0 servings), preserving ${lockedMeals.length} locked meals`)

    // Delete existing unlocked meals
    await prisma.meal.deleteMany({
      where: {
        mealPlanId: params.id,
        isLocked: false
      }
    })

    // Create new meals
    await prisma.meal.createMany({
      data: newMeals.map((meal: any) => ({
        mealPlanId: params.id,
        ...meal
      }))
    })

    // Fetch updated meal plan
    const updatedPlan = await prisma.mealPlan.findUnique({
      where: { id: params.id },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    return NextResponse.json({
      mealPlan: updatedPlan,
      summary: generatedPlan.summary
    })
  } catch (error: any) {
    console.error('Error regenerating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate meal plan' },
      { status: 500 }
    )
  }
}
