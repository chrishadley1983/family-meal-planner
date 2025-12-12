/**
 * TDEE, BMR, and Macro Calculations
 * Uses Mifflin-St Jeor formula for BMR calculation
 */

import {
  TDEEInput,
  TDEEResult,
  MacroCalculationInput,
  MacroCalculationResult,
} from './types'

// Activity level multipliers based on research
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,      // Little or no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  active: 1.725,       // Hard exercise 6-7 days/week
  very_active: 1.9,    // Very hard exercise, physical job
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor formula
 * This is the most accurate formula according to research
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  age: number,
  gender: 'male' | 'female' | 'other'
): number {
  // Mifflin-St Jeor formula
  const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age)

  switch (gender) {
    case 'male':
      return Math.round(baseBMR + 5)
    case 'female':
      return Math.round(baseBMR - 161)
    case 'other':
      // Average of male and female adjustments
      return Math.round(baseBMR - 78)
    default:
      return Math.round(baseBMR - 78)
  }
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE)
 * TDEE = BMR * Activity Multiplier
 */
export function calculateTDEE(input: TDEEInput): TDEEResult {
  const bmr = calculateBMR(
    input.weightKg,
    input.heightCm,
    input.age,
    input.gender
  )

  const activityMultiplier = ACTIVITY_MULTIPLIERS[input.activityLevel] || ACTIVITY_MULTIPLIERS.moderate
  const tdee = Math.round(bmr * activityMultiplier)

  return {
    bmr,
    tdee,
    activityMultiplier,
  }
}

/**
 * Calculate recommended macros based on TDEE and goals
 */
export function calculateMacros(input: MacroCalculationInput): MacroCalculationResult {
  const { tdee, goalType, targetWeightKg, currentWeightKg, goalTimeframeWeeks } = input

  let deficit = 0
  let weightChangePerWeek = 0

  // Calculate calorie adjustment based on goal
  if (goalType === 'lose' && targetWeightKg && currentWeightKg && goalTimeframeWeeks) {
    const weightToLose = currentWeightKg - targetWeightKg
    // 1kg of fat = ~7700 calories
    const totalCalorieDeficit = weightToLose * 7700
    const dailyDeficit = totalCalorieDeficit / (goalTimeframeWeeks * 7)

    // Cap deficit at 1000 kcal/day for safety (max ~1kg/week loss)
    deficit = Math.min(dailyDeficit, 1000)
    weightChangePerWeek = -((deficit * 7) / 7700)
  } else if (goalType === 'lose') {
    // Default moderate deficit of 500 kcal for ~0.5kg/week
    deficit = 500
    weightChangePerWeek = -0.45
  } else if (goalType === 'gain') {
    // Moderate surplus for muscle gain
    deficit = -300 // Negative deficit = surplus
    weightChangePerWeek = 0.25
  } else {
    // Maintenance
    deficit = 0
    weightChangePerWeek = 0
  }

  const dailyCalories = Math.round(tdee - deficit)

  // Calculate macro split based on goal
  let proteinMultiplier: number
  let fatPercentage: number
  let proteinPercentage: number

  switch (goalType) {
    case 'lose':
      // Higher protein to preserve muscle during deficit
      // Aim for 2.0-2.2g/kg of current body weight
      proteinMultiplier = 2.0
      fatPercentage = 0.25
      break
    case 'gain':
      // High protein for muscle building
      // Aim for 1.8-2.0g/kg of body weight
      proteinMultiplier = 1.8
      fatPercentage = 0.25
      break
    case 'maintain':
    default:
      // Moderate protein for maintenance
      // Aim for 1.6-1.8g/kg of body weight
      proteinMultiplier = 1.6
      fatPercentage = 0.28
      break
  }

  // Calculate protein based on body weight
  const protein = Math.round(
    currentWeightKg ? currentWeightKg * proteinMultiplier : (dailyCalories * 0.30) / 4
  )

  // Calculate fat (25-30% of calories)
  const fat = Math.round((dailyCalories * fatPercentage) / 9)

  // Remaining calories go to carbs
  const proteinCalories = protein * 4
  const fatCalories = fat * 9
  const carbCalories = dailyCalories - proteinCalories - fatCalories
  const carbs = Math.round(carbCalories / 4)

  // Fiber recommendation: 14g per 1000 calories
  const fiber = Math.round((dailyCalories / 1000) * 14)

  return {
    dailyCalories,
    deficit,
    protein,
    carbs,
    fat,
    fiber,
    weightChangePerWeek: Math.round(weightChangePerWeek * 100) / 100,
  }
}

/**
 * Map activity level string to our standard enum
 */
export function normalizeActivityLevel(
  activityLevel: string | null | undefined
): 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' {
  if (!activityLevel) return 'moderate'

  const normalized = activityLevel.toLowerCase().replace(/[^a-z]/g, '')

  if (normalized.includes('sedentary') || normalized.includes('none')) {
    return 'sedentary'
  }
  if (normalized.includes('light') || normalized.includes('low')) {
    return 'light'
  }
  if (normalized.includes('moderate') || normalized.includes('medium')) {
    return 'moderate'
  }
  if (normalized.includes('veryactive') || normalized.includes('athlete')) {
    return 'very_active'
  }
  if (normalized.includes('active') || normalized.includes('high')) {
    return 'active'
  }

  return 'moderate'
}

/**
 * Get human-readable description of activity level
 */
export function getActivityLevelDescription(
  level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): string {
  switch (level) {
    case 'sedentary':
      return 'Sedentary (little or no exercise)'
    case 'light':
      return 'Lightly active (light exercise 1-3 days/week)'
    case 'moderate':
      return 'Moderately active (moderate exercise 3-5 days/week)'
    case 'active':
      return 'Active (hard exercise 6-7 days/week)'
    case 'very_active':
      return 'Very active (very hard exercise, physical job)'
    default:
      return 'Moderate activity'
  }
}

/**
 * Calculate protein target per meal assuming 3 meals
 */
export function getProteinPerMeal(dailyProteinTarget: number): number {
  return Math.round(dailyProteinTarget / 3)
}

/**
 * Get human-readable goal description
 */
export function getGoalDescription(goalType: string | null | undefined): string {
  switch (goalType) {
    case 'lose':
      return 'Lose weight/fat'
    case 'gain':
      return 'Build muscle/gain weight'
    case 'maintain':
      return 'Maintain current weight'
    default:
      return 'Not specified'
  }
}
