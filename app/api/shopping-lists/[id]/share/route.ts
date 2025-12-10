import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'

// Helper to verify shopping list ownership
async function verifyListOwnership(listId: string, userId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { userId: true, name: true },
  })

  if (!list) {
    return { error: 'Shopping list not found', status: 404 }
  }

  if (list.userId !== userId) {
    return { error: 'Forbidden', status: 403 }
  }

  return { success: true, name: list.name }
}

// Generate a URL-safe random token
function generateShareToken(): string {
  return randomBytes(32).toString('base64url')
}

// GET - Get existing share link or create new one
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

    // Look for an existing non-expired share link
    const existingLink = await prisma.shoppingListShareLink.findFirst({
      where: {
        shoppingListId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existingLink) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
      return NextResponse.json({
        shareToken: existingLink.shareToken,
        shareUrl: `${baseUrl}/shared/shopping-list/${existingLink.shareToken}`,
        expiresAt: existingLink.expiresAt.toISOString(),
        createdAt: existingLink.createdAt.toISOString(),
        isExisting: true,
      })
    }

    return NextResponse.json({
      shareLink: null,
      message: 'No active share link exists. Use POST to create one.',
    })
  } catch (error) {
    console.error('❌ Error getting share link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new share link (48 hour expiry)
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

    // Generate new share link with 48-hour expiry
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 48)

    const shareToken = generateShareToken()

    const shareLink = await prisma.shoppingListShareLink.create({
      data: {
        shoppingListId,
        shareToken,
        expiresAt,
      },
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

    console.log(`🔗 Created share link for shopping list ${shoppingListId}, expires ${expiresAt.toISOString()}`)

    return NextResponse.json({
      shareToken: shareLink.shareToken,
      shareUrl: `${baseUrl}/shared/shopping-list/${shareLink.shareToken}`,
      expiresAt: shareLink.expiresAt.toISOString(),
      createdAt: shareLink.createdAt.toISOString(),
      isNew: true,
    })
  } catch (error) {
    console.error('❌ Error creating share link:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Revoke all share links for this list
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

    const result = await prisma.shoppingListShareLink.deleteMany({
      where: { shoppingListId },
    })

    console.log(`🗑️ Deleted ${result.count} share links for shopping list ${shoppingListId}`)

    return NextResponse.json({
      message: `Deleted ${result.count} share link(s)`,
      deletedCount: result.count,
    })
  } catch (error) {
    console.error('❌ Error deleting share links:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
