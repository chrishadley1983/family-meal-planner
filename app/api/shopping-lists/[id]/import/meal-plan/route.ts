import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { convertToMetric } from '@/lib/unit-conversion'
import { SourceDetail } from '@/lib/types/shopping-list'

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

    return NextResponse.json({
      message: `Successfully imported ${result.count} ingredient${result.count !== 1 ? 's' : ''} from ${mealsProcessed} meal${mealsProcessed !== 1 ? 's' : ''}`,
      importedCount: result.count,
      mealsProcessed,
      leftoverMealsSkipped,
      items: createdItems,
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
