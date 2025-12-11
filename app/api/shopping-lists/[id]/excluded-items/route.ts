import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  getExcludedItems,
  addBackExcludedItem,
} from '@/lib/inventory/server'

// GET - Get excluded items for a shopping list
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

    // Verify ownership
    const list = await prisma.shoppingList.findUnique({
      where: { id: shoppingListId },
      select: { userId: true },
    })

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    if (list.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const excludedItems = await getExcludedItems(shoppingListId)

    return NextResponse.json({ excludedItems })
  } catch (error) {
    console.error('❌ Error fetching excluded items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

const addBackSchema = z.object({
  excludedItemId: z.string().min(1),
  quantity: z.number().positive().optional(),
})

// POST - Add back an excluded item to the shopping list
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

    // Verify ownership
    const list = await prisma.shoppingList.findUnique({
      where: { id: shoppingListId },
      select: { userId: true, status: true },
    })

    if (!list) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    if (list.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (list.status !== 'Draft') {
      return NextResponse.json({ error: 'Can only modify draft shopping lists' }, { status: 400 })
    }

    const body = await req.json()
    const data = addBackSchema.parse(body)

    // Verify excluded item belongs to this shopping list
    const excludedItem = await prisma.shoppingListExcludedItem.findUnique({
      where: { id: data.excludedItemId },
    })

    if (!excludedItem || excludedItem.shoppingListId !== shoppingListId) {
      return NextResponse.json({ error: 'Excluded item not found' }, { status: 404 })
    }

    if (excludedItem.addedBackAt) {
      return NextResponse.json({ error: 'Item has already been added back' }, { status: 400 })
    }

    await addBackExcludedItem(data.excludedItemId, data.quantity)

    // Fetch updated excluded items
    const excludedItems = await getExcludedItems(shoppingListId)

    return NextResponse.json({
      message: 'Item added to shopping list',
      excludedItems,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('❌ Error adding back excluded item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
