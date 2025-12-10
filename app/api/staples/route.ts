import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Frequency enum values
const VALID_FREQUENCIES = ['weekly', 'every_2_weeks', 'every_4_weeks', 'every_3_months'] as const

const stapleSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional().nullable(),
  frequency: z.enum(VALID_FREQUENCIES).default('weekly'),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

// GET - List all staples for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staples = await prisma.staple.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: [
        { category: 'asc' },
        { itemName: 'asc' }
      ]
    })

    return NextResponse.json({ staples })
  } catch (error) {
    console.error('Error fetching staples:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create a new staple
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const data = stapleSchema.parse(body)

    const staple = await prisma.staple.create({
      data: {
        ...data,
        userId: session.user.id,
      }
    })

    return NextResponse.json({ staple }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating staple:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Update schema (partial - all fields optional)
const updateStapleSchema = z.object({
  itemName: z.string().min(1, 'Item name is required').optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  frequency: z.enum(VALID_FREQUENCIES).optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional().nullable(),
})

// PATCH - Update a staple
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Staple ID required' }, { status: 400 })
    }

    const existingStaple = await prisma.staple.findUnique({
      where: { id }
    })

    if (!existingStaple) {
      return NextResponse.json({ error: 'Staple not found' }, { status: 404 })
    }

    if (existingStaple.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const data = updateStapleSchema.parse(body)

    // Note: lastAddedDate is NOT updated on edit - it's only set when imported to shopping list
    const staple = await prisma.staple.update({
      where: { id },
      data,
    })

    console.log(`🟢 Updated staple: ${staple.itemName}`)
    return NextResponse.json({ staple })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error updating staple:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a staple
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Staple ID required' }, { status: 400 })
    }

    const existingStaple = await prisma.staple.findUnique({
      where: { id }
    })

    if (!existingStaple) {
      return NextResponse.json({ error: 'Staple not found' }, { status: 404 })
    }

    if (existingStaple.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.staple.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Staple deleted successfully' })
  } catch (error) {
    console.error('Error deleting staple:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
