'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { AppLayout } from '@/components/layout'
import { Button, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/components/providers/NotificationProvider'
import {
  RecipeCard,
  RecipeSearchBar,
  RecipeQuickFilters,
  RecipeDiscoverBanner,
} from '@/components/recipes'
import type { QuickFilterId } from '@/lib/recipe-helpers'

interface Ingredient {
  ingredientName: string
  quantity: number
  unit: string
  category?: string | null
  notes?: string | null
}

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
  ingredients: Ingredient[]
  caloriesPerServing?: number
  proteinPerServing?: number
  carbsPerServing?: number
  fatPerServing?: number
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
  const { confirm } = useNotification()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMealType, setFilterMealType] = useState('')
  const [filterCuisineType, setFilterCuisineType] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Quick filters
  const [activeQuickFilters, setActiveQuickFilters] = useState<QuickFilterId[]>([])

  // Advanced filter states
  const [filterCalories, setFilterCalories] = useState('')
  const [filterProtein, setFilterProtein] = useState('')
  const [filterDietary, setFilterDietary] = useState<string[]>([])
  const [filterPrepTime, setFilterPrepTime] = useState('')
  const [filterDifficulty, setFilterDifficulty] = useState('')
  const [filterIngredient, setFilterIngredient] = useState('')

  // CSV Import states
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes')
      const data = await response.json()
      console.log('📊 Total recipes loaded:', data.recipes?.length)
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: 'Delete Recipe',
      message: 'Are you sure you want to delete this recipe?',
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRecipes(recipes.filter(r => r.id !== id))
      }
    } catch (err) {
      console.error('Error deleting recipe:', err)
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImporting(true)
    setImportResult(null)

    try {
      const text = await file.text()

      const response = await fetch('/api/recipes/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: text })
      })

      const data = await response.json()

      if (response.ok) {
        let message = `Successfully imported ${data.imported} recipe(s).`

        if (data.failed > 0 && data.errors && data.errors.length > 0) {
          message += `\n\nFailed to import ${data.failed} recipe(s):`
          data.errors.forEach((err: { recipeName: string; error: string }) => {
            message += `\n- ${err.recipeName}: ${err.error}`
          })
        }

        setImportResult({
          success: data.failed === 0,
          message
        })

        if (data.imported > 0) {
          fetchRecipes()
        }
      } else {
        setImportResult({
          success: false,
          message: data.error || 'Failed to import recipes'
        })
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      setImportResult({
        success: false,
        message: 'Error importing CSV file'
      })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleQuickFilterToggle = (filterId: QuickFilterId) => {
    setActiveQuickFilters(prev =>
      prev.includes(filterId)
        ? prev.filter(f => f !== filterId)
        : [...prev, filterId]
    )
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

  // Quick filter logic
  const matchesQuickFilters = (recipe: Recipe): boolean => {
    if (activeQuickFilters.length === 0) return true

    return activeQuickFilters.every(filterId => {
      switch (filterId) {
        case 'quick':
          // Under 30 minutes
          const totalTime = recipe.totalTimeMinutes || (recipe.prepTimeMinutes || 0)
          return totalTime <= 30
        case 'protein':
          // High protein (30g+)
          return (recipe.proteinPerServing || 0) >= 30
        case 'favourite':
          // Most used (3+ times)
          return recipe.timesUsed >= 3
        case 'veggie':
          // Vegetarian
          return recipe.isVegetarian || (!recipe.containsMeat && !recipe.containsSeafood)
        default:
          return true
      }
    })
  }

  const filteredRecipes = recipes.filter(recipe => {
    // Search filter - also search ingredients and cuisine
    const matchesSearch = !searchTerm ||
      recipe.recipeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.cuisineType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      recipe.ingredients.some(ing =>
        ing.ingredientName.toLowerCase().includes(searchTerm.toLowerCase())
      )

    // Meal type filter
    const matchesMealType = !filterMealType || recipe.mealType.includes(filterMealType)

    // Cuisine type filter
    const matchesCuisineType = !filterCuisineType || recipe.cuisineType === filterCuisineType

    // Quick filters
    const matchesQuick = matchesQuickFilters(recipe)

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
      recipe.ingredients.some((ing) =>
        ing.ingredientName.toLowerCase().includes(filterIngredient.toLowerCase())
      )

    return matchesSearch && matchesMealType && matchesCuisineType && matchesQuick &&
           matchesCalories && matchesProtein && matchesDietary &&
           matchesPrepTime && matchesDifficulty && matchesIngredient
  })

  const mealTypes = Array.from(new Set(recipes.flatMap(r => r.mealType)))
  const cuisineTypes = Array.from(new Set(recipes.map(r => r.cuisineType).filter(Boolean))) as string[]

  const clearAllFilters = () => {
    setSearchTerm('')
    setFilterMealType('')
    setFilterCuisineType('')
    setActiveQuickFilters([])
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
  ].filter(f => f).length + filterDietary.length + activeQuickFilters.length

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading recipes...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">My Recipes</h1>
            <p className="text-zinc-400 mt-1">
              {recipes.length} delicious meal{recipes.length !== 1 ? 's' : ''} to choose from
            </p>
          </div>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
              disabled={importing}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={importing}
              onClick={() => fileInputRef.current?.click()}
            >
              {importing ? 'Importing...' : 'Import'}
            </Button>
            <Link href="/recipes/new">
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium text-white">
                <Sparkles className="w-4 h-4" />
                Add Recipe
              </button>
            </Link>
          </div>
        </div>

        {/* Import Result Notification */}
        {importResult && (
          <div className={`mb-4 p-4 rounded-lg ${importResult.success ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'}`}>
            <p className={`whitespace-pre-line ${importResult.success ? 'text-green-400' : 'text-red-400'}`}>
              {importResult.message}
            </p>
            <button
              onClick={() => setImportResult(null)}
              className="mt-2 text-sm text-zinc-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search Bar */}
        <RecipeSearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          mealType={filterMealType}
          onMealTypeChange={setFilterMealType}
          cuisineType={filterCuisineType}
          onCuisineTypeChange={setFilterCuisineType}
          mealTypes={mealTypes}
          cuisineTypes={cuisineTypes}
          onFilterClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className="mb-4"
        />

        {/* Quick Filters */}
        <RecipeQuickFilters
          activeFilters={activeQuickFilters}
          onFilterToggle={handleQuickFilterToggle}
          className="mb-6"
        />

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-zinc-900 rounded-xl p-4 mb-6 border border-zinc-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white">Advanced Filters</h3>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Calorie Filter */}
              <div>
                <label className="label">Calories (per serving)</label>
                <Select
                  value={filterCalories}
                  onChange={(e) => setFilterCalories(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="<300">Under 300</option>
                  <option value="300-500">300-500</option>
                  <option value="500-700">500-700</option>
                  <option value=">700">Over 700</option>
                </Select>
              </div>

              {/* Protein Filter */}
              <div>
                <label className="label">Protein (grams)</label>
                <Select
                  value={filterProtein}
                  onChange={(e) => setFilterProtein(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="<10">Low (&lt;10g)</option>
                  <option value="10-20">Medium (10-20g)</option>
                  <option value=">20">High (&gt;20g)</option>
                </Select>
              </div>

              {/* Prep Time Filter */}
              <div>
                <label className="label">Prep Time</label>
                <Select
                  value={filterPrepTime}
                  onChange={(e) => setFilterPrepTime(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="<30">Quick (&lt;30 min)</option>
                  <option value="30-60">Medium (30-60 min)</option>
                  <option value=">60">Long (&gt;60 min)</option>
                </Select>
              </div>

              {/* Difficulty Filter */}
              <div>
                <label className="label">Difficulty</label>
                <Select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </Select>
              </div>

              {/* Ingredient Search */}
              <div className="md:col-span-2">
                <label className="label">Contains Ingredient</label>
                <Input
                  type="text"
                  placeholder="e.g., chicken, tomatoes..."
                  value={filterIngredient}
                  onChange={(e) => setFilterIngredient(e.target.value)}
                />
              </div>
            </div>

            {/* Dietary Tags */}
            <div className="mt-4">
              <label className="label">Dietary Preferences</label>
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
                  <label
                    key={diet.value}
                    className="flex items-center gap-2 px-3 py-2 border border-zinc-700 rounded-md cursor-pointer hover:bg-zinc-800 text-sm text-zinc-300 transition-colors"
                  >
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
                      className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-zinc-900"
                    />
                    {diet.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Discover Banner */}
        <RecipeDiscoverBanner className="mb-8" />

        {/* Recipe Grid */}
        {filteredRecipes.length === 0 ? (
          <div className="bg-zinc-900 rounded-xl p-12 text-center border border-zinc-800">
            <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-white">
              {activeFilterCount > 0 ? 'No recipes found' : 'No recipes yet'}
            </h3>
            <p className="mt-1 text-zinc-400">
              {activeFilterCount > 0
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first recipe'}
            </p>
            {activeFilterCount === 0 && (
              <Link href="/recipes/new" className="mt-4 inline-block">
                <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium text-white mx-auto">
                  <Sparkles className="w-4 h-4" />
                  Add Recipe
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                name={recipe.recipeName}
                description={recipe.description}
                mealType={recipe.mealType}
                cuisineType={recipe.cuisineType}
                servings={recipe.servings}
                totalTimeMinutes={recipe.totalTimeMinutes}
                ingredientCount={recipe.ingredients.length}
                ingredients={recipe.ingredients}
                timesUsed={recipe.timesUsed}
                caloriesPerServing={recipe.caloriesPerServing}
                proteinPerServing={recipe.proteinPerServing}
                carbsPerServing={recipe.carbsPerServing}
                fatPerServing={recipe.fatPerServing}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
