'use client'

import Link from 'next/link'
import { Plus, Sparkles } from 'lucide-react'

interface DashboardHeaderProps {
  weekLabel: string
  familyName: string
  mealPlanId?: string | null
}

export function DashboardHeader({ weekLabel, familyName, mealPlanId }: DashboardHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-white">This Week's Plan</h1>
        <p className="text-zinc-400 mt-1">
          {weekLabel} &bull; {familyName}
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/recipes/new"
          className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-sm text-white"
        >
          <Plus className="w-4 h-4" />
          Add Recipe
        </Link>
        <Link
          href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 rounded-lg transition-colors text-sm font-medium text-white"
        >
          <Sparkles className="w-4 h-4" />
          Complete My Meal Plan
        </Link>
      </div>
    </div>
  )
}
