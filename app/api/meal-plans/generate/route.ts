import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'
import { startOfWeek, endOfWeek, subWeeks, addDays } from 'date-fns'
import { DEFAULT_SETTINGS } from '@/lib/types/meal-plan-settings'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStartDate, weekProfileSchedules, quickOptions } = await req.json()

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'Week start date is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Fetching data for meal plan generation...')

    // Fetch user's profiles, recipes, settings, recipe history, and inventory
    const [profiles, recipes, settingsRecord, recipeHistory, inventory] = await Promise.all([
      prisma.familyProfile.findMany({
        where: { userId: session.user.id }
      }),
      prisma.recipe.findMany({
        where: {
          userId: session.user.id,
          isArchived: false
        },
        include: {
          ingredients: true
        },
        take: 50 // Limit to prevent token overflow
      }),
      prisma.mealPlanSettings.findUnique({
        where: { userId: session.user.id }
      }),
      prisma.recipeUsageHistory.findMany({
        where: {
          userId: session.user.id,
          usedDate: { gte: subWeeks(new Date(weekStartDate), 4) } // Last 4 weeks
        },
        include: {
          recipe: true
        },
        orderBy: { usedDate: 'desc' }
      }),
      prisma.inventoryItem.findMany({
        where: { userId: session.user.id }
      })
    ])

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: 'Please add some recipes before generating a meal plan' },
        { status: 400 }
      )
    }

    // Convert database settings to MealPlanSettings interface, or use defaults
    const settings = settingsRecord
      ? {
          macroMode: settingsRecord.macroMode as any,
          varietyEnabled: settingsRecord.varietyEnabled,
          dinnerCooldown: settingsRecord.dinnerCooldown,
          lunchCooldown: settingsRecord.lunchCooldown,
          breakfastCooldown: settingsRecord.breakfastCooldown,
          snackCooldown: settingsRecord.snackCooldown,
          minCuisines: settingsRecord.minCuisines,
          maxSameCuisine: settingsRecord.maxSameCuisine,
          shoppingMode: settingsRecord.shoppingMode as any,
          expiryPriority: settingsRecord.expiryPriority as any,
          expiryWindow: settingsRecord.expiryWindow,
          useItUpItems: settingsRecord.useItUpItems,
          batchCookingEnabled: settingsRecord.batchCookingEnabled,
          maxLeftoverDays: settingsRecord.maxLeftoverDays,
          priorityOrder: settingsRecord.priorityOrder as any,
          feedbackDetail: settingsRecord.feedbackDetail as any
        }
      : DEFAULT_SETTINGS

    console.log('🟢 Data fetched:', {
      profiles: profiles.length,
      recipes: recipes.length,
      historyRecords: recipeHistory.length,
      inventoryItems: inventory.length,
      hasSettings: !!settingsRecord
    })

    // Generate meal plan using Claude with all advanced features
    const generatedPlan = await generateMealPlan({
      profiles,
      recipes,
      weekStartDate,
      weekProfileSchedules, // Pass per-person schedules for week
      settings,
      recipeHistory: recipeHistory.map(h => ({
        id: h.id,
        userId: h.userId,
        recipeId: h.recipeId,
        mealPlanId: h.mealPlanId,
        usedDate: h.usedDate,
        mealType: h.mealType,
        wasManual: h.wasManual,
        createdAt: h.createdAt
      })),
      inventory,
      quickOptions
    })

    // Create a set of valid recipe IDs for validation
    const validRecipeIds = new Set(recipes.map(r => r.id))

    // Validate and clean up meals - only include valid recipe IDs
    console.log('🔍 AI Response - Checking for batch cooking data...')
    const validatedMeals = generatedPlan.meals.map((meal: any) => {
      const recipeId = meal.recipeId && validRecipeIds.has(meal.recipeId) ? meal.recipeId : null

      if (meal.recipeId && !recipeId) {
        console.warn(`⚠️ Claude suggested invalid recipe ID: ${meal.recipeId} for ${meal.recipeName}`)
      }

      // Log batch cooking info
      if (meal.isLeftover) {
        console.log(`🍲 LEFTOVER DETECTED: ${meal.dayOfWeek} ${meal.mealType} - ${meal.recipeName} (source: ${meal.batchCookSourceDay})`)
      }

      return {
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeId,
        recipeName: meal.recipeName || null,
        notes: meal.notes || null,
        isLeftover: meal.isLeftover || false,
        batchCookSourceDay: meal.batchCookSourceDay || null,
      }
    })

    console.log(`📊 Batch cooking summary: ${validatedMeals.filter((m: any) => m.isLeftover).length} leftover meals out of ${validatedMeals.length} total`)

    // Calculate servings based on who's eating each meal
    console.log('🧮 Calculating servings for all meals...')
    const mealsWithServings = calculateServingsForMeals(validatedMeals, weekProfileSchedules || [])

    // Filter out meals with 0 servings (no one eating)
    const finalMeals = filterZeroServingMeals(mealsWithServings)

    console.log(`✅ Created ${finalMeals.length} meals (filtered ${mealsWithServings.length - finalMeals.length} with 0 servings)`)

    // Create the meal plan in database (first pass - without leftover linkage)
    const weekStart = new Date(weekStartDate)
    const weekEnd = endOfWeek(weekStart)

    console.log(`💾 Creating meal plan with ${finalMeals.filter((m: any) => m.isLeftover).length} leftover meals...`)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        status: 'Draft',
        customSchedule: weekProfileSchedules || null, // Store per-person schedules as JSON
        meals: {
          create: finalMeals.map((meal: any) => {
            const mealData = {
              dayOfWeek: meal.dayOfWeek,
              mealType: meal.mealType,
              recipeId: meal.recipeId,
              recipeName: meal.recipeName,
              servings: meal.servings,
              servingsManuallySet: meal.servingsManuallySet || false,
              notes: meal.notes,
              isLeftover: meal.isLeftover || false,
              isLocked: false
            }

            if (mealData.isLeftover) {
              console.log(`💾 Saving leftover: ${mealData.dayOfWeek} ${mealData.mealType} - ${mealData.recipeName}`)
            }

            return mealData
          })
        }
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    // Second pass: Link leftover meals to their source meals
    console.log('🔗 Linking leftover meals to batch cook sources...')
    const leftoverMeals = finalMeals.filter((m: any) => m.isLeftover && m.batchCookSourceDay)

    for (const leftoverMeal of leftoverMeals) {
      // Find the source meal (same recipe, same meal type, on the source day)
      const sourceMeal = mealPlan.meals.find(m =>
        m.dayOfWeek === leftoverMeal.batchCookSourceDay &&
        m.mealType === leftoverMeal.mealType &&
        m.recipeId === leftoverMeal.recipeId &&
        !m.isLeftover
      )

      if (sourceMeal) {
        // Find the leftover meal in the created plan
        const createdLeftoverMeal = mealPlan.meals.find(m =>
          m.dayOfWeek === leftoverMeal.dayOfWeek &&
          m.mealType === leftoverMeal.mealType &&
          m.recipeId === leftoverMeal.recipeId &&
          m.isLeftover
        )

        if (createdLeftoverMeal) {
          // Update the leftover meal with the source reference
          await prisma.meal.update({
            where: { id: createdLeftoverMeal.id },
            data: { leftoverFromMealId: sourceMeal.id }
          })
          console.log(`🔗 Linked ${leftoverMeal.dayOfWeek} ${leftoverMeal.mealType} to ${sourceMeal.dayOfWeek} batch cook`)
        }
      }
    }

    // Record recipe usage in history for cooldown tracking
    console.log('🔷 Recording recipe usage history...')
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const historyEntries = mealPlan.meals
      .filter(meal => meal.recipeId) // Only record meals with actual recipes
      .map(meal => {
        // Calculate the actual date for this meal
        const dayIndex = daysOfWeek.indexOf(meal.dayOfWeek)
        const mealDate = addDays(weekStart, dayIndex)

        return {
          userId: session.user.id,
          recipeId: meal.recipeId!,
          mealPlanId: mealPlan.id,
          usedDate: mealDate,
          mealType: meal.mealType,
          wasManual: false // Set to true if user manually placed this recipe later
        }
      })

    if (historyEntries.length > 0) {
      await prisma.recipeUsageHistory.createMany({
        data: historyEntries,
        skipDuplicates: true
      })
      console.log(`🟢 Recorded ${historyEntries.length} recipe usage history entries`)
    }

    return NextResponse.json({
      mealPlan,
      summary: generatedPlan.summary
    })
  } catch (error: any) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}
