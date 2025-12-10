import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'
import { addDays, parseISO, differenceInDays } from 'date-fns'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sourcePlanId, weekStartDate, weekProfileSchedules } = await req.json()

    if (!sourcePlanId || !weekStartDate) {
      return NextResponse.json(
        { error: 'Missing required fields: sourcePlanId and weekStartDate' },
        { status: 400 }
      )
    }

    // Verify ownership of source plan
    const sourcePlan = await prisma.mealPlan.findFirst({
      where: {
        id: sourcePlanId,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    if (!sourcePlan) {
      return NextResponse.json(
        { error: 'Source meal plan not found' },
        { status: 404 }
      )
    }

    console.log(`🍴 Copying meal plan from week ${sourcePlan.weekStartDate.toISOString()} to ${weekStartDate}`)

    // Calculate date offset
    const sourceStartDate = new Date(sourcePlan.weekStartDate)
    const newStartDate = parseISO(weekStartDate)
    const daysDifference = differenceInDays(newStartDate, sourceStartDate)

    console.log(`📅 Date offset: ${daysDifference} days`)

    // Calculate new week end date
    const newEndDate = addDays(newStartDate, 6)

    // Create new meal plan
    const newMealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate: newStartDate,
        weekEndDate: newEndDate,
        status: 'Draft',
        customSchedule: weekProfileSchedules || sourcePlan.customSchedule
      }
    })

    console.log(`✅ Created new meal plan ${newMealPlan.id}`)

    // Copy meals from source plan
    if (sourcePlan.meals.length > 0) {
      const newMeals = sourcePlan.meals.map((sourceMeal) => ({
        mealPlanId: newMealPlan.id,
        dayOfWeek: sourceMeal.dayOfWeek,
        mealType: sourceMeal.mealType,
        recipeId: sourceMeal.recipeId,
        recipeName: sourceMeal.recipeName,
        servings: sourceMeal.servings,
        notes: sourceMeal.notes,
        isLocked: false // Don't copy the locked status
      }))

      await prisma.meal.createMany({
        data: newMeals
      })

      console.log(`✅ Copied ${newMeals.length} meals to new plan`)
    }

    // Fetch the complete meal plan with meals
    const completeMealPlan = await prisma.mealPlan.findUnique({
      where: { id: newMealPlan.id },
      include: {
        meals: {
          include: {
            recipe: true
          },
          orderBy: [
            { dayOfWeek: 'asc' },
            { mealType: 'asc' }
          ]
        }
      }
    })

    console.log(`✅ Successfully copied meal plan`)

    return NextResponse.json({
      mealPlan: completeMealPlan,
      summary: `Copied ${sourcePlan.meals.length} meals from previous week`
    })
  } catch (error: any) {
    console.error('❌ Error copying meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to copy meal plan' },
      { status: 500 }
    )
  }
}
