'use client'

import { useEffect, useState, useCallback } from 'react'
import { use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AppLayout, PageContainer } from '@/components/layout'
import { Button, Badge, Input, Select } from '@/components/ui'
import { useSession } from 'next-auth/react'
import { useAILoading } from '@/components/providers/AILoadingProvider'
import { useNotification } from '@/components/providers/NotificationProvider'
import { ProductSearchPopup } from '@/components/products/ProductSearchPopup'
import { ChatMessage, IngredientModification, InstructionModification, ProjectedNutrition, ValidatedNutrition } from '@/lib/types/nutritionist'
import type { Product } from '@/lib/types/product'
import {
  RecipeDetailHeader,
  RecipeDetailHero,
  RecipeIngredients,
  RecipeInstructions,
  RecipeNotes,
  RecipeNutrition,
  RecipeEmiliaTips,
  RecipeEditHeader,
  RecipeEditHero,
  RecipeEditSaveBar,
  RecipeEditIngredients,
  RecipeEditInstructions,
  RecipeEditDetails,
  RecipeEditEmilia,
} from '@/components/recipes'

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
  const [validatedNutrition, setValidatedNutrition] = useState<ValidatedNutrition | null>(null)

  // Undo history state
  const [history, setHistory] = useState<Array<{
    ingredients: any[]
    instructions: any[]
  }>>([])

  // Ingredient scaling state
  const [scaleIngredients, setScaleIngredients] = useState(false)

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [baseServings, setBaseServings] = useState(4)
  const [baseIngredients, setBaseIngredients] = useState<any[]>([])

  // Product search popup state
  const [showProductSearch, setShowProductSearch] = useState(false)

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

        // Fetch nutritionist feedback
        console.log('📡 Calling nutritionist feedback API...')
        let feedbackText = ''
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
          feedbackText = feedbackData.feedback
          setNutritionistFeedback(feedbackText)
        } else {
          console.log('❌ Feedback request failed')
        }

        // Sync ALL analysis data to database (macros + AI ratings + feedback)
        if (macroData.analysis?.perServing) {
          console.log('🔄 Syncing macros and AI analysis to database...')
          try {
            const syncResponse = await fetch(`/api/recipes/${id}/sync-macros`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                // Macro values
                caloriesPerServing: macroData.analysis.perServing.calories ? Math.round(macroData.analysis.perServing.calories) : null,
                proteinPerServing: macroData.analysis.perServing.protein ? Math.round(macroData.analysis.perServing.protein * 10) / 10 : null,
                carbsPerServing: macroData.analysis.perServing.carbs ? Math.round(macroData.analysis.perServing.carbs * 10) / 10 : null,
                fatPerServing: macroData.analysis.perServing.fat ? Math.round(macroData.analysis.perServing.fat * 10) / 10 : null,
                fiberPerServing: macroData.analysis.perServing.fiber ? Math.round(macroData.analysis.perServing.fiber * 10) / 10 : null,
                sugarPerServing: macroData.analysis.perServing.sugar ? Math.round(macroData.analysis.perServing.sugar * 10) / 10 : null,
                sodiumPerServing: macroData.analysis.perServing.sodium ? Math.round(macroData.analysis.perServing.sodium) : null,
                // AI rating values (for caching)
                aiOverallRating: macroData.analysis.overallRating,
                aiOverallExplanation: macroData.analysis.overallExplanation,
                aiIngredientRatings: macroData.analysis.ingredientRatings,
                aiNutritionistFeedback: feedbackText || undefined,
              })
            })
            if (syncResponse.ok) {
              const syncData = await syncResponse.json()
              console.log('✅ Macros and AI analysis synced:', syncData.synced ? 'updated' : 'already in sync')
            } else {
              console.warn('⚠️ Failed to sync macros:', syncResponse.status)
            }
          } catch (syncErr) {
            console.warn('⚠️ Failed to sync macros:', syncErr)
          }
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
          setValidatedNutrition(data.validatedNutrition || null)
          console.log('📊 Projected nutrition after changes:', data.projectedNutrition,
            data.validatedNutrition ? '(validated)' : '(estimate)')
        }

        // Apply ingredient modifications if any
        if (data.ingredientModifications && data.ingredientModifications.length > 0) {
          const updatedIngredients = applyIngredientModifications(data.ingredientModifications)
          // Clear projected/validated nutrition - macro analysis will refresh via useEffect
          setProjectedNutrition(null)
          setValidatedNutrition(null)
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

  // Track unsaved changes while editing
  useEffect(() => {
    if (isEditing && recipe) {
      const changed =
        recipeName !== (recipe.recipeName || '') ||
        description !== (recipe.description || '') ||
        servings !== (recipe.servings || 4) ||
        prepTimeMinutes !== (recipe.prepTimeMinutes || '') ||
        cookTimeMinutes !== (recipe.cookTimeMinutes || '') ||
        cuisineType !== (recipe.cuisineType || '') ||
        difficultyLevel !== (recipe.difficultyLevel || '') ||
        notes !== (recipe.notes || '') ||
        imageUrl !== (recipe.imageUrl || '') ||
        JSON.stringify(mealType) !== JSON.stringify(recipe.mealType || []) ||
        JSON.stringify(ingredients) !== JSON.stringify(recipe.ingredients || []) ||
        JSON.stringify(instructions) !== JSON.stringify(recipe.instructions || [])
      setHasUnsavedChanges(changed)
    }
  }, [isEditing, recipe, recipeName, description, servings, prepTimeMinutes, cookTimeMinutes, cuisineType, difficultyLevel, mealType, notes, ingredients, instructions, imageUrl])

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

      // Load cached AI analysis from database if available
      if (data.recipe.aiOverallRating && data.recipe.aiIngredientRatings) {
        console.log('📦 Loading cached AI analysis from database')
        setMacroAnalysis({
          perServing: {
            calories: data.recipe.caloriesPerServing || 0,
            protein: data.recipe.proteinPerServing || 0,
            carbs: data.recipe.carbsPerServing || 0,
            fat: data.recipe.fatPerServing || 0,
            fiber: data.recipe.fiberPerServing || 0,
            sugar: data.recipe.sugarPerServing || 0,
            sodium: data.recipe.sodiumPerServing || 0,
          },
          overallRating: data.recipe.aiOverallRating as 'green' | 'yellow' | 'red',
          overallExplanation: data.recipe.aiOverallExplanation || '',
          ingredientRatings: data.recipe.aiIngredientRatings as Array<{
            ingredientName: string
            rating: 'green' | 'yellow' | 'red'
            reason: string
          }>,
        })
        if (data.recipe.aiNutritionistFeedback) {
          setNutritionistFeedback(data.recipe.aiNutritionistFeedback)
        }
      }
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
        // Refresh nutritional analysis with saved recipe data
        fetchAIAnalysis(data.recipe)
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

  // Add a product as an ingredient
  const addProductAsIngredient = (product: Product, quantity: number) => {
    saveToHistory()
    const productIngredient = {
      ingredientName: product.brand ? `${product.brand} ${product.name}` : product.name,
      quantity: quantity,
      unit: product.unitOfMeasure,
      category: product.category,
      notes: product.servingSize || '',
      isProduct: true,
      productId: product.id,
    }
    setIngredients([...ingredients, productIngredient])
    console.log('📦 Product added as ingredient:', product.name)
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

  const handleNotesChange = (newNotes: string) => {
    setNotes(newNotes)
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

  // View Mode - New redesigned layout
  if (!isEditing) {
    return (
      <AppLayout userEmail={session?.user?.email}>
        <PageContainer maxWidth="7xl">
          <Link href="/recipes" className="text-purple-400 hover:text-purple-300 mb-6 inline-block">
            ← Back to Recipes
          </Link>

          {/* Header with actions */}
          <RecipeDetailHeader
            mealCategories={recipe.mealType || []}
            onEdit={() => setIsEditing(true)}
            onDuplicate={handleDuplicate}
            duplicating={duplicating}
            isProductRecipe={recipe.isProductRecipe}
            sourceProductId={recipe.sourceProductId}
          />

          {/* Hero Section */}
          <RecipeDetailHero
            name={recipe.recipeName}
            description={recipe.description}
            cuisine={recipe.cuisineType}
            difficulty={recipe.difficultyLevel}
            servings={recipe.servings}
            prepTimeMinutes={recipe.prepTimeMinutes}
            cookTimeMinutes={recipe.cookTimeMinutes}
            totalTimeMinutes={recipe.totalTimeMinutes}
            ingredients={recipe.ingredients}
            rating={rating}
            onRatingChange={handleRating}
            className="mb-6"
          />

          {/* Nutritional Analysis */}
          {macroAnalysis && (
            <RecipeNutrition
              macroAnalysis={macroAnalysis}
              onRefresh={() => fetchAIAnalysis(recipe)}
              loading={loadingAI}
              className="mb-6"
            />
          )}

          {/* Loading AI Analysis */}
          {loadingAI && !macroAnalysis && (
            <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30 text-center">
              <p className="text-sm text-zinc-300">Analyzing nutritional content...</p>
            </div>
          )}

          {/* Emilia's Tips */}
          {nutritionistFeedback && (
            <RecipeEmiliaTips
              tips={nutritionistFeedback}
              className="mb-6"
            />
          )}

          {/* Two Column Layout: Ingredients & Instructions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ingredients */}
            <div className="lg:col-span-1">
              <RecipeIngredients
                ingredients={recipe.ingredients}
                ingredientRatings={macroAnalysis?.ingredientRatings}
              />
            </div>

            {/* Instructions & Notes */}
            <div className="lg:col-span-2 space-y-6">
              <RecipeInstructions
                instructions={recipe.instructions}
              />
              <RecipeNotes
                notes={recipe.notes || ''}
                onChange={handleNotesChange}
                editable={false}
              />
            </div>
          </div>

          {/* Recipe metadata */}
          <div className="mt-6 text-sm text-zinc-500 border-t border-zinc-800 pt-4">
            Used {recipe.timesUsed} times
            {recipe.lastUsedDate && ` • Last used ${new Date(recipe.lastUsedDate).toLocaleDateString()}`}
          </div>
        </PageContainer>
      </AppLayout>
    )
  }

  // Edit Mode - Redesigned layout
  return (
    <AppLayout userEmail={session?.user?.email}>
      {/* Sticky Top Navigation */}
      <RecipeEditHeader
        onUndo={undo}
        onSave={handleSaveEdit}
        onCancel={handleCancelEdit}
        canUndo={history.length > 0}
        saving={saving}
      />

      <PageContainer maxWidth="7xl" className="pb-24">
        {/* Hero Section - Emoji preview + image upload + title + description */}
        <RecipeEditHero
          recipeName={recipeName}
          description={description}
          cuisineType={cuisineType}
          imageUrl={imageUrl}
          imagePreview={imagePreview}
          ingredients={ingredients}
          onNameChange={setRecipeName}
          onDescriptionChange={setDescription}
          onImageChange={handleRecipeImageChange}
          className="mb-6"
        />

        {/* Recipe Details - Servings, times, cuisine, difficulty, categories */}
        <RecipeEditDetails
          servings={servings}
          prepTimeMinutes={prepTimeMinutes}
          cookTimeMinutes={cookTimeMinutes}
          cuisineType={cuisineType}
          difficultyLevel={difficultyLevel}
          mealCategories={mealType}
          scaleIngredients={scaleIngredients}
          onServingsChange={setServings}
          onPrepTimeChange={setPrepTimeMinutes}
          onCookTimeChange={setCookTimeMinutes}
          onCuisineChange={setCuisineType}
          onDifficultyChange={setDifficultyLevel}
          onCategoryToggle={toggleCategory}
          onScaleIngredientsChange={(checked, currentServings) => {
            setScaleIngredients(checked)
            if (checked) {
              setBaseServings(currentServings)
              setBaseIngredients(JSON.parse(JSON.stringify(ingredients)))
            }
          }}
          className="mb-6"
        />

        {/* Ingredients Section - 5 columns with headers */}
        <RecipeEditIngredients
          ingredients={ingredients}
          ingredientRatings={macroAnalysis?.ingredientRatings}
          availableUnits={availableUnits}
          onAdd={addIngredient}
          onAddProduct={() => setShowProductSearch(true)}
          onRemove={removeIngredient}
          onUpdate={updateIngredient}
          onAnalyzeNutrition={() => fetchAIAnalysis({ recipeName, servings, ingredients, mealType })}
          showAnalyzeButton={!macroAnalysis && !loadingAI}
          className="mb-6"
        />

        {/* Nutritional Analysis */}
        {macroAnalysis && (
          <RecipeNutrition
            macroAnalysis={macroAnalysis}
            onRefresh={() => fetchAIAnalysis({ recipeName, servings, ingredients, mealType })}
            loading={loadingAI}
            className="mb-6"
          />
        )}

        {/* Loading AI Analysis */}
        {loadingAI && !macroAnalysis && (
          <div className="mb-6 p-4 bg-blue-900/20 rounded-lg border border-blue-800/30 text-center">
            <p className="text-sm text-zinc-300">Analyzing nutritional content...</p>
          </div>
        )}

        {/* Emilia's Interactive Nutritionist Tips */}
        {nutritionistFeedback && (
          <RecipeEditEmilia
            nutritionistFeedback={nutritionistFeedback}
            chatMessages={chatMessages}
            chatInput={chatInput}
            suggestedPrompts={suggestedPrompts}
            chatLoading={chatLoading}
            projectedNutrition={projectedNutrition}
            validatedNutrition={validatedNutrition}
            onChatInputChange={setChatInput}
            onSendMessage={sendChatMessage}
            onClearProjectedNutrition={() => {
              setProjectedNutrition(null)
              setValidatedNutrition(null)
            }}
            className="mb-6"
          />
        )}

        {/* Instructions Section */}
        <RecipeEditInstructions
          instructions={instructions}
          onAdd={addInstruction}
          onRemove={removeInstruction}
          onUpdate={updateInstruction}
          className="mb-6"
        />

        {/* Notes Section */}
        <RecipeNotes
          notes={notes}
          onChange={setNotes}
          editable={true}
          className="mb-6"
        />
      </PageContainer>

      {/* Sticky Bottom Save Bar */}
      <RecipeEditSaveBar
        hasChanges={hasUnsavedChanges}
        onUndo={undo}
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
        canUndo={history.length > 0}
        saving={saving}
      />

      {/* Product Search Popup */}
      <ProductSearchPopup
        isOpen={showProductSearch}
        onClose={() => setShowProductSearch(false)}
        onSelect={addProductAsIngredient}
      />
    </AppLayout>
  )
}
