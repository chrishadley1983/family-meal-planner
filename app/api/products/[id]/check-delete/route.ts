import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/products/[id]/check-delete
 *
 * Check if a product has linked recipes before deletion.
 * Returns information about what would be deleted.
 */
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        linkedRecipe: {
          select: { id: true, recipeName: true }
        },
        sourceForRecipes: {
          select: { id: true, recipeName: true }
        }
      }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Collect all linked recipes
    const linkedRecipes: { id: string; name: string }[] = []

    // Direct linked recipe (snack -> recipe)
    if (product.linkedRecipe) {
      linkedRecipes.push({
        id: product.linkedRecipe.id,
        name: product.linkedRecipe.recipeName
      })
    }

    // Recipes sourced from this product
    for (const recipe of product.sourceForRecipes) {
      if (!linkedRecipes.some(r => r.id === recipe.id)) {
        linkedRecipes.push({
          id: recipe.id,
          name: recipe.recipeName
        })
      }
    }

    console.log(`🔷 Check delete for product "${product.name}": ${linkedRecipes.length} linked recipes`)

    return NextResponse.json({
      productName: product.name,
      hasLinkedRecipes: linkedRecipes.length > 0,
      linkedRecipeCount: linkedRecipes.length,
      linkedRecipes
    })
  } catch (error) {
    console.error('❌ Error checking product deletion:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
