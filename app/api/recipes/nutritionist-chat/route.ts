import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { interactWithNutritionist, generateSuggestedPrompts } from '@/lib/claude'
import { NutritionistChatRequest } from '@/lib/types/nutritionist'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { recipe, macroAnalysis, conversationHistory, userMessage } = body

    // Validate required fields
    if (!recipe || !recipe.recipeName) {
      return NextResponse.json(
        { error: 'Recipe is required' },
        { status: 400 }
      )
    }

    if (!macroAnalysis || !macroAnalysis.perServing) {
      return NextResponse.json(
        { error: 'Macro analysis is required' },
        { status: 400 }
      )
    }

    if (!userMessage || typeof userMessage !== 'string') {
      return NextResponse.json(
        { error: 'User message is required' },
        { status: 400 }
      )
    }

    // Get the main user's profile for context
    const mainProfile = await prisma.familyProfile.findFirst({
      where: {
        userId: session.user.id,
        isMainUser: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        profileName: true,
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

    // Build the request for the Claude function
    const chatRequest: NutritionistChatRequest = {
      recipe: {
        recipeName: recipe.recipeName,
        servings: recipe.servings || 4,
        mealType: recipe.mealType || [],
        ingredients: recipe.ingredients || [],
        instructions: recipe.instructions || [],
      },
      macroAnalysis: {
        perServing: {
          calories: macroAnalysis.perServing.calories || 0,
          protein: macroAnalysis.perServing.protein || 0,
          carbs: macroAnalysis.perServing.carbs || 0,
          fat: macroAnalysis.perServing.fat || 0,
          fiber: macroAnalysis.perServing.fiber || 0,
          sugar: macroAnalysis.perServing.sugar || 0,
          sodium: macroAnalysis.perServing.sodium || 0,
        },
        overallRating: macroAnalysis.overallRating || 'yellow',
        overallExplanation: macroAnalysis.overallExplanation || '',
      },
      userProfile: {
        profileName: mainProfile.profileName,
        dailyCalorieTarget: mainProfile.dailyCalorieTarget,
        dailyProteinTarget: mainProfile.dailyProteinTarget,
        dailyCarbsTarget: mainProfile.dailyCarbsTarget,
        dailyFatTarget: mainProfile.dailyFatTarget,
        macroTrackingEnabled: mainProfile.macroTrackingEnabled,
      },
      conversationHistory: conversationHistory || [],
      userMessage,
    }

    console.log('🗣️ Nutritionist chat request:', {
      recipe: chatRequest.recipe.recipeName,
      messageCount: chatRequest.conversationHistory.length,
      userMessage: chatRequest.userMessage.substring(0, 50) + '...',
    })

    // Call the Claude function
    const response = await interactWithNutritionist(chatRequest)

    console.log('🟢 Nutritionist chat response:', {
      messagePreview: response.message.substring(0, 50) + '...',
      suggestedPrompts: response.suggestedPrompts.length,
      hasIngredientMods: !!response.ingredientModifications?.length,
      hasInstructionMods: !!response.instructionModifications?.length,
      modificationsPending: response.modificationsPending,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ Nutritionist chat error:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// GET endpoint to get initial suggested prompts based on macro analysis
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const overallRating = searchParams.get('overallRating') as 'green' | 'yellow' | 'red' || 'yellow'
    const protein = parseFloat(searchParams.get('protein') || '0')
    const fat = parseFloat(searchParams.get('fat') || '0')
    const carbs = parseFloat(searchParams.get('carbs') || '0')
    const sodium = parseFloat(searchParams.get('sodium') || '0')
    const fiber = parseFloat(searchParams.get('fiber') || '0')

    // Get user's macro targets
    const mainProfile = await prisma.familyProfile.findFirst({
      where: {
        userId: session.user.id,
        isMainUser: true,
      },
      select: {
        dailyProteinTarget: true,
        dailyFatTarget: true,
        dailyCarbsTarget: true,
        macroTrackingEnabled: true,
      },
    })

    const suggestedPrompts = generateSuggestedPrompts({
      overallRating,
      proteinPerServing: protein,
      fatPerServing: fat,
      carbsPerServing: carbs,
      sodiumPerServing: sodium,
      fiberPerServing: fiber,
      userProteinTarget: mainProfile?.dailyProteinTarget,
      userFatTarget: mainProfile?.dailyFatTarget,
      userCarbsTarget: mainProfile?.dailyCarbsTarget,
      macroTrackingEnabled: mainProfile?.macroTrackingEnabled || false,
    })

    return NextResponse.json({ suggestedPrompts })
  } catch (error) {
    console.error('❌ Error getting suggested prompts:', error)
    return NextResponse.json(
      { error: 'Failed to get suggested prompts' },
      { status: 500 }
    )
  }
}
