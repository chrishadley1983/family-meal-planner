/**
 * Unit Conversion Tests
 * Tests for metric conversion, unit compatibility, and quantity combining
 */

import {
  convertToMetric,
  areUnitsCompatible,
  combineQuantities,
  formatQuantity,
  formatQuantityWithUnit,
  findDuplicates,
  COMMON_UNITS,
  DEFAULT_CATEGORIES,
} from '@/lib/unit-conversion'
import { testUnitConversions } from '../fixtures/test-data'

describe('Unit Conversion', () => {
  describe('convertToMetric', () => {
    it('should convert cups to millilitres', () => {
      const result = convertToMetric(1, 'cup')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(236.59, 1)
    })

    it('should convert tablespoons to millilitres', () => {
      const result = convertToMetric(2, 'tbsp')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(29.57, 1)
    })

    it('should convert ounces to grams', () => {
      const result = convertToMetric(1, 'oz')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('g')
      expect(result.quantity).toBeCloseTo(28.35, 1)
    })

    it('should convert pounds to grams', () => {
      const result = convertToMetric(1, 'lb')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('g')
      expect(result.quantity).toBeCloseTo(453.59, 1)
    })

    it('should not convert already metric units', () => {
      const gramResult = convertToMetric(500, 'g')
      expect(gramResult.wasConverted).toBe(false)
      expect(gramResult.unit).toBe('g')
      expect(gramResult.quantity).toBe(500)

      const mlResult = convertToMetric(250, 'ml')
      expect(mlResult.wasConverted).toBe(false)
      expect(mlResult.unit).toBe('ml')
      expect(mlResult.quantity).toBe(250)
    })

    it('should convert kilograms to grams', () => {
      const result = convertToMetric(1.5, 'kg')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('g')
      expect(result.quantity).toBe(1500)
    })

    it('should convert litres to millilitres', () => {
      const result = convertToMetric(2, 'L')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBe(2000)
    })

    it('should not convert non-convertible units', () => {
      const pieceResult = convertToMetric(3, 'piece')
      expect(pieceResult.wasConverted).toBe(false)
      expect(pieceResult.unit).toBe('piece')
      expect(pieceResult.quantity).toBe(3)

      const cloveResult = convertToMetric(4, 'cloves')
      expect(cloveResult.wasConverted).toBe(false)
      expect(cloveResult.unit).toBe('cloves')
      expect(cloveResult.quantity).toBe(4)
    })

    it('should handle unit name variations', () => {
      const results = [
        convertToMetric(1, 'ounce'),
        convertToMetric(1, 'ounces'),
        convertToMetric(1, 'oz'),
      ]

      results.forEach(result => {
        expect(result.wasConverted).toBe(true)
        expect(result.unit).toBe('g')
        expect(result.quantity).toBeCloseTo(28.35, 1)
      })
    })

    it('should handle teaspoons', () => {
      const result = convertToMetric(3, 'tsp')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(14.79, 1)
    })

    it('should preserve original values', () => {
      const result = convertToMetric(2, 'cups')
      expect(result.originalQuantity).toBe(2)
      expect(result.originalUnit).toBe('cups')
    })

    it('should handle unknown units', () => {
      const result = convertToMetric(5, 'unknownunit')
      expect(result.wasConverted).toBe(false)
      expect(result.unit).toBe('unknownunit')
      expect(result.quantity).toBe(5)
    })

    it('should convert pints', () => {
      const result = convertToMetric(1, 'pint')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(473.18, 1)
    })

    it('should convert quarts', () => {
      const result = convertToMetric(1, 'quart')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(946.35, 1)
    })

    it('should convert gallons', () => {
      const result = convertToMetric(1, 'gallon')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(3785.41, 1)
    })

    it('should convert fluid ounces', () => {
      const result = convertToMetric(1, 'fl oz')
      expect(result.wasConverted).toBe(true)
      expect(result.unit).toBe('ml')
      expect(result.quantity).toBeCloseTo(29.57, 1)
    })
  })

  describe('areUnitsCompatible', () => {
    it('should return true for same units', () => {
      expect(areUnitsCompatible('g', 'g')).toBe(true)
      expect(areUnitsCompatible('ml', 'ml')).toBe(true)
      expect(areUnitsCompatible('cup', 'cup')).toBe(true)
    })

    it('should return true for compatible weight units', () => {
      expect(areUnitsCompatible('g', 'kg')).toBe(true)
      expect(areUnitsCompatible('oz', 'lb')).toBe(true)
      expect(areUnitsCompatible('g', 'oz')).toBe(true)
    })

    it('should return true for compatible volume units', () => {
      expect(areUnitsCompatible('ml', 'L')).toBe(true)
      expect(areUnitsCompatible('cup', 'tbsp')).toBe(true)
      expect(areUnitsCompatible('ml', 'cup')).toBe(true)
    })

    it('should return false for incompatible units', () => {
      expect(areUnitsCompatible('g', 'ml')).toBe(false)
      expect(areUnitsCompatible('cup', 'oz')).toBe(false) // volume vs weight
      expect(areUnitsCompatible('kg', 'L')).toBe(false)
    })

    it('should handle unknown units', () => {
      expect(areUnitsCompatible('unknown1', 'unknown2')).toBe(false)
      expect(areUnitsCompatible('unknown', 'unknown')).toBe(true)
    })
  })

  describe('combineQuantities', () => {
    it('should combine compatible weight quantities', () => {
      const result = combineQuantities(500, 'g', 1, 'kg')
      expect(result).not.toBeNull()
      expect(result!.quantity).toBe(1500)
      expect(result!.unit).toBe('g')
    })

    it('should combine compatible volume quantities', () => {
      const result = combineQuantities(250, 'ml', 1, 'cup')
      expect(result).not.toBeNull()
      expect(result!.unit).toBe('ml')
      expect(result!.quantity).toBeCloseTo(486.59, 1)
    })

    it('should return null for incompatible units', () => {
      const result = combineQuantities(500, 'g', 250, 'ml')
      expect(result).toBeNull()
    })

    it('should combine same units without conversion', () => {
      const result = combineQuantities(250, 'g', 750, 'g')
      expect(result).not.toBeNull()
      expect(result!.quantity).toBe(1000)
      expect(result!.unit).toBe('g')
      expect(result!.wasConverted).toBe(false)
    })

    it('should mark as converted when conversion happens', () => {
      const result = combineQuantities(1, 'oz', 1, 'lb')
      expect(result).not.toBeNull()
      expect(result!.wasConverted).toBe(true)
    })
  })

  describe('formatQuantity', () => {
    it('should format whole numbers without decimals', () => {
      expect(formatQuantity(5)).toBe('5')
      expect(formatQuantity(100)).toBe('100')
    })

    it('should format decimal numbers with up to 2 places', () => {
      expect(formatQuantity(5.5)).toBe('5.5')
      expect(formatQuantity(3.14159)).toBe('3.14')
    })

    it('should remove trailing zeros', () => {
      expect(formatQuantity(5.10)).toBe('5.1')
      expect(formatQuantity(3.00)).toBe('3')
    })

    it('should handle zero', () => {
      expect(formatQuantity(0)).toBe('0')
    })
  })

  describe('formatQuantityWithUnit', () => {
    it('should format quantity with unit', () => {
      expect(formatQuantityWithUnit(500, 'g')).toBe('500 g')
      expect(formatQuantityWithUnit(1.5, 'kg')).toBe('1.5 kg')
      expect(formatQuantityWithUnit(250, 'ml')).toBe('250 ml')
    })
  })

  describe('findDuplicates', () => {
    it('should find duplicate items by normalized name', () => {
      const items = [
        { id: '1', itemName: 'Chicken Breast', quantity: 500, unit: 'g' },
        { id: '2', itemName: 'chicken breast', quantity: 300, unit: 'g' },
        { id: '3', itemName: 'Beef Mince', quantity: 500, unit: 'g' },
      ]

      const duplicates = findDuplicates(items)
      expect(duplicates.length).toBe(1)
      expect(duplicates[0].items.length).toBe(2)
    })

    it('should mark groups as combinable when units are compatible', () => {
      const items = [
        { id: '1', itemName: 'Milk', quantity: 500, unit: 'ml' },
        { id: '2', itemName: 'milk', quantity: 1, unit: 'L' },
      ]

      const duplicates = findDuplicates(items)
      expect(duplicates[0].canCombine).toBe(true)
      expect(duplicates[0].combinedResult).toBeDefined()
      expect(duplicates[0].combinedResult!.quantity).toBe(1500)
    })

    it('should not mark as combinable when units are incompatible', () => {
      const items = [
        { id: '1', itemName: 'Sugar', quantity: 500, unit: 'g' },
        { id: '2', itemName: 'sugar', quantity: 2, unit: 'cup' }, // Volume
      ]

      const duplicates = findDuplicates(items)
      // Cups convert to ml, g stays as g, so they're not compatible
      expect(duplicates[0].canCombine).toBe(false)
    })

    it('should handle items with no duplicates', () => {
      const items = [
        { id: '1', itemName: 'Chicken', quantity: 500, unit: 'g' },
        { id: '2', itemName: 'Beef', quantity: 500, unit: 'g' },
        { id: '3', itemName: 'Pork', quantity: 500, unit: 'g' },
      ]

      const duplicates = findDuplicates(items)
      expect(duplicates.length).toBe(0)
    })

    it('should include source in duplicates', () => {
      const items = [
        { id: '1', itemName: 'Olive Oil', quantity: 1, unit: 'bottle', source: 'recipe' },
        { id: '2', itemName: 'olive oil', quantity: 1, unit: 'bottle', source: 'staples' },
      ]

      const duplicates = findDuplicates(items)
      expect(duplicates[0].items[0].source).toBe('recipe')
      expect(duplicates[0].items[1].source).toBe('staples')
    })
  })

  describe('COMMON_UNITS', () => {
    it('should include volume units', () => {
      const volumeUnits = COMMON_UNITS.filter(u => u.type === 'volume')
      expect(volumeUnits.length).toBeGreaterThan(0)
      expect(volumeUnits.some(u => u.value === 'ml')).toBe(true)
      expect(volumeUnits.some(u => u.value === 'L')).toBe(true)
    })

    it('should include weight units', () => {
      const weightUnits = COMMON_UNITS.filter(u => u.type === 'weight')
      expect(weightUnits.length).toBeGreaterThan(0)
      expect(weightUnits.some(u => u.value === 'g')).toBe(true)
      expect(weightUnits.some(u => u.value === 'kg')).toBe(true)
    })

    it('should include count units', () => {
      const countUnits = COMMON_UNITS.filter(u => u.type === 'count')
      expect(countUnits.length).toBeGreaterThan(0)
      expect(countUnits.some(u => u.value === 'pack')).toBe(true)
      expect(countUnits.some(u => u.value === 'bottle')).toBe(true)
    })
  })

  describe('DEFAULT_CATEGORIES', () => {
    it('should have required categories', () => {
      const categoryNames = DEFAULT_CATEGORIES.map(c => c.name)
      expect(categoryNames).toContain('Fresh Produce')
      expect(categoryNames).toContain('Meat & Fish')
      expect(categoryNames).toContain('Dairy & Eggs')
      expect(categoryNames).toContain('Cupboard Staples')
      expect(categoryNames).toContain('Other')
    })

    it('should have display order for all categories', () => {
      DEFAULT_CATEGORIES.forEach(category => {
        expect(typeof category.displayOrder).toBe('number')
      })
    })

    it('should have "Other" category with highest order', () => {
      const otherCategory = DEFAULT_CATEGORIES.find(c => c.name === 'Other')
      expect(otherCategory).toBeDefined()
      expect(otherCategory!.displayOrder).toBe(99)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small quantities', () => {
      const result = convertToMetric(0.25, 'tsp')
      expect(result.quantity).toBeCloseTo(1.23, 1)
    })

    it('should handle very large quantities', () => {
      const result = convertToMetric(100, 'kg')
      expect(result.quantity).toBe(100000)
      expect(result.unit).toBe('g')
    })

    it('should handle decimal conversions accurately', () => {
      const result = convertToMetric(2.5, 'tbsp')
      expect(result.quantity).toBeCloseTo(36.97, 1)
    })

    it('should handle case-insensitive unit matching', () => {
      const upperResult = convertToMetric(1, 'CUP')
      const lowerResult = convertToMetric(1, 'cup')
      expect(upperResult.quantity).toBeCloseTo(lowerResult.quantity, 1)
    })
  })
})
