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
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

        <div>
          <label htmlFor="profileName" className="block text-sm font-medium text-gray-700">
            Profile Name *
          </label>
          <input
            type="text"
            id="profileName"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            value={formData.profileName}
            onChange={(e) => setFormData({ ...formData, profileName: e.target.value })}
          />
        </div>

        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700">
            Age
          </label>
          <input
            type="number"
            id="age"
            min="0"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            value={formData.age || ''}
            onChange={(e) => setFormData({ ...formData, age: e.target.value ? parseInt(e.target.value) : undefined })}
          />
        </div>

        <div>
          <label htmlFor="activityLevel" className="block text-sm font-medium text-gray-700">
            Activity Level
          </label>
          <select
            id="activityLevel"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
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

        <div className="border-t pt-4">
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="isMainUser"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.isMainUser}
                onChange={(e) => setFormData({ ...formData, isMainUser: e.target.checked })}
              />
            </div>
            <div className="ml-3">
              <label htmlFor="isMainUser" className="font-medium text-gray-700">
                Set as Main User
              </label>
              <p className="text-sm text-gray-500">
                The main user's nutritional goals will be used for AI recipe analysis and nutritionist feedback.
                Only one profile should be marked as the main user.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Food Preferences</h3>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Food Likes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              value={newFoodLike}
              onChange={(e) => setNewFoodLike(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFoodLike())}
              placeholder="Add a food item"
            />
            <button
              type="button"
              onClick={addFoodLike}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.foodLikes.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeFoodLike(index)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Food Dislikes
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              value={newFoodDislike}
              onChange={(e) => setNewFoodDislike(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFoodDislike())}
              placeholder="Add a food item"
            />
            <button
              type="button"
              onClick={addFoodDislike}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.foodDislikes.map((item, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
              >
                {item}
                <button
                  type="button"
                  onClick={() => removeFoodDislike(index)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Nutritional Goals</h3>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="macroTrackingEnabled"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            checked={formData.macroTrackingEnabled}
            onChange={(e) => setFormData({ ...formData, macroTrackingEnabled: e.target.checked })}
          />
          <label htmlFor="macroTrackingEnabled" className="ml-2 block text-sm text-gray-900">
            Enable macro tracking
          </label>
        </div>

        {formData.macroTrackingEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label htmlFor="dailyCalorieTarget" className="block text-sm font-medium text-gray-700">
                Daily Calorie Target
              </label>
              <input
                type="number"
                id="dailyCalorieTarget"
                min="0"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                value={formData.dailyCalorieTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyCalorieTarget: e.target.value ? parseInt(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyProteinTarget" className="block text-sm font-medium text-gray-700">
                Daily Protein Target (g)
              </label>
              <input
                type="number"
                id="dailyProteinTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                value={formData.dailyProteinTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyProteinTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyCarbsTarget" className="block text-sm font-medium text-gray-700">
                Daily Carbs Target (g)
              </label>
              <input
                type="number"
                id="dailyCarbsTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                value={formData.dailyCarbsTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyCarbsTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyFatTarget" className="block text-sm font-medium text-gray-700">
                Daily Fat Target (g)
              </label>
              <input
                type="number"
                id="dailyFatTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                value={formData.dailyFatTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyFatTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>

            <div>
              <label htmlFor="dailyFiberTarget" className="block text-sm font-medium text-gray-700">
                Daily Fiber Target (g)
              </label>
              <input
                type="number"
                id="dailyFiberTarget"
                min="0"
                step="0.1"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                value={formData.dailyFiberTarget || ''}
                onChange={(e) => setFormData({ ...formData, dailyFiberTarget: e.target.value ? parseFloat(e.target.value) : undefined })}
              />
            </div>
          </div>
        )}
      </div>

      {/* Meal Schedule Section */}
      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Meal Schedule</h3>
          <p className="text-sm text-gray-500 mb-4">
            Select which meals {formData.profileName || 'this person'} needs planned for each day of the week.
            This schedule will be used when generating weekly meal plans.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAllMeals(['breakfast', 'lunch', 'dinner'])}
            className="px-3 py-1 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100"
          >
            All Main Meals
          </button>
          <button
            type="button"
            onClick={() => setAllMeals(['breakfast', 'morning-snack', 'lunch', 'afternoon-snack', 'dinner', 'dessert', 'evening-snack'])}
            className="px-3 py-1 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
          >
            All Meals + Snacks
          </button>
          <button
            type="button"
            onClick={clearAllMeals}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Clear All
          </button>
        </div>

        {/* Meal Schedule Grid */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                  Meal Type
                </th>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <th key={day} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {[
                { key: 'breakfast', label: 'Breakfast' },
                { key: 'morning-snack', label: 'Morning Snack' },
                { key: 'lunch', label: 'Lunch' },
                { key: 'afternoon-snack', label: 'Afternoon Snack' },
                { key: 'dinner', label: 'Dinner' },
                { key: 'dessert', label: 'Dessert' },
                { key: 'evening-snack', label: 'Evening Snack' },
              ].map(meal => (
                <tr key={meal.key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {meal.label}
                  </td>
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <td key={day} className="px-2 py-3 whitespace-nowrap text-center">
                      <input
                        type="checkbox"
                        checked={formData.mealAvailability?.[day as keyof MealSchedule]?.includes(meal.key) || false}
                        onChange={() => toggleMeal(day as keyof MealSchedule, meal.key)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 italic">
          💡 Tip: This is the default schedule. You can override it for specific weeks in the meal planner.
        </p>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : mode === 'create' ? 'Create Profile' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}
