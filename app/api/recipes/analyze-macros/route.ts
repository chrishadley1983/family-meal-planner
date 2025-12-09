import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { analyzeRecipeMacros } from '@/lib/claude'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipe } = body

    if (!recipe || !recipe.recipeName || !recipe.ingredients) {
      return NextResponse.json(
        { error: 'Recipe name and ingredients are required' },
        { status: 400 }
      )
    }

    // Get the first user's profile
    const mainProfile = await prisma.familyProfile.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
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

    // Call Claude API to analyze macros
    const analysis = await analyzeRecipeMacros({
      recipe: {
        recipeName: recipe.recipeName,
        servings: recipe.servings || 4,
        ingredients: recipe.ingredients,
        caloriesPerServing: recipe.caloriesPerServing,
        proteinPerServing: recipe.proteinPerServing,
        carbsPerServing: recipe.carbsPerServing,
        fatPerServing: recipe.fatPerServing,
      },
      userProfile: mainProfile,
    })

    return NextResponse.json({
      analysis
    })
  } catch (error) {
    console.error('Macro analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze recipe macros' },
      { status: 500 }
    )
  }
}
