import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRecipeNutrition, calculateIngredientsHash } from '@/lib/nutrition/nutrition-service'

/**
 * POST /api/recipes/backfill-nutrition
 *
 * Backfills nutrition data for recipes that don't have calculated values.
 * This endpoint is for migrating existing recipes to use the unified nutrition system.
 *
 * Query params:
 * - limit: number of recipes to process (default 10)
 * - force: recalculate even if values exist (default false)
 * - all: process all recipes for this user (default false)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const force = searchParams.get('force') === 'true'
    const all = searchParams.get('all') === 'true'

    console.log(`📊 Starting nutrition backfill (limit=${limit}, force=${force}, all=${all})`)

    // Find recipes that need nutrition calculation
    const whereClause = force
      ? { userId: session.user.id, isArchived: false }
      : {
          userId: session.user.id,
          isArchived: false,
          OR: [
            { nutritionCalculatedAt: null },
            { ingredientsHash: null },
            { caloriesPerServing: null },
          ],
        }

    const recipes = await prisma.recipe.findMany({
      where: whereClause,
      include: {
        ingredients: true,
      },
      take: all ? undefined : limit,
      orderBy: { updatedAt: 'desc' },
    })

    console.log(`📋 Found ${recipes.length} recipes to process`)

    const results: Array<{
      id: string
      name: string
      status: 'success' | 'skipped' | 'error'
      calories?: number
      confidence?: string
      error?: string
    }> = []

    for (const recipe of recipes) {
      try {
        // Skip recipes with no ingredients
        if (recipe.ingredients.length === 0) {
          results.push({
            id: recipe.id,
            name: recipe.recipeName,
            status: 'skipped',
            error: 'No ingredients',
          })
          continue
        }

        // Calculate ingredients hash
        const ingredients = recipe.ingredients.map(ing => ({
          ingredientName: ing.ingredientName,
          quantity: ing.quantity,
          unit: ing.unit,
          notes: ing.notes || undefined,
        }))

        // Check if we can skip (hash matches and not forcing)
        const currentHash = calculateIngredientsHash(ingredients)
        if (
          !force &&
          recipe.ingredientsHash === currentHash &&
          recipe.caloriesPerServing !== null
        ) {
          results.push({
            id: recipe.id,
            name: recipe.recipeName,
            status: 'skipped',
            calories: recipe.caloriesPerServing,
            confidence: recipe.nutritionConfidence || undefined,
          })
          continue
        }

        console.log(`🔄 Processing: ${recipe.recipeName}`)

        // Calculate nutrition
        const result = await getRecipeNutrition({
          recipeId: recipe.id,
          ingredients,
          servings: recipe.servings || 4,
          forceRecalculate: force,
        })

        results.push({
          id: recipe.id,
          name: recipe.recipeName,
          status: 'success',
          calories: result.perServing.calories,
          confidence: result.confidence,
        })

        console.log(`✅ Processed: ${recipe.recipeName} - ${result.perServing.calories} cal (${result.confidence})`)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        results.push({
          id: recipe.id,
          name: recipe.recipeName,
          status: 'error',
          error: message,
        })
        console.error(`❌ Failed: ${recipe.recipeName} - ${message}`)
      }
    }

    // Count results
    const successCount = results.filter(r => r.status === 'success').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const errorCount = results.filter(r => r.status === 'error').length

    console.log(`📊 Backfill complete: ${successCount} success, ${skippedCount} skipped, ${errorCount} errors`)

    return NextResponse.json({
      message: `Processed ${results.length} recipes`,
      summary: {
        success: successCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      results,
    })
  } catch (error) {
    console.error('❌ Backfill error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/recipes/backfill-nutrition
 *
 * Get status of recipes that need nutrition backfill
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count recipes in different states
    const [totalRecipes, withNutrition, withHash, needsCalculation] = await Promise.all([
      prisma.recipe.count({
        where: { userId: session.user.id, isArchived: false },
      }),
      prisma.recipe.count({
        where: {
          userId: session.user.id,
          isArchived: false,
          caloriesPerServing: { not: null },
        },
      }),
      prisma.recipe.count({
        where: {
          userId: session.user.id,
          isArchived: false,
          ingredientsHash: { not: null },
        },
      }),
      prisma.recipe.count({
        where: {
          userId: session.user.id,
          isArchived: false,
          OR: [
            { nutritionCalculatedAt: null },
            { ingredientsHash: null },
          ],
        },
      }),
    ])

    // Get cached ingredient count
    const cachedIngredients = await prisma.ingredientNutritionCache.count()

    return NextResponse.json({
      recipes: {
        total: totalRecipes,
        withNutrition,
        withHash,
        needsCalculation,
      },
      cache: {
        cachedIngredients,
      },
    })
  } catch (error) {
    console.error('❌ Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get status' },
      { status: 500 }
    )
  }
}
