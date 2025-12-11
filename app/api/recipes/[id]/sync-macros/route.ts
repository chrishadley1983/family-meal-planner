import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const syncMacrosSchema = z.object({
  caloriesPerServing: z.number().int().positive().nullable(),
  proteinPerServing: z.number().positive().nullable(),
  carbsPerServing: z.number().positive().nullable(),
  fatPerServing: z.number().positive().nullable(),
  fiberPerServing: z.number().positive().nullable().optional(),
  sugarPerServing: z.number().positive().nullable().optional(),
  sodiumPerServing: z.number().int().positive().nullable().optional(),
})

// PATCH - Sync macro values from AI analysis to database
export async function PATCH(
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
    const data = syncMacrosSchema.parse(body)

    // Check if recipe exists and belongs to user
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        recipeName: true,
        caloriesPerServing: true,
      }
    })

    if (!existingRecipe) {
      return NextResponse.json({ error: 'Recipe not found' }, { status: 404 })
    }

    if (existingRecipe.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only update if values have actually changed
    const hasChanges =
      existingRecipe.caloriesPerServing !== data.caloriesPerServing

    if (!hasChanges) {
      console.log('🔄 Macros already in sync for:', existingRecipe.recipeName)
      return NextResponse.json({
        message: 'Macros already in sync',
        synced: false
      })
    }

    // Update only the macro fields
    await prisma.recipe.update({
      where: { id },
      data: {
        caloriesPerServing: data.caloriesPerServing,
        proteinPerServing: data.proteinPerServing,
        carbsPerServing: data.carbsPerServing,
        fatPerServing: data.fatPerServing,
        fiberPerServing: data.fiberPerServing,
        sugarPerServing: data.sugarPerServing,
        sodiumPerServing: data.sodiumPerServing,
      }
    })

    console.log('✅ Macros synced for:', existingRecipe.recipeName, {
      oldCalories: existingRecipe.caloriesPerServing,
      newCalories: data.caloriesPerServing,
    })

    return NextResponse.json({
      message: 'Macros synced successfully',
      synced: true
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error syncing macros:', error)
    return NextResponse.json(
      { error: 'Failed to sync macros' },
      { status: 500 }
    )
  }
}
