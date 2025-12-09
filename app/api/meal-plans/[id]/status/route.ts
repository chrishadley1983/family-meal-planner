import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
<<<<<<< HEAD
import { calculateMealServings } from '@/lib/meal-utils'
=======
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

<<<<<<< HEAD
    const { status, customSchedule } = await req.json()

    if (status && !['Draft', 'Finalized', 'Archived'].includes(status)) {
=======
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
<<<<<<< HEAD
      },
      include: {
        meals: true
=======
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

<<<<<<< HEAD
    // Build update data
    const updateData: any = {}

    // Update status if provided
    if (status) {
      updateData.status = status
      if (status === 'Finalized' && existingPlan.status !== 'Finalized') {
        updateData.finalizedAt = new Date()
      } else if (status === 'Draft') {
        updateData.finalizedAt = null
      }
    }

    // Update customSchedule if provided
    if (customSchedule) {
      updateData.customSchedule = customSchedule

      // Recalculate servings for all meals based on new schedule
      console.log('🧮 Recalculating servings after schedule change...')

      const servingsUpdates = existingPlan.meals
        .map((meal) => {
          const newServings = calculateMealServings(
            meal.dayOfWeek,
            meal.mealType,
            customSchedule
          )

          return prisma.meal.update({
            where: { id: meal.id },
            data: { servings: newServings }
          })
        })

      // Execute all servings updates
      await Promise.all(servingsUpdates)

      console.log(`✅ Recalculated servings for ${servingsUpdates.length} meals`)
    }

    // Update meal plan
=======
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

<<<<<<< HEAD
    if (status) {
      console.log(`✅ Meal plan ${params.id} status changed to ${status}`)
    }
    if (customSchedule) {
      console.log(`✅ Meal plan ${params.id} schedule updated`)
    }
=======
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
