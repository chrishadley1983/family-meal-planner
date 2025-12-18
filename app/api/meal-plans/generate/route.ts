import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMealPlan } from '@/lib/claude'
import { calculateServingsForMeals, filterZeroServingMeals } from '@/lib/meal-utils'
import { startOfWeek, subWeeks, addDays } from 'date-fns'
import { DEFAULT_SETTINGS, MealPlanSettings, WeeklyNutritionalSummary } from '@/lib/types/meal-plan-settings'
import { validateMealPlan } from '@/lib/meal-plan-validation'
import {
  filterRecipesForMacroFeasibility,
  calculateAverageDailyMacros,
  buildFilteringSummary,
  RecipeForFilter
} from '@/lib/recipe-macro-filter'

/**
 * Detect patterns in custom instructions that suggest repeated meals
 * and adjust cooldown settings accordingly to prevent AI conflicts.
 * Also returns meal types that should skip batch cooking validation
 * (since user explicitly wants the same meal multiple times, not leftovers).
 */
function adjustCooldownsForCustomInstructions(
  settings: MealPlanSettings,
  customInstructions: string | undefined,
  recipes: any[],
  linkedRecipes?: Array<{ id: string; name: string }>
): {
  adjustedSettings: MealPlanSettings
  adjustments: string[]
  skipBatchCookingForMealTypes: string[] // Meal types where repeated recipes should NOT require batch cooking setup
} {
  const adjustments: string[] = []
  const skipBatchCookingForMealTypes: string[] = []

  // If no custom instructions and no linked recipes, nothing to adjust
  if (!customInstructions && (!linkedRecipes || linkedRecipes.length === 0)) {
    return { adjustedSettings: settings, adjustments, skipBatchCookingForMealTypes }
  }

  const instructionsLower = (customInstructions || '').toLowerCase()

  // Patterns that indicate wanting the same meal every day or frequently
  const everyDayPatterns = [
    /every\s*day/i,
    /daily/i,
    /each\s*day/i,
    /all\s*week/i,
    /every\s*morning/i,
    /every\s*night/i,
    /all\s*7\s*days/i,
    /seven\s*days/i,
  ]

  // Patterns that indicate wanting specific days (2+ mentions)
  const multipleDayPatterns = [
    /monday\s*(?:and|,)\s*(?:tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /tuesday\s*(?:and|,)\s*(?:monday|wednesday|thursday|friday|saturday|sunday)/i,
    /wednesday\s*(?:and|,)\s*(?:monday|tuesday|thursday|friday|saturday|sunday)/i,
    /thursday\s*(?:and|,)\s*(?:monday|tuesday|wednesday|friday|saturday|sunday)/i,
    /friday\s*(?:and|,)\s*(?:monday|tuesday|wednesday|thursday|saturday|sunday)/i,
    /multiple\s*days/i,
    /several\s*days/i,
  ]

  // Detect if user mentions "every day" patterns
  const wantsEveryDay = everyDayPatterns.some(pattern => pattern.test(instructionsLower))
  const wantsMultipleDays = multipleDayPatterns.some(pattern => pattern.test(instructionsLower))

  // Try to detect which meal type is being requested
  let mealTypeDetected: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null = null

  if (/breakfast|morning|porridge|cereal|oatmeal|eggs?\s+(?:every|daily)/i.test(instructionsLower)) {
    mealTypeDetected = 'breakfast'
  } else if (/lunch|midday/i.test(instructionsLower)) {
    mealTypeDetected = 'lunch'
  } else if (/dinner|supper|evening\s*meal/i.test(instructionsLower)) {
    mealTypeDetected = 'dinner'
  } else if (/snack/i.test(instructionsLower)) {
    mealTypeDetected = 'snack'
  }

  // If no meal type detected but recipe name mentioned, try to infer from recipe
  if (!mealTypeDetected) {
    for (const recipe of recipes) {
      const recipeNameLower = recipe.recipeName?.toLowerCase() || ''
      if (instructionsLower.includes(recipeNameLower) && recipeNameLower.length > 3) {
        // Found a matching recipe - check its meal type
        const mealTypes = recipe.mealType || []
        if (mealTypes.includes('Breakfast')) {
          mealTypeDetected = 'breakfast'
        } else if (mealTypes.includes('Lunch')) {
          mealTypeDetected = 'lunch'
        } else if (mealTypes.includes('Dinner')) {
          mealTypeDetected = 'dinner'
        } else if (mealTypes.some((t: string) => t.toLowerCase().includes('snack'))) {
          mealTypeDetected = 'snack'
        }
        break
      }
    }
  }

  // Also check linked recipes to infer meal type (user selected specific recipe via autocomplete)
  // KEY: When a user links a specific recipe, they WANT that recipe used.
  // If the recipe appears multiple times, it's intentional - skip batch cooking validation for that meal type.
  const linkedRecipeMealTypes: Set<string> = new Set()

  if (linkedRecipes && linkedRecipes.length > 0) {
    for (const linked of linkedRecipes) {
      const fullRecipe = recipes.find(r => r.id === linked.id)
      if (fullRecipe) {
        const mealTypes = fullRecipe.mealType || []
        let linkedMealType: 'breakfast' | 'lunch' | 'dinner' | 'snack' | null = null

        if (mealTypes.includes('Breakfast')) {
          linkedMealType = 'breakfast'
        } else if (mealTypes.includes('Lunch')) {
          linkedMealType = 'lunch'
        } else if (mealTypes.includes('Dinner')) {
          linkedMealType = 'dinner'
        } else if (mealTypes.some((t: string) => t.toLowerCase().includes('snack'))) {
          linkedMealType = 'snack'
        }

        if (linkedMealType) {
          console.log(`🔍 Detected meal type from linked recipe "${linked.name}": ${linkedMealType}`)
          linkedRecipeMealTypes.add(linkedMealType)

          // If no meal type detected yet from text, use this one
          if (!mealTypeDetected) {
            mealTypeDetected = linkedMealType
          }
        }
      }
    }
  }

  // Debug logging
  console.log(`🔍 Cooldown detection - wantsEveryDay: ${wantsEveryDay}, wantsMultipleDays: ${wantsMultipleDays}, mealTypeDetected: ${mealTypeDetected}`)
  console.log(`🔍 Instructions: "${instructionsLower}"`)
  console.log(`🔍 Linked recipes: ${linkedRecipes?.map(r => r.name).join(', ') || 'none'}`)
  console.log(`🔍 Linked recipe meal types: ${Array.from(linkedRecipeMealTypes).join(', ') || 'none'}`)

  // Create adjusted settings
  const adjustedSettings = { ...settings }

  // IMPORTANT: If user linked specific recipes, ALWAYS skip batch cooking validation for those meal types
  // This handles the case where user selects "Standard Porridge" without saying "every day" in text
  // The fact that they linked a specific recipe means they want it used, even if multiple times
  if (linkedRecipeMealTypes.size > 0) {
    linkedRecipeMealTypes.forEach(mealType => {
      if (mealType === 'breakfast') {
        skipBatchCookingForMealTypes.push('breakfast')
        adjustments.push(`Skipping batch cooking validation for breakfast (linked recipe detected)`)
      } else if (mealType === 'lunch') {
        skipBatchCookingForMealTypes.push('lunch')
        adjustments.push(`Skipping batch cooking validation for lunch (linked recipe detected)`)
      } else if (mealType === 'dinner') {
        skipBatchCookingForMealTypes.push('dinner')
        adjustments.push(`Skipping batch cooking validation for dinner (linked recipe detected)`)
      } else if (mealType === 'snack') {
        skipBatchCookingForMealTypes.push('snack', 'morning-snack', 'afternoon-snack', 'evening-snack')
        adjustments.push(`Skipping batch cooking validation for snacks (linked recipe detected)`)
      }
    })
    console.log(`🔍 Added skip batch cooking for linked recipe meal types: ${Array.from(linkedRecipeMealTypes).join(', ')}`)
  }

  if (wantsEveryDay || wantsMultipleDays) {
    // User wants repeated meals - ALWAYS skip batch cooking validation for the detected meal type
    // Also adjust cooldown if needed (but skip validation regardless of current cooldown value)
    if (mealTypeDetected === 'breakfast') {
      skipBatchCookingForMealTypes.push('breakfast')
      if (adjustedSettings.breakfastCooldown > 1) {
        adjustedSettings.breakfastCooldown = 1
        adjustments.push(`Reduced breakfast cooldown from ${settings.breakfastCooldown} to 1 day (user requested repeated breakfast)`)
      } else {
        adjustments.push(`Skipping batch cooking validation for breakfast (user requested repeated breakfast, cooldown already at ${settings.breakfastCooldown})`)
      }
    } else if (mealTypeDetected === 'lunch') {
      skipBatchCookingForMealTypes.push('lunch')
      if (adjustedSettings.lunchCooldown > 1) {
        adjustedSettings.lunchCooldown = 1
        adjustments.push(`Reduced lunch cooldown from ${settings.lunchCooldown} to 1 day (user requested repeated lunch)`)
      } else {
        adjustments.push(`Skipping batch cooking validation for lunch (user requested repeated lunch, cooldown already at ${settings.lunchCooldown})`)
      }
    } else if (mealTypeDetected === 'dinner') {
      skipBatchCookingForMealTypes.push('dinner')
      if (adjustedSettings.dinnerCooldown > 1) {
        adjustedSettings.dinnerCooldown = 1
        adjustments.push(`Reduced dinner cooldown from ${settings.dinnerCooldown} to 1 day (user requested repeated dinner)`)
      } else {
        adjustments.push(`Skipping batch cooking validation for dinner (user requested repeated dinner, cooldown already at ${settings.dinnerCooldown})`)
      }
    } else if (mealTypeDetected === 'snack') {
      skipBatchCookingForMealTypes.push('snack', 'morning-snack', 'afternoon-snack', 'evening-snack')
      if (adjustedSettings.snackCooldown > 1) {
        adjustedSettings.snackCooldown = 1
        adjustments.push(`Reduced snack cooldown from ${settings.snackCooldown} to 1 day (user requested repeated snack)`)
      } else {
        adjustments.push(`Skipping batch cooking validation for snacks (user requested repeated snacks, cooldown already at ${settings.snackCooldown})`)
      }
    } else if (!mealTypeDetected) {
      // Could not detect meal type - reduce all cooldowns as a fallback
      // Skip batch cooking validation for all meal types
      skipBatchCookingForMealTypes.push('breakfast', 'lunch', 'dinner', 'snack', 'morning-snack', 'afternoon-snack', 'evening-snack')
      if (adjustedSettings.breakfastCooldown > 1) adjustedSettings.breakfastCooldown = 1
      if (adjustedSettings.lunchCooldown > 1) adjustedSettings.lunchCooldown = 1
      if (adjustedSettings.dinnerCooldown > 1) adjustedSettings.dinnerCooldown = 1
      if (adjustedSettings.snackCooldown > 1) adjustedSettings.snackCooldown = 1
      adjustments.push(`Skipping batch cooking validation for all meal types (user requested repeated meals but meal type was unclear)`)
    }
  }

  return { adjustedSettings, adjustments, skipBatchCookingForMealTypes }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { weekStartDate, weekProfileSchedules, quickOptions, customInstructions, linkedRecipes } = await req.json()

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'Week start date is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Fetching data for meal plan generation...')
    if (customInstructions) {
      console.log('🔷 Custom instructions provided:', customInstructions)
    }
    if (linkedRecipes && linkedRecipes.length > 0) {
      console.log('🔷 Linked recipes (must use):', linkedRecipes.map((r: any) => r.name).join(', '))
    }

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
        take: 1000 // Support large recipe libraries
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
    const baseSettings: MealPlanSettings = settingsRecord
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

    // Apply smart cooldown adjustments based on custom instructions
    // e.g., if user says "porridge every day", reduce breakfast cooldown to 1
    // Also returns meal types that should skip batch cooking validation
    const { adjustedSettings: settings, adjustments: cooldownAdjustments, skipBatchCookingForMealTypes } = adjustCooldownsForCustomInstructions(
      baseSettings,
      customInstructions,
      recipes,
      linkedRecipes // Pass linked recipes to detect meal type from selected recipes
    )

    if (cooldownAdjustments.length > 0) {
      console.log('🔧 Smart cooldown adjustments applied:')
      cooldownAdjustments.forEach(adj => console.log(`   - ${adj}`))
      if (skipBatchCookingForMealTypes.length > 0) {
        console.log(`   - Skipping batch cooking validation for: ${skipBatchCookingForMealTypes.join(', ')}`)
      }
    }

    console.log('🟢 Data fetched:', {
      profiles: profiles.length,
      recipes: recipes.length,
      historyRecords: recipeHistory.length,
      inventoryItems: inventory.length,
      hasSettings: !!settingsRecord
    })

    // Pre-filter recipes based on macro feasibility (only when macros is high priority)
    const avgDailyMacros = calculateAverageDailyMacros(
      profiles.map(p => ({
        macroTrackingEnabled: p.macroTrackingEnabled,
        dailyCalorieTarget: p.dailyCalorieTarget,
        dailyProteinTarget: p.dailyProteinTarget,
        dailyCarbsTarget: p.dailyCarbsTarget,
        dailyFatTarget: p.dailyFatTarget
      }))
    )

    // Detect if snacks are in the schedule (Option B1)
    // When snacks are present, B+L+D ranges are scaled to 80%
    let hasSnacksInPlan = false
    if (weekProfileSchedules && Array.isArray(weekProfileSchedules)) {
      hasSnacksInPlan = weekProfileSchedules.some((schedule: any) => {
        if (!schedule.dailyMeals) return false
        return Object.values(schedule.dailyMeals).some((dayMeals: any) => {
          if (!dayMeals) return false
          return Object.keys(dayMeals).some(mealType =>
            mealType.toLowerCase().includes('snack') || mealType.toLowerCase() === 'dessert'
          )
        })
      })
    }
    if (hasSnacksInPlan) {
      console.log('🍫 Snacks/desserts detected in schedule - B+L+D macro ranges will be scaled to 80%')
    }

    // Build Set of product recipe IDs for batch cooking validation exemption (Option C1)
    // Product-based recipes (e.g., protein bars) are grabbed from pantry, not batch cooked
    const productRecipeIds = new Set<string>(
      recipes.filter(r => r.isProductRecipe).map(r => r.id)
    )
    if (productRecipeIds.size > 0) {
      console.log(`📦 Found ${productRecipeIds.size} product-based recipes (exempt from batch cooking validation)`)
    }

    const recipesForFilter: RecipeForFilter[] = recipes.map(r => ({
      id: r.id,
      recipeName: r.recipeName,
      mealType: r.mealType || [],
      caloriesPerServing: r.caloriesPerServing,
      proteinPerServing: r.proteinPerServing,
      carbsPerServing: r.carbsPerServing,
      fatPerServing: r.fatPerServing
    }))

    const filterResult = filterRecipesForMacroFeasibility(
      recipesForFilter,
      avgDailyMacros.calories,
      settings.macroMode,
      settings.priorityOrder,
      avgDailyMacros.protein,
      avgDailyMacros.carbs,
      avgDailyMacros.fat,
      hasSnacksInPlan // Pass snack detection for 80% scaling
    )

    // Use filtered recipes for generation (or all if filtering was skipped/degraded)
    const filteredRecipeIds = new Set(filterResult.filteredRecipes.map(r => r.id))
    const recipesForGeneration = recipes.filter(r => filteredRecipeIds.has(r.id))

    // Log filtering results right after "Data fetched" for visibility
    console.log(`🍽️ Macro filter: ${recipesForGeneration.length}/${recipes.length} recipes kept (${filterResult.removedRecipes.length} filtered out)`)

    // Build filtering summary to include in AI prompt (if recipes were filtered)
    const filteringSummary = buildFilteringSummary(filterResult)

    // Generate meal plan using Claude with validation and retry logic
    const MAX_RETRIES = 3
    let generatedPlan: any = null
    let validationResult: any = null
    let attemptCount = 0
    let previousValidationErrors: string[] = [] // Track errors from previous attempts

    console.log('🔷 Starting meal plan generation with validation...')

    while (attemptCount < MAX_RETRIES) {
      attemptCount++
      console.log(`\n🔄 Generation attempt ${attemptCount}/${MAX_RETRIES}...`)

      try {
        // Generate meal plan using Claude with all advanced features
        // On retry attempts, include validation feedback from the previous failure
        // Use pre-filtered recipes (based on macro feasibility) when macros is high priority
        generatedPlan = await generateMealPlan({
          profiles,
          recipes: recipesForGeneration, // Use filtered recipes
          weekStartDate,
          weekProfileSchedules, // Pass per-person schedules for week
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
          inventory,
          quickOptions,
          customInstructions: filteringSummary
            ? `${customInstructions || ''}\n${filteringSummary}`.trim()
            : customInstructions, // Append filtering summary to instructions
          linkedRecipes, // Pass recipe IDs that MUST be used
          validationFeedback: previousValidationErrors.length > 0 ? previousValidationErrors : undefined // Pass errors from previous attempt
        })

        console.log(`✅ Meal plan generated with ${generatedPlan.meals.length} meals`)

        // Validate the generated plan
        console.log('🔍 Validating meal plan...')
        validationResult = validateMealPlan(
          generatedPlan.meals,
          settings,
          weekStartDate,
          recipeHistory.map((h) => ({
            recipeId: h.recipeId,
            usedDate: h.usedDate,
            mealType: h.mealType
          })),
          recipes.map((r) => ({
            id: r.id,
            recipeName: r.recipeName,
            mealType: r.mealType
          })),
          {
            allowDinnerForLunch: quickOptions?.allowDinnerForLunch ?? true, // Default to true
            skipBatchCookingForMealTypes, // Skip batch cooking validation for meal types where user requested repetition
            productRecipeIds, // Option C1: Skip batch cooking validation for product-based recipes
            // Pass profiles and recipes for macro validation
            profiles: profiles.map((p) => ({
              macroTrackingEnabled: p.macroTrackingEnabled,
              dailyCalorieTarget: p.dailyCalorieTarget,
              dailyProteinTarget: p.dailyProteinTarget,
              dailyCarbsTarget: p.dailyCarbsTarget,
              dailyFatTarget: p.dailyFatTarget
            })),
            recipesWithNutrition: recipes.map((r) => ({
              id: r.id,
              recipeName: r.recipeName,
              caloriesPerServing: r.caloriesPerServing,
              proteinPerServing: r.proteinPerServing,
              carbsPerServing: r.carbsPerServing,
              fatPerServing: r.fatPerServing
            }))
          }
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

        // Validate mandatory recipes were used (if any)
        if (linkedRecipes && linkedRecipes.length > 0) {
          console.log('🔍 Checking mandatory recipe usage...')
          const instructionsLower = (customInstructions || '').toLowerCase()
          const wantsEveryDay = /every\s*day|daily|each\s*day|all\s*week|every\s*morning|every\s*night|all\s*7\s*days|seven\s*days/.test(instructionsLower)

          for (const linked of linkedRecipes) {
            const usageCount = generatedPlan.meals.filter((m: any) => m.recipeId === linked.id).length

            if (usageCount === 0) {
              // Mandatory recipe not used at all - this is an error
              validationResult.isValid = false
              validationResult.errors.push(`Mandatory recipe "${linked.name}" was not used in the meal plan`)
              console.log(`❌ Mandatory recipe "${linked.name}" not used!`)
            } else if (wantsEveryDay && usageCount < 7) {
              // User wanted this recipe every day but AI didn't do it
              validationResult.isValid = false
              validationResult.errors.push(`Recipe "${linked.name}" was requested for every day but only used ${usageCount} times`)
              console.log(`❌ Recipe "${linked.name}" requested every day but only used ${usageCount} times`)
            } else {
              console.log(`✅ Mandatory recipe "${linked.name}" used ${usageCount} times`)
            }
          }
        }

        // Check if validation passed
        if (validationResult.isValid) {
          console.log('✅ Validation passed!')
          break // Exit retry loop
        } else {
          console.log(`❌ Validation failed on attempt ${attemptCount}/${MAX_RETRIES}`)
          // Store validation errors to pass to next attempt
          previousValidationErrors = [...validationResult.errors]
          console.log(`📋 Validation errors to pass to next attempt: ${previousValidationErrors.length}`)
          previousValidationErrors.forEach(e => console.log(`   - ${e}`))

          if (attemptCount < MAX_RETRIES) {
            console.log('🔄 Retrying generation with validation feedback...')
            // Wait a moment before retrying to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      } catch (error) {
        console.error(`❌ Error during generation attempt ${attemptCount}:`, error)
        if (attemptCount >= MAX_RETRIES) {
          throw error // Re-throw if we're out of retries
        }
      }
    }

    // If validation still failed after all retries, return error
    if (!validationResult || !validationResult.isValid) {
      console.error('❌ Failed to generate valid meal plan after', MAX_RETRIES, 'attempts')
      return NextResponse.json(
        {
          error: 'Failed to generate a valid meal plan that respects cooldown periods and batch cooking rules',
          validationErrors: validationResult?.errors || [],
          suggestion: 'Try adjusting your meal plan settings (reduce cooldown periods) or add more recipes to your library'
        },
        { status: 400 }
      )
    }

    console.log('🎉 Successfully generated and validated meal plan!')

    // Create a set of valid recipe IDs for validation
    const validRecipeIds = new Set(recipes.map((r) => r.id))

    // Track invalid recipes for warning generation
    const invalidRecipes: Array<{ recipeName: string; day: string; mealType: string }> = []

    // Track recovered recipes (fuzzy matched)
    const recoveredRecipes: Array<{ originalName: string; matchedName: string; day: string; mealType: string }> = []

    /**
     * Normalize a string for comparison:
     * - lowercase
     * - replace & with 'and'
     * - remove special characters except spaces
     * - collapse multiple spaces
     */
    function normalizeForComparison(str: string): string {
      return str
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    /**
     * Calculate word overlap between two strings
     * Returns a score from 0 to 1
     */
    function calculateWordOverlap(str1: string, str2: string): number {
      const words1 = new Set(normalizeForComparison(str1).split(' ').filter(w => w.length > 2))
      const words2 = new Set(normalizeForComparison(str2).split(' ').filter(w => w.length > 2))

      if (words1.size === 0 || words2.size === 0) return 0

      let matchCount = 0
      for (const word of words1) {
        if (words2.has(word)) matchCount++
      }

      // Use the smaller set size as denominator for more forgiving matching
      const denominator = Math.min(words1.size, words2.size)
      return matchCount / denominator
    }

    /**
     * Find a recipe by fuzzy name matching when the ID is invalid
     * Returns the matched recipe or null if no good match found
     */
    function findRecipeByFuzzyName(recipeName: string | null | undefined): typeof recipes[0] | null {
      if (!recipeName || recipeName.length < 3) return null

      const normalizedSearch = normalizeForComparison(recipeName)

      // Try exact match (case-insensitive, normalized)
      for (const recipe of recipes) {
        if (normalizeForComparison(recipe.recipeName) === normalizedSearch) {
          return recipe
        }
      }

      // Try contains match (one contains the other)
      for (const recipe of recipes) {
        const normalizedRecipe = normalizeForComparison(recipe.recipeName)
        if (normalizedRecipe.includes(normalizedSearch) || normalizedSearch.includes(normalizedRecipe)) {
          return recipe
        }
      }

      // Try word overlap matching (threshold: 70%)
      let bestMatch: typeof recipes[0] | null = null
      let bestScore = 0

      for (const recipe of recipes) {
        const score = calculateWordOverlap(recipeName, recipe.recipeName)
        if (score > bestScore && score >= 0.7) {
          bestScore = score
          bestMatch = recipe
        }
      }

      return bestMatch
    }

    // Define the type for validated meals
    interface ValidatedMeal {
      dayOfWeek: string
      mealType: string
      recipeId: string | null
      recipeName: string | null
      notes: string | null
      isLeftover: boolean
      batchCookSourceDay: string | null
    }

    // Validate and clean up meals - try fuzzy matching before excluding
    console.log('🔍 AI Response - Checking for batch cooking data...')
    const validatedMeals: ValidatedMeal[] = generatedPlan.meals
      .map((meal: any) => {
        const isValidRecipe = meal.recipeId && validRecipeIds.has(meal.recipeId)

        if (meal.recipeId && !isValidRecipe) {
          // Invalid recipe ID - try fuzzy matching by name
          console.warn(`⚠️ Invalid recipe ID: ${meal.recipeId} for "${meal.recipeName}" - attempting fuzzy match...`)

          const matchedRecipe = findRecipeByFuzzyName(meal.recipeName)

          if (matchedRecipe) {
            console.log(`✅ Fuzzy match found: "${meal.recipeName}" → "${matchedRecipe.recipeName}" (ID: ${matchedRecipe.id})`)
            recoveredRecipes.push({
              originalName: meal.recipeName || 'Unknown',
              matchedName: matchedRecipe.recipeName,
              day: meal.dayOfWeek,
              mealType: meal.mealType
            })
            // Return meal with corrected recipe ID
            return {
              ...meal,
              recipeId: matchedRecipe.id,
              recipeName: matchedRecipe.recipeName // Use the actual recipe name
            }
          } else {
            console.warn(`❌ No fuzzy match found for "${meal.recipeName}" - excluding from plan`)
            invalidRecipes.push({
              recipeName: meal.recipeName || 'Unknown recipe',
              day: meal.dayOfWeek,
              mealType: meal.mealType
            })
            return null // Mark for exclusion
          }
        }

        return meal // Keep valid meals as-is
      })
      .filter((meal: any) => meal !== null) // Remove excluded meals
      .map((meal: any) => {
        // Log batch cooking info
        if (meal.isLeftover) {
          console.log(`🍲 LEFTOVER DETECTED: ${meal.dayOfWeek} ${meal.mealType} - ${meal.recipeName} (source: ${meal.batchCookSourceDay})`)
        }

        return {
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
          recipeId: meal.recipeId,
          recipeName: meal.recipeName || null,
          notes: meal.notes || null,
          isLeftover: meal.isLeftover || false,
          batchCookSourceDay: meal.batchCookSourceDay || null,
        }
      })

    console.log(`📊 Batch cooking summary: ${validatedMeals.filter((m) => m.isLeftover).length} leftover meals out of ${validatedMeals.length} total`)

    // Log fuzzy match recovery stats
    if (recoveredRecipes.length > 0) {
      console.log(`🔧 Fuzzy match recovery: ${recoveredRecipes.length} recipe(s) recovered from invalid IDs:`)
      recoveredRecipes.forEach(r => console.log(`   - "${r.originalName}" → "${r.matchedName}" (${r.day} ${r.mealType})`))
    }
    if (invalidRecipes.length > 0) {
      console.log(`❌ Unrecoverable recipes: ${invalidRecipes.length} recipe(s) could not be matched:`)
      invalidRecipes.forEach(r => console.log(`   - "${r.recipeName}" (${r.day} ${r.mealType})`))
    }

    // Calculate servings based on who's eating each meal
    console.log('🧮 Calculating servings for all meals...')
    const mealsWithServings = calculateServingsForMeals(validatedMeals, weekProfileSchedules || [])

    // Filter out meals with 0 servings (no one eating)
    const finalMeals = filterZeroServingMeals(mealsWithServings)

    console.log(`✅ Created ${finalMeals.length} meals (filtered ${mealsWithServings.length - finalMeals.length} with 0 servings)`)

    // Create the meal plan in database (first pass - without leftover linkage or scaling)
    const weekStart = new Date(weekStartDate)
    const weekEnd = addDays(weekStart, 6) // 7-day week

    console.log(`💾 Creating meal plan with ${finalMeals.filter((m: any) => m.isLeftover).length} leftover meals...`)

    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: session.user.id,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        status: 'Draft',
        customSchedule: weekProfileSchedules || null, // Store per-person schedules as JSON
        meals: {
          create: finalMeals.map((meal) => {
            // Find the recipe to calculate scaling factor
            const recipe = recipes.find((r) => r.id === meal.recipeId)
            const scalingFactor = recipe && recipe.servings > 0
              ? meal.servings / recipe.servings
              : null

            const mealData = {
              dayOfWeek: meal.dayOfWeek,
              mealType: meal.mealType,
              recipeId: meal.recipeId,
              recipeName: meal.recipeName,
              servings: meal.servings,
              scalingFactor, // CRITICAL: Store scaling factor for shopping lists
              notes: meal.notes,
              isLeftover: meal.isLeftover || false,
              isLocked: false
            }

            // DEBUG: Log batch cooking meals to verify servings calculations
            if (meal.notes && meal.notes.includes('Batch cook')) {
              console.log(`🍳 BATCH COOK SOURCE: ${mealData.dayOfWeek} ${mealData.mealType} - ${mealData.recipeName}`)
              console.log(`   Servings: ${mealData.servings}`)
              console.log(`   Note: ${mealData.notes}`)
              console.log(`   Recipe servings: ${recipe?.servings || 'N/A'}`)
              console.log(`   Scaling factor: ${scalingFactor ? scalingFactor.toFixed(2) : 'N/A'}x`)
            }

            if (mealData.isLeftover) {
              console.log(`💾 Saving leftover: ${mealData.dayOfWeek} ${mealData.mealType} - ${mealData.recipeName}`)
            }

            if (scalingFactor) {
              console.log(`📏 Scaling factor for ${mealData.recipeName}: ${scalingFactor.toFixed(2)}x (${meal.servings} servings / ${recipe?.servings} recipe servings)`)
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
      .filter((meal) => meal.recipeId) // Only record meals with actual recipes
      .map((meal) => {
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

    // Calculate actual macros from the generated meal plan
    console.log('📊 Calculating actual macros from meal plan...')
    const macroTotals = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      mealsWithNutrition: 0,
      totalMeals: 0
    }

    // Count ALL meals including leftovers
    // Each meal row represents food consumed on that day - leftovers are still eaten!
    // The isLeftover flag just indicates it was cooked earlier, not that it shouldn't be counted
    const mealsToCount = mealPlan.meals
    macroTotals.totalMeals = mealsToCount.length
    const leftoverMealsCount = mealPlan.meals.filter(m => m.isLeftover).length
    console.log(`📊 Total meals: ${mealsToCount.length}, of which ${leftoverMealsCount} are leftovers (all counted)`)

    for (const meal of mealsToCount) {
      if (meal.recipe) {
        const recipe = meal.recipe as any
        if (recipe.caloriesPerServing) {
          // Use per-serving nutrition values directly - NOT multiplied by servings
          // Each meal represents ONE person's portion, regardless of batch size
          // User verified with SQL: sum(caloriesPerServing)/7 = correct daily average
          macroTotals.totalCalories += (recipe.caloriesPerServing || 0)
          macroTotals.totalProtein += (recipe.proteinPerServing || 0)
          macroTotals.totalCarbs += (recipe.carbsPerServing || 0)
          macroTotals.totalFat += (recipe.fatPerServing || 0)
          macroTotals.mealsWithNutrition++
          console.log(`📊 Meal: ${meal.recipeName} - ${recipe.caloriesPerServing} cal per serving`)
        }
      }
    }

    // Calculate daily averages (7 day week)
    const dailyAvgCalories = Math.round(macroTotals.totalCalories / 7)
    const dailyAvgProtein = Math.round(macroTotals.totalProtein / 7)
    const dailyAvgCarbs = Math.round(macroTotals.totalCarbs / 7)
    const dailyAvgFat = Math.round(macroTotals.totalFat / 7)

    console.log(`📊 Macro calculation: ${macroTotals.mealsWithNutrition}/${macroTotals.totalMeals} meals have nutrition data`)
    console.log(`📊 Weekly totals: ${Math.round(macroTotals.totalCalories)} cal, ${Math.round(macroTotals.totalProtein)}g protein, ${Math.round(macroTotals.totalCarbs)}g carbs, ${Math.round(macroTotals.totalFat)}g fat`)
    console.log(`📊 Daily averages: ${dailyAvgCalories} cal, ${dailyAvgProtein}g protein, ${dailyAvgCarbs}g carbs, ${dailyAvgFat}g fat`)

    // Build final summary with accurate macro data
    let finalSummary = generatedPlan.summary || ''

    // Replace AI-generated macro numbers with accurate calculated values
    if (macroTotals.mealsWithNutrition > 0) {
      // Create accurate macro statement
      const nutritionCoverage = Math.round((macroTotals.mealsWithNutrition / macroTotals.totalMeals) * 100)
      let macroStatement = ''

      if (nutritionCoverage >= 80) {
        macroStatement = `Your week averages approximately ${dailyAvgCalories.toLocaleString()} calories per day`
        if (dailyAvgProtein > 0) macroStatement += ` with ${dailyAvgProtein}g protein`
        if (dailyAvgCarbs > 0 || dailyAvgFat > 0) {
          macroStatement += `. Carbs average ${dailyAvgCarbs}g and fat averages ${dailyAvgFat}g`
        }
        macroStatement += '.'
      } else if (nutritionCoverage >= 50) {
        macroStatement = `Based on ${nutritionCoverage}% of recipes with nutrition data, your week averages approximately ${dailyAvgCalories.toLocaleString()} calories per day (${dailyAvgProtein}g protein, ${dailyAvgCarbs}g carbs, ${dailyAvgFat}g fat). Add nutrition info to more recipes for more accurate tracking.`
      } else {
        macroStatement = `Only ${nutritionCoverage}% of recipes have nutrition data. Add calorie/macro information to your recipes for accurate tracking.`
      }

      // FIRST: Strip ALL calorie/macro claims from AI summary to avoid duplicates
      // These patterns match various ways AI might state calorie/macro information
      const calorieClaimPatterns = [
        /Your week averages[^.]*calories[^.]*\./gi,
        /averaging approximately \d[,\d]* calories[^.]*\./gi,
        /averages? (?:about |approximately |around )?\d[,\d]* calories?[^.]*\./gi,
        /\d[,\d]* calories? per day[^.]*\./gi,
        /daily (?:calorie )?(?:average|total)[^.]*\d[,\d]* cal[^.]*\./gi,
        /Carbs average[^.]*fat averages[^.]*\./gi,
        /with \d+g protein[^.]*\./gi,
        /hitting \d+g[^.]*protein[^.]*\./gi,
      ]

      // Remove all AI calorie claims
      let cleanedSummary = finalSummary
      for (const pattern of calorieClaimPatterns) {
        cleanedSummary = cleanedSummary.replace(pattern, '')
      }

      // Clean up any double spaces or leading/trailing whitespace
      cleanedSummary = cleanedSummary.replace(/\s{2,}/g, ' ').trim()

      // Prepend our accurate macro statement
      finalSummary = macroStatement + (cleanedSummary ? ' ' + cleanedSummary : '')

      console.log('✅ Updated summary with accurate macro data (stripped AI claims first)')
    } else {
      console.log('⚠️ No nutrition data available - keeping original summary')
    }

    if (invalidRecipes.length > 0) {
      const warningMessage = `\n\n⚠️ **Warning:** The AI suggested ${invalidRecipes.length} recipe${invalidRecipes.length > 1 ? 's' : ''} that ${invalidRecipes.length > 1 ? 'are' : 'is'} not in your database:\n` +
        invalidRecipes.map(r => `- ${r.recipeName} (${r.day} ${r.mealType})`).join('\n') +
        `\n\nThese meals could not be added to your plan. Please add more recipes to your database or regenerate the meal plan.`

      finalSummary = (finalSummary || '') + warningMessage
      console.warn(`⚠️ Added warning to summary for ${invalidRecipes.length} invalid recipes`)
    }

    // Build nutritional summary object to persist
    const nutritionCoverage = macroTotals.totalMeals > 0
      ? Math.round((macroTotals.mealsWithNutrition / macroTotals.totalMeals) * 100)
      : 0

    const weeklyNutritionalSummary: WeeklyNutritionalSummary = {
      totalCalories: Math.round(macroTotals.totalCalories),
      totalProtein: Math.round(macroTotals.totalProtein),
      totalCarbs: Math.round(macroTotals.totalCarbs),
      totalFat: Math.round(macroTotals.totalFat),
      dailyAvgCalories,
      dailyAvgProtein,
      dailyAvgCarbs,
      dailyAvgFat,
      mealsWithNutrition: macroTotals.mealsWithNutrition,
      totalMeals: macroTotals.totalMeals,
      nutritionCoveragePercent: nutritionCoverage,
      aiSummary: finalSummary,
      calculatedAt: new Date().toISOString()
    }

    // Save nutritional data (including AI summary) to the meal plan
    console.log('💾 Saving nutritional summary to meal plan...')
    await prisma.mealPlan.update({
      where: { id: mealPlan.id },
      data: {
        weeklyNutritionalSummary: weeklyNutritionalSummary as any
      }
    })
    console.log('✅ Nutritional summary saved to database')

    return NextResponse.json({
      mealPlan: {
        ...mealPlan,
        summary: finalSummary,
        weeklyNutritionalSummary
      },
      summary: finalSummary
    })
  } catch (error: any) {
    console.error('Error generating meal plan:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate meal plan' },
      { status: 500 }
    )
  }
}
