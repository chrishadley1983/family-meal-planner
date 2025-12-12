/**
 * Nutritionist Calculations Tests
 * Tests for BMR, TDEE, macro calculations, and activity level normalization
 */

import {
  calculateBMR,
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
  getActivityLevelDescription,
  getProteinPerMeal,
  getGoalDescription,
} from '@/lib/nutritionist/calculations'
import { testProfiles } from '../fixtures/test-data'

describe('Nutritionist Calculations', () => {
  describe('calculateBMR', () => {
    describe('Mifflin-St Jeor Formula', () => {
      it('should calculate BMR for male correctly', () => {
        // Formula: (10 * weight) + (6.25 * height) - (5 * age) + 5
        // Example: 85kg, 180cm, 40 years = (10*85) + (6.25*180) - (5*40) + 5
        // = 850 + 1125 - 200 + 5 = 1780
        const bmr = calculateBMR(85, 180, 40, 'male')
        expect(bmr).toBe(1780)
      })

      it('should calculate BMR for female correctly', () => {
        // Formula: (10 * weight) + (6.25 * height) - (5 * age) - 161
        // Example: 65kg, 165cm, 38 years = (10*65) + (6.25*165) - (5*38) - 161
        // = 650 + 1031.25 - 190 - 161 = 1330.25 ≈ 1330
        const bmr = calculateBMR(65, 165, 38, 'female')
        expect(bmr).toBe(1330)
      })

      it('should calculate BMR for other gender (average)', () => {
        // Formula: (10 * weight) + (6.25 * height) - (5 * age) - 78 (average of +5 and -161)
        const bmr = calculateBMR(75, 170, 30, 'other')
        // (10*75) + (6.25*170) - (5*30) - 78 = 750 + 1062.5 - 150 - 78 = 1584.5 ≈ 1585
        expect(bmr).toBe(1585)
      })

      it('should handle edge cases', () => {
        // Very low weight
        const lowWeight = calculateBMR(40, 150, 25, 'female')
        expect(lowWeight).toBeGreaterThan(0)

        // Very high weight
        const highWeight = calculateBMR(150, 190, 30, 'male')
        expect(highWeight).toBeGreaterThan(2000)

        // Young person
        const young = calculateBMR(70, 175, 18, 'male')
        expect(young).toBeGreaterThan(1500)

        // Older person
        const older = calculateBMR(70, 175, 70, 'male')
        expect(older).toBeLessThan(young)
      })
    })
  })

  describe('calculateTDEE', () => {
    const baseInput = {
      weightKg: 80,
      heightCm: 175,
      age: 35,
      gender: 'male' as const,
    }

    it('should calculate sedentary TDEE (×1.2)', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'sedentary' })

      expect(result.bmr).toBeGreaterThan(0)
      expect(result.activityMultiplier).toBe(1.2)
      expect(result.tdee).toBe(Math.round(result.bmr * 1.2))
    })

    it('should calculate light activity TDEE (×1.375)', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'light' })

      expect(result.activityMultiplier).toBe(1.375)
      expect(result.tdee).toBe(Math.round(result.bmr * 1.375))
    })

    it('should calculate moderate activity TDEE (×1.55)', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'moderate' })

      expect(result.activityMultiplier).toBe(1.55)
      expect(result.tdee).toBe(Math.round(result.bmr * 1.55))
    })

    it('should calculate active TDEE (×1.725)', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'active' })

      expect(result.activityMultiplier).toBe(1.725)
      expect(result.tdee).toBe(Math.round(result.bmr * 1.725))
    })

    it('should calculate very active TDEE (×1.9)', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'very_active' })

      expect(result.activityMultiplier).toBe(1.9)
      expect(result.tdee).toBe(Math.round(result.bmr * 1.9))
    })

    it('should include BMR in result', () => {
      const result = calculateTDEE({ ...baseInput, activityLevel: 'moderate' })

      expect(result.bmr).toBeGreaterThan(0)
      expect(result.tdee).toBeGreaterThan(result.bmr)
    })
  })

  describe('calculateMacros', () => {
    describe('Weight Loss Goals', () => {
      it('should calculate deficit for weight loss', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'lose',
          currentWeightKg: 90,
          targetWeightKg: 80,
          goalTimeframeWeeks: 20,
        })

        expect(result.dailyCalories).toBeLessThan(2500)
        expect(result.deficit).toBeGreaterThan(0)
        expect(result.weightChangePerWeek).toBeLessThan(0)
      })

      it('should cap deficit at 1000 kcal for safety', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'lose',
          currentWeightKg: 100,
          targetWeightKg: 70,
          goalTimeframeWeeks: 4, // Aggressive goal
        })

        expect(result.deficit).toBeLessThanOrEqual(1000)
      })

      it('should use higher protein for weight loss (2.0g/kg)', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'lose',
          currentWeightKg: 80,
        })

        // Protein should be around 2.0 * 80 = 160g
        expect(result.protein).toBeGreaterThanOrEqual(150)
        expect(result.protein).toBeLessThanOrEqual(180)
      })

      it('should default to 500 kcal deficit without target', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'lose',
        })

        expect(result.deficit).toBe(500)
        expect(result.dailyCalories).toBe(2000)
      })
    })

    describe('Weight Gain Goals', () => {
      it('should calculate surplus for muscle gain', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'gain',
          currentWeightKg: 70,
        })

        expect(result.dailyCalories).toBeGreaterThan(2500)
        expect(result.deficit).toBeLessThan(0) // Negative deficit = surplus
        expect(result.weightChangePerWeek).toBeGreaterThan(0)
      })

      it('should use moderate surplus (300 kcal)', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'gain',
          currentWeightKg: 70,
        })

        expect(result.dailyCalories).toBe(2800) // 2500 + 300
      })
    })

    describe('Maintenance Goals', () => {
      it('should maintain TDEE for maintenance', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        expect(result.dailyCalories).toBe(2500)
        expect(result.deficit).toBe(0)
        expect(result.weightChangePerWeek).toBe(0)
      })
    })

    describe('Macro Distribution', () => {
      it('should calculate protein based on body weight', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
          currentWeightKg: 80,
        })

        // Maintenance: 1.6g/kg = 128g protein
        expect(result.protein).toBeGreaterThanOrEqual(120)
        expect(result.protein).toBeLessThanOrEqual(140)
      })

      it('should allocate ~25-30% of calories to fat', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        const fatCalories = result.fat * 9
        const fatPercentage = fatCalories / result.dailyCalories

        expect(fatPercentage).toBeGreaterThanOrEqual(0.23)
        expect(fatPercentage).toBeLessThanOrEqual(0.32)
      })

      it('should allocate remaining calories to carbs', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        const proteinCals = result.protein * 4
        const fatCals = result.fat * 9
        const carbCals = result.carbs * 4

        // Total should approximately equal daily calories
        const totalCals = proteinCals + fatCals + carbCals
        expect(Math.abs(totalCals - result.dailyCalories)).toBeLessThan(10)
      })

      it('should calculate fiber (14g per 1000 kcal)', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
          currentWeightKg: 75,
        })

        // 2500 kcal → 35g fiber
        expect(result.fiber).toBe(35)
      })
    })

    describe('Edge Cases', () => {
      it('should handle missing currentWeightKg', () => {
        const result = calculateMacros({
          tdee: 2500,
          goalType: 'maintain',
        })

        // Should fallback to calculating protein from percentage of calories
        expect(result.protein).toBeGreaterThan(0)
      })

      it('should handle very low TDEE', () => {
        const result = calculateMacros({
          tdee: 1200,
          goalType: 'maintain',
          currentWeightKg: 50,
        })

        expect(result.dailyCalories).toBe(1200)
        expect(result.protein).toBeGreaterThan(0)
        expect(result.carbs).toBeGreaterThan(0)
        expect(result.fat).toBeGreaterThan(0)
      })
    })
  })

  describe('normalizeActivityLevel', () => {
    it('should return moderate for null/undefined', () => {
      expect(normalizeActivityLevel(null)).toBe('moderate')
      expect(normalizeActivityLevel(undefined)).toBe('moderate')
    })

    it('should normalize sedentary variations', () => {
      expect(normalizeActivityLevel('sedentary')).toBe('sedentary')
      expect(normalizeActivityLevel('SEDENTARY')).toBe('sedentary')
      expect(normalizeActivityLevel('none')).toBe('sedentary')
    })

    it('should normalize light activity variations', () => {
      expect(normalizeActivityLevel('light')).toBe('light')
      expect(normalizeActivityLevel('Light Activity')).toBe('light')
      expect(normalizeActivityLevel('low')).toBe('light')
    })

    it('should normalize moderate variations', () => {
      expect(normalizeActivityLevel('moderate')).toBe('moderate')
      expect(normalizeActivityLevel('medium')).toBe('moderate')
      expect(normalizeActivityLevel('Moderately Active')).toBe('moderate')
    })

    it('should normalize active variations', () => {
      expect(normalizeActivityLevel('active')).toBe('active')
      expect(normalizeActivityLevel('high')).toBe('active')
      expect(normalizeActivityLevel('High Activity')).toBe('active')
    })

    it('should normalize very active variations', () => {
      expect(normalizeActivityLevel('very_active')).toBe('very_active')
      expect(normalizeActivityLevel('veryactive')).toBe('very_active')
      expect(normalizeActivityLevel('athlete')).toBe('very_active')
    })

    it('should default to moderate for unknown values', () => {
      expect(normalizeActivityLevel('unknown')).toBe('moderate')
      expect(normalizeActivityLevel('random')).toBe('moderate')
    })
  })

  describe('getActivityLevelDescription', () => {
    it('should return correct descriptions', () => {
      expect(getActivityLevelDescription('sedentary')).toContain('little or no exercise')
      expect(getActivityLevelDescription('light')).toContain('1-3 days/week')
      expect(getActivityLevelDescription('moderate')).toContain('3-5 days/week')
      expect(getActivityLevelDescription('active')).toContain('6-7 days/week')
      expect(getActivityLevelDescription('very_active')).toContain('physical job')
    })
  })

  describe('getProteinPerMeal', () => {
    it('should divide daily protein by 3 meals', () => {
      expect(getProteinPerMeal(150)).toBe(50)
      expect(getProteinPerMeal(120)).toBe(40)
      expect(getProteinPerMeal(90)).toBe(30)
    })

    it('should round to nearest integer', () => {
      expect(getProteinPerMeal(100)).toBe(33)
      expect(getProteinPerMeal(110)).toBe(37)
    })
  })

  describe('getGoalDescription', () => {
    it('should return correct goal descriptions', () => {
      expect(getGoalDescription('lose')).toContain('Lose')
      expect(getGoalDescription('gain')).toContain('Build')
      expect(getGoalDescription('maintain')).toContain('Maintain')
    })

    it('should handle null/undefined', () => {
      expect(getGoalDescription(null)).toContain('Not specified')
      expect(getGoalDescription(undefined)).toContain('Not specified')
    })
  })

  describe('Integration with Test Profiles', () => {
    it('should calculate correct values for Chris profile', () => {
      const chris = testProfiles[0]

      const tdeeResult = calculateTDEE({
        weightKg: chris.weightKg!,
        heightCm: chris.heightCm!,
        age: chris.age!,
        gender: chris.gender as 'male' | 'female' | 'other',
        activityLevel: normalizeActivityLevel(chris.activityLevel),
      })

      const macroResult = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: chris.goalType as 'lose' | 'gain' | 'maintain',
        currentWeightKg: chris.weightKg!,
        targetWeightKg: chris.targetWeightKg!,
        goalTimeframeWeeks: chris.goalTimeframeWeeks!,
      })

      // Chris: 85kg, 180cm, 40yo, male, moderate, lose weight
      expect(tdeeResult.bmr).toBeGreaterThan(1600)
      expect(tdeeResult.tdee).toBeGreaterThan(2400)
      expect(macroResult.dailyCalories).toBeLessThan(tdeeResult.tdee)
      expect(macroResult.protein).toBeGreaterThan(150) // High protein for weight loss
    })

    it('should calculate correct values for Sarah profile', () => {
      const sarah = testProfiles[1]

      const tdeeResult = calculateTDEE({
        weightKg: sarah.weightKg!,
        heightCm: sarah.heightCm!,
        age: sarah.age!,
        gender: sarah.gender as 'male' | 'female' | 'other',
        activityLevel: normalizeActivityLevel(sarah.activityLevel),
      })

      const macroResult = calculateMacros({
        tdee: tdeeResult.tdee,
        goalType: sarah.goalType as 'lose' | 'gain' | 'maintain',
        currentWeightKg: sarah.weightKg!,
      })

      // Sarah: 65kg, 165cm, 38yo, female, light, maintain
      expect(tdeeResult.bmr).toBeLessThan(1500)
      expect(tdeeResult.tdee).toBeGreaterThan(1700)
      expect(macroResult.dailyCalories).toBe(tdeeResult.tdee) // Maintenance
      expect(macroResult.deficit).toBe(0)
    })
  })
})
