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
import { useAILoading } from '@/components/providers/AILoadingProvider'
import { useNotification } from '@/components/providers/NotificationProvider'
import { ChatMessage, IngredientModification, InstructionModification, ProjectedNutrition } from '@/lib/types/nutritionist'

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
  const { startLoading, stopLoading } = useAILoading()
  const { error, warning } = useNotification()
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

  // Interactive Nutritionist Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [projectedNutrition, setProjectedNutrition] = useState<ProjectedNutrition | null>(null)

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

  // Available units for dropdown
  const [availableUnits, setAvailableUnits] = useState<Record<string, Array<{
    code: string
    name: string
    abbreviation: string
  }>>>({})

  // Fetch available units on mount
  useEffect(() => {
    const fetchUnits = async () => {
      try {
        const response = await fetch('/api/units?groupByCategory=true')
        if (response.ok) {
          const data = await response.json()
          setAvailableUnits(data.units || {})
        }
      } catch (err) {
        console.error('Failed to fetch units:', err)
      }
    }
    fetchUnits()
  }, [])

  // Fetch AI analysis
  const fetchAIAnalysis = async (recipeData: any) => {
    console.log('🔍 fetchAIAnalysis called with recipe:', recipeData?.recipeName)
    if (!recipeData) {
      console.log('❌ No recipe data, returning early')
      return
    }

    console.log('✅ Starting AI analysis...')
    setLoadingAI(true)
    startLoading('Analyzing nutritional information...')
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

        // Sync macro values to database (keeps filter values in sync with displayed values)
        if (macroData.analysis?.perServing) {
          console.log('🔄 Syncing macros to database...')
          try {
            const syncResponse = await fetch(`/api/recipes/${id}/sync-macros`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                caloriesPerServing: macroData.analysis.perServing.calories ? Math.round(macroData.analysis.perServing.calories) : null,
                proteinPerServing: macroData.analysis.perServing.protein ? Math.round(macroData.analysis.perServing.protein * 10) / 10 : null,
                carbsPerServing: macroData.analysis.perServing.carbs ? Math.round(macroData.analysis.perServing.carbs * 10) / 10 : null,
                fatPerServing: macroData.analysis.perServing.fat ? Math.round(macroData.analysis.perServing.fat * 10) / 10 : null,
                fiberPerServing: macroData.analysis.perServing.fiber ? Math.round(macroData.analysis.perServing.fiber * 10) / 10 : null,
                sugarPerServing: macroData.analysis.perServing.sugar ? Math.round(macroData.analysis.perServing.sugar * 10) / 10 : null,
                sodiumPerServing: macroData.analysis.perServing.sodium ? Math.round(macroData.analysis.perServing.sodium) : null,
              })
            })
            if (syncResponse.ok) {
              const syncData = await syncResponse.json()
              console.log('✅ Macros synced:', syncData.synced ? 'updated' : 'already in sync')
            } else {
              console.warn('⚠️ Failed to sync macros:', syncResponse.status)
            }
          } catch (syncErr) {
            console.warn('⚠️ Failed to sync macros:', syncErr)
          }
        }

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
      stopLoading()
    }
  }

  // Fetch initial suggested prompts when macro analysis is available
  const fetchSuggestedPrompts = async (analysis: MacroAnalysis) => {
    try {
      const params = new URLSearchParams({
        overallRating: analysis.overallRating,
        protein: String(analysis.perServing.protein),
        fat: String(analysis.perServing.fat),
        carbs: String(analysis.perServing.carbs),
        sodium: String(analysis.perServing.sodium),
        fiber: String(analysis.perServing.fiber),
      })
      const response = await fetch(`/api/recipes/nutritionist-chat?${params}`)
      if (response.ok) {
        const data = await response.json()
        setSuggestedPrompts(data.suggestedPrompts || [])
      }
    } catch (err) {
      console.error('❌ Failed to fetch suggested prompts:', err)
    }
  }

  // Send a message to the nutritionist chat
  const sendChatMessage = async (message: string) => {
    if (!message.trim() || !macroAnalysis) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: new Date(),
    }

    setChatMessages((prev: ChatMessage[]) => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      console.log('🗣️ Sending chat message:', message.substring(0, 50))
      const response = await fetch('/api/recipes/nutritionist-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            recipeName,
            servings,
            mealType,
            ingredients: ingredients.filter(i => i.ingredientName && i.unit),
            instructions: instructions.filter(i => i.instruction),
          },
          macroAnalysis,
          conversationHistory: chatMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          userMessage: message.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()
        console.log('🟢 Chat response received:', {
          hasIngredientMods: !!data.ingredientModifications?.length,
          hasInstructionMods: !!data.instructionModifications?.length,
          suggestedPrompts: data.suggestedPrompts?.length,
          projectedNutrition: data.projectedNutrition,
        })

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
        }
        setChatMessages((prev: ChatMessage[]) => [...prev, assistantMessage])
        setSuggestedPrompts(data.suggestedPrompts || [])

        // Save projected nutrition for display/validation
        if (data.projectedNutrition) {
          setProjectedNutrition(data.projectedNutrition)
          console.log('📊 Projected nutrition after changes:', data.projectedNutrition)
        }

        // Apply ingredient modifications if any
        if (data.ingredientModifications && data.ingredientModifications.length > 0) {
          const updatedIngredients = applyIngredientModifications(data.ingredientModifications)
          // Clear projected nutrition - macro analysis will refresh via useEffect
          setProjectedNutrition(null)
          console.log('🔄 Ingredient modifications applied, macro analysis will auto-refresh:', updatedIngredients.length, 'ingredients')
        }

        // Apply instruction modifications if any
        if (data.instructionModifications && data.instructionModifications.length > 0) {
          applyInstructionModifications(data.instructionModifications)
        }
      } else {
        console.error('❌ Chat request failed')
        const errorMessage: ChatMessage = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm having trouble responding right now. Please try again.",
          timestamp: new Date(),
        }
        setChatMessages((prev: ChatMessage[]) => [...prev, errorMessage])
      }
    } catch (err) {
      console.error('❌ Failed to send chat message:', err)
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: "Something went wrong. Please try again.",
        timestamp: new Date(),
      }
      setChatMessages((prev: ChatMessage[]) => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  // Apply ingredient modifications from the nutritionist
  // Returns the updated ingredients array for immediate use (avoids closure issues)
  const applyIngredientModifications = (modifications: IngredientModification[]): typeof ingredients => {
    console.log('⚡ Applying ingredient modifications:', modifications)
    saveToHistory() // Save current state for undo

    let updatedIngredients = [...ingredients]

    for (const mod of modifications) {
      switch (mod.action) {
        case 'add':
          if (mod.newIngredient) {
            updatedIngredients.push({
              ingredientName: mod.newIngredient.name,
              quantity: mod.newIngredient.quantity,
              unit: mod.newIngredient.unit,
              notes: mod.newIngredient.notes || '',
            })
            console.log('✅ Added ingredient:', mod.newIngredient.name)
          }
          break

        case 'remove':
          updatedIngredients = updatedIngredients.filter(
            ing => ing.ingredientName.toLowerCase() !== mod.ingredientName.toLowerCase()
          )
          console.log('✅ Removed ingredient:', mod.ingredientName)
          break

        case 'replace':
          if (mod.newIngredient) {
            const index = updatedIngredients.findIndex(
              ing => ing.ingredientName.toLowerCase() === mod.ingredientName.toLowerCase()
            )
            if (index !== -1) {
              updatedIngredients[index] = {
                ingredientName: mod.newIngredient.name,
                quantity: mod.newIngredient.quantity,
                unit: mod.newIngredient.unit,
                notes: mod.newIngredient.notes || '',
              }
              console.log('✅ Replaced ingredient:', mod.ingredientName, '→', mod.newIngredient.name)
            }
          }
          break

        case 'adjust':
          if (mod.newIngredient) {
            const index = updatedIngredients.findIndex(
              ing => ing.ingredientName.toLowerCase() === mod.ingredientName.toLowerCase()
            )
            if (index !== -1) {
              updatedIngredients[index] = {
                ...updatedIngredients[index],
                quantity: mod.newIngredient.quantity,
                unit: mod.newIngredient.unit || updatedIngredients[index].unit,
              }
              console.log('✅ Adjusted ingredient:', mod.ingredientName, 'to', mod.newIngredient.quantity, mod.newIngredient.unit)
            }
          }
          break
      }
    }

    setIngredients(updatedIngredients)
    console.log('🔄 Ingredients state updated, useEffect will auto-trigger macro analysis')
    return updatedIngredients
  }

  // Apply instruction modifications from the nutritionist
  const applyInstructionModifications = (modifications: InstructionModification[]) => {
    console.log('⚡ Applying instruction modifications:', modifications)
    saveToHistory() // Save current state for undo

    let updatedInstructions = [...instructions]

    for (const mod of modifications) {
      switch (mod.action) {
        case 'add':
          // Add new instruction at the end
          const newStepNumber = updatedInstructions.length + 1
          updatedInstructions.push({
            stepNumber: newStepNumber,
            instruction: mod.instruction,
          })
          console.log('✅ Added instruction step:', newStepNumber)
          break

        case 'update':
          if (mod.stepNumber !== undefined) {
            const index = updatedInstructions.findIndex(
              inst => inst.stepNumber === mod.stepNumber
            )
            if (index !== -1) {
              updatedInstructions[index] = {
                ...updatedInstructions[index],
                instruction: mod.instruction,
              }
              console.log('✅ Updated instruction step:', mod.stepNumber)
            }
          }
          break
      }
    }

    setInstructions(updatedInstructions)
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
      // Debounce the analysis fetch (0.5 seconds after user stops typing)
      const timer = setTimeout(() => {
        console.log('🔄 Auto-refreshing AI analysis while editing')
        fetchAIAnalysis({ recipeName, servings, ingredients, mealType })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isEditing, recipeName, ingredients, servings, mealType])

  // Initialize chat with nutritionist feedback when entering edit mode
  useEffect(() => {
    if (isEditing && nutritionistFeedback && chatMessages.length === 0) {
      console.log('💬 Initializing nutritionist chat with initial feedback')
      const initialMessage: ChatMessage = {
        id: 'initial-feedback',
        role: 'assistant',
        content: nutritionistFeedback,
        timestamp: new Date(),
      }
      setChatMessages([initialMessage])

      // Fetch initial suggested prompts
      if (macroAnalysis) {
        fetchSuggestedPrompts(macroAnalysis)
      }
    }
  }, [isEditing, nutritionistFeedback, macroAnalysis])

  // Reset chat when exiting edit mode
  useEffect(() => {
    if (!isEditing) {
      setChatMessages([])
      setChatInput('')
      setSuggestedPrompts([])
    }
  }, [isEditing])

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
    if (!macroAnalysis?.ingredientRatings) return undefined

    const searchName = ingredientName.toLowerCase().trim()

    // First try exact match
    let match = macroAnalysis.ingredientRatings.find(
      r => r.ingredientName.toLowerCase().trim() === searchName
    )
    if (match) return match

    // Then try partial match (ingredient contains or is contained by rating name)
    match = macroAnalysis.ingredientRatings.find(r => {
      const ratingName = r.ingredientName.toLowerCase().trim()
      return searchName.includes(ratingName) || ratingName.includes(searchName)
    })
    if (match) return match

    // Try matching main ingredient word (e.g., "grilled chicken" -> "chicken")
    const mainWords = searchName.split(/\s+/).filter(w => w.length > 3)
    for (const word of mainWords) {
      match = macroAnalysis.ingredientRatings.find(r =>
        r.ingredientName.toLowerCase().includes(word)
      )
      if (match) return match
    }

    return undefined
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
      error('Failed to save changes')
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
        warning('Image too large. Please use an image under 5MB.')
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
                    rows={4}
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
                      src={(() => {
                        const hasValidImage = recipe.imageUrl && (
                          recipe.imageUrl.startsWith('http://') ||
                          recipe.imageUrl.startsWith('https://') ||
                          (recipe.imageUrl.startsWith('data:image/') && recipe.imageUrl.length > 100)
                        )
                        return hasValidImage ? recipe.imageUrl : generateRecipeSVG(recipe.recipeName, recipe.mealType)
                      })()}
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
                            step="0.01"
                            className="col-span-2 text-sm"
                          />
                          <select
                            className="col-span-2 text-sm rounded-md bg-zinc-800 border-zinc-700 text-white focus:border-purple-500 focus:ring-purple-500 px-3 py-2 border"
                            value={ing.unit}
                            onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                          >
                            <option value="">Unit</option>
                            {Object.entries(availableUnits).map(([category, units]) => (
                              <optgroup key={category} label={category.charAt(0).toUpperCase() + category.slice(1)}>
                                {units.map((unit) => (
                                  <option key={unit.code} value={unit.abbreviation}>
                                    {unit.abbreviation} ({unit.name})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
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
                <div className="space-y-2">
                  {recipe.ingredients.map((ing: any, index: number) => {
                    const rating = getIngredientRating(ing.ingredientName)
                    return (
                      <div key={index} className="flex items-center gap-3 text-zinc-300">
                        <div className="flex-shrink-0 w-3 flex items-center justify-center">
                          {rating && (
                            <div
                              className={`w-3 h-3 rounded-full ${getTrafficLightClass(rating.rating)}`}
                              title={rating.reason}
                            ></div>
                          )}
                        </div>
                        <span>
                          <strong className="text-white">{ing.quantity} {ing.unit}</strong> {ing.ingredientName}
                          {ing.notes && <span className="text-zinc-500 text-sm"> ({ing.notes})</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* AI Nutritional Analysis */}
            {macroAnalysis && (
              <>
                {/* Macro Breakdown */}
                <div className="card p-6 space-y-4 mb-6">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-white">Nutritional Analysis</h3>
                    <button
                      type="button"
                      onClick={() => fetchAIAnalysis(isEditing ? { recipeName, servings, ingredients, mealType } : recipe)}
                      disabled={loadingAI}
                      className="px-3 py-1 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loadingAI ? 'Analyzing...' : 'Refresh'}
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

                  {/* Macro Summary - Colorful boxes */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gradient-to-br from-orange-900/40 to-pink-900/40 rounded-lg border border-orange-700/50">
                      <p className="text-2xl font-bold text-orange-400">{Math.round(macroAnalysis.perServing.calories)}</p>
                      <p className="text-xs text-zinc-400 mt-1">Calories</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-green-900/40 to-emerald-900/40 rounded-lg border border-green-700/50">
                      <p className="text-2xl font-bold text-green-400">{Math.round(macroAnalysis.perServing.protein)}g</p>
                      <p className="text-xs text-zinc-400 mt-1">Protein</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-lg border border-cyan-700/50">
                      <p className="text-2xl font-bold text-cyan-400">{Math.round(macroAnalysis.perServing.carbs)}g</p>
                      <p className="text-xs text-zinc-400 mt-1">Carbs</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-lg border border-purple-700/50">
                      <p className="text-2xl font-bold text-purple-400">{Math.round(macroAnalysis.perServing.fat)}g</p>
                      <p className="text-xs text-zinc-400 mt-1">Fat</p>
                    </div>
                  </div>

                  {/* Secondary macros row */}
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

                {/* Emilia's Nutritionist Feedback - Interactive in Edit Mode */}
                {nutritionistFeedback && (
                  <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 border border-green-800/50 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                      {/* Emilia Avatar */}
                      <div className="flex-shrink-0">
                        <Image
                          src="/sarah-nutritionist.png"
                          alt="Emilia - Your AI Nutritionist"
                          width={80}
                          height={80}
                          className="rounded-full border-4 border-zinc-700 shadow-md"
                        />
                      </div>

                      {/* Feedback Content */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white">Emilia&apos;s Nutritionist Tips</h3>
                          {isEditing && (
                            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
                              Interactive
                            </span>
                          )}
                        </div>

                        {/* View Mode - Static Feedback */}
                        {!isEditing && (
                          <p className="text-zinc-300 leading-relaxed">{nutritionistFeedback}</p>
                        )}

                        {/* Edit Mode - Interactive Chat */}
                        {isEditing && (
                          <div className="space-y-4">
                            {/* Initial Feedback */}
                            <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                              {nutritionistFeedback}
                            </div>

                            {/* Suggested Prompts - shown after initial feedback */}
                            {suggestedPrompts.length > 0 && !chatLoading && (
                              <div className="flex flex-wrap gap-2">
                                {suggestedPrompts.map((prompt, index) => (
                                  <button
                                    key={index}
                                    onClick={() => sendChatMessage(prompt)}
                                    className="text-xs bg-zinc-700/50 hover:bg-zinc-600/50 text-zinc-300 px-3 py-1.5 rounded-full border border-zinc-600 transition-colors"
                                  >
                                    {prompt}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Chat Messages */}
                            {chatMessages.length > 0 && (
                              <div className="space-y-3 max-h-64 overflow-y-auto">
                                {chatMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                                        msg.role === 'user'
                                          ? 'bg-purple-600 text-white'
                                          : 'bg-zinc-700/50 text-zinc-200'
                                      }`}
                                    >
                                      <p className="text-sm leading-relaxed">{msg.content}</p>
                                    </div>
                                  </div>
                                ))}
                                {chatLoading && (
                                  <div className="flex justify-start">
                                    <div className="bg-zinc-700/50 text-zinc-400 rounded-lg px-4 py-2">
                                      <p className="text-sm">Emilia is typing...</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Projected Nutrition (shown when Emilia suggests changes) */}
                            {projectedNutrition && (
                              <div className="bg-green-900/20 border border-green-700/50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-green-400">Projected Nutrition After Changes</span>
                                  <button
                                    onClick={() => setProjectedNutrition(null)}
                                    className="text-xs text-zinc-500 hover:text-zinc-400"
                                  >
                                    ✕
                                  </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                                  <div>
                                    <p className="text-zinc-400">Calories</p>
                                    <p className="text-blue-400 font-semibold">{Math.round(projectedNutrition.calories)}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-400">Protein</p>
                                    <p className="text-purple-400 font-semibold">{Math.round(projectedNutrition.protein)}g</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-400">Carbs</p>
                                    <p className="text-green-400 font-semibold">{Math.round(projectedNutrition.carbs)}g</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-400">Fat</p>
                                    <p className="text-yellow-400 font-semibold">{Math.round(projectedNutrition.fat)}g</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Chat Input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    sendChatMessage(chatInput)
                                  }
                                }}
                                placeholder="Tweak this recipe (e.g. add protein, reduce fat)..."
                                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-lg px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-green-500"
                                disabled={chatLoading}
                              />
                              <button
                                onClick={() => sendChatMessage(chatInput)}
                                disabled={chatLoading || !chatInput.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        )}
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
