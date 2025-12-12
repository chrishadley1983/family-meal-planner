import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/nutritionist/conversations
 * List all conversations for the current user, optionally filtered by profile
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    console.log('🔷 Fetching nutritionist conversations', { userId: session.user.id, profileId })

    const whereClause: any = {
      userId: session.user.id,
    }

    if (profileId) {
      whereClause.profileId = profileId
    }

    const conversations = await prisma.nutritionistConversation.findMany({
      where: whereClause,
      include: {
        profile: {
          select: {
            id: true,
            profileName: true,
            avatarUrl: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    console.log('🟢 Found conversations:', conversations.length)

    // Transform to include last message preview
    const conversationsWithPreview = conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      profileId: conv.profileId,
      profile: conv.profile,
      lastMessage: conv.messages[0]?.content?.substring(0, 100) || null,
      lastMessageAt: conv.messages[0]?.createdAt || conv.createdAt,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    }))

    return NextResponse.json({ conversations: conversationsWithPreview })
  } catch (error) {
    console.error('❌ Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/nutritionist/conversations
 * Create a new conversation for a profile
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profileId } = body

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Creating new nutritionist conversation', { userId: session.user.id, profileId })

    // Verify the profile belongs to this user
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Create the conversation
    const conversation = await prisma.nutritionistConversation.create({
      data: {
        userId: session.user.id,
        profileId: profileId,
        title: null, // Will be set based on first message
      },
      include: {
        profile: {
          select: {
            id: true,
            profileName: true,
            avatarUrl: true,
          },
        },
      },
    })

    console.log('🟢 Created conversation:', conversation.id)

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('❌ Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}
