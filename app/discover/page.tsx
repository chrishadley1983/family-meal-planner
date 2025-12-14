'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button } from '@/components/ui'
import { useNotification } from '@/components/providers/NotificationProvider'
import {
  DiscoverRecipeCard,
  DiscoverRecipeCardSkeleton,
  FilterPanel,
  RecipePreviewModal,
  Pagination,
  DiscoverAssistant,
  defaultFilters,
  type DiscoverRecipe,
  type Filters
} from '@/components/discover'

interface FilterOptions {
  cuisines: string[]
  mealCategories: string[]
  dietaryTags: string[]
  allergens: string[]
  sites: { value: string; label: string }[]
  stats?: {
    totalRecipes: number
    avgCalories?: number | null
    avgProtein?: string | null
    avgTime?: number | null
    calorieRange?: { min: number; max: number }
    timeRange?: { min: number; max: number }
  }
}

interface Profile {
  id: string
  profileName: string
}

export default function DiscoverPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { showToast } = useNotification()

  // Data state
  const [recipes, setRecipes] = useState<DiscoverRecipe[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])

  // Filter state
  const [filters, setFilters] = useState<Filters>(defaultFilters)

  // Selection state
  const [selectedRecipes, setSelectedRecipes] = useState<Set<string>>(new Set())
  const [previewRecipeId, setPreviewRecipeId] = useState<string | null>(null)
  const [addingRecipeId, setAddingRecipeId] = useState<string | null>(null)
  const [bulkAdding, setBulkAdding] = useState(false)

  // Redirect if not logged in
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  // Fetch filter options on mount
  useEffect(() => {
    fetchFilterOptions()
    fetchProfiles()
  }, [])

  // Fetch recipes when filters or page change
  useEffect(() => {
    if (status === 'authenticated') {
      fetchRecipes()
    }
  }, [filters, page, status])

  const fetchFilterOptions = async () => {
    try {
      const response = await fetch('/api/discover/filters')
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(data)
      }
    } catch (error) {
      console.error('❌ Failed to fetch filter options:', error)
    }
  }

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      if (response.ok) {
        const data = await response.json()
        setProfiles(data.profiles || [])
      }
    } catch (error) {
      console.error('❌ Failed to fetch profiles:', error)
    }
  }

  const fetchRecipes = useCallback(async () => {
    setLoading(true)
    try {
      console.log('🔷 Fetching discover recipes...')

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')

      if (filters.query) params.set('query', filters.query)
      if (filters.cuisineType) params.set('cuisineType', filters.cuisineType)
      if (filters.mealCategory) params.set('mealCategory', filters.mealCategory)
      if (filters.maxCalories) params.set('maxCalories', String(filters.maxCalories))
      if (filters.minProtein) params.set('minProtein', String(filters.minProtein))
      if (filters.maxTime) params.set('maxTime', String(filters.maxTime))
      if (filters.dietaryTags.length > 0) params.set('dietaryTags', filters.dietaryTags.join(','))
      if (filters.excludeAllergens.length > 0) params.set('excludeAllergens', filters.excludeAllergens.join(','))
      if (filters.profileId) params.set('profileId', filters.profileId)
      if (filters.useInventory) params.set('useInventory', 'true')
      if (filters.sourceSite) params.set('sourceSite', filters.sourceSite)

      const response = await fetch(`/api/discover/recipes?${params}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      console.log(`🟢 Loaded ${data.recipes?.length} recipes (page ${data.page} of ${data.totalPages})`)

      setRecipes(data.recipes || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)

      // Clear selections when results change
      setSelectedRecipes(new Set())
    } catch (error) {
      console.error('❌ Failed to fetch recipes:', error)
      showToast('Failed to load recipes', 'error')
    } finally {
      setLoading(false)
    }
  }, [filters, page, showToast])

  const handleSelect = (id: string) => {
    const newSet = new Set(selectedRecipes)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedRecipes(newSet)
  }

  const handleSelectAll = () => {
    const selectableRecipes = recipes.filter(r => !r.alreadyInLibrary)
    setSelectedRecipes(new Set(selectableRecipes.map(r => r.id)))
  }

  const handleClearSelection = () => {
    setSelectedRecipes(new Set())
  }

  const handleAddSingle = async (recipeId: string) => {
    setAddingRecipeId(recipeId)
    try {
      const response = await fetch('/api/discover/recipes/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterRecipeId: recipeId })
      })

      const data = await response.json()

      if (response.ok) {
        showToast('Recipe added to your library!', 'success')
        // Update the recipe in the list to show "In Library"
        setRecipes(prev => prev.map(r =>
          r.id === recipeId ? { ...r, alreadyInLibrary: true } : r
        ))
        // Close preview modal if open
        if (previewRecipeId === recipeId) {
          setPreviewRecipeId(null)
        }
      } else if (response.status === 409) {
        showToast('Recipe already in your library', 'info')
        setRecipes(prev => prev.map(r =>
          r.id === recipeId ? { ...r, alreadyInLibrary: true } : r
        ))
      } else {
        showToast(data.error || 'Failed to add recipe', 'error')
      }
    } catch (error) {
      console.error('❌ Failed to add recipe:', error)
      showToast('Failed to add recipe', 'error')
    } finally {
      setAddingRecipeId(null)
    }
  }

  const handleBulkAdd = async () => {
    if (selectedRecipes.size === 0) return

    setBulkAdding(true)
    try {
      const response = await fetch('/api/discover/recipes/add-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ masterRecipeIds: Array.from(selectedRecipes) })
      })

      const data = await response.json()

      if (response.ok) {
        const { succeeded, skipped, failed } = data.results

        let message = ''
        if (succeeded.length > 0) message += `Added ${succeeded.length} recipes. `
        if (skipped.length > 0) message += `${skipped.length} already in library. `
        if (failed.length > 0) message += `${failed.length} failed. `

        showToast(message.trim(), succeeded.length > 0 ? 'success' : 'info')

        // Update recipes to show "In Library" for added ones
        const addedIds = new Set([...succeeded.map((s: any) => s.id), ...skipped.map((s: any) => s.id)])
        setRecipes(prev => prev.map(r =>
          addedIds.has(r.id) ? { ...r, alreadyInLibrary: true } : r
        ))

        setSelectedRecipes(new Set())
      } else {
        showToast(data.error || 'Failed to add recipes', 'error')
      }
    } catch (error) {
      console.error('❌ Failed to bulk add recipes:', error)
      showToast('Failed to add recipes', 'error')
    } finally {
      setBulkAdding(false)
    }
  }

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  const handleResetFilters = () => {
    setFilters(defaultFilters)
    setPage(1)
  }

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (status === 'loading') {
    return (
      <AppLayout>
        <PageContainer>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageContainer>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Discover Recipes</h1>
          <p className="text-gray-600">
            Browse our curated collection of recipes from trusted sources. Find new favourites and add them to your personal library.
          </p>
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          options={filterOptions}
          profiles={profiles}
          loading={loading}
        />

        {/* Results header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="text-gray-600">
            {loading ? (
              <span>Searching...</span>
            ) : (
              <span>{total.toLocaleString()} recipe{total !== 1 ? 's' : ''} found</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:underline"
              disabled={loading || recipes.filter(r => !r.alreadyInLibrary).length === 0}
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={handleClearSelection}
              className="text-sm text-gray-600 hover:underline"
              disabled={selectedRecipes.size === 0}
            >
              Clear Selection
            </button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleBulkAdd}
              disabled={selectedRecipes.size === 0 || bulkAdding}
              isLoading={bulkAdding}
            >
              Add Selected ({selectedRecipes.size})
            </Button>
          </div>
        </div>

        {/* Recipe grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <DiscoverRecipeCardSkeleton key={i} />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No recipes found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your filters or search term to find more recipes.
            </p>
            <Button variant="secondary" onClick={handleResetFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recipes.map(recipe => (
              <DiscoverRecipeCard
                key={recipe.id}
                recipe={recipe}
                isSelected={selectedRecipes.has(recipe.id)}
                onSelect={handleSelect}
                onPreview={() => setPreviewRecipeId(recipe.id)}
                onAdd={() => handleAddSingle(recipe.id)}
                isAdding={addingRecipeId === recipe.id}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && recipes.length > 0 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        )}

        {/* Preview modal */}
        <RecipePreviewModal
          recipeId={previewRecipeId}
          onClose={() => setPreviewRecipeId(null)}
          onAdd={handleAddSingle}
          isAdding={addingRecipeId === previewRecipeId}
        />
      </PageContainer>

      {/* Discover Assistant (Emilia) */}
      {profiles.length > 0 ? (
        <DiscoverAssistant
          profileId={profiles[0].id}
          onAddRecipe={handleAddSingle}
          onPreviewRecipe={(recipeId) => setPreviewRecipeId(recipeId)}
        />
      ) : (
        /* No-profile hint - show small tooltip near where FAB would be */
        <div className="fixed bottom-6 right-6 bg-zinc-800 text-zinc-300 text-sm px-4 py-2 rounded-lg shadow-lg z-40">
          <a href="/profiles" className="text-purple-400 hover:underline">Create a profile</a> to use the recipe assistant
        </div>
      )}
    </AppLayout>
  )
}
