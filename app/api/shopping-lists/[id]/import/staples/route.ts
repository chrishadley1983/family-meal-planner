import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { convertToMetric, DEFAULT_CATEGORIES, findDuplicates, combineQuantities } from '@/lib/unit-conversion'
import { lookupCategory, preprocessForAI } from '@/lib/category-lookup'
import type { Staple, StapleWithDueStatus, StapleDueStatus } from '@/lib/types/staples'
import { enrichStapleWithDueStatus } from '@/lib/staples/calculations'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const importStaplesSchema = z.object({
  stapleIds: z.array(z.string()).min(1, 'At least one staple must be selected'),
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
    return { error: 'Can only import to draft shopping lists', status: 400 }
  }

  return { success: true }
}

// POST - Import staples to shopping list
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
    const data = importStaplesSchema.parse(body)

    console.log(`🔷 Importing ${data.stapleIds.length} staples to shopping list ${shoppingListId}`)

    // Fetch the selected staples
    const staples = await prisma.staple.findMany({
      where: {
        id: { in: data.stapleIds },
        userId: session.user.id, // Ensure user owns these staples
      },
    })

    if (staples.length === 0) {
      return NextResponse.json(
        { error: 'No valid staples found to import' },
        { status: 400 }
      )
    }

    if (staples.length !== data.stapleIds.length) {
      console.warn(`⚠️ Some staples not found or not owned by user. Requested: ${data.stapleIds.length}, Found: ${staples.length}`)
    }

    // Get current max display order
    const maxOrder = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    let currentOrder = (maxOrder?.displayOrder ?? -1) + 1

    // Convert staples to shopping list items
    const itemsToCreate = staples.map((staple: Staple) => {
      // Convert to metric
      const converted = convertToMetric(staple.quantity, staple.unit)

      return {
        shoppingListId,
        itemName: staple.itemName,
        quantity: converted.quantity,
        unit: converted.unit,
        category: staple.category || null,
        source: 'staple' as const,
        sourceDetails: [{
          type: 'staple' as const,
          id: staple.id,
          name: staple.itemName,
          quantity: staple.quantity,
          unit: staple.unit,
        }],
        customNote: staple.notes || null,
        priority: 'Medium' as const,
        displayOrder: currentOrder++,
      }
    })

    // Create the items
    const result = await prisma.shoppingListItem.createMany({
      data: itemsToCreate,
    })

    // Fetch the created items to return
    const createdItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        source: 'staple',
      },
      orderBy: { createdAt: 'desc' },
      take: staples.length,
    })

    console.log(`🟢 Imported ${result.count} staples to shopping list`)

    // Auto-categorize items that don't have a category
    type ShoppingListItem = typeof createdItems[0]
    const uncategorizedItems = createdItems.filter((item: ShoppingListItem) => !item.category)
    if (uncategorizedItems.length > 0) {
      console.log(`🔷 Auto-categorizing ${uncategorizedItems.length} staple items...`)

      try {
        // Get the user's categories
        let userCategories = await prisma.shoppingListCategory.findMany({
          where: { userId: session.user.id },
          orderBy: { displayOrder: 'asc' },
        })

        if (userCategories.length === 0) {
          // Create default categories for this user
          const defaultCats = DEFAULT_CATEGORIES.map((cat) => ({
            userId: session.user.id,
            name: cat.name,
            displayOrder: cat.displayOrder,
            isDefault: true,
          }))
          await prisma.shoppingListCategory.createMany({ data: defaultCats })
          userCategories = await prisma.shoppingListCategory.findMany({
            where: { userId: session.user.id },
            orderBy: { displayOrder: 'asc' },
          })
        }

        const categoryNames = userCategories.map((c: { name: string }) => c.name)

        // PHASE 1: Try lookup table first for each item
        const lookupResults: { item: typeof uncategorizedItems[0], category: string | null }[] = []
        const needsAI: typeof uncategorizedItems = []

        for (const item of uncategorizedItems) {
          const lookupResult = lookupCategory(item.itemName)
          if (lookupResult) {
            const matchedCategory = categoryNames.find(
              (cat: string) => cat.toLowerCase() === lookupResult.toLowerCase()
            )
            if (matchedCategory) {
              lookupResults.push({ item, category: matchedCategory })
              console.log(`📋 Lookup: "${item.itemName}" → ${matchedCategory}`)
            } else {
              needsAI.push(item)
            }
          } else {
            needsAI.push(item)
          }
        }

        // Update items that were resolved by lookup
        if (lookupResults.length > 0) {
          const lookupUpdates = lookupResults.map(({ item, category }) =>
            prisma.shoppingListItem.update({
              where: { id: item.id },
              data: { category },
            })
          )
          await Promise.all(lookupUpdates)
          console.log(`🟢 Updated ${lookupResults.length} items from lookup table`)
        }

        // PHASE 2: Use AI for remaining items
        if (needsAI.length > 0) {
          console.log(`🔷 Using AI to categorize ${needsAI.length} staple items...`)

          const processedItems = needsAI.map((item: ShoppingListItem) => ({
            original: item.itemName,
            processed: preprocessForAI(item.itemName),
          }))

          const categoryExamples: Record<string, string> = {
            'Fresh Produce': 'Fresh fruit, vegetables, fresh herbs',
            'Meat & Fish': 'Fresh and frozen meat, poultry, fish, seafood',
            'Dairy & Eggs': 'Milk, cheese, yoghurt, cream, butter, eggs',
            'Bakery': 'Bread, rolls, pastries, flatbreads',
            'Chilled & Deli': 'Fresh ready meals, deli meats, fresh pasta, dips',
            'Frozen': 'Frozen foods only',
            'Cupboard Staples': 'Tinned goods, dried pasta, rice, noodles, stock, sauces',
            'Baking & Cooking Ingredients': 'Flour, sugar, spices, seasonings, oils',
            'Breakfast': 'Cereals, porridge, granola',
            'Drinks': 'Beverages - juices, tea, coffee, soft drinks',
            'Snacks & Treats': 'Crisps, nuts, chocolate, biscuits',
            'Household': 'Non-food items for home',
            'Other': 'Only for items that genuinely do not fit any other category',
          }

          const categoryDescriptions = categoryNames
            .filter((name: string) => categoryExamples[name])
            .map((name: string) => `- ${name}: ${categoryExamples[name]}`)
            .join('\n')

          const prompt = `Categorize these grocery items for a UK supermarket shopping list.

AVAILABLE CATEGORIES:
${categoryDescriptions}

ITEMS TO CATEGORIZE:
${processedItems.map((item: { original: string; processed: string }, i: number) => `${i + 1}. ${item.processed}`).join('\n')}

Respond with ONLY valid JSON array: [{"index": 1, "category": "Category Name"}, ...]`

          try {
            const message = await client.messages.create({
              model: 'claude-haiku-4-5',
              max_tokens: 500,
              messages: [{ role: 'user', content: prompt }],
            })

            const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
            const jsonMatch = responseText.match(/\[[\s\S]*\]/)

            if (jsonMatch) {
              const categories = JSON.parse(jsonMatch[0]) as Array<{ index: number; category: string }>
              const aiUpdates = categories
                .filter(c => categoryNames.includes(c.category))
                .map(c => {
                  const item = needsAI[c.index - 1]
                  if (item) {
                    return prisma.shoppingListItem.update({
                      where: { id: item.id },
                      data: { category: c.category },
                    })
                  }
                  return null
                })
                .filter(Boolean)

              if (aiUpdates.length > 0) {
                await Promise.all(aiUpdates)
                console.log(`🟢 AI categorized ${aiUpdates.length} items`)
              }
            }
          } catch (aiError) {
            console.warn('⚠️ AI categorization failed:', aiError)
          }
        }
      } catch (catError) {
        console.warn('⚠️ Auto-categorization failed:', catError)
      }
    }

    // Auto-deduplicate items
    console.log('🔷 Auto-deduplicating items after staples import...')

    const allItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        isPurchased: false,
      },
      orderBy: { itemName: 'asc' },
    })

    const duplicateGroups = findDuplicates(
      allItems.map((item: ShoppingListItem) => ({
        id: item.id,
        itemName: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        source: item.source || undefined,
      }))
    )

    let totalCombined = 0
    let totalDeleted = 0

    if (duplicateGroups.length > 0) {
      console.log(`🔷 Found ${duplicateGroups.length} duplicate groups, auto-combining...`)

      for (const group of duplicateGroups) {
        try {
          const groupItems = await prisma.shoppingListItem.findMany({
            where: { id: { in: group.items.map(i => i.id) } },
          })

          if (groupItems.length < 2) continue

          let combinedQuantity = groupItems[0].quantity
          let combinedUnit = groupItems[0].unit
          let allCompatible = true

          for (let i = 1; i < groupItems.length; i++) {
            const combineResult = combineQuantities(
              combinedQuantity,
              combinedUnit,
              groupItems[i].quantity,
              groupItems[i].unit
            )

            if (combineResult) {
              combinedQuantity = combineResult.quantity
              combinedUnit = combineResult.unit
            } else {
              allCompatible = false
              break
            }
          }

          if (allCompatible) {
            // Update the first item with combined quantity
            const keepItem = groupItems[0]
            const deleteIds = groupItems.slice(1).map((i: ShoppingListItem) => i.id)

            // Combine source details
            const combinedSourceDetails = groupItems.flatMap((item: ShoppingListItem) => {
              const details = item.sourceDetails as Array<Record<string, unknown>> | null
              return details || []
            })

            await prisma.shoppingListItem.update({
              where: { id: keepItem.id },
              data: {
                quantity: combinedQuantity,
                unit: combinedUnit,
                sourceDetails: combinedSourceDetails,
              },
            })

            await prisma.shoppingListItem.deleteMany({
              where: { id: { in: deleteIds } },
            })

            totalCombined++
            totalDeleted += deleteIds.length
            console.log(`🟢 Combined "${group.normalizedName}": ${groupItems.length} items → 1 (${combinedQuantity} ${combinedUnit})`)
          }
        } catch (groupError) {
          console.warn(`⚠️ Failed to combine group "${group.normalizedName}":`, groupError)
        }
      }
    }

    const dedupeMessage = totalDeleted > 0
      ? `. Combined ${totalCombined} duplicate groups (removed ${totalDeleted} items).`
      : ''

    return NextResponse.json({
      message: `Successfully imported ${result.count} staple${result.count !== 1 ? 's' : ''}${dedupeMessage}`,
      importedCount: result.count,
      items: createdItems,
      deduplication: {
        groupsCombined: totalCombined,
        itemsRemoved: totalDeleted,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error importing staples:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get all staples available for import (for the selection modal)
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

    // Get all active user staples (include inactive only if specifically requested)
    const staples = await prisma.staple.findMany({
      where: {
        userId: session.user.id,
        isActive: true, // Only show active staples for import
      },
      orderBy: [
        { category: 'asc' },
        { itemName: 'asc' },
      ],
    })

    // Get staples already in the shopping list
    const existingStapleItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        source: 'staple',
      },
      select: {
        sourceDetails: true,
      },
    })

    // Extract staple IDs that are already imported
    const importedStapleIds = new Set<string>()
    for (const item of existingStapleItems) {
      const details = item.sourceDetails as Array<{ type: string; id?: string }>
      for (const detail of details) {
        if (detail.type === 'staple' && detail.id) {
          importedStapleIds.add(detail.id)
        }
      }
    }

    // Enrich staples with due status and mark which are already imported
    const staplesWithStatus = staples.map((staple: Staple) => {
      const enriched = enrichStapleWithDueStatus(staple)
      return {
        ...enriched,
        alreadyImported: importedStapleIds.has(staple.id),
      }
    })

    // Sort by due status priority: overdue > dueToday > dueSoon > upcoming > notDue
    const statusPriority: Record<StapleDueStatus, number> = {
      overdue: 0,
      dueToday: 1,
      dueSoon: 2,
      upcoming: 3,
      notDue: 4,
    }

    type EnrichedStaple = StapleWithDueStatus & { alreadyImported: boolean }

    staplesWithStatus.sort((a: EnrichedStaple, b: EnrichedStaple) => {
      // First sort by due status
      const statusDiff = statusPriority[a.dueStatus] - statusPriority[b.dueStatus]
      if (statusDiff !== 0) return statusDiff
      // Then by category
      const catA = a.category || 'zzz'
      const catB = b.category || 'zzz'
      if (catA !== catB) return catA.localeCompare(catB)
      // Then by name
      return a.itemName.localeCompare(b.itemName)
    })

    // Count due items for summary
    const dueCount = staplesWithStatus.filter(
      (s: EnrichedStaple) => !s.alreadyImported && (s.dueStatus === 'overdue' || s.dueStatus === 'dueToday' || s.dueStatus === 'dueSoon')
    ).length

    return NextResponse.json({
      staples: staplesWithStatus,
      totalCount: staples.length,
      alreadyImportedCount: importedStapleIds.size,
      dueCount,
    })
  } catch (error) {
    console.error('❌ Error fetching staples for import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
