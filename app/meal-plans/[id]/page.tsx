'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateRange } from '@/lib/date-utils'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Recipe {
  id: string
  recipeName: string
  mealType: string[]
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
}

interface Meal {
  id: string
  dayOfWeek: string
  mealType: string
  recipeId?: string | null
  recipeName?: string | null
  servings?: number | null
  isLocked: boolean
  recipe?: Recipe | null
}

interface MealPlan {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: string
  customSchedule: any
  meals: Meal[]
}

interface Profile {
  id: string
  profileName: string
  isMainUser: boolean
  dailyCalorieTarget?: number | null
  dailyProteinTarget?: number | null
  dailyCarbsTarget?: number | null
  dailyFatTarget?: number | null
}

interface DailyMacros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = ['Breakfast', 'Morning Snack', 'Lunch', 'Afternoon Snack', 'Dinner', 'Dessert', 'Evening Snack']

export default function MealPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
  const mealPlanId = params.id as string

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchMealPlan()
    fetchProfiles()
    fetchRecipes()
  }, [mealPlanId])

  const fetchMealPlan = async () => {
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}`)
      if (!response.ok) throw new Error('Failed to fetch meal plan')
      const data = await response.json()
      setMealPlan(data.mealPlan)
    } catch (error) {
      console.error('Error fetching meal plan:', error)
      alert('Failed to load meal plan')
      router.push('/meal-plans')
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      const data = await response.json()
      const profilesList = data.profiles || []
      setProfiles(profilesList)

      // Set main user as default
      const mainUser = profilesList.find((p: Profile) => p.isMainUser)
      if (mainUser) {
        setSelectedProfileId(mainUser.id)
      } else if (profilesList.length > 0) {
        setSelectedProfileId(profilesList[0].id)
      }
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  const fetchRecipes = async () => {
    try {
      const response = await fetch('/api/recipes?archived=false')
      const data = await response.json()
      setRecipes(data.recipes || [])
    } catch (error) {
      console.error('Error fetching recipes:', error)
    }
  }

  const calculateDailyMacros = (day: string): DailyMacros => {
    if (!mealPlan || !selectedProfileId) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0 }
    }

    const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0

    dayMeals.forEach(meal => {
      if (meal.recipe && meal.servings) {
        // Calculate per person serving (1 serving per person)
        const caloriesPerServing = meal.recipe.caloriesPerServing || 0
        const proteinPerServing = meal.recipe.proteinPerServing || 0
        const carbsPerServing = meal.recipe.carbsPerServing || 0
        const fatPerServing = meal.recipe.fatPerServing || 0

        totalCalories += caloriesPerServing
        totalProtein += proteinPerServing
        totalCarbs += carbsPerServing
        totalFat += fatPerServing
      }
    })

    return {
      calories: Math.round(totalCalories),
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10
    }
  }

  const getMacroProgressColor = (actual: number, target: number): string => {
    if (target === 0) return 'bg-gray-400'
    const percentage = (actual / target) * 100
    if (percentage >= 90 && percentage <= 110) return 'bg-green-500'
    if (percentage > 110) return 'bg-red-500'
    return 'bg-yellow-500'
  }

  const getMacroPercentage = (actual: number, target: number): number => {
    if (target === 0) return 0
    return Math.min((actual / target) * 100, 100)
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!mealPlan) return

    const confirmed = confirm(`Are you sure you want to ${newStatus === 'Finalized' ? 'finalize' : newStatus === 'Draft' ? 'reopen' : 'archive'} this meal plan?`)
    if (!confirmed) return

    setSaving(true)
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update status')
      const data = await response.json()
      setMealPlan(data.mealPlan)
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to permanently delete this meal plan? This cannot be undone.')) {
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete meal plan')
      alert('Meal plan deleted successfully')
      router.push('/meal-plans')
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      alert('Failed to delete meal plan')
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading meal plan...</p>
      </div>
    )
  }

  if (!mealPlan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Meal plan not found</p>
      </div>
    )
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/meal-plans" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Back to Meal Plans
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate)}
              </h1>
              <p className="text-gray-600 mt-1">View and edit your meal plan</p>
            </div>
            <div className="flex gap-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                mealPlan.status === 'Finalized' ? 'bg-green-100 text-green-800' :
                mealPlan.status === 'Archived' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {mealPlan.status}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {mealPlan.status === 'Draft' && (
              <button
                onClick={() => handleStatusChange('Finalized')}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Finalize Plan
              </button>
            )}
            {mealPlan.status === 'Finalized' && (
              <>
                <button
                  onClick={() => handleStatusChange('Draft')}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  Reopen for Editing
                </button>
                <button
                  onClick={() => handleStatusChange('Archived')}
                  disabled={saving}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
                >
                  Archive Plan
                </button>
              </>
            )}
            {mealPlan.status === 'Archived' && (
              <button
                onClick={() => handleStatusChange('Draft')}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Reopen for Editing
              </button>
            )}
            <button
              onClick={() => setShowEditSchedule(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Edit Schedule
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              Delete Plan
            </button>
          </div>
        </div>

        {/* User Selector for Macro View */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View Macros For:
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
          >
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.profileName} {profile.isMainUser ? '(Main User)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Weekly Meal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
            const dailyMacros = calculateDailyMacros(day)

            return (
              <div key={day} className="bg-white rounded-lg shadow-sm p-4">
                <h3 className="font-medium text-gray-900 mb-2">{day}</h3>

                {/* Daily Macro Summary */}
                {selectedProfile && (
                  <div className="mb-4 p-3 bg-gray-50 rounded text-xs space-y-2">
                    <div className="font-medium text-gray-700">Daily Macros:</div>

                    {/* Calories */}
                    {selectedProfile.dailyCalorieTarget && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Calories</span>
                          <span>{dailyMacros.calories} / {selectedProfile.dailyCalorieTarget}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}`}
                            style={{ width: `${getMacroPercentage(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Protein */}
                    {selectedProfile.dailyProteinTarget && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Protein</span>
                          <span>{dailyMacros.protein}g / {selectedProfile.dailyProteinTarget}g</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.protein, selectedProfile.dailyProteinTarget)}`}
                            style={{ width: `${getMacroPercentage(dailyMacros.protein, selectedProfile.dailyProteinTarget)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Carbs */}
                    {selectedProfile.dailyCarbsTarget && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Carbs</span>
                          <span>{dailyMacros.carbs}g / {selectedProfile.dailyCarbsTarget}g</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}`}
                            style={{ width: `${getMacroPercentage(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Fat */}
                    {selectedProfile.dailyFatTarget && (
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Fat</span>
                          <span>{dailyMacros.fat}g / {selectedProfile.dailyFatTarget}g</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.fat, selectedProfile.dailyFatTarget)}`}
                            style={{ width: `${getMacroPercentage(dailyMacros.fat, selectedProfile.dailyFatTarget)}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Meals for the Day */}
                <div className="space-y-3">
                  {dayMeals.length === 0 ? (
                    <p className="text-sm text-gray-400">No meals planned</p>
                  ) : (
                    dayMeals.map((meal) => (
                      <div key={meal.id} className="border rounded p-2 text-sm">
                        <div className="font-medium text-gray-700">{meal.mealType}</div>
                        <div className="text-gray-600">{meal.recipeName || 'No recipe'}</div>
                        {meal.servings && (
                          <div className="text-gray-500 text-xs">{meal.servings} servings</div>
                        )}
                        {meal.isLocked && (
                          <div className="text-xs text-blue-600 mt-1">🔒 Locked</div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
