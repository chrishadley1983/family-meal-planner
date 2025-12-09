// Meal Plan Validation Functions
// Validates cooldown periods and batch cooking logic after AI generation

import { differenceInDays } from 'date-fns'
import { MealPlanSettings, getCooldownForMealType } from './types/meal-plan-settings'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
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

      // Calculate days between usages
      const daysBetween = secondUsage.dayIndex - firstUsage.dayIndex

      // Get the cooldown period for this meal type
      const cooldownDays = getCooldownForMealType(firstUsage.mealType, settings)

      // Check if this violates the cooldown
      if (daysBetween < cooldownDays) {
        const meal = meals.find(m => m.recipeId === recipeId)
        errors.push(
          `Cooldown violation: "${meal?.recipeName || recipeId}" used on ${firstUsage.day} and ${secondUsage.day} ` +
          `(${daysBetween} days apart, requires ${cooldownDays} day cooldown for ${firstUsage.mealType})`
        )
      }
    }
  })

  // Check for cooldown violations with RECENT HISTORY (past 4 weeks)
  const weekStart = new Date(weekStartDate)
  recipeUsageInPlan.forEach((usages, recipeId) => {
    const recentHistory = recipeHistory.filter(h => h.recipeId === recipeId)

    if (recentHistory.length === 0) return // No history, no violation

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

    // Get cooldown for the meal type
    const cooldownDays = getCooldownForMealType(mostRecentHistory.mealType, settings)

    if (daysSinceLastUse < cooldownDays) {
      const meal = meals.find(m => m.recipeId === recipeId)
      warnings.push(
        `Recent usage: "${meal?.recipeName || recipeId}" was used ${daysSinceLastUse} days ago ` +
        `(requires ${cooldownDays} day cooldown for ${mostRecentHistory.mealType})`
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
 */
export function validateBatchCooking(
  meals: GeneratedMeal[],
  weekStartDate: string
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

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
 * Master validation function that runs all checks
 */
export function validateMealPlan(
  meals: GeneratedMeal[],
  settings: MealPlanSettings,
  weekStartDate: string,
  recipeHistory: RecipeUsageHistoryItem[]
): ValidationResult {
  const cooldownResult = validateCooldowns(meals, settings, weekStartDate, recipeHistory)
  const batchCookingResult = validateBatchCooking(meals, weekStartDate)

  return {
    isValid: cooldownResult.isValid && batchCookingResult.isValid,
    errors: [...cooldownResult.errors, ...batchCookingResult.errors],
    warnings: [...cooldownResult.warnings, ...batchCookingResult.warnings]
  }
}
