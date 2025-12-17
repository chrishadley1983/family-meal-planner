// Recipe Macro Filter
// Pre-filters recipes based on macro feasibility before AI generation
// Only applies when macros is in top 3 priorities

import { MacroMode } from './types/meal-plan-settings'

// Fixed meal percentages matching validation.ts
const MEAL_PERCENTAGES = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.40,
  snack: 0.20 // Combined for all snack types
} as const

// Filter tolerance - stricter than validation to give AI room to work
const FILTER_TOLERANCE = 0.20 // ±20%

/**
 * Recipe interface for filtering - minimal fields needed
 */
export interface RecipeForFilter {
  id: string
  recipeName: string
  mealType: string[] // e.g., ['Breakfast'], ['Lunch', 'Dinner']
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
}

/**
 * Per-meal type macro range
 */
export interface MealTypeMacroRange {
  calories: { min: number; max: number; target: number }
  protein: { min: number; max: number; target: number }
  carbs: { min: number; max: number; target: number }
  fat: { min: number; max: number; target: number }
  mealType: string
}

/**
 * Result of recipe filtering
 */
export interface MacroFilterResult {
  filteredRecipes: RecipeForFilter[]
  removedRecipes: RecipeForFilter[]
  feasibilityReport: {
    breakfastOptions: number
    lunchOptions: number
    dinnerOptions: number
    snackOptions: number
    canMeetTargets: boolean
    issues: string[]
  }
  mealTypeRanges: Record<string, MealTypeMacroRange>
}

/**
 * Daily macro targets interface
 */
