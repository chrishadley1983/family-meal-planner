import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Anthropic from '@anthropic-ai/sdk'
import {
  getHolisticNutritionistSystemPrompt,
  parseAIResponse,
  getInitialGreeting,
  ProfileContext,
  ConversationContext,
  RecipeContext,
  InventoryContext,
  StapleContext,
  NutritionistAction,
  CreateRecipeAction,
} from '@/lib/nutritionist'
import { calculateNutrition } from '@/lib/claude'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

/**
 * Helper to convert Decimal to number
 */
function decimalToNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null
  return Number(val)
}

/**
 * Helper to convert profile from DB to ProfileContext
 */
function toProfileContext(profile: any): ProfileContext {
  return {
    profileId: profile.id,  // Required for UPDATE_MACROS action
    profileName: profile.profileName,
    age: profile.age,
    gender: profile.gender,
    heightCm: profile.heightCm,
    currentWeightKg: decimalToNumber(profile.currentWeightKg),
    targetWeightKg: decimalToNumber(profile.targetWeightKg),
    goalType: profile.goalType,
    goalTimeframeWeeks: profile.goalTimeframeWeeks,
    activityLevel: profile.activityLevel,
    dailyCalorieTarget: profile.dailyCalorieTarget,
    dailyProteinTarget: profile.dailyProteinTarget,
    dailyCarbsTarget: profile.dailyCarbsTarget,
    dailyFatTarget: profile.dailyFatTarget,
    dailyFiberTarget: profile.dailyFiberTarget,
    macroTrackingEnabled: profile.macroTrackingEnabled,
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    foodLikes: profile.foodLikes || [],
    foodDislikes: profile.foodDislikes || [],
  }
}

/**
 * Helper to convert recipe from DB to RecipeContext
 */
function toRecipeContext(recipe: any): RecipeContext {
  return {
    id: recipe.id,
    name: recipe.recipeName,
    servings: recipe.servings,
    mealType: recipe.mealType || [],
    cuisineType: recipe.cuisineType,
    caloriesPerServing: recipe.caloriesPerServing,
    proteinPerServing: recipe.proteinPerServing,
    carbsPerServing: recipe.carbsPerServing,
    fatPerServing: recipe.fatPerServing,
    fiberPerServing: recipe.fiberPerServing,
    timesUsed: recipe.timesUsed,
    familyRating: recipe.familyRating,
    isFavorite: recipe.isFavorite,
  }
}

/**
 * Helper to convert inventory item from DB to InventoryContext
 */
function toInventoryContext(item: any): InventoryContext {
  const now = new Date()
  let daysUntilExpiry: number | null = null
  if (item.expiryDate) {
    const expiry = new Date(item.expiryDate)
    daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }

  return {
    id: item.id,
    itemName: item.itemName,
    quantity: item.quantity,
    unit: item.unit,
    category: item.category,
    location: item.location,
    expiryDate: item.expiryDate,
    daysUntilExpiry,
  }
}

/**
 * Helper to convert staple from DB to StapleContext
 */
function toStapleContext(staple: any): StapleContext {
  return {
    id: staple.id,
    itemName: staple.itemName,
    quantity: staple.quantity,
    unit: staple.unit,
    category: staple.category,
    frequency: staple.frequency,
  }
}

/**
 * Generate a conversation title from the first user message
 */
function generateTitle(message: string): string {
  // Take first 50 characters and clean up
  let title = message.substring(0, 50).trim()

  // Remove trailing punctuation
  title = title.replace(/[.,!?;:]$/, '')

  // Add ellipsis if truncated
  if (message.length > 50) {
    title += '...'
  }

  return title
}

/**
 * Validate a CREATE_RECIPE action against user's macro targets
 * Returns validation result with calculated nutrition
 */
