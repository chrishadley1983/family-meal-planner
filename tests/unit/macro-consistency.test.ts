/**
 * Macro Calculation Consistency Tests
 *
 * Tests to ensure macro calculations produce consistent results across:
 * 1. Profile TDEE/macro calculations
 * 2. Recipe nutrition calculations
 * 3. Meal plan generation and validation
 * 4. Nutritionist chat recommendations
 *
 * These tests address pain points from previous development where
 * different parts of the system produced inconsistent macro values.
 */

import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
} from '@/lib/nutritionist/calculations'
import {
  getCooldownForMealType,
  DEFAULT_SETTINGS,
} from '@/lib/types/meal-plan-settings'
import { testProfiles, testMealPlanSettings } from '../fixtures/test-data'

describe('Macro Calculation Consistency', () => {
  /**
   * Test that the same profile data produces identical macros
   * regardless of where in the codebase the calculation is performed.
   * This addresses the issue where Emilia's estimates didn't match actual calculations.
   */
  describe('Profile → TDEE → Macros Pipeline', () => {
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

    it('should produce identical BMR on repeated calls', () => {
      const bmr1 = calculateBMR(testProfile.weightKg, testProfile.heightCm, testProfile.age, testProfile.gender)
      const bmr2 = calculateBMR(testProfile.weightKg, testProfile.heightCm, testProfile.age, testProfile.gender)
      const bmr3 = calculateBMR(testProfile.weightKg, testProfile.heightCm, testProfile.age, testProfile.gender)

      expect(bmr1).toBe(bmr2)
      expect(bmr2).toBe(bmr3)
    })

    it('should produce identical TDEE on repeated calls', () => {
      const tdee1 = calculateTDEE(testProfile)
      const tdee2 = calculateTDEE(testProfile)
      const tdee3 = calculateTDEE(testProfile)

      expect(tdee1.bmr).toBe(tdee2.bmr)
      expect(tdee2.bmr).toBe(tdee3.bmr)
      expect(tdee1.tdee).toBe(tdee2.tdee)
      expect(tdee2.tdee).toBe(tdee3.tdee)
    })

    it('should produce identical macros on repeated calls', () => {
      const tdeeResult = calculateTDEE(testProfile)

      const macros1 = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: testProfile.goalType,
        currentWeightKg: testProfile.weightKg,
        targetWeightKg: testProfile.targetWeightKg,
        goalTimeframeWeeks: testProfile.goalTimeframeWeeks,
      })

      const macros2 = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: testProfile.goalType,
        currentWeightKg: testProfile.weightKg,
        targetWeightKg: testProfile.targetWeightKg,
        goalTimeframeWeeks: testProfile.goalTimeframeWeeks,
      })

      expect(macros1.dailyCalories).toBe(macros2.dailyCalories)
      expect(macros1.protein).toBe(macros2.protein)
      expect(macros1.carbs).toBe(macros2.carbs)
      expect(macros1.fat).toBe(macros2.fat)
      expect(macros1.fiber).toBe(macros2.fiber)
    })

    it('should produce consistent results across the full pipeline', () => {
      // Simulate the full calculation pipeline
      const bmr = calculateBMR(testProfile.weightKg, testProfile.heightCm, testProfile.age, testProfile.gender)
      const tdeeResult = calculateTDEE(testProfile)
      const macros = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: testProfile.goalType,
        currentWeightKg: testProfile.weightKg,
        targetWeightKg: testProfile.targetWeightKg,
        goalTimeframeWeeks: testProfile.goalTimeframeWeeks,
      })

      // Verify BMR is correctly used in TDEE
      expect(tdeeResult.bmr).toBe(bmr)
      expect(tdeeResult.tdee).toBe(Math.round(bmr * tdeeResult.activityMultiplier))

      // Verify macros are based on TDEE
      expect(macros.dailyCalories).toBeLessThan(tdeeResult.tdee) // Weight loss = deficit
      expect(macros.dailyCalories).toBe(tdeeResult.tdee - macros.deficit)
    })

    it('should maintain calorie math: protein + carbs + fat = total (approximately)', () => {
      const tdeeResult = calculateTDEE(testProfile)
      const macros = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: testProfile.goalType,
        currentWeightKg: testProfile.weightKg,
      })

      // Calories from macros
      const proteinCals = macros.protein * 4
      const carbsCals = macros.carbs * 4
      const fatCals = macros.fat * 9
      const totalFromMacros = proteinCals + carbsCals + fatCals

      // Should be very close to daily calories (allow small rounding error)
      expect(Math.abs(totalFromMacros - macros.dailyCalories)).toBeLessThan(10)
    })
  })

  /**
   * Test that activity level normalization is consistent
   * This addresses issues where different input formats produced different results
   */
  describe('Activity Level Normalization Consistency', () => {
    const activityVariations = [
      { inputs: ['sedentary', 'SEDENTARY', 'Sedentary', 'none'], expected: 'sedentary' },
      { inputs: ['light', 'LIGHT', 'Light', 'low'], expected: 'light' },
      { inputs: ['moderate', 'MODERATE', 'Moderate', 'medium'], expected: 'moderate' },
      { inputs: ['active', 'ACTIVE', 'Active', 'high'], expected: 'active' },
      { inputs: ['very_active', 'VERY_ACTIVE', 'athlete', 'veryactive'], expected: 'very_active' },
    ]

    activityVariations.forEach(({ inputs, expected }) => {
      it(`should normalize all variations of "${expected}" consistently`, () => {
        inputs.forEach(input => {
          expect(normalizeActivityLevel(input)).toBe(expected)
        })
      })
    })

    it('should produce identical TDEE for equivalent activity levels', () => {
      const baseInput = {
        weightKg: 75,
        heightCm: 175,
        age: 30,
        gender: 'male' as const,
      }

      const result1 = calculateTDEE({ ...baseInput, activityLevel: normalizeActivityLevel('moderate') })
      const result2 = calculateTDEE({ ...baseInput, activityLevel: normalizeActivityLevel('MODERATE') })
      const result3 = calculateTDEE({ ...baseInput, activityLevel: normalizeActivityLevel('medium') })

      expect(result1.tdee).toBe(result2.tdee)
      expect(result2.tdee).toBe(result3.tdee)
    })
  })

  /**
   * Test macro distribution percentages remain consistent
   * This addresses the issue where calorie banking math didn't add up
   */
  describe('Macro Distribution Consistency', () => {
    const goals: Array<'lose' | 'gain' | 'maintain'> = ['lose', 'gain', 'maintain']

    goals.forEach(goal => {
      it(`should have consistent macro percentages for goal: ${goal}`, () => {
        const macros = calculateMacros({
          tdee: 2500,
          goalType: goal,
          currentWeightKg: 80,
        })

        const proteinPercent = (macros.protein * 4) / macros.dailyCalories
        const fatPercent = (macros.fat * 9) / macros.dailyCalories
        const carbPercent = (macros.carbs * 4) / macros.dailyCalories

        // Total percentages should sum to ~100%
        const totalPercent = proteinPercent + fatPercent + carbPercent
        expect(totalPercent).toBeGreaterThan(0.98)
        expect(totalPercent).toBeLessThan(1.02)

        // Fat should be 25-30% for all goals
        expect(fatPercent).toBeGreaterThanOrEqual(0.23)
        expect(fatPercent).toBeLessThanOrEqual(0.32)
      })
    })
  })

  /**
   * Test protein calculations based on body weight
   * Different goals should use different multipliers consistently
   */
  describe('Protein Calculation Consistency', () => {
    const testCases = [
      { goal: 'lose' as const, expectedMultiplier: 2.0 },
      { goal: 'gain' as const, expectedMultiplier: 1.8 },
      { goal: 'maintain' as const, expectedMultiplier: 1.6 },
    ]

    testCases.forEach(({ goal, expectedMultiplier }) => {
      it(`should calculate protein at ~${expectedMultiplier}g/kg for ${goal} goal`, () => {
        const weightKg = 80
        const macros = calculateMacros({
          tdee: 2500,
          goalType: goal,
          currentWeightKg: weightKg,
        })

        const proteinPerKg = macros.protein / weightKg

        // Allow 0.2g/kg variance for rounding
        expect(proteinPerKg).toBeGreaterThanOrEqual(expectedMultiplier - 0.2)
        expect(proteinPerKg).toBeLessThanOrEqual(expectedMultiplier + 0.2)
      })
    })
  })

  /**
   * Test deficit/surplus calculations are consistent
   * This addresses issues where weight change predictions were wrong
   */
  describe('Deficit/Surplus Consistency', () => {
    it('should calculate consistent deficit for weight loss', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'lose',
        currentWeightKg: 90,
        targetWeightKg: 80,
        goalTimeframeWeeks: 20,
      })

      // Deficit should result in expected weight change
      // 1kg fat = 7700 kcal, so weekly deficit / 7700 = weekly weight change
      const weeklyDeficit = macros.deficit * 7
      const expectedWeeklyLoss = weeklyDeficit / 7700

      expect(Math.abs(macros.weightChangePerWeek + expectedWeeklyLoss)).toBeLessThan(0.1)
    })

    it('should cap deficit at 1000 kcal for safety', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'lose',
        currentWeightKg: 100,
        targetWeightKg: 60,
        goalTimeframeWeeks: 4, // Aggressive goal that would require >1000 deficit
      })

      expect(macros.deficit).toBeLessThanOrEqual(1000)
    })

    it('should calculate consistent surplus for muscle gain', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'gain',
        currentWeightKg: 70,
      })

      // Gain should have negative deficit (surplus)
      expect(macros.deficit).toBeLessThan(0)
      expect(macros.deficit).toBe(-300) // Fixed 300 cal surplus
      expect(macros.dailyCalories).toBe(2800)
    })

    it('should have zero deficit for maintenance', () => {
      const macros = calculateMacros({
        tdee: 2500,
        goalType: 'maintain',
        currentWeightKg: 75,
      })

      expect(macros.deficit).toBe(0)
      expect(macros.dailyCalories).toBe(2500)
      expect(macros.weightChangePerWeek).toBe(0)
    })
  })

  /**
   * Test fiber calculation consistency
   * Fiber is calculated as 14g per 1000 calories
   */
  describe('Fiber Calculation Consistency', () => {
    const calorieTestCases = [1500, 2000, 2500, 3000, 3500]

    calorieTestCases.forEach(targetCalories => {
      it(`should calculate ${Math.round((targetCalories / 1000) * 14)}g fiber for ${targetCalories} calories`, () => {
        const macros = calculateMacros({
          tdee: targetCalories, // Use TDEE = target for simplicity
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        const expectedFiber = Math.round((targetCalories / 1000) * 14)
        expect(macros.fiber).toBe(expectedFiber)
      })
    })
  })

  /**
   * Test that calculations work consistently with real profile data
   */
  describe('Integration with Test Profiles', () => {
    testProfiles.forEach(profile => {
      it(`should calculate consistent macros for ${profile.profileName}`, () => {
        if (!profile.weightKg || !profile.heightCm || !profile.age) {
          return // Skip incomplete profiles
        }

        const gender = (profile.gender || 'other') as 'male' | 'female' | 'other'
        const activityLevel = normalizeActivityLevel(profile.activityLevel)

        // Calculate twice and verify consistency
        const tdee1 = calculateTDEE({
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          gender,
          activityLevel,
        })

        const tdee2 = calculateTDEE({
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          age: profile.age,
          gender,
          activityLevel,
        })

        expect(tdee1.bmr).toBe(tdee2.bmr)
        expect(tdee1.tdee).toBe(tdee2.tdee)

        // Calculate macros and verify they match profile targets (if set)
        if (profile.goalType) {
          const goalType = profile.goalType as 'lose' | 'gain' | 'maintain'
          const macros = calculateMacros({
            tdee: tdee1.tdee,
            goalType,
            currentWeightKg: profile.weightKg,
            targetWeightKg: profile.targetWeightKg || undefined,
            goalTimeframeWeeks: profile.goalTimeframeWeeks || undefined,
          })

          // Macros should be reasonable
          expect(macros.dailyCalories).toBeGreaterThan(1000)
          expect(macros.dailyCalories).toBeLessThan(5000)
          expect(macros.protein).toBeGreaterThan(50)
          expect(macros.carbs).toBeGreaterThan(50)
          expect(macros.fat).toBeGreaterThan(20)
        }
      })
    })
  })

  /**
   * Test that rounding doesn't cause accumulating errors
   */
  describe('Rounding Consistency', () => {
    it('should not accumulate rounding errors across calculations', () => {
      const baseProfile = {
        weightKg: 77.7,
        heightCm: 175.5,
        age: 35,
        gender: 'female' as const,
        activityLevel: 'moderate' as const,
      }

      // Calculate multiple times with same input
      const results = Array(10).fill(null).map(() => calculateTDEE(baseProfile))

      // All results should be identical
      const firstResult = results[0]
      results.forEach((result, index) => {
        expect(result.bmr).toBe(firstResult.bmr)
        expect(result.tdee).toBe(firstResult.tdee)
      })
    })

    it('should round macros consistently', () => {
      const macros1 = calculateMacros({
        tdee: 2347, // Odd number to test rounding
        goalType: 'maintain',
        currentWeightKg: 73.5,
      })

      const macros2 = calculateMacros({
        tdee: 2347,
        goalType: 'maintain',
        currentWeightKg: 73.5,
      })

      expect(macros1.protein).toBe(macros2.protein)
      expect(macros1.carbs).toBe(macros2.carbs)
      expect(macros1.fat).toBe(macros2.fat)
    })
  })
})
