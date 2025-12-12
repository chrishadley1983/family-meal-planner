/**
 * Analysis functions for recipes, inventory, and staples
 * Used by the nutritionist to understand user's food patterns
 */

import {
  RecipeContext,
  InventoryContext,
  StapleContext,
  RecipeAnalysisResult,
  InventoryAnalysisResult,
  StaplesAnalysisResult,
  ProfileContext,
} from './types'
import { getProteinPerMeal } from './calculations'

/**
 * Analyze user's recipe collection for patterns and gaps
 */
export function analyzeRecipes(
  recipes: RecipeContext[],
  profile: ProfileContext
): RecipeAnalysisResult {
  const totalRecipes = recipes.length

  // Count by meal type
  const byMealType = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0,
  }

  recipes.forEach((recipe) => {
    recipe.mealType.forEach((type) => {
      const normalizedType = type.toLowerCase()
      if (normalizedType.includes('breakfast')) byMealType.breakfast++
      else if (normalizedType.includes('lunch')) byMealType.lunch++
      else if (normalizedType.includes('dinner')) byMealType.dinner++
      else if (normalizedType.includes('snack')) byMealType.snack++
    })
  })

  // Calculate average macros
  const recipesWithMacros = recipes.filter((r) => r.caloriesPerServing)
  const averageMacros = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  }

  if (recipesWithMacros.length > 0) {
    averageMacros.calories = Math.round(
      recipesWithMacros.reduce((sum, r) => sum + (r.caloriesPerServing || 0), 0) /
        recipesWithMacros.length
    )
    averageMacros.protein = Math.round(
      recipesWithMacros.reduce((sum, r) => sum + (r.proteinPerServing || 0), 0) /
        recipesWithMacros.length
    )
    averageMacros.carbs = Math.round(
      recipesWithMacros.reduce((sum, r) => sum + (r.carbsPerServing || 0), 0) /
        recipesWithMacros.length
    )
    averageMacros.fat = Math.round(
      recipesWithMacros.reduce((sum, r) => sum + (r.fatPerServing || 0), 0) /
        recipesWithMacros.length
    )
    averageMacros.fiber = Math.round(
      recipesWithMacros.reduce((sum, r) => sum + (r.fiberPerServing || 0), 0) /
        recipesWithMacros.length
    )
  }

  // Cuisine breakdown
  const cuisineCounts: Record<string, number> = {}
  recipes.forEach((recipe) => {
    const cuisine = recipe.cuisineType || 'Unspecified'
    cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1
  })
  const cuisineBreakdown = Object.entries(cuisineCounts)
    .map(([cuisine, count]) => ({ cuisine, count }))
    .sort((a, b) => b.count - a.count)

  // Extract protein sources from recipe names (simplified heuristic)
  const proteinKeywords = [
    'chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'cod', 'prawns',
    'shrimp', 'tofu', 'tempeh', 'eggs', 'turkey', 'duck', 'bacon', 'sausage',
    'mince', 'steak', 'vegetarian', 'vegan', 'lentils', 'beans', 'chickpeas',
  ]
  const proteinCounts: Record<string, number> = {}
  recipes.forEach((recipe) => {
    const name = recipe.name.toLowerCase()
    proteinKeywords.forEach((protein) => {
      if (name.includes(protein)) {
        const key = protein.charAt(0).toUpperCase() + protein.slice(1)
        proteinCounts[key] = (proteinCounts[key] || 0) + 1
      }
    })
  })
  const proteinSources = Object.entries(proteinCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)

  // Most and least used recipes
  const sortedByUsage = [...recipes].sort((a, b) => b.timesUsed - a.timesUsed)
  const mostUsedRecipes = sortedByUsage
    .slice(0, 5)
    .filter((r) => r.timesUsed > 0)
    .map((r) => ({ name: r.name, timesUsed: r.timesUsed }))
  const leastUsedRecipes = sortedByUsage
    .reverse()
    .slice(0, 5)
    .filter((r) => r.timesUsed === 0 || r.timesUsed === 1)
    .map((r) => ({ name: r.name, timesUsed: r.timesUsed }))

  // Favorite recipes
  const favoriteRecipes = recipes.filter((r) => r.isFavorite).map((r) => r.name)

  // Identify gaps and recommendations
  const gaps: string[] = []
  const recommendations: string[] = []

  // Check meal type coverage
  if (byMealType.breakfast < 3) {
    gaps.push('Limited breakfast options')
    recommendations.push('Add more breakfast recipes for variety')
  }
  if (byMealType.lunch < 5) {
    gaps.push('Limited lunch options')
    recommendations.push('Expand lunch repertoire')
  }
  if (byMealType.dinner < 10) {
    gaps.push('Limited dinner options')
    recommendations.push('Add more dinner recipes to avoid repetition')
  }

  // Check protein targets
  const targetProteinPerMeal = profile.dailyProteinTarget
    ? getProteinPerMeal(profile.dailyProteinTarget)
    : 30

  if (averageMacros.protein < targetProteinPerMeal * 0.8) {
    gaps.push(`Average protein (${averageMacros.protein}g) below target (${targetProteinPerMeal}g per meal)`)
    recommendations.push('Add high-protein recipes to meet your goals')
  }

  // Check protein source variety
  const fishCount = proteinCounts['Fish'] || 0 + proteinCounts['Salmon'] || 0 +
    proteinCounts['Tuna'] || 0 + proteinCounts['Cod'] || 0 + proteinCounts['Prawns'] || 0
  if (fishCount < 3) {
    gaps.push('Low fish intake (omega-3s are important)')
    recommendations.push('Add 3-4 fish recipes for omega-3 benefits')
  }

  const vegetarianCount = recipes.filter((r) =>
    r.name.toLowerCase().includes('vegetarian') ||
    r.name.toLowerCase().includes('vegan')
  ).length
  if (vegetarianCount < 3 && totalRecipes > 15) {
    gaps.push('Few vegetarian options')
    recommendations.push('Add some vegetarian recipes for variety and fiber')
  }

  // Check cuisine variety
  if (cuisineBreakdown.length < 3 && totalRecipes > 15) {
    gaps.push('Limited cuisine variety')
    recommendations.push('Explore different cuisines for more variety')
  }

  return {
    totalRecipes,
    byMealType,
    averageMacros,
    proteinSources,
    cuisineBreakdown,
    mostUsedRecipes,
    leastUsedRecipes,
    favoriteRecipes,
    gaps,
    recommendations,
  }
}

