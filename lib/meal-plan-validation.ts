// Meal Plan Validation Functions
// Validates cooldown periods, batch cooking logic, and macro targets after AI generation

import { differenceInDays } from 'date-fns'
import { MealPlanSettings, MacroMode, getCooldownForMealType } from './types/meal-plan-settings'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Profile interface for macro validation
export interface MacroProfile {
  macroTrackingEnabled: boolean
  dailyCalorieTarget?: number | null
  dailyProteinTarget?: number | null
  dailyCarbsTarget?: number | null
  dailyFatTarget?: number | null
}

// Recipe interface for macro calculations
export interface RecipeWithNutrition {
  id: string
  recipeName: string
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
}

export interface GeneratedMeal {
  dayOfWeek: string
  mealType: string
  recipeId: string | null
  recipeName: string | null
  servings?: number | null
  notes?: string | null
  isLeftover?: boolean
  batchCookSourceDay?: string | null
}

export interface RecipeUsageHistoryItem {
  recipeId: string
  usedDate: Date
  mealType: string
}

/**
 * Get the chronological day index (0-6) for a day name within a specific week
 * @param dayName - "Monday", "Tuesday", etc.
 * @param weekStartDate - ISO date string of when the week starts
 * @returns 0-6 where 0 is the first day of the week, 6 is the last
 */
export function getDayIndex(dayName: string, weekStartDate: string): number {
  const weekStart = new Date(weekStartDate)
  const jsDay = weekStart.getDay() // 0=Sunday, 1=Monday, etc.

  // All days in standard order
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  // Create ordered array starting from week start day
  const orderedDays = [...allDays.slice(jsDay), ...allDays.slice(0, jsDay)]

  // Find the index of the requested day in the ordered array
  const index = orderedDays.findIndex(day => day === dayName)

  return index >= 0 ? index : -1
}

/**
 * Validate cooldown periods for all meals in the plan
 * Ensures no recipe is used too frequently based on meal type cooldown settings
 */
