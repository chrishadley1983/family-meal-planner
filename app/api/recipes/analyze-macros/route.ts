import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateIngredients } from '@/lib/claude'
import { getRecipeNutrition } from '@/lib/nutrition/nutrition-service'

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

    const servings = recipe.servings || 4

    // Diagnostic logging for nutrition calculation issue
    console.log('🔍 DIAGNOSTIC - analyze-macros API received:', {
      recipeId: recipe.id,
      recipeName: recipe.recipeName,
      servingsFromRequest: recipe.servings,
      servingsUsed: servings,
      ingredientCount: recipe.ingredients?.length,
      ingredients: recipe.ingredients?.map((ing: any) => ({
        name: ing.ingredientName,
        quantity: ing.quantity,
        unit: ing.unit,
        isProduct: ing.isProduct,
        productId: ing.productId
      }))
    })

    console.log('📊 Calculating nutrition via unified service...')

    // Step 1: Calculate accurate nutrition using unified service
    // Uses persistent DB cache → seed data → USDA API → AI estimation
    const nutritionResult = await getRecipeNutrition({
      recipeId: recipe.id, // If provided, will save to recipe and use cached values
      ingredients: recipe.ingredients,
      servings,
    })

    console.log(`✅ Nutrition calculated (${nutritionResult.confidence} confidence, source: ${nutritionResult.source}):`, nutritionResult.perServing)

    // Step 2: Get qualitative ratings from Claude (ingredient healthiness, overall rating)
    // This is the only AI call - used for subjective assessments, not numbers
    const ratings = await rateIngredients({
      ingredients: recipe.ingredients,
      nutrition: nutritionResult.perServing,
      userProfile: {
        dailyCalorieTarget: mainProfile.dailyCalorieTarget,
        dailyProteinTarget: mainProfile.dailyProteinTarget,
        dailyCarbsTarget: mainProfile.dailyCarbsTarget,
        dailyFatTarget: mainProfile.dailyFatTarget,
        macroTrackingEnabled: mainProfile.macroTrackingEnabled,
      },
    })

    // Combine calculated nutrition with AI ratings
    const analysis = {
      perServing: {
        calories: nutritionResult.perServing.calories,
        protein: nutritionResult.perServing.protein,
        carbs: nutritionResult.perServing.carbs,
        fat: nutritionResult.perServing.fat,
        fiber: nutritionResult.perServing.fiber,
        sugar: nutritionResult.perServing.sugar,
        sodium: nutritionResult.perServing.sodium,
      },
      overallRating: ratings.overallRating,
      overallExplanation: ratings.overallExplanation,
      ingredientRatings: ratings.ingredientRatings,
      // Add metadata about nutrition calculation
      nutritionSource: 'calculated', // vs 'estimated' when using AI
      nutritionConfidence: nutritionResult.confidence,
    }

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
