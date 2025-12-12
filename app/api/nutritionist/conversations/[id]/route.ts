import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/nutritionist/conversations/[id]
 * Get a single conversation with all messages
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    console.log('🔷 Fetching conversation', { conversationId: id })

    const conversation = await prisma.nutritionistConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        profile: {
          select: {
            id: true,
            profileName: true,
            avatarUrl: true,
            age: true,
            gender: true,
            heightCm: true,
            currentWeightKg: true,
            targetWeightKg: true,
            goalType: true,
            goalTimeframeWeeks: true,
            activityLevel: true,
            dailyCalorieTarget: true,
            dailyProteinTarget: true,
            dailyCarbsTarget: true,
            dailyFatTarget: true,
            dailyFiberTarget: true,
            macroTrackingEnabled: true,
            allergies: true,
            foodLikes: true,
            foodDislikes: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    console.log('🟢 Found conversation with', conversation.messages.length, 'messages')

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('❌ Error fetching conversation:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/nutritionist/conversations/[id]
 * Delete a conversation and all its messages
 */
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    console.log('🔷 Deleting conversation', { conversationId: id })

    // Verify ownership before deleting
    const conversation = await prisma.nutritionistConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Delete the conversation (messages will be cascade deleted)
    await prisma.nutritionistConversation.delete({
      where: { id },
    })

    console.log('🟢 Deleted conversation:', id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('❌ Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/nutritionist/conversations/[id]
 * Update conversation title
 */
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title } = body

    console.log('🔷 Updating conversation title', { conversationId: id, title })

    // Verify ownership before updating
    const conversation = await prisma.nutritionistConversation.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const updatedConversation = await prisma.nutritionistConversation.update({
      where: { id },
      data: { title },
    })

    console.log('🟢 Updated conversation title:', id)

    return NextResponse.json({ conversation: updatedConversation })
  } catch (error) {
    console.error('❌ Error updating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}
