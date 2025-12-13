/**
 * POST /api/discover/recipes/add-bulk
 *
 * Add multiple master recipes to user's personal collection at once
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { z } from 'zod'
import { addMasterRecipeToUserLibrary } from '@/lib/scraping'

const bulkAddSchema = z.object({
  masterRecipeIds: z.array(z.string()).min(1, 'At least one recipe ID required').max(50, 'Maximum 50 recipes at once')
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = bulkAddSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const { masterRecipeIds } = parsed.data

    console.log(`🔷 Bulk adding ${masterRecipeIds.length} recipes to user library`)

    const results = {
      succeeded: [] as { id: string; recipeId: string }[],
      failed: [] as { id: string; error: string }[],
      skipped: [] as { id: string; reason: string; existingRecipeId?: string }[]
    }

    // Process each recipe
    for (const id of masterRecipeIds) {
      try {
        const result = await addMasterRecipeToUserLibrary(id, session.user.id)

        if (result.success && !result.skipped) {
          results.succeeded.push({ id, recipeId: result.recipeId! })
        } else if (result.skipped) {
          results.skipped.push({
            id,
            reason: result.reason || 'Already exists',
            existingRecipeId: result.recipeId
          })
        } else {
          results.failed.push({ id, error: result.error || 'Unknown error' })
        }
      } catch (error) {
        results.failed.push({
          id,
          error: error instanceof Error ? error.message : String(error)
        })
      }
    }

    const summary = `Added ${results.succeeded.length} recipes, skipped ${results.skipped.length}, failed ${results.failed.length}`

    console.log(`🟢 Bulk add complete: ${summary}`)

    return NextResponse.json({
      success: true,
      results,
      message: summary
    })

  } catch (error) {
    console.error('❌ Bulk add error:', error)
    return NextResponse.json(
      { error: 'Failed to add recipes' },
      { status: 500 }
    )
  }
}
