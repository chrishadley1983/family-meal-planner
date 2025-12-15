'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { startOfWeek, format, addWeeks } from 'date-fns'
import { RecipeDetailsModal } from '@/components/RecipeDetailsModal'
import { MealPlanSettingsModal } from '@/components/MealPlanSettingsModal'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { getWeekDaysWithDates } from '@/lib/date-utils'
import { useAILoading } from '@/components/providers/AILoadingProvider'
import { useNotification } from '@/components/providers/NotificationProvider'

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
  const { data: session } = useSession()
  const { startLoading, stopLoading } = useAILoading()
  const { error, warning } = useNotification()
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
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null)
  const [showScheduleOverride, setShowScheduleOverride] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
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
      warning('Please select a week')
      return
    }

    setGenerating(true)
    setGeneratedSummary('')

    // Show AI loading popup with context-specific message
    const loadingMessage = copyFromPlanId
      ? 'Copying your meal plan...'
      : 'Generating your weekly meal plan...'
    startLoading(loadingMessage)

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
          error(data.error || 'Failed to copy meal plan')
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
          error(data.error || 'Failed to generate meal plan')
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
    } catch (err) {
      console.error('❌ Error generating meal plan:', err)
      error('Failed to generate meal plan. Please try again.')
    } finally {
      setGenerating(false)
      stopLoading()
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
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading meal plans...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer
        title="Meal Plans"
        description="Generate AI-powered weekly meal plans"
      >

        <div className="card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-white">Generate New Meal Plan</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowScheduleOverride(true)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 text-zinc-400 rounded-lg text-sm hover:bg-zinc-600 hover:text-zinc-300 transition-colors"
              >
                📅 Customize Meal Slots
              </button>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-zinc-700 text-zinc-400 rounded-lg text-sm hover:bg-zinc-600 hover:text-zinc-300 transition-colors"
              >
                ⚙️ Settings
              </button>
            </div>
          </div>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Week Starting
              </label>
              <Input
                type="date"
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Copy From Previous Week (Optional)
              </label>
              <Select
                value={copyFromPlanId}
                onChange={(e) => setCopyFromPlanId(e.target.value)}
              >
                <option value="">Generate new plan with AI</option>
                {mealPlans.filter(p => p.status === 'Archived').map(plan => (
                  <option key={plan.id} value={plan.id}>
                    Week of {new Date(plan.weekStartDate).toLocaleDateString('en-GB')}
                  </option>
                ))}
              </Select>
            </div>
            <button
              onClick={handleGeneratePlan}
              disabled={generating}
              className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-orange-600 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  {copyFromPlanId ? 'Copying...' : 'Generating...'}
                </span>
              ) : (
                copyFromPlanId ? 'Copy Plan' : 'Generate with AI'
              )}
            </button>
          </div>

          {generatedSummary && (
            <div className="mt-4 p-4 bg-blue-900/20 rounded-md border border-blue-800/30">
              <p className="text-sm text-zinc-300"><strong className="text-white">AI Summary:</strong> {generatedSummary}</p>
            </div>
          )}

          {/* Quick Options */}
          {!copyFromPlanId && (
            <div className="mt-6 border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-medium text-white mb-3">Quick Options</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.prioritizeShopping}
                    onChange={(e) => setQuickOptions({ ...quickOptions, prioritizeShopping: e.target.checked })}
                    className="rounded border-zinc-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-zinc-300">
                    Prioritize shopping efficiency (minimize unique ingredients)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.useExpiring}
                    onChange={(e) => setQuickOptions({ ...quickOptions, useExpiring: e.target.checked })}
                    className="rounded border-zinc-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-zinc-300">
                    Use expiring inventory items
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickOptions.maximizeBatch}
                    onChange={(e) => setQuickOptions({ ...quickOptions, maximizeBatch: e.target.checked })}
                    className="rounded border-zinc-600 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-zinc-300">
                    Maximize batch cooking opportunities
                  </span>
                </label>
              </div>
            </div>
          )}

          <p className="mt-4 text-sm text-zinc-400">
            Claude AI will analyze your family profiles, recipes, and preferences to generate a personalized weekly meal plan.
          </p>
        </div>

        {/* Customize Week Schedule Modal */}
        <Modal
          isOpen={showScheduleOverride}
          onClose={() => setShowScheduleOverride(false)}
          title="Customize Week Schedules"
          maxWidth="4xl"
        >
          <div className="p-5">
            <p className="text-sm text-zinc-400 mb-4">
              Adjust individual schedules for this week. Servings will be calculated based on how many people need each meal.
            </p>

            {/* Per-Person Schedules */}
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {weekProfileSchedules.map((personSchedule) => (
                <div key={personSchedule.profileId} className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/30">
                  {/* Person Header with Include/Exclude Toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={personSchedule.included}
                        onChange={() => toggleProfileInclusion(personSchedule.profileId)}
                        className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                      />
                      <div>
                        <h4 className="font-medium text-white">{personSchedule.profileName}</h4>
                        <p className="text-xs text-zinc-400">
                          {personSchedule.included ? '✓ Included in meal plan' : '✗ Excluded from meal plan'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Person's Meal Grid */}
                  {personSchedule.included && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-zinc-700 text-sm">
                        <thead className="bg-zinc-800">
                          <tr>
                            <th className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase w-28">
                              Meal
                            </th>
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                              <th key={day} className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase">
                                {day}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-zinc-900/50 divide-y divide-zinc-700">
                          {[
                            { key: 'breakfast', label: 'Breakfast' },
                            { key: 'morning-snack', label: 'M. Snack' },
                            { key: 'lunch', label: 'Lunch' },
                            { key: 'afternoon-snack', label: 'A. Snack' },
                            { key: 'dinner', label: 'Dinner' },
                            { key: 'dessert', label: 'Dessert' },
                            { key: 'evening-snack', label: 'E. Snack' },
                          ].map(meal => (
                            <tr key={meal.key} className="hover:bg-zinc-800/50">
                              <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-zinc-300">
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
                                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded cursor-pointer"
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
            </div>

            {/* Footer with Actions */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-zinc-700">
              <Button
                type="button"
                onClick={resetToDefaultSchedules}
                variant="secondary"
              >
                Reset All to Defaults
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    resetToDefaultSchedules()
                    setShowScheduleOverride(false)
                  }}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowScheduleOverride(false)}
                  variant="primary"
                >
                  Save Schedule
                </Button>
              </div>
            </div>
          </div>
        </Modal>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-zinc-300">Filter:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus('Draft')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filterStatus === 'Draft'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setFilterStatus('Finalized')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filterStatus === 'Finalized'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                }`}
              >
                Finalized
              </button>
              <button
                onClick={() => setFilterStatus('Archived')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  filterStatus === 'Archived'
                    ? 'bg-purple-600 text-white'
                    : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
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
            <div className="card p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-white">
                {filterStatus === 'all' ? 'No meal plans yet' : `No ${filterStatus.toLowerCase()} meal plans`}
              </h3>
              <p className="mt-1 text-zinc-400">
                {filterStatus === 'all' ? 'Generate your first AI-powered meal plan' : `No meal plans with status: ${filterStatus}`}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredPlans.map((plan) => {
                // Create lookup maps for all days
                const weekDays = getWeekDaysWithDates(plan.weekStartDate)
                const mealsByDayAndType = new Map<string, Map<string, any>>()

                weekDays.forEach(({ day }) => {
                  const dayMeals = plan.meals.filter(m => m.dayOfWeek === day)
                  const mealsByType = new Map<string, any>()
                  dayMeals.forEach(meal => {
                    const normalizedType = meal.mealType.toLowerCase().replace(/\s+/g, '-')
                    mealsByType.set(normalizedType, meal)
                  })
                  mealsByDayAndType.set(day, mealsByType)
                })

                return (
                  <div
                    key={plan.id}
                    onClick={() => router.push(`/meal-plans/${plan.id}`)}
                    className="card-interactive overflow-hidden"
                  >
                    <div className="bg-zinc-800/50 px-6 py-4 border-b border-zinc-700">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium text-white">
                          Week of {new Date(plan.weekStartDate).toLocaleDateString('en-GB')}
                        </h3>
                        <Badge
                          variant={plan.status === 'Finalized' ? 'success' : plan.status === 'Archived' ? 'default' : 'warning'}
                          size="sm"
                        >
                          {plan.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Week Grid - Table Structure with Fixed Rows */}
                      <div className="bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden">
                        <table className="w-full text-xs border-collapse">
                          {/* Day Headers */}
                          <thead>
                            <tr className="border-b border-zinc-700">
                              {weekDays.map(({ day, shortDate }, idx) => (
                                <th
                                  key={day}
                                  className={`py-3 px-2 text-center ${idx < weekDays.length - 1 ? 'border-r border-zinc-700' : ''}`}
                                  style={{ width: '14.28%' }}
                                >
                                  <div className="font-semibold text-white">{day}</div>
                                  <div className="font-normal text-zinc-500 text-[10px]">{shortDate}</div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* Render each meal type as a row */}
                            {MEAL_TYPE_ORDER.map((mealTypeKey) => (
                              <React.Fragment key={mealTypeKey}>
                                {/* Meal Type Header Row */}
                                <tr className="border-b border-zinc-700" style={{ background: 'rgba(139, 92, 246, 0.05)' }}>
                                  <td
                                    colSpan={7}
                                    className="py-2 px-3 text-[10px] uppercase tracking-wider font-semibold text-zinc-500"
                                  >
                                    {MEAL_TYPE_LABELS[mealTypeKey]}
                                  </td>
                                </tr>
                                {/* Meal Content Row */}
                                <tr className="border-b border-zinc-700 last:border-b-0">
                                  {weekDays.map(({ day }, idx) => {
                                    const mealsByType = mealsByDayAndType.get(day)
                                    const meal = mealsByType?.get(mealTypeKey)

                                    return (
                                      <td
                                        key={`${day}-${mealTypeKey}`}
                                        className={`py-2 px-2 align-top ${idx < weekDays.length - 1 ? 'border-r border-zinc-700' : ''}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (meal?.recipe?.id) {
                                            setSelectedRecipeId(meal.recipe.id)
                                          }
                                        }}
                                      >
                                        {meal ? (
                                          <div className="cursor-pointer hover:bg-zinc-800/50 rounded p-1 -m-1 transition-colors">
                                            <div className="flex items-start gap-1">
                                              <span className="font-medium text-purple-400 break-words leading-tight">
                                                {meal.recipeName || 'No recipe'}
                                              </span>
                                              {/* Batch cook indicator */}
                                              {!meal.isLeftover && meal.notes?.toLowerCase().includes('batch') && (
                                                <span className="text-amber-500 flex-shrink-0" title="Batch cook">⚡</span>
                                              )}
                                              {/* Reheat/leftover indicator */}
                                              {meal.isLeftover && (
                                                <span className="text-emerald-500 flex-shrink-0" title="Reheat (from batch)">🔄</span>
                                              )}
                                            </div>
                                            {meal.servings && (
                                              <div className="text-zinc-500 mt-0.5">{meal.servings} servings</div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="text-zinc-600 italic">-</div>
                                        )}
                                      </td>
                                    )
                                  })}
                                </tr>
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Legend */}
                      <div className="flex gap-4 mt-2 text-xs text-zinc-500">
                        <span><span className="text-amber-500">⚡</span> Batch cook</span>
                        <span><span className="text-emerald-500">🔄</span> Reheat (from batch)</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}

        {/* Recipe Details Modal */}
        <RecipeDetailsModal
          isOpen={selectedRecipeId !== null}
          onClose={() => setSelectedRecipeId(null)}
          recipeId={selectedRecipeId}
        />

        {/* Settings Modal */}
        <MealPlanSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      </PageContainer>
    </AppLayout>
  )
}
