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
 * Per-meal type calorie range
 */
export interface MealTypeCalorieRange {
  min: number
  max: number
  target: number
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
  mealTypeRanges: Record<string, MealTypeCalorieRange>
}

/**
 * Get tolerance percentage based on macro mode
 */
function getToleranceForMacroMode(macroMode: MacroMode): number {
  switch (macroMode) {
    case 'strict':
      return 0.05 // ±5%
    case 'balanced':
      return 0.10 // ±10%
    case 'weekday_discipline':
      return 0.10 // Use average
    case 'calorie_banking':
      return 0.15
    default:
      return 0.10
  }
}

/**
 * Calculate per-meal calorie ranges based on daily target and macro mode
 */
export function calculateMealTypeCalorieRanges(
  dailyCalorieTarget: number,
  macroMode: MacroMode
): Record<string, MealTypeCalorieRange> {
  const tolerance = getToleranceForMacroMode(macroMode)

  const ranges: Record<string, MealTypeCalorieRange> = {}

  Object.entries(MEAL_PERCENTAGES).forEach(([mealType, percentage]) => {
    const target = Math.round(dailyCalorieTarget * percentage)
    // Apply tolerance to get min/max
    const min = Math.round(target * (1 - tolerance))
    const max = Math.round(target * (1 + tolerance))

    ranges[mealType] = { min, max, target, mealType }
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
 * Check if a recipe's calories fit within a meal type's calorie range
 * Returns true if recipe fits, or if recipe has no calorie data (we give benefit of doubt)
 */
function recipeCaloriesFitRange(
  recipe: RecipeForFilter,
  range: MealTypeCalorieRange
): { fits: boolean; reason?: string } {
  // No calorie data - allow it (AI will handle)
  if (!recipe.caloriesPerServing) {
    return { fits: true }
  }

  const calories = recipe.caloriesPerServing

  // Check if within range
  if (calories >= range.min && calories <= range.max) {
    return { fits: true }
  }

  // Too low - but we're more lenient on low calorie recipes
  // User can have multiple servings to meet targets
  if (calories < range.min) {
    // Only reject if recipe is drastically low (< 50% of min)
    if (calories < range.min * 0.5) {
      return {
        fits: false,
        reason: `${calories} cal is too low for ${range.mealType} (min ${range.min} cal)`
      }
    }
    return { fits: true } // Allow slightly low - can use larger portions
  }

  // Too high - this is the main concern
  // A 1200 cal recipe for a 500 cal lunch slot will blow targets
  if (calories > range.max) {
    // If over by more than 50%, definitely reject
    if (calories > range.max * 1.5) {
      return {
        fits: false,
        reason: `${calories} cal exceeds ${range.mealType} max of ${range.max} cal by >50%`
      }
    }
    // If over by 20-50%, warn but allow (AI might use smaller portions)
    return { fits: true }
  }

  return { fits: true }
}

/**
 * Filter recipes based on macro feasibility
 * Only filters when macros is top-3 priority
 *
 * @param recipes - All available recipes
 * @param dailyCalorieTarget - Average daily calorie target (weighted across profiles)
 * @param macroMode - The macro tracking mode
 * @param priorityOrder - User's priority ordering
 * @returns Filtered recipes and feasibility report
 */
export function filterRecipesForMacroFeasibility(
  recipes: RecipeForFilter[],
  dailyCalorieTarget: number,
  macroMode: MacroMode,
  priorityOrder: string[]
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
      mealTypeRanges: calculateMealTypeCalorieRanges(dailyCalorieTarget, macroMode)
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

  console.log(`🍽️ Macro filtering ACTIVE - daily target: ${dailyCalorieTarget} cal, mode: ${macroMode}`)

  // Calculate per-meal calorie ranges
  const ranges = calculateMealTypeCalorieRanges(dailyCalorieTarget, macroMode)

  console.log('📊 Per-meal calorie ranges:')
  Object.entries(ranges).forEach(([mealType, range]) => {
    console.log(`   ${mealType}: ${range.min}-${range.max} cal (target: ${range.target})`)
  })

  const filteredRecipes: RecipeForFilter[] = []
  const removedRecipes: RecipeForFilter[] = []
  const removalReasons: Map<string, string[]> = new Map()

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
    const failedCategories: string[] = []

    mealCategories.forEach(category => {
      const range = ranges[category]
      if (!range) {
        fitsAnyCategory = true // Unknown category - allow
        return
      }

      const result = recipeCaloriesFitRange(recipe, range)
      if (result.fits) {
        fitsAnyCategory = true
      } else {
        failedCategories.push(result.reason || `Doesn't fit ${category}`)
      }
    })

    if (fitsAnyCategory) {
      filteredRecipes.push(recipe)
    } else {
      removedRecipes.push(recipe)
      removalReasons.set(recipe.id, failedCategories)
      console.log(`   ❌ Removed "${recipe.recipeName}": ${failedCategories.join(', ')}`)
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
    issues.push(`Only ${breakfastOptions} breakfast recipe(s) fit calorie targets - need at least ${MIN_OPTIONS} for variety`)
  }
  if (lunchOptions < MIN_OPTIONS) {
    issues.push(`Only ${lunchOptions} lunch recipe(s) fit calorie targets - need at least ${MIN_OPTIONS} for variety`)
  }
  if (dinnerOptions < MIN_OPTIONS) {
    issues.push(`Only ${dinnerOptions} dinner recipe(s) fit calorie targets - need at least ${MIN_OPTIONS} for variety`)
  }
  // Snacks are optional, so only warn if we had snacks before but filtered them all out
  const hadSnacks = recipes.some(r => getMealCategories(r.mealType).includes('snack'))
  if (hadSnacks && snackOptions === 0) {
    issues.push(`All snack recipes filtered out - consider adding snacks that fit ${ranges.snack?.min}-${ranges.snack?.max} cal`)
  }

  // Determine if we can meet targets
  const canMeetTargets = breakfastOptions >= 1 && lunchOptions >= 1 && dinnerOptions >= 1

  console.log(`🍽️ Macro filtering complete:`)
  console.log(`   Kept: ${filteredRecipes.length}/${recipes.length} recipes`)
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
 * Calculate weighted average daily calorie target across all profiles
 * Weight by macro tracking being enabled
 */
export function calculateAverageDailyCalories(
  profiles: Array<{
    macroTrackingEnabled: boolean
    dailyCalorieTarget?: number | null
  }>
): number {
  const trackingProfiles = profiles.filter(p => p.macroTrackingEnabled && p.dailyCalorieTarget)

  if (trackingProfiles.length === 0) {
    return 0 // No targets set
  }

  const total = trackingProfiles.reduce((sum, p) => sum + (p.dailyCalorieTarget || 0), 0)
  return Math.round(total / trackingProfiles.length)
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
    `The following ${result.removedRecipes.length} recipe(s) were pre-filtered because their calories don't fit the target ranges:`,
  ]

  result.removedRecipes.slice(0, 10).forEach(r => {
    lines.push(`- "${r.recipeName}" (${r.caloriesPerServing || 'unknown'} cal/serving)`)
  })

  if (result.removedRecipes.length > 10) {
    lines.push(`... and ${result.removedRecipes.length - 10} more`)
  }

  lines.push('')
  lines.push('The remaining recipes should allow you to meet macro targets. Focus on:')
  Object.entries(result.mealTypeRanges).forEach(([mealType, range]) => {
    lines.push(`- ${mealType}: aim for ${range.min}-${range.max} cal per serving`)
  })

  return lines.join('\n')
}
