import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'
import { validateMealPlan } from '@/lib/meal-plan-validation'
import { subWeeks } from 'date-fns'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify ownership and get existing plan
    const existingPlan = await prisma.mealPlan.findFirst({
      where: {
        id,
        userId: session.user.id
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    if (!existingPlan) {
      return NextResponse.json(
        { error: 'Meal plan not found' },
        { status: 404 }
      )
    }

    if (existingPlan.status !== 'Draft') {
      return NextResponse.json(
        { error: 'Can only regenerate Draft meal plans' },
        { status: 400 }
      )
    }

    // Get locked meals to preserve
    const lockedMeals = existingPlan.meals.filter(m => m.isLocked)

    // Fetch user's profiles, recipes, settings, and recipe history
    const [profiles, recipes, settingsRecord, recipeHistory] = await Promise.all([
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
        take: 50
      }),
      prisma.mealPlanSettings.findUnique({
        where: { userId: session.user.id }
      }),
      prisma.recipeUsageHistory.findMany({
        where: {
          userId: session.user.id,
          usedDate: { gte: subWeeks(new Date(existingPlan.weekStartDate), 4) } // Last 4 weeks
        },
        orderBy: { usedDate: 'desc' }
      })
    ])

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: 'Please add some recipes before regenerating' },
        { status: 400 }
      )
    }

    // Convert database settings or use defaults
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
      : {
          macroMode: 'balanced' as any,
          varietyEnabled: true,
          dinnerCooldown: 14,
          lunchCooldown: 7,
          breakfastCooldown: 3,
          snackCooldown: 2,
          minCuisines: 3,
          maxSameCuisine: 2,
          shoppingMode: 'moderate' as any,
          expiryPriority: 'moderate' as any,
          expiryWindow: 5,
          useItUpItems: [],
          batchCookingEnabled: true,
          maxLeftoverDays: 4,
          priorityOrder: ['macros', 'ratings', 'variety', 'shopping', 'prep', 'time'] as any,
          feedbackDetail: 'medium' as any
        }

    // Generate new meal plan with validation and retry logic
    const MAX_RETRIES = 3
    let generatedPlan: any = null
    let validationResult: any = null
    let attemptCount = 0

    console.log('🔷 Starting meal plan regeneration with validation...')

    while (attemptCount < MAX_RETRIES) {
      attemptCount++
      console.log(`\n🔄 Regeneration attempt ${attemptCount}/${MAX_RETRIES}...`)

      try {
        // Generate new meal plan with Claude
        generatedPlan = await generateMealPlan({
          profiles,
          recipes,
          weekStartDate: existingPlan.weekStartDate.toISOString(),
          weekProfileSchedules: existingPlan.customSchedule as any,
          settings,
          recipeHistory: recipeHistory.map((h) => ({
            id: h.id,
            userId: h.userId,
            recipeId: h.recipeId,
            mealPlanId: h.mealPlanId,
            usedDate: h.usedDate,
            mealType: h.mealType,
            wasManual: h.wasManual,
            createdAt: h.createdAt
          })),
          inventory: []
        })

        console.log(`✅ Meal plan generated with ${generatedPlan.meals.length} meals`)

        // Validate the generated plan
        console.log('🔍 Validating meal plan...')
        validationResult = validateMealPlan(
          generatedPlan.meals,
          settings,
          existingPlan.weekStartDate.toISOString(),
          recipeHistory.map((h) => ({
            recipeId: h.recipeId,
            usedDate: h.usedDate,
            mealType: h.mealType
          }))
        )

        // Log validation results
        if (validationResult.warnings.length > 0) {
          console.log('⚠️  Validation warnings:')
          validationResult.warnings.forEach((w: string) => console.log(`   - ${w}`))
        }

        if (validationResult.errors.length > 0) {
          console.log('❌ Validation errors:')
          validationResult.errors.forEach((e: string) => console.log(`   - ${e}`))
        }

        // Check if validation passed
        if (validationResult.isValid) {
          console.log('✅ Validation passed!')
          break // Exit retry loop
        } else {
          console.log(`❌ Validation failed on attempt ${attemptCount}/${MAX_RETRIES}`)
          if (attemptCount < MAX_RETRIES) {
            console.log('🔄 Retrying generation...')
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        console.error(`❌ Error during regeneration attempt ${attemptCount}:`, error)
        if (attemptCount >= MAX_RETRIES) {
          throw error
        }
      }
    }

    // If validation still failed after all retries, return error
    if (!validationResult || !validationResult.isValid) {
      console.error('❌ Failed to regenerate valid meal plan after', MAX_RETRIES, 'attempts')
      return NextResponse.json(
        {
          error: 'Failed to regenerate a valid meal plan that respects cooldown periods and batch cooking rules',
          validationErrors: validationResult?.errors || [],
          suggestion: 'Try adjusting your meal plan settings or add more recipes to your library'
        },
        { status: 400 }
      )
    }

    console.log('🎉 Successfully regenerated and validated meal plan!')

    // Validate recipe IDs
    const validRecipeIds = new Set(recipes.map(r => r.id))
    const validatedMeals = generatedPlan.meals.map((meal: any) => {
      const recipeId = meal.recipeId && validRecipeIds.has(meal.recipeId) ? meal.recipeId : null

      if (meal.recipeId && !recipeId) {
        console.warn(`⚠️ Claude suggested invalid recipe ID: ${meal.recipeId} for ${meal.recipeName}`)
      }

      return {
        dayOfWeek: meal.dayOfWeek,
        mealType: meal.mealType,
        recipeId,
        recipeName: meal.recipeName || null,
        servings: meal.servings || null,
        notes: meal.notes || null,
        isLocked: false
      }
    })

    // Filter out meals that conflict with locked meals
    const lockedMealKeys = new Set(
      lockedMeals.map(m => `${m.dayOfWeek}-${m.mealType}`)
    )

    const newMeals = validatedMeals.filter((meal: any) =>
      !lockedMealKeys.has(`${meal.dayOfWeek}-${meal.mealType}`)
    )

    console.log(`✅ Regenerated ${newMeals.length} meals, preserving ${lockedMeals.length} locked meals`)

    // Delete existing unlocked meals
    await prisma.meal.deleteMany({
      where: {
        mealPlanId: id,
        isLocked: false
      }
    })

    // Create new meals
    await prisma.meal.createMany({
      data: newMeals.map((meal: any) => ({
        mealPlanId: id,
        ...meal
      }))
    })

    // Fetch updated meal plan
    const updatedPlan = await prisma.mealPlan.findUnique({
      where: { id },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    return NextResponse.json({
      mealPlan: updatedPlan,
      summary: generatedPlan.summary
    })
  } catch (error: any) {
    console.error('Error regenerating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate meal plan' },
      { status: 500 }
    )
  }
}
