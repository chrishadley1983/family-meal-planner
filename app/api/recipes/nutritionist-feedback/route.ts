import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getNutritionistFeedbackForRecipe } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipe, macroAnalysis } = body

    if (!recipe || !recipe.recipeName || !macroAnalysis) {
      return NextResponse.json(
        { error: 'Recipe and macro analysis are required' },
        { status: 400 }
      )
    }

    // Get the main user's profile
    const mainProfile = await prisma.familyProfile.findFirst({
      where: {
        userId: session.user.id,
        isMainUser: true,
      },
      orderBy: {
        createdAt: 'asc', // Fallback to oldest profile if no main user set
      },
      select: {
        profileName: true,
        age: true,
        activityLevel: true,
        allergies: true,
        foodDislikes: true,
        dailyCalorieTarget: true,
        dailyProteinTarget: true,
        dailyCarbsTarget: true,
        dailyFatTarget: true,
        macroTrackingEnabled: true,
      },
    })

    if (!mainProfile) {
      return NextResponse.json(
        { error: 'User profile not found.' },
        { status: 404 }
      )
    }

    // Call Claude API to get nutritionist feedback
    const feedback = await getNutritionistFeedbackForRecipe({
      recipe: {
        recipeName: recipe.recipeName,
        description: recipe.description,
        servings: recipe.servings || 4,
        mealType: recipe.mealType || recipe.mealCategory || [],
        ingredients: recipe.ingredients,
      },
      userProfile: {
        profileName: mainProfile.profileName,
        age: mainProfile.age,
        activityLevel: mainProfile.activityLevel,
        allergies: mainProfile.allergies,
        foodDislikes: mainProfile.foodDislikes,
        dailyCalorieTarget: mainProfile.dailyCalorieTarget,
        dailyProteinTarget: mainProfile.dailyProteinTarget,
        dailyCarbsTarget: mainProfile.dailyCarbsTarget,
        dailyFatTarget: mainProfile.dailyFatTarget,
        macroTrackingEnabled: mainProfile.macroTrackingEnabled,
      },
      macroAnalysis,
    })

    return NextResponse.json({
      feedback
    })
  } catch (error) {
    console.error('Nutritionist feedback error:', error)
    return NextResponse.json(
      { error: 'Failed to get nutritionist feedback' },
      { status: 500 }
    )
  }
}
