'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

type InputMethod = 'manual' | 'url' | 'photo'

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

export default function NewRecipePage() {
  const router = useRouter()
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // URL import state
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  // Photo import state
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>('')

  // Recipe form state
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>('')
  const [cuisineType, setCuisineType] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('')
  const [mealCategory, setMealCategory] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [sourceUrl, setSourceUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imagePreview, setImagePreview] = useState('')

  const [ingredients, setIngredients] = useState<Array<{
    ingredientName: string
    quantity: number
    unit: string
    category?: string
    notes?: string
  }>>([{ ingredientName: '', quantity: 1, unit: '' }])

  const [instructions, setInstructions] = useState<Array<{
    stepNumber: number
    instruction: string
  }>>([{ stepNumber: 1, instruction: '' }])

  // New feature states
  const [scaleIngredients, setScaleIngredients] = useState(true)
  const [baseServings, setBaseServings] = useState(4)
  const [baseIngredients, setBaseIngredients] = useState<Array<{ ingredientName: string; quantity: number; unit: string }>>([])
  const [macroAnalysis, setMacroAnalysis] = useState<MacroAnalysis | null>(null)
  const [nutritionistFeedback, setNutritionistFeedback] = useState<string>('')
  const [loadingMacros, setLoadingMacros] = useState(false)
  const [loadingFeedback, setLoadingFeedback] = useState(false)

  const mealCategories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']

  // Auto-fetch macro analysis when recipe changes
  useEffect(() => {
    if (recipeName && ingredients.some(i => i.ingredientName && i.unit)) {
      // Debounce the analysis fetch
      const timer = setTimeout(() => {
        fetchMacroAnalysis()
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [recipeName, ingredients, servings])

  // Fetch macro analysis from API
  const fetchMacroAnalysis = async () => {
    if (!recipeName || !ingredients.some(i => i.ingredientName && i.unit)) {
      return
    }

    setLoadingMacros(true)
    try {
      const response = await fetch('/api/recipes/analyze-macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            recipeName,
            servings,
            ingredients: ingredients.filter(i => i.ingredientName && i.unit),
          },
        }),
      })

      const data = await response.json()
      if (response.ok && data.analysis) {
        setMacroAnalysis(data.analysis)
        // Once we have macro analysis, fetch nutritionist feedback
        fetchNutritionistFeedback(data.analysis)
      }
    } catch (err) {
      console.error('Failed to fetch macro analysis:', err)
    } finally {
      setLoadingMacros(false)
    }
  }

  // Fetch nutritionist feedback from API
  const fetchNutritionistFeedback = async (analysis: MacroAnalysis) => {
    setLoadingFeedback(true)
    try {
      const response = await fetch('/api/recipes/nutritionist-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            recipeName,
            description,
            servings,
            mealCategory,
            ingredients: ingredients.filter(i => i.ingredientName && i.unit),
          },
          macroAnalysis: analysis,
        }),
      })

      const data = await response.json()
      if (response.ok && data.feedback) {
        setNutritionistFeedback(data.feedback)
      }
    } catch (err) {
      console.error('Failed to fetch nutritionist feedback:', err)
    } finally {
      setLoadingFeedback(false)
    }
  }

  // Handle servings change with ingredient scaling
  const handleServingsChange = (newServings: number) => {
    if (scaleIngredients && baseServings > 0) {
      const scaleFactor = newServings / baseServings
      const scaledIngredients = baseIngredients.map(ing => ({
        ...ing,
        quantity: Math.round(ing.quantity * scaleFactor * 100) / 100,
      }))
      setIngredients(scaledIngredients)
    }
    setServings(newServings)
  }

  // Toggle scale checkbox
  const handleScaleToggle = () => {
    if (!scaleIngredients) {
      // User is turning ON scaling - capture current state as base
      setBaseServings(servings)
      setBaseIngredients(ingredients.map(i => ({
        ingredientName: i.ingredientName,
        quantity: i.quantity,
        unit: i.unit
      })))
    }
    setScaleIngredients(!scaleIngredients)
  }

  // Get traffic light color class
  const getTrafficLightClass = (rating: 'green' | 'yellow' | 'red') => {
    switch (rating) {
      case 'green': return 'bg-green-500'
      case 'yellow': return 'bg-yellow-500'
      case 'red': return 'bg-red-500'
      default: return 'bg-gray-300'
    }
  }

  // Get ingredient rating
  const getIngredientRating = (ingredientName: string) => {
    return macroAnalysis?.ingredientRatings?.find(
      r => r.ingredientName.toLowerCase() === ingredientName.toLowerCase()
    )
  }

  const handleUrlImport = async () => {
    if (!importUrl) {
      setError('Please enter a URL')
      return
    }

    setImporting(true)
    setError('')

    try {
      const response = await fetch('/api/recipes/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to import recipe from URL')
        setImporting(false)
        return
      }

      // Populate form with parsed recipe data
      const recipe = data.recipe
      setRecipeName(recipe.recipeName || '')
      setDescription(recipe.description || '')
      setServings(recipe.servings || 4)
      setPrepTimeMinutes(recipe.prepTimeMinutes || '')
      setCookTimeMinutes(recipe.cookTimeMinutes || '')
      setCuisineType(recipe.cuisineType || '')
      setDifficultyLevel(recipe.difficultyLevel || '')
      setMealCategory(recipe.mealCategory || [])
      setSourceUrl(recipe.sourceUrl || importUrl)

      if (recipe.ingredients && recipe.ingredients.length > 0) {
        setIngredients(recipe.ingredients.map((ing: any) => ({
          ingredientName: ing.ingredientName || '',
          quantity: ing.quantity || 1,
          unit: ing.unit || '',
          notes: ing.notes || ''
        })))
      }

      if (recipe.instructions && recipe.instructions.length > 0) {
        setInstructions(recipe.instructions.map((inst: any, index: number) => ({
          stepNumber: inst.stepNumber || index + 1,
          instruction: inst.instruction || ''
        })))
      }

      // Switch to manual mode for review/editing
      setInputMethod('manual')
      setImporting(false)
    } catch (err) {
      setError('An error occurred while importing the recipe')
      setImporting(false)
    }
  }

  const handlePhotoImport = async (file: File) => {
    setImporting(true)
    setError('')

    try {
      // Convert image to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const imageData = reader.result as string

        const response = await fetch('/api/recipes/import-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData })
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Failed to analyze recipe photo')
          setImporting(false)
          return
        }

        // Populate form with analyzed recipe data
        const recipe = data.recipe
        setRecipeName(recipe.recipeName || '')
        setDescription(recipe.description || '')
        setServings(recipe.servings || 4)
        setCuisineType(recipe.cuisineType || '')
        setDifficultyLevel(recipe.difficultyLevel || '')
        setMealCategory(recipe.mealCategory || [])

        if (recipe.ingredients && recipe.ingredients.length > 0) {
          setIngredients(recipe.ingredients.map((ing: any) => ({
            ingredientName: ing.ingredientName || '',
            quantity: ing.quantity || 1,
            unit: ing.unit || ''
          })))
        }

        if (recipe.instructions && recipe.instructions.length > 0) {
          setInstructions(recipe.instructions.map((inst: any, index: number) => ({
            stepNumber: inst.stepNumber || index + 1,
            instruction: inst.instruction || ''
          })))
        }

        // Switch to manual mode for review/editing
        setInputMethod('manual')
        setImporting(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setError('An error occurred while analyzing the photo')
      setImporting(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRecipeImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image too large. Please use an image under 5MB.')
        return
      }

      // Convert to base64 for storage
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64String = reader.result as string
        setImageUrl(base64String)
        setImagePreview(base64String)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recipeName,
          description: description || null,
          servings,
          prepTimeMinutes: prepTimeMinutes || null,
          cookTimeMinutes: cookTimeMinutes || null,
          cuisineType: cuisineType || null,
          difficultyLevel: difficultyLevel || null,
          mealCategory,
          tags,
          sourceUrl: sourceUrl || null,
          imageUrl: imageUrl || null,
          ingredients: ingredients.filter(i => i.ingredientName && i.unit),
          instructions: instructions.filter(i => i.instruction),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create recipe')
        setLoading(false)
        return
      }

      router.push('/recipes')
      router.refresh()
    } catch (err) {
      setError('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredientName: '', quantity: 1, unit: '' }])
  }

  const removeIngredient = (index: number) => {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/recipes" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
          ← Back to Recipes
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Recipe</h1>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Input Method Tabs */}
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex space-x-4 mb-6 border-b">
            <button
              onClick={() => setInputMethod('manual')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'manual'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setInputMethod('url')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'url'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Import from URL
            </button>
            <button
              onClick={() => setInputMethod('photo')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'photo'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Import from Photo
            </button>
          </div>

          {/* URL Import Section */}
          {inputMethod === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe URL
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Enter the URL of a recipe from any website. We'll automatically extract the recipe details for you to review and edit.
                </p>
                <input
                  type="url"
                  placeholder="https://www.example.com/recipe"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={importing || !importUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Recipe'}
              </button>
            </div>
          )}

          {/* Photo Import Section */}
          {inputMethod === 'photo' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipe Photo
                </label>
                <p className="text-sm text-gray-500 mb-3">
                  Upload a photo of your dish and we'll use AI to identify it and suggest a recipe with ingredients and instructions.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {photoPreview && (
                <div className="mt-4">
                  <img
                    src={photoPreview}
                    alt="Recipe preview"
                    className="max-w-sm rounded-lg shadow-md"
                  />
                </div>
              )}
              {photoFile && (
                <button
                  type="button"
                  onClick={() => handlePhotoImport(photoFile)}
                  disabled={importing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? 'Analyzing...' : 'Analyze Photo'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Manual Entry Form - Only show when in manual mode */}
        {inputMethod === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
              <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">Recipe Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipe Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRecipeImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {imagePreview && (
                  <div className="mt-3">
                    <img
                      src={imagePreview}
                      alt="Recipe preview"
                      className="max-w-sm rounded-lg shadow-md"
                    />
                  </div>
                )}
              </div>

              {sourceUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source URL</label>
                  <input
                    type="url"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Servings *</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      min="1"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                      value={servings}
                      onChange={(e) => handleServingsChange(parseInt(e.target.value))}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="scale-ingredients"
                        checked={scaleIngredients}
                        onChange={handleScaleToggle}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        title="When checked, ingredient quantities will automatically scale when you change servings"
                      />
                      <label
                        htmlFor="scale-ingredients"
                        className="text-xs text-gray-600 whitespace-nowrap cursor-help"
                        title="When checked, ingredient quantities will automatically scale when you change servings"
                      >
                        Scale
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Prep Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Cook Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cuisine Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Italian, Mexican, Asian"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Difficulty</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                    value={difficultyLevel}
                    onChange={(e) => setDifficultyLevel(e.target.value)}
                  >
                    <option value="">Select difficulty</option>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Meal Categories</label>
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
              </div>
            </div>

            <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Ingredients</h3>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add Ingredient
                </button>
              </div>

              {ingredients.map((ing, index) => {
                const rating = getIngredientRating(ing.ingredientName)
                return (
                  <div key={index} className="flex gap-2 items-center">
                    {/* Traffic Light Indicator */}
                    {rating && (
                      <div
                        className={`w-3 h-3 rounded-full ${getTrafficLightClass(rating.rating)} flex-shrink-0`}
                        title={rating.reason}
                      />
                    )}
                    {!rating && macroAnalysis && (
                      <div className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />
                    )}

                    <div className="grid grid-cols-12 gap-2 items-center flex-1">
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        className="col-span-5 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
                        value={ing.ingredientName}
                        onChange={(e) => updateIngredient(index, 'ingredientName', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min="0"
                        step="0.1"
                        className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        className="col-span-2 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
                        value={ing.notes || ''}
                        onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                      />
                      <button
                        type="button"
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

            <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Instructions</h3>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Add Step
                </button>
              </div>

              {instructions.map((inst, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-blue-100 text-blue-800 font-medium text-sm">
                    {inst.stepNumber}
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Describe this step..."
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border text-sm"
                    value={inst.instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="text-red-600 hover:text-red-800 text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Macro Analysis Section */}
            {macroAnalysis && (
              <div className="bg-white shadow-sm rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Nutritional Analysis</h3>
                  <button
                    type="button"
                    onClick={fetchMacroAnalysis}
                    disabled={loadingMacros}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loadingMacros ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>

                {/* Overall Rating */}
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full ${getTrafficLightClass(macroAnalysis.overallRating)} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Overall Rating</p>
                    <p className="text-sm text-gray-600 mt-1">{macroAnalysis.overallExplanation}</p>
                  </div>
                </div>

                {/* Macro Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{Math.round(macroAnalysis.perServing.calories)}</p>
                    <p className="text-xs text-gray-600 mt-1">Calories</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{Math.round(macroAnalysis.perServing.protein)}g</p>
                    <p className="text-xs text-gray-600 mt-1">Protein</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{Math.round(macroAnalysis.perServing.carbs)}g</p>
                    <p className="text-xs text-gray-600 mt-1">Carbs</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-50 rounded-lg">
                    <p className="text-2xl font-bold text-yellow-600">{Math.round(macroAnalysis.perServing.fat)}g</p>
                    <p className="text-xs text-gray-600 mt-1">Fat</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-gray-700">{Math.round(macroAnalysis.perServing.fiber)}g</p>
                    <p className="text-xs text-gray-500">Fiber</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-700">{Math.round(macroAnalysis.perServing.sugar)}g</p>
                    <p className="text-xs text-gray-500">Sugar</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-gray-700">{Math.round(macroAnalysis.perServing.sodium)}mg</p>
                    <p className="text-xs text-gray-500">Sodium</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sarah Nutritionist Feedback */}
            {nutritionistFeedback && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 shadow-sm rounded-lg p-6">
                <div className="flex items-start gap-4">
                  {/* Sarah Avatar */}
                  <div className="flex-shrink-0">
                    <Image
                      src="/sarah-nutritionist.png"
                      alt="Sarah - Your AI Nutritionist"
                      width={80}
                      height={80}
                      className="rounded-full border-4 border-white shadow-md"
                    />
                  </div>

                  {/* Feedback Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">Sarah's Nutritionist Tips</h3>
                      {loadingFeedback && <span className="text-xs text-gray-500">Analyzing...</span>}
                    </div>
                    <p className="text-gray-700 leading-relaxed">{nutritionistFeedback}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                href="/recipes"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Recipe'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