export function validateCooldowns(
  meals: GeneratedMeal[],
  settings: MealPlanSettings,
  weekStartDate: string,
  recipeHistory: RecipeUsageHistoryItem[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Build a map of recipe usage within the plan
  const recipeUsageInPlan = new Map<string, Array<{ day: string, mealType: string, dayIndex: number }>>()

  meals.forEach(meal => {
    if (!meal.recipeId) return

    const dayIndex = getDayIndex(meal.dayOfWeek, weekStartDate)

    if (!recipeUsageInPlan.has(meal.recipeId)) {
      recipeUsageInPlan.set(meal.recipeId, [])
    }

    recipeUsageInPlan.get(meal.recipeId)!.push({
      day: meal.dayOfWeek,
      mealType: meal.mealType,
      dayIndex
    })
  })

  // Check for cooldown violations WITHIN the week
  recipeUsageInPlan.forEach((usages, recipeId) => {
    if (usages.length <= 1) return // No violation if used only once

    // Sort by day index to check chronologically
    const sortedUsages = usages.sort((a, b) => a.dayIndex - b.dayIndex)

    // Check each pair of consecutive usages
    for (let i = 0; i < sortedUsages.length - 1; i++) {
      const firstUsage = sortedUsages[i]
      const secondUsage = sortedUsages[i + 1]

      // Check if the second usage is marked as leftover (batch cooking)
      const secondMeal = meals.find(m =>
        m.recipeId === recipeId &&
        m.dayOfWeek === secondUsage.day &&
        m.mealType === secondUsage.mealType
      )

      if (secondMeal?.isLeftover === true) {
        // This is batch cooking - skip cooldown check
        continue
      }

      // Calculate days between usages
      const daysBetween = secondUsage.dayIndex - firstUsage.dayIndex

      // Get the cooldown period for this meal type
      const cooldownDays = getCooldownForMealType(firstUsage.mealType, settings)

      // Check if this violates the cooldown
      if (daysBetween < cooldownDays) {
        const meal = meals.find(m => m.recipeId === recipeId)
        const mealTypeLabel = firstUsage.mealType.charAt(0).toUpperCase() + firstUsage.mealType.slice(1).replace('-', ' ')
        errors.push(
          `Cooldown violation: "${meal?.recipeName || recipeId}" used on ${firstUsage.day} and ${secondUsage.day} ` +
          `(${daysBetween} days apart, requires ${cooldownDays} day cooldown for ${mealTypeLabel}s - ` +
          `set in Meal Plan Settings)`
        )
      }
    }
  })

  // Check for cooldown violations with RECENT HISTORY (past 4 weeks)
  const weekStart = new Date(weekStartDate)
  recipeUsageInPlan.forEach((usages, recipeId) => {
    // Only consider history entries that are BEFORE the week start date
    // (excludes entries from current meal plan generation for future weeks)
    const recentHistory = recipeHistory.filter(h => {
      const historyDate = new Date(h.usedDate)
      return h.recipeId === recipeId && historyDate < weekStart
    })

    if (recentHistory.length === 0) return // No relevant history, no violation

    // Get the most recent usage from history
    const mostRecentHistory = recentHistory.sort((a, b) =>
      b.usedDate.getTime() - a.usedDate.getTime()
    )[0]

    // Get the earliest usage in this plan
    const earliestUsageInPlan = usages.sort((a, b) => a.dayIndex - b.dayIndex)[0]
    const earliestPlanDate = new Date(weekStart)
    earliestPlanDate.setDate(weekStart.getDate() + earliestUsageInPlan.dayIndex)

    // Calculate days between history and new usage
    const daysSinceLastUse = differenceInDays(earliestPlanDate, mostRecentHistory.usedDate)

    // Skip if days since last use is negative (shouldn't happen now, but extra safety)
    if (daysSinceLastUse < 0) return

    // Get cooldown for the meal type
    const cooldownDays = getCooldownForMealType(mostRecentHistory.mealType, settings)

    if (daysSinceLastUse < cooldownDays) {
      const meal = meals.find(m => m.recipeId === recipeId)
      const mealTypeLabel = mostRecentHistory.mealType.charAt(0).toUpperCase() + mostRecentHistory.mealType.slice(1).replace('-', ' ')
      warnings.push(
        `Recent usage: "${meal?.recipeName || recipeId}" was used ${daysSinceLastUse} days ago ` +
        `(requires ${cooldownDays} day cooldown for ${mealTypeLabel}s - set in Meal Plan Settings)`
      )
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate batch cooking setup
 * Ensures isLeftover flags are correct, chronological order is maintained, and servings match
 * @param skipForMealTypes - Meal types where repeated recipes are allowed without batch cooking (e.g., user requested "porridge every day")
 * @param productRecipeIds - Recipe IDs that are product-based (grabbed from pantry, not batch cooked)
 */
export function validateBatchCooking(
  meals: GeneratedMeal[],
  weekStartDate: string,
  skipForMealTypes?: string[],
  productRecipeIds?: Set<string>
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Debug: Log what skipForMealTypes was passed
  console.log('🔍 validateBatchCooking - skipForMealTypes:', skipForMealTypes || 'EMPTY/UNDEFINED')
  console.log('🔍 validateBatchCooking - productRecipeIds:', productRecipeIds?.size || 0, 'product recipes')

  // Group meals by recipe to find potential batch cooking scenarios
  const recipeGroups = new Map<string, GeneratedMeal[]>()

  meals.forEach(meal => {
    if (!meal.recipeId) return

    if (!recipeGroups.has(meal.recipeId)) {
      recipeGroups.set(meal.recipeId, [])
    }

    recipeGroups.get(meal.recipeId)!.push(meal)
  })

  // Check each recipe group
  recipeGroups.forEach((groupMeals, recipeId) => {
    if (groupMeals.length <= 1) return // Single usage, no batch cooking needed

    // Option C1: Skip batch cooking validation for product-based recipes
    // Products (e.g., protein bars) are grabbed from pantry, not batch cooked
    if (productRecipeIds?.has(recipeId)) {
      console.log(`   ✅ Skipping batch cooking validation for product recipe: ${groupMeals[0].recipeName}`)
      return
    }

    // Debug: Log the recipe being checked and its meal types
    const mealTypesInGroup = groupMeals.map(m => m.mealType)
    console.log(`🔍 Checking recipe group: ${groupMeals[0].recipeName} (${groupMeals.length} uses)`)
    console.log(`   Meal types: ${mealTypesInGroup.join(', ')}`)
    console.log(`   skipForMealTypes: ${skipForMealTypes?.join(', ') || 'NONE'}`)

    // Check if ALL meals in this group are for meal types that should skip batch cooking validation
    // This happens when user explicitly requests "porridge every day" etc.
    const shouldSkipValidation = skipForMealTypes && skipForMealTypes.length > 0 &&
      groupMeals.every(meal => {
        const normalizedMealType = meal.mealType.toLowerCase().replace(/\s+/g, '-')
        const matches = skipForMealTypes.some(skip =>
          normalizedMealType === skip ||
          normalizedMealType.includes(skip) ||
          skip.includes(normalizedMealType)
        )
        console.log(`   Checking meal type "${normalizedMealType}" against skip list: ${matches ? 'MATCH' : 'NO MATCH'}`)
        return matches
      })

    console.log(`   shouldSkipValidation: ${shouldSkipValidation}`)

    if (shouldSkipValidation) {
      // User explicitly requested repeated meals for this meal type - skip batch cooking validation
      console.log('   ✅ Skipping batch cooking validation for this recipe')
      return
    }

    // Add day indices for sorting
    const mealsWithIndex = groupMeals.map(meal => ({
      ...meal,
      dayIndex: getDayIndex(meal.dayOfWeek, weekStartDate)
    })).sort((a, b) => a.dayIndex - b.dayIndex)

    // Check if this is marked as batch cooking
    const hasLeftovers = mealsWithIndex.some(m => m.isLeftover === true)
    const hasBatchCookNotes = mealsWithIndex.some(m =>
      m.notes && (m.notes.toLowerCase().includes('batch') || m.notes.toLowerCase().includes('leftover'))
    )

    if (!hasLeftovers && !hasBatchCookNotes) {
      // Same recipe used multiple times without batch cooking - possible cooldown violation
      errors.push(
        `Recipe "${mealsWithIndex[0].recipeName || recipeId}" used ${mealsWithIndex.length} times ` +
        `(${mealsWithIndex.map(m => m.dayOfWeek).join(', ')}) but not marked as batch cooking. ` +
        `Either set up batch cooking or use different recipes.`
      )
      return
    }

    // Validate batch cooking setup
    const firstMeal = mealsWithIndex[0]
    const subsequentMeals = mealsWithIndex.slice(1)

    // 1. Check that FIRST meal is NOT marked as leftover
    if (firstMeal.isLeftover === true) {
      errors.push(
        `Batch cooking error: "${firstMeal.recipeName}" on ${firstMeal.dayOfWeek} (first occurrence) ` +
        `is marked as leftover. First meal should have isLeftover=false.`
      )
    }

    // 2. Check that FIRST meal has the batch cook note
    if (firstMeal.notes && firstMeal.notes.toLowerCase().includes('batch')) {
      // Good - first meal has batch cook note
    } else {
      warnings.push(
        `Batch cooking note missing: "${firstMeal.recipeName}" on ${firstMeal.dayOfWeek} should have ` +
        `batch cooking note explaining total servings.`
      )
    }

    // 3. Check that SUBSEQUENT meals are marked as leftovers
    subsequentMeals.forEach(meal => {
      if (meal.isLeftover !== true) {
        errors.push(
          `Batch cooking error: "${meal.recipeName}" on ${meal.dayOfWeek} should be marked as leftover ` +
          `(isLeftover=true) since it was cooked on ${firstMeal.dayOfWeek}.`
        )
      }

      // 4. Check that batchCookSourceDay references the first meal's day
      if (meal.batchCookSourceDay && meal.batchCookSourceDay !== firstMeal.dayOfWeek) {
        errors.push(
          `Batch cooking error: "${meal.recipeName}" on ${meal.dayOfWeek} references ` +
          `batchCookSourceDay="${meal.batchCookSourceDay}" but should reference "${firstMeal.dayOfWeek}" ` +
          `(the chronologically first occurrence).`
        )
      }

      // 5. Check chronological order (source must come BEFORE leftover)
      const sourceDayIndex = getDayIndex(meal.batchCookSourceDay || '', weekStartDate)
      if (sourceDayIndex >= 0 && sourceDayIndex >= meal.dayIndex) {
        errors.push(
          `Chronological error: "${meal.recipeName}" on ${meal.dayOfWeek} claims to be leftover from ` +
          `${meal.batchCookSourceDay}, but that day comes AFTER or is the same day. Cannot use leftovers ` +
          `from the future!`
        )
      }
    })

    // 6. Validate serving counts
    const totalServingsNeeded = mealsWithIndex.reduce((sum, m) => sum + (m.servings || 0), 0)
    const firstMealServings = firstMeal.servings || 0

    if (firstMealServings < totalServingsNeeded) {
      warnings.push(
        `Servings mismatch: "${firstMeal.recipeName}" on ${firstMeal.dayOfWeek} cooks ${firstMealServings} servings, ` +
        `but total needed across all days is ${totalServingsNeeded} servings. First meal should cook the TOTAL amount.`
      )
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Get tolerance percentage based on macro mode
 * @param macroMode - The macro tracking mode from settings
 * @param dayOfWeek - Optional day for weekday_discipline mode
 * @returns Tolerance as decimal (e.g., 0.10 for 10%)
 */
export function getToleranceForMacroMode(macroMode: MacroMode, dayOfWeek?: string): number {
  switch (macroMode) {
    case 'strict':
      return 0.05 // ±5%
    case 'balanced':
      return 0.10 // ±10%
    case 'weekday_discipline':
      // Strict on weekdays, relaxed on weekends
      const isWeekend = dayOfWeek === 'Saturday' || dayOfWeek === 'Sunday'
      return isWeekend ? 0.25 : 0.05
    case 'calorie_banking':
      // More flexible daily, but weekly should balance - use 15% daily tolerance
      return 0.15
    default:
      return 0.10
  }
}

/**
 * Calculate plan coverage percentage based on which meal types are in the plan
 *
 * When snacks/desserts are present, main meals are scaled to 80%:
 * - Without snacks: B:25% + L:35% + D:40% = 100%
 * - With snacks: B:20% + L:28% + D:32% + S:20% = 100%
 */
function calculatePlanCoverage(meals: GeneratedMeal[]): number {
  // Find unique meal types in the plan (across all 7 days)
  const mealTypesInPlan = new Set<string>()
  meals.forEach(meal => {
    if (!meal.isLeftover && meal.mealType) {
      mealTypesInPlan.add(meal.mealType.toLowerCase().replace(/\s+/g, '-'))
    }
  })

  // Determine if plan has any snacks (morning, afternoon, or dessert)
  const hasSnacks = Array.from(mealTypesInPlan).some(mt =>
    mt.includes('snack') || mt === 'dessert'
  )

  // When snacks are present, scale main meals to 80% so total = 100%
  const scaleFactor = hasSnacks ? 0.80 : 1.0

  // Calculate total coverage with scaling
  let coverage = 0
  if (mealTypesInPlan.has('breakfast')) coverage += 25 * scaleFactor  // 25% or 20%
  if (mealTypesInPlan.has('lunch')) coverage += 35 * scaleFactor      // 35% or 28%
  if (mealTypesInPlan.has('dinner')) coverage += 40 * scaleFactor     // 40% or 32%
  if (hasSnacks) coverage += 20 // Snacks always 20%

  return Math.round(coverage)
}

/**
 * Validate macro targets are met for the generated meal plan
 * Only validates if macros is in top 3 priorities and user has macro tracking enabled
 *
 * KEY CONCEPT: If the meal plan doesn't cover all meal types (e.g., only Lunch + Dinner),
 * we scale the targets proportionally. A plan with only Lunch + Dinner covers 75% of daily
 * calories (35% + 40%), so we validate against 75% of the daily targets.
 */
export function validateMacros(
  meals: GeneratedMeal[],
  settings: MealPlanSettings,
  profiles: MacroProfile[],
  recipes: RecipeWithNutrition[]
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if macros is in top 3 priorities
  const macroPriority = settings.priorityOrder.indexOf('macros')
  const isMacroHighPriority = macroPriority >= 0 && macroPriority < 3

  // If macros isn't a high priority, skip strict validation
  if (!isMacroHighPriority) {
    console.log('🔍 Macro validation: macros not in top 3 priorities, skipping strict validation')
    return { isValid: true, errors, warnings }
  }

  // Find profile with macro tracking enabled
  const macrosProfile = profiles.find(p => p.macroTrackingEnabled)
  if (!macrosProfile) {
    console.log('🔍 Macro validation: no profile has macro tracking enabled, skipping')
    return { isValid: true, errors, warnings }
  }

  // Get raw targets from profile
  const rawDailyCalorieTarget = macrosProfile.dailyCalorieTarget || 0
  const rawDailyProteinTarget = macrosProfile.dailyProteinTarget || 0
  const rawDailyCarbsTarget = macrosProfile.dailyCarbsTarget || 0
  const rawDailyFatTarget = macrosProfile.dailyFatTarget || 0

  // If no targets set, skip validation
  if (rawDailyCalorieTarget === 0 && rawDailyProteinTarget === 0) {
    console.log('🔍 Macro validation: no targets set, skipping')
    return { isValid: true, errors, warnings }
  }

  // Calculate plan coverage percentage (what % of daily calories does this plan cover)
  const planCoverage = calculatePlanCoverage(meals)
  const coverageMultiplier = planCoverage / 100

  // Scale targets based on plan coverage
  // If plan only has Lunch + Dinner (75% coverage), we expect 75% of daily targets
  const dailyCalorieTarget = Math.round(rawDailyCalorieTarget * coverageMultiplier)
  const dailyProteinTarget = Math.round(rawDailyProteinTarget * coverageMultiplier)
  const dailyCarbsTarget = Math.round(rawDailyCarbsTarget * coverageMultiplier)
  const dailyFatTarget = Math.round(rawDailyFatTarget * coverageMultiplier)

  console.log(`🔍 Plan coverage: ${planCoverage}% of daily calories`)
  if (planCoverage < 100) {
    console.log(`📊 Scaling targets to ${planCoverage}% of full day targets`)
    console.log(`   Full day: ${rawDailyCalorieTarget} cal → Plan target: ${dailyCalorieTarget} cal`)
  }

  // Create recipe lookup map
  const recipeMap = new Map<string, RecipeWithNutrition>()
  recipes.forEach(r => recipeMap.set(r.id, r))

  // Calculate totals from non-leftover meals
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let mealsWithNutrition = 0
  let totalMeals = 0

  meals.forEach(meal => {
    if (meal.isLeftover) return // Skip leftovers - they're reheats, not additional calories

    totalMeals++

    if (!meal.recipeId) return

    const recipe = recipeMap.get(meal.recipeId)
    if (!recipe) return

    if (recipe.caloriesPerServing) {
      totalCalories += recipe.caloriesPerServing
      totalProtein += recipe.proteinPerServing || 0
      totalCarbs += recipe.carbsPerServing || 0
      totalFat += recipe.fatPerServing || 0
      mealsWithNutrition++
    }
  })

  // Skip validation if not enough nutrition data
  const nutritionCoverage = totalMeals > 0 ? (mealsWithNutrition / totalMeals) * 100 : 0
  if (nutritionCoverage < 50) {
    console.log(`🔍 Macro validation: only ${nutritionCoverage.toFixed(0)}% of meals have nutrition data, skipping strict validation`)
    warnings.push(`Only ${nutritionCoverage.toFixed(0)}% of recipes have nutrition data. Add calorie/macro information to more recipes for accurate tracking.`)
    return { isValid: true, errors, warnings }
  }

  // Calculate daily averages (7-day week)
  const dailyAvgCalories = Math.round(totalCalories / 7)
  const dailyAvgProtein = Math.round(totalProtein / 7)
  const dailyAvgCarbs = Math.round(totalCarbs / 7)
  const dailyAvgFat = Math.round(totalFat / 7)

  // Get tolerance based on macro mode
  const tolerance = getToleranceForMacroMode(settings.macroMode)
  const tolerancePercent = Math.round(tolerance * 100)

  console.log(`🔍 Macro validation: mode=${settings.macroMode}, tolerance=±${tolerancePercent}%, coverage=${planCoverage}%`)
  console.log(`📊 Daily averages (from plan): ${dailyAvgCalories} cal, ${dailyAvgProtein}g protein, ${dailyAvgCarbs}g carbs, ${dailyAvgFat}g fat`)
  console.log(`🎯 Adjusted targets (${planCoverage}% of full): ${dailyCalorieTarget} cal, ${dailyProteinTarget}g protein, ${dailyCarbsTarget}g carbs, ${dailyFatTarget}g fat`)

  // Validate calories
  if (dailyCalorieTarget > 0) {
    const calorieMin = dailyCalorieTarget * (1 - tolerance)
    const calorieMax = dailyCalorieTarget * (1 + tolerance)
    const calorieDeviation = Math.round(((dailyAvgCalories - dailyCalorieTarget) / dailyCalorieTarget) * 100)

    if (dailyAvgCalories < calorieMin) {
      const coverageNote = planCoverage < 100 ? ` (plan covers ${planCoverage}% of daily calories)` : ''
      errors.push(
        `Calorie target not met: averaging ${dailyAvgCalories} cal/day (${calorieDeviation}% below target of ${dailyCalorieTarget})${coverageNote}. ` +
        `Allowed range with ${settings.macroMode} mode: ${Math.round(calorieMin)}-${Math.round(calorieMax)} cal/day. ` +
        `Select higher-calorie recipes to meet target.`
      )
    } else if (dailyAvgCalories > calorieMax) {
      const coverageNote = planCoverage < 100 ? ` (plan covers ${planCoverage}% of daily calories)` : ''
      errors.push(
        `Calorie target exceeded: averaging ${dailyAvgCalories} cal/day (+${calorieDeviation}% above target of ${dailyCalorieTarget})${coverageNote}. ` +
        `Allowed range with ${settings.macroMode} mode: ${Math.round(calorieMin)}-${Math.round(calorieMax)} cal/day. ` +
        `Select lower-calorie recipes to meet target.`
      )
    } else {
      console.log(`✅ Calories within tolerance: ${dailyAvgCalories} cal/day (${calorieDeviation >= 0 ? '+' : ''}${calorieDeviation}%)`)
    }
  }

  // Validate protein - Option D1: Make failure a WARNING not an error
  // Protein targets are aspirational - low protein shouldn't block plan generation
  if (dailyProteinTarget > 0) {
    const proteinMin = dailyProteinTarget * (1 - tolerance)
    const proteinMax = dailyProteinTarget * (1 + tolerance)
    const proteinDeviation = Math.round(((dailyAvgProtein - dailyProteinTarget) / dailyProteinTarget) * 100)

    if (dailyAvgProtein < proteinMin) {
      // Changed from errors.push to warnings.push - protein below target is a warning, not an error
      warnings.push(
        `Protein below target: averaging ${dailyAvgProtein}g/day (${proteinDeviation}% below target of ${dailyProteinTarget}g). ` +
        `Consider selecting more protein-rich recipes.`
      )
    } else if (dailyAvgProtein > proteinMax) {
      warnings.push(
        `Protein above target: averaging ${dailyAvgProtein}g/day (+${proteinDeviation}% above target of ${dailyProteinTarget}g). ` +
        `This is generally fine, but noted for awareness.`
      )
    } else {
      console.log(`✅ Protein within tolerance: ${dailyAvgProtein}g/day (${proteinDeviation >= 0 ? '+' : ''}${proteinDeviation}%)`)
    }
  }

  // Validate carbs (if target set)
  if (dailyCarbsTarget > 0) {
    const carbsMin = dailyCarbsTarget * (1 - tolerance)
    const carbsMax = dailyCarbsTarget * (1 + tolerance)
    const carbsDeviation = Math.round(((dailyAvgCarbs - dailyCarbsTarget) / dailyCarbsTarget) * 100)

    if (dailyAvgCarbs < carbsMin || dailyAvgCarbs > carbsMax) {
      warnings.push(
        `Carbs outside target range: averaging ${dailyAvgCarbs}g/day (${carbsDeviation >= 0 ? '+' : ''}${carbsDeviation}% vs target of ${dailyCarbsTarget}g). ` +
        `Allowed range: ${Math.round(carbsMin)}-${Math.round(carbsMax)}g/day.`
      )
    } else {
      console.log(`✅ Carbs within tolerance: ${dailyAvgCarbs}g/day (${carbsDeviation >= 0 ? '+' : ''}${carbsDeviation}%)`)
    }
  }

  // Validate fat (if target set)
  if (dailyFatTarget > 0) {
    const fatMin = dailyFatTarget * (1 - tolerance)
    const fatMax = dailyFatTarget * (1 + tolerance)
    const fatDeviation = Math.round(((dailyAvgFat - dailyFatTarget) / dailyFatTarget) * 100)

    if (dailyAvgFat < fatMin || dailyAvgFat > fatMax) {
      warnings.push(
        `Fat outside target range: averaging ${dailyAvgFat}g/day (${fatDeviation >= 0 ? '+' : ''}${fatDeviation}% vs target of ${dailyFatTarget}g). ` +
        `Allowed range: ${Math.round(fatMin)}-${Math.round(fatMax)}g/day.`
      )
    } else {
      console.log(`✅ Fat within tolerance: ${dailyAvgFat}g/day (${fatDeviation >= 0 ? '+' : ''}${fatDeviation}%)`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate that recipes are assigned to meal types that match their designated meal types
 * @param meals - Generated meals from AI
 * @param recipes - All available recipes with their mealType arrays
 * @param options - Validation options
 */
export function validateMealTypeMatching(
  meals: GeneratedMeal[],
  recipes: Array<{ id: string; recipeName: string; mealType: string[] }>,
  options?: { allowDinnerForLunch?: boolean }
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const allowDinnerForLunch = options?.allowDinnerForLunch ?? true // Default to true

  // Create a map of recipe ID to meal types
  const recipeToMealTypes = new Map<string, string[]>()
  recipes.forEach(recipe => {
    recipeToMealTypes.set(recipe.id, recipe.mealType.map(t => t.toLowerCase().replace(/\s+/g, '-')))
  })

  // Check each meal
  meals.forEach(meal => {
    if (!meal.recipeId) return

    const allowedMealTypes = recipeToMealTypes.get(meal.recipeId)
    if (!allowedMealTypes || allowedMealTypes.length === 0) return // Can't validate

    // Normalize the meal type from the plan
    const planMealType = meal.mealType.toLowerCase().replace(/\s+/g, '-')

    // Map common variations (e.g., "afternoon-snack" to "snack")
    const normalizedPlanType = planMealType
      .replace('afternoon-snack', 'snack')
      .replace('morning-snack', 'snack')
      .replace('evening-snack', 'snack')

    // Check if any allowed meal type matches
    const isMatching = allowedMealTypes.some(allowed => {
      const normalizedAllowed = allowed.replace('afternoon-snack', 'snack')
        .replace('morning-snack', 'snack')
        .replace('evening-snack', 'snack')

      // Direct match
      if (normalizedAllowed === normalizedPlanType || allowed === planMealType) {
        return true
      }

      // "main-course" and "supper" are compatible with both lunch and dinner
      if ((allowed === 'main-course' || allowed === 'supper') &&
          (normalizedPlanType === 'lunch' || normalizedPlanType === 'dinner')) {
        return true
      }

      // If allowDinnerForLunch is enabled, dinner recipes can be used for lunch
      if (allowDinnerForLunch && normalizedPlanType === 'lunch' &&
          (allowed === 'dinner' || normalizedAllowed === 'dinner')) {
        return true
      }

      return false
    })

    if (!isMatching) {
      const recipe = recipes.find(r => r.id === meal.recipeId)
      errors.push(
        `Meal type mismatch: "${meal.recipeName || recipe?.recipeName}" is assigned to ${meal.mealType} on ${meal.dayOfWeek}, ` +
        `but this recipe is only designated for: ${allowedMealTypes.join(', ')}. ` +
        `Please assign a recipe that supports ${meal.mealType}.`
      )
    }
  })

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validation options passed to the master validation function
 */
export interface ValidationOptions {
  allowDinnerForLunch?: boolean
  skipBatchCookingForMealTypes?: string[] // Meal types where repeated recipes are OK without batch cooking
  profiles?: MacroProfile[] // Profiles for macro validation
  recipesWithNutrition?: RecipeWithNutrition[] // Recipes with nutrition data for macro validation
  productRecipeIds?: Set<string> // Recipe IDs that are product-based (skip batch cooking validation)
}

/**
 * Master validation function that runs all checks
 */
export function validateMealPlan(
  meals: GeneratedMeal[],
  settings: MealPlanSettings,
  weekStartDate: string,
  recipeHistory: RecipeUsageHistoryItem[],
  recipes?: Array<{ id: string; recipeName: string; mealType: string[] }>,
  options?: ValidationOptions
): ValidationResult {
  // Debug: Log the options being passed to validation
  console.log('🔍 validateMealPlan called with options:', JSON.stringify({
    allowDinnerForLunch: options?.allowDinnerForLunch,
    skipBatchCookingForMealTypes: options?.skipBatchCookingForMealTypes,
    hasProfiles: !!options?.profiles?.length,
    hasRecipesWithNutrition: !!options?.recipesWithNutrition?.length,
    productRecipeIdsCount: options?.productRecipeIds?.size || 0
  }))
  console.log('🔍 skipBatchCookingForMealTypes:', options?.skipBatchCookingForMealTypes || 'EMPTY/UNDEFINED')
  console.log('🔍 productRecipeIds:', options?.productRecipeIds?.size || 0, 'product recipes')

  const cooldownResult = validateCooldowns(meals, settings, weekStartDate, recipeHistory)
  const batchCookingResult = validateBatchCooking(meals, weekStartDate, options?.skipBatchCookingForMealTypes, options?.productRecipeIds)

  // Add meal type matching validation if recipes are provided
  let mealTypeResult: ValidationResult = { isValid: true, errors: [], warnings: [] }
  if (recipes && recipes.length > 0) {
    mealTypeResult = validateMealTypeMatching(meals, recipes, {
      allowDinnerForLunch: options?.allowDinnerForLunch ?? true // Default to true
    })
  }

  // Add macro validation if profiles and recipes with nutrition data are provided
  let macroResult: ValidationResult = { isValid: true, errors: [], warnings: [] }
  if (options?.profiles && options?.recipesWithNutrition) {
    console.log('🔍 Running macro validation...')
    macroResult = validateMacros(meals, settings, options.profiles, options.recipesWithNutrition)
  } else {
    console.log('🔍 Skipping macro validation: profiles or recipes not provided')
  }

  return {
    isValid: cooldownResult.isValid && batchCookingResult.isValid && mealTypeResult.isValid && macroResult.isValid,
    errors: [...cooldownResult.errors, ...batchCookingResult.errors, ...mealTypeResult.errors, ...macroResult.errors],
    warnings: [...cooldownResult.warnings, ...batchCookingResult.warnings, ...mealTypeResult.warnings, ...macroResult.warnings]
  }
}
