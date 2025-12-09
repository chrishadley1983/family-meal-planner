import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Fetch the original recipe with all its related data
    const originalRecipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' }
        },
        instructions: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    if (!originalRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Create a duplicate recipe
    const { id: _, ingredients, instructions, userId, createdAt, updatedAt, ...recipeData } = originalRecipe

    const duplicatedRecipe = await prisma.recipe.create({
      data: {
        ...recipeData,
        recipeName: `${originalRecipe.recipeName} (Copy)`,
        userId: session.user.id,
        timesUsed: 0,
        timesManuallySelected: 0,
        lastUsedDate: null,
        isFavorite: false, // Duplicate is not favorited by default
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
        ingredients: {
          create: ingredients.map(({ id: _, recipeId: __, ...ing }) => ing)
        },
        instructions: {
          create: instructions.map(({ id: _, recipeId: __, ...inst }) => inst)
        }
      },
      include: {
        ingredients: {
          orderBy: { sortOrder: 'asc' }
        },
        instructions: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    })

    return NextResponse.json({ recipe: duplicatedRecipe }, { status: 201 })
  } catch (error) {
    console.error('Error duplicating recipe:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
