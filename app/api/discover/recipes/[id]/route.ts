/**
 * GET /api/discover/recipes/[id]
 *
 * Get full details of a master recipe (for preview)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    console.log(`🔷 Fetching master recipe detail: ${id}`)

    const recipe = await prisma.masterRecipe.findUnique({
      where: { id },
      include: {
        sourceSite: {
          select: { displayName: true, name: true, baseUrl: true }
        }
      }
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Check if user already has this recipe
    const existing = await prisma.recipe.findFirst({
      where: {
        userId: session.user.id,
        sourceUrl: recipe.sourceUrl
      },
      select: { id: true }
    })

    // Convert Decimal fields to numbers for JSON serialization
    const serializedRecipe = {
      ...recipe,
      proteinPerServing: recipe.proteinPerServing ? Number(recipe.proteinPerServing) : null,
      carbsPerServing: recipe.carbsPerServing ? Number(recipe.carbsPerServing) : null,
      fatPerServing: recipe.fatPerServing ? Number(recipe.fatPerServing) : null,
      fiberPerServing: recipe.fiberPerServing ? Number(recipe.fiberPerServing) : null,
      sugarPerServing: recipe.sugarPerServing ? Number(recipe.sugarPerServing) : null
    }

    console.log(`🟢 Returning recipe: ${recipe.name}`)

    return NextResponse.json({
      recipe: serializedRecipe,
      alreadyInLibrary: !!existing,
      existingRecipeId: existing?.id || null
    })

  } catch (error) {
    console.error('❌ Recipe fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipe' },
      { status: 500 }
    )
  }
}
