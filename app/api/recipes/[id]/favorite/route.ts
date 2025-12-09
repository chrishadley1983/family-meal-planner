import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { isFavorite } = await req.json()

    // Verify recipe belongs to user
    const recipe = await prisma.recipe.findFirst({
      where: {
        id,
        userId: session.user.id
      }
    })

    if (!recipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    // Update favorite status
    // Note: isFavorite field doesn't exist in schema yet
    // TODO: Add isFavorite field to Recipe model and uncomment below
    // const updatedRecipe = await prisma.recipe.update({
    //   where: { id },
    //   data: { isFavorite }
    // })

    return NextResponse.json({
      recipe,
      message: 'Favorite feature not yet implemented'
    })
  } catch (error) {
    console.error('Error updating recipe favorite status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
