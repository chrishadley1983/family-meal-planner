import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileSchema = z.object({
  profileName: z.string().min(1, 'Profile name is required'),
  age: z.number().int().positive().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  foodLikes: z.array(z.string()).default([]),
  foodDislikes: z.array(z.string()).default([]),
  allergies: z.any().default([]),
  mealAvailability: z.any().default({}),
  activityLevel: z.string().optional().nullable(),
  dailyCalorieTarget: z.number().int().positive().optional().nullable(),
  dailyProteinTarget: z.number().positive().optional().nullable(),
  dailyCarbsTarget: z.number().positive().optional().nullable(),
  dailyFatTarget: z.number().positive().optional().nullable(),
  dailyFiberTarget: z.number().positive().optional().nullable(),
  macroTrackingEnabled: z.boolean().default(false),
})

// GET - List all profiles for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const profiles = await prisma.familyProfile.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ profiles })
  } catch (error) {
    console.error('Error fetching profiles:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new profile
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = profileSchema.parse(body)

    // Check if profile name already exists for this user
    const existingProfile = await prisma.familyProfile.findUnique({
      where: {
        userId_profileName: {
          userId: session.user.id,
          profileName: data.profileName
        }
      }
    })

    if (existingProfile) {
      return NextResponse.json(
        { error: 'A profile with this name already exists' },
        { status: 400 }
      )
    }

    const profile = await prisma.familyProfile.create({
      data: {
        ...data,
        userId: session.user.id,
      }
    })

    return NextResponse.json({ profile }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
