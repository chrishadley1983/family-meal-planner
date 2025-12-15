'use client'

import Image from 'next/image'
import { Badge, Button } from '@/components/ui'

export interface DiscoverRecipe {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  sourceUrl: string
  sourceSite: {
    displayName: string
    name: string
  }
  prepTimeMinutes?: number | null
  cookTimeMinutes?: number | null
  totalTimeMinutes?: number | null
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
  cuisineType?: string | null
  mealCategory: string[]
  dietaryTags: string[]
  allergens: string[]
  servings?: number | null
  dataQualityScore: number
  alreadyInLibrary: boolean
}

// Helper function to get gradient style based on cuisine/meal type
const getPlaceholderStyle = (recipe: DiscoverRecipe): string => {
  const cuisineColors: Record<string, string> = {
    italian: 'from-red-500/80 to-orange-600/80',
    mexican: 'from-amber-500/80 to-red-600/80',
    asian: 'from-red-500/80 to-pink-600/80',
    chinese: 'from-red-500/80 to-amber-600/80',
    japanese: 'from-pink-500/80 to-red-600/80',
    indian: 'from-orange-500/80 to-yellow-600/80',
    mediterranean: 'from-blue-500/80 to-cyan-600/80',
    american: 'from-blue-500/80 to-red-600/80',
    french: 'from-purple-500/80 to-blue-600/80',
    thai: 'from-green-500/80 to-amber-600/80',
    greek: 'from-blue-500/80 to-white/60',
    spanish: 'from-red-500/80 to-yellow-600/80',
    british: 'from-blue-500/80 to-red-600/80',
    healthy: 'from-emerald-500/80 to-teal-600/80',
    vegetarian: 'from-emerald-500/80 to-green-600/80',
    vegan: 'from-green-500/80 to-emerald-600/80',
  }

  const mealColors: Record<string, string> = {
    breakfast: 'from-amber-500/80 to-yellow-600/80',
    lunch: 'from-emerald-500/80 to-teal-600/80',
    dinner: 'from-purple-500/80 to-pink-600/80',
    snack: 'from-orange-500/80 to-amber-600/80',
    dessert: 'from-pink-500/80 to-rose-600/80',
  }

  // Try cuisine first
  if (recipe.cuisineType) {
    const cuisineLower = recipe.cuisineType.toLowerCase()
    if (cuisineColors[cuisineLower]) {
      return cuisineColors[cuisineLower]
    }
  }

  // Fall back to meal category
  if (recipe.mealCategory.length > 0) {
    const mealLower = recipe.mealCategory[0].toLowerCase()
    if (mealColors[mealLower]) {
      return mealColors[mealLower]
    }
  }

  // Default gradient
  return 'from-purple-500/80 to-pink-600/80'
}

// Helper function to get emoji based on recipe name/type
const getRecipeEmoji = (recipe: DiscoverRecipe): string => {
  const nameLower = recipe.name.toLowerCase()

  // Check for specific ingredients in name
  const ingredientEmojis: Record<string, string> = {
    chicken: '🍗',
    beef: '🥩',
    steak: '🥩',
    pork: '🥓',
    bacon: '🥓',
    fish: '🐟',
    salmon: '🐟',
    tuna: '🐟',
    cod: '🐟',
    shrimp: '🦐',
    prawn: '🦐',
    seafood: '🦐',
    pasta: '🍝',
    spaghetti: '🍝',
    noodle: '🍜',
    rice: '🍚',
    curry: '🍛',
    pizza: '🍕',
    burger: '🍔',
    sandwich: '🥪',
    salad: '🥗',
    soup: '🍲',
    stew: '🍲',
    egg: '🍳',
    breakfast: '🍳',
    pancake: '🥞',
    waffle: '🧇',
    bread: '🍞',
    toast: '🍞',
    taco: '🌮',
    burrito: '🌯',
    sushi: '🍣',
    cake: '🍰',
    cookie: '🍪',
    pie: '🥧',
    vegetable: '🥗',
    veggie: '🥗',
    vegan: '🥬',
    smoothie: '🥤',
    drink: '🥤',
  }

  for (const [keyword, emoji] of Object.entries(ingredientEmojis)) {
    if (nameLower.includes(keyword)) {
      return emoji
    }
  }

  // Fall back to cuisine-based emoji
  const cuisineEmojis: Record<string, string> = {
    italian: '🍝',
    mexican: '🌮',
    asian: '🍜',
    chinese: '🥡',
    japanese: '🍣',
    indian: '🍛',
    thai: '🍜',
    mediterranean: '🥙',
    greek: '🥙',
    american: '🍔',
    french: '🥐',
    british: '🍽️',
  }

  if (recipe.cuisineType) {
    const cuisineLower = recipe.cuisineType.toLowerCase()
    if (cuisineEmojis[cuisineLower]) {
      return cuisineEmojis[cuisineLower]
    }
  }

  // Fall back to meal category emoji
  const mealEmojis: Record<string, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍿',
    dessert: '🍰',
  }

  if (recipe.mealCategory.length > 0) {
    const mealLower = recipe.mealCategory[0].toLowerCase()
    if (mealEmojis[mealLower]) {
      return mealEmojis[mealLower]
    }
  }

  // Default emoji
  return '🍽️'
}

