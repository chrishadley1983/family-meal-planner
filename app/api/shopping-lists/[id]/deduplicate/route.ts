import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { findDuplicates, combineQuantities, DuplicateGroup } from '@/lib/unit-conversion'
import { normalizeAndRound } from '@/lib/measurements'
import { SourceDetail } from '@/lib/types/shopping-list'
import {
  normalizeIngredientName,
  calculateSimilarity,
  MatchConfidence,
} from '@/lib/ingredient-normalization'
import Anthropic from '@anthropic-ai/sdk'

const deduplicateSchema = z.object({
  itemIds: z.array(z.string()).min(2, 'At least 2 items required to deduplicate'),
  useAI: z.boolean().optional().default(false),
})

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Extended duplicate group with confidence
interface EnhancedDuplicateGroup extends DuplicateGroup {
  confidence: MatchConfidence
  reason: string
}

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

/**
 * Uses AI to find semantic duplicates that rule-based matching might miss
 */
async function findSemanticDuplicatesWithAI(
  items: Array<{ id: string; itemName: string; quantity: number; unit: string }>
): Promise<Array<{ items: string[]; normalizedName: string; confidence: MatchConfidence; reason: string }>> {
  if (items.length < 2) return []

  const itemList = items.map((i) => `- ${i.itemName}`).join('\n')

  const prompt = `You are a grocery shopping assistant. Analyze this shopping list and identify items that are essentially THE SAME ingredient for shopping purposes.

SHOPPING LIST ITEMS:
${itemList}

RULES FOR MATCHING:
1. Items that are the same base ingredient should be grouped (e.g., "Garlic", "Garlic cloves", "Fresh garlic" are all GARLIC)
2. UK and US names for the same thing should be grouped (e.g., "Coriander" and "Cilantro")
3. Different forms of the same ingredient should be grouped (e.g., "Chicken stock", "Chicken broth")
4. Items with preparation differences should be grouped (e.g., "Diced tomatoes", "Chopped tomatoes", "Tomatoes")
5. DO NOT group items that are genuinely different products (e.g., "Chicken breast" and "Chicken thigh" are different cuts)
6. DO NOT group "stock cubes" with liquid "stock" - these are different products at the store

For each group, assign a confidence level:
- HIGH: Definitely the same ingredient (just plurals, preparation, or UK/US naming)
- MEDIUM: Very likely the same ingredient for shopping purposes (different forms like broth/stock)
- LOW: Possibly related but might be intentionally separate

Respond with ONLY valid JSON in this exact format (no other text):
{
  "groups": [
    {
      "items": ["Item name 1", "Item name 2"],
      "normalizedName": "canonical name",
      "confidence": "HIGH",
      "reason": "brief explanation"
    }
  ]
}

If no duplicates found, return: {"groups": []}`

  try {
    console.log('🤖 Calling AI for semantic duplicate detection...')

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]) as {
        groups: Array<{
          items: string[]
          normalizedName: string
          confidence: MatchConfidence
          reason: string
        }>
      }

      console.log(`🟢 AI found ${result.groups.length} semantic duplicate groups`)
      return result.groups
    }

    return []
  } catch (error) {
    console.error('❌ AI semantic matching failed:', error)
    return []
  }
}

