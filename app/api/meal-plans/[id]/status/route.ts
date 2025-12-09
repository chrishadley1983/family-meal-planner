import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateMealServings } from '@/lib/meal-utils'
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await req.json()

    if (!['Draft', 'Finalized', 'Archived'].includes(status)) {
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
      return NextResponse.json(
        { error: 'Invalid status. Must be Draft, Finalized, or Archived' },
        { status: 400 }
      )
    }

    // Verify ownership
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Update status and finalizedAt if finalizing
    const updateData: any = { status }

    if (status === 'Finalized' && existingPlan.status !== 'Finalized') {
      updateData.finalizedAt = new Date()
    } else if (status === 'Draft') {
      updateData.finalizedAt = null
    }

>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
    const mealPlan = await prisma.mealPlan.update({
      where: { id: params.id },
      data: updateData,
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    console.log(`✅ Meal plan ${params.id} status changed to ${status}`)
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)

    return NextResponse.json({ mealPlan })
  } catch (error: any) {
    console.error('Error updating meal plan status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meal plan status' },
      { status: 500 }
    )
  }
}
