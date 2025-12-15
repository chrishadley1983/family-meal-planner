'use client'

import { Zap, TrendingUp, Heart, Leaf } from 'lucide-react'
import type { QuickFilterId } from '@/lib/recipe-helpers'

interface RecipeQuickFiltersProps {
  activeFilters: QuickFilterId[]
  onFilterToggle: (filterId: QuickFilterId) => void
  className?: string
}

const quickFilters = [
  { id: 'quick' as const, icon: Zap, label: 'Under 30 min' },
  { id: 'protein' as const, icon: TrendingUp, label: 'High protein' },
  { id: 'favourite' as const, icon: Heart, label: 'Most used' },
  { id: 'veggie' as const, icon: Leaf, label: 'Vegetarian' },
]

export function RecipeQuickFilters({
  activeFilters,
  onFilterToggle,
  className = '',
}: RecipeQuickFiltersProps) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {quickFilters.map((filter) => {
        const isActive = activeFilters.includes(filter.id)
        const Icon = filter.icon

        return (
          <button
            key={filter.id}
            onClick={() => onFilterToggle(filter.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              isActive
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {filter.label}
          </button>
        )
      })}
    </div>
  )
}
