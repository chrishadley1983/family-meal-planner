import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'
import { startOfWeek, endOfWeek } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStartDate, weekProfileSchedules } = await req.json()

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'Week start date is required' },
        { status: 400 }
      )
    }

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
        take: 50 // Limit to prevent token overflow
      })
    ])

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: 'Please add some recipes before generating a meal plan' },
        { status: 400 }
      )
    }

    // Generate meal plan using Claude with per-person schedules
    const generatedPlan = await generateMealPlan({
      profiles,
      recipes,
      weekStartDate,
      weekProfileSchedules, // Pass per-person schedules for week
    })

    // Create a set of valid recipe IDs for validation
    const validRecipeIds = new Set(recipes.map(r => r.id))

    // Validate and clean up meals - only include valid recipe IDs
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
      }
    })

    // Calculate servings based on who's eating each meal
    console.log('🧮 Calculating servings for all meals...')
    const mealsWithServings = calculateServingsForMeals(validatedMeals, weekProfileSchedules || [])

    // Filter out meals with 0 servings (no one eating)
    const finalMeals = filterZeroServingMeals(mealsWithServings)

    console.log(`✅ Created ${finalMeals.length} meals (filtered ${mealsWithServings.length - finalMeals.length} with 0 servings)`)

    // Create the meal plan in database
    const weekStart = new Date(weekStartDate)
    const weekEnd = endOfWeek(weekStart)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        status: 'Draft',
        customSchedule: weekProfileSchedules || null, // Store per-person schedules as JSON
        meals: {
          create: finalMeals
        }
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    return NextResponse.json({
      mealPlan,
      summary: generatedPlan.summary
    })
  } catch (error: any) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}
