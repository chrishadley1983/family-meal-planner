'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { generateRecipeSVG } from '@/lib/generate-recipe-image'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'

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
  const { data: session } = useSession()
  const [recipe, setRecipe] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [duplicating, setDuplicating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isFavorite, setIsFavorite] = useState(false)
  const [togglingFavorite, setTogglingFavorite] = useState(false)

  // Edit form state
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>('')
  const [cuisineType, setCuisineType] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('')
  const [mealType, setMealCategory] = useState<string[]>([])
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

  // Ingredient scaling state
  const [scaleIngredients, setScaleIngredients] = useState(false)
  const [baseServings, setBaseServings] = useState(4)
  const [baseIngredients, setBaseIngredients] = useState<any[]>([])

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
              mealType: recipeData.mealType,
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
        fetchAIAnalysis({ recipeName, servings, ingredients, mealType })
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [isEditing, recipeName, ingredients, servings, mealType])

  // Scale ingredients when servings change (if scaling is enabled)
  useEffect(() => {
    if (scaleIngredients && baseServings > 0 && baseIngredients.length > 0) {
      const ratio = servings / baseServings
      console.log('📏 Scaling ingredients by ratio:', ratio, 'from', baseServings, 'to', servings)

      const scaledIngredients = baseIngredients.map(ing => ({
        ...ing,
        quantity: parseFloat((ing.quantity * ratio).toFixed(2))
      }))

      setIngredients(scaledIngredients)
    }
  }, [servings, scaleIngredients, baseServings, baseIngredients])

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
      setIsFavorite(data.recipe.isFavorite || false)

      // Set edit form state
      setRecipeName(data.recipe.recipeName || '')
      setDescription(data.recipe.description || '')
      setServings(data.recipe.servings || 4)
      setPrepTimeMinutes(data.recipe.prepTimeMinutes || '')
      setCookTimeMinutes(data.recipe.cookTimeMinutes || '')
      setCuisineType(data.recipe.cuisineType || '')
      setDifficultyLevel(data.recipe.difficultyLevel || '')
      setMealCategory(data.recipe.mealType || [])
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

  const handleToggleFavorite = async () => {
    console.log('⭐ Toggling favorite from', isFavorite, 'to', !isFavorite)
    setTogglingFavorite(true)
    try {
      const newFavoriteStatus = !isFavorite
      const response = await fetch(`/api/recipes/${id}/favorite`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newFavoriteStatus })
      })

      console.log('⭐ Favorite API response:', response.status, response.ok)
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Favorite updated:', data.recipe.isFavorite)
        setIsFavorite(data.recipe.isFavorite)
        // Update recipe state as well
        setRecipe(data.recipe)
      } else {
        console.error('❌ Failed to update favorite:', await response.text())
      }
    } catch (err) {
      console.error('❌ Failed to toggle favorite:', err)
    } finally {
      setTogglingFavorite(false)
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

    const macroData = {
      caloriesPerServing: macroAnalysis?.perServing?.calories ? Math.round(macroAnalysis.perServing.calories) : null,
      proteinPerServing: macroAnalysis?.perServing?.protein ? Math.round(macroAnalysis.perServing.protein * 10) / 10 : null,
      carbsPerServing: macroAnalysis?.perServing?.carbs ? Math.round(macroAnalysis.perServing.carbs * 10) / 10 : null,
      fatPerServing: macroAnalysis?.perServing?.fat ? Math.round(macroAnalysis.perServing.fat * 10) / 10 : null,
    }

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
          mealType,
          notes: notes || null,
          imageUrl: imageUrl || null,
          caloriesPerServing: macroData.caloriesPerServing,
          proteinPerServing: macroData.proteinPerServing,
          carbsPerServing: macroAnalysis?.perServing?.carbs ? Math.round(macroAnalysis.perServing.carbs * 10) / 10 : null,
          fatPerServing: macroAnalysis?.perServing?.fat ? Math.round(macroAnalysis.perServing.fat * 10) / 10 : null,
          fiberPerServing: macroAnalysis?.perServing?.fiber ? Math.round(macroAnalysis.perServing.fiber * 10) / 10 : null,
          sugarPerServing: macroAnalysis?.perServing?.sugar ? Math.round(macroAnalysis.perServing.sugar * 10) / 10 : null,
          sodiumPerServing: macroAnalysis?.perServing?.sodium ? Math.round(macroAnalysis.perServing.sodium) : null,
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
      setMealCategory(recipe.mealType || [])
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
    saveToHistory()
    setIngredients([...ingredients, { ingredientName: '', quantity: 1, unit: '', notes: '' }])
  }

  const removeIngredient = (index: number) => {
    saveToHistory()
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const updateIngredient = (index: number, field: string, value: any) => {
    saveToHistory()
    const updated = [...ingredients]
    updated[index] = { ...updated[index], [field]: value }
    setIngredients(updated)
  }

  const addInstruction = () => {
    saveToHistory()
    setInstructions([...instructions, { stepNumber: instructions.length + 1, instruction: '' }])
  }

  const removeInstruction = (index: number) => {
    saveToHistory()
    const updated = instructions.filter((_, i) => i !== index)
    updated.forEach((inst, i) => inst.stepNumber = i + 1)
    setInstructions(updated)
  }

  const updateInstruction = (index: number, value: string) => {
    saveToHistory()
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
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer>
          <div className="flex items-center justify-center py-12">
            <p className="text-zinc-400">Loading recipe...</p>
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  if (!recipe) {
    return null
  }

  return (
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="7xl">
        <Link href="/recipes" className="text-purple-400 hover:text-purple-300 mb-6 inline-block">
          ← Back to Recipes
        </Link>

        <div className="card overflow-hidden">
          <div className="p-6">
            {/* Header with title, edit button, duplicate, and rating */}
            <div className="flex justify-between items-start mb-6">
              <div className="flex-1">
                {isEditing ? (
                  <Input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    className="text-3xl font-bold text-white mb-2 w-full bg-transparent border-none border-b-2 border-purple-500 rounded-none px-0 focus:ring-0 focus:border-purple-400"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-white mb-2">{recipe.recipeName}</h1>
                )}
                {isEditing ? (
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="Description..."
                    className="input w-full mt-2"
                  />
                ) : (
                  recipe.description && <p className="text-zinc-400">{recipe.description}</p>
                )}

                {/* Recipe Image */}
                {isEditing ? (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-white mb-2">Recipe Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleRecipeImageChange}
                      className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer cursor-pointer"
                    />
                    {imagePreview && (
                      <div className="mt-2 relative h-48 w-full bg-zinc-800 rounded-md overflow-hidden">
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
                  <div className="mt-4 relative h-64 w-full bg-zinc-800 rounded-md overflow-hidden">
                    <Image
                      src={recipe.imageUrl || generateRecipeSVG(recipe.recipeName, recipe.mealType)}
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
                    <Button
                      onClick={handleToggleFavorite}
                      disabled={togglingFavorite}
                      variant="ghost"
                      size="sm"
                      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <span className={`text-xl ${isFavorite ? 'text-yellow-400' : 'text-zinc-600'}`}>
                        {isFavorite ? '★' : '☆'}
                      </span>
                    </Button>
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="secondary"
                      size="sm"
                    >
                      Edit
                    </Button>
                    <Button
                      onClick={handleDuplicate}
                      disabled={duplicating}
                      variant="ghost"
                      size="sm"
                      isLoading={duplicating}
                      title="Duplicate this recipe"
                    >
                      {duplicating ? 'Duplicating...' : 'Duplicate'}
                    </Button>
                  </>
                )}
                {isEditing ? (
                  <div className="flex space-x-2">
                    <Button
                      onClick={undo}
                      disabled={history.length === 0 || saving}
                      variant="secondary"
                      size="sm"
                      title="Undo last change"
                    >
                      ↶ Undo
                    </Button>
                    <Button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      variant="primary"
                      size="sm"
                      isLoading={saving}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      disabled={saving}
                      variant="ghost"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className="focus:outline-none transition-colors"
                      >
                        <svg
                          className={`h-6 w-6 ${
                            rating && star <= rating ? 'text-yellow-400' : 'text-zinc-600'
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <div>
                <p className="text-sm text-zinc-400">Servings</p>
                {isEditing ? (
                  <>
                    <Input
                      type="number"
                      value={servings}
                      onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                      min="1"
                      className="text-lg font-semibold w-full mt-1"
                    />
                    <label className="flex items-center mt-2 text-xs text-zinc-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scaleIngredients}
                        onChange={(e) => {
                          const checked = e.target.checked
                          setScaleIngredients(checked)
                          if (checked) {
                            // Save current state as baseline
                            setBaseServings(servings)
                            setBaseIngredients(JSON.parse(JSON.stringify(ingredients)))
                          }
                        }}
                        className="mr-1"
                      />
                      Scale ingredients
                    </label>
                  </>
                ) : (
                  <p className="text-lg font-semibold text-white">{recipe.servings}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-400">Prep Time (min)</p>
                {isEditing ? (
                  <Input
                    type="number"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    min="0"
                    className="text-lg font-semibold w-full mt-1"
                  />
                ) : (
                  recipe.prepTimeMinutes && <p className="text-lg font-semibold text-white">{recipe.prepTimeMinutes} min</p>
                )}
              </div>
              <div>
                <p className="text-sm text-zinc-400">Cook Time (min)</p>
                {isEditing ? (
                  <Input
                    type="number"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                    min="0"
                    className="text-lg font-semibold w-full mt-1"
                  />
                ) : (
                  recipe.cookTimeMinutes && <p className="text-lg font-semibold text-white">{recipe.cookTimeMinutes} min</p>
                )}
              </div>
              {recipe.totalTimeMinutes && !isEditing && (
                <div>
                  <p className="text-sm text-zinc-400">Total Time</p>
                  <p className="text-lg font-semibold text-white">{recipe.totalTimeMinutes} min</p>
                </div>
              )}
            </div>

            {/* Cuisine, Difficulty, Categories */}
            <div className="mb-6 pb-6 border-b border-zinc-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Cuisine Type</p>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={cuisineType}
                      onChange={(e) => setCuisineType(e.target.value)}
                      placeholder="e.g., Italian, Mexican"
                    />
                  ) : (
                    recipe.cuisineType && <p className="text-sm font-medium text-white">{recipe.cuisineType}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-zinc-400 mb-1">Difficulty</p>
                  {isEditing ? (
                    <Select
                      value={difficultyLevel}
                      onChange={(e) => setDifficultyLevel(e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </Select>
                  ) : (
                    recipe.difficultyLevel && <p className="text-sm font-medium text-white">{recipe.difficultyLevel}</p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Meal Categories</p>
                {isEditing ? (
                  <div className="flex flex-wrap gap-2">
                    {mealCategories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          mealType.includes(cat)
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                ) : (
                  recipe.mealType.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {recipe.mealType.map((cat: string) => (
                        <Badge key={cat} variant="purple" size="sm">
                          {cat}
                        </Badge>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Ingredients</h2>
                <div className="flex gap-2">
                  {!macroAnalysis && !loadingAI && (
                    <Button
                      onClick={() => fetchAIAnalysis(isEditing ? { recipeName, servings, ingredients, mealType } : recipe)}
                      variant="secondary"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      Analyze Nutrition
                    </Button>
                  )}
                  {isEditing && (
                    <Button
                      onClick={addIngredient}
                      variant="primary"
                      size="sm"
                    >
                      Add Ingredient
                    </Button>
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
                          <Input
                            type="text"
                            placeholder="Ingredient"
                            value={ing.ingredientName}
                            onChange={(e) => updateIngredient(index, 'ingredientName', e.target.value)}
                            className="col-span-5 text-sm"
                          />
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={ing.quantity}
                            onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                            step="0.1"
                            className="col-span-2 text-sm"
                          />
                          <Input
                            type="text"
                            placeholder="Unit"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                            className="col-span-2 text-sm"
                          />
                          <Input
                            type="text"
                            placeholder="Notes"
                            value={ing.notes || ''}
                            onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                            className="col-span-2 text-sm"
                          />
                          <button
                            onClick={() => removeIngredient(index)}
                            className="col-span-1 text-red-500 hover:text-red-400 text-2xl"
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
                      <li key={index} className="flex items-start text-zinc-300">
                        {rating && (
                          <div className="flex items-center mr-2" title={rating.reason}>
                            <div className={`w-3 h-3 rounded-full ${getTrafficLightClass(rating.rating)}`}></div>
                          </div>
                        )}
                        <span className="text-zinc-500 mr-3">•</span>
                        <span>
                          <strong className="text-white">{ing.quantity} {ing.unit}</strong> {ing.ingredientName}
                          {ing.notes && <span className="text-zinc-500 text-sm"> ({ing.notes})</span>}
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
                <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 rounded-lg border border-purple-800/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white">Nutritional Analysis (per serving)</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-zinc-300">Overall Rating:</span>
                      <div className={`w-4 h-4 rounded-full ${getTrafficLightClass(macroAnalysis.overallRating)}`}></div>
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 mb-4 italic">{macroAnalysis.overallExplanation}</p>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Calories</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.calories}</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Protein</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.protein}g</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Carbs</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.carbs}g</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Fat</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.fat}g</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Fiber</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.fiber}g</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Sugar</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.sugar}g</p>
                    </div>
                    <div className="bg-zinc-800/50 p-3 rounded-md border border-zinc-700">
                      <p className="text-xs text-zinc-400 mb-1">Sodium</p>
                      <p className="text-lg font-bold text-white">{macroAnalysis.perServing.sodium}mg</p>
                    </div>
                  </div>
                </div>

                {/* Sarah's Nutritionist Feedback */}
                {nutritionistFeedback && (
                  <div className="mb-6 p-5 bg-gradient-to-r from-pink-900/20 to-purple-900/20 rounded-lg border border-pink-800/30">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-[60px] h-[60px] rounded-full border-2 border-pink-500 bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-3xl">
                          👩‍⚕️
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white mb-2">Sarah&apos;s Nutritionist Feedback</h3>
                        <div className="text-sm text-zinc-300 whitespace-pre-line">
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
              <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30 text-center">
                <p className="text-sm text-zinc-300">Analyzing nutritional content...</p>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Instructions</h2>
                {isEditing && (
                  <Button
                    onClick={addInstruction}
                    variant="primary"
                    size="sm"
                  >
                    Add Step
                  </Button>
                )}
              </div>
              {isEditing ? (
                <div className="space-y-2">
                  {instructions.map((inst, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-900/50 text-purple-300 border border-purple-700 font-medium text-sm">
                        {inst.stepNumber}
                      </span>
                      <textarea
                        rows={2}
                        placeholder="Describe this step..."
                        value={inst.instruction}
                        onChange={(e) => updateInstruction(index, e.target.value)}
                        className="input flex-1 text-sm"
                      />
                      <button
                        onClick={() => removeInstruction(index)}
                        className="text-red-500 hover:text-red-400 text-2xl"
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
                      <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-900/50 text-purple-300 border border-purple-700 font-semibold mr-4">
                        {inst.stepNumber}
                      </span>
                      <p className="flex-1 pt-1 text-zinc-300">{inst.instruction}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Notes */}
            <div className="mb-6">
              <h3 className="font-semibold text-white mb-2">Notes</h3>
              {isEditing ? (
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this recipe..."
                  className="input w-full"
                />
              ) : (
                recipe.notes && (
                  <div className="p-4 bg-yellow-900/20 rounded-lg border border-yellow-800/30">
                    <p className="text-sm text-zinc-300">{recipe.notes}</p>
                  </div>
                )
              )}
            </div>

            {!isEditing && (
              <div className="text-sm text-zinc-500 border-t border-zinc-800 pt-4">
                Used {recipe.timesUsed} times
                {recipe.lastUsedDate && ` • Last used ${new Date(recipe.lastUsedDate).toLocaleDateString()}`}
              </div>
            )}
          </div>
        </div>
      </PageContainer>
    </AppLayout>
  )
}
