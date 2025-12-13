'use client'

import { useState, useEffect } from 'react'
import { Button, Input, Select, Checkbox, Label } from '@/components/ui'

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

export interface Filters {
  query: string
  cuisineType: string
  mealCategory: string
  maxCalories: number | undefined
  minProtein: number | undefined
  maxTime: number | undefined
  dietaryTags: string[]
  excludeAllergens: string[]
  profileId: string | undefined
  useInventory: boolean
  sourceSite: string
}

interface FilterPanelProps {
  filters: Filters
  onChange: (filters: Filters) => void
  onReset: () => void
  options: FilterOptions | null
  profiles?: { id: string; profileName: string }[]
  loading?: boolean
}

export function FilterPanel({
  filters,
  onChange,
  onReset,
  options,
  profiles = [],
  loading = false
}: FilterPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value })
  }

  const toggleDietaryTag = (tag: string) => {
    const current = filters.dietaryTags || []
    if (current.includes(tag)) {
      updateFilter('dietaryTags', current.filter(t => t !== tag))
    } else {
      updateFilter('dietaryTags', [...current, tag])
    }
  }

  const toggleAllergen = (allergen: string) => {
    const current = filters.excludeAllergens || []
    if (current.includes(allergen)) {
      updateFilter('excludeAllergens', current.filter(a => a !== allergen))
    } else {
      updateFilter('excludeAllergens', [...current, allergen])
    }
  }

  const hasActiveFilters =
    filters.query ||
    filters.cuisineType ||
    filters.mealCategory ||
    filters.maxCalories ||
    filters.minProtein ||
    filters.maxTime ||
    filters.dietaryTags.length > 0 ||
    filters.excludeAllergens.length > 0 ||
    filters.profileId ||
    filters.useInventory ||
    filters.sourceSite

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="search"
            placeholder="Search recipes by name or ingredients..."
            value={filters.query}
            onChange={(e) => updateFilter('query', e.target.value)}
            className="w-full"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide Filters' : 'Show Filters'}
          <svg
            className={`w-4 h-4 ml-1 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </Button>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={onReset}>
            Clear All
          </Button>
        )}
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2 mt-4">
        <Select
          value={filters.mealCategory}
          onChange={(e) => updateFilter('mealCategory', e.target.value)}
          className="w-auto"
        >
          <option value="">All Meal Types</option>
          {options?.mealCategories.map(cat => (
            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
        </Select>

        <Select
          value={filters.cuisineType}
          onChange={(e) => updateFilter('cuisineType', e.target.value)}
          className="w-auto"
        >
          <option value="">All Cuisines</option>
          {options?.cuisines.map(cuisine => (
            <option key={cuisine} value={cuisine}>{cuisine}</option>
          ))}
        </Select>

        <Select
          value={filters.sourceSite}
          onChange={(e) => updateFilter('sourceSite', e.target.value)}
          className="w-auto"
        >
          <option value="">All Sources</option>
          {options?.sites.map(site => (
            <option key={site.value} value={site.value}>{site.label}</option>
          ))}
        </Select>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
          {/* Nutrition filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="maxCalories">Max Calories</Label>
              <Input
                id="maxCalories"
                type="number"
                placeholder="e.g., 500"
                value={filters.maxCalories || ''}
                onChange={(e) => updateFilter('maxCalories', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label htmlFor="minProtein">Min Protein (g)</Label>
              <Input
                id="minProtein"
                type="number"
                placeholder="e.g., 20"
                value={filters.minProtein || ''}
                onChange={(e) => updateFilter('minProtein', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
            <div>
              <Label htmlFor="maxTime">Max Time (min)</Label>
              <Input
                id="maxTime"
                type="number"
                placeholder="e.g., 30"
                value={filters.maxTime || ''}
                onChange={(e) => updateFilter('maxTime', e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>
          </div>

          {/* Dietary preferences */}
          {options?.dietaryTags && options.dietaryTags.length > 0 && (
            <div>
              <Label>Dietary Preferences</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {options.dietaryTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleDietaryTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.dietaryTags.includes(tag)
                        ? 'bg-green-100 border-green-500 text-green-800'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Allergen exclusions */}
          {options?.allergens && options.allergens.length > 0 && (
            <div>
              <Label>Exclude Allergens</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {options.allergens.map(allergen => (
                  <button
                    key={allergen}
                    onClick={() => toggleAllergen(allergen)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      filters.excludeAllergens.includes(allergen)
                        ? 'bg-red-100 border-red-500 text-red-800'
                        : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    No {allergen}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profile & inventory */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {profiles.length > 0 && (
              <div>
                <Label htmlFor="profileId">Filter for Family Member</Label>
                <Select
                  id="profileId"
                  value={filters.profileId || ''}
                  onChange={(e) => updateFilter('profileId', e.target.value || undefined)}
                >
                  <option value="">No profile filter</option>
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.profileName}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Excludes recipes with their allergens and dislikes
                </p>
              </div>
            )}

            <div className="flex items-center gap-2 pt-6">
              <Checkbox
                id="useInventory"
                checked={filters.useInventory}
                onChange={(e) => updateFilter('useInventory', e.target.checked)}
              />
              <Label htmlFor="useInventory" className="cursor-pointer">
                Match my inventory
              </Label>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {options?.stats && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-sm text-gray-600">
          <span>📚 {options.stats.totalRecipes.toLocaleString()} recipes available</span>
          {options.stats.avgCalories && (
            <span>🔥 Avg: {options.stats.avgCalories} kcal</span>
          )}
          {options.stats.avgProtein && (
            <span>💪 Avg: {options.stats.avgProtein}g protein</span>
          )}
        </div>
      )}
    </div>
  )
}

export const defaultFilters: Filters = {
  query: '',
  cuisineType: '',
  mealCategory: '',
  maxCalories: undefined,
  minProtein: undefined,
  maxTime: undefined,
  dietaryTags: [],
  excludeAllergens: [],
  profileId: undefined,
  useInventory: false,
  sourceSite: ''
}
