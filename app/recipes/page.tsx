'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'

interface Recipe {
  id: string
  recipeName: string
  description?: string
  imageUrl?: string
  servings: number
  totalTimeMinutes?: number
  familyRating?: number
  mealCategory: string[]
  cuisineType?: string
  timesUsed: number
  ingredients: any[]
}

export default function RecipesPage() {
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recipe?')) return

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRecipes(recipes.filter(r => r.id !== id))
      }
    } catch (error) {
      console.error('Error deleting recipe:', error)
    }
  }

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !filterCategory || recipe.mealCategory.includes(filterCategory)
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(recipes.flatMap(r => r.mealCategory)))

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading recipes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Recipes</h1>
            <p className="text-gray-600 mt-1">Manage your family recipes</p>
          </div>
          <Link
            href="/recipes/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Recipe
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search recipes..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              {searchTerm || filterCategory ? 'No recipes found' : 'No recipes yet'}
            </h3>
            <p className="mt-1 text-gray-500">
              {searchTerm || filterCategory
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first recipe'}
            </p>
            {!searchTerm && !filterCategory && (
              <Link
                href="/recipes/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Add Recipe
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => {
              // Generate SVG if no image provided
              const imageUrl = recipe.imageUrl || generateRecipeSVG(recipe.recipeName, recipe.mealCategory)

              return (
                <div key={recipe.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                  {/* Recipe Image */}
                  <div className="relative h-48 w-full bg-gray-100">
                    <Image
                      src={imageUrl}
                      alt={recipe.recipeName}
                      fill
                      className="object-cover"
                      unoptimized={imageUrl.startsWith('data:')}
                    />
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 flex-1">{recipe.recipeName}</h3>
                    {recipe.familyRating && (
                      <div className="flex items-center ml-2">
                        <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="ml-1 text-sm text-gray-600">{recipe.familyRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {recipe.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    {recipe.mealCategory.map(cat => (
                      <span key={cat} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {cat}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center text-sm text-gray-500 space-x-4 mb-4">
                    <span>🍽️ {recipe.servings} servings</span>
                    {recipe.totalTimeMinutes && (
                      <span>⏱️ {recipe.totalTimeMinutes} min</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 mb-4">
                    Used {recipe.timesUsed} times • {recipe.ingredients.length} ingredients
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/recipes/${recipe.id}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 text-center"
                    >
                      View/Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="px-3 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