/**
 * Analyze inventory for nutritional balance and upcoming expirations
 */
export function analyzeInventory(
  inventory: InventoryContext[]
): InventoryAnalysisResult {
  const totalItems = inventory.length

  // Count by location
  const byLocation: Record<string, number> = {}
  inventory.forEach((item) => {
    const location = item.location || 'Unspecified'
    byLocation[location] = (byLocation[location] || 0) + 1
  })

  // Count by category
  const byCategory: Record<string, number> = {}
  inventory.forEach((item) => {
    const category = item.category || 'Uncategorized'
    byCategory[category] = (byCategory[category] || 0) + 1
  })

  // Find expiring items
  const expiringItems = inventory
    .filter((item): item is InventoryContext & { daysUntilExpiry: number } =>
      item.daysUntilExpiry !== null && item.daysUntilExpiry !== undefined && item.daysUntilExpiry <= 7
    )
    .map((item) => ({
      name: item.itemName,
      daysUntilExpiry: item.daysUntilExpiry,
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)

  // Check nutritional balance (simplified heuristic based on categories)
  const categories = Object.keys(byCategory).map((c) => c.toLowerCase())
  const itemNames = inventory.map((i) => i.itemName.toLowerCase())

  const proteinKeywords = ['chicken', 'beef', 'pork', 'fish', 'eggs', 'tofu', 'meat', 'protein']
  const carbKeywords = ['bread', 'pasta', 'rice', 'potato', 'oats', 'cereal', 'flour']
  const fatKeywords = ['butter', 'oil', 'cheese', 'cream', 'nuts', 'avocado']
  const vegetableKeywords = ['vegetable', 'lettuce', 'spinach', 'broccoli', 'carrot', 'pepper', 'onion', 'tomato']
  const fruitKeywords = ['fruit', 'apple', 'banana', 'orange', 'berry', 'grape']

  const hasProtein = proteinKeywords.some((k) =>
    itemNames.some((n) => n.includes(k)) || categories.some((c) => c.includes(k))
  )
  const hasCarbs = carbKeywords.some((k) =>
    itemNames.some((n) => n.includes(k)) || categories.some((c) => c.includes(k))
  )
  const hasFats = fatKeywords.some((k) =>
    itemNames.some((n) => n.includes(k)) || categories.some((c) => c.includes(k))
  )
  const hasVegetables = vegetableKeywords.some((k) =>
    itemNames.some((n) => n.includes(k)) || categories.some((c) => c.includes(k))
  )
  const hasFruits = fruitKeywords.some((k) =>
    itemNames.some((n) => n.includes(k)) || categories.some((c) => c.includes(k))
  )

  const nutritionalBalance = {
    hasProtein,
    hasCarbs,
    hasFats,
    hasVegetables,
    hasFruits,
  }

  // Generate suggestions
  const suggestions: string[] = []

  if (!hasProtein) {
    suggestions.push('Your inventory is low on protein sources - consider adding chicken, eggs, or fish')
  }
  if (!hasVegetables) {
    suggestions.push('Add more fresh vegetables to your inventory')
  }
  if (!hasFruits) {
    suggestions.push('Consider stocking some fresh fruits')
  }
  if (expiringItems.length > 0) {
    const expiringSoon = expiringItems.filter((i) => i.daysUntilExpiry <= 3)
    if (expiringSoon.length > 0) {
      suggestions.push(
        `Use ${expiringSoon.map((i) => i.name).join(', ')} soon - expiring within 3 days`
      )
    }
  }

  return {
    totalItems,
    byLocation,
    byCategory,
    expiringItems,
    nutritionalBalance,
    suggestions,
  }
}

/**
 * Analyze staples list for completeness
 */
export function analyzeStaples(staples: StapleContext[]): StaplesAnalysisResult {
  const totalStaples = staples.length

  // Count by frequency
  const byFrequency: Record<string, number> = {}
  staples.forEach((staple) => {
    const freq = staple.frequency || 'weekly'
    byFrequency[freq] = (byFrequency[freq] || 0) + 1
  })

  // Count by category
  const byCategory: Record<string, number> = {}
  staples.forEach((staple) => {
    const category = staple.category || 'Uncategorized'
    byCategory[category] = (byCategory[category] || 0) + 1
  })

  // Identify gaps in staples
  const gaps: string[] = []
  const suggestions: string[] = []

  const stapleNames = staples.map((s) => s.itemName.toLowerCase())

  // Check for common staples
  const essentialStaples = [
    { name: 'eggs', alternatives: ['egg'] },
    { name: 'milk', alternatives: ['milk'] },
    { name: 'bread', alternatives: ['bread', 'loaf'] },
    { name: 'butter', alternatives: ['butter'] },
    { name: 'cheese', alternatives: ['cheese', 'cheddar'] },
    { name: 'onions', alternatives: ['onion'] },
    { name: 'garlic', alternatives: ['garlic'] },
    { name: 'oil', alternatives: ['oil', 'olive'] },
  ]

  essentialStaples.forEach((essential) => {
    const hasItem = essential.alternatives.some((alt) =>
      stapleNames.some((name) => name.includes(alt))
    )
    if (!hasItem) {
      gaps.push(`Missing ${essential.name} from staples`)
    }
  })

  // Check for protein staples
  const proteinStaples = ['chicken', 'mince', 'beef', 'fish', 'tofu', 'eggs']
  const hasProteinStaple = proteinStaples.some((p) =>
    stapleNames.some((name) => name.includes(p))
  )
  if (!hasProteinStaple) {
    gaps.push('No regular protein source in staples')
    suggestions.push('Consider adding a weekly protein like chicken breast or mince')
  }

  // Check for vegetables
  const vegStaples = ['vegetable', 'salad', 'lettuce', 'broccoli', 'carrot']
  const hasVegStaple = vegStaples.some((v) =>
    stapleNames.some((name) => name.includes(v))
  )
  if (!hasVegStaple) {
    gaps.push('No vegetables in staples')
    suggestions.push('Add weekly vegetables like a salad bag or mixed veg')
  }

  // Check for whole grains
  const wholeGrains = ['brown rice', 'wholemeal', 'whole wheat', 'quinoa', 'oats']
  const hasWholeGrains = wholeGrains.some((g) =>
    stapleNames.some((name) => name.includes(g))
  )
  if (!hasWholeGrains && stapleNames.some((n) => n.includes('bread') || n.includes('pasta') || n.includes('rice'))) {
    suggestions.push('Consider swapping some refined carbs for whole grain options')
  }

  return {
    totalStaples,
    byFrequency,
    byCategory,
    gaps,
    suggestions,
  }
}

/**
 * Build context string for recipes to inject into AI prompt
 */
export function buildRecipeContextString(
  recipes: RecipeContext[],
  profile: ProfileContext
): string {
  const analysis = analyzeRecipes(recipes, profile)

  return `
**Recipe Statistics:**
- Total recipes: ${analysis.totalRecipes}
- By meal: Breakfast (${analysis.byMealType.breakfast}), Lunch (${analysis.byMealType.lunch}), Dinner (${analysis.byMealType.dinner}), Snacks (${analysis.byMealType.snack})
- Average macros: ${analysis.averageMacros.calories} kcal, ${analysis.averageMacros.protein}g protein, ${analysis.averageMacros.carbs}g carbs, ${analysis.averageMacros.fat}g fat

**Protein Sources:**
${analysis.proteinSources.slice(0, 5).map((p) => `- ${p.source}: ${p.count} recipes`).join('\n') || '- None identified'}

**Cuisine Variety:**
${analysis.cuisineBreakdown.slice(0, 5).map((c) => `- ${c.cuisine}: ${c.count} recipes`).join('\n') || '- Not specified'}

**Most Used:** ${analysis.mostUsedRecipes.map((r) => r.name).join(', ') || 'None yet'}
**Favorites:** ${analysis.favoriteRecipes.join(', ') || 'None marked'}

**Identified Gaps:**
${analysis.gaps.map((g) => `- ${g}`).join('\n') || '- None identified'}

**Recommendations:**
${analysis.recommendations.map((r) => `- ${r}`).join('\n') || '- Collection looks balanced'}
`.trim()
}

/**
 * Build context string for inventory to inject into AI prompt
 */
export function buildInventoryContextString(inventory: InventoryContext[]): string {
  const analysis = analyzeInventory(inventory)

  return `
**Current Inventory (${analysis.totalItems} items):**
${inventory.slice(0, 15).map((i) => `- ${i.itemName}: ${i.quantity} ${i.unit} (${i.location || 'unspecified'}${i.daysUntilExpiry ? `, expires in ${i.daysUntilExpiry} days` : ''})`).join('\n') || '- Empty'}

**Expiring Soon:**
${analysis.expiringItems.slice(0, 5).map((i) => `- ${i.name}: ${i.daysUntilExpiry} days`).join('\n') || '- Nothing expiring soon'}

**Nutritional Balance:**
- Protein sources: ${analysis.nutritionalBalance.hasProtein ? 'Yes' : 'Missing'}
- Carb sources: ${analysis.nutritionalBalance.hasCarbs ? 'Yes' : 'Missing'}
- Fat sources: ${analysis.nutritionalBalance.hasFats ? 'Yes' : 'Missing'}
- Vegetables: ${analysis.nutritionalBalance.hasVegetables ? 'Yes' : 'Missing'}
- Fruits: ${analysis.nutritionalBalance.hasFruits ? 'Yes' : 'Missing'}

**Suggestions:**
${analysis.suggestions.map((s) => `- ${s}`).join('\n') || '- Inventory looks well-stocked'}
`.trim()
}

/**
 * Build context string for staples to inject into AI prompt
 */
export function buildStaplesContextString(staples: StapleContext[]): string {
  const analysis = analyzeStaples(staples)

  return `
**Staples (${analysis.totalStaples} items):**
${staples.map((s) => `- ${s.itemName}: ${s.quantity} ${s.unit}, ${s.frequency.replace('_', ' ')}`).join('\n') || '- No staples set up'}

**By Frequency:**
${Object.entries(analysis.byFrequency).map(([freq, count]) => `- ${freq.replace('_', ' ')}: ${count} items`).join('\n')}

**Gaps:**
${analysis.gaps.map((g) => `- ${g}`).join('\n') || '- None identified'}

**Suggestions:**
${analysis.suggestions.map((s) => `- ${s}`).join('\n') || '- Staples list looks good'}
`.trim()
}
