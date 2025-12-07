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

    // Get recipe with ingredients
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        ingredients: true
      }
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Get all family profiles
    const profiles = await prisma.familyProfile.findMany({
      where: {
        userId: session.user.id
      }
    })

    // Check compatibility for each profile
    const compatibility = profiles.map(profile => {
      const incompatibleIngredients: string[] = []

      // Check allergies
      const allergies = Array.isArray(profile.allergies)
        ? profile.allergies as string[]
        : []

      // Check dislikes
      const dislikes = profile.foodDislikes || []

      // Check each ingredient
      recipe.ingredients.forEach(ingredient => {
        const ingredientLower = ingredient.ingredientName.toLowerCase()

        // Check allergies
        allergies.forEach(allergy => {
          if (typeof allergy === 'string' && ingredientLower.includes(allergy.toLowerCase())) {
            if (!incompatibleIngredients.includes(ingredient.ingredientName)) {
              incompatibleIngredients.push(ingredient.ingredientName + ' (allergy)')
            }
          }
        })

        // Check dislikes
        dislikes.forEach(dislike => {
          if (ingredientLower.includes(dislike.toLowerCase())) {
            if (!incompatibleIngredients.includes(ingredient.ingredientName)) {
              incompatibleIngredients.push(ingredient.ingredientName + ' (dislike)')
            }
          }
        })
      })

      return {
        profileId: profile.id,
        profileName: profile.profileName,
        isCompatible: incompatibleIngredients.length === 0,
        incompatibleIngredients
      }
    })

    return NextResponse.json({ compatibility })
  } catch (error) {
    console.error('Error checking compatibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
