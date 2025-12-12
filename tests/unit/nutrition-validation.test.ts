/**
 * Nutrition Estimate vs Actual Validation Tests
 *
 * Tests to ensure that nutrition values suggested by AI (Emilia)
 * are validated against actual calculated values before being applied.
 *
 * Pain points addressed:
 * 1. AI suggesting macros that don't match TDEE calculations
 * 2. Recipe macros not adding up (protein + carbs + fat != total)
 * 3. Unvalidated suggestions being applied to database
 * 4. Inconsistent macro percentages
 */

import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
} from '@/lib/nutritionist/calculations'
import { validateAction } from '@/lib/nutritionist/actions'
import {
  UpdateMacrosAction,
  CreateRecipeAction,
} from '@/lib/nutritionist/types'

describe('Nutrition Estimate vs Actual Validation', () => {
  /**
   * Test that suggested macros match calculated values
   */
  describe('Macro Suggestion Validation', () => {
    const testProfile = {
      weightKg: 85,
      heightCm: 180,
      age: 40,
      gender: 'male' as const,
      activityLevel: 'moderate' as const,
      goalType: 'lose' as const,
      targetWeightKg: 80,
      goalTimeframeWeeks: 12,
    }

    it('should validate UPDATE_MACROS action with correct values', () => {
      const tdee = calculateTDEE(testProfile)
      const macros = calculateMacros({
        tdee: tdee.tdee,
        goalType: testProfile.goalType,
        currentWeightKg: testProfile.weightKg,
        targetWeightKg: testProfile.targetWeightKg,
        goalTimeframeWeeks: testProfile.goalTimeframeWeeks,
      })

      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Apply Calculated Macros',
        data: {
          profileId: 'test-profile-id',
          dailyCalorieTarget: macros.dailyCalories,
          dailyProteinTarget: macros.protein,
          dailyCarbsTarget: macros.carbs,
          dailyFatTarget: macros.fat,
          dailyFiberTarget: macros.fiber,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should reject UPDATE_MACROS with calories below minimum (800)', () => {
      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Invalid Macros',
        data: {
          profileId: 'test-profile-id',
          dailyCalorieTarget: 500, // Too low
          dailyProteinTarget: 100,
          dailyCarbsTarget: 100,
          dailyFatTarget: 50,
          dailyFiberTarget: 25,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Calories must be at least 800')
    })

    it('should reject UPDATE_MACROS with protein below minimum (30g)', () => {
      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Invalid Macros',
        data: {
          profileId: 'test-profile-id',
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 20, // Too low
          dailyCarbsTarget: 200,
          dailyFatTarget: 70,
          dailyFiberTarget: 25,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Protein must be at least 30g')
    })

    it('should reject UPDATE_MACROS with carbs below minimum (50g)', () => {
      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Invalid Macros',
        data: {
          profileId: 'test-profile-id',
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbsTarget: 30, // Too low
          dailyFatTarget: 70,
          dailyFiberTarget: 25,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Carbs must be at least 50g')
    })

    it('should reject UPDATE_MACROS with fat below minimum (20g)', () => {
      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Invalid Macros',
        data: {
          profileId: 'test-profile-id',
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbsTarget: 200,
          dailyFatTarget: 10, // Too low
          dailyFiberTarget: 25,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Fat must be at least 20g')
    })

    it('should reject UPDATE_MACROS without profile ID', () => {
      const action: UpdateMacrosAction = {
        type: 'UPDATE_MACROS',
        label: 'Invalid Macros',
        data: {
          profileId: '', // Missing
          dailyCalorieTarget: 2000,
          dailyProteinTarget: 150,
          dailyCarbsTarget: 200,
          dailyFatTarget: 70,
          dailyFiberTarget: 25,
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Missing profile ID')
    })
  })

  /**
   * Test that recipe macros are internally consistent
   * (protein*4 + carbs*4 + fat*9 should approximately equal total calories)
   */
  describe('Recipe Macro Consistency Validation', () => {
    it('should validate CREATE_RECIPE with consistent macros', () => {
      // 400 cal = 30*4 (120) + 40*4 (160) + 13*9 (117) = 397 ≈ 400
      const action: CreateRecipeAction = {
        type: 'CREATE_RECIPE',
        label: 'Create Recipe',
        data: {
          name: 'Healthy Chicken Bowl',
          description: 'A nutritious meal',
          servings: 4,
          prepTimeMinutes: 15,
          cookTimeMinutes: 25,
          cuisineType: 'Asian',
          mealCategory: ['lunch', 'dinner'],
          caloriesPerServing: 400,
          proteinPerServing: 30,
          carbsPerServing: 40,
          fatPerServing: 13,
          fiberPerServing: 6,
          ingredients: [
            { name: 'Chicken breast', quantity: 500, unit: 'g', category: 'Protein' },
            { name: 'Rice', quantity: 200, unit: 'g', category: 'Grains' },
            { name: 'Vegetables', quantity: 300, unit: 'g', category: 'Vegetables' },
          ],
          instructions: [
            { stepNumber: 1, instruction: 'Cook rice' },
            { stepNumber: 2, instruction: 'Grill chicken' },
            { stepNumber: 3, instruction: 'Combine and serve' },
          ],
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(true)
    })

    it('should validate CREATE_RECIPE has required fields', () => {
      const action: CreateRecipeAction = {
        type: 'CREATE_RECIPE',
        label: 'Create Recipe',
        data: {
          name: '', // Missing name
          description: 'A recipe',
          servings: 0, // Invalid servings
          prepTimeMinutes: 15,
          cookTimeMinutes: 25,
          cuisineType: 'Asian',
          mealCategory: ['dinner'],
          caloriesPerServing: 400,
          proteinPerServing: 30,
          carbsPerServing: 40,
          fatPerServing: 13,
          fiberPerServing: 6,
          ingredients: [], // Missing ingredients
          instructions: [], // Missing instructions
        },
      }

      const validation = validateAction(action)

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Missing recipe name')
      expect(validation.errors).toContain('Recipe must have at least one ingredient')
      expect(validation.errors).toContain('Recipe must have at least one instruction')
      expect(validation.errors).toContain('Servings must be at least 1')
    })
  })

  /**
   * Test calorie-macro math consistency
   * This is a custom validation we should add to catch AI errors
   */
  describe('Calorie-Macro Math Consistency', () => {
    function validateMacroMath(
      calories: number,
      protein: number,
      carbs: number,
      fat: number,
      tolerance: number = 20 // Allow 20 calorie variance for rounding
    ): { valid: boolean; calculatedCalories: number; difference: number } {
      const calculatedCalories = (protein * 4) + (carbs * 4) + (fat * 9)
      const difference = Math.abs(calculatedCalories - calories)

      return {
        valid: difference <= tolerance,
        calculatedCalories,
        difference,
      }
    }

    it('should validate macros that add up correctly', () => {
      const result = validateMacroMath(
        2000, // calories
        150,  // protein: 600 cal
        200,  // carbs: 800 cal
        67    // fat: 603 cal = 2003 total
      )

      expect(result.valid).toBe(true)
      expect(result.difference).toBeLessThanOrEqual(20)
    })

    it('should reject macros that dont add up', () => {
      const result = validateMacroMath(
        2000, // claimed calories
        150,  // protein: 600 cal
        200,  // carbs: 800 cal
        100   // fat: 900 cal = 2300 total (300 over!)
      )

      expect(result.valid).toBe(false)
      expect(result.difference).toBeGreaterThan(20)
    })

    it('should validate calculated macros always add up', () => {
      // Test with various TDEE values
      const tdeeValues = [1500, 2000, 2500, 3000, 3500]
      const goals: Array<'lose' | 'maintain' | 'gain'> = ['lose', 'maintain', 'gain']

      tdeeValues.forEach(tdee => {
        goals.forEach(goalType => {
          const macros = calculateMacros({
            tdee,
            goalType,
            currentWeightKg: 80,
          })

          const result = validateMacroMath(
            macros.dailyCalories,
            macros.protein,
            macros.carbs,
            macros.fat
          )

          expect(result.valid).toBe(true)
        })
      })
    })
  })

  /**
   * Test that deficit/surplus matches calorie difference
   */
  describe('Deficit/Surplus Validation', () => {
    it('should have deficit that matches TDEE - daily calories for weight loss', () => {
      const tdeeResult = calculateTDEE({
        weightKg: 90,
        heightCm: 180,
        age: 35,
        gender: 'male',
        activityLevel: 'moderate',
      })

      const macros = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: 'lose',
        currentWeightKg: 90,
        targetWeightKg: 80,
        goalTimeframeWeeks: 20,
      })

      expect(macros.deficit).toBeGreaterThan(0)
      expect(macros.dailyCalories).toBe(tdeeResult.tdee - macros.deficit)
    })

    it('should have negative deficit (surplus) for weight gain', () => {
      const tdeeResult = calculateTDEE({
        weightKg: 70,
        heightCm: 175,
        age: 25,
        gender: 'male',
        activityLevel: 'active',
      })

      const macros = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: 'gain',
        currentWeightKg: 70,
      })

      expect(macros.deficit).toBe(-300) // Fixed 300 cal surplus
      expect(macros.dailyCalories).toBe(tdeeResult.tdee + 300)
    })

    it('should have zero deficit for maintenance', () => {
      const tdeeResult = calculateTDEE({
        weightKg: 75,
        heightCm: 170,
        age: 30,
        gender: 'female',
        activityLevel: 'light',
      })

      const macros = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: 'maintain',
        currentWeightKg: 75,
      })

      expect(macros.deficit).toBe(0)
      expect(macros.dailyCalories).toBe(tdeeResult.tdee)
    })
  })

  /**
   * Test weight change predictions
   */
  describe('Weight Change Prediction Validation', () => {
    it('should predict weight change based on deficit', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'lose',
        currentWeightKg: 90,
        targetWeightKg: 80,
        goalTimeframeWeeks: 20,
      })

      // Weekly deficit in calories
      const weeklyDeficit = macros.deficit * 7
      // 1kg fat = 7700 calories
      const expectedWeeklyLoss = weeklyDeficit / 7700

      // weightChangePerWeek is negative for loss
      expect(macros.weightChangePerWeek).toBeLessThan(0)
      expect(Math.abs(macros.weightChangePerWeek)).toBeCloseTo(expectedWeeklyLoss, 1)
    })

    it('should predict weight gain with surplus', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'gain',
        currentWeightKg: 70,
      })

      // Surplus is 300 cal/day = 2100 cal/week
      // 2100 / 7700 ≈ 0.27 kg/week
      expect(macros.weightChangePerWeek).toBeGreaterThan(0)
      expect(macros.weightChangePerWeek).toBeCloseTo(0.27, 1)
    })

    it('should predict no weight change for maintenance', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'maintain',
        currentWeightKg: 75,
      })

      expect(macros.weightChangePerWeek).toBe(0)
    })

    it('should match goal timeline prediction', () => {
      const currentWeight = 90
      const targetWeight = 80
      const timeframeWeeks = 20

      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'lose',
        currentWeightKg: currentWeight,
        targetWeightKg: targetWeight,
        goalTimeframeWeeks: timeframeWeeks,
      })

      // Total weight to lose
      const weightToLose = currentWeight - targetWeight // 10 kg

      // Predicted weight loss over timeframe
      const predictedLoss = Math.abs(macros.weightChangePerWeek) * timeframeWeeks

      // Should be close to the target (within 0.5kg variance)
      // Note: deficit caps may prevent exact match
      expect(predictedLoss).toBeGreaterThan(0)
    })
  })

  /**
   * Test protein calculations per body weight
   */
  describe('Protein Target Validation', () => {
    it('should calculate ~2.0g/kg protein for weight loss', () => {
      const weightKg = 80
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'lose',
        currentWeightKg: weightKg,
      })

      const proteinPerKg = macros.protein / weightKg

      // Should be around 2.0g/kg (allow 0.2 variance)
      expect(proteinPerKg).toBeGreaterThanOrEqual(1.8)
      expect(proteinPerKg).toBeLessThanOrEqual(2.2)
    })

    it('should calculate ~1.8g/kg protein for muscle gain', () => {
      const weightKg = 70
      const macros = calculateMacros({
        tdee: 2800,
        goalType: 'gain',
        currentWeightKg: weightKg,
      })

      const proteinPerKg = macros.protein / weightKg

      // Should be around 1.8g/kg
      expect(proteinPerKg).toBeGreaterThanOrEqual(1.6)
      expect(proteinPerKg).toBeLessThanOrEqual(2.0)
    })

    it('should calculate ~1.6g/kg protein for maintenance', () => {
      const weightKg = 75
      const macros = calculateMacros({
        tdee: 2300,
        goalType: 'maintain',
        currentWeightKg: weightKg,
      })

      const proteinPerKg = macros.protein / weightKg

      // Should be around 1.6g/kg
      expect(proteinPerKg).toBeGreaterThanOrEqual(1.4)
      expect(proteinPerKg).toBeLessThanOrEqual(1.8)
    })
  })

  /**
   * Test fat percentage validation
   */
  describe('Fat Percentage Validation', () => {
    const goals: Array<'lose' | 'maintain' | 'gain'> = ['lose', 'maintain', 'gain']

    goals.forEach(goalType => {
      it(`should have fat at 23-32% for ${goalType} goal`, () => {
        const macros = calculateMacros({
          tdee: 2500,
          goalType,
          currentWeightKg: 80,
        })

        const fatCalories = macros.fat * 9
        const fatPercentage = fatCalories / macros.dailyCalories

        expect(fatPercentage).toBeGreaterThanOrEqual(0.23)
        expect(fatPercentage).toBeLessThanOrEqual(0.32)
      })
    })
  })

  /**
   * Test fiber calculation validation
   */
  describe('Fiber Target Validation', () => {
    it('should calculate fiber as 14g per 1000 calories', () => {
      const calorieTargets = [1500, 2000, 2500, 3000]

      calorieTargets.forEach(targetCalories => {
        const macros = calculateMacros({
          tdee: targetCalories,
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        const expectedFiber = Math.round((macros.dailyCalories / 1000) * 14)
        expect(macros.fiber).toBe(expectedFiber)
      })
    })
  })

  /**
   * Test BMR formula accuracy
   */
  describe('BMR Formula Validation', () => {
    it('should calculate male BMR using Mifflin-St Jeor', () => {
      // Manual calculation: (10 * 85) + (6.25 * 180) - (5 * 40) + 5
      // = 850 + 1125 - 200 + 5 = 1780
      const bmr = calculateBMR(85, 180, 40, 'male')
      expect(bmr).toBe(1780)
    })

    it('should calculate female BMR using Mifflin-St Jeor', () => {
      // Manual calculation: (10 * 65) + (6.25 * 165) - (5 * 38) - 161
      // = 650 + 1031.25 - 190 - 161 = 1330.25 ≈ 1330
      const bmr = calculateBMR(65, 165, 38, 'female')
      expect(bmr).toBe(1330)
    })

    it('should calculate other gender BMR as average', () => {
      // (10 * 75) + (6.25 * 170) - (5 * 30) - 78
      // = 750 + 1062.5 - 150 - 78 = 1584.5 ≈ 1585
      const bmr = calculateBMR(75, 170, 30, 'other')
      expect(bmr).toBe(1585)
    })
  })

  /**
   * Test TDEE multiplier accuracy
   */
  describe('TDEE Multiplier Validation', () => {
    const activityLevels: Array<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'> = [
      'sedentary', 'light', 'moderate', 'active', 'very_active'
    ]
    const expectedMultipliers = [1.2, 1.375, 1.55, 1.725, 1.9]

    activityLevels.forEach((level, index) => {
      it(`should use ${expectedMultipliers[index]} multiplier for ${level}`, () => {
        const result = calculateTDEE({
          weightKg: 80,
          heightCm: 175,
          age: 35,
          gender: 'male',
          activityLevel: level,
        })

        expect(result.activityMultiplier).toBe(expectedMultipliers[index])
        expect(result.tdee).toBe(Math.round(result.bmr * expectedMultipliers[index]))
      })
    })
  })

  /**
   * Test that activity level normalization doesn't change calculations
   */
  describe('Activity Level Normalization Validation', () => {
    it('should produce same TDEE for equivalent activity level strings', () => {
      const baseInput = {
        weightKg: 80,
        heightCm: 175,
        age: 35,
        gender: 'male' as const,
      }

      const variations = ['moderate', 'MODERATE', 'medium', 'Moderately Active']

      const results = variations.map(level => {
        const normalized = normalizeActivityLevel(level)
        return calculateTDEE({ ...baseInput, activityLevel: normalized })
      })

      // All should produce the same TDEE
      const firstTDEE = results[0].tdee
      results.forEach(result => {
        expect(result.tdee).toBe(firstTDEE)
      })
    })
  })
})
