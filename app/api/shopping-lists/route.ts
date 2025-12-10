import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { generateDefaultShoppingListName, isValidStatus } from '@/lib/types/shopping-list'

const createShoppingListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  notes: z.string().max(1000).optional().nullable(),
  weekStartDate: z.string().datetime().optional().nullable(),
})

// GET - List all shopping lists for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const includeItems = searchParams.get('includeItems') === 'true'

    // Build where clause
    const where: { userId: string; status?: string } = {
      userId: session.user.id,
    }

    if (status && isValidStatus(status)) {
      where.status = status
    }

    const shoppingLists = await prisma.shoppingList.findMany({
      where,
      include: {
        items: includeItems ? {
          orderBy: [
            { category: 'asc' },
            { displayOrder: 'asc' },
          ],
        } : false,
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
      orderBy: [
        { status: 'asc' }, // Draft first, then Finalized, then Archived
        { updatedAt: 'desc' },
      ],
    })

    // Add item count if items not included
    const listsWithCount = shoppingLists.map((list) => ({
      ...list,
      itemCount: includeItems ? list.items.length : undefined,
      unpurchasedCount: includeItems
        ? list.items.filter((item) => !item.isPurchased).length
        : undefined,
    }))

    console.log(`🔷 Fetched ${shoppingLists.length} shopping lists for user`)

    return NextResponse.json({ shoppingLists: listsWithCount })
  } catch (error) {
    console.error('❌ Error fetching shopping lists:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new shopping list
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = createShoppingListSchema.parse(body)

    // Parse week start date if provided
    const weekStartDate = data.weekStartDate ? new Date(data.weekStartDate) : null

    // Generate default name if not provided
    const name = data.name || generateDefaultShoppingListName(weekStartDate)

    const shoppingList = await prisma.shoppingList.create({
      data: {
        userId: session.user.id,
        name,
        notes: data.notes || null,
        weekStartDate,
        status: 'Draft',
        categoryOrder: [],
      },
      include: {
        items: true,
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

    console.log(`🟢 Created shopping list: ${shoppingList.name} (${shoppingList.id})`)

    return NextResponse.json({ shoppingList }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error creating shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