async function validateRecipeAction(
  action: CreateRecipeAction,
  profile: ProfileContext
): Promise<{
  isValid: boolean
  calculatedNutrition: {
    caloriesPerServing: number
    proteinPerServing: number
    carbsPerServing: number
    fatPerServing: number
    fiberPerServing?: number
  } | null
  issues: string[]
}> {
  const issues: string[] = []

  try {
    // Calculate actual nutrition from ingredients
    const ingredientsForCalc = action.data.ingredients.map((ing) => ({
      ingredientName: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
    }))

    const calculatedNutrition = await calculateNutrition(
      ingredientsForCalc,
      action.data.servings
    )

    console.log('🔷 Validated recipe nutrition:', {
      aiEstimate: {
        calories: action.data.caloriesPerServing,
        protein: action.data.proteinPerServing,
        carbs: action.data.carbsPerServing,
        fat: action.data.fatPerServing,
      },
      calculated: calculatedNutrition,
      userTargets: {
        calories: profile.dailyCalorieTarget,
        protein: profile.dailyProteinTarget,
        carbs: profile.dailyCarbsTarget,
        fat: profile.dailyFatTarget,
      },
    })

    // Check if calculated nutrition aligns with user targets
    // Allow up to 20% deviation for a single meal (assuming 3-4 meals per day)
    const maxFatPerMeal = profile.dailyFatTarget ? profile.dailyFatTarget * 0.4 : null
    const maxCaloriesPerMeal = profile.dailyCalorieTarget ? profile.dailyCalorieTarget * 0.45 : null

    if (maxFatPerMeal && calculatedNutrition.fatPerServing > maxFatPerMeal) {
      issues.push(
        `Fat content (${calculatedNutrition.fatPerServing}g) exceeds recommended per-meal limit (${Math.round(maxFatPerMeal)}g based on daily target of ${profile.dailyFatTarget}g)`
      )
    }

    if (maxCaloriesPerMeal && calculatedNutrition.caloriesPerServing > maxCaloriesPerMeal) {
      issues.push(
        `Calories (${calculatedNutrition.caloriesPerServing}) exceed recommended per-meal limit (${Math.round(maxCaloriesPerMeal)} based on daily target of ${profile.dailyCalorieTarget})`
      )
    }

    return {
      isValid: issues.length === 0,
      calculatedNutrition,
      issues,
    }
  } catch (error) {
    console.error('❌ Error validating recipe nutrition:', error)
    return {
      isValid: true, // Allow recipe if we can't validate
      calculatedNutrition: null,
      issues: [],
    }
  }
}

