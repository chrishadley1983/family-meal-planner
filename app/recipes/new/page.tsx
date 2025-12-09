'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AppLayout, PageContainer } from '@/components/layout'
import { useSession } from 'next-auth/react'

type InputMethod = 'manual' | 'url' | 'photo' | 'text'

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
  const { data: session } = useSession()
  const [inputMethod, setInputMethod] = useState<InputMethod>('manual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // URL import state
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  // Photo import state (supports multiple photos)
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [showCamera, setShowCamera] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Text import state
  const [importText, setImportText] = useState('')

  // Recipe form state
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState(4)
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>('')
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>('')
  const [cuisineType, setCuisineType] = useState('')
  const [difficultyLevel, setDifficultyLevel] = useState('')
  const [mealType, setMealCategory] = useState<string[]>([])
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
  const [baseIngredients, setBaseIngredients] = useState<Array<{
    ingredientName: string
    quantity: number
    unit: string
    category?: string
    notes?: string
  }>>([])
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
            mealType,
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
    // Validate input
    if (!newServings || isNaN(newServings) || newServings < 1) {
      return
    }

    if (scaleIngredients && baseServings > 0 && baseIngredients.length > 0) {
      const scaleFactor = newServings / baseServings
      const scaledIngredients = baseIngredients.map((baseIng, index) => {
        // Get corresponding current ingredient to preserve other fields
        const currentIng = ingredients[index]
        return {
          ingredientName: baseIng.ingredientName,
          quantity: Math.round(baseIng.quantity * scaleFactor * 100) / 100,
          unit: baseIng.unit,
          category: currentIng?.category || baseIng.category,
          notes: currentIng?.notes || baseIng.notes,
        }
      })

      // Only update if we have valid ingredients
      if (scaledIngredients.length > 0) {
        setIngredients(scaledIngredients)
      }
    }
    setServings(newServings)
  }

  // Toggle scale checkbox
  const handleScaleToggle = () => {
    if (!scaleIngredients) {
      // User is turning ON scaling - capture current state as base
      setBaseServings(servings)
      setBaseIngredients(ingredients.map(i => ({ ...i })))
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
      const importedServings = recipe.servings || 4
      setServings(importedServings)
      setPrepTimeMinutes(recipe.prepTimeMinutes || '')
      setCookTimeMinutes(recipe.cookTimeMinutes || '')
      setCuisineType(recipe.cuisineType || '')
      setDifficultyLevel(recipe.difficultyLevel || '')
      setMealCategory(recipe.mealType || [])
      setSourceUrl(recipe.sourceUrl || importUrl)

      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const importedIngredients = recipe.ingredients.map((ing: any) => ({
          ingredientName: ing.ingredientName || '',
          quantity: ing.quantity || 1,
          unit: ing.unit || '',
          notes: ing.notes || ''
        }))
        setIngredients(importedIngredients)
        // Initialize base values for scaling
        setBaseServings(importedServings)
        setBaseIngredients(importedIngredients.map((i: any) => ({ ...i })))
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

  const handleTextImport = async () => {
    if (!importText.trim()) {
      setError('Please enter some recipe text')
      return
    }

    setImporting(true)
    setError('')

    try {
      console.log('🔷 Parsing recipe text with AI...')
      const response = await fetch('/api/recipes/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to parse recipe text')
        setImporting(false)
        return
      }

      console.log('🟢 Recipe text parsed successfully')

      // Populate form with parsed recipe data
      const recipe = data.recipe
      setRecipeName(recipe.recipeName || '')
      setDescription(recipe.description || '')
      const importedServings = recipe.servings || 4
      setServings(importedServings)
      setPrepTimeMinutes(recipe.prepTimeMinutes || '')
      setCookTimeMinutes(recipe.cookTimeMinutes || '')
      setCuisineType(recipe.cuisineType || '')
      setDifficultyLevel(recipe.difficultyLevel || '')
      setMealCategory(recipe.mealType || [])

      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const importedIngredients = recipe.ingredients.map((ing: any) => ({
          ingredientName: ing.ingredientName || '',
          quantity: ing.quantity || 1,
          unit: ing.unit || '',
          notes: ing.notes || ''
        }))
        setIngredients(importedIngredients)
        // Initialize base values for scaling
        setBaseServings(importedServings)
        setBaseIngredients(importedIngredients.map((i: any) => ({ ...i })))
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
      console.error('❌ Error parsing recipe text:', err)
      setError('An error occurred while parsing the recipe text')
      setImporting(false)
    }
  }

  const handlePhotoImport = async () => {
    if (photoFiles.length === 0) {
      setError('Please add at least one photo first')
      return
    }

    setImporting(true)
    setError('')

    try {
      console.log(`🔷 Analyzing ${photoFiles.length} photo(s)...`)

      // Convert all images to base64
      const imagePromises = photoFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(file)
        })
      })

      const images = await Promise.all(imagePromises)

      const response = await fetch('/api/recipes/import-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to analyze recipe photo(s)')
        setImporting(false)
        return
      }

      console.log('🟢 Recipe analysis complete:', data.recipe.recipeName)

      // Populate form with analyzed recipe data
      const recipe = data.recipe
      setRecipeName(recipe.recipeName || '')
      setDescription(recipe.description || '')
      setServings(recipe.servings || 4)
      setCuisineType(recipe.cuisineType || '')
      setDifficultyLevel(recipe.difficultyLevel || '')
      setMealCategory(recipe.mealType || [])

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
    } catch (err) {
      console.error('❌ Error analyzing photo(s):', err)
      setError('An error occurred while analyzing the photo(s)')
      setImporting(false)
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    // Validate file sizes (max 3.75MB each to account for base64 encoding overhead)
    // Base64 encoding increases size by ~33%, so 3.75MB * 1.33 = ~5MB (Claude's limit)
    const maxSize = 3.75 * 1024 * 1024
    const invalidFiles = files.filter(f => f.size > maxSize)
    if (invalidFiles.length > 0) {
      setError(`${invalidFiles.length} image(s) too large. Please use images under 3.75MB each (Claude API limit).`)
      return
    }

    // Add new files to existing ones
    const newFiles = [...photoFiles, ...files]
    setPhotoFiles(newFiles)

    // Create previews for all new files
    const newPreviews: string[] = []
    let processed = 0

    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        processed++

        if (processed === files.length) {
          setPhotoPreviews([...photoPreviews, ...newPreviews])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  // Handle clipboard paste for screenshots
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return

    const imageItems = Array.from(items).filter(item => item.type.startsWith('image/'))
    if (imageItems.length === 0) return

    e.preventDefault()
    console.log(`📋 Pasted ${imageItems.length} image(s) from clipboard`)

    const newFiles: File[] = []
    const newPreviews: string[] = []
    let processed = 0

    const maxSize = 3.75 * 1024 * 1024

    imageItems.forEach(item => {
      const file = item.getAsFile()
      if (file) {
        // Validate file size
        if (file.size > maxSize) {
          setError('Pasted image too large. Please use images under 3.75MB (Claude API limit).')
          return
        }

        newFiles.push(file)

        const reader = new FileReader()
        reader.onloadend = () => {
          newPreviews.push(reader.result as string)
          processed++

          if (processed === imageItems.length) {
            setPhotoFiles([...photoFiles, ...newFiles])
            setPhotoPreviews([...photoPreviews, ...newPreviews])
          }
        }
        reader.readAsDataURL(file)
      }
    })
  }

  // Open webcam modal
  const handleOpenCamera = async () => {
    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })

      streamRef.current = stream
      setShowCamera(true)

      // Wait for video element to be ready
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      }, 100)

      console.log('📷 Webcam opened')
    } catch (err) {
      console.error('❌ Error accessing camera:', err)
      setError('Could not access camera. Please check permissions.')
    }
  }

  // Close webcam and stop stream
  const handleCloseCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setShowCamera(false)
  }

  // Capture photo from webcam
  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return

      // Validate file size
      const maxSize = 3.75 * 1024 * 1024
      if (blob.size > maxSize) {
        setError('Photo too large. Please try again with better lighting (reduces file size).')
        return
      }

      // Convert blob to File
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' })

      console.log('📷 Photo captured from webcam')

      // Add to photos
      setPhotoFiles([...photoFiles, file])

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviews([...photoPreviews, reader.result as string])
      }
      reader.readAsDataURL(file)

      // Close camera
      handleCloseCamera()
    }, 'image/jpeg', 0.85) // 85% quality to keep file size down
  }

  // Handle mobile camera file input (fallback)
  const handleMobileCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    const maxSize = 3.75 * 1024 * 1024
    if (file.size > maxSize) {
      setError('Camera photo too large. Please use a lower resolution or compress the image.')
      return
    }

    console.log('📷 Camera photo captured (mobile)')

    // Add to existing photos
    setPhotoFiles([...photoFiles, file])

    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreviews([...photoPreviews, reader.result as string])
    }
    reader.readAsDataURL(file)
  }

  // Remove a photo from the list
  const handleRemovePhoto = (index: number) => {
    setPhotoFiles(photoFiles.filter((_, i) => i !== index))
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index))
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
          mealType,
          tags,
          sourceUrl: sourceUrl || null,
          imageUrl: imageUrl || null,
          caloriesPerServing: macroAnalysis?.perServing?.calories ? Math.round(macroAnalysis.perServing.calories) : null,
          proteinPerServing: macroAnalysis?.perServing?.protein ? Math.round(macroAnalysis.perServing.protein * 10) / 10 : null,
          carbsPerServing: macroAnalysis?.perServing?.carbs ? Math.round(macroAnalysis.perServing.carbs * 10) / 10 : null,
          fatPerServing: macroAnalysis?.perServing?.fat ? Math.round(macroAnalysis.perServing.fat * 10) / 10 : null,
          fiberPerServing: macroAnalysis?.perServing?.fiber ? Math.round(macroAnalysis.perServing.fiber * 10) / 10 : null,
          sugarPerServing: macroAnalysis?.perServing?.sugar ? Math.round(macroAnalysis.perServing.sugar * 10) / 10 : null,
          sodiumPerServing: macroAnalysis?.perServing?.sodium ? Math.round(macroAnalysis.perServing.sodium) : null,
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
    <AppLayout userEmail={session?.user?.email}>
      <PageContainer maxWidth="2xl">
        <Link href="/recipes" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
          ← Back to Recipes
        </Link>
        <h1 className="text-3xl font-bold text-white mb-8">Create New Recipe</h1>

        {error && (
          <div className="rounded-md bg-red-900/20 border border-red-900/50 p-4 mb-6">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Input Method Tabs */}
        <div className="card p-6 mb-6">
          <div className="flex space-x-4 mb-6 border-b border-zinc-700">
            <button
              onClick={() => setInputMethod('manual')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'manual'
                  ? 'border-b-2 border-purple-600 text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Manual Entry
            </button>
            <button
              onClick={() => setInputMethod('url')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'url'
                  ? 'border-b-2 border-purple-600 text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Import from URL
            </button>
            <button
              onClick={() => setInputMethod('photo')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'photo'
                  ? 'border-b-2 border-purple-600 text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Import from Photo
            </button>
            <button
              onClick={() => setInputMethod('text')}
              className={`pb-2 px-1 font-medium text-sm ${
                inputMethod === 'text'
                  ? 'border-b-2 border-purple-600 text-purple-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              Add from Text
            </button>
          </div>

          {/* URL Import Section */}
          {inputMethod === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Recipe URL
                </label>
                <p className="text-sm text-zinc-400 mb-3">
                  Enter the URL of a recipe from any website. We'll automatically extract the recipe details for you to review and edit.
                </p>
                <input
                  type="url"
                  placeholder="https://www.example.com/recipe"
                  className="block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={handleUrlImport}
                disabled={importing || !importUrl}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Recipe'}
              </button>
            </div>
          )}

          {/* Photo Import Section */}
          {inputMethod === 'photo' && (
            <div className="space-y-4" onPaste={handlePaste}>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Recipe Photos ({photoFiles.length} added)
                </label>
                <p className="text-sm text-zinc-400 mb-3">
                  Upload images of your recipe. Supports both food photos AND text-based images:
                </p>
                <ul className="text-sm text-zinc-400 mb-3 list-disc list-inside space-y-1">
                  <li>📝 Recipe cards, printed recipes, or handwritten notes</li>
                  <li>📱 Screenshots from websites, apps, or cookbooks</li>
                  <li>🍽️ Photos of prepared dishes (AI will suggest ingredients)</li>
                  <li>📄 Multiple images (e.g., front/back of recipe card)</li>
                  <li>📋 Paste screenshots (Ctrl+V or Cmd+V)</li>
                  <li>📸 Take a live photo with your camera</li>
                  <li className="text-amber-400">⚠️ Max 3.75MB per image (Claude API limit)</li>
                </ul>

                {/* File Upload */}
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoChange}
                    className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-900/30 file:text-purple-300 hover:file:bg-purple-900/50"
                  />

                  {/* Camera Capture */}
                  <div className="flex gap-2">
                    {/* Desktop: Opens webcam modal */}
                    <button
                      type="button"
                      onClick={handleOpenCamera}
                      className="flex-1 px-4 py-2 bg-green-900/30 text-green-300 rounded-md hover:bg-green-900/50 text-center text-sm font-medium border border-green-800"
                    >
                      📷 Take Photo (Webcam)
                    </button>

                    {/* Mobile: Opens native camera */}
                    <label className="flex-1 cursor-pointer md:hidden">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleMobileCameraCapture}
                        className="hidden"
                      />
                      <div className="px-4 py-2 bg-green-900/30 text-green-300 rounded-md hover:bg-green-900/50 text-center text-sm font-medium border border-green-800">
                        📷 Take Photo (Camera)
                      </div>
                    </label>
                  </div>

                  <p className="text-xs text-zinc-500">
                    💡 Tip: Click anywhere in this section and press Ctrl+V (or Cmd+V) to paste a screenshot
                  </p>
                </div>
              </div>

              {/* Photo Previews Grid */}
              {photoPreviews.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-zinc-300 mb-2">
                    Photos to Analyze ({photoPreviews.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Recipe photo ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg shadow-md"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                          title="Remove photo"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
                          #{index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analyze Button */}
              {photoFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handlePhotoImport}
                  disabled={importing}
                  className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {importing ? 'Analyzing...' : `Analyze ${photoFiles.length} Photo${photoFiles.length > 1 ? 's' : ''}`}
                </button>
              )}
            </div>
          )}

          {/* Text Import Section */}
          {inputMethod === 'text' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Recipe Text
                </label>
                <p className="text-sm text-zinc-400 mb-3">
                  Paste your recipe text here. Can be from any source:
                </p>
                <ul className="text-sm text-zinc-400 mb-3 list-disc list-inside space-y-1">
                  <li>📋 Copied from a website, email, or document</li>
                  <li>📝 Recipe card text you've typed out</li>
                  <li>📖 Text from a cookbook or magazine</li>
                  <li>💬 Shared recipe from a friend</li>
                  <li>✨ Any format - AI will parse and structure it</li>
                </ul>
                <textarea
                  placeholder="Paste your recipe text here...

Example:
Chocolate Chip Cookies

Ingredients:
- 2 cups flour
- 1 cup butter
- 3/4 cup sugar
- 2 eggs
- 1 tsp vanilla
- 1 cup chocolate chips

Instructions:
1. Preheat oven to 350°F
2. Mix butter and sugar
3. Add eggs and vanilla
4. Stir in flour
5. Fold in chocolate chips
6. Bake for 10-12 minutes"
                  className="block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border min-h-[300px] font-mono text-sm"
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  rows={15}
                />
              </div>
              <button
                type="button"
                onClick={handleTextImport}
                disabled={importing || !importText.trim()}
                className="px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {importing ? 'Parsing...' : 'Parse Recipe Text'}
              </button>
            </div>
          )}
        </div>

        {/* Manual Entry Form - Only show when in manual mode */}
        {inputMethod === 'manual' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card p-6 space-y-6">
              <h3 className="text-lg font-medium text-white">Basic Information</h3>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Recipe Name *</label>
                <input
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                  value={recipeName}
                  onChange={(e) => setRecipeName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300">Description</label>
                <textarea
                  rows={3}
                  className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Recipe Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRecipeImageChange}
                  className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-900/30 file:text-purple-300 hover:file:bg-purple-900/50"
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
                  <label className="block text-sm font-medium text-zinc-300">Source URL</label>
                  <input
                    type="url"
                    className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Servings *</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      required
                      min="1"
                      className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                      value={servings}
                      onChange={(e) => handleServingsChange(parseInt(e.target.value))}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="checkbox"
                        id="scale-ingredients"
                        checked={scaleIngredients}
                        onChange={handleScaleToggle}
                        className="rounded border-zinc-700 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                        title="When checked, ingredient quantities will automatically scale when you change servings"
                      />
                      <label
                        htmlFor="scale-ingredients"
                        className="text-xs text-zinc-400 whitespace-nowrap cursor-help"
                        title="When checked, ingredient quantities will automatically scale when you change servings"
                      >
                        Scale
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300">Prep Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                    value={prepTimeMinutes}
                    onChange={(e) => setPrepTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300">Cook Time (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                    value={cookTimeMinutes}
                    onChange={(e) => setCookTimeMinutes(e.target.value ? parseInt(e.target.value) : '')}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300">Cuisine Type</label>
                  <input
                    type="text"
                    placeholder="e.g., Italian, Mexican, Asian"
                    className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300">Difficulty</label>
                  <select
                    className="mt-1 block w-full rounded-md bg-zinc-800 border-zinc-700 text-white focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
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
                <label className="block text-sm font-medium text-zinc-300 mb-2">Meal Categories</label>
                <div className="flex flex-wrap gap-2">
                  {mealCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        mealType.includes(cat)
                          ? 'bg-purple-600 text-white'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Ingredients</h3>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
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
                      <div className="w-3 h-3 rounded-full bg-zinc-700 flex-shrink-0" />
                    )}

                    <div className="grid grid-cols-12 gap-2 items-center flex-1">
                      <input
                        type="text"
                        placeholder="Ingredient name"
                        className="col-span-5 rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border text-sm"
                        value={ing.ingredientName}
                        onChange={(e) => updateIngredient(index, 'ingredientName', e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min="0"
                        step="0.1"
                        className="col-span-2 rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border text-sm"
                        value={ing.quantity}
                        onChange={(e) => updateIngredient(index, 'quantity', parseFloat(e.target.value))}
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        className="col-span-2 rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border text-sm"
                        value={ing.unit}
                        onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                      />
                      <input
                        type="text"
                        placeholder="Notes"
                        className="col-span-2 rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border text-sm"
                        value={ing.notes || ''}
                        onChange={(e) => updateIngredient(index, 'notes', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeIngredient(index)}
                        className="col-span-1 text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="card p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-white">Instructions</h3>
                <button
                  type="button"
                  onClick={addInstruction}
                  className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700"
                >
                  Add Step
                </button>
              </div>

              {instructions.map((inst, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-purple-900/30 text-purple-300 font-medium text-sm">
                    {inst.stepNumber}
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Describe this step..."
                    className="flex-1 rounded-md bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border text-sm"
                    value={inst.instruction}
                    onChange={(e) => updateInstruction(index, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="text-red-400 hover:text-red-300 text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Macro Analysis Section */}
            {macroAnalysis && (
              <div className="card p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-white">Nutritional Analysis</h3>
                  <button
                    type="button"
                    onClick={fetchMacroAnalysis}
                    disabled={loadingMacros}
                    className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loadingMacros ? 'Analyzing...' : 'Refresh'}
                  </button>
                </div>

                {/* Overall Rating */}
                <div className="flex items-start gap-4 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                  <div className={`w-8 h-8 rounded-full ${getTrafficLightClass(macroAnalysis.overallRating)} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="font-medium text-white">Overall Rating</p>
                    <p className="text-sm text-zinc-400 mt-1">{macroAnalysis.overallExplanation}</p>
                  </div>
                </div>

                {/* Macro Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-blue-900/30 rounded-lg border border-blue-800">
                    <p className="text-2xl font-bold text-blue-400">{Math.round(macroAnalysis.perServing.calories)}</p>
                    <p className="text-xs text-zinc-400 mt-1">Calories</p>
                  </div>
                  <div className="text-center p-3 bg-purple-900/30 rounded-lg border border-purple-800">
                    <p className="text-2xl font-bold text-purple-400">{Math.round(macroAnalysis.perServing.protein)}g</p>
                    <p className="text-xs text-zinc-400 mt-1">Protein</p>
                  </div>
                  <div className="text-center p-3 bg-green-900/30 rounded-lg border border-green-800">
                    <p className="text-2xl font-bold text-green-400">{Math.round(macroAnalysis.perServing.carbs)}g</p>
                    <p className="text-xs text-zinc-400 mt-1">Carbs</p>
                  </div>
                  <div className="text-center p-3 bg-yellow-900/30 rounded-lg border border-yellow-800">
                    <p className="text-2xl font-bold text-yellow-400">{Math.round(macroAnalysis.perServing.fat)}g</p>
                    <p className="text-xs text-zinc-400 mt-1">Fat</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-zinc-300">{Math.round(macroAnalysis.perServing.fiber)}g</p>
                    <p className="text-xs text-zinc-500">Fiber</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-300">{Math.round(macroAnalysis.perServing.sugar)}g</p>
                    <p className="text-xs text-zinc-500">Sugar</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-zinc-300">{Math.round(macroAnalysis.perServing.sodium)}mg</p>
                    <p className="text-xs text-zinc-500">Sodium</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sarah Nutritionist Feedback */}
            {nutritionistFeedback && (
              <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800/50 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  {/* Sarah Avatar */}
                  <div className="flex-shrink-0">
                    <Image
                      src="/sarah-nutritionist.png"
                      alt="Sarah - Your AI Nutritionist"
                      width={80}
                      height={80}
                      className="rounded-full border-4 border-zinc-700 shadow-md"
                    />
                  </div>

                  {/* Feedback Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">Sarah's Nutritionist Tips</h3>
                      {loadingFeedback && <span className="text-xs text-zinc-400">Analyzing...</span>}
                    </div>
                    <p className="text-zinc-300 leading-relaxed">{nutritionistFeedback}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                href="/recipes"
                className="px-4 py-2 border border-zinc-700 rounded-md text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Recipe'}
              </button>
            </div>
          </form>
        )}
      </PageContainer>

      {/* Webcam Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="p-4 border-b border-zinc-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">Take Photo with Webcam</h3>
              <button
                onClick={handleCloseCamera}
                className="text-zinc-400 hover:text-zinc-300"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              {/* Video Preview */}
              <div className="relative bg-black rounded-lg overflow-hidden mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-auto"
                />
              </div>

              {/* Hidden canvas for capturing */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCapturePhoto}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                >
                  📸 Capture Photo
                </button>
                <button
                  onClick={handleCloseCamera}
                  className="px-6 py-3 bg-zinc-800 text-zinc-300 rounded-md hover:bg-zinc-700 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
