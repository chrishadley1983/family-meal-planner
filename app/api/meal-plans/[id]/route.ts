import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    // Delete the meal plan (cascades to meals)
    await prisma.mealPlan.delete({
      where: { id: params.id }
    })

    console.log(`✅ Meal plan ${params.id} deleted`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete meal plan' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const mealPlan = await prisma.mealPlan.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: true
              }
            }
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      }
    })

    if (!mealPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ mealPlan })
  } catch (error: any) {
    console.error('Error fetching meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch meal plan' },
      { status: 500 }
    )
  }
}
