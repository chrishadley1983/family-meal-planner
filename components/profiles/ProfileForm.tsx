'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type MealSchedule = {
  monday: string[]
  tuesday: string[]
  wednesday: string[]
  thursday: string[]
  friday: string[]
  saturday: string[]
  sunday: string[]
}

interface ProfileFormData {
  profileName: string
  age?: number
  activityLevel?: string
  foodLikes: string[]
  foodDislikes: string[]
  allergies: any[]
  mealAvailability?: MealSchedule
  dailyCalorieTarget?: number
  dailyProteinTarget?: number
  dailyCarbsTarget?: number
  dailyFatTarget?: number
  dailyFiberTarget?: number
  macroTrackingEnabled: boolean
  isMainUser: boolean
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>
  profileId?: string
  mode: 'create' | 'edit'
}

export default function ProfileForm({ initialData, profileId, mode }: ProfileFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Default meal schedule: Breakfast, Lunch, Dinner for all days
  const defaultMealSchedule: MealSchedule = {
    monday: ['breakfast', 'lunch', 'dinner'],
    tuesday: ['breakfast', 'lunch', 'dinner'],
    wednesday: ['breakfast', 'lunch', 'dinner'],
    thursday: ['breakfast', 'lunch', 'dinner'],
    friday: ['breakfast', 'lunch', 'dinner'],
    saturday: ['breakfast', 'lunch', 'dinner'],
    sunday: ['breakfast', 'lunch', 'dinner'],
  }

  const [formData, setFormData] = useState<ProfileFormData>({
    profileName: initialData?.profileName || '',
    age: initialData?.age || undefined,
    activityLevel: initialData?.activityLevel || '',
    foodLikes: initialData?.foodLikes || [],
    foodDislikes: initialData?.foodDislikes || [],
    allergies: initialData?.allergies || [],
    mealAvailability: (initialData as any)?.mealAvailability || defaultMealSchedule,
    dailyCalorieTarget: initialData?.dailyCalorieTarget || undefined,
    dailyProteinTarget: initialData?.dailyProteinTarget || undefined,
    dailyCarbsTarget: initialData?.dailyCarbsTarget || undefined,
    dailyFatTarget: initialData?.dailyFatTarget || undefined,
    dailyFiberTarget: initialData?.dailyFiberTarget || undefined,
    macroTrackingEnabled: initialData?.macroTrackingEnabled || false,
    isMainUser: (initialData as any)?.isMainUser || false,
  })

  const [newFoodLike, setNewFoodLike] = useState('')
  const [newFoodDislike, setNewFoodDislike] = useState('')

  // Update form data when initialData changes (for edit mode)
  useEffect(() => {
    if (initialData) {
      setFormData({
        profileName: initialData.profileName || '',
        age: initialData.age || undefined,
        activityLevel: initialData.activityLevel || '',
        foodLikes: initialData.foodLikes || [],
        foodDislikes: initialData.foodDislikes || [],
        allergies: initialData.allergies || [],
        mealAvailability: (initialData as any)?.mealAvailability || defaultMealSchedule,
        dailyCalorieTarget: initialData.dailyCalorieTarget || undefined,
        dailyProteinTarget: initialData.dailyProteinTarget || undefined,
        dailyCarbsTarget: initialData.dailyCarbsTarget || undefined,
        dailyFatTarget: initialData.dailyFatTarget || undefined,
        dailyFiberTarget: initialData.dailyFiberTarget || undefined,
        macroTrackingEnabled: initialData.macroTrackingEnabled || false,
        isMainUser: (initialData as any)?.isMainUser || false,
      })
    }
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const url = mode === 'create' ? '/api/profiles' : `/api/profiles/${profileId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to save profile')
        setLoading(false)
        return
      }

      router.push('/profiles')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const addFoodLike = () => {
    if (newFoodLike.trim()) {
      setFormData({
        ...formData,
        foodLikes: [...formData.foodLikes, newFoodLike.trim()]
      })
      setNewFoodLike('')
    }
  }

  const removeFoodLike = (index: number) => {
    setFormData({
      ...formData,
      foodLikes: formData.foodLikes.filter((_, i) => i !== index)
    })
  }

  const addFoodDislike = () => {
    if (newFoodDislike.trim()) {
      setFormData({
        ...formData,
        foodDislikes: [...formData.foodDislikes, newFoodDislike.trim()]
      })
      setNewFoodDislike('')
    }
  }

  const removeFoodDislike = (index: number) => {
    setFormData({
      ...formData,
      foodDislikes: formData.foodDislikes.filter((_, i) => i !== index)
    })
  }

  // Meal schedule helpers
  const toggleMeal = (day: keyof MealSchedule, mealType: string) => {
    const currentMeals = formData.mealAvailability?.[day] || []
    const newMeals = currentMeals.includes(mealType)
      ? currentMeals.filter(m => m !== mealType)
      : [...currentMeals, mealType]

    setFormData({
      ...formData,
      mealAvailability: {
        ...formData.mealAvailability!,
        [day]: newMeals
      }
    })
  }

  const setAllMeals = (mealTypes: string[]) => {
    const newSchedule: MealSchedule = {
      monday: [...mealTypes],
      tuesday: [...mealTypes],
      wednesday: [...mealTypes],
      thursday: [...mealTypes],
      friday: [...mealTypes],
      saturday: [...mealTypes],
      sunday: [...mealTypes],
    }
    setFormData({ ...formData, mealAvailability: newSchedule })
  }

  const clearAllMeals = () => {
    const emptySchedule: MealSchedule = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: [],
    }
    setFormData({ ...formData, mealAvailability: emptySchedule })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="card p-6 space-y-6">
        <h3 className="text-lg font-medium text-white">Basic Information</h3>

        <div>
          <label htmlFor="profileName" className="block text-sm font-medium text-zinc-300">
            Profile Name *
          </label>
          <input
            type="text"
            id="profileName"
            required
            className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
            value={formData.profileName}
            onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="age" className="block text-sm font-medium text-zinc-300">
            Age
          </label>
          <input
            type="number"
            id="age"
            min="0"
            className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
            value={formData.age || ''}
            onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>

        <div>
          <label htmlFor="activityLevel" className="block text-sm font-medium text-zinc-300">
            Activity Level
          </label>
          <select
            id="activityLevel"
            className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
            value={formData.activityLevel}
            onChange={(e) => setFormData({ ...formData, activityLevel: e.target.value })}
          >
            <option value="">Select activity level</option>
            <option value="Sedentary">Sedentary</option>
            <option value="Lightly Active">Lightly Active</option>
            <option value="Moderately Active">Moderately Active</option>
            <option value="Very Active">Very Active</option>
          </select>
        </div>

        <div className="border-t border-zinc-700 pt-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="isMainUser"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded bg-zinc-800"
                checked={formData.isMainUser}
                onChange={(e) => setFormData({ ...formData, isMainUser: e.target.checked })}
              />
            </div>
            <div className="ml-3">
              <label htmlFor="isMainUser" className="font-medium text-zinc-200">
                Set as Main User
              </label>
              <p className="text-sm text-zinc-400">
                The main user's nutritional goals will be used for AI recipe analysis and nutritionist feedback.
                Only one profile should be marked as the main user.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <h3 className="text-lg font-medium text-white">Food Preferences</h3>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Food Likes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
              value={newFoodLike}
              onChange={(e) => setNewFoodLike(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFoodLike())}
              placeholder="Add a food item"
            />
            <button
              type="button"
              onClick={addFoodLike}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.foodLikes.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-900/30 text-green-400 border border-green-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeFoodLike(index)}
                  className="ml-2 text-green-400 hover:text-green-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Food Dislikes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
              value={newFoodDislike}
              onChange={(e) => setNewFoodDislike(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFoodDislike())}
              placeholder="Add a food item"
            />
            <button
              type="button"
              onClick={addFoodDislike}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.foodDislikes.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-900/30 text-red-400 border border-red-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeFoodDislike(index)}
                  className="ml-2 text-red-400 hover:text-red-300"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-6">
        <h3 className="text-lg font-medium text-white">Nutritional Goals</h3>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="macroTrackingEnabled"
            className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded bg-zinc-800"
            checked={formData.macroTrackingEnabled}
            onChange={(e) => setFormData({ ...formData, macroTrackingEnabled: e.target.checked })}
          />
          <label htmlFor="macroTrackingEnabled" className="ml-2 block text-sm text-zinc-200">
            Enable macro tracking
          </label>
        </div>

        {formData.macroTrackingEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="dailyCalorieTarget" className="block text-sm font-medium text-zinc-300">
                Daily Calorie Target
              </label>
              <input
                type="number"
                id="dailyCalorieTarget"
                min="0"
                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
                value={formData.dailyCalorieTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyCalorieTarget: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyProteinTarget" className="block text-sm font-medium text-zinc-300">
                Daily Protein Target (g)
              </label>
              <input
                type="number"
                id="dailyProteinTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
                value={formData.dailyProteinTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyProteinTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyCarbsTarget" className="block text-sm font-medium text-zinc-300">
                Daily Carbs Target (g)
              </label>
              <input
                type="number"
                id="dailyCarbsTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
                value={formData.dailyCarbsTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyCarbsTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyFatTarget" className="block text-sm font-medium text-zinc-300">
                Daily Fat Target (g)
              </label>
              <input
                type="number"
                id="dailyFatTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
                value={formData.dailyFatTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyFatTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyFiberTarget" className="block text-sm font-medium text-zinc-300">
                Daily Fiber Target (g)
              </label>
              <input
                type="number"
                id="dailyFiberTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 sm:text-sm px-3 py-2"
                value={formData.dailyFiberTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyFiberTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Meal Schedule Section */}
      <div className="card p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-white mb-2">Meal Schedule</h3>
          <p className="text-sm text-zinc-400 mb-4">
            Select which meals {formData.profileName || 'this person'} needs planned for each day of the week.
            This schedule will be used when generating weekly meal plans.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllMeals(['breakfast', 'lunch', 'dinner'])}
            className="px-3 py-1 text-sm bg-purple-900/30 text-purple-400 border border-purple-800 rounded-lg hover:bg-purple-900/50 transition-colors"
          >
            All Main Meals
          </button>
          <button
            type="button"
            onClick={() => setAllMeals(['breakfast', 'morning-snack', 'lunch', 'afternoon-snack', 'dinner', 'dessert', 'evening-snack'])}
            className="px-3 py-1 text-sm bg-green-900/30 text-green-400 border border-green-800 rounded-lg hover:bg-green-900/50 transition-colors"
          >
            All Meals + Snacks
          </button>
          <button
            type="button"
            onClick={clearAllMeals}
            className="px-3 py-1 text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-lg hover:bg-zinc-700 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Meal Schedule Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-700">
            <thead className="bg-zinc-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider w-40">
                  Meal Type
                </th>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <th key={day} className="px-2 py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {[
                { key: 'breakfast', label: 'Breakfast' },
                { key: 'morning-snack', label: 'Morning Snack' },
                { key: 'lunch', label: 'Lunch' },
                { key: 'afternoon-snack', label: 'Afternoon Snack' },
                { key: 'dinner', label: 'Dinner' },
                { key: 'dessert', label: 'Dessert' },
                { key: 'evening-snack', label: 'Evening Snack' },
              ].map(meal => (
                <tr key={meal.key} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-zinc-200">
                    {meal.label}
                  </td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <td key={day} className="px-2 py-3 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={formData.mealAvailability?.[day as keyof MealSchedule]?.includes(meal.key) || false}
                        onChange={() => toggleMeal(day as keyof MealSchedule, meal.key)}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-zinc-600 rounded bg-zinc-800 cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-zinc-500 italic">
          💡 Tip: This is the default schedule. You can override it for specific weeks in the meal planner.
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-zinc-700 rounded-lg text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Profile' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
