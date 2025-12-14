'use client'

import Link from 'next/link'
import { Calendar, Utensils, Plus, ChevronRight, Sparkles } from 'lucide-react'

interface WeeklyMeal {
  day: string
  date: string
  isToday: boolean
  dinner: string | null
  recipeId: string | null
  planned: boolean
}

interface WeeklyMealsCardProps {
  meals: WeeklyMeal[]
  plannedCount: number
  mealPlanId?: string | null
}

export function WeeklyMealsCard({ meals, plannedCount, mealPlanId }: WeeklyMealsCardProps) {
  const unplannedDays = 7 - plannedCount

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Weekly Dinners</h2>
            <p className="text-sm text-zinc-500">{plannedCount} of 7 days planned</p>
          </div>
        </div>
        <Link
          href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
          className="text-sm text-purple-400 hover:text-purple-300 font-medium"
        >
          Edit plan &rarr;
        </Link>
      </div>

      {/* Meal list */}
      <div className="divide-y divide-zinc-800">
        {meals.map((meal) => (
          <div
            key={meal.day}
            className={`px-5 py-3 flex items-center gap-4 ${
              meal.isToday ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
            }`}
          >
            {/* Day label */}
            <div className={`w-12 text-center ${meal.isToday ? 'text-purple-300' : 'text-zinc-500'}`}>
              <div className="text-xs font-medium uppercase tracking-wide">{meal.day}</div>
              {meal.isToday && <div className="text-[10px] text-purple-400 mt-0.5">Today</div>}
            </div>

            {meal.planned ? (
              <>
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <Link
                    href={meal.recipeId ? `/recipes/${meal.recipeId}` : '#'}
                    className="font-medium truncate text-white hover:text-purple-300 transition-colors block"
                  >
                    {meal.dinner}
                  </Link>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-600" />
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-dashed border-zinc-600 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-500 italic">No meal planned</p>
                </div>
                <Link
                  href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
                  className="text-sm text-purple-400 hover:text-purple-300"
                >
                  Add meal
                </Link>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Planning prompt */}
      {unplannedDays > 0 && (
        <div className="px-5 py-4 bg-zinc-800/50 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-sm text-zinc-400 flex-1">
            <span className="text-white font-medium">{unplannedDays} days</span> still need meals -
            let AI suggest based on your preferences
          </p>
          <Link
            href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
            className="text-sm text-purple-400 hover:text-purple-300 font-medium"
          >
            Auto-fill &rarr;
          </Link>
        </div>
      )}
    </div>
  )
}
