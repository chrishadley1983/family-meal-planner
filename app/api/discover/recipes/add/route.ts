/**
 * POST /api/discover/recipes/add
 *
 * Add a master recipe to user's personal collection
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { addMasterRecipeToUserLibrary } from '@/lib/scraping'

const addSchema = z.object({
  masterRecipeId: z.string().min(1, 'Recipe ID is required')
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = addSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { masterRecipeId } = parsed.data

    console.log(`🔷 Adding master recipe to user library: ${masterRecipeId}`)

    const result = await addMasterRecipeToUserLibrary(masterRecipeId, session.user.id)

    if (result.skipped) {
      console.log(`⚠️ Recipe already in library: ${result.recipeId}`)
      return NextResponse.json(
        {
          error: 'Recipe already in your library',
          existingRecipeId: result.recipeId
        },
        { status: 409 }
      )
    }

    if (!result.success) {
      console.error(`❌ Failed to add recipe: ${result.error}`)
      return NextResponse.json(
        { error: result.error || 'Failed to add recipe' },
        { status: 500 }
      )
    }

    console.log(`🟢 Recipe added to library: ${result.recipeId}`)

    return NextResponse.json({
      success: true,
      recipeId: result.recipeId,
      message: 'Recipe added to your library!'
    })

  } catch (error) {
    console.error('❌ Add recipe error:', error)
    return NextResponse.json(
      { error: 'Failed to add recipe' },
      { status: 500 }
    )
  }
}
