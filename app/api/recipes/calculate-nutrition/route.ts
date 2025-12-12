import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRecipeNutrition } from '@/lib/nutrition/nutrition-service'

/**
 * POST /api/recipes/calculate-nutrition
 *
 * Unified nutrition calculation endpoint.
 * Uses persistent cache → seed data → USDA API → AI estimation
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ingredients, servings, recipeId, forceRecalculate } = await req.json()

    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return NextResponse.json({ error: 'Ingredients are required' }, { status: 400 })
    }

    if (!servings || servings < 1) {
      return NextResponse.json({ error: 'Valid servings count required' }, { status: 400 })
    }

    console.log('📊 Calculating nutrition via unified service...')

    // Use the unified nutrition service
    const result = await getRecipeNutrition({
      recipeId,
      ingredients,
      servings,
      forceRecalculate: forceRecalculate === true,
    })

    // Return in the legacy format for backward compatibility
    const nutrition = {
      caloriesPerServing: result.perServing.calories,
      proteinPerServing: result.perServing.protein,
      carbsPerServing: result.perServing.carbs,
      fatPerServing: result.perServing.fat,
      fiberPerServing: result.perServing.fiber,
      sugarPerServing: result.perServing.sugar,
      sodiumPerServing: result.perServing.sodium,
    }

    return NextResponse.json({
      nutrition,
      // Include additional metadata
      confidence: result.confidence,
      source: result.source,
      ingredientsHash: result.ingredientsHash,
    })
  } catch (error: unknown) {
    console.error('❌ Error calculating nutrition:', error)
    const message = error instanceof Error ? error.message : 'Failed to calculate nutrition'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
