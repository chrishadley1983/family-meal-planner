'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { formatDate, formatDateRange } from '@/lib/date-utils'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Select, Modal } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useAILoading } from '@/components/providers/AILoadingProvider'
import { useNotification } from '@/components/providers/NotificationProvider'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Recipe {
  id: string
  recipeName: string
  mealType: string[]
  caloriesPerServing?: number | null
  proteinPerServing?: number | null
  carbsPerServing?: number | null
  fatPerServing?: number | null
  prepTimeMinutes?: number | null
  cookTimeMinutes?: number | null
}

interface Meal {
  id: string
  dayOfWeek: string
  mealType: string
  recipeId?: string | null
  recipeName?: string | null
  servings?: number | null
  isLocked: boolean
  isLeftover?: boolean
  leftoverFromMealId?: string | null
  notes?: string | null
  recipe?: Recipe | null
  isCooked?: boolean
  cookedAt?: string | null
  inventoryDeducted?: boolean
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

// Cooking deduction preview interfaces
interface DeductionPreviewItem {
  ingredientName: string
  recipeQuantity: number
  recipeUnit: string
  inventoryQuantity: number
  inventoryUnit: string
  quantityAfter: number
  status: 'full' | 'partial' | 'not_found'
  isSmallQuantity?: boolean
  inventoryItemId?: string | null
}

interface CookingPreview {
  mealId: string
  recipeName: string
  scalingFactor: number
  hasRecipe: boolean
  hasIngredients: boolean
  preview?: {
    items: DeductionPreviewItem[]
    summary: {
      canFullyDeduct: number
      canPartiallyDeduct: number
      notInInventory: number
    }
  }
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'morning-snack', label: 'Morning Snack' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'afternoon-snack', label: 'Afternoon Snack' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'dessert', label: 'Dessert' },
  { key: 'evening-snack', label: 'Evening Snack' }
]

// Meal type order for consistent display and sorting
const MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'afternoon-snack', 'dinner', 'dessert']

