/**
 * Meal Plan Validation Tests
 * Tests for cooldown periods, batch cooking validation, and meal plan verification
 */

import {
  validateCooldowns,
  validateBatchCooking,
  validateMealPlan,
  getDayIndex,
  type GeneratedMeal,
  type RecipeUsageHistoryItem,
} from '@/lib/meal-plan-validation'
import {
  testMealPlanSettings,
  testMealsValid,
  testMealsCooldownViolation,
  testMealsBatchCookingError,
  testRecipeHistory,
} from '../fixtures/test-data'

describe('Meal Plan Validation', () => {
  const weekStartDate = '2024-01-08' // Monday

  describe('getDayIndex', () => {
    it('should return correct index for Monday start week', () => {
      expect(getDayIndex('Monday', weekStartDate)).toBe(0)
      expect(getDayIndex('Tuesday', weekStartDate)).toBe(1)
      expect(getDayIndex('Wednesday', weekStartDate)).toBe(2)
      expect(getDayIndex('Thursday', weekStartDate)).toBe(3)
      expect(getDayIndex('Friday', weekStartDate)).toBe(4)
      expect(getDayIndex('Saturday', weekStartDate)).toBe(5)
      expect(getDayIndex('Sunday', weekStartDate)).toBe(6)
    })

    it('should return correct index for Sunday start week', () => {
      const sundayStart = '2024-01-07' // Sunday
      expect(getDayIndex('Sunday', sundayStart)).toBe(0)
      expect(getDayIndex('Monday', sundayStart)).toBe(1)
      expect(getDayIndex('Saturday', sundayStart)).toBe(6)
    })

    it('should return -1 for invalid day names', () => {
      expect(getDayIndex('InvalidDay', weekStartDate)).toBe(-1)
      expect(getDayIndex('', weekStartDate)).toBe(-1)
    })

    it('should handle case sensitivity correctly', () => {
      // The function expects exact case matching
      expect(getDayIndex('monday', weekStartDate)).toBe(-1)
      expect(getDayIndex('MONDAY', weekStartDate)).toBe(-1)
    })
  })

  describe('validateCooldowns', () => {
    it('should validate a correct meal plan with batch cooking', () => {
      const result = validateCooldowns(
        testMealsValid,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect cooldown violations for same recipe used multiple times', () => {
      const result = validateCooldowns(
        testMealsCooldownViolation,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Cooldown violation')
      expect(result.errors[0]).toContain('Chicken Stir Fry')
    })

    it('should allow batch cooking when properly marked as leftover', () => {
      const mealsWithBatchCooking: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 8,
          notes: 'Batch cook',
          isLeftover: false,
        },
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: true,
          batchCookSourceDay: 'Monday',
        },
      ]

      const result = validateCooldowns(
        mealsWithBatchCooking,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should check recent history for cooldown violations', () => {
      const mealsUsingHistoricalRecipe: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-5', // Used 3 days ago in history
          recipeName: 'Historical Recipe',
          servings: 4,
        },
      ]

      const recentHistory: RecipeUsageHistoryItem[] = [
        {
          recipeId: 'recipe-5',
          usedDate: new Date('2024-01-05'), // 3 days before week start
          mealType: 'dinner',
        },
      ]

      const result = validateCooldowns(
        mealsUsingHistoricalRecipe,
        testMealPlanSettings,
        weekStartDate,
        recentHistory
      )

      // Should have warnings for recent usage
      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0]).toContain('Recent usage')
    })

    it('should handle different cooldown periods for different meal types', () => {
      // Breakfast has shorter cooldown (3 days)
      const breakfastMeals: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'breakfast',
          recipeId: 'recipe-breakfast',
          recipeName: 'Oatmeal',
          servings: 2,
        },
        {
          dayOfWeek: 'Thursday', // 3 days later - should be okay with 3-day cooldown
          mealType: 'breakfast',
          recipeId: 'recipe-breakfast',
          recipeName: 'Oatmeal',
          servings: 2,
        },
      ]

      const result = validateCooldowns(
        breakfastMeals,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      // 3 days apart equals the cooldown - valid because check is daysBetween < cooldown
      // 3 < 3 = false = no violation
      expect(result.isValid).toBe(true)
    })

    it('should handle meals without recipes (null recipeId)', () => {
      const mealsWithNullRecipe: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: null,
          recipeName: null,
          servings: 4,
        },
        {
          dayOfWeek: 'Tuesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
        },
      ]

      const result = validateCooldowns(
        mealsWithNullRecipe,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(true)
    })
  })

  describe('validateBatchCooking', () => {
    it('should validate correct batch cooking setup', () => {
      const correctBatchCooking: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 8,
          notes: 'Batch cook for week',
          isLeftover: false,
        },
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: true,
          batchCookSourceDay: 'Monday',
        },
      ]

      const result = validateBatchCooking(correctBatchCooking, weekStartDate)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should error when first occurrence is marked as leftover', () => {
      const result = validateBatchCooking(testMealsBatchCookingError, weekStartDate)

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('first occurrence'))).toBe(true)
    })

    it('should error when recipe used multiple times without batch cooking markers', () => {
      const noBatchCookingMarkers: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: false,
        },
        {
          dayOfWeek: 'Thursday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: false, // Not marked as leftover
        },
      ]

      const result = validateBatchCooking(noBatchCookingMarkers, weekStartDate)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('not marked as batch cooking'))).toBe(true)
    })

    it('should error when batchCookSourceDay references wrong day', () => {
      const wrongSourceDay: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 8,
          isLeftover: false,
        },
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: true,
          batchCookSourceDay: 'Tuesday', // Wrong day - should be Monday
        },
      ]

      const result = validateBatchCooking(wrongSourceDay, weekStartDate)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('should reference'))).toBe(true)
    })

    it('should warn when servings mismatch', () => {
      const servingsMismatch: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4, // Only 4 servings
          notes: 'Batch cook',
          isLeftover: false,
        },
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4, // Also needs 4 servings = 8 total needed
          isLeftover: true,
          batchCookSourceDay: 'Monday',
        },
      ]

      const result = validateBatchCooking(servingsMismatch, weekStartDate)

      // Should have warning about servings
      expect(result.warnings.some(w => w.includes('Servings mismatch'))).toBe(true)
    })

    it('should handle single recipe usage without errors', () => {
      const singleUsage: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
        },
        {
          dayOfWeek: 'Tuesday',
          mealType: 'dinner',
          recipeId: 'recipe-2',
          recipeName: 'Beef Tacos',
          servings: 4,
        },
      ]

      const result = validateBatchCooking(singleUsage, weekStartDate)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should error on chronological violations (leftover before cooking)', () => {
      const chronologicalError: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 8,
          isLeftover: false, // First occurrence - correct
        },
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: true,
          batchCookSourceDay: 'Friday', // ERROR: Friday comes AFTER Wednesday!
        },
      ]

      const result = validateBatchCooking(chronologicalError, weekStartDate)

      expect(result.isValid).toBe(false)
      expect(result.errors.some(e => e.includes('Chronological error'))).toBe(true)
    })
  })

  describe('validateMealPlan', () => {
    it('should run all validations and combine results', () => {
      const result = validateMealPlan(
        testMealsValid,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail if any validation fails', () => {
      const result = validateMealPlan(
        testMealsCooldownViolation,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should combine errors from all validations', () => {
      // Create a plan that violates both cooldown and batch cooking rules
      const multipleViolations: GeneratedMeal[] = [
        {
          dayOfWeek: 'Wednesday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: true, // First occurrence marked as leftover (batch cooking error)
        },
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: false,
        },
        {
          dayOfWeek: 'Friday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Chicken Stir Fry',
          servings: 4,
          isLeftover: false, // Third occurrence not marked
        },
      ]

      const result = validateMealPlan(
        multipleViolations,
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(1)
    })

    it('should collect warnings from history checks', () => {
      const result = validateMealPlan(
        testMealsValid,
        testMealPlanSettings,
        weekStartDate,
        testRecipeHistory
      )

      // May have warnings if recipes in testMealsValid were used recently
      expect(Array.isArray(result.warnings)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty meals array', () => {
      const result = validateMealPlan(
        [],
        testMealPlanSettings,
        weekStartDate,
        []
      )

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle week starting mid-year', () => {
      const midYearStart = '2024-07-15' // Monday
      const meals: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Test Recipe',
          servings: 4,
        },
      ]

      const result = validateMealPlan(
        meals,
        testMealPlanSettings,
        midYearStart,
        []
      )

      expect(result.isValid).toBe(true)
    })

    it('should handle custom cooldown settings', () => {
      const customSettings = {
        ...testMealPlanSettings,
        dinnerCooldown: 3, // Shorter cooldown
      }

      // Using batch cooking setup so same recipe is valid
      const mealsThreeDaysApart: GeneratedMeal[] = [
        {
          dayOfWeek: 'Monday',
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Test Recipe',
          servings: 8,
          isLeftover: false,
          notes: 'Batch cook for week',
        },
        {
          dayOfWeek: 'Thursday', // 3 days later
          mealType: 'dinner',
          recipeId: 'recipe-1',
          recipeName: 'Test Recipe',
          servings: 4,
          isLeftover: true,
          batchCookSourceDay: 'Monday',
        },
      ]

      // With default 14-day cooldown, this would fail (3 < 14 = true = violation)
      // With 3-day cooldown, this is valid (3 < 3 = false = no violation)
      // Also valid because batch cooking is properly set up
      const result = validateMealPlan(
        mealsThreeDaysApart,
        customSettings,
        weekStartDate,
        []
      )

      // 3 days apart with 3-day cooldown - on the boundary
      // The validation checks if daysBetween < cooldownDays, so 3 < 3 = false = valid
      expect(result.isValid).toBe(true)
    })
  })
})
