'use client'

import Link from 'next/link'
import { Clock, Users, ChefHat } from 'lucide-react'
import { RecipePlaceholder } from './RecipePlaceholder'
import { RecipeMacroBar } from './RecipeMacroBar'
import { Button } from '@/components/ui'

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  category?: string | null
  notes?: string | null
}

interface RecipeCardProps {
  id: string
  name: string
  description?: string | null
  mealType: string[]
  cuisineType?: string | null
  servings: number
  totalTimeMinutes?: number | null
  ingredientCount: number
  ingredients: Ingredient[]
  timesUsed: number
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
  isProductRecipe?: boolean
  sourceProductId?: string | null
  onDelete: (id: string) => void
}

export function RecipeCard({
  id,
  name,
  description,
  mealType,
  cuisineType,
  servings,
  totalTimeMinutes,
  ingredientCount,
  ingredients,
  timesUsed,
  caloriesPerServing,
  proteinPerServing,
  carbsPerServing,
  fatPerServing,
  isProductRecipe,
  sourceProductId,
  onDelete,
}: RecipeCardProps) {
  const isFavourite = timesUsed >= 3

  return (
    <div className="group bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden hover:border-zinc-700 hover:shadow-xl hover:shadow-black/20 transition-all duration-200">
      <div className="flex flex-col sm:flex-row">
        {/* Visual Placeholder */}
        <RecipePlaceholder
          ingredients={ingredients}
          cuisine={cuisineType}
          isFavourite={isFavourite}
          className="h-48 sm:h-auto sm:w-44"
        />

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col min-w-0">
          {/* Title and meal type */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold line-clamp-2 group-hover:text-purple-300 transition-colors leading-snug text-white">
              {name}
            </h3>
            <div className="flex gap-1 flex-shrink-0">
              {isProductRecipe && (
                <span className="px-2 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded text-xs text-purple-300">
                  Product
                </span>
              )}
              {mealType.length > 0 && (
                <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs text-zinc-300">
                  {mealType[0]}
                </span>
              )}
            </div>
          </div>

          {/* Description */}
          {description && (
            <p className="text-sm text-zinc-400 line-clamp-2 mb-3">
              {description}
            </p>
          )}

          {/* Quick stats */}
          <div className="flex items-center gap-3 text-xs text-zinc-500 mb-3">
            {totalTimeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {totalTimeMinutes} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {servings} servings
            </span>
            <span className="flex items-center gap-1">
              <ChefHat className="w-3.5 h-3.5" />
              {ingredientCount} ing
            </span>
          </div>

          {/* Macro bar and labels */}
          <RecipeMacroBar
            calories={caloriesPerServing}
            protein={proteinPerServing}
            carbs={carbsPerServing}
            fat={fatPerServing}
            className="mb-2"
          />

          {/* Used count */}
          <div className="flex items-center justify-end text-xs mb-4">
            <span className="text-zinc-500">
              {timesUsed > 0 ? `Used ${timesUsed} times` : 'Not used yet'}
            </span>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-auto">
            <Link href={`/recipes/${id}`} className="flex-1">
              <button className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors text-white">
                View / Edit
              </button>
            </Link>
            <button
              onClick={() => onDelete(id)}
              className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
