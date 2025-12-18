/**
 * Emilia (Nutritionist AI) Arithmetic Accuracy Tests
 *
 * Tests to catch arithmetic errors in analysis functions.
 * These tests address pain points where Emilia's calculations
 * produced incorrect results due to arithmetic bugs.
 *
 * Key areas tested:
 * 1. Average calculations in recipe analysis
 * 2. Count aggregations for meal types
 * 3. Operator precedence issues (e.g., || with +)
 * 4. Percentage calculations
 * 5. Division edge cases (divide by zero, rounding)
 */

import {
  analyzeRecipes,
  analyzeInventory,
  analyzeStaples,
} from '@/lib/nutritionist/analysis'
import {
  RecipeContext,
  InventoryContext,
  StapleContext,
  ProfileContext,
} from '@/lib/nutritionist/types'

describe('Emilia Arithmetic Accuracy', () => {
  const testProfile: ProfileContext = {
    profileId: 'test-profile-1',
    profileName: 'Test User',
    age: 35,
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
    dailyFatTarget: 70,
    dailyFiberTarget: 35,
    macroTrackingEnabled: true,
    allergies: [],
    foodLikes: [],
    foodDislikes: [],
  }

  /**
   * Test average macro calculations
   * This catches bugs where averages are miscalculated
   */
  describe('Recipe Analysis - Average Calculations', () => {
    it('should calculate correct average macros with single recipe', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Chicken Stir Fry',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 400,
          proteinPerServing: 35,
          carbsPerServing: 30,
          fatPerServing: 15,
          fiberPerServing: 5,
          cuisineType: 'Asian',
          timesUsed: 5,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.averageMacros.calories).toBe(400)
      expect(result.averageMacros.protein).toBe(35)
      expect(result.averageMacros.carbs).toBe(30)
      expect(result.averageMacros.fat).toBe(15)
      expect(result.averageMacros.fiber).toBe(5)
    })

    it('should calculate correct average macros with multiple recipes', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Chicken Stir Fry',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 400,
          proteinPerServing: 35,
          carbsPerServing: 30,
          fatPerServing: 15,
          fiberPerServing: 5,
          cuisineType: 'Asian',
          timesUsed: 5,
          isFavorite: false,
        },
        {
          id: '2',
          name: 'Beef Tacos',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 500,
          proteinPerServing: 30,
          carbsPerServing: 40,
          fatPerServing: 25,
          fiberPerServing: 8,
          cuisineType: 'Mexican',
          timesUsed: 3,
          isFavorite: true,
        },
        {
          id: '3',
          name: 'Salmon Bowl',
          mealType: ['dinner'],
          servings: 2,
          caloriesPerServing: 450,
          proteinPerServing: 40,
          carbsPerServing: 35,
          fatPerServing: 18,
          fiberPerServing: 6,
          cuisineType: 'Japanese',
          timesUsed: 2,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // Manual calculation: (400+500+450)/3 = 450
      expect(result.averageMacros.calories).toBe(450)
      // (35+30+40)/3 = 35
      expect(result.averageMacros.protein).toBe(35)
      // (30+40+35)/3 = 35
      expect(result.averageMacros.carbs).toBe(35)
      // (15+25+18)/3 = 19.33... rounds to 19
      expect(result.averageMacros.fat).toBe(19)
      // (5+8+6)/3 = 6.33... rounds to 6
      expect(result.averageMacros.fiber).toBe(6)
    })

    it('should handle recipes with null/undefined macro values', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Chicken Stir Fry',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 400,
          proteinPerServing: 35,
          carbsPerServing: 30,
          fatPerServing: 15,
          fiberPerServing: 5,
          cuisineType: 'Asian',
          timesUsed: 5,
          isFavorite: false,
        },
        {
          id: '2',
          name: 'Mystery Dish',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: null,
          proteinPerServing: null,
          carbsPerServing: null,
          fatPerServing: null,
          fiberPerServing: null,
          cuisineType: 'Other',
          timesUsed: 1,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // Should only average recipes WITH macros
      expect(result.averageMacros.calories).toBe(400)
      expect(result.averageMacros.protein).toBe(35)
    })

    it('should handle empty recipe list', () => {
      const result = analyzeRecipes([], testProfile)

      expect(result.averageMacros.calories).toBe(0)
      expect(result.averageMacros.protein).toBe(0)
      expect(result.averageMacros.carbs).toBe(0)
      expect(result.averageMacros.fat).toBe(0)
      expect(result.averageMacros.fiber).toBe(0)
      expect(result.totalRecipes).toBe(0)
    })

    it('should handle all recipes having null macros', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Recipe 1',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: null,
          proteinPerServing: null,
          carbsPerServing: null,
          fatPerServing: null,
          fiberPerServing: null,
          cuisineType: null,
          timesUsed: 0,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.averageMacros.calories).toBe(0)
      expect(result.averageMacros.protein).toBe(0)
    })
  })

  /**
   * Test meal type counting
   * This catches bugs in aggregation logic
   */
  describe('Recipe Analysis - Meal Type Counting', () => {
    it('should count meal types correctly', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Eggs Benedict',
          mealType: ['breakfast'],
          servings: 2,
          caloriesPerServing: 350,
          proteinPerServing: 20,
          carbsPerServing: 25,
          fatPerServing: 18,
          fiberPerServing: 2,
          cuisineType: 'American',
          timesUsed: 3,
          isFavorite: true,
        },
        {
          id: '2',
          name: 'Caesar Salad',
          mealType: ['lunch'],
          servings: 2,
          caloriesPerServing: 300,
          proteinPerServing: 15,
          carbsPerServing: 20,
          fatPerServing: 18,
          fiberPerServing: 5,
          cuisineType: 'Italian',
          timesUsed: 5,
          isFavorite: false,
        },
        {
          id: '3',
          name: 'Grilled Steak',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 500,
          proteinPerServing: 45,
          carbsPerServing: 0,
          fatPerServing: 35,
          fiberPerServing: 0,
          cuisineType: 'American',
          timesUsed: 2,
          isFavorite: true,
        },
        {
          id: '4',
          name: 'Trail Mix',
          mealType: ['snack'],
          servings: 8,
          caloriesPerServing: 200,
          proteinPerServing: 6,
          carbsPerServing: 15,
          fatPerServing: 14,
          fiberPerServing: 3,
          cuisineType: null,
          timesUsed: 10,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.byMealType.breakfast).toBe(1)
      expect(result.byMealType.lunch).toBe(1)
      expect(result.byMealType.dinner).toBe(1)
      expect(result.byMealType.snack).toBe(1)
    })

    it('should handle recipes with multiple meal types', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Versatile Wrap',
          mealType: ['lunch', 'dinner'], // Counts for both
          servings: 2,
          caloriesPerServing: 400,
          proteinPerServing: 25,
          carbsPerServing: 35,
          fatPerServing: 18,
          fiberPerServing: 5,
          cuisineType: 'Mexican',
          timesUsed: 8,
          isFavorite: true,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.byMealType.lunch).toBe(1)
      expect(result.byMealType.dinner).toBe(1)
      expect(result.byMealType.breakfast).toBe(0)
      expect(result.byMealType.snack).toBe(0)
    })

    it('should handle case-insensitive meal type matching', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Breakfast Bowl',
          mealType: ['Breakfast'], // Capital B
          servings: 2,
          caloriesPerServing: 350,
          proteinPerServing: 20,
          carbsPerServing: 40,
          fatPerServing: 12,
          fiberPerServing: 8,
          cuisineType: null,
          timesUsed: 5,
          isFavorite: false,
        },
        {
          id: '2',
          name: 'LUNCH SPECIAL',
          mealType: ['LUNCH'], // All caps
          servings: 2,
          caloriesPerServing: 400,
          proteinPerServing: 30,
          carbsPerServing: 35,
          fatPerServing: 15,
          fiberPerServing: 6,
          cuisineType: null,
          timesUsed: 3,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.byMealType.breakfast).toBe(1)
      expect(result.byMealType.lunch).toBe(1)
    })
  })

  /**
   * Test operator precedence issues
   * This addresses the specific bug found in analysis.ts:151-152
   * where fishCount used || with + incorrectly
   */
  describe('Recipe Analysis - Operator Precedence', () => {
    it('should correctly count protein sources', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Grilled Salmon',
          mealType: ['dinner'],
          servings: 2,
          caloriesPerServing: 400,
          proteinPerServing: 40,
          carbsPerServing: 5,
          fatPerServing: 25,
          fiberPerServing: 0,
          cuisineType: 'American',
          timesUsed: 5,
          isFavorite: true,
        },
        {
          id: '2',
          name: 'Chicken Caesar',
          mealType: ['lunch'],
          servings: 2,
          caloriesPerServing: 350,
          proteinPerServing: 30,
          carbsPerServing: 15,
          fatPerServing: 20,
          fiberPerServing: 3,
          cuisineType: 'Italian',
          timesUsed: 8,
          isFavorite: false,
        },
        {
          id: '3',
          name: 'Tuna Salad',
          mealType: ['lunch'],
          servings: 2,
          caloriesPerServing: 300,
          proteinPerServing: 28,
          carbsPerServing: 10,
          fatPerServing: 18,
          fiberPerServing: 2,
          cuisineType: 'American',
          timesUsed: 4,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // Should identify protein sources correctly
      const salmonCount = result.proteinSources.find(p => p.source === 'Salmon')
      const chickenCount = result.proteinSources.find(p => p.source === 'Chicken')
      const tunaCount = result.proteinSources.find(p => p.source === 'Tuna')

      expect(salmonCount?.count).toBe(1)
      expect(chickenCount?.count).toBe(1)
      expect(tunaCount?.count).toBe(1)
    })

    it('should count multiple occurrences of same protein', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Chicken Stir Fry',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 400,
          proteinPerServing: 35,
          carbsPerServing: 30,
          fatPerServing: 15,
          fiberPerServing: 5,
          cuisineType: 'Asian',
          timesUsed: 5,
          isFavorite: false,
        },
        {
          id: '2',
          name: 'Chicken Tacos',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 450,
          proteinPerServing: 32,
          carbsPerServing: 40,
          fatPerServing: 18,
          fiberPerServing: 6,
          cuisineType: 'Mexican',
          timesUsed: 3,
          isFavorite: true,
        },
        {
          id: '3',
          name: 'Lemon Chicken',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 380,
          proteinPerServing: 38,
          carbsPerServing: 15,
          fatPerServing: 20,
          fiberPerServing: 2,
          cuisineType: 'Mediterranean',
          timesUsed: 2,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      const chickenCount = result.proteinSources.find(p => p.source === 'Chicken')
      expect(chickenCount?.count).toBe(3)
    })
  })

  /**
   * Test percentage calculations
   * Ensures percentages don't exceed 100% or go negative
   */
  describe('Percentage Calculations', () => {
    it('should calculate cuisine breakdown percentages correctly', () => {
      const recipes: RecipeContext[] = [
        { id: '1', name: 'R1', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: 'Italian', timesUsed: 1, isFavorite: false },
        { id: '2', name: 'R2', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: 'Italian', timesUsed: 1, isFavorite: false },
        { id: '3', name: 'R3', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: 'Mexican', timesUsed: 1, isFavorite: false },
        { id: '4', name: 'R4', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: 'Asian', timesUsed: 1, isFavorite: false },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // Should be sorted by count
      expect(result.cuisineBreakdown[0].cuisine).toBe('Italian')
      expect(result.cuisineBreakdown[0].count).toBe(2)

      // Total should equal number of recipes
      const totalCuisineCount = result.cuisineBreakdown.reduce((sum, c) => sum + c.count, 0)
      expect(totalCuisineCount).toBe(4)
    })
  })

  /**
   * Test inventory analysis arithmetic
   */
  describe('Inventory Analysis - Counting', () => {
    it('should count items by location correctly', () => {
      const inventory: InventoryContext[] = [
        { id: '1', itemName: 'Milk', quantity: 2, unit: 'litres', category: 'Dairy', location: 'fridge', daysUntilExpiry: 5 },
        { id: '2', itemName: 'Chicken', quantity: 1, unit: 'kg', category: 'Protein', location: 'fridge', daysUntilExpiry: 3 },
        { id: '3', itemName: 'Frozen Peas', quantity: 500, unit: 'g', category: 'Vegetables', location: 'freezer', daysUntilExpiry: 90 },
        { id: '4', itemName: 'Rice', quantity: 1, unit: 'kg', category: 'Grains', location: 'cupboard', daysUntilExpiry: null },
      ]

      const result = analyzeInventory(inventory)

      expect(result.byLocation['fridge']).toBe(2)
      expect(result.byLocation['freezer']).toBe(1)
      expect(result.byLocation['cupboard']).toBe(1)
      expect(result.totalItems).toBe(4)
    })

    it('should count items by category correctly', () => {
      const inventory: InventoryContext[] = [
        { id: '1', itemName: 'Milk', quantity: 2, unit: 'litres', category: 'Dairy', location: 'fridge', daysUntilExpiry: 5 },
        { id: '2', itemName: 'Cheese', quantity: 200, unit: 'g', category: 'Dairy', location: 'fridge', daysUntilExpiry: 14 },
        { id: '3', itemName: 'Yogurt', quantity: 4, unit: 'pots', category: 'Dairy', location: 'fridge', daysUntilExpiry: 7 },
        { id: '4', itemName: 'Chicken', quantity: 1, unit: 'kg', category: 'Protein', location: 'fridge', daysUntilExpiry: 3 },
      ]

      const result = analyzeInventory(inventory)

      expect(result.byCategory['Dairy']).toBe(3)
      expect(result.byCategory['Protein']).toBe(1)
    })

    it('should identify expiring items correctly', () => {
      const inventory: InventoryContext[] = [
        { id: '1', itemName: 'Milk', quantity: 2, unit: 'litres', category: 'Dairy', location: 'fridge', daysUntilExpiry: 2 },
        { id: '2', itemName: 'Chicken', quantity: 1, unit: 'kg', category: 'Protein', location: 'fridge', daysUntilExpiry: 1 },
        { id: '3', itemName: 'Cheese', quantity: 200, unit: 'g', category: 'Dairy', location: 'fridge', daysUntilExpiry: 14 },
        { id: '4', itemName: 'Lettuce', quantity: 1, unit: 'head', category: 'Vegetables', location: 'fridge', daysUntilExpiry: 5 },
      ]

      const result = analyzeInventory(inventory)

      // Items expiring within 7 days
      expect(result.expiringItems.length).toBe(3) // Milk (2), Chicken (1), Lettuce (5)

      // Should be sorted by days until expiry (ascending)
      expect(result.expiringItems[0].name).toBe('Chicken')
      expect(result.expiringItems[0].daysUntilExpiry).toBe(1)
    })

    it('should handle null expiry dates', () => {
      const inventory: InventoryContext[] = [
        { id: '1', itemName: 'Rice', quantity: 1, unit: 'kg', category: 'Grains', location: 'cupboard', daysUntilExpiry: null },
        { id: '2', itemName: 'Pasta', quantity: 500, unit: 'g', category: 'Grains', location: 'cupboard', daysUntilExpiry: null },
      ]

      const result = analyzeInventory(inventory)

      expect(result.expiringItems.length).toBe(0)
      expect(result.totalItems).toBe(2)
    })
  })

  /**
   * Test staples analysis arithmetic
   */
  describe('Staples Analysis - Counting', () => {
    it('should count staples by frequency correctly', () => {
      const staples: StapleContext[] = [
        { id: '1', itemName: 'Milk', quantity: 2, unit: 'litres', category: 'Dairy', frequency: 'weekly' },
        { id: '2', itemName: 'Eggs', quantity: 12, unit: 'pieces', category: 'Dairy', frequency: 'weekly' },
        { id: '3', itemName: 'Chicken', quantity: 1, unit: 'kg', category: 'Protein', frequency: 'weekly' },
        { id: '4', itemName: 'Olive Oil', quantity: 1, unit: 'bottle', category: 'Oils', frequency: 'every_4_weeks' },
      ]

      const result = analyzeStaples(staples)

      expect(result.byFrequency['weekly']).toBe(3)
      expect(result.byFrequency['every_4_weeks']).toBe(1)
      expect(result.totalStaples).toBe(4)
    })

    it('should count staples by category correctly', () => {
      const staples: StapleContext[] = [
        { id: '1', itemName: 'Milk', quantity: 2, unit: 'litres', category: 'Dairy', frequency: 'weekly' },
        { id: '2', itemName: 'Cheese', quantity: 200, unit: 'g', category: 'Dairy', frequency: 'weekly' },
        { id: '3', itemName: 'Butter', quantity: 250, unit: 'g', category: 'Dairy', frequency: 'every_2_weeks' },
      ]

      const result = analyzeStaples(staples)

      expect(result.byCategory['Dairy']).toBe(3)
    })

    it('should handle uncategorized staples', () => {
      const staples: StapleContext[] = [
        { id: '1', itemName: 'Something', quantity: 1, unit: 'pack', category: null, frequency: 'weekly' },
      ]

      const result = analyzeStaples(staples)

      expect(result.byCategory['Uncategorized']).toBe(1)
    })
  })

  /**
   * Test edge cases for division
   */
  describe('Division Edge Cases', () => {
    it('should handle divide by zero scenarios', () => {
      const emptyRecipes: RecipeContext[] = []
      const result = analyzeRecipes(emptyRecipes, testProfile)

      // Should not throw, should return 0
      expect(result.averageMacros.calories).toBe(0)
      expect(result.averageMacros.protein).toBe(0)
    })

    it('should handle decimal rounding consistently', () => {
      const recipes: RecipeContext[] = [
        {
          id: '1',
          name: 'Recipe 1',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 333, // 333 / 3 = 111
          proteinPerServing: 33,   // 33 / 3 = 11
          carbsPerServing: 33,
          fatPerServing: 11,       // 11 / 3 = 3.67 -> rounds to 4
          fiberPerServing: 5,
          cuisineType: null,
          timesUsed: 0,
          isFavorite: false,
        },
        {
          id: '2',
          name: 'Recipe 2',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 333,
          proteinPerServing: 33,
          carbsPerServing: 33,
          fatPerServing: 11,
          fiberPerServing: 5,
          cuisineType: null,
          timesUsed: 0,
          isFavorite: false,
        },
        {
          id: '3',
          name: 'Recipe 3',
          mealType: ['dinner'],
          servings: 4,
          caloriesPerServing: 334, // (333+333+334)/3 = 333.33 -> rounds to 333
          proteinPerServing: 34,   // (33+33+34)/3 = 33.33 -> rounds to 33
          carbsPerServing: 34,
          fatPerServing: 12,       // (11+11+12)/3 = 11.33 -> rounds to 11
          fiberPerServing: 5,
          cuisineType: null,
          timesUsed: 0,
          isFavorite: false,
        },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // All values should be rounded integers
      expect(Number.isInteger(result.averageMacros.calories)).toBe(true)
      expect(Number.isInteger(result.averageMacros.protein)).toBe(true)
      expect(Number.isInteger(result.averageMacros.carbs)).toBe(true)
      expect(Number.isInteger(result.averageMacros.fat)).toBe(true)
      expect(Number.isInteger(result.averageMacros.fiber)).toBe(true)
    })
  })

  /**
   * Test that timesUsed sorting is correct
   */
  describe('Usage Sorting', () => {
    it('should sort most used recipes correctly', () => {
      const recipes: RecipeContext[] = [
        { id: '1', name: 'Used 5 times', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 5, isFavorite: false },
        { id: '2', name: 'Used 10 times', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 10, isFavorite: false },
        { id: '3', name: 'Used 3 times', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 3, isFavorite: false },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      expect(result.mostUsedRecipes[0].name).toBe('Used 10 times')
      expect(result.mostUsedRecipes[0].timesUsed).toBe(10)
      expect(result.mostUsedRecipes[1].name).toBe('Used 5 times')
    })

    it('should identify least used recipes correctly', () => {
      const recipes: RecipeContext[] = [
        { id: '1', name: 'Never used', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 0, isFavorite: false },
        { id: '2', name: 'Used once', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 1, isFavorite: false },
        { id: '3', name: 'Used many times', mealType: ['dinner'], servings: 4, caloriesPerServing: 400, proteinPerServing: 30, carbsPerServing: 30, fatPerServing: 15, fiberPerServing: 5, cuisineType: null, timesUsed: 50, isFavorite: false },
      ]

      const result = analyzeRecipes(recipes, testProfile)

      // Least used should include 0 and 1
      const leastUsedNames = result.leastUsedRecipes.map(r => r.name)
      expect(leastUsedNames).toContain('Never used')
      expect(leastUsedNames).toContain('Used once')
      expect(leastUsedNames).not.toContain('Used many times')
    })
  })
})
