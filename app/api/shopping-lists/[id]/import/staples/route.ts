import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { convertToMetric } from '@/lib/unit-conversion'
import type { Staple } from '@/lib/types/staples'

const importStaplesSchema = z.object({
  stapleIds: z.array(z.string()).min(1, 'At least one staple must be selected'),
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
    return { error: 'Can only import to draft shopping lists', status: 400 }
  }

  return { success: true }
}

// POST - Import staples to shopping list
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
    const data = importStaplesSchema.parse(body)

    console.log(`🔷 Importing ${data.stapleIds.length} staples to shopping list ${shoppingListId}`)

    // Fetch the selected staples
    const staples = await prisma.staple.findMany({
      where: {
        id: { in: data.stapleIds },
        userId: session.user.id, // Ensure user owns these staples
      },
    })

    if (staples.length === 0) {
      return NextResponse.json(
        { error: 'No valid staples found to import' },
        { status: 400 }
      )
    }

    if (staples.length !== data.stapleIds.length) {
      console.warn(`⚠️ Some staples not found or not owned by user. Requested: ${data.stapleIds.length}, Found: ${staples.length}`)
    }

    // Get current max display order
    const maxOrder = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    let currentOrder = (maxOrder?.displayOrder ?? -1) + 1

    // Convert staples to shopping list items
    const itemsToCreate = staples.map((staple: Staple) => {
      // Convert to metric
      const converted = convertToMetric(staple.quantity, staple.unit)

      return {
        shoppingListId,
        itemName: staple.itemName,
        quantity: converted.quantity,
        unit: converted.unit,
        category: staple.category || null,
        source: 'staple' as const,
        sourceDetails: [{
          type: 'staple' as const,
          id: staple.id,
          name: staple.itemName,
          quantity: staple.quantity,
          unit: staple.unit,
        }],
        customNote: staple.notes || null,
        priority: 'Medium' as const,
        displayOrder: currentOrder++,
      }
    })

    // Create the items
    const result = await prisma.shoppingListItem.createMany({
      data: itemsToCreate,
    })

    // Fetch the created items to return
    const createdItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        source: 'staple',
      },
      orderBy: { createdAt: 'desc' },
      take: staples.length,
    })

    console.log(`🟢 Imported ${result.count} staples to shopping list`)

    return NextResponse.json({
      message: `Successfully imported ${result.count} staple${result.count !== 1 ? 's' : ''}`,
      importedCount: result.count,
      items: createdItems,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error importing staples:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get all staples available for import (for the selection modal)
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

    // Get all user staples
    const staples = await prisma.staple.findMany({
      where: { userId: session.user.id },
      orderBy: [
        { category: 'asc' },
        { itemName: 'asc' },
      ],
    })

    // Get staples already in the shopping list
    const existingStapleItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        source: 'staple',
      },
      select: {
        sourceDetails: true,
      },
    })

    // Extract staple IDs that are already imported
    const importedStapleIds = new Set<string>()
    for (const item of existingStapleItems) {
      const details = item.sourceDetails as Array<{ type: string; id?: string }>
      for (const detail of details) {
        if (detail.type === 'staple' && detail.id) {
          importedStapleIds.add(detail.id)
        }
      }
    }

    // Mark which staples are already imported
    const staplesWithStatus = staples.map((staple: Staple) => ({
      ...staple,
      alreadyImported: importedStapleIds.has(staple.id),
    }))

    return NextResponse.json({
      staples: staplesWithStatus,
      totalCount: staples.length,
      alreadyImportedCount: importedStapleIds.size,
    })
  } catch (error) {
    console.error('❌ Error fetching staples for import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
