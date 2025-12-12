import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { validateAction, NutritionistAction } from '@/lib/nutritionist'
import { executeAction } from '@/lib/nutritionist/actions'

/**
 * POST /api/nutritionist/apply-action
 * Apply a suggested action from the nutritionist (with user confirmation)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, action, messageId } = body

    if (!action || !action.type) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Applying nutritionist action', {
      actionType: action.type,
      conversationId,
      messageId,
    })

    // Validate the action
    const validation = validateAction(action as NutritionistAction)
    if (!validation.valid) {
      console.log('⚠️ Action validation failed:', validation.errors)
      return NextResponse.json(
        { error: 'Invalid action', details: validation.errors },
        { status: 400 }
      )
    }

    // If conversationId provided, verify ownership
    if (conversationId) {
      const conversation = await prisma.nutritionistConversation.findFirst({
        where: {
          id: conversationId,
          userId: session.user.id,
        },
      })

      if (!conversation) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404 }
        )
      }
    }

    // Execute the action
    const result = await executeAction(action as NutritionistAction, session.user.id)

    console.log('🟢 Action result:', { success: result.success, message: result.message })

    // If we have a messageId, update the message metadata to record the applied action
    if (messageId && result.success) {
      const message = await prisma.nutritionistMessage.findUnique({
        where: { id: messageId },
      })

      if (message) {
        const existingMetadata = (message.metadata || {}) as Record<string, any>
        const appliedActions = (existingMetadata.appliedActions || []) as any[]

        const newMetadata = {
          ...existingMetadata,
          appliedActions: [
            ...appliedActions,
            {
              actionType: action.type,
              timestamp: new Date().toISOString(),
              success: result.success,
            },
          ],
        }

        await prisma.nutritionistMessage.update({
          where: { id: messageId },
          data: {
            metadata: newMetadata,
          },
        })
      }
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.message, details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.data,
    })
  } catch (error) {
    console.error('❌ Error applying action:', error)
    return NextResponse.json(
      { error: 'Failed to apply action' },
      { status: 500 }
    )
  }
}
