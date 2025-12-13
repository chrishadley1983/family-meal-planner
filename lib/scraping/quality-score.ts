/**
 * Calculate data quality score for scraped recipes
 * Score 0-100 based on completeness and data quality
 */

import { ParsedRecipeData } from './types'

interface QualityBreakdown {
  score: number
  maxScore: number
  details: string[]
}

/**
 * Calculate quality score for a parsed recipe
 * @returns Score from 0-100
 */
export function calculateQualityScore(recipe: ParsedRecipeData): number {
  let score = 0

  // Required fields (50 points max)
  if (recipe.name && recipe.name.length > 0) {
    score += 20
  }
  if (recipe.ingredients && recipe.ingredients.length > 0) {
    score += 20
    // Bonus for having a reasonable number of ingredients
    if (recipe.ingredients.length >= 3) {
      score += 5
    }
  }
  if (recipe.instructions && recipe.instructions.length > 0) {
    score += 10
  }

  // Important fields (30 points max)
  if (recipe.imageUrl && recipe.imageUrl.startsWith('http')) {
    score += 10
  }
  if (recipe.servings && recipe.servings > 0) {
    score += 5
  }
  if (recipe.prepTimeMinutes || recipe.cookTimeMinutes) {
    score += 5
  }
  if (recipe.caloriesPerServing && recipe.caloriesPerServing > 0) {
    score += 10
  }

  // Nice to have fields (20 points max)
  if (recipe.proteinPerServing && recipe.proteinPerServing > 0) {
    score += 5
  }
  if (recipe.cuisineType && recipe.cuisineType.length > 0) {
    score += 5
  }
  if (recipe.mealCategory && recipe.mealCategory.length > 0) {
    score += 5
  }
  if (recipe.description && recipe.description.length > 20) {
    score += 5
  }

  return Math.min(100, score)
}

/**
 * Get detailed breakdown of quality score
 */
export function getQualityBreakdown(recipe: ParsedRecipeData): QualityBreakdown {
  const details: string[] = []
  let score = 0
  const maxScore = 100

  // Check required fields
  if (!recipe.name || recipe.name.length === 0) {
    details.push('❌ Missing recipe name')
  } else {
    score += 20
    details.push('✅ Has recipe name (+20)')
  }

  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    details.push('❌ Missing ingredients')
  } else {
    score += 20
    details.push(`✅ Has ${recipe.ingredients.length} ingredients (+20)`)
    if (recipe.ingredients.length >= 3) {
      score += 5
      details.push('✅ Has 3+ ingredients (+5)')
    }
  }

  if (!recipe.instructions || recipe.instructions.length === 0) {
    details.push('❌ Missing instructions')
  } else {
    score += 10
    details.push(`✅ Has ${recipe.instructions.length} instructions (+10)`)
  }

  // Check important fields
  if (!recipe.imageUrl || !recipe.imageUrl.startsWith('http')) {
    details.push('⚠️ Missing image')
  } else {
    score += 10
    details.push('✅ Has image (+10)')
  }

  if (!recipe.servings || recipe.servings <= 0) {
    details.push('⚠️ Missing servings')
  } else {
    score += 5
    details.push('✅ Has servings (+5)')
  }

  if (!recipe.prepTimeMinutes && !recipe.cookTimeMinutes) {
    details.push('⚠️ Missing cooking times')
  } else {
    score += 5
    details.push('✅ Has cooking times (+5)')
  }

  if (!recipe.caloriesPerServing || recipe.caloriesPerServing <= 0) {
    details.push('⚠️ Missing calorie info')
  } else {
    score += 10
    details.push('✅ Has calorie info (+10)')
  }

  // Check nice-to-have fields
  if (recipe.proteinPerServing && recipe.proteinPerServing > 0) {
    score += 5
    details.push('✅ Has protein info (+5)')
  }

  if (recipe.cuisineType && recipe.cuisineType.length > 0) {
    score += 5
    details.push('✅ Has cuisine type (+5)')
  }

  if (recipe.mealCategory && recipe.mealCategory.length > 0) {
    score += 5
    details.push('✅ Has meal category (+5)')
  }

  if (recipe.description && recipe.description.length > 20) {
    score += 5
    details.push('✅ Has description (+5)')
  }

  return {
    score: Math.min(100, score),
    maxScore,
    details
  }
}

/**
 * Check if a recipe meets minimum quality threshold
 */
export function meetsQualityThreshold(
  recipe: ParsedRecipeData,
  threshold: number = 50
): boolean {
  return calculateQualityScore(recipe) >= threshold
}

/**
 * Get quality tier label
 */
export function getQualityTier(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
  if (score >= 80) return 'excellent'
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'poor'
}
