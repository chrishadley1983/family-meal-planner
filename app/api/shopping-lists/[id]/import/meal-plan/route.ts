import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { convertToMetric, DEFAULT_CATEGORIES, findDuplicates, combineQuantities } from '@/lib/unit-conversion'
import { SourceDetail } from '@/lib/types/shopping-list'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const importMealPlanSchema = z.object({
  mealPlanId: z.string().min(1, 'Meal plan ID is required'),
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

// POST - Import ingredients from a finalized meal plan
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
    const data = importMealPlanSchema.parse(body)

    console.log(`🔷 Importing ingredients from meal plan ${data.mealPlanId} to shopping list ${shoppingListId}`)

    // Fetch the meal plan with meals and recipes
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { id: data.mealPlanId },
      include: {
        meals: {
          include: {
            recipe: {
              include: {
                ingredients: true,
              },
            },
          },
        },
      },
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    if (mealPlan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (mealPlan.status !== 'Finalized') {
      return NextResponse.json(
        { error: 'Can only import from finalized meal plans' },
        { status: 400 }
      )
    }

    // Check if this meal plan is already linked to this shopping list
    const existingLink = await prisma.shoppingListMealPlan.findFirst({
      where: {
        shoppingListId,
        mealPlanId: data.mealPlanId,
      },
    })

    // Collect all ingredients from non-leftover meals
    const ingredientMap = new Map<string, {
      quantity: number
      unit: string
      category: string | null
      sources: SourceDetail[]
    }>()

    let mealsProcessed = 0
    let leftoverMealsSkipped = 0

    for (const meal of mealPlan.meals) {
      // Skip leftover meals - ingredients are counted from the source meal
      if (meal.isLeftover) {
        leftoverMealsSkipped++
        continue
      }

      // Skip meals without recipes
      if (!meal.recipe || !meal.recipe.ingredients) {
        continue
      }

      mealsProcessed++

      // Calculate scaling factor based on servings
      const recipeServings = meal.recipe.servings || 4
      const mealServings = meal.servings || recipeServings
      const scalingFactor = mealServings / recipeServings

      // Process each ingredient
      for (const ingredient of meal.recipe.ingredients) {
        // Scale the quantity
        const scaledQuantity = ingredient.quantity * scalingFactor

        // Convert to metric
        const converted = convertToMetric(scaledQuantity, ingredient.unit)

        // Create a normalized key for grouping (lowercase, trimmed)
        const ingredientKey = `${ingredient.ingredientName.toLowerCase().trim()}|${converted.unit}`

        const sourceDetail: SourceDetail = {
          type: 'recipe',
          id: meal.recipe.id,
          name: meal.recipe.recipeName,
          quantity: converted.quantity,
          unit: converted.unit,
          mealPlanId: mealPlan.id,
        }

        if (ingredientMap.has(ingredientKey)) {
          // Add to existing ingredient
          const existing = ingredientMap.get(ingredientKey)!
          existing.quantity += converted.quantity
          existing.sources.push(sourceDetail)
        } else {
          // New ingredient
          ingredientMap.set(ingredientKey, {
            quantity: converted.quantity,
            unit: converted.unit,
            category: ingredient.category || null,
            sources: [sourceDetail],
          })
        }
      }
    }

    console.log(`🔄 Processed ${mealsProcessed} meals, skipped ${leftoverMealsSkipped} leftover meals`)
    console.log(`🔄 Found ${ingredientMap.size} unique ingredients`)

    if (ingredientMap.size === 0) {
      return NextResponse.json({
        message: 'No ingredients found to import from this meal plan',
        importedCount: 0,
        items: [],
      })
    }

    // Get current max display order
    const maxOrder = await prisma.shoppingListItem.findFirst({
      where: { shoppingListId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    })

    let currentOrder = (maxOrder?.displayOrder ?? -1) + 1

    // Create shopping list items
    const itemsToCreate = Array.from(ingredientMap.entries()).map(([key, data]) => {
      const [ingredientName] = key.split('|')

      return {
        shoppingListId,
        itemName: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1), // Capitalize
        quantity: Math.round(data.quantity * 100) / 100, // Round to 2 decimal places
        unit: data.unit,
        category: data.category,
        source: 'recipe' as const,
        sourceDetails: data.sources as unknown as object[],
        isConsolidated: data.sources.length > 1, // Mark as consolidated if from multiple recipes
        priority: 'Medium' as const,
        displayOrder: currentOrder++,
      }
    })

    // Create the items
    const result = await prisma.shoppingListItem.createMany({
      data: itemsToCreate,
    })

    // Link the meal plan to the shopping list if not already linked
    if (!existingLink) {
      await prisma.shoppingListMealPlan.create({
        data: {
          shoppingListId,
          mealPlanId: data.mealPlanId,
        },
      })
      console.log(`🔗 Linked meal plan ${data.mealPlanId} to shopping list ${shoppingListId}`)
    }

    // Fetch the created items to return
    const createdItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        source: 'recipe',
      },
      orderBy: { createdAt: 'desc' },
      take: itemsToCreate.length,
    })

    console.log(`🟢 Imported ${result.count} ingredients from meal plan`)

    // Auto-categorize items that don't have a category
    const uncategorizedItems = createdItems.filter(item => !item.category)
    if (uncategorizedItems.length > 0) {
      console.log(`🔷 Auto-categorizing ${uncategorizedItems.length} items using AI...`)

      try {
        // Get the user's categories
        let userCategories = await prisma.shoppingListCategory.findMany({
          where: { userId: session.user.id },
          orderBy: { displayOrder: 'asc' },
        })

        if (userCategories.length === 0) {
          // Create default categories for this user
          const defaultCats = DEFAULT_CATEGORIES.map((cat, idx) => ({
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

        const categoryNames = userCategories.map(c => c.name)
        const itemNames = uncategorizedItems.map(i => i.itemName)

        // Use AI to categorize all items at once
        const prompt = `You are a grocery store assistant. Categorize each shopping item into one of the available categories.

AVAILABLE CATEGORIES:
${categoryNames.join('\n')}

ITEMS TO CATEGORIZE:
${itemNames.map((item, idx) => `${idx + 1}. "${item}"`).join('\n')}

Respond with ONLY a JSON array of category names in the same order as the items. Use exact category names from the list above.
Example response format: ["Produce", "Dairy & Eggs", "Pantry"]

If an item doesn't clearly fit any category, use "Other".`

        const message = await client.messages.create({
          model: 'claude-haiku-4-5',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        })

        const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)

        if (jsonMatch) {
          const suggestedCategories = JSON.parse(jsonMatch[0]) as string[]

          // Update each item with its suggested category
          const updates = uncategorizedItems.map((item, idx) => {
            const suggested = suggestedCategories[idx] || 'Other'
            const matchedCategory = categoryNames.find(
              cat => cat.toLowerCase() === suggested.toLowerCase()
            ) || 'Other'

            return prisma.shoppingListItem.update({
              where: { id: item.id },
              data: { category: matchedCategory },
            })
          })

          await Promise.all(updates)
          console.log(`🟢 Auto-categorized ${uncategorizedItems.length} items`)
        }
      } catch (catError) {
        console.warn('⚠️ Auto-categorization failed, items will remain uncategorized:', catError)
        // Don't fail the import if categorization fails
      }
    }

    // Auto-deduplicate items with AI
    console.log('🔷 Auto-deduplicating items after import...')

    // Get ALL items in the shopping list (not just newly created) to find duplicates
    const allItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
        isPurchased: false,
      },
      orderBy: { itemName: 'asc' },
    })

    // Find duplicates
    const duplicateGroups = findDuplicates(
      allItems.map((item) => ({
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
          // Fetch full item data for this group
          const groupItems = await prisma.shoppingListItem.findMany({
            where: { id: { in: group.items.map(i => i.id) } },
          })

          if (groupItems.length < 2) continue

          // Try to combine quantities
          let combinedQuantity = groupItems[0].quantity
          let combinedUnit = groupItems[0].unit
          let allCompatible = true

          for (let i = 1; i < groupItems.length; i++) {
            const result = combineQuantities(
              combinedQuantity,
              combinedUnit,
              groupItems[i].quantity,
              groupItems[i].unit
            )

            if (result) {
              combinedQuantity = result.quantity
              combinedUnit = result.unit
            } else {
              allCompatible = false
              break
            }
          }

          let aiSuggestedName: string | null = null

          // If units aren't compatible, use AI to determine best combination
          if (!allCompatible) {
            const itemDescriptions = groupItems.map(i => `${i.quantity} ${i.unit} ${i.itemName}`).join('\n')

            const prompt = `You are a grocery shopping assistant. Combine these duplicate shopping list items into a single item with the most practical quantity and unit for shopping.

ITEMS TO COMBINE:
${itemDescriptions}

CONVERSION RULES:
- 1 pinch ≈ 0.3g for dry spices
- 1 whole chicken thigh ≈ 150g
- 1 stock cube ≈ 10g or can stay as "piece" if sold by count
- For items sold by count (eggs, stock cubes), prefer "piece" or "whole"
- For items sold by weight, convert to grams
- For liquids, use ml

Respond with ONLY valid JSON: {"quantity": <number>, "unit": "<unit>", "itemName": "<best name>"}`

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
                aiSuggestedName = aiResult.itemName || null
              } else {
                console.warn(`⚠️ AI could not combine group: ${group.normalizedName}`)
                continue // Skip this group
              }
            } catch (aiError) {
              console.warn(`⚠️ AI combination failed for ${group.normalizedName}:`, aiError)
              continue // Skip this group
            }
          }

          // Combine source details
          const combinedSourceDetails: SourceDetail[] = []
          for (const item of groupItems) {
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

          const primaryItem = groupItems.reduce((longest, current) =>
            current.itemName.length > longest.itemName.length ? current : longest
          )
          const category = groupItems.find((i) => i.category)?.category || null

          const [keepItem, ...deleteItems] = groupItems.sort((a, b) =>
            a.createdAt.getTime() - b.createdAt.getTime()
          )

          const finalItemName = aiSuggestedName || primaryItem.itemName

          await prisma.shoppingListItem.update({
            where: { id: keepItem.id },
            data: {
              itemName: finalItemName,
              quantity: Math.round(combinedQuantity * 100) / 100,
              unit: combinedUnit,
              category,
              source: 'recipe',
              sourceDetails: combinedSourceDetails as unknown as object[],
              isConsolidated: true,
            },
          })

          await prisma.shoppingListItem.deleteMany({
            where: { id: { in: deleteItems.map((i) => i.id) } },
          })

          totalCombined += groupItems.length
          totalDeleted += deleteItems.length
          console.log(`🟢 Combined ${groupItems.length} "${group.normalizedName}" items`)
        } catch (groupError) {
          console.warn(`⚠️ Failed to combine group ${group.normalizedName}:`, groupError)
        }
      }

      console.log(`🟢 Auto-deduplication complete: combined ${totalCombined} items, removed ${totalDeleted} duplicates`)
    } else {
      console.log('🟢 No duplicates found after import')
    }

    // Re-fetch items with updated categories and deduplication
    const finalItems = await prisma.shoppingListItem.findMany({
      where: {
        shoppingListId,
      },
      orderBy: [{ category: 'asc' }, { displayOrder: 'asc' }],
    })

    const dedupeMessage = totalDeleted > 0
      ? ` (${totalDeleted} duplicates combined)`
      : ''

    return NextResponse.json({
      message: `Successfully imported ${result.count} ingredient${result.count !== 1 ? 's' : ''} from ${mealsProcessed} meal${mealsProcessed !== 1 ? 's' : ''}${dedupeMessage}`,
      importedCount: result.count,
      mealsProcessed,
      leftoverMealsSkipped,
      duplicatesRemoved: totalDeleted,
      finalItemCount: finalItems.length,
      items: finalItems,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('❌ Error importing meal plan ingredients:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get finalized meal plans available for import
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

    // Get all finalized meal plans for the user
    const mealPlans = await prisma.mealPlan.findMany({
      where: {
        userId: session.user.id,
        status: 'Finalized',
      },
      include: {
        meals: {
          select: {
            id: true,
            isLeftover: true,
            recipeName: true,
          },
        },
        shoppingLists: {
          where: {
            shoppingListId,
          },
          select: {
            id: true,
            importedAt: true,
          },
        },
      },
      orderBy: { weekStartDate: 'desc' },
    })

    // Add metadata to each meal plan
    const mealPlansWithMeta = mealPlans.map((mp) => ({
      id: mp.id,
      weekStartDate: mp.weekStartDate,
      weekEndDate: mp.weekEndDate,
      status: mp.status,
      mealCount: mp.meals.filter((m) => !m.isLeftover).length,
      leftoverCount: mp.meals.filter((m) => m.isLeftover).length,
      alreadyImported: mp.shoppingLists.length > 0,
      importedAt: mp.shoppingLists[0]?.importedAt || null,
    }))

    return NextResponse.json({
      mealPlans: mealPlansWithMeta,
      totalCount: mealPlans.length,
    })
  } catch (error) {
    console.error('❌ Error fetching meal plans for import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
