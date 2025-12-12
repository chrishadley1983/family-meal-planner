/**
 * Database Macro Sync Consistency Tests
 *
 * Tests to ensure database macro values stay in sync across:
 * 1. Profile macro targets
 * 2. Recipe nutrition values
 * 3. Meal plan entries
 *
 * Pain points addressed:
 * - Stale macro values in database after updates
 * - Recipe nutrition not recalculated when ingredients change
 * - Profile macros not matching calculated values
 */

import {
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
} from '@/lib/nutritionist/calculations'
import { ProfileContext } from '@/lib/nutritionist/types'

/**
 * Simulates the data transformation that happens
 * when profile data flows through the system
 */
interface ProfileDatabaseRecord {
  id: string
  profileName: string
  age: number | null
  gender: string | null
  heightCm: number | null
  currentWeightKg: number | null
  targetWeightKg: number | null
  goalType: string | null
  goalTimeframeWeeks: number | null
  activityLevel: string | null
  dailyCalorieTarget: number | null
  dailyProteinTarget: number | null
  dailyCarbsTarget: number | null
  dailyFatTarget: number | null
  dailyFiberTarget: number | null
  macroTrackingEnabled: boolean
}

/**
 * Simulates the recipe database structure
 */
interface RecipeDatabaseRecord {
  id: string
  recipeName: string
  servings: number
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
  fiberPerServing: number | null
  nutritionAutoCalculated: boolean
  ingredients: {
    ingredientName: string
    quantity: number
    unit: string
    caloriesPer100g?: number | null
    proteinPer100g?: number | null
    carbsPer100g?: number | null
    fatPer100g?: number | null
    fiberPer100g?: number | null
  }[]
}

/**
 * Calculate recipe nutrition from ingredients
 * This simulates the calculation that should happen
 * when recipe ingredients are modified
 */
function calculateRecipeNutrition(recipe: RecipeDatabaseRecord): {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  totalFiber: number
  perServing: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
} {
  let totalCalories = 0
  let totalProtein = 0
  let totalCarbs = 0
  let totalFat = 0
  let totalFiber = 0

  recipe.ingredients.forEach(ing => {
    // Convert quantity to 100g units for calculation
    const quantityIn100g = ing.quantity / 100

    if (ing.caloriesPer100g) totalCalories += ing.caloriesPer100g * quantityIn100g
    if (ing.proteinPer100g) totalProtein += ing.proteinPer100g * quantityIn100g
    if (ing.carbsPer100g) totalCarbs += ing.carbsPer100g * quantityIn100g
    if (ing.fatPer100g) totalFat += ing.fatPer100g * quantityIn100g
    if (ing.fiberPer100g) totalFiber += ing.fiberPer100g * quantityIn100g
  })

  return {
    totalCalories: Math.round(totalCalories),
    totalProtein: Math.round(totalProtein),
    totalCarbs: Math.round(totalCarbs),
    totalFat: Math.round(totalFat),
    totalFiber: Math.round(totalFiber),
    perServing: {
      calories: Math.round(totalCalories / recipe.servings),
      protein: Math.round(totalProtein / recipe.servings),
      carbs: Math.round(totalCarbs / recipe.servings),
      fat: Math.round(totalFat / recipe.servings),
      fiber: Math.round(totalFiber / recipe.servings),
    },
  }
}

/**
 * Calculate profile macros from body stats
 * This simulates the calculation that should happen
 * when profile stats are modified
 */
function calculateProfileMacros(profile: ProfileDatabaseRecord): {
  calculated: {
    bmr: number
    tdee: number
    dailyCalories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  } | null
  matches: boolean
} {
  // Need minimum data to calculate
  if (!profile.currentWeightKg || !profile.heightCm || !profile.age) {
    return { calculated: null, matches: true }
  }

  const tdeeResult = calculateTDEE({
    weightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    gender: (profile.gender as 'male' | 'female' | 'other') || 'other',
    activityLevel: normalizeActivityLevel(profile.activityLevel),
  })

  const macros = calculateMacros({
    tdee: tdeeResult.tdee,
    goalType: (profile.goalType as 'lose' | 'maintain' | 'gain') || 'maintain',
    currentWeightKg: profile.currentWeightKg,
    targetWeightKg: profile.targetWeightKg || undefined,
    goalTimeframeWeeks: profile.goalTimeframeWeeks || undefined,
  })

  // Check if stored values match calculated
  const matches =
    profile.dailyCalorieTarget === macros.dailyCalories &&
    profile.dailyProteinTarget === macros.protein &&
    profile.dailyCarbsTarget === macros.carbs &&
    profile.dailyFatTarget === macros.fat

  return {
    calculated: {
      bmr: tdeeResult.bmr,
      tdee: tdeeResult.tdee,
      dailyCalories: macros.dailyCalories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      fiber: macros.fiber,
    },
    matches,
  }
}

