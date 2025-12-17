import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const VALID_SLOTS = ['Morning Snack', 'Afternoon Snack', 'Evening Snack']

const assignProductSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  dayOfWeek: z.string().refine(day => VALID_DAYS.includes(day), 'Invalid day of week'),
  mealSlot: z.string().refine(slot => VALID_SLOTS.includes(slot), 'Invalid meal slot'),
  quantity: z.number().positive().default(1),
})

const removeProductSchema = z.object({
  dayOfWeek: z.string().refine(day => VALID_DAYS.includes(day), 'Invalid day of week'),
  mealSlot: z.string().refine(slot => VALID_SLOTS.includes(slot), 'Invalid meal slot'),
})

/**
 * GET /api/meal-plans/[id]/products
 *
 * Get all products assigned to a meal plan's snack slots
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify meal plan belongs to user
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get all product assignments for this meal plan
    const mealPlanProducts = await prisma.mealPlanProduct.findMany({
      where: { mealPlanId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            imageUrl: true,
            caloriesPerServing: true,
            proteinPerServing: true,
            carbsPerServing: true,
            fatPerServing: true,
            isSnack: true,
            familyRating: true,
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { mealSlot: 'asc' }
      ]
    })

    console.log('🔷 Fetched meal plan products:', mealPlanProducts.length)

    return NextResponse.json({ mealPlanProducts })
  } catch (error) {
    console.error('❌ Error fetching meal plan products:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meal plan products' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/meal-plans/[id]/products
 *
 * Assign a product to a meal plan snack slot
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await req.json()
    const data = assignProductSchema.parse(body)

    // Verify meal plan belongs to user
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify product exists and belongs to user
    const product = await prisma.product.findUnique({
      where: { id: data.productId },
      select: { userId: true, isSnack: true, name: true }
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    if (product.userId !== session.user.id) {
      return NextResponse.json({ error: 'Product access denied' }, { status: 403 })
    }

    // Warn if product is not marked as a snack (but still allow assignment)
    if (!product.isSnack) {
      console.log(`⚠️ Product "${product.name}" is not marked as a snack but being assigned to snack slot`)
    }

    console.log('🔷 Assigning product to meal plan:', {
      mealPlanId: id,
      productId: data.productId,
      dayOfWeek: data.dayOfWeek,
      mealSlot: data.mealSlot,
    })

    // Upsert the assignment (replace if slot already has a product)
    const mealPlanProduct = await prisma.mealPlanProduct.upsert({
      where: {
        mealPlanId_dayOfWeek_mealSlot: {
          mealPlanId: id,
          dayOfWeek: data.dayOfWeek,
          mealSlot: data.mealSlot,
        }
      },
      create: {
        mealPlanId: id,
        productId: data.productId,
        dayOfWeek: data.dayOfWeek,
        mealSlot: data.mealSlot,
        quantity: data.quantity,
      },
      update: {
        productId: data.productId,
        quantity: data.quantity,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            brand: true,
            category: true,
            imageUrl: true,
            caloriesPerServing: true,
            proteinPerServing: true,
            carbsPerServing: true,
            fatPerServing: true,
            isSnack: true,
          }
        }
      }
    })

    // Increment product's timesUsed counter
    await prisma.product.update({
      where: { id: data.productId },
      data: { timesUsed: { increment: 1 } }
    })

    console.log('🟢 Product assigned to meal plan:', mealPlanProduct.id)

    return NextResponse.json({ mealPlanProduct }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error assigning product to meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to assign product to meal plan' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/meal-plans/[id]/products
 *
 * Remove a product from a meal plan snack slot
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(req.url)

    const dayOfWeek = searchParams.get('dayOfWeek')
    const mealSlot = searchParams.get('mealSlot')

    if (!dayOfWeek || !mealSlot) {
      return NextResponse.json(
        { error: 'dayOfWeek and mealSlot are required' },
        { status: 400 }
      )
    }

    if (!VALID_DAYS.includes(dayOfWeek)) {
      return NextResponse.json({ error: 'Invalid day of week' }, { status: 400 })
    }

    if (!VALID_SLOTS.includes(mealSlot)) {
      return NextResponse.json({ error: 'Invalid meal slot' }, { status: 400 })
    }

    // Verify meal plan belongs to user
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id },
      select: { userId: true }
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    console.log('🔷 Removing product from meal plan:', {
      mealPlanId: id,
      dayOfWeek,
      mealSlot,
    })

    // Delete the assignment
    const deleted = await prisma.mealPlanProduct.deleteMany({
      where: {
        mealPlanId: id,
        dayOfWeek,
        mealSlot,
      }
    })

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: 'No product found in that slot' },
        { status: 404 }
      )
    }

    console.log('🟢 Product removed from meal plan slot')

    return NextResponse.json({ message: 'Product removed from meal plan' })
  } catch (error) {
    console.error('❌ Error removing product from meal plan:', error)
    return NextResponse.json(
      { error: 'Failed to remove product from meal plan' },
      { status: 500 }
    )
  }
}
