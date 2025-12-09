import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const profileUpdateSchema = z.object({
  profileName: z.string().min(1).optional(),
  age: z.number().int().positive().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  foodLikes: z.array(z.string()).optional(),
  foodDislikes: z.array(z.string()).optional(),
  allergies: z.any().optional(),
  mealAvailability: z.any().optional(),
  activityLevel: z.string().optional().nullable(),
  dailyCalorieTarget: z.number().int().positive().optional().nullable(),
  dailyProteinTarget: z.number().positive().optional().nullable(),
  dailyCarbsTarget: z.number().positive().optional().nullable(),
  dailyFatTarget: z.number().positive().optional().nullable(),
  dailyFiberTarget: z.number().positive().optional().nullable(),
  macroTrackingEnabled: z.boolean().optional(),
  isMainUser: z.boolean().optional(),
})

// GET - Get a specific profile
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

    const profile = await prisma.familyProfile.findUnique({
      where: { id },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ profile })
  } catch (error) {
    console.error('Error fetching profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update a profile
export async function PUT(
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
    const data = profileUpdateSchema.parse(body)

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.familyProfile.findUnique({
      where: { id },
    })

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (existingProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // If updating profile name, check for duplicates
    if (data.profileName && data.profileName !== existingProfile.profileName) {
      const duplicateProfile = await prisma.familyProfile.findUnique({
        where: {
          userId_profileName: {
            userId: session.user.id,
            profileName: data.profileName
          }
        }
      })

      if (duplicateProfile) {
        return NextResponse.json(
          { error: 'A profile with this name already exists' },
          { status: 400 }
        )
      }
    }

    const profile = await prisma.familyProfile.update({
      where: { id },
      data,
    })

    return NextResponse.json({ profile })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a profile
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

    // Check if profile exists and belongs to user
    const existingProfile = await prisma.familyProfile.findUnique({
      where: { id },
    })

    if (!existingProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (existingProfile.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.familyProfile.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Profile deleted successfully' })
  } catch (error) {
    console.error('Error deleting profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
