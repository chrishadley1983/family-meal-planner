import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { startOfWeek, endOfWeek } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStartDate, customSchedule } = await req.json()

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

    // Generate meal plan using Claude
    const generatedPlan = await generateMealPlan({
      profiles,
      recipes,
      weekStartDate,
      customSchedule, // Pass custom schedule override if provided
    })

    // Create the meal plan in database
    const weekStart = new Date(weekStartDate)
    const weekEnd = endOfWeek(weekStart)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        status: 'Draft',
        customSchedule: customSchedule || null, // Store custom schedule in database
        meals: {
          create: generatedPlan.meals.map((meal: any) => ({
            dayOfWeek: meal.dayOfWeek,
            mealType: meal.mealType,
            recipeId: meal.recipeId || null,
            recipeName: meal.recipeName || null,
            servings: meal.servings || null,
            notes: meal.notes || null,
          }))
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
