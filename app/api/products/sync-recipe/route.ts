import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { syncProductToRecipe } from '@/lib/products/product-recipe-sync'
import { z } from 'zod'

const syncRequestSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
})

/**
 * POST /api/products/sync-recipe
 *
 * Manually trigger sync of a snack product to the recipe database.
 * This is called automatically when creating/updating products with isSnack=true,
 * but can also be triggered manually if needed.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { productId } = syncRequestSchema.parse(body)

    // Fetch the product
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (product.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Check if product is a snack
    if (!product.isSnack) {
      return NextResponse.json(
        { error: 'Product is not marked as a snack. Set isSnack=true first.' },
        { status: 400 }
      )
    }

    // Sync to recipe
    const result = await syncProductToRecipe(product)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to sync product to recipe' },
        { status: 500 }
      )
    }

    // Fetch updated product with linked recipe
    const updatedProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        linkedRecipe: {
          select: {
            id: true,
            recipeName: true,
            isArchived: true,
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      recipeId: result.recipeId,
      created: result.created,
      product: updatedProduct,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error syncing product to recipe:', error)
    return NextResponse.json(
      { error: 'Failed to sync product to recipe' },
      { status: 500 }
    )
  }
}
