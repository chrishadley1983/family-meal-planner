import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await req.json()

    // Verify ownership through meal plan
    const existingMeal = await prisma.meal.findFirst({
      where: {
        id,
        mealPlan: {
          userId: session.user.id
        }
      }
    })

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }

    // If servings is being manually updated, mark it as manually set
    // This prevents auto-recalculation from overwriting user's custom value
    if ('servings' in updates && updates.servings !== existingMeal.servings) {
      updates.servingsManuallySet = true
      console.log(`🔧 Servings manually updated for meal ${id}, setting flag`)
    }

    // Update the meal
    const meal = await prisma.meal.update({
      where: { id },
      data: updates,
      include: {
        recipe: true
      }
    })

    console.log(`✅ Meal ${id} updated`)

    return NextResponse.json({ meal })
  } catch (error: any) {
    console.error('Error updating meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update meal' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existingMeal = await prisma.meal.findFirst({
      where: {
        id,
        mealPlan: {
          userId: session.user.id
        }
      }
    })

    if (!existingMeal) {
      return NextResponse.json(
        { error: 'Meal not found' },
        { status: 404 }
      )
    }

    await prisma.meal.delete({
      where: { id }
    })

    console.log(`✅ Meal ${id} deleted`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting meal:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete meal' },
      { status: 500 }
    )
  }
}