function SortableMealCard({ meal, recipes, onUpdate, onDelete, onToggleLock, onMarkCooked, disabled, isFinalizedPlan }: any) {
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
      className="border border-zinc-700 rounded p-3 bg-zinc-900/50"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <button
              {...attributes}
              {...listeners}
              disabled={disabled}
              className="cursor-move text-zinc-500 hover:text-zinc-400 disabled:cursor-not-allowed flex-shrink-0"
              title="Drag to reorder"
            >
              ⋮⋮
            </button>
            <span className={`font-medium text-sm ${meal.isCooked ? 'text-green-400' : 'text-zinc-300'}`}>
              {MEAL_TYPES.find(mt => mt.key === meal.mealType.toLowerCase())?.label || meal.mealType}
            </span>
            {/* Batch Cook Badge */}
            {!meal.isLeftover && meal.notes?.toLowerCase().includes('batch') && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                ⚡ BATCH
              </span>
            )}
            {/* Reheat Badge */}
            {meal.isLeftover && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-medium">
                🔄 REHEAT
              </span>
            )}
            {meal.isCooked && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/50 text-green-400">
                Cooked
              </span>
            )}
          </div>

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
            className="mt-1 text-xs"
          >
            <option value="">No meal</option>
            {filteredRecipes.map((recipe: Recipe) => (
              <option key={recipe.id} value={recipe.id}>
                {recipe.recipeName}
              </option>
            ))}
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
          )}
        </div>

        <div className="flex gap-1 ml-2">
          {/* Mark as Cooked button - only show for finalized plans with recipes */}
          {isFinalizedPlan && meal.recipeId && !meal.isCooked && (
            <button
              onClick={() => onMarkCooked(meal.id)}
              className="text-xs text-teal-400 hover:text-teal-300"
              title="Mark as cooked and deduct from inventory"
            >
              🍳
            </button>
          )}
          {isFinalizedPlan && meal.isCooked && (
            <button
              onClick={() => onMarkCooked(meal.id, true)}
              className="text-xs text-green-400 hover:text-green-300"
              title="Unmark as cooked"
            >
              ✓
            </button>
          )}
          <button
            onClick={() => onToggleLock(meal.id, !meal.isLocked)}
            disabled={disabled}
            className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-50"
            title={meal.isLocked ? 'Locked - will be preserved when regenerating' : 'Unlocked - will be replaced when regenerating. Click to lock.'}
          >
            {meal.isLocked ? '🔒' : '🔓'}
          </button>
          <button
            onClick={() => onDelete(meal.id)}
            disabled={disabled}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
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
  const { data: session } = useSession()
  const { startLoading, stopLoading } = useAILoading()
  const { success, error, info, confirm } = useNotification()
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
  const [currentDayIndex, setCurrentDayIndex] = useState(0) // Will be set based on weekStartDate
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Cooking modal state
  const [showCookingModal, setShowCookingModal] = useState(false)
  const [cookingPreview, setCookingPreview] = useState<CookingPreview | null>(null)
  const [loadingCookingPreview, setLoadingCookingPreview] = useState(false)
  const [confirmingCook, setConfirmingCook] = useState(false)
  const [itemsToRemove, setItemsToRemove] = useState<Set<string>>(new Set())

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportingPdf, setExportingPdf] = useState(false)

  // Recipe selector modal state (for adding meals to empty slots)
  const [showRecipeSelector, setShowRecipeSelector] = useState(false)
  const [recipeSlotToFill, setRecipeSlotToFill] = useState<{ day: string; mealType: string } | null>(null)
  const [addingMeal, setAddingMeal] = useState(false)

  // View mode state (meals vs cooking plan)
  const [viewMode, setViewMode] = useState<'meals' | 'cooking'>('meals')

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

      // Calculate which day of week the meal plan starts on
      // DAYS_OF_WEEK array: 0=Monday, 1=Tuesday, ..., 6=Sunday
      // Date.getDay(): 0=Sunday, 1=Monday, ..., 6=Saturday
      const weekStartDate = new Date(data.mealPlan.weekStartDate)
      const jsDay = weekStartDate.getDay() // 0=Sunday, 1=Monday, etc.
      const ourDayIndex = jsDay === 0 ? 6 : jsDay - 1 // Convert to our array index (0=Monday)
      setCurrentDayIndex(ourDayIndex)

      // Initialize week schedules from customSchedule
      if (data.mealPlan.customSchedule) {
        setWeekProfileSchedules(data.mealPlan.customSchedule)
      }
    } catch (err) {
      console.error('Error fetching meal plan:', err)
      error('Failed to load meal plan')
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

  // Helper to get the day number within the week (1-7) for currentDayIndex
  const getDayNumberInWeek = (): number => {
    if (!mealPlan) return 1

    // Get the week start date
    const weekStartDate = new Date(mealPlan.weekStartDate)
    const weekStartDayOfWeek = weekStartDate.getDay() // 0=Sunday, 1=Monday, etc.
    const weekStartOurIndex = weekStartDayOfWeek === 0 ? 6 : weekStartDayOfWeek - 1 // Convert to our array (0=Monday)

    // Calculate how many days from the week start to the current day
    let dayNumber = currentDayIndex - weekStartOurIndex + 1

    // Handle wrap-around (e.g., week starts Tuesday, viewing Monday means Monday is day 7)
    if (dayNumber <= 0) {
      dayNumber += 7
    }

    return dayNumber
  }

  // Helper to get the actual date for the current day being viewed
  const getCurrentDate = (): Date => {
    if (!mealPlan) return new Date()

    const weekStartDate = new Date(mealPlan.weekStartDate)
    const dayNumber = getDayNumberInWeek()
    const currentDate = new Date(weekStartDate)
    currentDate.setDate(weekStartDate.getDate() + (dayNumber - 1))

    return currentDate
  }

  // Format date as "9 Dec"
  const formatShortDate = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${date.getDate()} ${months[date.getMonth()]}`
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
    } catch (err) {
      console.error('Error updating meal:', err)
      error('Failed to update meal')
    }
  }

  const handleMealDelete = async (mealId: string) => {
    const confirmed = await confirm({
      title: 'Delete Meal',
      message: 'Delete this meal?',
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

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
    } catch (err) {
      console.error('Error deleting meal:', err)
      error('Failed to delete meal')
    }
  }

  const handleToggleLock = async (mealId: string, isLocked: boolean) => {
    await handleMealUpdate(mealId, { isLocked })
  }

  const handleMarkCooked = async (mealId: string, undo: boolean = false) => {
    try {
      if (undo) {
        // Unmark as cooked
        console.log('🔷 Unmarking meal as cooked:', mealId)
        const response = await fetch(`/api/meals/${mealId}/cook`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to unmark meal')
        }

        // Update local state
        setMealPlan(prev => {
          if (!prev) return prev
          return {
            ...prev,
            meals: prev.meals.map(m =>
              m.id === mealId
                ? { ...m, isCooked: false, cookedAt: null }
                : m
            )
          }
        })
        console.log('🟢 Meal unmarked as cooked')
      } else {
        // Show preview modal first
        setLoadingCookingPreview(true)
        setShowCookingModal(true)

        console.log('🔷 Fetching cooking preview for meal:', mealId)
        const response = await fetch(`/api/meals/${mealId}/cook`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch cooking preview')
        }

        // Check if already cooked
        if (data.alreadyCooked) {
          setShowCookingModal(false)
          info('This meal has already been marked as cooked.')
          return
        }

        // Check if no recipe
        if (!data.hasRecipe) {
          setShowCookingModal(false)
          // Just mark as cooked without deduction
          await confirmMarkCooked(mealId, false)
          return
        }

        console.log('🟢 Cooking preview received:', data)

        // Transform preview data for display
        const meal = mealPlan?.meals.find(m => m.id === mealId)
        const previewItems = data.preview?.items.map((item: any) => ({
          ingredientName: item.ingredientName,
          recipeQuantity: item.recipeQuantity,
          recipeUnit: item.recipeUnit,
          inventoryQuantity: item.inventoryQuantity || 0,
          inventoryUnit: item.inventoryUnit || item.recipeUnit,
          quantityAfter: item.quantityAfter || 0,
          status: item.inventoryItem ? (item.isInsufficient ? 'partial' : 'full') : 'not_found',
          isSmallQuantity: item.isSmallQuantity,
          inventoryItemId: item.inventoryItem,
        })) || []

        // Initialize items to remove with small quantity items (pre-selected)
        const smallQuantityItemIds = previewItems
          .filter((item: any) => item.isSmallQuantity && item.inventoryItemId)
          .map((item: any) => item.inventoryItemId)
        setItemsToRemove(new Set(smallQuantityItemIds))

        setCookingPreview({
          mealId,
          recipeName: data.meal?.recipeName || meal?.recipeName || 'Unknown',
          scalingFactor: data.meal?.scalingFactor || 1,
          hasRecipe: data.hasRecipe,
          hasIngredients: data.hasIngredients,
          preview: data.preview ? {
            items: previewItems,
            summary: {
              canFullyDeduct: data.preview.items.filter((i: any) => i.inventoryItem && !i.isInsufficient).length,
              canPartiallyDeduct: data.preview.items.filter((i: any) => i.inventoryItem && i.isInsufficient).length,
              notInInventory: data.preview.items.filter((i: any) => !i.inventoryItem).length,
            }
          } : undefined,
        })

        setLoadingCookingPreview(false)
      }
    } catch (err) {
      console.error('❌ Error:', err)
      setShowCookingModal(false)
      setLoadingCookingPreview(false)
      error(err instanceof Error ? err.message : 'Failed to process cooking request')
    }
  }

  const confirmMarkCooked = async (mealId: string, deductFromInventory: boolean = true) => {
    setConfirmingCook(true)
    try {
      const itemsToRemoveArray = Array.from(itemsToRemove)
      console.log('🔷 Marking meal as cooked:', mealId, { deductFromInventory, itemsToRemove: itemsToRemoveArray })
      const response = await fetch(`/api/meals/${mealId}/cook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deductFromInventory,
          allowPartialDeduction: true,
          itemsToRemove: itemsToRemoveArray,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to mark meal as cooked')
      }

      const data = await response.json()

      // Update local state
      setMealPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          meals: prev.meals.map(m =>
            m.id === mealId
              ? { ...m, isCooked: true, cookedAt: data.cookedAt, inventoryDeducted: data.deduction !== null }
              : m
          )
        }
      })

      // Close modal and clear state
      setShowCookingModal(false)
      setCookingPreview(null)
      setItemsToRemove(new Set())

      // Show success message with deduction summary
      if (data.deduction) {
        const summary = data.deduction
        if (summary.notFound > 0 || summary.partiallyDeducted > 0) {
          info(
            `Meal marked as cooked!\n\n` +
            `Deduction summary:\n` +
            `- ${summary.fullyDeducted} items fully deducted\n` +
            `- ${summary.partiallyDeducted} items partially deducted\n` +
            `- ${summary.notFound} items not found in inventory`
          )
        }
      }
      console.log('🟢 Meal marked as cooked')
    } catch (err) {
      console.error('❌ Error marking meal as cooked:', err)
      error(err instanceof Error ? err.message : 'Failed to mark meal as cooked')
    } finally {
      setConfirmingCook(false)
    }
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

    const actionText = newStatus === 'Finalized' ? 'finalize' : newStatus === 'Draft' ? 'reopen' : 'archive'
    const confirmed = await confirm({
      title: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Meal Plan`,
      message: `Are you sure you want to ${actionText} this meal plan?`,
      confirmText: actionText.charAt(0).toUpperCase() + actionText.slice(1),
    })
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
    } catch (err) {
      console.error('Error updating status:', err)
      error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Meal Plan',
      message: 'Are you sure you want to permanently delete this meal plan? This cannot be undone.',
      confirmText: 'Delete',
      confirmVariant: 'danger',
    })
    if (!confirmed) return

    setSaving(true)
    try {
      const response = await fetch(`/api/meal-plans/${mealPlanId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete meal plan')
      success('Meal plan deleted successfully')
      router.push('/meal-plans')
    } catch (err) {
      console.error('Error deleting meal plan:', err)
      error('Failed to delete meal plan')
      setSaving(false)
    }
  }

  const handleRegenerateWithAI = async () => {
    const confirmed = await confirm({
      title: 'Regenerate Meal Plan',
      message: 'Regenerate this meal plan with AI? Locked meals will be preserved.',
      confirmText: 'Regenerate',
    })
    if (!confirmed) return

    setRegenerating(true)
    startLoading('Regenerating your meal plan...')
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
      success(`Meal plan regenerated successfully! ${data.summary || 'New meals generated.'}`)
    } catch (err: any) {
      console.error('❌ Error regenerating:', err)
      error(err.message || 'Failed to regenerate meal plan')
    } finally {
      setRegenerating(false)
      stopLoading()
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
    } catch (err) {
      console.error('Error saving schedule:', err)
      error('Failed to save schedule')
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

  // PDF Export Functions
  const generateWeeklyPlanPDF = async () => {
    if (!mealPlan) return
    setExportingPdf(true)

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 10
      let currentY = margin

      // === HEADER ===
      // FamilyFuel logo (left side) - gradient square
      const logoX = margin
      const logoY = currentY
      doc.setFillColor(139, 92, 246) // Purple
      doc.roundedRect(logoX, logoY, 8, 8, 1.5, 1.5, 'F')
      doc.setFillColor(236, 72, 153) // Pink
      doc.roundedRect(logoX + 4, logoY, 4, 8, 0, 1.5, 'F')

      // FamilyFuel text
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      doc.text('FamilyFuel', logoX + 11, currentY + 5.5)

      // Title (center)
      doc.setFontSize(18)
      doc.text('Weekly Meal Plan', pageWidth / 2, currentY + 5, { align: 'center' })

      // Date range (below title)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate), pageWidth / 2, currentY + 12, { align: 'center' })

      // Generated date (right)
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Generated ${new Date().toLocaleDateString()}`, pageWidth - margin, currentY + 5, { align: 'right' })

      currentY += 18

      // Divider line
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, currentY, pageWidth - margin, currentY)

      currentY += 4

      // === TABLE ===
      // Get day dates
      const weekStartDate = new Date(mealPlan.weekStartDate)
      const getDayDate = (dayIndex: number) => {
        const date = new Date(weekStartDate)
        date.setDate(weekStartDate.getDate() + dayIndex)
        return date.getDate()
      }
      const getMonthAbbr = (dayIndex: number) => {
        const date = new Date(weekStartDate)
        date.setDate(weekStartDate.getDate() + dayIndex)
        return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]
      }

      // Prepare table data - rows are meal types, columns are days
      const tableHead = [['', ...DAYS_OF_WEEK.map((d, i) => `${d}\n${getDayDate(i)} ${getMonthAbbr(i)}`)]]

      const mealTypeLabels = ['Breakfast', 'Lunch', 'Afternoon Snack', 'Dinner', 'Dessert']
      const mealTypeKeys = ['breakfast', 'lunch', 'afternoon-snack', 'dinner', 'dessert']

      const tableBody = mealTypeKeys.map((mealTypeKey, index) => {
        const row = [mealTypeLabels[index]]
        DAYS_OF_WEEK.forEach(day => {
          const meal = mealPlan.meals.find(m =>
            m.dayOfWeek === day &&
            m.mealType.toLowerCase().replace(/\s+/g, '-') === mealTypeKey
          )
          let cellText = meal?.recipeName || '-'
          // Add indicators for batch/leftover
          if (meal?.isLeftover) {
            cellText = '🔄 ' + cellText
          } else if (meal?.notes?.toLowerCase().includes('batch')) {
            cellText = '⚡ ' + cellText
          }
          // Add servings
          if (meal?.servings) {
            cellText += `\n(${meal.servings} servings)`
          }
          row.push(cellText)
        })
        return row
      })

      autoTable(doc, {
        head: tableHead,
        body: tableBody,
        startY: currentY,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          overflow: 'linebreak',
          cellWidth: 'wrap',
          valign: 'top',
        },
        headStyles: {
          fillColor: [38, 38, 38], // Dark header like design
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          minCellHeight: 12,
        },
        columnStyles: {
          0: { cellWidth: 22, fontStyle: 'bold', fillColor: [245, 245, 250], halign: 'left' },
          1: { cellWidth: 36 },
          2: { cellWidth: 36 },
          3: { cellWidth: 36 },
          4: { cellWidth: 36 },
          5: { cellWidth: 36 },
          6: { cellWidth: 36 },
          7: { cellWidth: 36 },
        },
        bodyStyles: {
          textColor: [60, 60, 60],
        },
        alternateRowStyles: {
          fillColor: [252, 252, 255]
        },
        margin: { left: margin, right: margin },
      })

      // Legend
      const legendY = (doc as any).lastAutoTable?.finalY + 6 || pageHeight - 20
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('⚡ Batch Cook', margin, legendY)
      doc.text('🔄 Reheat (from batch)', margin + 35, legendY)

      // Footer
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text('Powered by FamilyFuel', pageWidth / 2, pageHeight - 6, { align: 'center' })

      // Download
      doc.save(`FamilyFuel-MealPlan-${mealPlan.weekStartDate}.pdf`)
      success('Weekly Plan PDF downloaded!')
    } catch (err) {
      console.error('❌ Error generating PDF:', err)
      error('Failed to generate PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  const generateCookingPlanPDF = async () => {
    if (!mealPlan) return
    setExportingPdf(true)

    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 12
      let yPosition = margin

      // === HEADER ===
      // FamilyFuel logo
      const logoX = margin
      doc.setFillColor(139, 92, 246)
      doc.roundedRect(logoX, yPosition, 8, 8, 1.5, 1.5, 'F')
      doc.setFillColor(236, 72, 153)
      doc.roundedRect(logoX + 4, yPosition, 4, 8, 0, 1.5, 'F')

      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(50, 50, 50)
      doc.text('FamilyFuel', logoX + 11, yPosition + 5.5)

      // Title
      doc.setFontSize(20)
      doc.text('Cooking Plan', pageWidth / 2, yPosition + 5, { align: 'center' })

      // Date range
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(100, 100, 100)
      doc.text(formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate), pageWidth / 2, yPosition + 12, { align: 'center' })

      yPosition += 20

      // Divider
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.line(margin, yPosition, pageWidth - margin, yPosition)
      yPosition += 6

      // For each day, show what needs to be cooked
      DAYS_OF_WEEK.forEach((day, dayIndex) => {
        const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
        if (dayMeals.length === 0) return

        // Check if we need a new page
        if (yPosition > 240) {
          doc.addPage()
          yPosition = margin
        }

        // Day header with styled background
        const weekStartDate = new Date(mealPlan.weekStartDate)
        const dayDate = new Date(weekStartDate)
        dayDate.setDate(weekStartDate.getDate() + dayIndex)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

        // Day header background
        doc.setFillColor(139, 92, 246, 0.15) // Light purple
        doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 10, 2, 2, 'F')

        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(80, 60, 150)
        doc.text(`${day}, ${dayDate.getDate()} ${monthNames[dayDate.getMonth()]}`, margin + 4, yPosition + 7)
        yPosition += 14

        // Separate meals into cooking and reheat
        const cookingMeals = dayMeals.filter(m => !m.isLeftover)
        const reheatMeals = dayMeals.filter(m => m.isLeftover)

        // 🍳 TODAY'S COOKING section
        if (cookingMeals.length > 0) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(60, 60, 60)
          doc.text('🍳 TODAY\'S COOKING', margin + 2, yPosition)
          yPosition += 5

          cookingMeals.forEach(meal => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = margin
            }

            const mealLabel = MEAL_TYPES.find(mt => mt.key === meal.mealType.toLowerCase().replace(/\s+/g, '-'))?.label || meal.mealType
            const recipeName = meal.recipeName || 'Not assigned'
            const isBatch = meal.notes?.toLowerCase().includes('batch')

            // Meal row with light background
            if (isBatch) {
              doc.setFillColor(245, 158, 11, 0.1) // Amber tint
              doc.setDrawColor(245, 158, 11, 0.3)
              doc.roundedRect(margin + 2, yPosition - 1, pageWidth - margin * 2 - 4, 10, 1, 1, 'FD')
            }

            // Meal type label
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(mealLabel, margin + 4, yPosition + 3)

            // Batch badge
            if (isBatch) {
              doc.setFillColor(245, 158, 11)
              doc.roundedRect(margin + 4, yPosition + 4, 14, 4, 1, 1, 'F')
              doc.setFontSize(6)
              doc.setTextColor(255, 255, 255)
              doc.text('⚡ BATCH', margin + 5, yPosition + 6.8)
            }

            // Recipe name
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(40, 40, 40)
            doc.text(recipeName, margin + 28, yPosition + 3)

            // Servings
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(`${meal.servings || 4} servings`, margin + 28, yPosition + 7)

            // Prep/Cook times (if recipe data available)
            const recipe = recipes.find(r => r.id === meal.recipeId)
            if (recipe) {
              doc.setFontSize(8)
              doc.setTextColor(245, 158, 11)
              doc.text(`${recipe.prepTimeMinutes || 0} min prep`, pageWidth - margin - 30, yPosition + 3, { align: 'right' })
              doc.setTextColor(100, 100, 100)
              doc.text(`${recipe.cookTimeMinutes || 0} min cook`, pageWidth - margin - 4, yPosition + 3, { align: 'right' })
            }

            yPosition += 11
          })
        }

        // 🔄 REHEAT ONLY section
        if (reheatMeals.length > 0) {
          yPosition += 2
          doc.setFontSize(10)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(60, 60, 60)
          doc.text('🔄 REHEAT ONLY', margin + 2, yPosition)
          yPosition += 5

          reheatMeals.forEach(meal => {
            if (yPosition > 270) {
              doc.addPage()
              yPosition = margin
            }

            const mealLabel = MEAL_TYPES.find(mt => mt.key === meal.mealType.toLowerCase().replace(/\s+/g, '-'))?.label || meal.mealType
            const recipeName = meal.recipeName || 'Not assigned'

            // Reheat row with green tint
            doc.setFillColor(16, 185, 129, 0.1)
            doc.setDrawColor(16, 185, 129, 0.3)
            doc.roundedRect(margin + 2, yPosition - 1, pageWidth - margin * 2 - 4, 9, 1, 1, 'FD')

            // Meal type with reheat badge
            doc.setFontSize(8)
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(100, 100, 100)
            doc.text(mealLabel, margin + 4, yPosition + 3)

            doc.setFillColor(16, 185, 129)
            doc.roundedRect(margin + 4, yPosition + 4, 16, 4, 1, 1, 'F')
            doc.setFontSize(6)
            doc.setTextColor(255, 255, 255)
            doc.text('🔄 REHEAT', margin + 5, yPosition + 6.8)

            // Recipe name
            doc.setFontSize(9)
            doc.setFont('helvetica', 'bold')
            doc.setTextColor(40, 40, 40)
            doc.text(recipeName, margin + 28, yPosition + 3)

            // Reheat time
            doc.setFontSize(8)
            doc.setTextColor(16, 185, 129)
            doc.text('~10 min reheat', pageWidth - margin - 4, yPosition + 3, { align: 'right' })

            yPosition += 10
          })
        }

        // Calculate total cooking time for the day
        let totalPrepTime = 0
        let totalCookTime = 0
        cookingMeals.forEach(meal => {
          const recipe = recipes.find(r => r.id === meal.recipeId)
          if (recipe) {
            totalPrepTime += recipe.prepTimeMinutes || 0
            totalCookTime += recipe.cookTimeMinutes || 0
          }
        })

        if (totalPrepTime > 0 || totalCookTime > 0) {
          // Total time footer
          doc.setFillColor(139, 92, 246, 0.1)
          doc.roundedRect(margin, yPosition, pageWidth - margin * 2, 8, 1, 1, 'F')

          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.setTextColor(60, 60, 60)
          doc.text('Total cooking time:', margin + 4, yPosition + 5.5)

          const totalMinutes = totalPrepTime + totalCookTime
          const hours = Math.floor(totalMinutes / 60)
          const mins = totalMinutes % 60
          const timeStr = hours > 0 ? `~${hours}hr ${mins}min` : `~${mins}min`

          doc.setFontSize(11)
          doc.setTextColor(128, 90, 213)
          doc.text(timeStr, pageWidth - margin - 4, yPosition + 5.5, { align: 'right' })

          yPosition += 12
        }

        yPosition += 6
      })

      // Footer
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text('Powered by FamilyFuel', pageWidth / 2, pageHeight - 6, { align: 'center' })

      // Download
      doc.save(`FamilyFuel-CookingPlan-${mealPlan.weekStartDate}.pdf`)
      success('Cooking Plan PDF downloaded!')
    } catch (err) {
      console.error('❌ Error generating PDF:', err)
      error('Failed to generate PDF')
    } finally {
      setExportingPdf(false)
    }
  }

  // Add meal to empty slot
  const handleAddMealToSlot = async (recipeId: string) => {
    if (!mealPlan || !recipeSlotToFill) return

    setAddingMeal(true)
    try {
      const recipe = recipes.find(r => r.id === recipeId)
      if (!recipe) throw new Error('Recipe not found')

      console.log('🔷 Adding meal to slot:', recipeSlotToFill, 'recipe:', recipe.recipeName)

      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mealPlanId: mealPlan.id,
          dayOfWeek: recipeSlotToFill.day,
          mealType: recipeSlotToFill.mealType,
          recipeId: recipe.id,
          recipeName: recipe.recipeName,
          servings: 1,
          isLocked: false,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add meal')
      }

      const data = await response.json()
      console.log('🟢 Meal added:', data.meal)

      // Update local state
      setMealPlan(prev => {
        if (!prev) return prev
        return {
          ...prev,
          meals: [...prev.meals, data.meal]
        }
      })

      setShowRecipeSelector(false)
      setRecipeSlotToFill(null)
      success(`Added ${recipe.recipeName} to ${recipeSlotToFill.day} ${recipeSlotToFill.mealType}`)
    } catch (err) {
      console.error('❌ Error adding meal:', err)
      error(err instanceof Error ? err.message : 'Failed to add meal')
    } finally {
      setAddingMeal(false)
    }
  }

  // Open recipe selector for a specific slot
  const openRecipeSelector = (day: string, mealTypeKey: string) => {
    setRecipeSlotToFill({ day, mealType: mealTypeKey })
    setShowRecipeSelector(true)
  }

  if (loading) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading meal plan...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  if (!mealPlan) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Meal plan not found</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  const selectedProfile = profiles.find(p => p.id === selectedProfileId)
  const isEditable = mealPlan.status === 'Draft'

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="7xl">
        {/* Header */}
        <div className="mb-6">
          <Link href="/meal-plans" className="text-purple-400 hover:text-purple-300 mb-2 inline-block">
            ← Back to Meal Plans
          </Link>
          <div className="flex justify-between items-start">
            <div>
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
            </div>
          </div>
        </div>

        {/* Action Buttons */}
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
              </>
            )}
            {mealPlan.status === 'Finalized' && (
              <>
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
            <button
              onClick={() => setShowExportModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg text-sm font-medium hover:from-red-600 hover:to-orange-600 transition-all"
            >
              ↗ Export & Share
            </button>
            <Button
              onClick={handleDelete}
              disabled={saving}
              variant="danger"
            >
              Delete Plan
            </Button>
          </div>
        </div>

        {/* User Selector for Macro View */}
        <div className="card p-4 mb-6">
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            View Macros For:
          </label>
          <Select
            value={selectedProfileId}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            className="max-w-xs"
          >
            {profiles.map(profile => (
              <option key={profile.id} value={profile.id}>
                {profile.profileName} {profile.isMainUser ? '(Main User)' : ''}
              </option>
            ))}
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="card p-2 mb-4">
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setViewMode('meals')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'meals'
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              📋 Meals View
            </button>
            <button
              onClick={() => setViewMode('cooking')}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'cooking'
                  ? 'bg-purple-500 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              🍳 Cooking Plan
            </button>
          </div>
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
                {DAYS_OF_WEEK[currentDayIndex]}, {formatShortDate(getCurrentDate())}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">Day {getDayNumberInWeek()} of 7</p>
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

          {/* Mini Calendar */}
          <div className="flex justify-center gap-2 mt-4">
            {DAYS_OF_WEEK.map((day, index) => {
              // Calculate the date for each day
              const weekStartDate = mealPlan ? new Date(mealPlan.weekStartDate) : new Date()
              const dayDate = new Date(weekStartDate)
              dayDate.setDate(weekStartDate.getDate() + index)
              const isActive = currentDayIndex === index

              return (
                <button
                  key={day}
                  onClick={() => setCurrentDayIndex(index)}
                  className={`w-12 py-2 rounded-lg text-center transition-colors ${
                    isActive
                      ? 'bg-purple-500 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
                  }`}
                >
                  <div className="text-[10px] opacity-70">{day.slice(0, 3)}</div>
                  <div className="font-semibold">{dayDate.getDate()}</div>
                </button>
              )
            })}
          </div>

          <div className="mt-3 text-xs text-center text-zinc-500">
            Click a day or use arrow keys to navigate
          </div>
        </div>

        {/* Cooking Plan View */}
        {viewMode === 'cooking' && (
          <div className="card p-6">
            {(() => {
              const day = DAYS_OF_WEEK[currentDayIndex]
              const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)

              // Group meals by cooking time of day
              const morningMeals = dayMeals.filter(m =>
                ['breakfast', 'morning-snack'].includes(m.mealType.toLowerCase().replace(/\s+/g, '-'))
              )
              const middayMeals = dayMeals.filter(m =>
                ['lunch', 'afternoon-snack'].includes(m.mealType.toLowerCase().replace(/\s+/g, '-'))
              )
              const eveningMeals = dayMeals.filter(m =>
                ['dinner', 'dessert', 'evening-snack'].includes(m.mealType.toLowerCase().replace(/\s+/g, '-'))
              )

              // Calculate total cooking time (estimate based on meal types)
              const estimateCookTime = (meal: Meal): number => {
                if (meal.isLeftover) return 5 // Just reheating
                // Use recipe prepTime/cookTime if available, else estimate
                const mealType = meal.mealType.toLowerCase()
                if (mealType.includes('snack') || mealType.includes('dessert')) return 10
                if (mealType === 'breakfast') return 15
                if (mealType === 'lunch') return 20
                return 30 // dinner
              }

              const totalCookTime = dayMeals.reduce((sum, meal) => sum + estimateCookTime(meal), 0)

              const renderCookingSection = (title: string, emoji: string, meals: Meal[]) => {
                if (meals.length === 0) return null

                return (
                  <div key={title} className="mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                      <span>{emoji}</span> {title}
                    </h3>
                    <div className="space-y-3">
                      {meals.map(meal => (
                        <div
                          key={meal.id}
                          className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-lg border border-zinc-700"
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={meal.isCooked || false}
                            onChange={() => {
                              if (!meal.isCooked) {
                                handleMarkCooked(meal.id)
                              } else {
                                handleMarkCooked(meal.id, true)
                              }
                            }}
                            className="w-5 h-5 rounded border-zinc-600 text-purple-500 focus:ring-purple-500"
                          />

                          {/* Recipe Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">
                                {meal.recipeName || 'No recipe assigned'}
                              </span>
                              {/* Badges */}
                              {!meal.isLeftover && meal.notes?.toLowerCase().includes('batch') && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                                  ⚡ BATCH COOK
                                </span>
                              )}
                              {meal.isLeftover && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500 font-medium">
                                  🔄 REHEAT ONLY
                                </span>
                              )}
                              {meal.isCooked && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-500 font-medium">
                                  ✓ DONE
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1">
                              {MEAL_TYPES.find(mt => mt.key === meal.mealType.toLowerCase().replace(/\s+/g, '-'))?.label || meal.mealType}
                              {meal.servings && (
                                <>
                                  {' · '}
                                  {!meal.isLeftover && meal.notes?.toLowerCase().includes('batch') ? (
                                    <span className="text-amber-400 font-medium">
                                      {/* For batch cook, show total servings prominently */}
                                      {(() => {
                                        // Calculate total batch servings: this meal + all leftover meals using this recipe
                                        const leftoverMeals = mealPlan?.meals.filter(m =>
                                          m.isLeftover &&
                                          m.recipeId === meal.recipeId &&
                                          m.leftoverFromMealId === meal.id
                                        ) || []
                                        const leftoverServings = leftoverMeals.reduce((sum, m) => sum + (m.servings || 0), 0)
                                        const totalBatch = (meal.servings || 0) + leftoverServings
                                        return `${totalBatch} servings total (batch)`
                                      })()}
                                    </span>
                                  ) : (
                                    `${meal.servings} servings`
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Cooking Time */}
                          <div className="text-right">
                            <div className="text-purple-400 font-mono text-sm">
                              {estimateCookTime(meal)} min
                            </div>
                            <div className="text-xs text-zinc-500">
                              {meal.isLeftover ? 'reheat' : 'cook'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              }

              return (
                <>
                  {/* Total Time Header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-700">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Cooking Plan</h3>
                      <p className="text-sm text-zinc-400">What to cook and when</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-400">{totalCookTime} min</div>
                      <div className="text-xs text-zinc-500">Total cooking time</div>
                    </div>
                  </div>

                  {dayMeals.length === 0 ? (
                    <p className="text-center text-zinc-400 py-8">No meals planned for this day</p>
                  ) : (
                    <>
                      {renderCookingSection('Morning', '🌅', morningMeals)}
                      {renderCookingSection('Midday', '☀️', middayMeals)}
                      {renderCookingSection('Evening', '🌙', eveningMeals)}
                    </>
                  )}

                  {/* Legend */}
                  <div className="mt-6 pt-4 border-t border-zinc-700">
                    <div className="flex gap-6 text-xs text-zinc-500">
                      <span><span className="text-amber-500">⚡</span> Batch cook = Make extra portions</span>
                      <span><span className="text-emerald-500">🔄</span> Reheat = From earlier batch</span>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* Meals View - Single Day View with Swipe Support */}
        {viewMode === 'meals' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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

                      {/* Calories */}
                      {selectedProfile.dailyCalorieTarget && (
                        <div>
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Calories</span>
                            <span className="font-medium">{dailyMacros.calories} / {selectedProfile.dailyCalorieTarget}</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}`}
                              style={{ width: `${getMacroPercentage(dailyMacros.calories, selectedProfile.dailyCalorieTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Protein */}
                      {selectedProfile.dailyProteinTarget && (
                        <div>
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Protein</span>
                            <span className="font-medium">{dailyMacros.protein}g / {selectedProfile.dailyProteinTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.protein, selectedProfile.dailyProteinTarget)}`}
                              style={{ width: `${getMacroPercentage(dailyMacros.protein, selectedProfile.dailyProteinTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Carbs */}
                      {selectedProfile.dailyCarbsTarget && (
                        <div>
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Carbs</span>
                            <span className="font-medium">{dailyMacros.carbs}g / {selectedProfile.dailyCarbsTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}`}
                              style={{ width: `${getMacroPercentage(dailyMacros.carbs, selectedProfile.dailyCarbsTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}

                      {/* Fat */}
                      {selectedProfile.dailyFatTarget && (
                        <div>
                          <div className="flex justify-between mb-2 text-zinc-400">
                            <span>Fat</span>
                            <span className="font-medium">{dailyMacros.fat}g / {selectedProfile.dailyFatTarget}g</span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${getMacroProgressColor(dailyMacros.fat, selectedProfile.dailyFatTarget)}`}
                              style={{ width: `${getMacroPercentage(dailyMacros.fat, selectedProfile.dailyFatTarget)}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Meals for the Day */}
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
                            // Empty slot for missing meal type - clickable
                            return (
                              <div
                                key={`${day}-${mealTypeKey}`}
                                className="py-4 px-4 border border-dashed border-zinc-700 rounded-lg bg-zinc-900/30 hover:border-purple-500/50 hover:bg-zinc-800/50 cursor-pointer transition-colors text-center"
                                onClick={() => openRecipeSelector(day, mealTypeKey)}
                              >
                                <span className="text-sm text-zinc-500 italic block">
                                  {MEAL_TYPES.find(mt => mt.key === mealTypeKey)?.label || ''} not scheduled
                                </span>
                                <span className="text-sm text-purple-400 mt-1 block">+ Click to add</span>
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
                              onMarkCooked={handleMarkCooked}
                              disabled={!isEditable}
                              isFinalizedPlan={mealPlan.status === 'Finalized'}
                            />
                          )
                        })
                      )}
                    </div>
                  </SortableContext>
                </div>
              )
            })()}
          </div>
        </DndContext>
        )}

        {/* Edit Schedule Modal */}
        {showEditSchedule && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Edit Week Schedule</h2>
                <button
                  onClick={() => setShowEditSchedule(false)}
                  className="text-zinc-400 hover:text-zinc-300 text-2xl"
                >
                  ×
                </button>
              </div>

              <p className="text-sm text-zinc-400 mb-4">
                Adjust schedules for this specific week. This won't affect profile defaults.
              </p>

              {/* Per-Person Schedules */}
              <div className="space-y-6">
                {weekProfileSchedules.map((personSchedule) => (
                  <div key={personSchedule.profileId} className="border border-zinc-700 rounded-lg p-4">
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
                            {MEAL_TYPES.map(meal => (
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

              <div className="flex justify-end gap-3 mt-6">
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
              </div>
            </div>
          </div>
        )}

        {/* Cooking Preview Modal */}
        <Modal
          isOpen={showCookingModal}
          onClose={() => {
            setShowCookingModal(false)
            setCookingPreview(null)
            setLoadingCookingPreview(false)
          }}
          title="Mark as Cooked"
          maxWidth="lg"
        >
          <div className="p-6">
            {loadingCookingPreview ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mr-3"></div>
                <span className="text-zinc-300">Loading deduction preview...</span>
              </div>
            ) : cookingPreview ? (
              <div className="space-y-4">
                {/* Recipe Info */}
                <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <h3 className="text-white font-medium">{cookingPreview.recipeName}</h3>
                  {cookingPreview.scalingFactor !== 1 && (
                    <p className="text-sm text-zinc-400">
                      Scaling: {cookingPreview.scalingFactor}x recipe
                    </p>
                  )}
                </div>

                {/* No Ingredients */}
                {!cookingPreview.hasIngredients && (
                  <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-600/50">
                    <p className="text-blue-300">
                      This recipe has no ingredients to deduct from inventory.
                    </p>
                  </div>
                )}

                {/* Deduction Preview */}
                {cookingPreview.preview && cookingPreview.preview.items.length > 0 && (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-3 rounded-lg bg-green-900/20 border border-green-600/50">
                        <div className="text-2xl font-bold text-green-400">
                          {cookingPreview.preview.summary.canFullyDeduct}
                        </div>
                        <div className="text-xs text-zinc-400">Will be deducted</div>
                      </div>
                      <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-600/50">
                        <div className="text-2xl font-bold text-yellow-400">
                          {cookingPreview.preview.summary.canPartiallyDeduct}
                        </div>
                        <div className="text-xs text-zinc-400">Partial deduction</div>
                      </div>
                      <div className="p-3 rounded-lg bg-red-900/20 border border-red-600/50">
                        <div className="text-2xl font-bold text-red-400">
                          {cookingPreview.preview.summary.notInInventory}
                        </div>
                        <div className="text-xs text-zinc-400">Not in inventory</div>
                      </div>
                    </div>

                    {/* Small quantity items explanation */}
                    {cookingPreview.preview.items.some(i => i.isSmallQuantity && i.inventoryItemId) && (
                      <div className="p-3 rounded-lg bg-yellow-900/20 border border-yellow-600/50 text-sm">
                        <p className="text-yellow-300 font-medium mb-1">Low Quantity Items Detected</p>
                        <p className="text-zinc-400">
                          Some items will have very small remaining quantities after cooking.
                          Check the boxes below to remove them from inventory completely.
                        </p>
                      </div>
                    )}

                    {/* Detailed Item List */}
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-800/50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Ingredient</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Needed</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">In Stock</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">After</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400">Status</th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-zinc-400">Remove?</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                          {cookingPreview.preview.items.map((item, index) => (
                            <tr key={index} className={
                              item.status === 'not_found' ? 'bg-red-900/10' :
                              item.status === 'partial' ? 'bg-yellow-900/10' :
                              item.isSmallQuantity ? 'bg-yellow-900/5' : ''
                            }>
                              <td className="px-3 py-2 text-white">
                                {item.ingredientName}
                                {item.isSmallQuantity && (
                                  <span className="ml-2 text-xs px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 rounded">
                                    Low
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2 text-zinc-300">
                                {item.recipeQuantity} {item.recipeUnit}
                              </td>
                              <td className="px-3 py-2 text-zinc-300">
                                {item.status === 'not_found' ? (
                                  <span className="text-red-400">—</span>
                                ) : (
                                  `${item.inventoryQuantity} ${item.inventoryUnit}`
                                )}
                              </td>
                              <td className="px-3 py-2 text-zinc-300">
                                {item.status === 'not_found' ? (
                                  <span className="text-red-400">—</span>
                                ) : (
                                  <span className={item.isSmallQuantity ? 'text-yellow-400 font-medium' : ''}>
                                    {item.quantityAfter} {item.inventoryUnit}
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                {item.status === 'full' && (
                                  <Badge variant="success" size="sm">Will deduct</Badge>
                                )}
                                {item.status === 'partial' && (
                                  <Badge variant="warning" size="sm">Partial</Badge>
                                )}
                                {item.status === 'not_found' && (
                                  <Badge variant="error" size="sm">Not found</Badge>
                                )}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {item.isSmallQuantity && item.inventoryItemId && (
                                  <input
                                    type="checkbox"
                                    checked={itemsToRemove.has(item.inventoryItemId)}
                                    onChange={(e) => {
                                      const newSet = new Set(itemsToRemove)
                                      if (e.target.checked) {
                                        newSet.add(item.inventoryItemId!)
                                      } else {
                                        newSet.delete(item.inventoryItemId!)
                                      }
                                      setItemsToRemove(newSet)
                                    }}
                                    className="rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500"
                                    title={`Remove ${item.ingredientName} from inventory after cooking`}
                                  />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-zinc-700">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowCookingModal(false)
                      setCookingPreview(null)
                      setItemsToRemove(new Set())
                    }}
                  >
                    Cancel
                  </Button>
                  {cookingPreview.preview && cookingPreview.preview.items.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => confirmMarkCooked(cookingPreview.mealId, false)}
                      disabled={confirmingCook}
                    >
                      Cook without deducting
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => confirmMarkCooked(cookingPreview.mealId, true)}
                    disabled={confirmingCook}
                  >
                    {confirmingCook ? 'Processing...' : 'Confirm & Deduct'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>

        {/* Export & Share Modal */}
        <Modal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          title="Export & Share"
          maxWidth="sm"
        >
          <div className="p-4">
            <p className="text-sm text-zinc-400 mb-4">
              Week of {mealPlan ? formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate) : ''}
            </p>

            <div className="space-y-3">
              {/* Weekly Plan PDF */}
              <button
                onClick={generateWeeklyPlanPDF}
                disabled={exportingPdf}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">📄</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Weekly Plan PDF</div>
                  <div className="text-xs text-zinc-500">Landscape format, 1 page for printing</div>
                </div>
                <span className="text-zinc-500">{exportingPdf ? '...' : '↓'}</span>
              </button>

              {/* Cooking Plan PDF */}
              <button
                onClick={generateCookingPlanPDF}
                disabled={exportingPdf}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">🍳</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Cooking Plan PDF</div>
                  <div className="text-xs text-zinc-500">Daily cooking schedule with times</div>
                </div>
                <span className="text-zinc-500">{exportingPdf ? '...' : '↓'}</span>
              </button>

              {/* Share via WhatsApp */}
              <button
                onClick={() => {
                  if (!mealPlan) return
                  const text = `Meal Plan for ${formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate)}\n\n` +
                    DAYS_OF_WEEK.map(day => {
                      const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
                      const mealsList = dayMeals.map(m => `• ${m.mealType}: ${m.recipeName || 'Not set'}`).join('\n')
                      return `${day}:\n${mealsList || '• No meals'}`
                    }).join('\n\n')
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                }}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">💬</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Share via WhatsApp</div>
                  <div className="text-xs text-zinc-500">Send meal plan summary</div>
                </div>
                <span className="text-zinc-500">↗</span>
              </button>

              {/* Share via Email */}
              <button
                onClick={() => {
                  if (!mealPlan) return
                  const subject = `Meal Plan for ${formatDateRange(mealPlan.weekStartDate, mealPlan.weekEndDate)}`
                  const body = DAYS_OF_WEEK.map(day => {
                    const dayMeals = mealPlan.meals.filter(m => m.dayOfWeek === day)
                    const mealsList = dayMeals.map(m => `  • ${m.mealType}: ${m.recipeName || 'Not set'}`).join('\n')
                    return `${day}:\n${mealsList || '  • No meals'}`
                  }).join('\n\n')
                  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                }}
                className="w-full flex items-center gap-4 p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white">✉️</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white">Share via Email</div>
                  <div className="text-xs text-zinc-500">Compose email with plan details</div>
                </div>
                <span className="text-zinc-500">›</span>
              </button>
            </div>

            <button
              onClick={() => setShowExportModal(false)}
              className="w-full mt-4 px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Close
            </button>
          </div>
        </Modal>

        {/* Recipe Selector Modal */}
        <Modal
          isOpen={showRecipeSelector}
          onClose={() => {
            setShowRecipeSelector(false)
            setRecipeSlotToFill(null)
          }}
          title={recipeSlotToFill ? `Add ${MEAL_TYPES.find(mt => mt.key === recipeSlotToFill.mealType)?.label || recipeSlotToFill.mealType} for ${recipeSlotToFill.day}` : 'Select Recipe'}
          maxWidth="lg"
        >
          <div className="p-4">
            {recipeSlotToFill && (
              <>
                <p className="text-sm text-zinc-400 mb-4">
                  Choose a recipe to add to your meal plan
                </p>

                {/* Recipe list filtered by meal type */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {(() => {
                    // Filter recipes that match this meal type
                    const filteredRecipes = recipes.filter(recipe =>
                      recipe.mealType.some(mt =>
                        mt.toLowerCase().replace(/\s+/g, '-') === recipeSlotToFill.mealType.toLowerCase()
                      )
                    )

                    if (filteredRecipes.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <p className="text-zinc-400">No recipes found for this meal type.</p>
                          <p className="text-sm text-zinc-500 mt-2">
                            Add recipes with the "{MEAL_TYPES.find(mt => mt.key === recipeSlotToFill.mealType)?.label}" meal type to see them here.
                          </p>
                        </div>
                      )
                    }

                    return filteredRecipes.map(recipe => (
                      <button
                        key={recipe.id}
                        onClick={() => handleAddMealToSlot(recipe.id)}
                        disabled={addingMeal}
                        className="w-full flex items-center gap-4 p-4 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors text-left disabled:opacity-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-white">{recipe.recipeName}</div>
                          {(recipe.caloriesPerServing || recipe.proteinPerServing) && (
                            <div className="text-xs text-zinc-500 mt-1 flex gap-3">
                              {recipe.caloriesPerServing && (
                                <span>{recipe.caloriesPerServing} cal</span>
                              )}
                              {recipe.proteinPerServing && (
                                <span>{recipe.proteinPerServing}g protein</span>
                              )}
                              {recipe.carbsPerServing && (
                                <span>{recipe.carbsPerServing}g carbs</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-purple-400 text-lg">+</span>
                      </button>
                    ))
                  })()}
                </div>

                <button
                  onClick={() => {
                    setShowRecipeSelector(false)
                    setRecipeSlotToFill(null)
                  }}
                  className="w-full mt-4 px-4 py-3 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </Modal>
      </PageContainer>
    </AppLayout>
  )
}
