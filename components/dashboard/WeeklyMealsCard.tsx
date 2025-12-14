'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Utensils, Plus, ChevronRight, ChevronDown, Sparkles } from 'lucide-react'

interface DayMeal {
  type: string          // 'Breakfast', 'Lunch', 'Dinner', etc.
  name: string          // Recipe name
  recipeId: string | null
}

interface WeeklyMeal {
  day: string           // 'Sunday'
  dayShort: string      // 'Sun'
  date: string          // '2025-12-15' (ISO)
  dateDisplay: string   // '15 Dec'
  isToday: boolean
  meals: DayMeal[]      // All meals for this day
}

interface WeeklyMealsCardProps {
  meals: WeeklyMeal[]
  plannedDays: number
  totalMeals: number
  mealPlanId?: string | null
}

export function WeeklyMealsCard({ meals, plannedDays, totalMeals, mealPlanId }: WeeklyMealsCardProps) {
  // Today is expanded by default
  const todayDay = meals.find(m => m.isToday)?.dayShort
  const [expandedDays, setExpandedDays] = useState<string[]>(todayDay ? [todayDay] : [])

  const unplannedDays = 7 - plannedDays

  const toggleDay = (dayShort: string) => {
    setExpandedDays(prev =>
      prev.includes(dayShort)
        ? prev.filter(d => d !== dayShort)
        : [...prev, dayShort]
    )
  }

  return (
    <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Weekly Meals</h2>
            <p className="text-sm text-zinc-500">{totalMeals} meals across {plannedDays} days</p>
          </div>
        </div>
        <Link
          href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
          className="text-sm text-purple-400 hover:text-purple-300 font-medium"
        >
          Edit plan &rarr;
        </Link>
      </div>

      {/* Meal list with expandable rows */}
      <div className="divide-y divide-zinc-800">
        {meals.map((day) => {
          const isExpanded = expandedDays.includes(day.dayShort)
          const hasMeals = day.meals.length > 0

          return (
            <div key={day.date}>
              {/* Day Header Row */}
              <div
                className={`px-5 py-3 flex items-center gap-4 transition-colors ${
                  day.isToday ? 'bg-purple-500/10 border-l-2 border-purple-500' : ''
                } ${hasMeals ? 'cursor-pointer hover:bg-zinc-800/50' : ''}`}
                onClick={() => hasMeals && toggleDay(day.dayShort)}
              >
                {/* Day and date label */}
                <div className={`w-14 ${day.isToday ? 'text-purple-300' : 'text-zinc-500'}`}>
                  <div className="text-xs font-medium uppercase tracking-wide">{day.dayShort}</div>
                  <div className="text-xs">{day.dateDisplay}</div>
                  {day.isToday && <div className="text-[10px] text-purple-400 mt-0.5">Today</div>}
                </div>

                {hasMeals ? (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white">
                        {day.meals.length} meal{day.meals.length !== 1 ? 's' : ''} planned
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-dashed border-zinc-600 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-500 italic">No meals planned</p>
                    </div>
                    <Link
                      href={mealPlanId ? `/meal-plans/${mealPlanId}` : '/meal-plans'}
                      className="text-sm text-purple-400 hover:text-purple-300"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Add meal
                    </Link>
                  </>
                )}
              </div>

              {/* Expanded Meals */}
              {isExpanded && hasMeals && (
                <div className="bg-zinc-800/30">
                  {day.meals.map((meal, mealIdx) => (
                    <Link
                      key={mealIdx}
                      href={meal.recipeId ? `/recipes/${meal.recipeId}` : '#'}
                      className="px-5 py-2 pl-24 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="w-6 h-6 rounded bg-zinc-700 flex items-center justify-center">
                        <Utensils className="w-3 h-3 text-zinc-400" />
                      </div>
                      <span className="text-xs text-zinc-500 w-20">{meal.type}</span>
                      <span className="text-sm flex-1 truncate text-white">{meal.name}</span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
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
