import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { findDuplicates, combineQuantities, DuplicateGroup } from '@/lib/unit-conversion'
import { SourceDetail } from '@/lib/types/shopping-list'

const deduplicateSchema = z.object({
  itemIds: z.array(z.string()).min(2, 'At least 2 items required to deduplicate'),
})

// Helper to verify shopping list ownership
async function verifyListOwnership(listId: string, userId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { userId: true, status: true },
  })

  if (!list) {
    return { error: 'Shopping list not found', status: 404 }
  }

  if (list.userId !== userId) {
    return { error: 'Forbidden', status: 403 }
  }

  if (list.status !== 'Draft') {
    return { error: 'Can only deduplicate items in draft shopping lists', status: 400 }
  }

  return { success: true }
}

// GET - Find potential duplicate items for manual combination
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

    // Get all non-purchased items
    const items = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        isPurchased: false,
      },
      orderBy: { itemName: 'asc' },
    })

    // Find duplicates using the utility function
    const duplicateGroups = findDuplicates(
      items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        source: item.source || undefined,
      }))
    )

    console.log(`🔷 Found ${duplicateGroups.length} potential duplicate groups`)

    return NextResponse.json({
      duplicateGroups,
      totalDuplicateItems: duplicateGroups.reduce((sum, g) => sum + g.items.length, 0),
      hasDuplicates: duplicateGroups.length > 0,
    })
  } catch (error) {
    console.error('❌ Error finding duplicates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Manually combine specific items into one
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
    const data = deduplicateSchema.parse(body)

    console.log(`🔷 Deduplicating ${data.itemIds.length} items`)

    // Fetch the items to combine
    const items = await prisma.shoppingListItem.findMany({
      where: {
        id: { in: data.itemIds },
        shoppingListId,
      },
    })

    if (items.length !== data.itemIds.length) {
      return NextResponse.json(
        { error: 'Some items not found or do not belong to this list' },
        { status: 400 }
      )
    }

    if (items.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 items required to deduplicate' },
        { status: 400 }
      )
    }

    // Try to combine quantities
    let combinedQuantity = items[0].quantity
    let combinedUnit = items[0].unit
    let allCompatible = true

    for (let i = 1; i < items.length; i++) {
      const result = combineQuantities(
        combinedQuantity,
        combinedUnit,
        items[i].quantity,
        items[i].unit
      )

      if (result) {
        combinedQuantity = result.quantity
        combinedUnit = result.unit
      } else {
        allCompatible = false
        break
      }
    }

    if (!allCompatible) {
      return NextResponse.json(
        { error: 'Items have incompatible units and cannot be combined automatically' },
        { status: 400 }
      )
    }

    // Combine all source details
    const combinedSourceDetails: SourceDetail[] = []
    for (const item of items) {
      const details = item.sourceDetails as unknown as SourceDetail[]
      if (Array.isArray(details)) {
        combinedSourceDetails.push(...details)
      } else {
        // Create a source detail from the item itself
        combinedSourceDetails.push({
          type: (item.source as 'recipe' | 'staple' | 'manual') || 'manual',
          name: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    }

    // Use the first item's name (or the longest one for better description)
    const primaryItem = items.reduce((longest, current) =>
      current.itemName.length > longest.itemName.length ? current : longest
    )

    // Use the first item's category, or the first non-null category
    const category = items.find((i) => i.category)?.category || null

    // Keep the first item, update it with combined values
    const [keepItem, ...deleteItems] = items.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Update the kept item
    const updatedItem = await prisma.shoppingListItem.update({
      where: { id: keepItem.id },
      data: {
        itemName: primaryItem.itemName,
        quantity: Math.round(combinedQuantity * 100) / 100,
        unit: combinedUnit,
        category,
        source: 'recipe', // Combined items are marked as recipe source
        sourceDetails: combinedSourceDetails as unknown as object[],
        isConsolidated: true,
        customNote: items
          .filter((i) => i.customNote)
          .map((i) => i.customNote)
          .join('; ') || null,
      },
    })

    // Delete the other items
    await prisma.shoppingListItem.deleteMany({
      where: {
        id: { in: deleteItems.map((i) => i.id) },
      },
    })

    console.log(`🟢 Combined ${items.length} items into one: ${updatedItem.itemName}`)

    return NextResponse.json({
      message: `Successfully combined ${items.length} items`,
      combinedItem: updatedItem,
      deletedCount: deleteItems.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error deduplicating items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
