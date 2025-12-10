import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { findDuplicates, combineQuantities, DuplicateGroup } from '@/lib/unit-conversion'
import { normalizeAndRound } from '@/lib/measurements'
import { SourceDetail } from '@/lib/types/shopping-list'
import Anthropic from '@anthropic-ai/sdk'

const deduplicateSchema = z.object({
  itemIds: z.array(z.string()).min(2, 'At least 2 items required to deduplicate'),
  useAI: z.boolean().optional().default(false), // Flag to use AI for incompatible units
})

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Helper to verify shopping list ownership
async function verifyListOwnership(listId: string, userId: string) {
  const list = await prisma.shoppingList.findUnique({
    where: { id: listId },
    select: { userId: true, status: true },
  })

  if (!list) {
    return { error: 'Shopping list not found', status: 404 }
  }

  if (list.userId !== userId) {
    return { error: 'Forbidden', status: 403 }
  }

  if (list.status !== 'Draft') {
    return { error: 'Can only deduplicate items in draft shopping lists', status: 400 }
  }

  return { success: true }
}

// GET - Find potential duplicate items for manual combination
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    // Get all non-purchased items
    const items = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        isPurchased: false,
      },
      orderBy: { itemName: 'asc' },
    })

    // Find duplicates using the utility function
    const duplicateGroups = findDuplicates(
      items.map((item) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        source: item.source || undefined,
      }))
    )

    console.log(`🔷 Found ${duplicateGroups.length} potential duplicate groups`)

    return NextResponse.json({
      duplicateGroups,
      totalDuplicateItems: duplicateGroups.reduce((sum, g) => sum + g.items.length, 0),
      hasDuplicates: duplicateGroups.length > 0,
    })
  } catch (error) {
    console.error('❌ Error finding duplicates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Manually combine specific items into one
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: shoppingListId } = await params

    const ownershipCheck = await verifyListOwnership(shoppingListId, session.user.id)
    if ('error' in ownershipCheck) {
      return NextResponse.json(
        { error: ownershipCheck.error },
        { status: ownershipCheck.status }
      )
    }

    const body = await req.json()
    const data = deduplicateSchema.parse(body)

    console.log(`🔷 Deduplicating ${data.itemIds.length} items`)

    // Fetch the items to combine
    const items = await prisma.shoppingListItem.findMany({
      where: {
        id: { in: data.itemIds },
        shoppingListId,
      },
    })

    if (items.length !== data.itemIds.length) {
      return NextResponse.json(
        { error: 'Some items not found or do not belong to this list' },
        { status: 400 }
      )
    }

    if (items.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 items required to deduplicate' },
        { status: 400 }
      )
    }

    // Try to combine quantities
    let combinedQuantity = items[0].quantity
    let combinedUnit = items[0].unit
    let allCompatible = true

    for (let i = 1; i < items.length; i++) {
      const result = combineQuantities(
        combinedQuantity,
        combinedUnit,
        items[i].quantity,
        items[i].unit
      )

      if (result) {
        combinedQuantity = result.quantity
        combinedUnit = result.unit
      } else {
        allCompatible = false
        break
      }
    }

    // Variable to store AI-suggested name if applicable
    let aiSuggestedName: string | null = null

    // If units aren't compatible, use AI to determine best combination
    if (!allCompatible) {
      if (!data.useAI) {
        return NextResponse.json(
          { error: 'Items have incompatible units. Set useAI: true to use AI-powered combination.' },
          { status: 400 }
        )
      }

      console.log('🤖 Using AI to combine items with incompatible units')

      // Build the prompt for AI
      const itemDescriptions = items.map(i => `${i.quantity} ${i.unit} ${i.itemName}`).join('\n')

      const prompt = `You are a grocery shopping assistant. I need to combine these duplicate shopping list items into a single item with the most practical quantity and unit for shopping.

ITEMS TO COMBINE:
${itemDescriptions}

Determine:
1. The best unit to use for this ingredient when shopping (e.g., use "g" for spices instead of "pinch", use "whole" for items sold by count, use "ml" for liquids)
2. The combined total quantity in that unit

IMPORTANT CONVERSION RULES:
- 1 pinch ≈ 0.3g for dry spices
- 1 whole chicken thigh ≈ 150g
- 1 stock cube ≈ 10g or can stay as "piece" if sold by count
- For items typically sold by count (eggs, stock cubes), prefer "piece" or "whole"
- For items sold by weight, convert to grams
- For liquids, use ml

Respond with ONLY valid JSON in this exact format:
{"quantity": <number>, "unit": "<unit>", "itemName": "<best name for the item>"}

Example: {"quantity": 5, "unit": "g", "itemName": "Black pepper"}`

      try {
        const message = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]) as { quantity: number; unit: string; itemName: string }
          combinedQuantity = aiResult.quantity
          combinedUnit = aiResult.unit

          // Store AI-suggested name for later use
          if (aiResult.itemName) {
            aiSuggestedName = aiResult.itemName
          }

          console.log(`🟢 AI combined: ${combinedQuantity} ${combinedUnit} ${aiSuggestedName || items[0].itemName}`)
        } else {
          return NextResponse.json(
            { error: 'AI could not determine how to combine these items' },
            { status: 400 }
          )
        }
      } catch (aiError) {
        console.error('❌ AI combination failed:', aiError)
        return NextResponse.json(
          { error: 'AI-powered combination failed. Please try manual combination.' },
          { status: 500 }
        )
      }
    }

    // Combine all source details
    const combinedSourceDetails: SourceDetail[] = []
    for (const item of items) {
      const details = item.sourceDetails as unknown as SourceDetail[]
      if (Array.isArray(details)) {
        combinedSourceDetails.push(...details)
      } else {
        // Create a source detail from the item itself
        combinedSourceDetails.push({
          type: (item.source as 'recipe' | 'staple' | 'manual') || 'manual',
          name: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    }

    // Use the first item's name (or the longest one for better description)
    const primaryItem = items.reduce((longest, current) =>
      current.itemName.length > longest.itemName.length ? current : longest
    )

    // Use the first item's category, or the first non-null category
    const category = items.find((i) => i.category)?.category || null

    // Keep the first item, update it with combined values
    const [keepItem, ...deleteItems] = items.sort((a, b) =>
      a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Update the kept item - use AI-suggested name if available, otherwise the primary item name
    const finalItemName = aiSuggestedName || primaryItem.itemName

    // Apply unit normalization and smart rounding to combined result
    const normalizedCombined = normalizeAndRound(combinedQuantity, combinedUnit)

    const updatedItem = await prisma.shoppingListItem.update({
      where: { id: keepItem.id },
      data: {
        itemName: finalItemName,
        quantity: normalizedCombined.quantity,
        unit: normalizedCombined.unit,
        category,
        source: 'recipe', // Combined items are marked as recipe source
        sourceDetails: combinedSourceDetails as unknown as object[],
        isConsolidated: true,
        customNote: items
          .filter((i) => i.customNote)
          .map((i) => i.customNote)
          .join('; ') || null,
      },
    })

    // Delete the other items
    await prisma.shoppingListItem.deleteMany({
      where: {
        id: { in: deleteItems.map((i) => i.id) },
      },
    })

    console.log(`🟢 Combined ${items.length} items into one: ${updatedItem.itemName}`)

    return NextResponse.json({
      message: `Successfully combined ${items.length} items`,
      combinedItem: updatedItem,
      deletedCount: deleteItems.length,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error deduplicating items:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
