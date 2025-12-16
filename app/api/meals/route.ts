import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { mealPlanId, dayOfWeek, mealType, recipeId, recipeName, servings, isLocked } = body

    if (!mealPlanId || !dayOfWeek || !mealType) {
      return NextResponse.json(
        { error: 'mealPlanId, dayOfWeek, and mealType are required' },
        { status: 400 }
      )
    }

    // Verify ownership of the meal plan
    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id: mealPlanId,
        userId: session.user.id
      }
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Check if a meal already exists for this slot
    const existingMeal = await prisma.meal.findFirst({
      where: {
        mealPlanId,
        dayOfWeek,
        mealType
      }
    })

    if (existingMeal) {
      return NextResponse.json(
        { error: 'A meal already exists for this slot. Delete it first or update it.' },
        { status: 409 }
      )
    }

    // Create the new meal
    const meal = await prisma.meal.create({
      data: {
        mealPlanId,
        dayOfWeek,
        mealType,
        recipeId: recipeId || null,
        recipeName: recipeName || null,
        servings: servings || 1,
        isLocked: isLocked || false,
      },
      include: {
        recipe: true
      }
    })

    console.log(`✅ Created new meal ${meal.id} for ${dayOfWeek} ${mealType}`)

    return NextResponse.json({ meal }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create meal' },
      { status: 500 }
    )
  }
}
