'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'

interface Recipe {
  id: string
  recipeName: string
  description?: string
  imageUrl?: string
  servings: number
  totalTimeMinutes?: number
  prepTimeMinutes?: number
  familyRating?: number
  mealType: string[]
  cuisineType?: string
  difficultyLevel?: string
  timesUsed: number
  ingredients: any[]
  caloriesPerServing?: number
  proteinPerServing?: number
  isVegetarian: boolean
  isVegan: boolean
  containsMeat: boolean
  containsSeafood: boolean
  isDairyFree: boolean
  isGlutenFree: boolean
  containsNuts: boolean
  isQuickMeal: boolean
}

export default function RecipesPage() {
  const { data: session } = useSession()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMealType, setFilterMealType] = useState('')
  const [filterCuisineType, setFilterCuisineType] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Advanced filter states
  const [filterCalories, setFilterCalories] = useState('')
  const [filterProtein, setFilterProtein] = useState('')
  const [filterDietary, setFilterDietary] = useState<string[]>([])
  const [filterPrepTime, setFilterPrepTime] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterIngredient, setFilterIngredient] = useState('')

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      console.log('📊 Total recipes loaded:', data.recipes?.length)
      console.log('📊 Sample recipe macro data:', {
        name: data.recipes?.[0]?.recipeName,
        calories: data.recipes?.[0]?.caloriesPerServing,
        protein: data.recipes?.[0]?.proteinPerServing,
        hasCalories: data.recipes?.filter((r: Recipe) => r.caloriesPerServing).length,
        hasProtein: data.recipes?.filter((r: Recipe) => r.proteinPerServing).length,
      })
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

  // Helper function for dietary filter matching
  const matchesDietaryFilter = (recipe: Recipe): boolean => {
    if (filterDietary.length === 0) return true

    return filterDietary.every(dietTag => {
      switch (dietTag) {
        case 'vegetarian': return recipe.isVegetarian
        case 'vegan': return recipe.isVegan
        case 'dairy-free': return recipe.isDairyFree
        case 'gluten-free': return recipe.isGlutenFree
        case 'contains-meat': return recipe.containsMeat
        case 'contains-seafood': return recipe.containsSeafood
        case 'contains-nuts': return recipe.containsNuts
        default: return true
      }
    })
  }

  const filteredRecipes = recipes.filter(recipe => {
    // Search filter
    const matchesSearch = !searchTerm ||
      recipe.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())

    // Meal type filter
    const matchesMealType = !filterMealType || recipe.mealType.includes(filterMealType)

    // Cuisine type filter
    const matchesCuisineType = !filterCuisineType || recipe.cuisineType === filterCuisineType

    // Calorie filter
    let matchesCalories = true
    if (filterCalories && recipe.caloriesPerServing) {
      const calories = recipe.caloriesPerServing
      switch (filterCalories) {
        case '<300': matchesCalories = calories < 300; break
        case '300-500': matchesCalories = calories >= 300 && calories <= 500; break
        case '500-700': matchesCalories = calories > 500 && calories <= 700; break
        case '>700': matchesCalories = calories > 700; break
      }
    }

    // Protein filter
    let matchesProtein = true
    if (filterProtein && recipe.proteinPerServing) {
      const protein = recipe.proteinPerServing
      switch (filterProtein) {
        case '<10': matchesProtein = protein < 10; break
        case '10-20': matchesProtein = protein >= 10 && protein <= 20; break
        case '>20': matchesProtein = protein > 20; break
      }
    }

    // Dietary filter
    const matchesDietary = matchesDietaryFilter(recipe)

    // Prep time filter
    let matchesPrepTime = true
    if (filterPrepTime) {
      const time = recipe.totalTimeMinutes || 0
      switch (filterPrepTime) {
        case '<30': matchesPrepTime = time < 30; break
        case '30-60': matchesPrepTime = time >= 30 && time <= 60; break
        case '>60': matchesPrepTime = time > 60; break
      }
    }

    // Difficulty filter
    const matchesDifficulty = !filterDifficulty || recipe.difficultyLevel === filterDifficulty

    // Ingredient search filter
    const matchesIngredient = !filterIngredient ||
      recipe.ingredients.some((ing: any) =>
        ing.ingredientName.toLowerCase().includes(filterIngredient.toLowerCase())
      )

    return matchesSearch && matchesMealType && matchesCuisineType &&
           matchesCalories && matchesProtein && matchesDietary &&
           matchesPrepTime && matchesDifficulty && matchesIngredient
  })

  const mealTypes = Array.from(new Set(recipes.flatMap(r => r.mealType)))
  const cuisineTypes = Array.from(new Set(recipes.map(r => r.cuisineType).filter(Boolean))) as string[]

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterMealType('')
    setFilterCuisineType('')
    setFilterCalories('')
    setFilterProtein('')
    setFilterDietary([])
    setFilterPrepTime('')
    setFilterDifficulty('')
    setFilterIngredient('')
  }

  const activeFilterCount = [
    searchTerm, filterMealType, filterCuisineType, filterCalories,
    filterProtein, filterPrepTime, filterDifficulty, filterIngredient
  ].filter(f => f).length + filterDietary.length

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading recipes...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Recipes"
        description="Manage your family recipes"
        action={
          <Link href="/recipes/new">
            <Button variant="primary">Add Recipe</Button>
          </Link>
        }
      >
        {/* Basic Filters */}
        <div className="card p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={filterMealType}
              onChange={(e) => setFilterMealType(e.target.value)}
            >
              <option value="">All Meal Types</option>
              {mealTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
            <Select
              value={filterCuisineType}
              onChange={(e) => setFilterCuisineType(e.target.value)}
            >
              <option value="">All Cuisines</option>
              {cuisineTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </Select>
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-md border border-gray-300"
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Calorie Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Calories (per serving)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filterCalories}
                    onChange={(e) => setFilterCalories(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="<300">Under 300</option>
                    <option value="300-500">300-500</option>
                    <option value="500-700">500-700</option>
                    <option value=">700">Over 700</option>
                  </select>
                </div>

                {/* Protein Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Protein (grams)</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filterProtein}
                    onChange={(e) => setFilterProtein(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="<10">Low (&lt;10g)</option>
                    <option value="10-20">Medium (10-20g)</option>
                    <option value=">20">High (&gt;20g)</option>
                  </select>
                </div>

                {/* Prep Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prep Time</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filterPrepTime}
                    onChange={(e) => setFilterPrepTime(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="<30">Quick (&lt;30 min)</option>
                    <option value="30-60">Medium (30-60 min)</option>
                    <option value=">60">Long (&gt;60 min)</option>
                  </select>
                </div>

                {/* Difficulty Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filterDifficulty}
                    onChange={(e) => setFilterDifficulty(e.target.value)}
                  >
                    <option value="">Any</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {/* Ingredient Search */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contains Ingredient</label>
                  <input
                    type="text"
                    placeholder="e.g., chicken, tomatoes..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    value={filterIngredient}
                    onChange={(e) => setFilterIngredient(e.target.value)}
                  />
                </div>
              </div>

              {/* Dietary Tags */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Dietary Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'vegetarian', label: 'Vegetarian' },
                    { value: 'vegan', label: 'Vegan' },
                    { value: 'dairy-free', label: 'Dairy-Free' },
                    { value: 'gluten-free', label: 'Gluten-Free' },
                    { value: 'contains-meat', label: 'Contains Meat' },
                    { value: 'contains-seafood', label: 'Contains Seafood' },
                    { value: 'contains-nuts', label: 'Contains Nuts' }
                  ].map(diet => (
                    <label key={diet.value} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 text-sm">
                      <input
                        type="checkbox"
                        checked={filterDietary.includes(diet.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFilterDietary([...filterDietary, diet.value])
                          } else {
                            setFilterDietary(filterDietary.filter(d => d !== diet.value))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      {diet.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">
              {activeFilterCount > 0 ? 'No recipes found' : 'No recipes yet'}
            </h3>
            <p className="mt-1 text-gray-500">
              {activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first recipe'}
            </p>
            {activeFilterCount === 0 && (
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
              const imageUrl = recipe.imageUrl || generateRecipeSVG(recipe.recipeName, recipe.mealType)

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
                    {recipe.mealType.map(cat => (
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
      </PageContainer>
    </AppLayout>
  )
}
