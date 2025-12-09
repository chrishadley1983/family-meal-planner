'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfWeek, format, addWeeks } from 'date-fns'

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
    isLeftover?: boolean
    leftoverFromMealId?: string | null
    notes?: string
    recipe?: any
  }>
}

interface MealSchedule {
  monday: string[]
  tuesday: string[]
  wednesday: string[]
  thursday: string[]
  friday: string[]
  saturday: string[]
  sunday: string[]
}

interface Profile {
  id: string
  profileName: string
  mealAvailability?: MealSchedule
}

interface WeekProfileSchedule {
  profileId: string
  profileName: string
  included: boolean
  schedule: MealSchedule
}

export default function MealPlansPage() {
  const router = useRouter()
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [quickOptions, setQuickOptions] = useState({
    prioritizeShopping: false,
    useExpiring: false,
    maximizeBatch: false
  })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [selectedWeek, setSelectedWeek] = useState('')
  const [generatedSummary, setGeneratedSummary] = useState('')
  const [showScheduleOverride, setShowScheduleOverride] = useState(false)
  const [weekProfileSchedules, setWeekProfileSchedules] = useState<WeekProfileSchedule[]>([])
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [copyFromPlanId, setCopyFromPlanId] = useState<string>('')

  useEffect(() => {
    fetchMealPlans()
    fetchProfiles()
    setSelectedWeek(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
  }, [])

  const fetchMealPlans = async () => {
    try {
      const response = await fetch('/api/meal-plans')
      const data = await response.json()
      let plans = data.mealPlans || []

      // Auto-archive plans where weekEndDate has passed
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const updatedPlans = await Promise.all(
        plans.map(async (plan: MealPlan) => {
          const weekEnd = new Date(plan.weekEndDate)
          weekEnd.setHours(0, 0, 0, 0)

          // Auto-archive if week has ended and not already archived
          if (weekEnd < today && plan.status !== 'Archived') {
            try {
              const updateResponse = await fetch(`/api/meal-plans/${plan.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'Archived' })
              })
              if (updateResponse.ok) {
                const updatedData = await updateResponse.json()
                console.log(`✅ Auto-archived meal plan ${plan.id}`)
                return updatedData.mealPlan
              }
            } catch (error) {
              console.error(`Failed to auto-archive plan ${plan.id}:`, error)
            }
          }
          return plan
        })
      )

      setMealPlans(updatedPlans)
    } catch (error) {
      console.error('Error fetching meal plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfiles = async () => {
    try {
      const response = await fetch('/api/profiles')
      const data = await response.json()
      const fetchedProfiles = data.profiles || []
      setProfiles(fetchedProfiles)

      // Initialize week schedules from profiles (all included by default)
      const initialSchedules: WeekProfileSchedule[] = fetchedProfiles.map((profile: Profile) => ({
        profileId: profile.id,
        profileName: profile.profileName,
        included: true,
        schedule: profile.mealAvailability || {
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
          sunday: []
        }
      }))
      setWeekProfileSchedules(initialSchedules)
    } catch (error) {
      console.error('Error fetching profiles:', error)
    }
  }

  // Toggle profile inclusion for the week
  const toggleProfileInclusion = (profileId: string) => {
    setWeekProfileSchedules(schedules =>
      schedules.map(s =>
        s.profileId === profileId ? { ...s, included: !s.included } : s
      )
    )
  }

  // Toggle meal for a specific person and day
  const togglePersonMeal = (profileId: string, day: keyof MealSchedule, mealType: string) => {
    setWeekProfileSchedules(schedules =>
      schedules.map(s => {
        if (s.profileId !== profileId) return s

        const currentMeals = s.schedule[day] || []
        const newMeals = currentMeals.includes(mealType)
          ? currentMeals.filter(m => m !== mealType)
          : [...currentMeals, mealType]

        return {
          ...s,
          schedule: {
            ...s.schedule,
            [day]: newMeals
          }
        }
      })
    )
  }

  // Reset all schedules to profile defaults
  const resetToDefaultSchedules = () => {
    const defaultSchedules: WeekProfileSchedule[] = profiles.map(profile => ({
      profileId: profile.id,
      profileName: profile.profileName,
      included: true,
      schedule: profile.mealAvailability || {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      }
    }))
    setWeekProfileSchedules(defaultSchedules)
  }

  const handleGeneratePlan = async () => {
    if (!selectedWeek) {
      alert('Please select a week')
      return
    }

    setGenerating(true)
    setGeneratedSummary('')

    try {
      // If copying from previous week, use copy endpoint
      if (copyFromPlanId) {
        console.log('🔷 Copying from previous meal plan:', copyFromPlanId)
        const response = await fetch('/api/meal-plans/copy', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourcePlanId: copyFromPlanId,
            weekStartDate: selectedWeek,
            weekProfileSchedules: weekProfileSchedules
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          alert(data.error || 'Failed to copy meal plan')
          setGenerating(false)
          return
        }

        console.log('🟢 Meal plan copied successfully')
        setGeneratedSummary('Meal plan copied from previous week')
        setMealPlans([data.mealPlan, ...mealPlans])
        setCopyFromPlanId('') // Reset selection
      } else {
        // Generate new plan with AI
        console.log('🔷 Generating new meal plan with AI...')
        console.log('🔷 Quick options:', quickOptions)
        const response = await fetch('/api/meal-plans/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            weekStartDate: selectedWeek,
            weekProfileSchedules: weekProfileSchedules, // Send per-person schedules
            quickOptions: quickOptions // Send quick options for temporary overrides
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          alert(data.error || 'Failed to generate meal plan')
          setGenerating(false)
          return
        }

        console.log('🟢 Meal plan generated successfully')
        setGeneratedSummary(data.summary || '')
        setMealPlans([data.mealPlan, ...mealPlans])
      }

      // Reset schedule override after generating
      setShowScheduleOverride(false)
      resetToDefaultSchedules()
    } catch (error) {
      console.error('❌ Error generating meal plan:', error)
      alert('Failed to generate meal plan. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  // Meal type order for consistent display and sorting
  const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'afternoon-snack', 'dinner', 'dessert']
  const MEAL_TYPE_LABELS: Record<string, string> = {
    'breakfast': 'Breakfast',
    'lunch': 'Lunch',
    'afternoon-snack': 'Afternoon snack',
    'dinner': 'Dinner',
    'dessert': 'Dessert'
  }

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
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
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
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Copy From Previous Week (Optional)
              </label>
              <select
                value={copyFromPlanId}
                onChange={(e) => setCopyFromPlanId(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              >
                <option value="">Generate new plan with AI</option>
                {mealPlans.filter(p => p.status === 'Archived').map(plan => (
                  <option key={plan.id} value={plan.id}>
                    Week of {new Date(plan.weekStartDate).toLocaleDateString('en-GB')}
                  </option>
                ))}
              </select>
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
                  {copyFromPlanId ? 'Copying...' : 'Generating with AI...'}
                </span>
              ) : (
                copyFromPlanId ? 'Copy Plan' : 'Generate with AI'
              )}
            </button>
          </div>

          {generatedSummary && (
            <div className="mt-4 p-4 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-900"><strong>AI Summary:</strong> {generatedSummary}</p>
            </div>
          )}

          {/* Quick Options */}
          {!copyFromPlanId && (
            <div className="mt-6 border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-900">Quick Options</h4>
                <Link
                  href="/settings/meal-planning"
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Customize Settings →
                </Link>
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.prioritizeShopping}
                    onChange={(e) => setQuickOptions({ ...quickOptions, prioritizeShopping: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Prioritize shopping efficiency (minimize unique ingredients)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.useExpiring}
                    onChange={(e) => setQuickOptions({ ...quickOptions, useExpiring: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Use expiring inventory items
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.maximizeBatch}
                    onChange={(e) => setQuickOptions({ ...quickOptions, maximizeBatch: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    Maximize batch cooking opportunities
                  </span>
                </label>
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-gray-500">
            Claude AI will analyze your family profiles, recipes, and preferences to generate a personalized weekly meal plan.
          </p>

          {/* Schedule Override Toggle */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowScheduleOverride(!showScheduleOverride)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showScheduleOverride ? '▼ Hide' : '▶'} Customize meals for this week
            </button>
          </div>
        </div>

        {/* Per-Person Schedule Override Section */}
        {showScheduleOverride && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Customize Week Schedules</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Adjust individual schedules for this week. Servings will be calculated based on how many people need each meal.
                </p>
              </div>
              <button
                type="button"
                onClick={resetToDefaultSchedules}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Reset All to Defaults
              </button>
            </div>

            {/* Per-Person Schedules */}
            {weekProfileSchedules.map((personSchedule) => (
              <div key={personSchedule.profileId} className="border rounded-lg p-4">
                {/* Person Header with Include/Exclude Toggle */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={personSchedule.included}
                      onChange={() => toggleProfileInclusion(personSchedule.profileId)}
                      className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <h4 className="font-medium text-gray-900">{personSchedule.profileName}</h4>
                      <p className="text-xs text-gray-500">
                        {personSchedule.included ? '✓ Included in meal plan' : '✗ Excluded from meal plan'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Person's Meal Grid */}
                {personSchedule.included && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">
                            Meal
                          </th>
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <th key={day} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {[
                          { key: 'breakfast', label: 'Breakfast' },
                          { key: 'morning-snack', label: 'M. Snack' },
                          { key: 'lunch', label: 'Lunch' },
                          { key: 'afternoon-snack', label: 'A. Snack' },
                          { key: 'dinner', label: 'Dinner' },
                          { key: 'dessert', label: 'Dessert' },
                          { key: 'evening-snack', label: 'E. Snack' },
                        ].map(meal => (
                          <tr key={meal.key} className="hover:bg-gray-50">
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
                              {meal.label}
                            </td>
                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                              const isChecked = personSchedule.schedule[day as keyof MealSchedule]?.includes(meal.key) || false
                              return (
                                <td key={day} className="px-1 py-2 whitespace-nowrap text-center">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePersonMeal(personSchedule.profileId, day as keyof MealSchedule, meal.key)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}

            <p className="text-xs text-gray-400 italic">
              💡 Tip: These changes only apply to this week's meal plan. Profile defaults remain unchanged.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('Draft')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'Draft'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setFilterStatus('Finalized')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'Finalized'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Finalized
              </button>
              <button
                onClick={() => setFilterStatus('Archived')}
                className={`px-3 py-1 rounded text-sm ${
                  filterStatus === 'Archived'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Archived
              </button>
            </div>
          </div>
        </div>

        {/* Filtered meal plans list */}
        {(() => {
          const filteredPlans = filterStatus === 'all'
            ? mealPlans
            : mealPlans.filter(p => p.status === filterStatus)

          return filteredPlans.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                {filterStatus === 'all' ? 'No meal plans yet' : `No ${filterStatus.toLowerCase()} meal plans`}
              </h3>
              <p className="mt-1 text-gray-500">
                {filterStatus === 'all' ? 'Generate your first AI-powered meal plan' : `No meal plans with status: ${filterStatus}`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => router.push(`/meal-plans/${plan.id}`)}
                className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      Week of {new Date(plan.weekStartDate).toLocaleDateString('en-GB')}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      plan.status === 'Finalized'
                        ? 'bg-green-100 text-green-800'
                        : plan.status === 'Archived'
                        ? 'bg-gray-100 text-gray-800'
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

                      // Create a map of existing meals by meal type for quick lookup
                      const mealsByType = new Map<string, any>()
                      dayMeals.forEach(meal => {
                        const normalizedType = meal.mealType.toLowerCase().replace(/\s+/g, '-')
                        mealsByType.set(normalizedType, meal)
                      })

                      return (
                        <div key={day} className="border rounded-lg p-3 flex flex-col">
                          <h4 className="font-medium text-gray-900 text-sm mb-2">{day}</h4>
                          {dayMeals.length === 0 ? (
                            <p className="text-xs text-gray-400">No meals</p>
                          ) : (
                            <div className="grid grid-rows-5 gap-2 flex-1">
                              {/* Render meals in consistent chronological order with fixed heights */}
                              {MEAL_TYPE_ORDER.map((mealTypeKey) => {
                                const meal = mealsByType.get(mealTypeKey)
                                if (!meal) {
                                  // Empty slot for missing meal type - same height as meal rows
                                  return (
                                    <div key={`${day}-${mealTypeKey}`} className="text-xs py-2 border-b border-dashed border-gray-200 last:border-0 min-h-[60px] flex flex-col justify-center">
                                      <p className="font-medium text-gray-400">{MEAL_TYPE_LABELS[mealTypeKey]}</p>
                                      <p className="text-gray-300">-</p>
                                    </div>
                                  )
                                }
                                return (
                                  <div key={meal.id} className="text-xs py-2 border-b border-gray-200 last:border-0 min-h-[60px] flex flex-col justify-center">
                                    <p className="font-medium text-gray-700">{MEAL_TYPE_LABELS[mealTypeKey] || meal.mealType}</p>
                                    <div className="flex items-start gap-1">
                                      {meal.isLeftover && (
                                        <span className="text-sm flex-shrink-0" title="Batch cooked / Leftover">🍲</span>
                                      )}
                                      <p className="text-gray-600 break-words whitespace-normal">
                                        {meal.recipeName || 'No recipe'}
                                      </p>
                                    </div>
                                    {meal.servings && (
                                      <p className="text-gray-500">{meal.servings} servings</p>
                                    )}
                                  </div>
                                )
                              })}
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
          )
        })()}
      </div>
    </div>
  )
}
