/**
 * GET /api/discover/recipes
 *
 * Search and filter the master recipe database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const searchSchema = z.object({
  query: z.string().optional(),
  cuisineType: z.string().optional(),
  mealCategory: z.string().optional(),
  maxCalories: z.coerce.number().optional(),
  minProtein: z.coerce.number().optional(),
  maxTime: z.coerce.number().optional(),
  excludeAllergens: z.string().optional(), // comma-separated
  excludeIngredients: z.string().optional(), // comma-separated
  includeIngredients: z.string().optional(), // comma-separated
  dietaryTags: z.string().optional(), // comma-separated: vegetarian,vegan,gluten-free
  useInventory: z.coerce.boolean().optional(),
  profileId: z.string().optional(), // Filter based on profile preferences
  sourceSite: z.string().optional(), // Filter by source site
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20)
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Recipe discovery search request')

    const { searchParams } = new URL(req.url)
    const rawParams = Object.fromEntries(searchParams)
    const params = searchSchema.parse(rawParams)

    console.log('🔄 Search params:', params)

    // Build where clause
    const where: any = {
      isActive: true,
      dataQualityScore: { gte: 50 } // Only show quality recipes
    }

    // Text search on name/ingredients
    if (params.query && params.query.trim()) {
      const searchTerm = params.query.trim().toLowerCase()
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { ingredientNames: { hasSome: [searchTerm] } }
      ]
    }

    // Cuisine type filter
    if (params.cuisineType) {
      where.cuisineType = { equals: params.cuisineType, mode: 'insensitive' }
    }

    // Meal category filter
    if (params.mealCategory) {
      where.mealCategory = { has: params.mealCategory.toLowerCase() }
    }

    // Calorie filter
    if (params.maxCalories) {
      where.caloriesPerServing = { lte: params.maxCalories }
    }

    // Protein filter
    if (params.minProtein) {
      where.proteinPerServing = { gte: params.minProtein }
    }

    // Time filter
    if (params.maxTime) {
      where.totalTimeMinutes = { lte: params.maxTime }
    }

    // Dietary tags filter
    if (params.dietaryTags) {
      const tags = params.dietaryTags.split(',').map(t => t.trim().toLowerCase())
      where.dietaryTags = { hasEvery: tags }
    }

    // Source site filter
    if (params.sourceSite) {
      const site = await prisma.recipeSourceSite.findUnique({
        where: { name: params.sourceSite }
      })
      if (site) {
        where.sourceSiteId = site.id
      }
    }

    // Exclude allergens
    if (params.excludeAllergens) {
      const allergens = params.excludeAllergens.split(',').map(a => a.trim().toLowerCase())
      // Recipe must NOT have any of these allergens
      where.NOT = where.NOT || []
      where.NOT.push({
        allergens: { hasSome: allergens }
      })
    }

    // Exclude ingredients
    if (params.excludeIngredients) {
      const excluded = params.excludeIngredients.split(',').map(i => i.trim().toLowerCase())
      where.NOT = where.NOT || []
      where.NOT.push({
        ingredientNames: { hasSome: excluded }
      })
    }

    // Include ingredients (recipe must contain at least one)
    if (params.includeIngredients) {
      const included = params.includeIngredients.split(',').map(i => i.trim().toLowerCase())
      where.ingredientNames = { hasSome: included }
    }

    // Profile-based filtering (respect allergies and dislikes)
    if (params.profileId) {
      const profile = await prisma.familyProfile.findUnique({
        where: { id: params.profileId },
        select: { allergies: true, foodDislikes: true }
      })

      if (profile) {
        // Exclude profile's allergens
        if (profile.allergies && Array.isArray(profile.allergies)) {
          const profileAllergens = (profile.allergies as any[]).map((a: any) =>
            typeof a === 'string' ? a.toLowerCase() : a.name?.toLowerCase()
          ).filter(Boolean)

          if (profileAllergens.length > 0) {
            where.NOT = where.NOT || []
            where.NOT.push({
              allergens: { hasSome: profileAllergens }
            })
          }
        }

        // Exclude profile's food dislikes
        if (profile.foodDislikes && profile.foodDislikes.length > 0) {
          const dislikes = profile.foodDislikes.map((d: string) => d.toLowerCase())
          where.NOT = where.NOT || []
          where.NOT.push({
            ingredientNames: { hasSome: dislikes }
          })
        }
      }
    }

    // Use inventory ingredients (find recipes using what user has)
    if (params.useInventory) {
      const inventory = await prisma.inventoryItem.findMany({
        where: { userId: session.user.id, isActive: true },
        select: { itemName: true }
      })

      const inventoryItems = inventory.map(i => i.itemName.toLowerCase())

      if (inventoryItems.length > 0) {
        where.ingredientNames = { hasSome: inventoryItems }
      }
    }

    // Get user's existing recipe URLs to mark duplicates
    const userRecipes = await prisma.recipe.findMany({
      where: { userId: session.user.id },
      select: { sourceUrl: true }
    })
    const userRecipeUrls = new Set(userRecipes.map(r => r.sourceUrl).filter(Boolean))

    // Query recipes
    const [recipes, total] = await Promise.all([
      prisma.masterRecipe.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          sourceUrl: true,
          sourceSite: {
            select: { displayName: true, name: true }
          },
          prepTimeMinutes: true,
          cookTimeMinutes: true,
          totalTimeMinutes: true,
          caloriesPerServing: true,
          proteinPerServing: true,
          carbsPerServing: true,
          fatPerServing: true,
          cuisineType: true,
          mealCategory: true,
          dietaryTags: true,
          allergens: true,
          servings: true,
          dataQualityScore: true
        },
        orderBy: [
          { dataQualityScore: 'desc' },
          { name: 'asc' }
        ],
        skip: (params.page - 1) * params.limit,
        take: params.limit
      }),
      prisma.masterRecipe.count({ where })
    ])

    // Add duplicate flag to each recipe
    const recipesWithDupeFlag = recipes.map(r => ({
      ...r,
      // Convert Decimal to number for JSON serialization
      proteinPerServing: r.proteinPerServing ? Number(r.proteinPerServing) : null,
      carbsPerServing: r.carbsPerServing ? Number(r.carbsPerServing) : null,
      fatPerServing: r.fatPerServing ? Number(r.fatPerServing) : null,
      alreadyInLibrary: userRecipeUrls.has(r.sourceUrl)
    }))

    console.log(`🟢 Found ${total} recipes, returning ${recipes.length} for page ${params.page}`)

    return NextResponse.json({
      recipes: recipesWithDupeFlag,
      total,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(total / params.limit)
    })

  } catch (error) {
    console.error('❌ Recipe discovery error:', error)
    return NextResponse.json(
      { error: 'Failed to search recipes' },
      { status: 500 }
    )
  }
}
