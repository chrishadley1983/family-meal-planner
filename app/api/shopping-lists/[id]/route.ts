import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isValidStatus, ShoppingListStatus } from '@/lib/types/shopping-list'

const updateShoppingListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(['Draft', 'Finalized', 'Archived']).optional(),
  categoryOrder: z.array(z.string()).optional(),
})

// GET - Get a single shopping list with all details
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

    const shoppingList = await prisma.shoppingList.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: [
            { category: 'asc' },
            { displayOrder: 'asc' },
          ],
        },
        mealPlans: {
          include: {
            mealPlan: {
              select: {
                id: true,
                weekStartDate: true,
                weekEndDate: true,
                status: true,
              },
            },
          },
        },
      },
    })

    if (!shoppingList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    if (shoppingList.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Group items by category for convenience
    const itemsByCategory = shoppingList.items.reduce((acc, item) => {
      const category = item.category || 'Uncategorized'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {} as Record<string, typeof shoppingList.items>)

    console.log(`🔷 Fetched shopping list: ${shoppingList.name} (${shoppingList.id})`)

    return NextResponse.json({
      shoppingList,
      itemsByCategory,
      itemCount: shoppingList.items.length,
      unpurchasedCount: shoppingList.items.filter((item) => !item.isPurchased).length,
    })
  } catch (error) {
    console.error('❌ Error fetching shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a shopping list
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingList = await prisma.shoppingList.findUnique({
      where: { id },
    })

    if (!existingList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    if (existingList.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateShoppingListSchema.parse(body)

    // Build update data
    const updateData: {
      name?: string
      notes?: string | null
      status?: ShoppingListStatus
      categoryOrder?: string[]
      finalizedAt?: Date | null
      archivedAt?: Date | null
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.categoryOrder !== undefined) updateData.categoryOrder = data.categoryOrder

    // Handle status changes with timestamps
    if (data.status !== undefined && data.status !== existingList.status) {
      updateData.status = data.status

      if (data.status === 'Finalized') {
        updateData.finalizedAt = new Date()
      } else if (data.status === 'Archived') {
        updateData.archivedAt = new Date()
      } else if (data.status === 'Draft') {
        // Reverting to draft - clear timestamps
        updateData.finalizedAt = null
        updateData.archivedAt = null
      }
    }

    const shoppingList = await prisma.shoppingList.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          orderBy: [
            { category: 'asc' },
            { displayOrder: 'asc' },
          ],
        },
        mealPlans: {
          include: {
            mealPlan: {
              select: {
                id: true,
                weekStartDate: true,
                weekEndDate: true,
                status: true,
              },
            },
          },
        },
      },
    })

    console.log(`🟢 Updated shopping list: ${shoppingList.name} (${shoppingList.id})`)

    return NextResponse.json({ shoppingList })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a shopping list
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existingList = await prisma.shoppingList.findUnique({
      where: { id },
    })

    if (!existingList) {
      return NextResponse.json({ error: 'Shopping list not found' }, { status: 404 })
    }

    if (existingList.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.shoppingList.delete({
      where: { id },
    })

    console.log(`🟢 Deleted shopping list: ${existingList.name} (${existingList.id})`)

    return NextResponse.json({ message: 'Shopping list deleted successfully' })
  } catch (error) {
    console.error('❌ Error deleting shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
