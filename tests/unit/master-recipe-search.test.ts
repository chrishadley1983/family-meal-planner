/**
 * Master Recipe Search Tests
 * Tests for the search utility used by Nutritionist to find curated recipes
 */

import {
  parseSearchRequirements,
  MasterRecipeSearchParams,
} from '@/lib/nutritionist/master-recipe-search'

describe('Master Recipe Search', () => {
  describe('parseSearchRequirements', () => {
    it('should extract keywords from simple message', () => {
      const result = parseSearchRequirements('find me a chicken dinner')
      expect(result.keywords).toContain('chicken')
      // 'dinner' is a meal category, not a keyword
      expect(result.mealCategory).toContain('dinner')
    })

    it('should identify cuisine type from message', () => {
      const result = parseSearchRequirements('I want Italian pasta for dinner')
      // Cuisine types are returned lowercase
      expect(result.cuisineType).toBe('italian')
    })

    it('should identify multiple cuisine types and pick first', () => {
      const result = parseSearchRequirements('Do you have Mexican or Chinese recipes?')
      // Cuisine types are returned lowercase
      expect(result.cuisineType).toBe('mexican')
    })

    it('should identify meal category', () => {
      const breakfastResult = parseSearchRequirements('What can I have for breakfast?')
      expect(breakfastResult.mealCategory).toContain('breakfast')

      const dinnerResult = parseSearchRequirements('Need a quick dinner idea')
      expect(dinnerResult.mealCategory).toContain('dinner')
    })

    it('should identify dietary requirements', () => {
      const result = parseSearchRequirements('Show me vegetarian recipes')
      expect(result.dietaryTags).toContain('vegetarian')
    })

    it('should identify vegan dietary requirement', () => {
      const result = parseSearchRequirements('I need vegan dinner options')
      expect(result.dietaryTags).toContain('vegan')
    })

    it('should identify gluten-free requirement', () => {
      const result = parseSearchRequirements('gluten free pasta alternatives')
      expect(result.dietaryTags).toContain('gluten-free')
    })

    it('should extract calorie constraints', () => {
      const result = parseSearchRequirements('recipes under 500 calories')
      expect(result.maxCalories).toBe(500)
    })

    it('should extract protein requirements', () => {
      const result = parseSearchRequirements('high protein meals with at least 30g protein')
      expect(result.minProtein).toBe(30)
    })

    it('should extract time constraints', () => {
      const result = parseSearchRequirements('quick recipes under 30 minutes')
      expect(result.maxTotalTime).toBe(30)
    })

    it('should handle quick/fast keywords for time', () => {
      const quickResult = parseSearchRequirements('quick chicken recipe')
      expect(quickResult.maxTotalTime).toBe(30)

      const fastResult = parseSearchRequirements('fast dinner ideas')
      expect(fastResult.maxTotalTime).toBe(30)
    })

    it('should handle complex multi-requirement message', () => {
      const result = parseSearchRequirements(
        'I want a quick Italian vegetarian dinner under 400 calories'
      )
      // Cuisine types are returned lowercase
      expect(result.cuisineType).toBe('italian')
      expect(result.dietaryTags).toContain('vegetarian')
      expect(result.mealCategory).toContain('dinner')
      expect(result.maxCalories).toBe(400)
      expect(result.maxTotalTime).toBe(30) // "quick" implies 30 min
    })

    it('should return empty params for vague message', () => {
      const result = parseSearchRequirements('what should I eat?')
      // Should have minimal or no specific constraints
      expect(result.cuisineType).toBeUndefined()
      expect(result.dietaryTags?.length || 0).toBe(0)
    })

    it('should handle allergen mentions', () => {
      const result = parseSearchRequirements('dairy free dessert recipes')
      expect(result.dietaryTags).toContain('dairy-free')
    })

    it('should be case insensitive', () => {
      const result = parseSearchRequirements('VEGETARIAN ITALIAN DINNER')
      // Cuisine types are returned lowercase regardless of input case
      expect(result.cuisineType).toBe('italian')
      expect(result.dietaryTags).toContain('vegetarian')
    })
  })

  describe('Search Parameters Structure', () => {
    it('should have correct interface structure', () => {
      const params: MasterRecipeSearchParams = {
        keywords: ['chicken', 'curry'],
        cuisineType: 'Indian',
        mealCategory: ['dinner', 'lunch'],
        dietaryTags: ['gluten-free'],
        maxCalories: 600,
        minProtein: 25,
        maxTotalTime: 45,
        excludeAllergens: ['nuts', 'dairy'],
        limit: 10,
      }

      expect(params.keywords).toHaveLength(2)
      expect(params.cuisineType).toBe('Indian')
      expect(params.mealCategory).toContain('dinner')
      expect(params.dietaryTags).toContain('gluten-free')
      expect(params.maxCalories).toBe(600)
      expect(params.minProtein).toBe(25)
      expect(params.maxTotalTime).toBe(45)
      expect(params.excludeAllergens).toContain('nuts')
      expect(params.limit).toBe(10)
    })

    it('should allow partial parameters', () => {
      const params: MasterRecipeSearchParams = {
        keywords: ['salad'],
      }

      expect(params.keywords).toContain('salad')
      expect(params.cuisineType).toBeUndefined()
      expect(params.maxCalories).toBeUndefined()
    })
  })
})
