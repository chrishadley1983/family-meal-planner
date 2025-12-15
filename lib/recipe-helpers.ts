// Recipe helper functions for smart placeholders

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  category?: string | null
  notes?: string | null
}

// Detect main ingredient from recipe ingredients list
export function getMainIngredient(ingredients: Ingredient[]): string {
  // Priority order: look for proteins first, then main components
  const proteinKeywords = [
    'chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'prawn',
    'lamb', 'turkey', 'duck', 'steak', 'mince', 'cod', 'haddock', 'prawns',
    'bacon', 'ham', 'sausage'
  ]
  const vegKeywords = ['tofu', 'tempeh', 'chickpea', 'lentil', 'bean', 'quinoa']
  const carbKeywords = ['pasta', 'spaghetti', 'rice', 'noodle', 'bread']

  // Check for proteins
  for (const ing of ingredients) {
    const name = ing.ingredientName.toLowerCase()
    for (const protein of proteinKeywords) {
      if (name.includes(protein)) {
        // Normalize some keywords to base types
        if (['mince', 'steak'].some(k => name.includes(k))) {
          return name.includes('chicken') ? 'chicken' : 'beef'
        }
        if (['cod', 'haddock', 'tuna'].some(k => name.includes(k))) return 'fish'
        if (name.includes('prawns')) return 'shrimp'
        return protein
      }
    }
  }

  // Check for vegetarian proteins
  for (const ing of ingredients) {
    const name = ing.ingredientName.toLowerCase()
    for (const veg of vegKeywords) {
      if (name.includes(veg)) return 'vegetables'
    }
  }

  // Check for carbs as main
  for (const ing of ingredients) {
    const name = ing.ingredientName.toLowerCase()
    for (const carb of carbKeywords) {
      if (name.includes(carb)) {
        if (['spaghetti', 'pasta', 'noodle'].some(k => name.includes(k))) return 'pasta'
        if (name.includes('rice')) return 'rice'
        return 'default'
      }
    }
  }

  return 'default'
}

// Color gradient mapping based on main ingredient
export const ingredientColors: Record<string, string> = {
  beef: 'from-red-500/80 to-orange-600/80',
  chicken: 'from-amber-500/80 to-yellow-600/80',
  pork: 'from-pink-500/80 to-rose-600/80',
  fish: 'from-blue-500/80 to-cyan-600/80',
  salmon: 'from-orange-400/80 to-pink-500/80',
  shrimp: 'from-red-400/80 to-orange-500/80',
  prawn: 'from-red-400/80 to-orange-500/80',
  lamb: 'from-red-600/80 to-rose-700/80',
  turkey: 'from-amber-600/80 to-orange-600/80',
  duck: 'from-orange-600/80 to-red-600/80',
  bacon: 'from-red-500/80 to-pink-600/80',
  ham: 'from-pink-400/80 to-rose-500/80',
  sausage: 'from-amber-600/80 to-red-600/80',
  vegetables: 'from-emerald-500/80 to-teal-600/80',
  pasta: 'from-amber-400/80 to-yellow-500/80',
  rice: 'from-yellow-400/80 to-amber-500/80',
  default: 'from-purple-500/80 to-pink-600/80',
}

// Emoji mapping based on main ingredient
export const ingredientEmojis: Record<string, string> = {
  beef: '🥩',
  chicken: '🍗',
  pork: '🥓',
  fish: '🐟',
  salmon: '🐟',
  shrimp: '🦐',
  prawn: '🦐',
  lamb: '🍖',
  turkey: '🦃',
  duck: '🦆',
  bacon: '🥓',
  ham: '🥓',
  sausage: '🌭',
  vegetables: '🥗',
  pasta: '🍝',
  rice: '🍚',
  default: '🍽️',
}

// Get gradient class for a recipe based on ingredients
export function getRecipeGradient(ingredients: Ingredient[]): string {
  const mainIngredient = getMainIngredient(ingredients)
  return ingredientColors[mainIngredient] || ingredientColors.default
}

// Get emoji for a recipe based on ingredients
export function getRecipeEmoji(ingredients: Ingredient[]): string {
  const mainIngredient = getMainIngredient(ingredients)
  return ingredientEmojis[mainIngredient] || ingredientEmojis.default
}

// Quick filter definitions
export const quickFilters = [
  { id: 'quick', icon: 'Zap', label: 'Under 30 min' },
  { id: 'protein', icon: 'TrendingUp', label: 'High protein' },
  { id: 'favourite', icon: 'Heart', label: 'Most used' },
  { id: 'veggie', icon: 'Leaf', label: 'Vegetarian' },
] as const

export type QuickFilterId = typeof quickFilters[number]['id']