interface DiscoverRecipeCardProps {
  recipe: DiscoverRecipe
  isSelected: boolean
  onSelect: (id: string) => void
  onPreview: () => void
  onAdd: () => void
  isAdding?: boolean
}

export function DiscoverRecipeCard({
  recipe,
  isSelected,
  onSelect,
  onPreview,
  onAdd,
  isAdding = false
}: DiscoverRecipeCardProps) {
  return (
    <div
      className={`
        border rounded-lg overflow-hidden bg-white shadow-sm transition-all
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}
        ${recipe.alreadyInLibrary ? 'opacity-60' : 'hover:shadow-md'}
      `}
    >
      {/* Image */}
      <div className="relative h-40 bg-gray-100">
        {recipe.imageUrl ? (
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={(e) => {
              // Fallback to placeholder on error
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        ) : (
          /* Emoji/gradient placeholder */
          <div className={`w-full h-full bg-gradient-to-br ${getPlaceholderStyle(recipe)} relative`}>
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '16px 16px'
                }}
              />
            </div>
            {/* Main emoji */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-90 hover:scale-110 transition-transform duration-200">
                {getRecipeEmoji(recipe)}
              </span>
            </div>
          </div>
        )}

        {/* Selection checkbox */}
        {!recipe.alreadyInLibrary && (
          <label className="absolute top-2 left-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(recipe.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        )}

        {/* Already in library badge */}
        {recipe.alreadyInLibrary && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
            In Library
          </span>
        )}

        {/* Source badge */}
        <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
          {recipe.sourceSite.displayName}
        </span>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-gray-900">
          {recipe.name}
        </h3>

        {/* Source link */}
        <a
          href={recipe.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          View original
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>

        {/* Stats */}
        <div className="flex flex-wrap gap-2 mt-2 text-xs text-gray-600">
          {recipe.totalTimeMinutes && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {recipe.totalTimeMinutes} min
            </span>
          )}
          {recipe.caloriesPerServing && (
            <span className="flex items-center gap-1">
              🔥 {recipe.caloriesPerServing} kcal
            </span>
          )}
          {recipe.proteinPerServing && (
            <span className="flex items-center gap-1">
              💪 {Math.round(recipe.proteinPerServing)}g
            </span>
          )}
        </div>

        {/* Dietary tags */}
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.dietaryTags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="success" size="sm">
                {tag}
              </Badge>
            ))}
            {recipe.dietaryTags.length > 3 && (
              <span className="text-xs text-gray-500">+{recipe.dietaryTags.length - 3}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={onPreview}
            className="flex-1"
          >
            Preview
          </Button>
          {!recipe.alreadyInLibrary && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAdd}
              disabled={isAdding}
              isLoading={isAdding}
              className="flex-1"
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Skeleton loader for cards
export function DiscoverRecipeCardSkeleton() {
  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm animate-pulse">
      <div className="h-40 bg-gradient-to-br from-gray-200 to-gray-300" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="flex gap-2 mt-3">
          <div className="h-8 bg-gray-200 rounded flex-1" />
          <div className="h-8 bg-gray-200 rounded flex-1" />
        </div>
      </div>
    </div>
  )
}
