import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isValidPriority, isValidSource, SourceDetail } from '@/lib/types/shopping-list'

const createItemSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').max(200),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required').max(50),
  category: z.string().max(50).optional().nullable(),
  source: z.enum(['recipe', 'staple', 'manual']).optional().nullable(),
  sourceDetails: z.array(z.object({
    type: z.enum(['recipe', 'staple', 'manual']),
    id: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number(),
    unit: z.string(),
    mealPlanId: z.string().optional(),
  })).optional(),
  customNote: z.string().max(500).optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
})

const updateItemSchema = z.object({
  itemName: z.string().min(1).max(200).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).max(50).optional(),
  category: z.string().max(50).optional().nullable(),
  isPurchased: z.boolean().optional(),
  customNote: z.string().max(500).optional().nullable(),
  priority: z.enum(['Low', 'Medium', 'High']).optional(),
  displayOrder: z.number().int().min(0).optional(),
})

const batchUpdateSchema = z.object({
  itemIds: z.array(z.string()).min(1),
  update: z.object({
    isPurchased: z.boolean().optional(),
    category: z.string().optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
  }),
})

// Helper to verify shopping list ownership
async function verifyListOwnership(listId: string, userId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { userId: true },
  })

  if (!list) {
    return { error: 'Shopping list not found', status: 404 }
  }

  if (list.userId !== userId) {
    return { error: 'Forbidden', status: 403 }
  }

  return { success: true }
}

// GET - Get all items for a shopping list
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    const { searchParams } = new URL(req.url)
    const includePurchased = searchParams.get('includePurchased') !== 'false'

    const items = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        ...(includePurchased ? {} : { isPurchased: false }),
      },
      orderBy: [
        { category: 'asc' },
        { displayOrder: 'asc' },
        { itemName: 'asc' },
      ],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('❌ Error fetching shopping list items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add item(s) to shopping list
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    const body = await req.json()

    // Support both single item and array of items
    const items = Array.isArray(body) ? body : [body]
    const validatedItems = items.map((item) => createItemSchema.parse(item))

    // Get current max display order
    const maxOrder = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    let currentOrder = (maxOrder?.displayOrder ?? -1) + 1

    const createdItems = await prisma.shoppingListItem.createMany({
      data: validatedItems.map((item) => ({
        shoppingListId,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || null,
        source: item.source || 'manual',
        sourceDetails: item.sourceDetails || [],
        customNote: item.customNote || null,
        priority: item.priority || 'Medium',
        displayOrder: currentOrder++,
      })),
    })

    // Fetch the created items to return
    const newItems = await prisma.shoppingListItem.findMany({
      where: { shoppingListId },
      orderBy: { createdAt: 'desc' },
      take: validatedItems.length,
    })

    console.log(`🟢 Added ${createdItems.count} item(s) to shopping list`)

    return NextResponse.json({ items: newItems }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error adding shopping list item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update item(s) in shopping list
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const action = searchParams.get('action')

    const body = await req.json()

    // Handle batch update
    if (action === 'batch') {
      const data = batchUpdateSchema.parse(body)

      await prisma.shoppingListItem.updateMany({
        where: {
          id: { in: data.itemIds },
          shoppingListId,
        },
        data: data.update,
      })

      const updatedItems = await prisma.shoppingListItem.findMany({
        where: {
          id: { in: data.itemIds },
          shoppingListId,
        },
      })

      console.log(`🟢 Batch updated ${updatedItems.length} items`)

      return NextResponse.json({ items: updatedItems })
    }

    // Handle reorder
    if (action === 'reorder') {
      const reorderSchema = z.object({
        itemIds: z.array(z.string()).min(1),
      })
      const data = reorderSchema.parse(body)

      const updatePromises = data.itemIds.map((id, index) =>
        prisma.shoppingListItem.updateMany({
          where: { id, shoppingListId },
          data: { displayOrder: index },
        })
      )

      await Promise.all(updatePromises)

      console.log(`🟢 Reordered ${data.itemIds.length} items`)

      return NextResponse.json({ message: 'Items reordered successfully' })
    }

    // Single item update
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required for update' },
        { status: 400 }
      )
    }

    const existingItem = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.shoppingListId !== shoppingListId) {
      return NextResponse.json({ error: 'Item does not belong to this list' }, { status: 400 })
    }

    const data = updateItemSchema.parse(body)

    // Track original item name if name is being changed and not already tracked
    const updateData: Record<string, unknown> = { ...data }
    if (data.itemName && data.itemName !== existingItem.itemName) {
      // Only set originalItemName if it's not already set
      if (!existingItem.originalItemName) {
        updateData.originalItemName = existingItem.itemName
        console.log(`🔄 Tracking original name: "${existingItem.itemName}" → "${data.itemName}"`)
      }
    }

    const updatedItem = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: updateData,
    })

    console.log(`🟢 Updated item: ${updatedItem.itemName}`)

    return NextResponse.json({ item: updatedItem })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating shopping list item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove item(s) from shopping list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    const { searchParams } = new URL(req.url)
    const itemId = searchParams.get('itemId')
    const action = searchParams.get('action')

    // Handle delete purchased items
    if (action === 'purchased') {
      const result = await prisma.shoppingListItem.deleteMany({
        where: {
          shoppingListId,
          isPurchased: true,
        },
      })

      console.log(`🟢 Deleted ${result.count} purchased items`)

      return NextResponse.json({
        message: `Deleted ${result.count} purchased items`,
        deletedCount: result.count,
      })
    }

    // Handle batch delete
    if (action === 'batch') {
      const body = await req.json()
      const deleteSchema = z.object({
        itemIds: z.array(z.string()).min(1),
      })
      const data = deleteSchema.parse(body)

      const result = await prisma.shoppingListItem.deleteMany({
        where: {
          id: { in: data.itemIds },
          shoppingListId,
        },
      })

      console.log(`🟢 Batch deleted ${result.count} items`)

      return NextResponse.json({
        message: `Deleted ${result.count} items`,
        deletedCount: result.count,
      })
    }

    // Single item delete
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID required for delete' },
        { status: 400 }
      )
    }

    const existingItem = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    if (existingItem.shoppingListId !== shoppingListId) {
      return NextResponse.json({ error: 'Item does not belong to this list' }, { status: 400 })
    }

    await prisma.shoppingListItem.delete({
      where: { id: itemId },
    })

    console.log(`🟢 Deleted item: ${existingItem.itemName}`)

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error deleting shopping list item:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
