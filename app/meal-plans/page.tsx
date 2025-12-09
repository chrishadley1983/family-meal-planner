'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfWeek, format, addWeeks } from 'date-fns'
import { RecipeDetailsModal } from '@/components/RecipeDetailsModal'

interface MealPlan {
  id: string
  weekStartDate: string
  weekEndDate: string
  status: string
  meals: Array<{
    id: string
    dayOfWeek: string
    mealType: string
    recipeName?: string
    servings?: number
    notes?: string
    recipe?: any
  }>
}

export default function MealPlansPage() {
  const router = useRouter()
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)

  useEffect(() => {
    fetchMealPlans()
    setSelectedWeek(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
  }, [])

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-plans')
      const data = await response.json()
      setMealPlans(data.mealPlans || [])
    } catch (error) {
      console.error('Error fetching meal plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    if (!selectedWeek) {
      alert('Please select a week')
      return
    }

    setGenerating(true)
    setGeneratedSummary('')

    try {
      const response = await fetch('/api/meal-plans/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStartDate: selectedWeek
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to generate meal plan')
        setGenerating(false)
        return
      }

      setGeneratedSummary(data.summary || '')
      setMealPlans([data.mealPlan, ...mealPlans])
    } catch (error) {
      console.error('Error generating meal plan:', error)
      alert('Failed to generate meal plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading meal plans...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Meal Plans</h1>
          <p className="text-gray-600 mt-1">Generate AI-powered weekly meal plans</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Meal Plan</h3>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Week Starting
              </label>
              <input
                type="date"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              />
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating with AI...
                </span>
              ) : (
                'Generate with AI'
              )}
            </button>
          </div>

          {generatedSummary && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-900"><strong>AI Summary:</strong> {generatedSummary}</p>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Claude AI will analyze your family profiles, recipes, and preferences to generate a personalized weekly meal plan.
          </p>
        </div>

        {mealPlans.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No meal plans yet</h3>
            <p className="mt-1 text-gray-500">Generate your first AI-powered meal plan</p>
          </div>
        ) : (
          <div className="space-y-6">
            {mealPlans.map((plan) => (
              <div key={plan.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Week of {new Date(plan.weekStartDate).toLocaleDateString()}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      plan.status === 'Finalized'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {daysOfWeek.map((day) => {
                      const dayMeals = plan.meals.filter(m => m.dayOfWeek === day)
                      return (
                        <div key={day} className="border rounded-lg p-3">
                          <h4 className="font-medium text-gray-900 text-sm mb-2">{day}</h4>
                          {dayMeals.length === 0 ? (
                            <p className="text-xs text-gray-400">No meals</p>
                          ) : (
                            <div className="space-y-2">
                              {dayMeals.map((meal) => (
                                <div
                                  key={meal.id}
                                  className="text-xs cursor-pointer hover:bg-gray-100 p-2 rounded transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (meal.recipe?.id) {
                                      setSelectedRecipeId(meal.recipe.id)
                                    }
                                  }}
                                >
                                  <p className="font-medium text-gray-700">{meal.mealType}</p>
                                  <p className="text-gray-600 hover:text-gray-900">{meal.recipeName || 'No recipe'}</p>
                                  {meal.servings && (
                                    <p className="text-gray-500">{meal.servings} servings</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Details Modal */}
      <RecipeDetailsModal
        isOpen={selectedRecipeId !== null}
        onClose={() => setSelectedRecipeId(null)}
        recipeId={selectedRecipeId}
      />
    </div>
  )
}
