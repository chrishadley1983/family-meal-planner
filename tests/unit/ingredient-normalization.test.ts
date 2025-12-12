/**
 * Ingredient Normalization Tests
 * Tests for UK/US synonym mapping, preparation stripping, and duplicate detection
 */

import {
  normalizeIngredientName,
  calculateSimilarity,
  groupByNormalizedName,
  findPotentialDuplicates,
  getConfidenceFromSimilarity,
  _testExports,
} from '@/lib/ingredient-normalization'
import { testIngredientNormalization } from '../fixtures/test-data'

describe('Ingredient Normalization', () => {
  describe('normalizeIngredientName', () => {
    describe('UK/US Synonym Mapping', () => {
      it('should normalize US vegetables to UK names', () => {
        expect(normalizeIngredientName('eggplant')).toBe('aubergine')
        expect(normalizeIngredientName('zucchini')).toBe('courgette')
        expect(normalizeIngredientName('arugula')).toBe('rocket')
        expect(normalizeIngredientName('cilantro')).toBe('coriander')
      })

      it('should normalize US meat terms to UK names', () => {
        expect(normalizeIngredientName('ground beef')).toBe('beef mince')
        expect(normalizeIngredientName('ground pork')).toBe('pork mince')
        expect(normalizeIngredientName('shrimp')).toBe('prawn')
      })

      it('should normalize US dairy terms to UK names', () => {
        expect(normalizeIngredientName('heavy cream')).toBe('double cream')
        expect(normalizeIngredientName('light cream')).toBe('single cream')
        expect(normalizeIngredientName('skim milk')).toBe('skimmed milk')
      })

      it('should normalize US baking terms to UK names', () => {
        expect(normalizeIngredientName('all-purpose flour')).toBe('plain flour')
        expect(normalizeIngredientName('powdered sugar')).toBe('icing sugar')
        expect(normalizeIngredientName('cornstarch')).toBe('cornflour')
        expect(normalizeIngredientName('baking soda')).toBe('bicarbonate of soda')
      })

      it('should normalize stock/broth terms', () => {
        expect(normalizeIngredientName('chicken broth')).toBe('chicken stock')
        expect(normalizeIngredientName('beef broth')).toBe('beef stock')
        expect(normalizeIngredientName('bouillon cube')).toBe('stock cube')
      })

      it('should normalize bean names', () => {
        expect(normalizeIngredientName('garbanzo beans')).toBe('chickpea')
        expect(normalizeIngredientName('navy beans')).toBe('haricot bean')
        expect(normalizeIngredientName('lima beans')).toBe('butter bean')
      })
    })

    describe('Preparation Stripping', () => {
      it('should strip preparation prefixes', () => {
        expect(normalizeIngredientName('diced onion')).toBe('onion')
        expect(normalizeIngredientName('chopped garlic')).toBe('garlic')
        expect(normalizeIngredientName('minced beef')).toBe('beef')
        expect(normalizeIngredientName('sliced tomatoes')).toBe('tomato')
      })

      it('should strip multiple preparation words', () => {
        expect(normalizeIngredientName('finely diced onion')).toBe('onion')
        expect(normalizeIngredientName('peeled and diced potato')).toBe('potato')
      })

      it('should strip freshness indicators', () => {
        expect(normalizeIngredientName('fresh basil')).toBe('basil')
        expect(normalizeIngredientName('dried oregano')).toBe('oregano')
        expect(normalizeIngredientName('frozen peas')).toBe('pea')
      })
    })

    describe('Modifier Stripping', () => {
      it('should strip organic/free-range modifiers', () => {
        expect(normalizeIngredientName('organic chicken breast')).toBe('chicken')
        expect(normalizeIngredientName('free-range eggs')).toBe('egg')
        expect(normalizeIngredientName('grass-fed beef')).toBe('beef')
      })

      it('should strip size modifiers', () => {
        expect(normalizeIngredientName('large onion')).toBe('onion')
        expect(normalizeIngredientName('medium potato')).toBe('potato')
        expect(normalizeIngredientName('small tomato')).toBe('tomato')
      })

      it('should strip dietary modifiers', () => {
        expect(normalizeIngredientName('low-fat milk')).toBe('milk')
        expect(normalizeIngredientName('unsalted butter')).toBe('butter')
        expect(normalizeIngredientName('sugar-free yoghurt')).toBe('yoghurt')
      })
    })

    describe('Form Words Stripping', () => {
      it('should strip count/portion forms', () => {
        expect(normalizeIngredientName('garlic cloves')).toBe('garlic')
        expect(normalizeIngredientName('chicken breast')).toBe('chicken')
        expect(normalizeIngredientName('basil leaves')).toBe('basil')
      })

      it('should keep form words if they are the only content', () => {
        // "cloves" alone should not become empty
        const result = normalizeIngredientName('cloves')
        expect(result.length).toBeGreaterThan(0)
      })

      it('should strip packaging forms', () => {
        expect(normalizeIngredientName('tin of tomatoes')).toContain('tomato')
        expect(normalizeIngredientName('jar of honey')).toContain('honey')
      })
    })

    describe('Plural Normalization', () => {
      it('should normalize -ies plurals to -y', () => {
        expect(normalizeIngredientName('berries')).toBe('berry')
        expect(normalizeIngredientName('cherries')).toBe('cherry')
      })

      it('should normalize -oes plurals', () => {
        expect(normalizeIngredientName('tomatoes')).toBe('tomato')
        expect(normalizeIngredientName('potatoes')).toBe('potato')
      })

      it('should normalize regular -s plurals', () => {
        expect(normalizeIngredientName('carrots')).toBe('carrot')
        expect(normalizeIngredientName('onions')).toBe('onion')
        expect(normalizeIngredientName('peppers')).toBe('pepper')
      })

      it('should handle -es plurals correctly', () => {
        expect(normalizeIngredientName('dishes')).toBe('dish')
        expect(normalizeIngredientName('boxes')).toBe('box')
      })
    })

    describe('Parentheses and Comma Handling', () => {
      it('should remove content in parentheses', () => {
        expect(normalizeIngredientName('chicken (boneless)')).toBe('chicken')
        expect(normalizeIngredientName('milk (whole)')).toBe('milk')
      })

      it('should remove content after commas', () => {
        expect(normalizeIngredientName('garlic, minced')).toBe('garlic')
        expect(normalizeIngredientName('onion, finely diced')).toBe('onion')
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty strings', () => {
        expect(normalizeIngredientName('')).toBe('')
      })

      it('should handle whitespace', () => {
        expect(normalizeIngredientName('  chicken  ')).toBe('chicken')
        expect(normalizeIngredientName('chicken   breast')).toBe('chicken')
      })

      it('should handle hyphens', () => {
        expect(normalizeIngredientName('all-purpose flour')).toBe('plain flour')
        expect(normalizeIngredientName('free-range chicken')).toBe('chicken')
      })

      it('should be case-insensitive', () => {
        expect(normalizeIngredientName('CHICKEN')).toBe(normalizeIngredientName('chicken'))
        expect(normalizeIngredientName('Chicken Breast')).toBe('chicken')
      })
    })
  })

  describe('calculateSimilarity', () => {
    it('should return 1.0 for exact matches after normalization', () => {
      expect(calculateSimilarity('chicken', 'chicken')).toBe(1.0)
      expect(calculateSimilarity('chicken breast', 'chicken breasts')).toBe(1.0)
      expect(calculateSimilarity('eggplant', 'aubergine')).toBe(1.0) // Synonyms
    })

    it('should return high similarity for contained strings', () => {
      const similarity = calculateSimilarity('chicken', 'chicken breast')
      expect(similarity).toBeGreaterThan(0.5)
    })

    it('should return positive similarity for partial overlap', () => {
      const similarity = calculateSimilarity('chicken breast', 'beef breast')
      expect(similarity).toBeGreaterThan(0)
      expect(similarity).toBeLessThan(1)
    })

    it('should return 0 for completely different ingredients', () => {
      const similarity = calculateSimilarity('apple', 'beef')
      expect(similarity).toBe(0)
    })

    it('should handle empty strings', () => {
      expect(calculateSimilarity('', '')).toBe(1.0)
      expect(calculateSimilarity('chicken', '')).toBe(0)
    })
  })

  describe('groupByNormalizedName', () => {
    it('should group items with same normalized name', () => {
      const items = [
        { id: '1', itemName: 'Chicken Breast' },
        { id: '2', itemName: 'chicken breast' },
        { id: '3', itemName: 'Beef Mince' },
      ]

      const groups = groupByNormalizedName(items)

      expect(groups.size).toBe(2) // chicken and beef mince
      expect(groups.get('chicken')?.length).toBe(2)
    })

    it('should group US/UK synonyms together', () => {
      const items = [
        { id: '1', itemName: 'eggplant' },
        { id: '2', itemName: 'aubergine' },
      ]

      const groups = groupByNormalizedName(items)

      // Both should normalize to 'aubergine'
      expect(groups.size).toBe(1)
      const aubergineGroup = groups.get('aubergine')
      expect(aubergineGroup?.length).toBe(2)
    })

    it('should keep different ingredients separate', () => {
      const items = [
        { id: '1', itemName: 'chicken' },
        { id: '2', itemName: 'beef' },
        { id: '3', itemName: 'pork' },
      ]

      const groups = groupByNormalizedName(items)
      expect(groups.size).toBe(3)
    })
  })

  describe('findPotentialDuplicates', () => {
    it('should find duplicate groups with 2+ items', () => {
      const items = [
        { id: '1', itemName: 'Chicken Breast' },
        { id: '2', itemName: 'chicken breast' },
        { id: '3', itemName: 'Beef Mince' },
      ]

      const duplicates = findPotentialDuplicates(items)

      expect(duplicates.length).toBe(1)
      expect(duplicates[0].items.length).toBe(2)
    })

    it('should not return groups with only one item', () => {
      const items = [
        { id: '1', itemName: 'Chicken' },
        { id: '2', itemName: 'Beef' },
        { id: '3', itemName: 'Pork' },
      ]

      const duplicates = findPotentialDuplicates(items)
      expect(duplicates.length).toBe(0)
    })

    it('should include normalized name in result', () => {
      const items = [
        { id: '1', itemName: 'Fresh Chicken Breast' },
        { id: '2', itemName: 'Organic Chicken' },
      ]

      const duplicates = findPotentialDuplicates(items)

      if (duplicates.length > 0) {
        expect(duplicates[0].normalizedName).toBeDefined()
      }
    })
  })

  describe('getConfidenceFromSimilarity', () => {
    it('should return HIGH for similarity >= 0.9', () => {
      expect(getConfidenceFromSimilarity(0.9)).toBe('HIGH')
      expect(getConfidenceFromSimilarity(1.0)).toBe('HIGH')
      expect(getConfidenceFromSimilarity(0.95)).toBe('HIGH')
    })

    it('should return MEDIUM for similarity >= 0.6 and < 0.9', () => {
      expect(getConfidenceFromSimilarity(0.6)).toBe('MEDIUM')
      expect(getConfidenceFromSimilarity(0.75)).toBe('MEDIUM')
      expect(getConfidenceFromSimilarity(0.89)).toBe('MEDIUM')
    })

    it('should return LOW for similarity < 0.6', () => {
      expect(getConfidenceFromSimilarity(0.5)).toBe('LOW')
      expect(getConfidenceFromSimilarity(0.3)).toBe('LOW')
      expect(getConfidenceFromSimilarity(0)).toBe('LOW')
    })
  })

  describe('Test Exports (Internal Functions)', () => {
    const { INGREDIENT_SYNONYMS, FORM_WORDS, PREP_PREFIXES, MODIFIER_PREFIXES } = _testExports

    it('should have comprehensive synonym mappings', () => {
      expect(Object.keys(INGREDIENT_SYNONYMS).length).toBeGreaterThan(50)
    })

    it('should have common form words', () => {
      expect(FORM_WORDS.has('clove')).toBe(true)
      expect(FORM_WORDS.has('breast')).toBe(true)
      expect(FORM_WORDS.has('slice')).toBe(true)
    })

    it('should have preparation prefixes', () => {
      expect(PREP_PREFIXES.has('diced')).toBe(true)
      expect(PREP_PREFIXES.has('chopped')).toBe(true)
      expect(PREP_PREFIXES.has('minced')).toBe(true)
    })

    it('should have modifier prefixes', () => {
      expect(MODIFIER_PREFIXES.has('fresh')).toBe(true)
      expect(MODIFIER_PREFIXES.has('organic')).toBe(true)
      expect(MODIFIER_PREFIXES.has('large')).toBe(true)
    })
  })

  describe('Integration Tests from Test Data', () => {
    testIngredientNormalization.forEach(({ input, expected }) => {
      it(`should normalize "${input}" to contain "${expected}"`, () => {
        const normalized = normalizeIngredientName(input)
        expect(normalized).toContain(expected.toLowerCase())
      })
    })
  })

  describe('Complex Real-World Scenarios', () => {
    it('should handle recipe-style ingredient descriptions', () => {
      const ingredients = [
        '2 large organic chicken breasts, sliced',
        '400g tin of chopped tomatoes',
        '1 tbsp extra virgin olive oil',
        '3 cloves of garlic, minced',
        '1 cup of all-purpose flour, sifted',
      ]

      const normalized = ingredients.map(normalizeIngredientName)

      expect(normalized[0]).toBe('chicken')
      expect(normalized[1]).toContain('tomato')
      expect(normalized[2]).toContain('olive oil')
      expect(normalized[3]).toBe('garlic')
      expect(normalized[4]).toBe('plain flour')
    })

    it('should detect duplicates in shopping list items', () => {
      const shoppingList = [
        { id: '1', itemName: 'chicken breast' },
        { id: '2', itemName: 'Chicken Breasts (boneless)' },
        { id: '3', itemName: 'organic free-range chicken' },
        { id: '4', itemName: 'beef mince' },
        { id: '5', itemName: 'ground beef' },
      ]

      const duplicates = findPotentialDuplicates(shoppingList)

      // Should find chicken group and beef group
      expect(duplicates.length).toBeGreaterThanOrEqual(2)

      const chickenGroup = duplicates.find(d => d.normalizedName === 'chicken')
      expect(chickenGroup?.items.length).toBe(3)

      const beefGroup = duplicates.find(d => d.normalizedName === 'beef mince')
      expect(beefGroup?.items.length).toBe(2)
    })
  })
})
