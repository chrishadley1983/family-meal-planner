import React, { useEffect, useState } from 'react'
import { Modal } from './ui/Modal'

interface RecipeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  recipeId: string | null
}

interface Recipe {
  id: string
  recipeName: string
  description?: string
  servings: number
  prepTimeMinutes?: number
  cookTimeMinutes?: number
  totalTimeMinutes?: number
  cuisineType?: string
  difficultyLevel?: string
  mealCategory: string[]
  ingredients: Array<{
    quantity: number
    unit: string
    ingredientName: string
    notes?: string
  }>
  instructions: Array<{
    stepNumber: number
    instruction: string
  }>
  notes?: string
  familyRating?: number
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
}

export function RecipeDetailsModal({ isOpen, onClose, recipeId }: RecipeDetailsModalProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && recipeId) {
      fetchRecipe()
    } else {
      setRecipe(null)
    }
  }, [isOpen, recipeId])

  const fetchRecipe = async () => {
    if (!recipeId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/recipes/${recipeId}`)
      if (response.ok) {
        const data = await response.json()
        setRecipe(data.recipe)
      }
    } catch (error) {
      console.error('Failed to fetch recipe:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="4xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-400">Loading recipe...</p>
        </div>
      ) : recipe ? (
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{recipe.recipeName}</h1>
            {recipe.description && (
              <p className="text-zinc-400">{recipe.description}</p>
            )}
            {recipe.familyRating && (
              <div className="flex items-center mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-5 w-5 ${
                      star <= recipe.familyRating! ? 'text-yellow-400' : 'text-zinc-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            )}
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
            <div>
              <p className="text-sm text-zinc-500">Servings</p>
              <p className="text-lg font-semibold text-white">{recipe.servings}</p>
            </div>
            {recipe.prepTimeMinutes && (
              <div>
                <p className="text-sm text-zinc-500">Prep Time</p>
                <p className="text-lg font-semibold text-white">{recipe.prepTimeMinutes} min</p>
              </div>
            )}
            {recipe.cookTimeMinutes && (
              <div>
                <p className="text-sm text-zinc-500">Cook Time</p>
                <p className="text-lg font-semibold text-white">{recipe.cookTimeMinutes} min</p>
              </div>
            )}
            {recipe.totalTimeMinutes && (
              <div>
                <p className="text-sm text-zinc-500">Total Time</p>
                <p className="text-lg font-semibold text-white">{recipe.totalTimeMinutes} min</p>
              </div>
            )}
          </div>

          {/* Macros (if available) */}
          {(recipe.caloriesPerServing || recipe.proteinPerServing || recipe.carbsPerServing || recipe.fatPerServing) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg">
              {recipe.caloriesPerServing && (
                <div>
                  <p className="text-sm text-zinc-500">Calories</p>
                  <p className="text-lg font-semibold text-white">{recipe.caloriesPerServing}</p>
                </div>
              )}
              {recipe.proteinPerServing && (
                <div>
                  <p className="text-sm text-zinc-500">Protein</p>
                  <p className="text-lg font-semibold text-white">{recipe.proteinPerServing}g</p>
                </div>
              )}
              {recipe.carbsPerServing && (
                <div>
                  <p className="text-sm text-zinc-500">Carbs</p>
                  <p className="text-lg font-semibold text-white">{recipe.carbsPerServing}g</p>
                </div>
              )}
              {recipe.fatPerServing && (
                <div>
                  <p className="text-sm text-zinc-500">Fat</p>
                  <p className="text-lg font-semibold text-white">{recipe.fatPerServing}g</p>
                </div>
              )}
            </div>
          )}

          {/* Cuisine & Category */}
          {(recipe.cuisineType || recipe.difficultyLevel || recipe.mealCategory.length > 0) && (
            <div className="mb-6 pb-6 border-b border-zinc-800">
              <div className="flex flex-wrap gap-4 mb-2">
                {recipe.cuisineType && (
                  <div>
                    <span className="text-sm text-zinc-500">Cuisine: </span>
                    <span className="text-sm font-medium text-white">{recipe.cuisineType}</span>
                  </div>
                )}
                {recipe.difficultyLevel && (
                  <div>
                    <span className="text-sm text-zinc-500">Difficulty: </span>
                    <span className="text-sm font-medium text-white">{recipe.difficultyLevel}</span>
                  </div>
                )}
              </div>
              {recipe.mealCategory.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {recipe.mealCategory.map((cat: string) => (
                    <span key={cat} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-600/20 text-blue-400">
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Ingredients */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients.map((ing, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-zinc-600 mr-3">•</span>
                  <span className="text-zinc-300">
                    <strong className="text-white">{ing.quantity} {ing.unit}</strong> {ing.ingredientName}
                    {ing.notes && <span className="text-zinc-500 text-sm"> ({ing.notes})</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Instructions</h2>
            <ol className="space-y-4">
              {recipe.instructions.map((inst, index) => (
                <li key={index} className="flex">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-semibold mr-4">
                    {inst.stepNumber}
                  </span>
                  <p className="flex-1 pt-1 text-zinc-300">{inst.instruction}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Notes */}
          {recipe.notes && (
            <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
              <h3 className="font-semibold text-yellow-400 mb-2">Notes</h3>
              <p className="text-sm text-yellow-200/80">{recipe.notes}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <p className="text-zinc-400">No recipe selected</p>
        </div>
      )}
    </Modal>
  )
}
