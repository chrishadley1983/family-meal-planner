/**
 * Meal planning utilities for servings calculations
 */

export interface WeekProfileSchedule {
  profileId: string
  profileName: string
  included: boolean
  schedule: MealSchedule
}

export interface MealSchedule {
  monday: string[]
  tuesday: string[]
  wednesday: string[]
  thursday: string[]
  friday: string[]
  saturday: string[]
  sunday: string[]
}

/**
 * Calculate how many servings are needed for a specific meal based on who's eating
 *
 * @param dayOfWeek - e.g., "Monday", "Tuesday", etc.
 * @param mealType - e.g., "breakfast", "lunch", "dinner", "morning-snack"
 * @param customSchedule - Array of profile schedules for the week
 * @returns Number of servings (1 serving = 1 person)
 */
export function calculateMealServings(
  dayOfWeek: string,
  mealType: string,
  customSchedule: WeekProfileSchedule[]
): number {
  if (!customSchedule || customSchedule.length === 0) {
    console.warn('⚠️ No customSchedule provided, defaulting to 2 servings')
    return 2 // Fallback default
  }

  let servings = 0

  // Normalize day name to lowercase (e.g., "Monday" → "monday")
  const normalizedDay = dayOfWeek.toLowerCase()

  // Normalize meal type (e.g., "Morning Snack" → "morning-snack")
  const normalizedMealType = mealType.toLowerCase().replace(/\s+/g, '-')

  console.log(`🧮 Calculating servings for ${dayOfWeek} ${mealType}`)

  for (const personSchedule of customSchedule) {
    // Skip if person is not included in the meal plan
    if (!personSchedule.included) {
      console.log(`  ⊗ ${personSchedule.profileName}: excluded from meal plan`)
      continue
    }

    // Get the schedule for this specific day
    const daySchedule = personSchedule.schedule[normalizedDay as keyof MealSchedule]

    if (!daySchedule || !Array.isArray(daySchedule)) {
      console.log(`  ⊗ ${personSchedule.profileName}: no schedule for ${dayOfWeek}`)
      continue
    }

    // Check if this person is eating this meal type on this day
    if (daySchedule.includes(normalizedMealType)) {
      servings++
      console.log(`  ✓ ${personSchedule.profileName}: eating ${mealType} on ${dayOfWeek}`)
    } else {
      console.log(`  ⊗ ${personSchedule.profileName}: not eating ${mealType} on ${dayOfWeek}`)
    }
  }

  console.log(`  → Total servings: ${servings}`)

  return servings
}

/**
 * Calculate servings for all meals in a meal list
 *
 * @param meals - Array of meals with dayOfWeek and mealType
 * @param customSchedule - Array of profile schedules
 * @returns Meals with calculated servings
 */
export function calculateServingsForMeals<T extends { dayOfWeek: string; mealType: string }>(
  meals: T[],
  customSchedule: WeekProfileSchedule[]
): (T & { servings: number })[] {
  return meals.map(meal => ({
    ...meal,
    servings: calculateMealServings(meal.dayOfWeek, meal.mealType, customSchedule)
  }))
}

/**
 * Filter out meals with 0 servings (no one eating)
 *
 * @param meals - Array of meals with servings
 * @returns Meals where servings > 0
 */
export function filterZeroServingMeals<T extends { servings: number }>(
  meals: T[]
): T[] {
  const filteredMeals = meals.filter(meal => meal.servings > 0)

  const removedCount = meals.length - filteredMeals.length
  if (removedCount > 0) {
    console.log(`🗑️  Filtered out ${removedCount} meals with 0 servings`)
  }

  return filteredMeals
}
