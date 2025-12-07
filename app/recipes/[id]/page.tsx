'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'

interface RecipePageProps {
  params: Promise<{ id: string }>
}

type MacroAnalysis = {
  perServing: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sugar: number
    sodium: number
  }
  overallRating: 'green' | 'yellow' | 'red'
  overallExplanation: string
  ingredientRatings: Array<{
    ingredientName: string
    rating: 'green' | 'yellow' | 'red'
    reason: string
  }>
}

export default function ViewRecipePage({ params }: RecipePageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>('')
  const [cuisineType, setCuisineType] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('')
  const [mealCategory, setMealCategory] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [ingredients, setIngredients] = useState<any[]>([])
  const [instructions, setInstructions] = useState<any[]>([])
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  // AI Features state
  const [macroAnalysis, setMacroAnalysis] = useState<MacroAnalysis | null>(null)
  const [nutritionistFeedback, setNutritionistFeedback] = useState<string>('')
  const [loadingAI, setLoadingAI] = useState(false)

  // Undo history state
  const [history, setHistory] = useState<Array<{
    ingredients: any[]
    instructions: any[]
  }>>([])

  const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']

  // Fetch AI analysis
  const fetchAIAnalysis = async (recipeData: any) => {
    console.log('🔍 fetchAIAnalysis called with recipe:', recipeData?.recipeName)
    if (!recipeData) {
      console.log('❌ No recipe data, returning early')
      return
    }

    console.log('✅ Starting AI analysis...')
    setLoadingAI(true)
    try {
      // Fetch macro analysis
      console.log('📡 Calling macro analysis API...')
      const macroResponse = await fetch('/api/recipes/analyze-macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            recipeName: recipeData.recipeName,
            servings: recipeData.servings,
            ingredients: recipeData.ingredients
          }
        })
      })

      console.log('📊 Macro response status:', macroResponse.status, macroResponse.ok)
      if (macroResponse.ok) {
        const macroData = await macroResponse.json()
        console.log('✅ Macro analysis received:', macroData)
        setMacroAnalysis(macroData.analysis)

        // Fetch nutritionist feedback
        console.log('📡 Calling nutritionist feedback API...')
        const feedbackResponse = await fetch('/api/recipes/nutritionist-feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipe: {
              recipeName: recipeData.recipeName,
              servings: recipeData.servings,
              mealCategory: recipeData.mealCategory,
              ingredients: recipeData.ingredients
            },
            macroAnalysis: macroData.analysis
          })
        })

        console.log('👩‍⚕️ Feedback response status:', feedbackResponse.status, feedbackResponse.ok)
        if (feedbackResponse.ok) {
          const feedbackData = await feedbackResponse.json()
          console.log('✅ Nutritionist feedback received:', feedbackData)
          setNutritionistFeedback(feedbackData.feedback)
        } else {
          console.log('❌ Feedback request failed')
        }
      } else {
        const errorData = await macroResponse.json()
        console.log('❌ Macro analysis request failed:', errorData)
      }
    } catch (err) {
      console.error('❌ Failed to fetch AI analysis:', err)
    } finally {
      console.log('🏁 AI analysis complete, loadingAI set to false')
      setLoadingAI(false)
    }
  }

  useEffect(() => {
    fetchRecipe()
  }, [id])

  // Separate useEffect to fetch AI analysis when recipe loads
  useEffect(() => {
    console.log('🔄 Recipe state changed, checking if should fetch AI...', {
      hasRecipe: !!recipe,
      isEditing,
      hasMacroAnalysis: !!macroAnalysis
    })

    if (recipe && !isEditing && !macroAnalysis) {
      console.log('✨ Triggering AI analysis for:', recipe.recipeName)
      fetchAIAnalysis(recipe)
    }
  }, [recipe, isEditing, macroAnalysis])

  // Auto-refresh AI analysis when editing ingredients
  useEffect(() => {
    if (isEditing && recipeName && ingredients.some(i => i.ingredientName && i.unit)) {
      // Debounce the analysis fetch
      const timer = setTimeout(() => {
        console.log('🔄 Auto-refreshing AI analysis while editing')
        fetchAIAnalysis({ recipeName, servings, ingredients, mealCategory })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isEditing, recipeName, ingredients, servings, mealCategory])

  const fetchRecipe = async () => {
    console.log('📥 fetchRecipe called for id:', id)
    try {
      const response = await fetch(`/api/recipes/${id}`)
      console.log('📥 Recipe API response status:', response.status)
      if (!response.ok) {
        router.push('/recipes')
        return
      }
      const data = await response.json()
      console.log('📥 Recipe data loaded:', data.recipe?.recipeName)
      setRecipe(data.recipe)
      setRating(data.recipe.familyRating)

      // Set edit form state
      setRecipeName(data.recipe.recipeName || '')
      setDescription(data.recipe.description || '')
      setServings(data.recipe.servings || 4)
      setPrepTimeMinutes(data.recipe.prepTimeMinutes || '')
      setCookTimeMinutes(data.recipe.cookTimeMinutes || '')
      setCuisineType(data.recipe.cuisineType || '')
      setDifficultyLevel(data.recipe.difficultyLevel || '')
      setMealCategory(data.recipe.mealCategory || [])
      setNotes(data.recipe.notes || '')
      setIngredients(data.recipe.ingredients || [])
      setInstructions(data.recipe.instructions || [])
      setImageUrl(data.recipe.imageUrl || '')
      setImagePreview(data.recipe.imageUrl || '')
    } catch (err) {
      console.error('❌ Error in fetchRecipe:', err)
      router.push('/recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleRating = async (newRating: number) => {
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ familyRating: newRating })
      })

      if (response.ok) {
        setRating(newRating)
        const data = await response.json()
        setRecipe(data.recipe)
      }
    } catch (err) {
      console.error('Failed to update rating')
    }
  }

  const handleDuplicate = async () => {
    setDuplicating(true)
    try {
      const response = await fetch(`/api/recipes/${id}/duplicate`, {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        router.push(`/recipes/${data.recipe.id}`)
      }
    } catch (err) {
      console.error('Failed to duplicate recipe')
    } finally {
      setDuplicating(false)
    }
  }

  // AI Helper functions
  const getTrafficLightClass = (rating: 'green' | 'yellow' | 'red') => {
    switch (rating) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  const getIngredientRating = (ingredientName: string) => {
    return macroAnalysis?.ingredientRatings?.find(
      r => r.ingredientName.toLowerCase() === ingredientName.toLowerCase()
    )
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipeName,
          description: description || null,
          servings,
          prepTimeMinutes: prepTimeMinutes || null,
          cookTimeMinutes: cookTimeMinutes || null,
          cuisineType: cuisineType || null,
          difficultyLevel: difficultyLevel || null,
          mealCategory,
          notes: notes || null,
          imageUrl: imageUrl || null,
          ingredients: ingredients.filter(i => i.ingredientName && i.unit),
          instructions: instructions.filter(i => i.instruction)
        })
      })

      if (response.ok) {
        const data = await response.json()
        setRecipe(data.recipe)
        setIsEditing(false)
        fetchRecipe() // Refresh the data
      }
    } catch (err) {
      console.error('Failed to save recipe')
      alert('Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    // Reset to original values
    if (recipe) {
      setRecipeName(recipe.recipeName || '')
      setDescription(recipe.description || '')
      setServings(recipe.servings || 4)
      setPrepTimeMinutes(recipe.prepTimeMinutes || '')
      setCookTimeMinutes(recipe.cookTimeMinutes || '')
      setCuisineType(recipe.cuisineType || '')
      setDifficultyLevel(recipe.difficultyLevel || '')
      setMealCategory(recipe.mealCategory || [])
      setNotes(recipe.notes || '')
      setIngredients(recipe.ingredients || [])
      setInstructions(recipe.instructions || [])
      setImageUrl(recipe.imageUrl || '')
      setImagePreview(recipe.imageUrl || '')
    }
  }

  // Save current state to history before making changes
  const saveToHistory = () => {
    setHistory(prev => [...prev, {
      ingredients: JSON.parse(JSON.stringify(ingredients)),
      instructions: JSON.parse(JSON.stringify(instructions))
    }].slice(-10)) // Keep last 10 changes
  }

  // Undo last change
  const undo = () => {
    if (history.length === 0) return

    const lastState = history[history.length - 1]
    setIngredients(lastState.ingredients)
    setInstructions(lastState.instructions)
    setHistory(prev => prev.slice(0, -1))
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredientName: '', quantity: 1, unit: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    saveToHistory()
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addInstruction = () => {
    setInstructions([...instructions, { stepNumber: instructions.length + 1, instruction: '' }])
  }

  const removeInstruction = (index: number) => {
    saveToHistory()
    const updated = instructions.filter((_, i) => i !== index)
    updated.forEach((inst, i) => inst.stepNumber = i + 1)
    setInstructions(updated)
  }

  const updateInstruction = (index: number, value: string) => {
    const updated = [...instructions]
    updated[index] = { ...updated[index], instruction: value }
    setInstructions(updated)
  }

  const toggleCategory = (category: string) => {
    setMealCategory(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const handleRecipeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image too large. Please use an image under 5MB.')
        return
      }

      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImageUrl(base64String)
        setImagePreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading recipe...</p>
      </div>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/recipes" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Recipes
        </Link>

        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          <div className="p-6">
            {/* Header with title, edit button, duplicate, and rating */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {isEditing ? (
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="text-3xl font-bold text-gray-900 mb-2 w-full border-b-2 border-blue-500 focus:outline-none"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.recipeName}</h1>
                )}
                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Description..."
                    className="text-gray-600 w-full border rounded-md px-2 py-1 mt-2"
                  />
                ) : (
                  recipe.description && <p className="text-gray-600">{recipe.description}</p>
                )}

                {/* Recipe Image */}
                {isEditing ? (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRecipeImageChange}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative h-48 w-full bg-gray-100 rounded-md overflow-hidden">
                        <Image
                          src={imagePreview}
                          alt="Recipe preview"
                          fill
                          className="object-cover"
                          unoptimized={imagePreview.startsWith('data:')}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 relative h-64 w-full bg-gray-100 rounded-md overflow-hidden">
                    <Image
                      src={recipe.imageUrl || generateRecipeSVG(recipe.recipeName, recipe.mealCategory)}
                      alt={recipe.recipeName}
                      fill
                      className="object-cover"
                      unoptimized={(recipe.imageUrl || '').startsWith('data:')}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-3 ml-4">
                {!isEditing && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDuplicate}
                      disabled={duplicating}
                      className="px-3 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 disabled:opacity-50"
                      title="Duplicate this recipe"
                    >
                      {duplicating ? 'Duplicating...' : 'Duplicate'}
                    </button>
                  </>
                )}
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={undo}
                      disabled={history.length === 0 || saving}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Undo last change"
                    >
                      ↶ Undo
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className="focus:outline-none"
                      >
                        <svg
                          className={`h-6 w-6 ${
                            rating && star <= rating ? 'text-yellow-400' : 'text-gray-300'
                          }`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Times and servings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-500">Servings</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                    min="1"
                    className="text-lg font-semibold w-full border rounded px-2 py-1"
                  />
                ) : (
                  <p className="text-lg font-semibold">{recipe.servings}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Prep Time (min)</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    min="0"
                    className="text-lg font-semibold w-full border rounded px-2 py-1"
                  />
                ) : (
                  recipe.prepTimeMinutes && <p className="text-lg font-semibold">{recipe.prepTimeMinutes} min</p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Cook Time (min)</p>
                {isEditing ? (
                  <input
                    type="number"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    min="0"
                    className="text-lg font-semibold w-full border rounded px-2 py-1"
                  />
                ) : (
                  recipe.cookTimeMinutes && <p className="text-lg font-semibold">{recipe.cookTimeMinutes} min</p>
                )}
              </div>
              {recipe.totalTimeMinutes && !isEditing && (
                <div>
                  <p className="text-sm text-gray-500">Total Time</p>
                  <p className="text-lg font-semibold">{recipe.totalTimeMinutes} min</p>
                </div>
              )}
            </div>

            {/* Cuisine, Difficulty, Categories */}
            <div className="mb-6 pb-6 border-b">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Cuisine Type</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={cuisineType}
                      onChange={(e) => setCuisineType(e.target.value)}
                      placeholder="e.g., Italian, Mexican"
                      className="w-full border rounded px-3 py-2"
                    />
                  ) : (
                    recipe.cuisineType && <p className="text-sm font-medium">{recipe.cuisineType}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Difficulty</p>
                  {isEditing ? (
                    <select
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(e.target.value)}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="">Select...</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  ) : (
                    recipe.difficultyLevel && <p className="text-sm font-medium">{recipe.difficultyLevel}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-2">Meal Categories</p>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {mealCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          mealCategory.includes(cat)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                ) : (
                  recipe.mealCategory.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipe.mealCategory.map((cat: string) => (
                        <span key={cat} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Ingredients</h2>
                <div className="flex gap-2">
                  {!macroAnalysis && !loadingAI && (
                    <button
                      onClick={() => fetchAIAnalysis(isEditing ? { recipeName, servings, ingredients, mealCategory } : recipe)}
                      className="px-3 py-1 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                    >
                      Analyze Nutrition
                    </button>
                  )}
                  {isEditing && (
                    <button
                      onClick={addIngredient}
                      className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                    >
                      Add Ingredient
                    </button>
                  )}
                </div>
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {ingredients.map((ing, index) => {
                    const rating = getIngredientRating(ing.ingredientName)
                    return (
                      <div key={index} className="flex items-center gap-2">
                        {rating && (
                          <div className="flex items-center" title={rating.reason}>
                            <div className={`w-3 h-3 rounded-full ${getTrafficLightClass(rating.rating)}`}></div>
                          </div>
                        )}
                        <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Ingredient"
                            value={ing.ingredientName}
                            onChange={(e) => updateIngredient(index, 'ingredientName', e.target.value)}
                            className="col-span-5 border rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="number"
                            placeholder="Qty"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                            step="0.1"
                            className="col-span-2 border rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Unit"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            className="col-span-2 border rounded px-2 py-1 text-sm"
                          />
                          <input
                            type="text"
                            placeholder="Notes"
                            value={ing.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            className="col-span-2 border rounded px-2 py-1 text-sm"
                          />
                          <button
                            onClick={() => removeIngredient(index)}
                            className="col-span-1 text-red-600 hover:text-red-800"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ul className="space-y-2">
                  {recipe.ingredients.map((ing: any, index: number) => {
                    const rating = getIngredientRating(ing.ingredientName)
                    return (
                      <li key={index} className="flex items-start">
                        {rating && (
                          <div className="flex items-center mr-2" title={rating.reason}>
                            <div className={`w-3 h-3 rounded-full ${getTrafficLightClass(rating.rating)}`}></div>
                          </div>
                        )}
                        <span className="text-gray-400 mr-3">•</span>
                        <span>
                          <strong>{ing.quantity} {ing.unit}</strong> {ing.ingredientName}
                          {ing.notes && <span className="text-gray-500 text-sm"> ({ing.notes})</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* AI Nutritional Analysis */}
            {macroAnalysis && (
              <>
                {/* Macro Breakdown */}
                <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900">Nutritional Analysis (per serving)</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-600">Overall Rating:</span>
                      <div className={`w-4 h-4 rounded-full ${getTrafficLightClass(macroAnalysis.overallRating)}`}></div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-4 italic">{macroAnalysis.overallExplanation}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Calories</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.calories}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Protein</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.protein}g</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Carbs</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.carbs}g</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Fat</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.fat}g</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Fiber</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.fiber}g</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Sugar</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.sugar}g</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Sodium</p>
                      <p className="text-lg font-bold text-gray-900">{macroAnalysis.perServing.sodium}mg</p>
                    </div>
                  </div>
                </div>

                {/* Sarah's Nutritionist Feedback */}
                {nutritionistFeedback && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <Image
                          src="/sarah-avatar.png"
                          alt="Sarah the AI Nutritionist"
                          width={60}
                          height={60}
                          className="rounded-full border-2 border-pink-300"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 mb-2">Sarah&apos;s Nutritionist Feedback</h3>
                        <div className="text-sm text-gray-700 whitespace-pre-line">
                          {nutritionistFeedback}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Loading AI Analysis */}
            {loadingAI && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
                <p className="text-sm text-gray-600">Analyzing nutritional content...</p>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Instructions</h2>
                {isEditing && (
                  <button
                    onClick={addInstruction}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                  >
                    Add Step
                  </button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {instructions.map((inst, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-medium text-sm">
                        {inst.stepNumber}
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Describe this step..."
                        value={inst.instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className="flex-1 border rounded px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => removeInstruction(index)}
                        className="text-red-600 hover:text-red-800 text-xl"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <ol className="space-y-4">
                  {recipe.instructions.map((inst: any, index: number) => (
                    <li key={index} className="flex">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-semibold mr-4">
                        {inst.stepNumber}
                      </span>
                      <p className="flex-1 pt-1">{inst.instruction}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Notes</h3>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this recipe..."
                  className="w-full border rounded px-3 py-2"
                />
              ) : (
                recipe.notes && (
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-700">{recipe.notes}</p>
                  </div>
                )
              )}
            </div>

            {!isEditing && (
              <div className="text-sm text-gray-500 border-t pt-4">
                Used {recipe.timesUsed} times
                {recipe.lastUsedDate && ` • Last used ${new Date(recipe.lastUsedDate).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
