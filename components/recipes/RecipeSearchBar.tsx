'use client'

import { Search, Filter } from 'lucide-react'

interface RecipeSearchBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  mealType: string
  onMealTypeChange: (value: string) => void
  cuisineType: string
  onCuisineTypeChange: (value: string) => void
  mealTypes: string[]
  cuisineTypes: string[]
  onFilterClick: () => void
  className?: string
}

export function RecipeSearchBar({
  searchTerm,
  onSearchChange,
  mealType,
  onMealTypeChange,
  cuisineType,
  onCuisineTypeChange,
  mealTypes,
  cuisineTypes,
  onFilterClick,
  className = '',
}: RecipeSearchBarProps) {
  return (
    <div className={`bg-zinc-900/50 rounded-xl p-2 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center ${className}`}>
      {/* Search input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          type="text"
          placeholder="Search by name, ingredient, or cuisine..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-transparent border-0 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-0"
        />
      </div>

      {/* Divider - hidden on mobile */}
      <div className="hidden sm:block h-6 w-px bg-zinc-700" />

      {/* Meal type select */}
      <select
        value={mealType}
        onChange={(e) => onMealTypeChange(e.target.value)}
        className="bg-zinc-800 border-0 px-3 py-2 text-sm text-zinc-400 focus:outline-none cursor-pointer hover:text-white rounded"
      >
        <option value="" className="bg-zinc-800 text-zinc-300">All Types</option>
        {mealTypes.map((type) => (
          <option key={type} value={type} className="bg-zinc-800 text-zinc-300">
            {type}
          </option>
        ))}
      </select>

      {/* Divider - hidden on mobile */}
      <div className="hidden sm:block h-6 w-px bg-zinc-700" />

      {/* Cuisine type select */}
      <select
        value={cuisineType}
        onChange={(e) => onCuisineTypeChange(e.target.value)}
        className="bg-zinc-800 border-0 px-3 py-2 text-sm text-zinc-400 focus:outline-none cursor-pointer hover:text-white rounded"
      >
        <option value="" className="bg-zinc-800 text-zinc-300">All Cuisines</option>
        {cuisineTypes.map((type) => (
          <option key={type} value={type} className="bg-zinc-800 text-zinc-300">
            {type}
          </option>
        ))}
      </select>

      {/* Filter button */}
      <button
        onClick={onFilterClick}
        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        title="Advanced filters"
      >
        <Filter className="w-4 h-4 text-zinc-400" />
      </button>
    </div>
  )
}
