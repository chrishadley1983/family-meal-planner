import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { convertToMetric, DEFAULT_CATEGORIES, findDuplicates, combineQuantities } from '@/lib/unit-conversion'
import { lookupCategory, preprocessForAI, validateCategory, normalizeForLookup } from '@/lib/category-lookup'
import { normalizeAndRound } from '@/lib/measurements'
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

    // Create shopping list items with normalized units and smart rounding
    const itemsToCreate = Array.from(ingredientMap.entries()).map(([key, data]) => {
      const [ingredientName] = key.split('|')

      // Apply unit normalization and smart rounding
      const normalized = normalizeAndRound(data.quantity, data.unit)

      return {
        shoppingListId,
        itemName: ingredientName.charAt(0).toUpperCase() + ingredientName.slice(1), // Capitalize
        quantity: normalized.quantity,
        unit: normalized.unit,
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
      console.log(`🔷 Auto-categorizing ${uncategorizedItems.length} items...`)

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

        const categoryNames = userCategories.map(c => c.name)

        // PHASE 1: Try lookup table first for each item
        const lookupResults: { item: typeof uncategorizedItems[0], category: string | null }[] = []
        const needsAI: typeof uncategorizedItems = []

        for (const item of uncategorizedItems) {
          const lookupResult = lookupCategory(item.itemName)
          if (lookupResult) {
            // Map lookup result to user's category names (case-insensitive match)
            const matchedCategory = categoryNames.find(
              cat => cat.toLowerCase() === lookupResult.toLowerCase()
            )
            if (matchedCategory) {
              lookupResults.push({ item, category: matchedCategory })
              console.log(`📋 Lookup: "${item.itemName}" → ${matchedCategory}`)
            } else {
              // Lookup found a category but user doesn't have it - use AI
              needsAI.push(item)
              console.log(`📋 Lookup: "${item.itemName}" → ${lookupResult} (not in user categories, using AI)`)
            }
          } else {
            needsAI.push(item)
            console.log(`📋 Lookup: "${item.itemName}" → not found, using AI`)
          }
        }

        console.log(`🔷 Lookup resolved ${lookupResults.length} items, ${needsAI.length} need AI`)

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
          console.log(`🔷 Using AI to categorize ${needsAI.length} items...`)

          // Pre-process item names for better AI results
          const processedItems = needsAI.map(item => ({
            original: item.itemName,
            processed: preprocessForAI(item.itemName),
          }))

          // Build category guidance dynamically based on user's actual categories
          const categoryExamples: Record<string, string> = {
            'Fresh Produce': 'Fresh fruit, vegetables, fresh herbs. Examples: apples, carrots, broccoli, fresh mint, fresh basil, fresh coriander, lettuce, tomatoes, ONIONS, GARLIC, GINGER, lemons, limes, spinach, PEPPERS (bell peppers), chillies, mushrooms, avocado, celery, cucumber, courgette',
            'Meat & Fish': 'Fresh and frozen RAW meat, poultry, fish, and seafood. Examples: chicken breast, CHICKEN THIGHS, minced beef, GROUND BEEF, pork chops, salmon fillets, prawns, lamb, bacon, SAUSAGES, cod, tuna steaks, duck, turkey',
            'Dairy & Eggs': 'Milk, cheese, yoghurt, cream, butter, and EGGS. Examples: milk, GREEK YOGURT, SOURED CREAM, cheddar cheese, PARMESAN, MOZZARELLA, FETA, RICOTTA, double cream, BUTTER, eggs, crème fraîche, cottage cheese, mascarpone',
            'Bakery': 'Bread, rolls, pastries, baked goods, and flatbreads. Examples: bread, rolls, croissants, bagels, pitta bread, NAAN BREAD, TORTILLA WRAPS, ROTI, crumpets, baguettes, ciabatta',
            'Chilled & Deli': 'Fresh ready meals, deli meats, fresh pasta, dips, cooked meats. Examples: ham, salami, FRESH PASTA, GNOCCHI, PESTO, HUMMUS, GUACAMOLE, coleslaw, fresh soup, quiche, COOKED CHICKEN, TOFU, sun-dried tomatoes, olives',
            'Frozen': 'FROZEN foods only - must have "frozen" in name or be ice cream. Examples: frozen peas, frozen chips, ICE CREAM, frozen pizza, FROZEN BERRIES, fish fingers, frozen pastry',
            'Cupboard Staples': 'Tinned goods, DRIED pasta, rice, noodles, stock, sauces, condiments, honey, jam. Examples: tinned tomatoes, CHOPPED TOMATOES, PASSATA, chickpeas, kidney beans, PASTA, RICE, NOODLES, SOY SAUCE, STOCK CUBES, CHICKEN STOCK, coconut milk, HONEY, MAPLE SYRUP, MUSTARD, vinegar, peanut butter, lentils',
            'Baking & Cooking Ingredients': 'Flour, sugar, baking powder, SPICES, SEASONINGS, OILS, dried herbs. Examples: plain flour, sugar, BROWN SUGAR, SALT, PEPPER, PAPRIKA, CUMIN, CARDAMOM, cinnamon, OLIVE OIL, vegetable oil, vanilla extract, baking powder, cornflour, DRIED OREGANO, garlic powder, chilli powder, curry powder, garam masala',
            'Breakfast': 'Cereals, porridge, granola, breakfast bars. Examples: OATS, porridge oats, granola, muesli, Weetabix, breakfast bars, cereal',
            'Drinks': 'Beverages - juices, squash, tea, coffee, soft drinks. Examples: orange juice, apple juice, squash, tea bags, coffee, cola, sparkling water, cordial',
            'Snacks & Treats': 'Crisps, nuts for snacking, chocolate, sweets, biscuits. Examples: crisps, CASHEWS, almonds, chocolate, biscuits, popcorn, dried fruit',
            'Household': 'Non-food items for home. Examples: kitchen roll, cling film, foil, washing up liquid, bin bags',
            'Other': 'ONLY use for items that genuinely do not fit ANY other category. Avoid using this.',
          }

          // Build the category list dynamically from user's categories
          const categoryDescriptions = categoryNames
            .map(name => {
              const example = categoryExamples[name] || 'General items for this category'
              return `**${name}**: ${example}`
            })
            .join('\n\n')

          // Build the improved AI prompt with explicit NEVER rules
          const prompt = `You are a UK supermarket assistant categorising shopping list items.
Use British English spelling and UK grocery store conventions.

AVAILABLE CATEGORIES (use ONLY these exact names):
${categoryDescriptions}

ITEMS TO CATEGORISE:
${processedItems.map((item, idx) => `${idx + 1}. "${item.processed}"`).join('\n')}

CRITICAL RULES - READ CAREFULLY:

DO put in FRESH PRODUCE:
- All fresh vegetables: onions, garlic, peppers (bell peppers), tomatoes, potatoes, carrots, celery, mushrooms, courgettes, aubergines
- All fresh fruit: apples, bananas, lemons, limes, oranges, berries
- All FRESH herbs: fresh mint, fresh basil, fresh coriander, fresh parsley, ginger root
- Avocados, bean sprouts, spring onions, shallots

DO put in MEAT & FISH:
- ALL raw chicken (breast, thigh, drumstick, whole)
- ALL raw beef (mince, steak, joint)
- ALL raw pork, lamb, sausages, bacon
- ALL raw fish and seafood

DO put in DAIRY & EGGS:
- ALL eggs (eggs, large eggs, medium eggs)
- ALL yoghurt (Greek yogurt, natural yogurt)
- ALL cream (soured cream, double cream, heavy cream)
- ALL cheese (parmesan, mozzarella, feta, ricotta, cheddar)
- Butter, milk

DO put in CUPBOARD STAPLES:
- ALL tinned/canned goods (chopped tomatoes, chickpeas, beans, tinned fish)
- ALL dried pasta, rice, noodles, lentils
- ALL stock (chicken stock, beef stock, stock cubes, broth)
- Coconut milk, passata, soy sauce, honey, maple syrup, jam

DO put in BAKING & COOKING INGREDIENTS:
- ALL flour (plain, self-raising)
- ALL sugar (white, brown, caster)
- ALL spices (paprika, cumin, cinnamon, curry powder, garam masala)
- ALL dried herbs (dried oregano, dried basil)
- ALL cooking oils (olive oil, vegetable oil, sesame oil)
- Salt, pepper, baking powder, vanilla extract

DO put in BAKERY:
- Bread, rolls, naan, pitta, tortillas, wraps, roti

DO put in CHILLED & DELI:
- Fresh pasta, gnocchi, pesto, hummus, guacamole
- Cooked/prepared chicken, deli meats
- Tofu, sun-dried tomatoes

NEVER put vegetables like onions, garlic, peppers, tomatoes in Baking & Cooking Ingredients
NEVER put raw meat/chicken in Chilled & Deli (that's for COOKED meats only)
NEVER put eggs in Fresh Produce - eggs go in Dairy & Eggs
NEVER put dried pasta/rice in Baking & Cooking Ingredients - they go in Cupboard Staples
NEVER put stock/broth in Baking & Cooking Ingredients - they go in Cupboard Staples
NEVER put fresh vegetables in Cupboard Staples

Respond with ONLY a JSON array of category names in the exact order as the items above.
Use the EXACT category names from the list. Example: ["Fresh Produce", "Cupboard Staples", "Dairy & Eggs"]`

          console.log(`🔷 AI prompt built, sending ${needsAI.length} items to Claude...`)

          const message = await client.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 4096,
            temperature: 0, // Lower temperature for more consistent results
            messages: [{ role: 'user', content: prompt }],
          })

          const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
          console.log(`🔷 AI response received, parsing...`)

          const jsonMatch = responseText.match(/\[[\s\S]*\]/)

          if (jsonMatch) {
            const suggestedCategories = JSON.parse(jsonMatch[0]) as string[]

            // PHASE 3: Validate and correct AI suggestions using keyword rules
            const updates = needsAI.map((item, idx) => {
              const aiSuggested = suggestedCategories[idx] || 'Other'

              // Match to user's category names (case-insensitive)
              let matchedCategory = categoryNames.find(
                cat => cat.toLowerCase() === aiSuggested.toLowerCase()
              ) || 'Other'

              // Apply validation/correction rules
              const validatedCategory = validateCategory(item.itemName, matchedCategory)
              if (validatedCategory !== matchedCategory) {
                // Check if validated category exists in user's categories
                const validatedMatch = categoryNames.find(
                  cat => cat.toLowerCase() === validatedCategory.toLowerCase()
                )
                if (validatedMatch) {
                  console.log(`🔧 Corrected: "${item.itemName}" from ${matchedCategory} → ${validatedMatch}`)
                  matchedCategory = validatedMatch
                }
              }

              console.log(`🤖 AI: "${item.itemName}" → ${matchedCategory}`)

              return prisma.shoppingListItem.update({
                where: { id: item.id },
                data: { category: matchedCategory },
              })
            })

            await Promise.all(updates)
            console.log(`🟢 AI categorized ${needsAI.length} items`)
          } else {
            console.warn('⚠️ AI response did not contain valid JSON array')
          }
        }

        console.log(`🟢 Auto-categorization complete: ${lookupResults.length} from lookup, ${needsAI.length} from AI`)
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

    // TODO: TEMPORARY - Deduplication report for testing (remove when done)
    const dedupeReport: Array<{
      normalizedName: string
      originalItems: Array<{ name: string; qty: number; unit: string }>
      result: { name: string; qty: number; unit: string }
      method: 'units-compatible' | 'ai-combined'
    }> = []

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

          // Apply unit normalization and smart rounding to combined result
          const normalizedCombined = normalizeAndRound(combinedQuantity, combinedUnit)

          await prisma.shoppingListItem.update({
            where: { id: keepItem.id },
            data: {
              itemName: finalItemName,
              quantity: normalizedCombined.quantity,
              unit: normalizedCombined.unit,
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

          // TODO: TEMPORARY - Add to dedupe report for testing
          dedupeReport.push({
            normalizedName: group.normalizedName,
            originalItems: groupItems.map(i => ({ name: i.itemName, qty: i.quantity, unit: i.unit })),
            result: { name: finalItemName, qty: normalizedCombined.quantity, unit: normalizedCombined.unit },
            method: allCompatible ? 'units-compatible' : 'ai-combined',
          })

          console.log(`🟢 Combined ${groupItems.length} "${group.normalizedName}" items`)
        } catch (groupError) {
          console.warn(`⚠️ Failed to combine group ${group.normalizedName}:`, groupError)
        }
      }

      console.log(`🟢 Auto-deduplication complete: combined ${totalCombined} items, removed ${totalDeleted} duplicates`)

      // TODO: TEMPORARY - Print detailed dedupe report for testing
      if (dedupeReport.length > 0) {
        console.log('\n' + '='.repeat(80))
        console.log('📋 DEDUPLICATION REPORT (TEMPORARY - remove when done testing)')
        console.log('='.repeat(80))
        for (const entry of dedupeReport) {
          console.log(`\n🔗 Normalized name: "${entry.normalizedName}" (${entry.method})`)
          console.log('   Original items:')
          for (const item of entry.originalItems) {
            console.log(`     - "${item.name}": ${item.qty} ${item.unit}`)
          }
          console.log(`   → Combined to: "${entry.result.name}": ${entry.result.qty} ${entry.result.unit}`)
        }
        console.log('\n' + '='.repeat(80) + '\n')
      }
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
