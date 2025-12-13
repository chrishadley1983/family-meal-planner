/**
 * GET /api/discover/filters
 *
 * Get available filter options from the master recipe database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching discovery filter options')

    // Get distinct values for filters in parallel
    const [
      cuisineResults,
      categoryResults,
      tagResults,
      allergenResults,
      sites,
      stats
    ] = await Promise.all([
      // Distinct cuisine types
      prisma.masterRecipe.findMany({
        where: { isActive: true, cuisineType: { not: null } },
        select: { cuisineType: true },
        distinct: ['cuisineType']
      }),

      // All meal categories (stored as arrays)
      prisma.masterRecipe.findMany({
        where: { isActive: true },
        select: { mealCategory: true }
      }),

      // All dietary tags
      prisma.masterRecipe.findMany({
        where: { isActive: true },
        select: { dietaryTags: true }
      }),

      // All allergens
      prisma.masterRecipe.findMany({
        where: { isActive: true },
        select: { allergens: true }
      }),

      // Active source sites
      prisma.recipeSourceSite.findMany({
        where: { isActive: true },
        select: { name: true, displayName: true }
      }),

      // Stats about the database
      prisma.masterRecipe.aggregate({
        where: { isActive: true },
        _count: true,
        _avg: {
          caloriesPerServing: true,
          proteinPerServing: true,
          totalTimeMinutes: true
        },
        _min: {
          caloriesPerServing: true,
          totalTimeMinutes: true
        },
        _max: {
          caloriesPerServing: true,
          totalTimeMinutes: true
        }
      })
    ])

    // Extract and dedupe cuisine types
    const cuisines = cuisineResults
      .map(c => c.cuisineType)
      .filter((c): c is string => !!c)
      .sort()

    // Flatten and dedupe meal categories
    const mealCategories = new Set<string>()
    categoryResults.forEach(r => {
      r.mealCategory.forEach(c => mealCategories.add(c))
    })

    // Flatten and dedupe dietary tags
    const dietaryTags = new Set<string>()
    tagResults.forEach(r => {
      r.dietaryTags.forEach(t => dietaryTags.add(t))
    })

    // Flatten and dedupe allergens
    const allergens = new Set<string>()
    allergenResults.forEach(r => {
      r.allergens.forEach(a => allergens.add(a))
    })

    console.log(`🟢 Filter options loaded: ${cuisines.length} cuisines, ${mealCategories.size} categories, ${sites.length} sites`)

    return NextResponse.json({
      cuisines,
      mealCategories: Array.from(mealCategories).sort(),
      dietaryTags: Array.from(dietaryTags).sort(),
      allergens: Array.from(allergens).sort(),
      sites: sites.map(s => ({ value: s.name, label: s.displayName })),
      stats: {
        totalRecipes: stats._count,
        avgCalories: stats._avg.caloriesPerServing ? Math.round(stats._avg.caloriesPerServing) : null,
        avgProtein: stats._avg.proteinPerServing ? Number(stats._avg.proteinPerServing).toFixed(1) : null,
        avgTime: stats._avg.totalTimeMinutes ? Math.round(stats._avg.totalTimeMinutes) : null,
        calorieRange: {
          min: stats._min.caloriesPerServing || 0,
          max: stats._max.caloriesPerServing || 1000
        },
        timeRange: {
          min: stats._min.totalTimeMinutes || 0,
          max: stats._max.totalTimeMinutes || 180
        }
      }
    })

  } catch (error) {
    console.error('❌ Filters fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch filters' },
      { status: 500 }
    )
  }
}
