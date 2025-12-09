import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { startOfWeek, addDays } from 'date-fns'

const mealSchema = z.object({
  dayOfWeek: z.string(),
  mealType: z.string(),
  recipeId: z.string().optional().nullable(),
  recipeName: z.string().optional().nullable(),
  servings: z.number().int().positive().optional().nullable(),
  notes: z.string().optional().nullable(),
})

const mealPlanSchema = z.object({
  weekStartDate: z.string(),
  meals: z.array(mealSchema).default([]),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const weekStart = searchParams.get('weekStart')

    const where: any = {
      userId: session.user.id
    }

    if (weekStart) {
      const startDate = new Date(weekStart)
      const endDate = endOfWeek(startDate)
      where.weekStartDate = {
        gte: startDate,
        lte: endDate
      }
    }

    const mealPlans = await prisma.mealPlan.findMany({
      where,
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      },
      orderBy: {
        weekStartDate: 'desc'
      }
    })

    return NextResponse.json({ mealPlans })
  } catch (error) {
    console.error('Error fetching meal plans:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = mealPlanSchema.parse(body)

    const weekStartDate = new Date(data.weekStartDate)
    const weekEndDate = addDays(weekStartDate, 6) // 7-day week: start day + 6 days

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate,
        weekEndDate,
        status: 'Draft',
        meals: {
          create: data.meals.map(meal => ({
            dayOfWeek: meal.dayOfWeek,
            mealType: meal.mealType,
            recipeId: meal.recipeId || null,
            recipeName: meal.recipeName || null,
            servings: meal.servings || null,
            notes: meal.notes || null,
          }))
        }
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    return NextResponse.json({ mealPlan }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating meal plan:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
