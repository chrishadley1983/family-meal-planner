import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const stapleSchema = z.object({
  itemName: z.string().min(1, 'Item name is required'),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  category: z.string().optional().nullable(),
  autoAddToList: z.boolean().default(true),
  notes: z.string().optional().nullable(),
})

// GET - List all staples for the authenticated user
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const staples = await prisma.weeklyStaple.findMany({
      where: {
        userId: session.user.id
      },
      orderBy: {
        category: 'asc'
      }
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

    const staple = await prisma.weeklyStaple.create({
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

    const existingStaple = await prisma.weeklyStaple.findUnique({
      where: { id }
    })

    if (!existingStaple) {
      return NextResponse.json({ error: 'Staple not found' }, { status: 404 })
    }

    if (existingStaple.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.weeklyStaple.delete({
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