// GET - Find potential duplicate items with enhanced matching
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
    const url = new URL(req.url)
    const useAI = url.searchParams.get('useAI') === 'true'

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

    const itemsForMatching = items.map((item) => ({
      id: item.id,
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      source: item.source || undefined,
    }))

    // Step 1: Rule-based duplicate finding with enhanced normalization
    const ruleBasedGroups = findDuplicates(itemsForMatching)

    // Mark rule-based groups as HIGH confidence
    const enhancedGroups: EnhancedDuplicateGroup[] = ruleBasedGroups.map((group) => ({
      ...group,
      confidence: 'HIGH' as MatchConfidence,
      reason: 'Matched by ingredient normalization rules',
    }))

    // Step 2: AI semantic matching for remaining items (if enabled)
    if (useAI) {
      // Get items not already in a rule-based group
      const groupedItemIds = new Set(ruleBasedGroups.flatMap((g) => g.items.map((i) => i.id)))
      const ungroupedItems = itemsForMatching.filter((i) => !groupedItemIds.has(i.id))

      if (ungroupedItems.length >= 2) {
        const aiGroups = await findSemanticDuplicatesWithAI(ungroupedItems)

        // Convert AI groups to EnhancedDuplicateGroup format
        for (const aiGroup of aiGroups) {
          // Only process HIGH and MEDIUM confidence (ignore LOW per user request)
          if (aiGroup.confidence === 'LOW') {
            console.log(`⚠️ Ignoring LOW confidence group: ${aiGroup.normalizedName}`)
            continue
          }

          // Find the actual items by name
          const matchedItems = ungroupedItems.filter((item) =>
            aiGroup.items.some(
              (aiItemName) =>
                item.itemName.toLowerCase() === aiItemName.toLowerCase() ||
                normalizeIngredientName(item.itemName) === normalizeIngredientName(aiItemName)
            )
          )

          if (matchedItems.length >= 2) {
            // Check if units are compatible for combining
            let canCombine = true
            for (let i = 1; i < matchedItems.length; i++) {
              const result = combineQuantities(
                matchedItems[0].quantity,
                matchedItems[0].unit,
                matchedItems[i].quantity,
                matchedItems[i].unit
              )
              if (!result) {
                canCombine = false
                break
              }
            }

            enhancedGroups.push({
              normalizedName: aiGroup.normalizedName,
              items: matchedItems,
              canCombine,
              confidence: aiGroup.confidence,
              reason: aiGroup.reason,
            })
          }
        }
      }
    }

    console.log(`🔷 Found ${enhancedGroups.length} total duplicate groups (rule-based + AI)`)

    // Separate by confidence for UI display
    const highConfidence = enhancedGroups.filter((g) => g.confidence === 'HIGH')
    const mediumConfidence = enhancedGroups.filter((g) => g.confidence === 'MEDIUM')

    return NextResponse.json({
      duplicateGroups: enhancedGroups,
      highConfidenceGroups: highConfidence,
      mediumConfidenceGroups: mediumConfidence,
      totalDuplicateItems: enhancedGroups.reduce((sum, g) => sum + g.items.length, 0),
      hasDuplicates: enhancedGroups.length > 0,
      summary: {
        high: highConfidence.length,
        medium: mediumConfidence.length,
        total: enhancedGroups.length,
      },
    })
  } catch (error) {
    console.error('❌ Error finding duplicates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Combine specific items into one
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

      const itemDescriptions = items.map((i) => `${i.quantity} ${i.unit} ${i.itemName}`).join('\n')

      const prompt = `You are a grocery shopping assistant. I need to combine these duplicate shopping list items into a single item with the most practical quantity and unit for shopping.

ITEMS TO COMBINE:
${itemDescriptions}

Determine:
1. The best unit to use for this ingredient when shopping (e.g., use "g" for spices instead of "pinch", use "whole" for items sold by count, use "ml" for liquids)
2. The combined total quantity in that unit
3. The best canonical name for this ingredient

IMPORTANT CONVERSION RULES:
- 1 pinch ≈ 0.3g for dry spices
- 1 whole chicken thigh ≈ 150g
- 1 stock cube ≈ 10g or can stay as "piece" if sold by count
- For items typically sold by count (eggs, stock cubes), prefer "piece" or "whole"
- For items sold by weight, convert to grams
- For liquids, use ml
- Use the simplest, most recognizable name for the ingredient

Respond with ONLY valid JSON in this exact format:
{"quantity": <number>, "unit": "<unit>", "itemName": "<best name for the item>"}`

      try {
        const message = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 150,
          messages: [{ role: 'user', content: prompt }],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)

        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]) as { quantity: number; unit: string; itemName: string }
          combinedQuantity = aiResult.quantity
          combinedUnit = aiResult.unit

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
        combinedSourceDetails.push({
          type: (item.source as 'recipe' | 'staple' | 'manual') || 'manual',
          name: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
        })
      }
    }

    // Use the first item's name (or the longest one for better description)
    const primaryItem = items.reduce((longest: typeof items[0], current: typeof items[0]) =>
      current.itemName.length > longest.itemName.length ? current : longest
    )

    // Use the first item's category, or the first non-null category
    const category = items.find((i) => i.category)?.category || null

    // Keep the first item, update it with combined values
    const [keepItem, ...deleteItems] = items.sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    )

    // Use AI-suggested name if available, otherwise the primary item name
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
        source: 'recipe',
        sourceDetails: combinedSourceDetails as unknown as object[],
        isConsolidated: true,
        customNote:
          items
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
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }

    console.error('❌ Error deduplicating items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
