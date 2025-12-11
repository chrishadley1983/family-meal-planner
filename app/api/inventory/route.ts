import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import type { StorageLocation } from '@/lib/types/inventory'

// Valid storage locations
const storageLocations = ['fridge', 'freezer', 'cupboard', 'pantry'] as const

// Schema for creating inventory items
const createInventorySchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().min(1, 'Category is required'),
  location: z.enum(storageLocations).optional().nullable(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  expiryIsEstimated: z.boolean().optional(),
  isActive: z.boolean().optional(),
  addedBy: z.enum(['manual', 'csv', 'photo', 'shopping_list']).optional(),
  notes: z.string().optional().nullable(),
})

// Schema for updating inventory items (all fields optional)
const updateInventorySchema = z.object({
  itemName: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  location: z.enum(storageLocations).optional().nullable(),
  purchaseDate: z.string().optional(),
  expiryDate: z.string().optional().nullable(),
  expiryIsEstimated: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔷 Fetching inventory for user:', session.user.id)

    const items = await prisma.inventoryItem.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { expiryDate: 'asc' },
        { category: 'asc' }
      ]
    })

    console.log('🟢 Found', items.length, 'inventory items')

    return NextResponse.json({ items })
  } catch (error) {
    console.error('❌ Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    console.log('🔷 Creating inventory item:', body.itemName)

    const data = createInventorySchema.parse(body)

    const item = await prisma.inventoryItem.create({
      data: {
        itemName: data.itemName,
        quantity: data.quantity,
        unit: data.unit,
        category: data.category,
        location: data.location as StorageLocation | null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        expiryIsEstimated: data.expiryIsEstimated ?? false,
        isActive: data.isActive ?? true,
        addedBy: data.addedBy ?? 'manual',
        notes: data.notes ?? null,
        userId: session.user.id,
      }
    })

    console.log('🟢 Created inventory item:', item.id)

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
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

export async function PATCH(req: NextRequest) {
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

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    console.log('🔷 Updating inventory item:', id, body)

    const data = updateInventorySchema.parse(body)

    // Build update object with only provided fields
    const updateData: Record<string, unknown> = {}

    if (data.itemName !== undefined) updateData.itemName = data.itemName
    if (data.quantity !== undefined) updateData.quantity = data.quantity
    if (data.unit !== undefined) updateData.unit = data.unit
    if (data.category !== undefined) updateData.category = data.category
    if (data.location !== undefined) updateData.location = data.location
    if (data.purchaseDate !== undefined) updateData.purchaseDate = new Date(data.purchaseDate)
    if (data.expiryDate !== undefined) updateData.expiryDate = data.expiryDate ? new Date(data.expiryDate) : null
    if (data.expiryIsEstimated !== undefined) updateData.expiryIsEstimated = data.expiryIsEstimated
    if (data.isActive !== undefined) updateData.isActive = data.isActive
    if (data.notes !== undefined) updateData.notes = data.notes

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: updateData
    })

    console.log('🟢 Updated inventory item:', item.id)

    return NextResponse.json({ item })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.issues)
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

    const existingItem = await prisma.inventoryItem.findUnique({
      where: { id }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log('🔷 Deleting inventory item:', id)

    await prisma.inventoryItem.delete({
      where: { id }
    })

    console.log('🟢 Deleted inventory item:', id)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
