'use client'

import { Star } from 'lucide-react'
import { getRecipeGradient, getRecipeEmoji } from '@/lib/recipe-helpers'

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  category?: string | null
  notes?: string | null
}

interface RecipePlaceholderProps {
  ingredients: Ingredient[]
  cuisine?: string | null
  isFavourite?: boolean
  className?: string
}

export function RecipePlaceholder({
  ingredients,
  cuisine,
  isFavourite = false,
  className = '',
}: RecipePlaceholderProps) {
  const gradient = getRecipeGradient(ingredients)
  const emoji = getRecipeEmoji(ingredients)

  return (
    <div
      className={`relative flex-shrink-0 bg-gradient-to-br ${gradient} ${className}`}
      style={{ minWidth: '176px', minHeight: '176px' }}
    >
      {/* Pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      {/* Main ingredient emoji */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-6xl opacity-90 group-hover:scale-110 transition-transform duration-200">
          {emoji}
        </span>
      </div>

      {/* Cuisine tag */}
      {cuisine && (
        <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/40 backdrop-blur-sm rounded-lg text-xs font-medium text-white">
          {cuisine}
        </span>
      )}

      {/* Favourite indicator */}
      {isFavourite && (
        <span className="absolute top-3 right-3 p-1.5 bg-amber-500/90 rounded-lg">
          <Star className="w-3.5 h-3.5 text-white fill-white" />
        </span>
      )}
    </div>
  )
}
