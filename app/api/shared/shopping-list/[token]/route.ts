import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Fetch shared shopping list (public, no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the share link and verify it's not expired
    const shareLink = await prisma.shoppingListShareLink.findUnique({
      where: { shareToken: token },
      include: {
        shoppingList: {
          include: {
            items: {
              where: { isPurchased: false },
              orderBy: [
                { category: 'asc' },
                { displayOrder: 'asc' },
              ],
            },
          },
        },
      },
    })

    if (!shareLink) {
      return NextResponse.json(
        { error: 'Share link not found' },
        { status: 404 }
      )
    }

    // Check if expired
    if (new Date() > shareLink.expiresAt) {
      return NextResponse.json(
        { error: 'This share link has expired' },
        { status: 410 } // Gone
      )
    }

    const shoppingList = shareLink.shoppingList

    // Group items by category
    const itemsByCategory: Record<string, typeof shoppingList.items> = {}
    for (const item of shoppingList.items) {
      const category = item.category || 'Other'
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = []
      }
      itemsByCategory[category].push(item)
    }

    // Sort items within each category alphabetically
    for (const category of Object.keys(itemsByCategory)) {
      itemsByCategory[category].sort((a, b) => a.itemName.localeCompare(b.itemName))
    }

    return NextResponse.json({
      shoppingList: {
        id: shoppingList.id,
        name: shoppingList.name,
        status: shoppingList.status,
        itemCount: shoppingList.items.length,
        createdAt: shoppingList.createdAt.toISOString(),
      },
      itemsByCategory,
      expiresAt: shareLink.expiresAt.toISOString(),
    })
  } catch (error) {
    console.error('❌ Error fetching shared shopping list:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
