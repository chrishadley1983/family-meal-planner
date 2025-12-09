'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
<<<<<<< HEAD
import { formatDate, formatDateRange, getWeekDaysWithDates } from '@/lib/date-utils'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'
=======
import { formatDate, formatDateRange } from '@/lib/date-utils'
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
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
<<<<<<< HEAD
  isLeftover?: boolean
  leftoverFromMealId?: string | null
  notes?: string | null
=======
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
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
  mealAvailability?: any
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

interface MealSchedule {
  monday: string[]
  tuesday: string[]
  wednesday: string[]
  thursday: string[]
  friday: string[]
  saturday: string[]
  sunday: string[]
}

interface WeekProfileSchedule {
  profileId: string
  profileName: string
  included: boolean
  schedule: MealSchedule
}

<<<<<<< HEAD
=======
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'morning-snack', label: 'Morning Snack' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'afternoon-snack', label: 'Afternoon Snack' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'dessert', label: 'Dessert' },
  { key: 'evening-snack', label: 'Evening Snack' }
]

<<<<<<< HEAD
// Meal type order for consistent display and sorting
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'afternoon-snack', 'dinner', 'dessert']

=======
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
function SortableMealCard({ meal, recipes, onUpdate, onDelete, onToggleLock, disabled }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: meal.id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const filteredRecipes = recipes.filter((r: Recipe) =>
    r.mealType.some((mt: string) =>
      mt.toLowerCase().replace(/\s+/g, '-') === meal.mealType.toLowerCase()
    )
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
<<<<<<< HEAD
      className="border border-zinc-700 rounded p-3 bg-zinc-900/50"
=======
      className="border rounded p-3 bg-white"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              disabled={disabled}
<<<<<<< HEAD
              className="cursor-move text-zinc-500 hover:text-zinc-400 disabled:cursor-not-allowed flex-shrink-0"
=======
              className="cursor-move text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
<<<<<<< HEAD
            <span className="font-medium text-sm text-zinc-300">
=======
            <span className="font-medium text-sm text-gray-700">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
              {MEAL_TYPES.find(mt => mt.key === meal.mealType.toLowerCase())?.label || meal.mealType}
            </span>
          </div>

<<<<<<< HEAD
          {/* Recipe Name Display with Batch Cooking Indicator */}
          {meal.recipeName && (
            <div className="mt-2">
              <div className="flex items-start gap-2">
                {meal.isLeftover && (
                  <span className="text-base flex-shrink-0" title="Batch cooked / Leftover">
                    🍲
                  </span>
                )}
                <div className="text-xs text-white font-medium break-words whitespace-normal leading-relaxed">
                  {meal.recipeName}
                </div>
              </div>
              {meal.isLeftover && (
                <div className="mt-1 text-xs text-purple-400 italic">
                  ↪ Leftover from batch cooking
                </div>
              )}
            </div>
          )}

          {/* Recipe Selector */}
          <Select
=======
          {/* Recipe Selector */}
          <select
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
            value={meal.recipeId || ''}
            onChange={(e) => {
              const recipeId = e.target.value || null
              const recipe = recipes.find((r: Recipe) => r.id === recipeId)
              onUpdate(meal.id, {
                recipeId,
                recipeName: recipe?.recipeName || null
              })
            }}
            disabled={disabled}
<<<<<<< HEAD
            className="mt-1 text-xs"
=======
            className="mt-2 block w-full text-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          >
            <option value="">No meal</option>
            {filteredRecipes.map((recipe: Recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.recipeName}
              </option>
            ))}
<<<<<<< HEAD
          </Select>

          {meal.servings && (
            <div className="text-xs text-zinc-400 mt-1">{meal.servings} servings</div>
          )}

          {/* Batch Cooking Notes */}
          {meal.notes && (
            <div className="mt-2 p-2 bg-blue-900/20 rounded text-xs text-zinc-300 border border-blue-800/30">
              <div className="font-medium text-blue-400 mb-1">📝 Note:</div>
              {meal.notes}
            </div>
=======
          </select>

          {meal.servings && (
            <div className="text-xs text-gray-500 mt-1">{meal.servings} servings</div>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          )}
        </div>

        <div className="flex gap-1 ml-2">
          <button
            onClick={() => onToggleLock(meal.id, !meal.isLocked)}
            disabled={disabled}
<<<<<<< HEAD
            className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
=======
            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
            title={meal.isLocked ? 'Unlock meal' : 'Lock meal'}
          >
            {meal.isLocked ? '🔒' : '🔓'}
          </button>
          <button
            onClick={() => onDelete(meal.id)}
            disabled={disabled}
<<<<<<< HEAD
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
=======
            className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default function MealPlanDetailPage() {
  const params = useParams()
  const router = useRouter()
<<<<<<< HEAD
  const { data: session } = useSession()
=======
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
  const mealPlanId = params.id as string

  const [mealPlan, setMealPlan] = useState<MealPlan | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showEditSchedule, setShowEditSchedule] = useState(false)
  const [weekProfileSchedules, setWeekProfileSchedules] = useState<WeekProfileSchedule[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
<<<<<<< HEAD
  const [currentDayIndex, setCurrentDayIndex] = useState(0) // 0 = first day, 6 = last day
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Calculate day order and dates based on actual week start date
  const weekDaysWithDates = mealPlan
    ? getWeekDaysWithDates(mealPlan.weekStartDate)
    : []

  const DAYS_OF_WEEK = weekDaysWithDates.map(d => d.day)
=======
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor)
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

      // Initialize week schedules from customSchedule
      if (data.mealPlan.customSchedule) {
        setWeekProfileSchedules(data.mealPlan.customSchedule)
      }
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
      if (meal.recipe) {
        totalCalories += meal.recipe.caloriesPerServing || 0
        totalProtein += meal.recipe.proteinPerServing || 0
        totalCarbs += meal.recipe.carbsPerServing || 0
        totalFat += meal.recipe.fatPerServing || 0
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

  const handleMealUpdate = async (mealId: string, updates: any) => {
    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update meal')
      const data = await response.json()

      // Update local state
      setMealPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          meals: prev.meals.map(m => m.id === mealId ? data.meal : m)
        }
      })
    } catch (error) {
      console.error('Error updating meal:', error)
      alert('Failed to update meal')
    }
  }

  const handleMealDelete = async (mealId: string) => {
    if (!confirm('Delete this meal?')) return

    try {
      const response = await fetch(`/api/meals/${mealId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete meal')

      // Update local state
      setMealPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          meals: prev.meals.filter(m => m.id !== mealId)
        }
      })
    } catch (error) {
      console.error('Error deleting meal:', error)
      alert('Failed to delete meal')
    }
  }

  const handleToggleLock = async (mealId: string, isLocked: boolean) => {
    await handleMealUpdate(mealId, { isLocked })
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over || active.id === over.id || !mealPlan) return

    const oldIndex = mealPlan.meals.findIndex(m => m.id === active.id)
    const newIndex = mealPlan.meals.findIndex(m => m.id === over.id)

    const newMeals = arrayMove(mealPlan.meals, oldIndex, newIndex)
    setMealPlan({ ...mealPlan, meals: newMeals })

    // TODO: Persist order to backend if needed
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

  const handleRegenerateWithAI = async () => {
    if (!confirm('Regenerate this meal plan with AI? Locked meals will be preserved.')) {
      return
    }

    setRegenerating(true)
    try {
      console.log('🔷 Regenerating meal plan with AI...')
      const response = await fetch(`/api/meal-plans/${mealPlanId}/regenerate`, {
        method: 'POST'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to regenerate')
      }

      const data = await response.json()
      console.log('🟢 Meal plan regenerated successfully')

      setMealPlan(data.mealPlan)
      alert(`Meal plan regenerated successfully!\n\n${data.summary || 'New meals generated.'}`)
    } catch (error: any) {
      console.error('❌ Error regenerating:', error)
      alert(error.message || 'Failed to regenerate meal plan')
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveSchedule = async () => {
    if (!mealPlan) return

    setSaving(true)
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: mealPlan.status,
          customSchedule: weekProfileSchedules
        })
      })

      if (!response.ok) throw new Error('Failed to save schedule')
      setShowEditSchedule(false)
      fetchMealPlan()
    } catch (error) {
      console.error('Error saving schedule:', error)
      alert('Failed to save schedule')
    } finally {
      setSaving(false)
    }
  }

  const toggleProfileInclusion = (profileId: string) => {
    setWeekProfileSchedules(schedules =>
      schedules.map(s =>
        s.profileId === profileId ? { ...s, included: !s.included } : s
      )
    )
  }

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

<<<<<<< HEAD
  // Day navigation handlers
  const goToPreviousDay = () => {
    setCurrentDayIndex(prev => (prev === 0 ? 6 : prev - 1))
  }

  const goToNextDay = () => {
    setCurrentDayIndex(prev => (prev === 6 ? 0 : prev + 1))
  }

  // Swipe gesture handlers
  const minSwipeDistance = 50

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return

    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      goToNextDay()
    } else if (isRightSwipe) {
      goToPreviousDay()
    }
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPreviousDay()
      } else if (e.key === 'ArrowRight') {
        goToNextDay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading meal plan...</p>
          </div>
        </PageContainer>
      </AppLayout>
=======
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading meal plan...</p>
      </div>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
    )
  }

  if (!mealPlan) {
    return (
<<<<<<< HEAD
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Meal plan not found</p>
          </div>
        </PageContainer>
      </AppLayout>
=======
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Meal plan not found</p>
      </div>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
    )
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)
  const isEditable = mealPlan.status === 'Draft'

  return (
<<<<<<< HEAD
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/meal-plans" className="text-purple-400 hover:text-purple-300 mb-2 inline-block">
=======
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <Link href="/meal-plans" className="text-blue-600 hover:text-blue-800 mb-2 inline-block">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
            ← Back to Meal Plans
          </Link>
          <div className="flex justify-between items-start">
            <div>
<<<<<<< HEAD
              <h1 className="text-3xl font-bold text-white">
                {formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate)}
              </h1>
              <p className="text-zinc-400 mt-1">View and edit your meal plan</p>
            </div>
            <div className="flex gap-2">
              <Badge
                variant={
                  mealPlan.status === 'Finalized' ? 'success' :
                  mealPlan.status === 'Archived' ? 'default' :
                  'warning'
                }
                size="sm"
              >
                {mealPlan.status}
              </Badge>
=======
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
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
            </div>
          </div>
        </div>

        {/* Action Buttons */}
<<<<<<< HEAD
        <div className="card p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {mealPlan.status === 'Draft' && (
              <>
                <Button
                  onClick={() => handleStatusChange('Finalized')}
                  disabled={saving}
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Finalize Plan
                </Button>
                <Button
                  onClick={handleRegenerateWithAI}
                  disabled={regenerating}
                  variant="primary"
                  isLoading={regenerating}
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate with AI'}
                </Button>
=======
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-3">
            {mealPlan.status === 'Draft' && (
              <>
                <button
                  onClick={() => handleStatusChange('Finalized')}
                  disabled={saving}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  Finalize Plan
                </button>
                <button
                  onClick={handleRegenerateWithAI}
                  disabled={regenerating}
                  className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate with AI'}
                </button>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
              </>
            )}
            {mealPlan.status === 'Finalized' && (
              <>
<<<<<<< HEAD
                <Button
                  onClick={() => handleStatusChange('Draft')}
                  disabled={saving}
                  variant="secondary"
                >
                  Reopen for Editing
                </Button>
                <Button
                  onClick={() => handleStatusChange('Archived')}
                  disabled={saving}
                  variant="ghost"
                >
                  Archive Plan
                </Button>
              </>
            )}
            {mealPlan.status === 'Archived' && (
              <Button
                onClick={() => handleStatusChange('Draft')}
                disabled={saving}
                variant="secondary"
              >
                Reopen for Editing
              </Button>
            )}
            <Button
              onClick={() => setShowEditSchedule(true)}
              variant="secondary"
            >
              Edit Schedule
            </Button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              variant="danger"
            >
              Delete Plan
            </Button>
=======
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
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
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          </div>
        </div>

        {/* User Selector for Macro View */}
<<<<<<< HEAD
        <div className="card p-4 mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            View Macros For:
          </label>
          <Select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="max-w-xs"
=======
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            View Macros For:
          </label>
          <select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          >
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.profileName} {profile.isMainUser ? '(Main User)' : ''}
              </option>
            ))}
<<<<<<< HEAD
          </Select>
        </div>

        {/* Day Navigation Controls */}
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousDay}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors"
              aria-label="Previous day"
            >
              <span className="text-xl">←</span>
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-bold text-white">
                {weekDaysWithDates[currentDayIndex]?.day || 'Loading...'}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {weekDaysWithDates[currentDayIndex]?.shortDate || ''} • Day {currentDayIndex + 1} of 7
              </p>
            </div>

            <button
              onClick={goToNextDay}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg border border-zinc-700 transition-colors"
              aria-label="Next day"
            >
              <span className="hidden sm:inline">Next</span>
              <span className="text-xl">→</span>
            </button>
          </div>

          <div className="mt-3 text-xs text-center text-zinc-500">
            Swipe left/right or use arrow keys to navigate
          </div>
        </div>

        {/* Single Day View with Swipe Support */}
=======
          </select>
        </div>

        {/* Weekly Meal Grid with Drag and Drop */}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
<<<<<<< HEAD
          <div
            className="touch-pan-y"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {(() => {
              const day = DAYS_OF_WEEK[currentDayIndex]
              const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
              const dailyMacros = calculateDailyMacros(day)

              // Create a map of existing meals by meal type for quick lookup
              const mealsByType = new Map<string, Meal>()
              dayMeals.forEach(meal => {
                const normalizedType = meal.mealType.toLowerCase().replace(/\s+/g, '-')
                mealsByType.set(normalizedType, meal)
              })

              // Create ordered array with meals in consistent positions
              const orderedMeals = MEAL_TYPE_ORDER.map(mealTypeKey => {
                const existingMeal = mealsByType.get(mealTypeKey)
                return existingMeal || null
              }).filter(meal => meal !== null) as Meal[]

              return (
                <div className="card p-6">
                  {/* Daily Macro Summary */}
                  {selectedProfile && (
                    <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg space-y-3">
                      <div className="font-medium text-zinc-300 text-lg">Daily Macros</div>
=======
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
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)

                      {/* Calories */}
                      {selectedProfile.dailyCalorieTarget && (
                        <div>
<<<<<<< HEAD
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Calories</span>
                            <span className="font-medium">{dailyMacros.calories} / {selectedProfile.dailyCalorieTarget}</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}`}
=======
                          <div className="flex justify-between mb-1">
                            <span>Calories</span>
                            <span>{dailyMacros.calories} / {selectedProfile.dailyCalorieTarget}</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}`}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                              style={{ width: `${getMacroPercentage(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Protein */}
                      {selectedProfile.dailyProteinTarget && (
                        <div>
<<<<<<< HEAD
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Protein</span>
                            <span className="font-medium">{dailyMacros.protein}g / {selectedProfile.dailyProteinTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.protein, selectedProfile.dailyProteinTarget)}`}
=======
                          <div className="flex justify-between mb-1">
                            <span>Protein</span>
                            <span>{dailyMacros.protein}g / {selectedProfile.dailyProteinTarget}g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.protein, selectedProfile.dailyProteinTarget)}`}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                              style={{ width: `${getMacroPercentage(dailyMacros.protein, selectedProfile.dailyProteinTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Carbs */}
                      {selectedProfile.dailyCarbsTarget && (
                        <div>
<<<<<<< HEAD
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Carbs</span>
                            <span className="font-medium">{dailyMacros.carbs}g / {selectedProfile.dailyCarbsTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}`}
=======
                          <div className="flex justify-between mb-1">
                            <span>Carbs</span>
                            <span>{dailyMacros.carbs}g / {selectedProfile.dailyCarbsTarget}g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}`}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                              style={{ width: `${getMacroPercentage(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Fat */}
                      {selectedProfile.dailyFatTarget && (
                        <div>
<<<<<<< HEAD
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Fat</span>
                            <span className="font-medium">{dailyMacros.fat}g / {selectedProfile.dailyFatTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.fat, selectedProfile.dailyFatTarget)}`}
=======
                          <div className="flex justify-between mb-1">
                            <span>Fat</span>
                            <span>{dailyMacros.fat}g / {selectedProfile.dailyFatTarget}g</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getMacroProgressColor(dailyMacros.fat, selectedProfile.dailyFatTarget)}`}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                              style={{ width: `${getMacroPercentage(dailyMacros.fat, selectedProfile.dailyFatTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meals for the Day */}
<<<<<<< HEAD
                  <div className="mb-4">
                    <h3 className="text-lg font-medium text-zinc-300 mb-4">Meals</h3>
                  </div>

                  <SortableContext items={orderedMeals.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-4">
                      {orderedMeals.length === 0 ? (
                        <p className="text-center text-zinc-400 py-8">No meals planned for this day</p>
                      ) : (
                        // Render all meal types in consistent order
                        MEAL_TYPE_ORDER.map((mealTypeKey) => {
                          const meal = mealsByType.get(mealTypeKey)
                          if (!meal) {
                            // Empty slot for missing meal type
                            return (
                              <div key={`${day}-${mealTypeKey}`} className="py-4 px-4 border border-dashed border-zinc-700 rounded-lg bg-zinc-900/30 flex items-center justify-center">
                                <span className="text-sm text-zinc-500 italic">
                                  {MEAL_TYPES.find(mt => mt.key === mealTypeKey)?.label || ''} not scheduled
                                </span>
                              </div>
                            )
                          }
                          return (
                            <SortableMealCard
                              key={meal.id}
                              meal={meal}
                              recipes={recipes}
                              onUpdate={handleMealUpdate}
                              onDelete={handleMealDelete}
                              onToggleLock={handleToggleLock}
                              disabled={!isEditable}
                            />
                          )
                        })
=======
                  <SortableContext items={dayMeals.map(m => m.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {dayMeals.length === 0 ? (
                        <p className="text-sm text-gray-400">No meals planned</p>
                      ) : (
                        dayMeals.map((meal) => (
                          <SortableMealCard
                            key={meal.id}
                            meal={meal}
                            recipes={recipes}
                            onUpdate={handleMealUpdate}
                            onDelete={handleMealDelete}
                            onToggleLock={handleToggleLock}
                            disabled={!isEditable}
                          />
                        ))
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                      )}
                    </div>
                  </SortableContext>
                </div>
              )
<<<<<<< HEAD
            })()}
=======
            })}
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
          </div>
        </DndContext>

        {/* Edit Schedule Modal */}
        {showEditSchedule && (
<<<<<<< HEAD
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Edit Week Schedule</h2>
                <button
                  onClick={() => setShowEditSchedule(false)}
                  className="text-zinc-400 hover:text-zinc-300 text-2xl"
=======
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Edit Week Schedule</h2>
                <button
                  onClick={() => setShowEditSchedule(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                >
                  ×
                </button>
              </div>

<<<<<<< HEAD
              <p className="text-sm text-zinc-400 mb-4">
=======
              <p className="text-sm text-gray-600 mb-4">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                Adjust schedules for this specific week. This won't affect profile defaults.
              </p>

              {/* Per-Person Schedules */}
              <div className="space-y-6">
                {weekProfileSchedules.map((personSchedule) => (
<<<<<<< HEAD
                  <div key={personSchedule.profileId} className="border border-zinc-700 rounded-lg p-4">
=======
                  <div key={personSchedule.profileId} className="border rounded-lg p-4">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={personSchedule.included}
                          onChange={() => toggleProfileInclusion(personSchedule.profileId)}
<<<<<<< HEAD
                          className="h-5 w-5 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded"
                        />
                        <div>
                          <h4 className="font-medium text-white">{personSchedule.profileName}</h4>
                          <p className="text-xs text-zinc-400">
=======
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{personSchedule.profileName}</h4>
                          <p className="text-xs text-gray-500">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                            {personSchedule.included ? '✓ Included in meal plan' : '✗ Excluded from meal plan'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {personSchedule.included && (
                      <div className="overflow-x-auto">
<<<<<<< HEAD
                        <table className="min-w-full divide-y divide-zinc-700 text-sm">
                          <thead className="bg-zinc-800">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-medium text-zinc-400 uppercase w-28">
                                Meal
                              </th>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <th key={day} className="px-1 py-2 text-center text-xs font-medium text-zinc-400 uppercase">
=======
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">
                                Meal
                              </th>
                              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <th key={day} className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
                                  {day}
                                </th>
                              ))}
                            </tr>
                          </thead>
<<<<<<< HEAD
                          <tbody className="bg-zinc-900/50 divide-y divide-zinc-700">
                            {MEAL_TYPES.map(meal => (
                              <tr key={meal.key} className="hover:bg-zinc-800/50">
                                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-zinc-300">
=======
                          <tbody className="bg-white divide-y divide-gray-200">
                            {MEAL_TYPES.map(meal => (
                              <tr key={meal.key} className="hover:bg-gray-50">
                                <td className="px-2 py-2 whitespace-nowrap text-xs font-medium text-gray-700">
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
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
<<<<<<< HEAD
                                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded cursor-pointer"
=======
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
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

              <div className="flex justify-end gap-3 mt-6">
<<<<<<< HEAD
                <Button
                  onClick={() => setShowEditSchedule(false)}
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  variant="primary"
                  isLoading={saving}
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
=======
                <button
                  onClick={() => setShowEditSchedule(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSchedule}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Schedule'}
                </button>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
              </div>
            </div>
          </div>
        )}
<<<<<<< HEAD
      </PageContainer>
    </AppLayout>
=======
      </div>
    </div>
>>>>>>> 8ad9c4e (chore: Add remaining files from previous session)
  )
}
