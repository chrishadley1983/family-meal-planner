import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { interactWithNutritionist, generateSuggestedPrompts } from '@/lib/claude'
import { NutritionistChatRequest, IngredientModification } from '@/lib/types/nutritionist'
import { calculateRecipeNutrition } from '@/lib/nutrition'

/**
 * Apply ingredient modifications to a copy of the ingredient list
 * Returns the modified ingredient array for validation
 */
function applyModificationsToIngredients(
  originalIngredients: Array<{ ingredientName: string; quantity: number; unit: string; notes?: string }>,
  modifications: IngredientModification[]
): Array<{ ingredientName: string; quantity: number; unit: string; notes?: string }> {
  let ingredients = [...originalIngredients]

  for (const mod of modifications) {
    switch (mod.action) {
      case 'add':
        if (mod.newIngredient) {
          ingredients.push({
            ingredientName: mod.newIngredient.name,
            quantity: mod.newIngredient.quantity,
            unit: mod.newIngredient.unit,
            notes: mod.newIngredient.notes || '',
          })
        }
        break

      case 'remove':
        ingredients = ingredients.filter(
          ing => ing.ingredientName.toLowerCase() !== mod.ingredientName.toLowerCase()
        )
        break

      case 'replace':
        if (mod.newIngredient) {
          const index = ingredients.findIndex(
            ing => ing.ingredientName.toLowerCase() === mod.ingredientName.toLowerCase()
          )
          if (index !== -1) {
            ingredients[index] = {
              ingredientName: mod.newIngredient.name,
              quantity: mod.newIngredient.quantity,
              unit: mod.newIngredient.unit,
              notes: mod.newIngredient.notes || '',
            }
          }
        }
        break

      case 'adjust':
        if (mod.newIngredient) {
          const index = ingredients.findIndex(
            ing => ing.ingredientName.toLowerCase() === mod.ingredientName.toLowerCase()
          )
          if (index !== -1) {
            ingredients[index] = {
              ...ingredients[index],
              quantity: mod.newIngredient.quantity,
              unit: mod.newIngredient.unit || ingredients[index].unit,
            }
          }
        }
        break
    }
  }

  return ingredients
}

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

    // VALIDATION: If Emilia proposed or applied ingredient modifications,
    // calculate ACTUAL nutrition impact using USDA/seed data (no AI variance!)
    if (response.ingredientModifications && response.ingredientModifications.length > 0) {
      console.log('🔬 Validating ingredient modifications with nutrition service...')

      try {
        // Apply modifications to a copy of the ingredients
        const modifiedIngredients = applyModificationsToIngredients(
          recipe.ingredients || [],
          response.ingredientModifications
        )

        console.log('📝 Modified ingredients:', modifiedIngredients.length, 'items')

        // Calculate nutrition using authoritative data (USDA + seed data)
        // This is deterministic - no AI variance!
        const servings = recipe.servings || 4
        const nutritionResult = await calculateRecipeNutrition(
          modifiedIngredients,
          servings,
          true // Enable USDA API lookups
        )

        console.log(`📊 Nutrition calculated (${nutritionResult.confidence} confidence)`)

        // Replace Emilia's estimate with actual calculated values
        const actualNutrition = {
          calories: nutritionResult.perServing.calories,
          protein: nutritionResult.perServing.protein,
          carbs: nutritionResult.perServing.carbs,
          fat: nutritionResult.perServing.fat,
          fiber: nutritionResult.perServing.fiber,
          sugar: nutritionResult.perServing.sugar,
          sodium: nutritionResult.perServing.sodium,
        }

        // Calculate the actual impact (change from current to new)
        const currentNutrition = macroAnalysis.perServing
        const impact = {
          calories: actualNutrition.calories - Math.round(currentNutrition.calories),
          protein: Math.round((actualNutrition.protein - currentNutrition.protein) * 10) / 10,
          carbs: Math.round((actualNutrition.carbs - currentNutrition.carbs) * 10) / 10,
          fat: Math.round((actualNutrition.fat - currentNutrition.fat) * 10) / 10,
        }

        console.log('✅ Validation complete:', {
          before: { fat: currentNutrition.fat, protein: currentNutrition.protein },
          after: actualNutrition,
          impact,
          confidence: nutritionResult.confidence,
        })

        // Override Emilia's projected nutrition with actual values
        response.projectedNutrition = actualNutrition

        // Add validation metadata for the client
        ;(response as any).validatedNutrition = {
          isValidated: true,
          impact,
          meetsGoal: impact.fat <= 0 || impact.protein >= 0, // Simple check: less fat or more protein is good
          confidence: nutritionResult.confidence,
        }
      } catch (validationError) {
        console.error('⚠️ Validation failed, using Emilia estimate:', validationError)
        // Keep Emilia's estimate if validation fails
      }
    }

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