export interface DailyMacroTargets {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/**
 * Calculate per-meal macro ranges based on daily targets
 * Uses fixed ±20% tolerance for filtering
 */
export function calculateMealTypeMacroRanges(
  dailyTargets: DailyMacroTargets
): Record<string, MealTypeMacroRange> {
  const ranges: Record<string, MealTypeMacroRange> = {}

  Object.entries(MEAL_PERCENTAGES).forEach(([mealType, percentage]) => {
    const calorieTarget = Math.round(dailyTargets.calories * percentage)
    const proteinTarget = Math.round(dailyTargets.protein * percentage)
    const carbsTarget = Math.round(dailyTargets.carbs * percentage)
    const fatTarget = Math.round(dailyTargets.fat * percentage)

    ranges[mealType] = {
      calories: {
        min: Math.round(calorieTarget * (1 - FILTER_TOLERANCE)),
        max: Math.round(calorieTarget * (1 + FILTER_TOLERANCE)),
        target: calorieTarget
      },
      protein: {
        min: Math.round(proteinTarget * (1 - FILTER_TOLERANCE)),
        max: Math.round(proteinTarget * (1 + FILTER_TOLERANCE)),
        target: proteinTarget
      },
      carbs: {
        min: Math.round(carbsTarget * (1 - FILTER_TOLERANCE)),
        max: Math.round(carbsTarget * (1 + FILTER_TOLERANCE)),
        target: carbsTarget
      },
      fat: {
        min: Math.round(fatTarget * (1 - FILTER_TOLERANCE)),
        max: Math.round(fatTarget * (1 + FILTER_TOLERANCE)),
        target: fatTarget
      },
      mealType
    }
  })

  return ranges
}

/**
 * Get the normalized meal category from recipe mealType array
 * Maps specific meal types to our four categories: breakfast, lunch, dinner, snack
 */
function getMealCategories(mealTypes: string[]): string[] {
  const categories = new Set<string>()

  mealTypes.forEach(mt => {
    const lower = mt.toLowerCase()
    if (lower === 'breakfast') {
      categories.add('breakfast')
    } else if (lower === 'lunch') {
      categories.add('lunch')
    } else if (lower === 'dinner') {
      categories.add('dinner')
    } else if (lower.includes('snack') || lower === 'dessert') {
      categories.add('snack')
    }
  })

  return Array.from(categories)
}

/**
 * Check if macros is in top 3 priorities
 */
export function isMacrosHighPriority(priorityOrder: string[]): boolean {
  const macrosIndex = priorityOrder.indexOf('macros')
  return macrosIndex >= 0 && macrosIndex < 3
}

/**
 * Check if a recipe's macros fit within a meal type's ranges
 * Returns fit status and reasons for any failures
 *
 * Logic:
 * - If recipe has NO nutrition data at all, allow it (AI will handle)
 * - If recipe has data, check each macro against ±20% tolerance
 * - Recipe is rejected if it's ABOVE max OR BELOW min (both directions matter)
 * - This ensures the AI can actually meet targets with the available recipes
 */
function recipeMacrosFitRange(
  recipe: RecipeForFilter,
  range: MealTypeMacroRange
): { fits: boolean; reasons: string[] } {
  const reasons: string[] = []

  // No nutrition data at all - allow it (AI will handle)
  const hasAnyNutrition = recipe.caloriesPerServing || recipe.proteinPerServing ||
                          recipe.carbsPerServing || recipe.fatPerServing
  if (!hasAnyNutrition) {
    return { fits: true, reasons: [] }
  }

  // Check calories (if present) - BOTH min and max
  if (recipe.caloriesPerServing) {
    if (recipe.caloriesPerServing > range.calories.max) {
      reasons.push(`${recipe.caloriesPerServing} cal > ${range.calories.max} cal max`)
    } else if (recipe.caloriesPerServing < range.calories.min) {
      reasons.push(`${recipe.caloriesPerServing} cal < ${range.calories.min} cal min`)
    }
  }

  // Check protein (if present) - be lenient with protein (high protein is usually OK)
  // Only reject if way over max or significantly under min
  if (recipe.proteinPerServing) {
    if (recipe.proteinPerServing > range.protein.max * 1.5) {
      reasons.push(`${recipe.proteinPerServing}g protein > ${Math.round(range.protein.max * 1.5)}g max`)
    } else if (recipe.proteinPerServing < range.protein.min * 0.5) {
      // Only reject if less than half the minimum (very low protein)
      reasons.push(`${recipe.proteinPerServing}g protein < ${Math.round(range.protein.min * 0.5)}g min`)
    }
  }

  // Check carbs (if present) - BOTH min and max
  if (recipe.carbsPerServing) {
    if (recipe.carbsPerServing > range.carbs.max) {
      reasons.push(`${recipe.carbsPerServing}g carbs > ${range.carbs.max}g max`)
    } else if (recipe.carbsPerServing < range.carbs.min) {
      reasons.push(`${recipe.carbsPerServing}g carbs < ${range.carbs.min}g min`)
    }
  }

  // Check fat (if present) - BOTH min and max
  if (recipe.fatPerServing) {
    if (recipe.fatPerServing > range.fat.max) {
      reasons.push(`${recipe.fatPerServing}g fat > ${range.fat.max}g max`)
    } else if (recipe.fatPerServing < range.fat.min) {
      reasons.push(`${recipe.fatPerServing}g fat < ${range.fat.min}g min`)
    }
  }

  return {
    fits: reasons.length === 0,
    reasons
  }
}

/**
 * Filter recipes based on macro feasibility
 * Only filters when macros is top-3 priority
 *
 * @param recipes - All available recipes
 * @param dailyTargets - Daily macro targets (calories, protein, carbs, fat)
 * @param macroMode - The macro tracking mode (used for logging, not tolerance)
 * @param priorityOrder - User's priority ordering
 * @returns Filtered recipes and feasibility report
 */
export function filterRecipesForMacroFeasibility(
  recipes: RecipeForFilter[],
  dailyCalorieTarget: number,
  macroMode: MacroMode,
  priorityOrder: string[],
  dailyProteinTarget: number = 0,
  dailyCarbsTarget: number = 0,
  dailyFatTarget: number = 0
): MacroFilterResult {
  // Check if macros is high priority - if not, return all recipes
  if (!isMacrosHighPriority(priorityOrder)) {
    console.log('🍽️ Macro filtering SKIPPED - macros not in top 3 priorities')
    return {
      filteredRecipes: recipes,
      removedRecipes: [],
      feasibilityReport: {
        breakfastOptions: recipes.filter(r => getMealCategories(r.mealType).includes('breakfast')).length,
        lunchOptions: recipes.filter(r => getMealCategories(r.mealType).includes('lunch')).length,
        dinnerOptions: recipes.filter(r => getMealCategories(r.mealType).includes('dinner')).length,
        snackOptions: recipes.filter(r => getMealCategories(r.mealType).includes('snack')).length,
        canMeetTargets: true,
        issues: []
      },
      mealTypeRanges: {}
    }
  }

  // No calorie target - skip filtering
  if (!dailyCalorieTarget || dailyCalorieTarget <= 0) {
    console.log('🍽️ Macro filtering SKIPPED - no daily calorie target set')
    return {
      filteredRecipes: recipes,
      removedRecipes: [],
      feasibilityReport: {
        breakfastOptions: recipes.filter(r => getMealCategories(r.mealType).includes('breakfast')).length,
        lunchOptions: recipes.filter(r => getMealCategories(r.mealType).includes('lunch')).length,
        dinnerOptions: recipes.filter(r => getMealCategories(r.mealType).includes('dinner')).length,
        snackOptions: recipes.filter(r => getMealCategories(r.mealType).includes('snack')).length,
        canMeetTargets: true,
        issues: []
      },
      mealTypeRanges: {}
    }
  }

  const dailyTargets: DailyMacroTargets = {
    calories: dailyCalorieTarget,
    protein: dailyProteinTarget,
    carbs: dailyCarbsTarget,
    fat: dailyFatTarget
  }

  console.log(`🍽️ Macro filtering ACTIVE (±${FILTER_TOLERANCE * 100}% tolerance)`)
  console.log(`   Daily targets: ${dailyTargets.calories} cal, ${dailyTargets.protein}g protein, ${dailyTargets.carbs}g carbs, ${dailyTargets.fat}g fat`)

  // Calculate per-meal macro ranges
  const ranges = calculateMealTypeMacroRanges(dailyTargets)

  console.log('📊 Per-meal macro ranges:')
  Object.entries(ranges).forEach(([mealType, range]) => {
    console.log(`   ${mealType}: ${range.calories.min}-${range.calories.max} cal, ${range.protein.min}-${range.protein.max}g P, ${range.carbs.min}-${range.carbs.max}g C, ${range.fat.min}-${range.fat.max}g F`)
  })

  const filteredRecipes: RecipeForFilter[] = []
  const removedRecipes: RecipeForFilter[] = []

  // Filter each recipe
  recipes.forEach(recipe => {
    const mealCategories = getMealCategories(recipe.mealType)

    // If recipe has no meal types, keep it
    if (mealCategories.length === 0) {
      filteredRecipes.push(recipe)
      return
    }

    // Check if recipe fits ANY of its meal categories
    let fitsAnyCategory = false
    const allFailedReasons: string[] = []

    mealCategories.forEach(category => {
      const range = ranges[category]
      if (!range) {
        fitsAnyCategory = true // Unknown category - allow
        return
      }

      const result = recipeMacrosFitRange(recipe, range)
      if (result.fits) {
        fitsAnyCategory = true
      } else {
        allFailedReasons.push(`${category}: ${result.reasons.join(', ')}`)
      }
    })

    if (fitsAnyCategory) {
      filteredRecipes.push(recipe)
    } else {
      removedRecipes.push(recipe)
      console.log(`   ❌ Filtered: "${recipe.recipeName}" - ${allFailedReasons.join('; ')}`)
    }
  })

  // Count options per meal type in FILTERED recipes
  const breakfastOptions = filteredRecipes.filter(r => getMealCategories(r.mealType).includes('breakfast')).length
  const lunchOptions = filteredRecipes.filter(r => getMealCategories(r.mealType).includes('lunch')).length
  const dinnerOptions = filteredRecipes.filter(r => getMealCategories(r.mealType).includes('dinner')).length
  const snackOptions = filteredRecipes.filter(r => getMealCategories(r.mealType).includes('snack')).length

  // Check feasibility
  const issues: string[] = []
  const MIN_OPTIONS = 3 // Need at least 3 recipes per meal type for variety

  if (breakfastOptions < MIN_OPTIONS) {
    issues.push(`Only ${breakfastOptions} breakfast recipe(s) fit macro targets - need at least ${MIN_OPTIONS} for variety`)
  }
  if (lunchOptions < MIN_OPTIONS) {
    issues.push(`Only ${lunchOptions} lunch recipe(s) fit macro targets - need at least ${MIN_OPTIONS} for variety`)
  }
  if (dinnerOptions < MIN_OPTIONS) {
    issues.push(`Only ${dinnerOptions} dinner recipe(s) fit macro targets - need at least ${MIN_OPTIONS} for variety`)
  }
  // Snacks are optional, so only warn if we had snacks before but filtered them all out
  const hadSnacks = recipes.some(r => getMealCategories(r.mealType).includes('snack'))
  if (hadSnacks && snackOptions === 0) {
    issues.push(`All snack recipes filtered out - consider adding snacks that fit targets`)
  }

  // Determine if we can meet targets
  const canMeetTargets = breakfastOptions >= 1 && lunchOptions >= 1 && dinnerOptions >= 1

  console.log(`🍽️ Macro filtering complete:`)
  console.log(`   Kept: ${filteredRecipes.length}/${recipes.length} recipes (filtered out ${removedRecipes.length})`)
  console.log(`   Breakfast: ${breakfastOptions}, Lunch: ${lunchOptions}, Dinner: ${dinnerOptions}, Snack: ${snackOptions}`)
  if (issues.length > 0) {
    console.log('   ⚠️ Issues:')
    issues.forEach(i => console.log(`      - ${i}`))
  }

  // GRACEFUL DEGRADATION: If filtering leaves too few options, fallback to unfiltered
  if (!canMeetTargets) {
    console.log('⚠️ GRACEFUL DEGRADATION: Filtering left insufficient recipes, returning ALL recipes')
    return {
      filteredRecipes: recipes, // Return all recipes
      removedRecipes: [],
      feasibilityReport: {
        breakfastOptions: recipes.filter(r => getMealCategories(r.mealType).includes('breakfast')).length,
        lunchOptions: recipes.filter(r => getMealCategories(r.mealType).includes('lunch')).length,
        dinnerOptions: recipes.filter(r => getMealCategories(r.mealType).includes('dinner')).length,
        snackOptions: recipes.filter(r => getMealCategories(r.mealType).includes('snack')).length,
        canMeetTargets: false, // Still report it's not ideal
        issues: [...issues, 'Macro filtering disabled due to insufficient recipe variety - AI will use all recipes']
      },
      mealTypeRanges: ranges
    }
  }

  return {
    filteredRecipes,
    removedRecipes,
    feasibilityReport: {
      breakfastOptions,
      lunchOptions,
      dinnerOptions,
      snackOptions,
      canMeetTargets,
      issues
    },
    mealTypeRanges: ranges
  }
}

/**
 * Calculate weighted average daily macro targets across all profiles
 * Weight by macro tracking being enabled
 */
export function calculateAverageDailyMacros(
  profiles: Array<{
    macroTrackingEnabled: boolean
    dailyCalorieTarget?: number | null
    dailyProteinTarget?: number | null
    dailyCarbsTarget?: number | null
    dailyFatTarget?: number | null
  }>
): DailyMacroTargets {
  const trackingProfiles = profiles.filter(p => p.macroTrackingEnabled && p.dailyCalorieTarget)

  if (trackingProfiles.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 }
  }

