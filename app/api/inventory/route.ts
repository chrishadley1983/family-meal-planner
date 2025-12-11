import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { lookupShelfLife, fuzzyLookupShelfLife } from '@/lib/inventory/shelf-life-data'
import { calculateEstimatedExpiry } from '@/lib/inventory/calculations'

// Storage location enum values
const storageLocations = ['fridge', 'freezer', 'cupboard', 'pantry'] as const

// Create inventory item schema
const createInventorySchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().min(1, 'Category is required'),
  location: z.enum(storageLocations).nullable().optional(),
  purchaseDate: z.string().optional(), // ISO date string
  expiryDate: z.string().nullable().optional(), // ISO date string
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  addedBy: z.enum(['Manual', 'Photo', 'CSV', 'ShoppingList']).optional().default('Manual'),
})

// Update inventory item schema
const updateInventorySchema = z.object({
  itemName: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  location: z.enum(storageLocations).nullable().optional(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().nullable().optional(),
  expiryIsEstimated: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().nullable().optional(),
})

// Bulk update schema
const bulkUpdateSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
  expiryDate: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Bulk delete schema
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID required'),
})

/**
 * GET /api/inventory
 * Fetch all inventory items for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching inventory for user:', session.user.id)

    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { expiryDate: 'asc' },
        { category: 'asc' },
        { itemName: 'asc' },
      ],
    })

    console.log('🟢 Inventory fetched:', items.length, 'items')

    return NextResponse.json({ items })
  } catch (error) {
    console.error('❌ Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/inventory
 * Create a new inventory item
 *
 * If expiryDate is not provided, will attempt to calculate from shelf life data
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createInventorySchema.parse(body)

    console.log('🔷 Creating inventory item:', data.itemName)

    // Determine purchase date (default to now)
    const purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : new Date()

    // Determine expiry date and whether it's estimated
    let expiryDate: Date | null = null
    let expiryIsEstimated = false
    let location = data.location

    if (data.expiryDate) {
      // User provided expiry date
      expiryDate = new Date(data.expiryDate)
      expiryIsEstimated = false
    } else {
      // Try to calculate from shelf life data
      const shelfLife = fuzzyLookupShelfLife(data.itemName)
      if (shelfLife) {
        expiryDate = calculateEstimatedExpiry(purchaseDate, shelfLife.typicalShelfLifeDays)
        expiryIsEstimated = true
        // Use default location from shelf life if not provided
        if (!location && shelfLife.defaultLocation) {
          location = shelfLife.defaultLocation
        }
        console.log('🔄 Using shelf life data:', shelfLife.ingredientName, '-', shelfLife.typicalShelfLifeDays, 'days')
      }
    }

    const item = await prisma.inventoryItem.create({
      data: {
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        location: location || null,
        purchaseDate,
        expiryDate,
        expiryIsEstimated,
        isActive: data.isActive ?? true,
        addedBy: data.addedBy || 'Manual',
        notes: data.notes || null,
        userId: session.user.id,
      },
    })

    console.log('🟢 Created inventory item:', item.itemName, item.id)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/inventory?id=<id>
 * Update an existing inventory item
 *
 * Also supports bulk operations:
 * PATCH /api/inventory?bulk=update (with body { ids, expiryDate?, isActive? })
 * PATCH /api/inventory?bulk=delete (with body { ids })
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    const bulk = searchParams.get('bulk')

    // Handle bulk operations
    if (bulk === 'update') {
      const body = await req.json()
      const data = bulkUpdateSchema.parse(body)

      console.log('🔷 Bulk updating', data.ids.length, 'inventory items')

      // Verify all items belong to user
      const items = await prisma.inventoryItem.findMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
      })

      if (items.length !== data.ids.length) {
        return NextResponse.json(
          { error: 'Some items not found or not authorized' },
          { status: 403 }
        )
      }

      // Build update data
      const updateData: Record<string, unknown> = {}
      if (data.expiryDate !== undefined) {
        updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
        updateData.expiryIsEstimated = false // User-set expiry is not estimated
      }
      if (data.isActive !== undefined) {
        updateData.isActive = data.isActive
      }

      await prisma.inventoryItem.updateMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
        data: updateData,
      })

      console.log('🟢 Bulk updated', data.ids.length, 'items')

      return NextResponse.json({
        message: `Updated ${data.ids.length} items`,
        count: data.ids.length,
      })
    }

    if (bulk === 'delete') {
      const body = await req.json()
      const data = bulkDeleteSchema.parse(body)

      console.log('🔷 Bulk deleting', data.ids.length, 'inventory items')

      // Verify all items belong to user
      const items = await prisma.inventoryItem.findMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
      })

      if (items.length !== data.ids.length) {
        return NextResponse.json(
          { error: 'Some items not found or not authorized' },
          { status: 403 }
        )
      }

      await prisma.inventoryItem.deleteMany({
        where: {
          id: { in: data.ids },
          userId: session.user.id,
        },
      })

      console.log('🟢 Bulk deleted', data.ids.length, 'items')

      return NextResponse.json({
        message: `Deleted ${data.ids.length} items`,
        count: data.ids.length,
      })
    }

    // Single item update
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID required (use ?id=<id> or ?bulk=update/delete)' },
        { status: 400 }
      )
    }

    const body = await req.json()
    const data = updateInventorySchema.parse(body)

    console.log('🔷 Updating inventory item:', id)

    // Verify item exists and belongs to user
    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (data.itemName !== undefined) updateData.itemName = data.itemName
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.category !== undefined) updateData.category = data.category
    if (data.location !== undefined) updateData.location = data.location
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate)
    if (data.expiryDate !== undefined) {
      updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
      // If user explicitly sets expiry, mark as not estimated
      updateData.expiryIsEstimated = false
    }
    if (data.expiryIsEstimated !== undefined) updateData.expiryIsEstimated = data.expiryIsEstimated
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.notes !== undefined) updateData.notes = data.notes

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData,
    })

    console.log('🟢 Updated inventory item:', item.itemName)

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues[0].message)
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/inventory?id=<id>
 * Delete a single inventory item
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    console.log('🔷 Deleting inventory item:', id)

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.inventoryItem.delete({
      where: { id },
    })

    console.log('🟢 Deleted inventory item:', existingItem.itemName)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
