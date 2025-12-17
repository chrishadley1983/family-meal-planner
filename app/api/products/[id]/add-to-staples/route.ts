import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addToStaplesSchema = z.object({
  frequency: z.enum(['weekly', 'every_2_weeks', 'every_4_weeks', 'every_3_months']).default('every_2_weeks'),
  quantity: z.number().positive().optional(),
})

/**
 * POST /api/products/[id]/add-to-staples
 *
 * Add a product to the user's staples list for recurring purchase.
 */
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

    // Get the product
    const product = await prisma.product.findUnique({
      where: { id }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const body = await req.json()
    const data = addToStaplesSchema.parse(body)

    // Check if staple already exists for this product name
    const existingStaple = await prisma.staple.findFirst({
      where: {
        userId: session.user.id,
        itemName: product.brand ? `${product.brand} ${product.name}` : product.name,
        isActive: true,
      }
    })

    if (existingStaple) {
      return NextResponse.json(
        { error: 'This product is already in your staples list' },
        { status: 409 }
      )
    }

    console.log('🔷 Adding product to staples:', product.name)

    // Create staple
    const staple = await prisma.staple.create({
      data: {
        userId: session.user.id,
        itemName: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity: data.quantity || product.quantity,
        unit: product.unitOfMeasure,
        category: product.category,
        frequency: data.frequency,
        notes: product.notes,
        isActive: true,
      }
    })

    console.log('🟢 Product added to staples:', staple.itemName, 'Frequency:', staple.frequency)

    return NextResponse.json({
      success: true,
      staple,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error adding product to staples:', error)
    return NextResponse.json(
      { error: 'Failed to add product to staples' },
      { status: 500 }
    )
  }
}
