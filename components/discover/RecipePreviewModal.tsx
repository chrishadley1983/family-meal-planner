'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Modal, Button, Badge } from '@/components/ui'

interface ParsedIngredient {
  name: string
  quantity: number
  unit: string
  category?: string
  original?: string
}

interface ParsedInstruction {
  stepNumber: number
  instruction: string
}

interface RecipeDetail {
  id: string
  name: string
  description?: string | null
  imageUrl?: string | null
  sourceUrl: string
  sourceSite: {
    displayName: string
    name: string
    baseUrl: string
  }
  servings?: number | null
  prepTimeMinutes?: number | null
  cookTimeMinutes?: number | null
  totalTimeMinutes?: number | null
  cuisineType?: string | null
  mealCategory: string[]
  dietaryTags: string[]
  allergens: string[]
  ingredients: ParsedIngredient[]
  instructions: ParsedInstruction[]
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
  fiberPerServing?: number | null
  sugarPerServing?: number | null
  sodiumPerServing?: number | null
  nutritionSource?: string | null
  dataQualityScore: number
}

interface RecipePreviewModalProps {
  recipeId: string | null
  onClose: () => void
  onAdd: (recipeId: string) => void
  isAdding?: boolean
}

export function RecipePreviewModal({
  recipeId,
  onClose,
  onAdd,
  isAdding = false
}: RecipePreviewModalProps) {
  const [recipe, setRecipe] = useState<RecipeDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [alreadyInLibrary, setAlreadyInLibrary] = useState(false)
  const [existingRecipeId, setExistingRecipeId] = useState<string | null>(null)

  useEffect(() => {
    if (recipeId) {
      fetchRecipe(recipeId)
    } else {
      setRecipe(null)
    }
  }, [recipeId])

  const fetchRecipe = async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/discover/recipes/${id}`)
      const data = await response.json()
      setRecipe(data.recipe)
      setAlreadyInLibrary(data.alreadyInLibrary)
      setExistingRecipeId(data.existingRecipeId)
    } catch (error) {
      console.error('❌ Failed to fetch recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!recipeId) return null

  return (
    <Modal isOpen={!!recipeId} onClose={onClose} maxWidth="2xl">
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recipe...</p>
        </div>
      ) : recipe ? (
        <div className="max-h-[80vh] overflow-y-auto">
          {/* Header with image */}
          <div className="relative h-48 sm:h-64 bg-gray-100">
            {recipe.imageUrl ? (
              <Image
                src={recipe.imageUrl}
                alt={recipe.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <svg className="w-20 h-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
            )}

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Source badge */}
            <span className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-3 py-1 rounded">
              {recipe.sourceSite.displayName}
            </span>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Title and tags */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{recipe.name}</h2>

              {recipe.description && (
                <p className="text-gray-600 mb-3">{recipe.description}</p>
              )}

              <div className="flex flex-wrap gap-2">
                {recipe.cuisineType && (
                  <Badge variant="purple">{recipe.cuisineType}</Badge>
                )}
                {recipe.mealCategory.map(cat => (
                  <Badge key={cat} variant="orange">{cat}</Badge>
                ))}
                {recipe.dietaryTags.map(tag => (
                  <Badge key={tag} variant="success">{tag}</Badge>
                ))}
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-y border-gray-200 mb-4">
              {recipe.servings && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{recipe.servings}</div>
                  <div className="text-sm text-gray-500">Servings</div>
                </div>
              )}
              {recipe.prepTimeMinutes && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{recipe.prepTimeMinutes}</div>
                  <div className="text-sm text-gray-500">Prep (min)</div>
                </div>
              )}
              {recipe.cookTimeMinutes && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{recipe.cookTimeMinutes}</div>
                  <div className="text-sm text-gray-500">Cook (min)</div>
                </div>
              )}
              {recipe.totalTimeMinutes && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{recipe.totalTimeMinutes}</div>
                  <div className="text-sm text-gray-500">Total (min)</div>
                </div>
              )}
            </div>

            {/* Nutrition */}
            {(recipe.caloriesPerServing || recipe.proteinPerServing) && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">Nutrition (per serving)</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {recipe.caloriesPerServing && (
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-orange-700">{recipe.caloriesPerServing}</div>
                      <div className="text-xs text-orange-600">Calories</div>
                    </div>
                  )}
                  {recipe.proteinPerServing && (
                    <div className="bg-blue-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-blue-700">{Math.round(recipe.proteinPerServing)}g</div>
                      <div className="text-xs text-blue-600">Protein</div>
                    </div>
                  )}
                  {recipe.carbsPerServing && (
                    <div className="bg-yellow-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-yellow-700">{Math.round(recipe.carbsPerServing)}g</div>
                      <div className="text-xs text-yellow-600">Carbs</div>
                    </div>
                  )}
                  {recipe.fatPerServing && (
                    <div className="bg-purple-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-purple-700">{Math.round(recipe.fatPerServing)}g</div>
                      <div className="text-xs text-purple-600">Fat</div>
                    </div>
                  )}
                  {recipe.fiberPerServing && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-green-700">{Math.round(recipe.fiberPerServing)}g</div>
                      <div className="text-xs text-green-600">Fiber</div>
                    </div>
                  )}
                  {recipe.sodiumPerServing && (
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                      <div className="text-lg font-bold text-gray-700">{recipe.sodiumPerServing}mg</div>
                      <div className="text-xs text-gray-600">Sodium</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allergens warning */}
            {recipe.allergens.length > 0 && (
              <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <h3 className="font-semibold text-amber-800 mb-1">⚠️ Contains Allergens</h3>
                <div className="flex flex-wrap gap-1">
                  {recipe.allergens.map(allergen => (
                    <Badge key={allergen} variant="warning">{allergen}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Ingredients */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Ingredients ({recipe.ingredients?.length || 0})
              </h3>
              <ul className="space-y-2">
                {recipe.ingredients?.map((ing, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>
                      <span className="font-medium">{ing.quantity} {ing.unit}</span>{' '}
                      {ing.name}
                      {ing.category && (
                        <span className="text-gray-500 text-sm ml-1">({ing.category})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-3">
                Instructions ({recipe.instructions?.length || 0} steps)
              </h3>
              <ol className="space-y-4">
                {recipe.instructions?.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                      {step.stepNumber || idx + 1}
                    </span>
                    <p className="text-gray-700">{step.instruction}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Source link */}
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                View original recipe on {recipe.sourceSite.displayName}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={onClose} className="flex-1">
                Close
              </Button>
              {alreadyInLibrary ? (
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (existingRecipeId) {
                      window.location.href = `/recipes/${existingRecipeId}`
                    }
                  }}
                  className="flex-1"
                >
                  View in Library
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => onAdd(recipe.id)}
                  disabled={isAdding}
                  isLoading={isAdding}
                  className="flex-1"
                >
                  {isAdding ? 'Adding...' : 'Add to My Recipes'}
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-red-600">Failed to load recipe</p>
          <Button variant="secondary" onClick={onClose} className="mt-4">
            Close
          </Button>
        </div>
      )}
    </Modal>
  )
}
