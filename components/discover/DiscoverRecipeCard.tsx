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
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg
              className="w-12 h-12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
              />
            </svg>
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
      <div className="h-40 bg-gray-200" />
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