  const totals = trackingProfiles.reduce(
    (acc, p) => ({
      calories: acc.calories + (p.dailyCalorieTarget || 0),
      protein: acc.protein + (p.dailyProteinTarget || 0),
      carbs: acc.carbs + (p.dailyCarbsTarget || 0),
      fat: acc.fat + (p.dailyFatTarget || 0)
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return {
    calories: Math.round(totals.calories / trackingProfiles.length),
    protein: Math.round(totals.protein / trackingProfiles.length),
    carbs: Math.round(totals.carbs / trackingProfiles.length),
    fat: Math.round(totals.fat / trackingProfiles.length)
  }
}

/**
 * Legacy function - kept for backward compatibility
 */
export function calculateAverageDailyCalories(
  profiles: Array<{
    macroTrackingEnabled: boolean
    dailyCalorieTarget?: number | null
  }>
): number {
  return calculateAverageDailyMacros(profiles as any).calories
}

/**
 * Build a summary message about filtering for the AI prompt
 */
export function buildFilteringSummary(result: MacroFilterResult): string {
  if (result.removedRecipes.length === 0) {
    return ''
  }

  const lines: string[] = [
    '',
    '## Pre-Filtered Recipes',
    `${result.removedRecipes.length} recipe(s) were pre-filtered because their macros fall outside the ±20% tolerance for their meal types:`,
  ]

  result.removedRecipes.slice(0, 10).forEach(r => {
    const macros = []
    if (r.caloriesPerServing) macros.push(`${r.caloriesPerServing} cal`)
    if (r.proteinPerServing) macros.push(`${r.proteinPerServing}g P`)
    if (r.carbsPerServing) macros.push(`${r.carbsPerServing}g C`)
    if (r.fatPerServing) macros.push(`${r.fatPerServing}g F`)
    lines.push(`- "${r.recipeName}" (${macros.join(', ') || 'no data'})`)
  })

  if (result.removedRecipes.length > 10) {
    lines.push(`... and ${result.removedRecipes.length - 10} more`)
  }

  lines.push('')
  lines.push('The remaining recipes should allow you to meet macro targets. Per-meal targets:')
  Object.entries(result.mealTypeRanges).forEach(([mealType, range]) => {
    lines.push(`- ${mealType}: ${range.calories.min}-${range.calories.max} cal, ${range.protein.min}-${range.protein.max}g P, ${range.carbs.min}-${range.carbs.max}g C, ${range.fat.min}-${range.fat.max}g F`)
  })

  return lines.join('\n')
}
