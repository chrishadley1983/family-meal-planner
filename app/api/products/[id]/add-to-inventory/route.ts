import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const addToInventorySchema = z.object({
  expiryDate: z.string().optional().nullable(),
  quantity: z.number().positive().optional(),
  location: z.enum(['fridge', 'freezer', 'cupboard', 'pantry']).optional(),
})

/**
 * POST /api/products/[id]/add-to-inventory
 *
 * Add a product to the user's inventory with optional expiry date.
 * Uses AI to suggest expiry if not provided.
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
    const data = addToInventorySchema.parse(body)

    // Calculate expiry date if not provided
    let expiryDate: Date | null = null
    let expiryIsEstimated = false

    if (data.expiryDate) {
      expiryDate = new Date(data.expiryDate)
    } else {
      // Try to estimate expiry based on product category
      const estimatedDays = getEstimatedShelfLife(product.category)
      if (estimatedDays) {
        expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + estimatedDays)
        expiryIsEstimated = true
      }
    }

    // Determine storage location based on category if not provided
    const location = data.location || getDefaultStorageLocation(product.category)

    console.log('🔷 Adding product to inventory:', product.name)

    // Create inventory item
    const inventoryItem = await prisma.inventoryItem.create({
      data: {
        userId: session.user.id,
        itemName: product.brand ? `${product.brand} ${product.name}` : product.name,
        quantity: data.quantity || product.quantity,
        unit: product.unitOfMeasure,
        category: product.category,
        expiryDate,
        expiryIsEstimated,
        location,
        addedBy: 'product',
        notes: product.notes,
      }
    })

    console.log('🟢 Product added to inventory:', inventoryItem.itemName)

    return NextResponse.json({
      success: true,
      inventoryItem,
      expiryEstimated: expiryIsEstimated,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error adding product to inventory:', error)
    return NextResponse.json(
      { error: 'Failed to add product to inventory' },
      { status: 500 }
    )
  }
}

/**
 * Get estimated shelf life in days based on product category
 */
function getEstimatedShelfLife(category: string): number | null {
  const shelfLifeMap: Record<string, number> = {
    'Ready Meals': 5,
    'Snack Bars': 180,
    'Crisps & Savoury Snacks': 90,
    'Yoghurts & Dairy Snacks': 14,
    'Biscuits & Sweet Snacks': 120,
    'Nuts & Seeds': 180,
    'Fruit Snacks': 30,
    'Frozen Snacks': 180,
    'Drinks & Smoothies': 7,
    'Other': 30,
  }
  return shelfLifeMap[category] || null
}

/**
 * Get default storage location based on product category
 */
function getDefaultStorageLocation(category: string): 'fridge' | 'freezer' | 'cupboard' | 'pantry' {
  const locationMap: Record<string, 'fridge' | 'freezer' | 'cupboard' | 'pantry'> = {
    'Ready Meals': 'fridge',
    'Snack Bars': 'cupboard',
    'Crisps & Savoury Snacks': 'cupboard',
    'Yoghurts & Dairy Snacks': 'fridge',
    'Biscuits & Sweet Snacks': 'cupboard',
    'Nuts & Seeds': 'cupboard',
    'Fruit Snacks': 'cupboard',
    'Frozen Snacks': 'freezer',
    'Drinks & Smoothies': 'fridge',
    'Other': 'cupboard',
  }
  return locationMap[category] || 'cupboard'
}
