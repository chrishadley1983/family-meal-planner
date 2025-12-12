'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useNotification } from '@/components/providers/NotificationProvider'

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
  const { confirm } = useNotification()
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

  // CSV Import states
  const [showImportModal, setShowImportModal] = useState(false)
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

  const handleDownloadTemplate = () => {
    const template = `recipeName,description,servings,prepTimeMinutes,cookTimeMinutes,cuisineType,difficultyLevel,mealCategory,ingredientName,quantity,unit,notes,stepNumber,instruction
"Spaghetti Carbonara","Classic Italian pasta dish",4,10,15,"Italian","Easy","Dinner","spaghetti",400,"g","",1,"Cook spaghetti according to package directions"
"Spaghetti Carbonara","Classic Italian pasta dish",4,10,15,"Italian","Easy","Dinner","bacon",200,"g","diced",2,"Fry bacon until crispy"
"Spaghetti Carbonara","Classic Italian pasta dish",4,10,15,"Italian","Easy","Dinner","eggs",3,"whole","",3,"Whisk eggs with parmesan"
"Spaghetti Carbonara","Classic Italian pasta dish",4,10,15,"Italian","Easy","Dinner","parmesan",100,"g","grated",4,"Combine pasta with bacon and egg mixture"`

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'recipe-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    console.log('📂 handleImportCSV called, file selected:', file?.name)
    if (!file) {
      console.log('❌ No file selected')
      return
    }

    setImporting(true)
    setImportResult(null)

    try {
      console.log('📄 Reading file content...')
      const text = await file.text()
      console.log('📄 File content read, length:', text.length)

      console.log('🔷 Calling import CSV API...')
      const response = await fetch('/api/recipes/import-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData: text })
      })

      console.log('🟢 Import API response:', response.status, response.ok)
      const data = await response.json()

      if (response.ok) {
        console.log('✅ Import successful:', data.imported, 'recipes imported')

        // Build detailed message including any errors
        let message = `Successfully imported ${data.imported} recipe(s).`

        if (data.failed > 0 && data.errors && data.errors.length > 0) {
          message += `\n\nFailed to import ${data.failed} recipe(s):`
          data.errors.forEach((err: any) => {
            message += `\n• ${err.recipeName}: ${err.error}`
          })
        }

        setImportResult({
          success: data.failed === 0,
          message
        })

        if (data.imported > 0) {
          fetchRecipes() // Refresh recipe list only if some recipes were imported
        }
      } else {
        console.error('❌ Import failed:', data.error)
        setImportResult({
          success: false,
          message: data.error || 'Failed to import recipes'
        })
      }
    } catch (error) {
      console.error('❌ Error importing CSV:', error)
      setImportResult({
        success: false,
        message: 'Error importing CSV file'
      })
    } finally {
      setImporting(false)
      e.target.value = '' // Reset file input
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
          <div className="flex gap-2">
            <Button onClick={handleDownloadTemplate} variant="secondary" size="sm">
              Download Template
            </Button>
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
              onClick={() => {
                console.log('📂 Import CSV button clicked')
                fileInputRef.current?.click()
              }}
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </Button>
            <Link href="/recipes/new">
              <Button variant="primary">Add Recipe</Button>
            </Link>
          </div>
        }
      >
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
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <svg className={`w-4 h-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>Advanced Filters</span>
              {activeFilterCount > 0 && (
                <Badge variant="purple" size="sm">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-zinc-800">
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
                    <label key={diet.value} className="flex items-center gap-2 px-3 py-2 border border-zinc-700 rounded-md cursor-pointer hover:bg-zinc-800 text-sm text-zinc-300 transition-colors">
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
        </div>

        {filteredRecipes.length === 0 ? (
          <div className="card p-12 text-center">
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
                <Button variant="primary">
                  Add Recipe
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => {
              // Generate SVG if no valid image provided
              // Valid images: http(s) URLs, or data:image/ URLs with proper format
              const hasValidImage = recipe.imageUrl && (
                recipe.imageUrl.startsWith('http://') ||
                recipe.imageUrl.startsWith('https://') ||
                (recipe.imageUrl.startsWith('data:image/') && recipe.imageUrl.length > 100)
              )
              const imageUrl = hasValidImage ? recipe.imageUrl : generateRecipeSVG(recipe.recipeName, recipe.mealType)

              return (
                <div key={recipe.id} className="card-interactive overflow-hidden">
                  {/* Recipe Image */}
                  <div className="relative h-48 w-full bg-zinc-800 -m-6 mb-4">
                    <Image
                      src={imageUrl}
                      alt={recipe.recipeName}
                      fill
                      className="object-cover"
                      unoptimized={imageUrl.startsWith('data:')}
                    />
                  </div>

                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-white flex-1">{recipe.recipeName}</h3>
                      {recipe.familyRating && (
                        <div className="flex items-center ml-2">
                          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="ml-1 text-sm text-zinc-400">{recipe.familyRating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {recipe.description && (
                      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{recipe.description}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      {recipe.mealType.map(cat => (
                        <Badge key={cat} variant="purple" size="sm">
                          {cat}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center text-sm text-zinc-400 space-x-4 mb-4">
                      <span>🍽️ {recipe.servings} servings</span>
                      {recipe.totalTimeMinutes && (
                        <span>⏱️ {recipe.totalTimeMinutes} min</span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-500 mb-4">
                      Used {recipe.timesUsed} times • {recipe.ingredients.length} ingredients
                    </div>

                    <div className="flex space-x-2">
                      <Link href={`/recipes/${recipe.id}`} className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">
                          View/Edit
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(recipe.id)}
                      >
                        Delete
                      </Button>
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
