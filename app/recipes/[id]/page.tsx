'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'

interface RecipePageProps {
  params: Promise<{ id: string }>
}

export default function ViewRecipePage({ params }: RecipePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [rating, setRating] = useState<number | null>(null)

  useEffect(() => {
    fetchRecipe()
  }, [id])

  const fetchRecipe = async () => {
    try {
      const response = await fetch(`/api/recipes/${id}`)
      if (!response.ok) {
        router.push('/recipes')
        return
      }
      const data = await response.json()
      setRecipe(data.recipe)
      setRating(data.recipe.familyRating)
    } catch (err) {
      router.push('/recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async (newRating: number) => {
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyRating: newRating })
      })

      if (response.ok) {
        setRating(newRating)
        const data = await response.json()
        setRecipe(data.recipe)
      }
    } catch (err) {
      console.error('Failed to update rating')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading recipe...</p>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  // Generate SVG if no image provided
  const imageUrl = recipe.imageUrl || generateRecipeSVG(recipe.recipeName, recipe.mealCategory)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/recipes" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Recipes
        </Link>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {/* Recipe Image */}
          <div className="relative h-64 w-full bg-gray-100">
            <Image
              src={imageUrl}
              alt={recipe.recipeName}
              fill
              className="object-cover"
              unoptimized={imageUrl.startsWith('data:')}
            />
          </div>

          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.recipeName}</h1>
                {recipe.description && (
                  <p className="text-gray-600">{recipe.description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRating(star)}
                    className="focus:outline-none"
                  >
                    <svg
                      className={`h-6 w-6 ${
                        rating && star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Servings</p>
                <p className="text-lg font-semibold">{recipe.servings}</p>
              </div>
              {recipe.prepTimeMinutes && (
                <div>
                  <p className="text-sm text-gray-500">Prep Time</p>
                  <p className="text-lg font-semibold">{recipe.prepTimeMinutes} min</p>
                </div>
              )}
              {recipe.cookTimeMinutes && (
                <div>
                  <p className="text-sm text-gray-500">Cook Time</p>
                  <p className="text-lg font-semibold">{recipe.cookTimeMinutes} min</p>
                </div>
              )}
              {recipe.totalTimeMinutes && (
                <div>
                  <p className="text-sm text-gray-500">Total Time</p>
                  <p className="text-lg font-semibold">{recipe.totalTimeMinutes} min</p>
                </div>
              )}
            </div>

            {(recipe.cuisineType || recipe.difficultyLevel || recipe.mealCategory.length > 0) && (
              <div className="mb-6 pb-6 border-b">
                <div className="flex flex-wrap gap-4">
                  {recipe.cuisineType && (
                    <div>
                      <span className="text-sm text-gray-500">Cuisine: </span>
                      <span className="text-sm font-medium">{recipe.cuisineType}</span>
                    </div>
                  )}
                  {recipe.difficultyLevel && (
                    <div>
                      <span className="text-sm text-gray-500">Difficulty: </span>
                      <span className="text-sm font-medium">{recipe.difficultyLevel}</span>
                    </div>
                  )}
                </div>
                {recipe.mealCategory.length > 0 && (
                  <div className="mt-2">
                    <div className="flex flex-wrap gap-2">
                      {recipe.mealCategory.map((cat: string) => (
                        <span key={cat} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Ingredients</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ing: any, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-gray-400 mr-3">•</span>
                    <span>
                      <strong>{ing.quantity} {ing.unit}</strong> {ing.ingredientName}
                      {ing.notes && <span className="text-gray-500 text-sm"> ({ing.notes})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Instructions</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((inst: any, index: number) => (
                  <li key={index} className="flex">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold mr-4">
                      {inst.stepNumber}
                    </span>
                    <p className="flex-1 pt-1">{inst.instruction}</p>
                  </li>
                ))}
              </ol>
            </div>

            {recipe.notes && (
              <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
                <p className="text-sm text-gray-700">{recipe.notes}</p>
              </div>
            )}

            <div className="text-sm text-gray-500 border-t pt-4">
              Used {recipe.timesUsed} times
              {recipe.lastUsedDate && ` • Last used ${new Date(recipe.lastUsedDate).toLocaleDateString()}`}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-gray-500 text-sm">
          <p>Note: Full recipe editing will be available in a future update</p>
          <p>For now, you can rate recipes and view details</p>
        </div>
      </div>
    </div>
  )
}