/**
 * POST /api/nutritionist/chat
 * Send a message to Emilia and get a response
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, message } = body

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Processing nutritionist chat', { conversationId, messagePreview: message.substring(0, 50) })

    // Get the conversation with profile
    const conversation = await prisma.nutritionistConversation.findFirst({
      where: {
        id: conversationId,
        userId: session.user.id,
      },
      include: {
        profile: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Convert profile to context
    const profileContext = toProfileContext(conversation.profile)

    // Fetch additional context data (recipes, inventory, staples)
    const [recipes, inventory, staples] = await Promise.all([
      prisma.recipe.findMany({
        where: { userId: session.user.id, isArchived: false },
        orderBy: { timesUsed: 'desc' },
        take: 100,
      }),
      prisma.inventoryItem.findMany({
        where: { userId: session.user.id, isActive: true },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.staple.findMany({
        where: { userId: session.user.id, isActive: true },
        orderBy: { itemName: 'asc' },
      }),
    ])

    // Build conversation context
    const conversationContext: ConversationContext = {
      recipes: recipes.map(toRecipeContext),
      inventory: inventory.map(toInventoryContext),
      staples: staples.map(toStapleContext),
    }

    // Build conversation history for AI
    const conversationHistory = conversation.messages.map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }))

    // Add the new user message to history
    conversationHistory.push({
      role: 'user',
      content: message,
    })

    // Get system prompt with context
    const systemPrompt = getHolisticNutritionistSystemPrompt(
      profileContext,
      conversationContext
    )

    console.log('🔷 Calling Claude API...')

    // Call Claude API with validation loop for recipes
    let parsed: ReturnType<typeof parseAIResponse> = { message: '', suggestedActions: undefined, suggestedPrompts: undefined }
    let currentHistory = [...conversationHistory]
    const MAX_RECIPE_RETRIES = 2

    for (let attempt = 0; attempt <= MAX_RECIPE_RETRIES; attempt++) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: currentHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      })

      // Extract the response text
      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')

      console.log(`🟢 Received Claude response (attempt ${attempt + 1}):`, responseText.substring(0, 100) + '...')

      // Parse the response for actions and prompts
      parsed = parseAIResponse(responseText)

      // Check if there's a CREATE_RECIPE action that needs validation
      const recipeAction = (parsed.suggestedActions || []).find(
        (a): a is CreateRecipeAction => (a as any).type === 'CREATE_RECIPE'
      ) as CreateRecipeAction | undefined

      if (recipeAction && profile.dailyFatTarget) {
        console.log('🔷 Validating recipe against user macro targets...')
        const validation = await validateRecipeAction(recipeAction, profileContext)

        if (!validation.isValid && attempt < MAX_RECIPE_RETRIES) {
          console.log('⚠️ Recipe validation failed, asking AI to adjust:', validation.issues)

          // Add the AI's response and a correction request to history
          currentHistory.push({
            role: 'assistant',
            content: responseText,
          })
          currentHistory.push({
            role: 'user',
            content: `Wait - I calculated the actual nutrition from those ingredients and found issues:
${validation.issues.join('\n')}

Please adjust the recipe to better fit my macro targets (${profile.dailyFatTarget}g fat, ${profile.dailyCalorieTarget} calories daily).
Consider using leaner ingredients, reducing portion sizes, or swapping high-fat items for lower-fat alternatives.
Give me a revised version of the recipe.`,
          })

          continue // Try again with feedback
        }

        // If we have calculated nutrition, update the action data with accurate values
        if (validation.calculatedNutrition && parsed.suggestedActions) {
          const actionIndex = parsed.suggestedActions.findIndex(
            (a) => (a as any).type === 'CREATE_RECIPE'
          )
          if (actionIndex >= 0) {
            const updatedAction = parsed.suggestedActions[actionIndex] as CreateRecipeAction
            updatedAction.data.caloriesPerServing = validation.calculatedNutrition.caloriesPerServing
            updatedAction.data.proteinPerServing = validation.calculatedNutrition.proteinPerServing
            updatedAction.data.carbsPerServing = validation.calculatedNutrition.carbsPerServing
            updatedAction.data.fatPerServing = validation.calculatedNutrition.fatPerServing
            updatedAction.data.fiberPerServing = validation.calculatedNutrition.fiberPerServing
            console.log('🟢 Updated recipe action with calculated nutrition')
          }
        }
      }

      break // Validation passed or no recipe to validate
    }

    // Save the user message
    await prisma.nutritionistMessage.create({
      data: {
        conversationId,
        role: 'user',
        content: message,
      },
    })

    // Save the assistant message with metadata
    const messageMetadata = {
      suggestedActions: (parsed.suggestedActions || []) as any[],
      suggestedPrompts: (parsed.suggestedPrompts || []) as string[],
    }

    const assistantMessage = await prisma.nutritionistMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: parsed.message,
        metadata: messageMetadata,
      },
    })

    // Update conversation title if this is the first user message (no prior user messages)
    let newTitle: string | null = null
    const priorUserMessages = conversation.messages.filter(m => m.role === 'user')
    if (priorUserMessages.length === 0 && !conversation.title) {
      newTitle = generateTitle(message)
      console.log('🔷 Setting conversation title:', newTitle)
    }

    // Update conversation timestamp (and title if needed)
    await prisma.nutritionistConversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(newTitle && { title: newTitle }),
      },
    })

    console.log('🟢 Chat processed successfully')

    return NextResponse.json({
      message: parsed.message,
      suggestedActions: parsed.suggestedActions as NutritionistAction[] | undefined,
      suggestedPrompts: parsed.suggestedPrompts,
      messageId: assistantMessage.id,
      conversationTitle: newTitle, // Return title if it was just set
    })
  } catch (error) {
    console.error('❌ Error processing chat:', error)
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/nutritionist/chat
 * Get initial greeting for a new conversation
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400 }
      )
    }

    console.log('🔷 Getting initial greeting for profile:', profileId)

    // Get the profile
    const profile = await prisma.familyProfile.findFirst({
      where: {
        id: profileId,
        userId: session.user.id,
      },
    })

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const profileContext = toProfileContext(profile)
    const greeting = getInitialGreeting(profileContext)

    console.log('🟢 Generated initial greeting')

    return NextResponse.json(greeting)
  } catch (error) {
    console.error('❌ Error getting initial greeting:', error)
    return NextResponse.json(
      { error: 'Failed to get initial greeting' },
      { status: 500 }
    )
  }
}