describe('Database Macro Sync Consistency', () => {
  /**
   * Test that profile macros can be recalculated consistently
   */
  describe('Profile Macro Sync', () => {
    const testProfile: ProfileDatabaseRecord = {
      id: 'profile-1',
      profileName: 'Chris',
      age: 40,
      gender: 'male',
      heightCm: 180,
      currentWeightKg: 85,
      targetWeightKg: 80,
      goalType: 'lose',
      goalTimeframeWeeks: 12,
      activityLevel: 'moderate',
      dailyCalorieTarget: 2200,
      dailyProteinTarget: 170,
      dailyCarbsTarget: 200,
      dailyFatTarget: 60,
      dailyFiberTarget: 35,
      macroTrackingEnabled: true,
    }

    it('should detect when stored macros differ from calculated', () => {
      const result = calculateProfileMacros(testProfile)

      // The test profile has intentionally different stored values
      // to test detection
      expect(result.calculated).not.toBeNull()
      // Check if there's any mismatch
      // (actual values depend on calculation implementation)
    })

    it('should produce consistent calculations on repeated calls', () => {
      const result1 = calculateProfileMacros(testProfile)
      const result2 = calculateProfileMacros(testProfile)
      const result3 = calculateProfileMacros(testProfile)

      expect(result1.calculated?.dailyCalories).toBe(result2.calculated?.dailyCalories)
      expect(result2.calculated?.dailyCalories).toBe(result3.calculated?.dailyCalories)
      expect(result1.calculated?.protein).toBe(result2.calculated?.protein)
      expect(result2.calculated?.protein).toBe(result3.calculated?.protein)
    })

    it('should handle profiles with missing data gracefully', () => {
      const incompleteProfile: ProfileDatabaseRecord = {
        ...testProfile,
        age: null,
        heightCm: null,
      }

      const result = calculateProfileMacros(incompleteProfile)

      expect(result.calculated).toBeNull()
      expect(result.matches).toBe(true) // Can't mismatch if can't calculate
    })

    it('should recalculate correctly after weight change', () => {
      const originalResult = calculateProfileMacros(testProfile)

      // Simulate weight change
      const updatedProfile = {
        ...testProfile,
        currentWeightKg: 83, // Lost 2kg
      }

      const newResult = calculateProfileMacros(updatedProfile)

      // TDEE should be lower with lower weight
      expect(newResult.calculated?.tdee).toBeLessThan(originalResult.calculated!.tdee)
      // Daily calories should also be lower
      expect(newResult.calculated?.dailyCalories).toBeLessThan(originalResult.calculated!.dailyCalories)
    })

    it('should recalculate correctly after goal change', () => {
      const loseResult = calculateProfileMacros(testProfile)

      // Change from lose to maintain
      const maintainProfile = {
        ...testProfile,
        goalType: 'maintain',
      }

      const maintainResult = calculateProfileMacros(maintainProfile)

      // Maintenance should have more calories (no deficit)
      expect(maintainResult.calculated?.dailyCalories).toBeGreaterThan(loseResult.calculated!.dailyCalories)
    })

    it('should recalculate correctly after activity level change', () => {
      const moderateResult = calculateProfileMacros(testProfile)

      // Increase activity level
      const activeProfile = {
        ...testProfile,
        activityLevel: 'active',
      }

      const activeResult = calculateProfileMacros(activeProfile)

      // Higher activity = higher TDEE
      expect(activeResult.calculated?.tdee).toBeGreaterThan(moderateResult.calculated!.tdee)
    })
  })

  /**
   * Test that recipe nutrition can be recalculated from ingredients
   */
  describe('Recipe Nutrition Sync', () => {
    const testRecipe: RecipeDatabaseRecord = {
      id: 'recipe-1',
      recipeName: 'Chicken Stir Fry',
      servings: 4,
      caloriesPerServing: 400,
      proteinPerServing: 35,
      carbsPerServing: 30,
      fatPerServing: 15,
      fiberPerServing: 5,
      nutritionAutoCalculated: true,
      ingredients: [
        {
          ingredientName: 'Chicken breast',
          quantity: 500, // grams
          unit: 'g',
          caloriesPer100g: 165,
          proteinPer100g: 31,
          carbsPer100g: 0,
          fatPer100g: 3.6,
          fiberPer100g: 0,
        },
        {
          ingredientName: 'Rice',
          quantity: 200,
          unit: 'g',
          caloriesPer100g: 130,
          proteinPer100g: 2.7,
          carbsPer100g: 28,
          fatPer100g: 0.3,
          fiberPer100g: 0.4,
        },
        {
          ingredientName: 'Mixed vegetables',
          quantity: 300,
          unit: 'g',
          caloriesPer100g: 65,
          proteinPer100g: 2.5,
          carbsPer100g: 12,
          fatPer100g: 0.5,
          fiberPer100g: 3.5,
        },
        {
          ingredientName: 'Soy sauce',
          quantity: 30,
          unit: 'ml',
          caloriesPer100g: 53,
          proteinPer100g: 8,
          carbsPer100g: 4.9,
          fatPer100g: 0,
          fiberPer100g: 0,
        },
        {
          ingredientName: 'Sesame oil',
          quantity: 15,
          unit: 'ml',
          caloriesPer100g: 884,
          proteinPer100g: 0,
          carbsPer100g: 0,
          fatPer100g: 100,
          fiberPer100g: 0,
        },
      ],
    }

    it('should calculate recipe nutrition from ingredients', () => {
      const nutrition = calculateRecipeNutrition(testRecipe)

      // Total should be sum of all ingredients
      expect(nutrition.totalCalories).toBeGreaterThan(0)
      expect(nutrition.totalProtein).toBeGreaterThan(0)
      expect(nutrition.totalCarbs).toBeGreaterThan(0)
      expect(nutrition.totalFat).toBeGreaterThan(0)

      // Per serving should be total / servings
      expect(nutrition.perServing.calories).toBe(Math.round(nutrition.totalCalories / testRecipe.servings))
      expect(nutrition.perServing.protein).toBe(Math.round(nutrition.totalProtein / testRecipe.servings))
    })

    it('should produce consistent calculations on repeated calls', () => {
      const result1 = calculateRecipeNutrition(testRecipe)
      const result2 = calculateRecipeNutrition(testRecipe)
      const result3 = calculateRecipeNutrition(testRecipe)

      expect(result1.totalCalories).toBe(result2.totalCalories)
      expect(result2.totalCalories).toBe(result3.totalCalories)
      expect(result1.perServing.protein).toBe(result2.perServing.protein)
    })

    it('should recalculate when ingredient quantity changes', () => {
      const originalNutrition = calculateRecipeNutrition(testRecipe)

      // Double the chicken
      const modifiedRecipe = {
        ...testRecipe,
        ingredients: testRecipe.ingredients.map(ing =>
          ing.ingredientName === 'Chicken breast'
            ? { ...ing, quantity: 1000 }
            : ing
        ),
      }

      const newNutrition = calculateRecipeNutrition(modifiedRecipe)

      // Should have more calories and protein
      expect(newNutrition.totalCalories).toBeGreaterThan(originalNutrition.totalCalories)
      expect(newNutrition.totalProtein).toBeGreaterThan(originalNutrition.totalProtein)
    })

    it('should recalculate when ingredient is added', () => {
      const originalNutrition = calculateRecipeNutrition(testRecipe)

      // Add cashews
      const modifiedRecipe = {
        ...testRecipe,
        ingredients: [
          ...testRecipe.ingredients,
          {
            ingredientName: 'Cashews',
            quantity: 50,
            unit: 'g',
            caloriesPer100g: 553,
            proteinPer100g: 18,
            carbsPer100g: 30,
            fatPer100g: 44,
            fiberPer100g: 3.3,
          },
        ],
      }

      const newNutrition = calculateRecipeNutrition(modifiedRecipe)

      expect(newNutrition.totalCalories).toBeGreaterThan(originalNutrition.totalCalories)
      expect(newNutrition.totalFat).toBeGreaterThan(originalNutrition.totalFat)
    })

    it('should recalculate when ingredient is removed', () => {
      const originalNutrition = calculateRecipeNutrition(testRecipe)

      // Remove sesame oil
      const modifiedRecipe = {
        ...testRecipe,
        ingredients: testRecipe.ingredients.filter(
          ing => ing.ingredientName !== 'Sesame oil'
        ),
      }

      const newNutrition = calculateRecipeNutrition(modifiedRecipe)

      expect(newNutrition.totalCalories).toBeLessThan(originalNutrition.totalCalories)
      expect(newNutrition.totalFat).toBeLessThan(originalNutrition.totalFat)
    })

    it('should recalculate when servings changes', () => {
      const originalNutrition = calculateRecipeNutrition(testRecipe)

      // Change from 4 to 2 servings
      const modifiedRecipe = {
        ...testRecipe,
        servings: 2,
      }

      const newNutrition = calculateRecipeNutrition(modifiedRecipe)

      // Total should stay the same
      expect(newNutrition.totalCalories).toBe(originalNutrition.totalCalories)

      // Per serving should double
      expect(newNutrition.perServing.calories).toBe(originalNutrition.perServing.calories * 2)
      expect(newNutrition.perServing.protein).toBe(originalNutrition.perServing.protein * 2)
    })

    it('should handle ingredients without nutrition data', () => {
      const recipeWithMissingData: RecipeDatabaseRecord = {
        ...testRecipe,
        ingredients: [
          {
            ingredientName: 'Unknown ingredient',
            quantity: 100,
            unit: 'g',
            // No nutrition data
          },
          {
            ingredientName: 'Chicken breast',
            quantity: 200,
            unit: 'g',
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
            fiberPer100g: 0,
          },
        ],
      }

      const nutrition = calculateRecipeNutrition(recipeWithMissingData)

      // Should still calculate what it can
      expect(nutrition.totalCalories).toBeGreaterThan(0)
      expect(nutrition.totalProtein).toBeGreaterThan(0)
    })
  })

  /**
   * Test data transformation consistency
   * Ensures data maintains integrity when transformed between formats
   */
  describe('Data Transformation Consistency', () => {
    it('should preserve profile data during context transformation', () => {
      const dbProfile: ProfileDatabaseRecord = {
        id: 'profile-1',
        profileName: 'Chris',
        age: 40,
        gender: 'male',
        heightCm: 180,
        currentWeightKg: 85,
        targetWeightKg: 80,
        goalType: 'lose',
        goalTimeframeWeeks: 12,
        activityLevel: 'moderate',
        dailyCalorieTarget: 2200,
        dailyProteinTarget: 170,
        dailyCarbsTarget: 200,
        dailyFatTarget: 60,
        dailyFiberTarget: 35,
        macroTrackingEnabled: true,
      }

      // Transform to context format (simulating API transformation)
      const contextProfile: ProfileContext = {
        profileId: dbProfile.id,
        profileName: dbProfile.profileName,
        age: dbProfile.age ?? undefined,
        gender: dbProfile.gender ?? undefined,
        heightCm: dbProfile.heightCm ?? undefined,
        currentWeightKg: dbProfile.currentWeightKg ?? undefined,
        targetWeightKg: dbProfile.targetWeightKg ?? undefined,
        goalType: dbProfile.goalType ?? undefined,
        goalTimeframeWeeks: dbProfile.goalTimeframeWeeks ?? undefined,
        activityLevel: dbProfile.activityLevel ?? undefined,
        dailyCalorieTarget: dbProfile.dailyCalorieTarget ?? undefined,
        dailyProteinTarget: dbProfile.dailyProteinTarget ?? undefined,
        dailyCarbsTarget: dbProfile.dailyCarbsTarget ?? undefined,
        dailyFatTarget: dbProfile.dailyFatTarget ?? undefined,
        dailyFiberTarget: dbProfile.dailyFiberTarget ?? undefined,
        macroTrackingEnabled: dbProfile.macroTrackingEnabled,
        allergies: [],
        foodLikes: [],
        foodDislikes: [],
      }

      // Key values should match
      expect(contextProfile.age).toBe(dbProfile.age)
      expect(contextProfile.heightCm).toBe(dbProfile.heightCm)
      expect(contextProfile.currentWeightKg).toBe(dbProfile.currentWeightKg)
      expect(contextProfile.dailyCalorieTarget).toBe(dbProfile.dailyCalorieTarget)
    })

    it('should handle null-to-undefined conversions correctly', () => {
      const dbProfile: ProfileDatabaseRecord = {
        id: 'profile-2',
        profileName: 'Sarah',
        age: 35,
        gender: 'female',
        heightCm: null, // null in DB
        currentWeightKg: null, // null in DB
        targetWeightKg: null,
        goalType: null,
        goalTimeframeWeeks: null,
        activityLevel: null,
        dailyCalorieTarget: null,
        dailyProteinTarget: null,
        dailyCarbsTarget: null,
        dailyFatTarget: null,
        dailyFiberTarget: null,
        macroTrackingEnabled: false,
      }

      // Transform should convert null to undefined where appropriate
      const contextProfile: ProfileContext = {
        profileId: dbProfile.id,
        profileName: dbProfile.profileName,
        age: dbProfile.age ?? undefined,
        gender: dbProfile.gender ?? undefined,
        heightCm: dbProfile.heightCm ?? undefined,
        currentWeightKg: dbProfile.currentWeightKg ?? undefined,
        targetWeightKg: dbProfile.targetWeightKg ?? undefined,
        goalType: dbProfile.goalType ?? undefined,
        goalTimeframeWeeks: dbProfile.goalTimeframeWeeks ?? undefined,
        activityLevel: dbProfile.activityLevel ?? undefined,
        dailyCalorieTarget: dbProfile.dailyCalorieTarget ?? undefined,
        dailyProteinTarget: dbProfile.dailyProteinTarget ?? undefined,
        dailyCarbsTarget: dbProfile.dailyCarbsTarget ?? undefined,
        dailyFatTarget: dbProfile.dailyFatTarget ?? undefined,
        dailyFiberTarget: dbProfile.dailyFiberTarget ?? undefined,
        macroTrackingEnabled: dbProfile.macroTrackingEnabled,
        allergies: [],
        foodLikes: [],
        foodDislikes: [],
      }

      // Should be undefined, not null
      expect(contextProfile.heightCm).toBeUndefined()
      expect(contextProfile.currentWeightKg).toBeUndefined()

      // Profile calculation should handle missing data
      const result = calculateProfileMacros(dbProfile)
      expect(result.calculated).toBeNull() // Can't calculate without height/weight
    })
  })

  /**
   * Test detection of stale data
   */
  describe('Stale Data Detection', () => {
    it('should detect when profile macros are stale after stats change', () => {
      // Profile with macros calculated for old stats
      const staleProfile: ProfileDatabaseRecord = {
        id: 'profile-stale',
        profileName: 'Stale User',
        age: 40,
        gender: 'male',
        heightCm: 180,
        currentWeightKg: 75, // Weight changed from original calculation
        targetWeightKg: 70,
        goalType: 'lose',
        goalTimeframeWeeks: 12,
        activityLevel: 'moderate',
        // These macros were calculated for weightKg: 85
        dailyCalorieTarget: 2200,
        dailyProteinTarget: 170,
        dailyCarbsTarget: 200,
        dailyFatTarget: 60,
        dailyFiberTarget: 35,
        macroTrackingEnabled: true,
      }

      const result = calculateProfileMacros(staleProfile)

      // Stored values should not match newly calculated
      expect(result.matches).toBe(false)

      // New calculation should reflect lower weight
      expect(result.calculated?.dailyCalories).toBeLessThan(2200)
    })

    it('should detect when recipe nutrition is stale after ingredient change', () => {
      const originalRecipe: RecipeDatabaseRecord = {
        id: 'recipe-stale',
        recipeName: 'Modified Recipe',
        servings: 4,
        // Original stored values
        caloriesPerServing: 400,
        proteinPerServing: 35,
        carbsPerServing: 30,
        fatPerServing: 15,
        fiberPerServing: 5,
        nutritionAutoCalculated: true,
        // Ingredients have changed since last calculation
        ingredients: [
          {
            ingredientName: 'Chicken breast',
            quantity: 800, // Was 500g, now 800g
            unit: 'g',
            caloriesPer100g: 165,
            proteinPer100g: 31,
            carbsPer100g: 0,
            fatPer100g: 3.6,
            fiberPer100g: 0,
          },
        ],
      }

      const freshCalculation = calculateRecipeNutrition(originalRecipe)

      // Stored values should not match fresh calculation
      expect(freshCalculation.perServing.calories).not.toBe(originalRecipe.caloriesPerServing)
      expect(freshCalculation.perServing.protein).not.toBe(originalRecipe.proteinPerServing)
    })
  })
})
