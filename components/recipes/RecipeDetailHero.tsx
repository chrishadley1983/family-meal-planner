'use client'

import { Star, Clock, Users, Flame, Timer } from 'lucide-react'
import { getRecipeGradient, getRecipeEmoji } from '@/lib/recipe-helpers'

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  category?: string | null
  notes?: string | null
}

interface RecipeDetailHeroProps {
  name: string
  description?: string | null
  cuisine?: string | null
  difficulty?: string | null
  servings: number
  prepTimeMinutes?: number | null
  cookTimeMinutes?: number | null
  totalTimeMinutes?: number | null
  ingredients: Ingredient[]
  rating: number | null
  onRatingChange: (rating: number) => void
  className?: string
}

export function RecipeDetailHero({
  name,
  description,
  cuisine,
  difficulty,
  servings,
  prepTimeMinutes,
  cookTimeMinutes,
  totalTimeMinutes,
  ingredients,
  rating,
  onRatingChange,
  className = '',
}: RecipeDetailHeroProps) {
  const gradient = getRecipeGradient(ingredients)
  const emoji = getRecipeEmoji(ingredients)

  return (
    <div className={`bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden ${className}`}>
      <div className="flex flex-col sm:flex-row">
        {/* Image placeholder */}
        <div
          className={`h-48 sm:h-auto sm:w-64 bg-gradient-to-br ${gradient} relative flex-shrink-0`}
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

          {/* Emoji */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-8xl opacity-90">
              {emoji}
            </span>
          </div>

          {/* Cuisine tag */}
          {cuisine && (
            <span className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-sm font-medium text-white">
              {cuisine}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          <h1 className="text-2xl font-bold text-white mb-2">{name}</h1>
          {description && (
            <p className="text-zinc-400 mb-6">{description}</p>
          )}

          {/* Stats Cards - Grid Layout */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
              <div className="font-bold text-white">{servings}</div>
              <div className="text-xs text-zinc-500">Servings</div>
            </div>
            {prepTimeMinutes && (
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <Clock className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
                <div className="font-bold text-white">{prepTimeMinutes} min</div>
                <div className="text-xs text-zinc-500">Prep</div>
              </div>
            )}
            {cookTimeMinutes && (
              <div className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <Flame className="w-5 h-5 text-zinc-400 mx-auto mb-1" />
                <div className="font-bold text-white">{cookTimeMinutes} min</div>
                <div className="text-xs text-zinc-500">Cook</div>
              </div>
            )}
            {totalTimeMinutes && (
              <div className="bg-purple-500/20 rounded-xl p-3 text-center border border-purple-500/30">
                <Timer className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <div className="font-bold text-purple-300">{totalTimeMinutes} min</div>
                <div className="text-xs text-purple-400">Total</div>
              </div>
            )}
          </div>

          {/* Rating & Difficulty */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => onRatingChange(star)}
                  className="p-0.5 focus:outline-none"
                >
                  <Star
                    className={`w-5 h-5 ${
                      rating && star <= rating
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
              <span className="text-sm text-zinc-500 ml-2">Your rating</span>
            </div>
            {difficulty && (
              <span className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-full text-sm">
                {difficulty}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
