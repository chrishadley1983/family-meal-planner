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
  CalculatedMacros,
} from '@/lib/nutritionist'
import {
  searchMasterRecipes,
  parseSearchRequirements,
  MasterRecipeSearchResult,
} from '@/lib/nutritionist/master-recipe-search'
import { buildMasterRecipesContext } from '@/lib/nutritionist/prompts'
import { getRecipeNutrition, RecipeIngredient } from '@/lib/nutrition/nutrition-service'

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
 * Extract nutritional requirements from conversation history
 * Looks for patterns like "high protein", "under 500 calories", "low carb", etc.
 */
interface NutritionalRequirements {
  maxCalories?: number
  minCalories?: number
  minProtein?: number
  maxProtein?: number
  minCarbs?: number
  maxCarbs?: number
  minFat?: number
  maxFat?: number
  highProtein?: boolean
  lowCarb?: boolean
  lowFat?: boolean
  lowCalorie?: boolean
}

function extractNutritionalRequirements(conversationHistory: Array<{ role: string; content: string }>): NutritionalRequirements {
  const requirements: NutritionalRequirements = {}

  // Combine all user messages to extract requirements
  const userMessages = conversationHistory
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content.toLowerCase())
    .join(' ')

  // Extract specific calorie limits
  const calorieMatch = userMessages.match(/(?:under|below|less than|max(?:imum)?|at most)\s*(\d+)\s*(?:cal(?:ories)?|kcal)/i)
  if (calorieMatch) {
    requirements.maxCalories = parseInt(calorieMatch[1])
  }

  const minCalorieMatch = userMessages.match(/(?:at least|minimum|over|above|more than)\s*(\d+)\s*(?:cal(?:ories)?|kcal)/i)
  if (minCalorieMatch) {
    requirements.minCalories = parseInt(minCalorieMatch[1])
  }

  // Extract protein requirements
  const proteinMatch = userMessages.match(/(?:at least|minimum|over|above|more than)\s*(\d+)\s*g?\s*(?:of\s*)?protein/i)
  if (proteinMatch) {
    requirements.minProtein = parseInt(proteinMatch[1])
  }

  const maxProteinMatch = userMessages.match(/(?:under|below|less than|max(?:imum)?|at most)\s*(\d+)\s*g?\s*(?:of\s*)?protein/i)
  if (maxProteinMatch) {
    requirements.maxProtein = parseInt(maxProteinMatch[1])
  }

  // Extract carb requirements
  const carbMatch = userMessages.match(/(?:under|below|less than|max(?:imum)?|at most)\s*(\d+)\s*g?\s*(?:of\s*)?carb/i)
  if (carbMatch) {
    requirements.maxCarbs = parseInt(carbMatch[1])
  }

  // Extract fat requirements
  const fatMatch = userMessages.match(/(?:under|below|less than|max(?:imum)?|at most)\s*(\d+)\s*g?\s*(?:of\s*)?fat/i)
  if (fatMatch) {
    requirements.maxFat = parseInt(fatMatch[1])
  }

  // Detect qualitative requirements
  if (userMessages.includes('high protein') || userMessages.includes('protein-rich') || userMessages.includes('high-protein')) {
    requirements.highProtein = true
    // Set minimum 25g protein per serving for "high protein"
    if (!requirements.minProtein) requirements.minProtein = 25
  }

  if (userMessages.includes('low carb') || userMessages.includes('low-carb') || userMessages.includes('keto')) {
    requirements.lowCarb = true
    // Set max 20g carbs for "low carb"
    if (!requirements.maxCarbs) requirements.maxCarbs = 20
  }

  if (userMessages.includes('low fat') || userMessages.includes('low-fat')) {
    requirements.lowFat = true
    // Set max 10g fat for "low fat"
    if (!requirements.maxFat) requirements.maxFat = 10
  }

  if (userMessages.includes('low calorie') || userMessages.includes('low-calorie') || userMessages.includes('light meal')) {
    requirements.lowCalorie = true
    // Set max 400 calories for "low calorie"
    if (!requirements.maxCalories) requirements.maxCalories = 400
  }

  return requirements
}

/**
 * Check if calculated macros meet the user's requirements
 */
function checkRequirementsMet(
  macros: CalculatedMacros,
  requirements: NutritionalRequirements
): { met: boolean; violations: string[] } {
  const violations: string[] = []

  if (requirements.maxCalories && macros.caloriesPerServing > requirements.maxCalories) {
    violations.push(`Calories (${macros.caloriesPerServing}) exceed maximum of ${requirements.maxCalories}`)
  }
  if (requirements.minCalories && macros.caloriesPerServing < requirements.minCalories) {
    violations.push(`Calories (${macros.caloriesPerServing}) below minimum of ${requirements.minCalories}`)
  }
  if (requirements.minProtein && macros.proteinPerServing < requirements.minProtein) {
    violations.push(`Protein (${macros.proteinPerServing}g) below minimum of ${requirements.minProtein}g`)
  }
  if (requirements.maxProtein && macros.proteinPerServing > requirements.maxProtein) {
    violations.push(`Protein (${macros.proteinPerServing}g) exceeds maximum of ${requirements.maxProtein}g`)
  }
  if (requirements.maxCarbs && macros.carbsPerServing > requirements.maxCarbs) {
    violations.push(`Carbs (${macros.carbsPerServing}g) exceed maximum of ${requirements.maxCarbs}g`)
  }
  if (requirements.maxFat && macros.fatPerServing > requirements.maxFat) {
    violations.push(`Fat (${macros.fatPerServing}g) exceeds maximum of ${requirements.maxFat}g`)
  }

  return {
    met: violations.length === 0,
    violations,
  }
}

/**
 * Build a refinement prompt for Claude to adjust the recipe
 */
function buildRefinementPrompt(
  recipeName: string,
  calculatedMacros: CalculatedMacros,
  violations: string[],
  requirements: NutritionalRequirements,
  iterationNumber: number
): string {
  let prompt = `The recipe "${recipeName}" has been calculated with the following nutrition per serving:
- Calories: ${calculatedMacros.caloriesPerServing} kcal
- Protein: ${calculatedMacros.proteinPerServing}g
- Carbs: ${calculatedMacros.carbsPerServing}g
- Fat: ${calculatedMacros.fatPerServing}g

However, this does NOT meet the user's requirements:
${violations.map(v => `- ${v}`).join('\n')}

Please adjust the recipe to meet these requirements. Consider:
`

  if (requirements.maxCalories && calculatedMacros.caloriesPerServing > requirements.maxCalories) {
    prompt += `- Reduce portion sizes or use lower-calorie ingredients\n`
  }
  if (requirements.minProtein && calculatedMacros.proteinPerServing < requirements.minProtein) {
    prompt += `- Add more protein sources (chicken, fish, tofu, legumes, Greek yogurt)\n`
  }
  if (requirements.maxCarbs && calculatedMacros.carbsPerServing > requirements.maxCarbs) {
    prompt += `- Replace high-carb ingredients with low-carb alternatives\n`
  }
  if (requirements.maxFat && calculatedMacros.fatPerServing > requirements.maxFat) {
    prompt += `- Use leaner cooking methods and reduce oil/butter\n`
  }

  prompt += `\nProvide an adjusted recipe that meets all requirements. Remember: DO NOT include calorie/macro estimates - they will be recalculated from your ingredients.`

  if (iterationNumber >= 2) {
    prompt += `\n\nIMPORTANT: This is attempt ${iterationNumber + 1}. Make more significant adjustments to meet the targets.`
  }

  return prompt
}

/**
 * Calculate nutrition for a CREATE_RECIPE action and attach calculated macros
 */
async function calculateAndAttachMacros(action: CreateRecipeAction): Promise<CreateRecipeAction> {
  const ingredients: RecipeIngredient[] = action.data.ingredients.map(ing => ({
    ingredientName: ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
    notes: null,
  }))

  console.log(`📊 Calculating macros for recipe: ${action.data.name}`)

  const nutrition = await getRecipeNutrition({
    ingredients,
    servings: action.data.servings,
    forceRecalculate: true,
  })

  const calculatedMacros: CalculatedMacros = {
    caloriesPerServing: nutrition.perServing.calories,
    proteinPerServing: nutrition.perServing.protein,
    carbsPerServing: nutrition.perServing.carbs,
    fatPerServing: nutrition.perServing.fat,
    fiberPerServing: nutrition.perServing.fiber,
    sugarPerServing: nutrition.perServing.sugar,
    sodiumPerServing: nutrition.perServing.sodium,
    source: determineOverallSource(nutrition.ingredientBreakdown.map(b => b.source)),
    confidence: nutrition.confidence,
  }

  console.log(`✅ Calculated macros: ${calculatedMacros.caloriesPerServing} kcal, ${calculatedMacros.proteinPerServing}g protein`)

  return {
    ...action,
    calculatedMacros,
  }
}

/**
 * Determine overall source based on individual ingredient sources
 */
function determineOverallSource(sources: string[]): CalculatedMacros['source'] {
  const uniqueSources = new Set(sources)
  if (uniqueSources.size === 1) {
    const source = sources[0]
    if (source === 'usda' || source === 'db_cache') return 'usda'
    if (source === 'seed_data') return 'seed_data'
    if (source === 'ai_estimate') return 'ai_estimated'
  }
  return 'mixed'
}

/**
 * Validate and potentially refine a CREATE_RECIPE action
 * Returns the action with calculated macros, iterating if requirements not met
 */
async function validateAndRefineRecipe(
  action: CreateRecipeAction,
  conversationHistory: Array<{ role: string; content: string }>,
  systemPrompt: string,
  maxIterations: number = 3
): Promise<{ action: CreateRecipeAction; message?: string; wasRefined: boolean }> {
  // Extract requirements from conversation
  const requirements = extractNutritionalRequirements(conversationHistory)
  const hasRequirements = Object.keys(requirements).length > 0

  console.log('📋 Extracted requirements:', requirements)

  // Calculate initial macros
  let currentAction = await calculateAndAttachMacros(action)

  // If no specific requirements, just return with calculated macros
  if (!hasRequirements) {
    console.log('✅ No specific requirements, returning calculated recipe')
    return { action: currentAction, wasRefined: false }
  }

  // Check if requirements are met
  let checkResult = checkRequirementsMet(currentAction.calculatedMacros!, requirements)

  if (checkResult.met) {
    console.log('✅ Recipe meets all requirements')
    return { action: currentAction, wasRefined: false }
  }

  console.log(`⚠️ Recipe does not meet requirements: ${checkResult.violations.join(', ')}`)

  // Iterate to refine the recipe
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`🔄 Refinement iteration ${iteration + 1}/${maxIterations}`)

    // Build refinement prompt
    const refinementPrompt = buildRefinementPrompt(
      currentAction.data.name,
      currentAction.calculatedMacros!,
      checkResult.violations,
      requirements,
      iteration
    )

    // Call Claude to refine - using silent refinement (user never sees intermediate attempts)
    const refinedHistory = [
      ...conversationHistory,
      { role: 'user' as const, content: `[INTERNAL REFINEMENT - DO NOT ACKNOWLEDGE THIS IN YOUR RESPONSE]
${refinementPrompt}

CRITICAL: Generate a FRESH response to the user's original request.
Do NOT mention corrections, adjustments, apologies, or that you're refining anything.
Respond as if this is your FIRST and ONLY attempt - natural and confident.` },
    ]

    try {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20250822',
        max_tokens: 2048,
        system: systemPrompt,
        messages: refinedHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
      })

      const responseText = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n')

      // Parse response for new recipe action
      const { parseAIResponse } = await import('@/lib/nutritionist')
      const parsed = parseAIResponse(responseText)

      // Find CREATE_RECIPE action in response
      const newRecipeAction = (parsed.suggestedActions || []).find(
        (a: any) => a.type === 'CREATE_RECIPE'
      ) as CreateRecipeAction | undefined

      if (newRecipeAction) {
        // Calculate macros for refined recipe
        currentAction = await calculateAndAttachMacros(newRecipeAction)

        // Check requirements again
        checkResult = checkRequirementsMet(currentAction.calculatedMacros!, requirements)

        if (checkResult.met) {
          console.log(`✅ Recipe meets requirements after ${iteration + 1} refinements`)
          return {
            action: currentAction,
            message: parsed.message,
            wasRefined: true,
          }
        }

        console.log(`⚠️ Still not meeting requirements: ${checkResult.violations.join(', ')}`)
      } else {
        console.log('⚠️ No CREATE_RECIPE action in refinement response')
        break
      }
    } catch (error) {
      console.error('❌ Error during recipe refinement:', error)
      break
    }
  }

  // If we exhausted iterations, return best effort (silent - no user-visible message about iterations)
  console.log(`⚠️ Could not fully meet requirements after ${maxIterations} iterations`)

  return {
    action: currentAction,
    // No message - refinement is silent, user sees calculated nutrition separately
    wasRefined: true,
  }
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
    // Calculate actual nutrition from ingredients using unified nutrition service
    const ingredients: RecipeIngredient[] = action.data.ingredients.map((ing) => ({
      ingredientName: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      notes: null,
    }))

    const nutrition = await getRecipeNutrition({
      ingredients,
      servings: action.data.servings,
      forceRecalculate: true,
    })

    const calculatedNutrition = {
      caloriesPerServing: nutrition.perServing.calories,
      proteinPerServing: nutrition.perServing.protein,
      carbsPerServing: nutrition.perServing.carbs,
      fatPerServing: nutrition.perServing.fat,
      fiberPerServing: nutrition.perServing.fiber,
    }

    console.log('🔷 Validated recipe nutrition:', {
      calculated: calculatedNutrition,
      userTargets: {
        calories: profile.dailyCalorieTarget,
        protein: profile.dailyProteinTarget,
        carbs: profile.dailyCarbsTarget,
        fat: profile.dailyFatTarget,
      },
    })

    // Check if calculated nutrition aligns with user targets
    // Allow up to 40% of daily fat target per meal (assuming 3 meals)
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

    // Search for relevant master recipes based on user message
    console.log('🔍 Searching master recipes for context...')
    const searchParams = parseSearchRequirements(message)

    // Add profile-based filters
    if (profileContext.allergies.length > 0) {
      // Map allergies to allergen tags
      const allergenMap: Record<string, string> = {
        dairy: 'dairy', milk: 'dairy', lactose: 'dairy',
        gluten: 'gluten', wheat: 'gluten',
        nuts: 'nuts', 'tree nuts': 'nuts', peanuts: 'peanuts',
        eggs: 'eggs', egg: 'eggs',
        fish: 'fish', shellfish: 'shellfish',
        soy: 'soy', soya: 'soy', sesame: 'sesame'
      }
      searchParams.excludeAllergens = profileContext.allergies
        .map(a => allergenMap[a.toLowerCase()])
        .filter(Boolean) as string[]
    }

    // Search master recipes
    let masterRecipes: MasterRecipeSearchResult[] = []
    try {
      masterRecipes = await searchMasterRecipes({
        ...searchParams,
        limit: 10  // Provide up to 10 relevant recipes for context
      })
      console.log(`🔍 Found ${masterRecipes.length} relevant master recipes`)
    } catch (err) {
      console.warn('⚠️ Master recipe search failed, continuing without:', err)
    }

    // Build master recipes context string
    const masterRecipesContext = buildMasterRecipesContext(masterRecipes)

    // Get system prompt with context
    const systemPrompt = getHolisticNutritionistSystemPrompt(
      profileContext,
      conversationContext
    ) + masterRecipesContext  // Append master recipes to system prompt

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

      if (recipeAction && profileContext.dailyFatTarget) {
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
            content: `[INTERNAL REFINEMENT - DO NOT ACKNOWLEDGE THIS IN YOUR RESPONSE]
The recipe needs adjustment due to these nutritional issues:
${validation.issues.join('\n')}

Targets: ${profileContext.dailyFatTarget}g fat, ${profileContext.dailyCalorieTarget} calories daily.

Generate a NEW response to my original recipe request with corrected ingredients/portions.
CRITICAL: Do NOT mention corrections, apologies, refinements, or that you're fixing anything.
Respond as if this is your FIRST and ONLY attempt - natural and confident.`,
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

    // Process and validate any CREATE_RECIPE actions
    let processedActions = parsed.suggestedActions || []
    let finalMessage = parsed.message

    // Find CREATE_RECIPE actions and validate/calculate macros
    const createRecipeActions = processedActions.filter(
      (a: any) => a.type === 'CREATE_RECIPE'
    ) as CreateRecipeAction[]

    if (createRecipeActions.length > 0) {
      console.log(`📊 Found ${createRecipeActions.length} CREATE_RECIPE action(s), validating...`)

      // Process each CREATE_RECIPE action
      for (let i = 0; i < processedActions.length; i++) {
        const action = processedActions[i] as any
        if (action.type === 'CREATE_RECIPE') {
          try {
            const validationResult = await validateAndRefineRecipe(
              action as CreateRecipeAction,
              conversationHistory,
              systemPrompt
            )

            // Replace with validated action (has calculatedMacros attached)
            processedActions[i] = validationResult.action

            // Silent refinement - don't append internal refinement messages to user-visible response
            // The user should only see the final result, not the iteration history

            // Add calculated nutrition info to the message
            const macros = validationResult.action.calculatedMacros!
            finalMessage += `\n\n**Calculated Nutrition (per serving):**\n` +
              `- Calories: ${macros.caloriesPerServing} kcal\n` +
              `- Protein: ${macros.proteinPerServing}g\n` +
              `- Carbs: ${macros.carbsPerServing}g\n` +
              `- Fat: ${macros.fatPerServing}g\n` +
              `- Fiber: ${macros.fiberPerServing}g\n` +
              `*(${macros.confidence} confidence from ${macros.source} data)*`
          } catch (error) {
            console.error('❌ Error validating recipe:', error)
            // Continue without validation - action will be saved without calculated macros
          }
        }
      }
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
      suggestedActions: processedActions as any[],
      suggestedPrompts: (parsed.suggestedPrompts || []) as string[],
    }

    const assistantMessage = await prisma.nutritionistMessage.create({
      data: {
        conversationId,
        role: 'assistant',
        content: finalMessage,
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

    // Generate fallback prompts if AI didn't provide any
    let suggestedPrompts = parsed.suggestedPrompts
    if (!suggestedPrompts || suggestedPrompts.length === 0) {
      // Import context-aware prompts function
      const { getContextAwareSuggestedPrompts } = await import('@/lib/nutritionist')
      suggestedPrompts = getContextAwareSuggestedPrompts(profileContext, conversationContext)
      console.log('📋 Generated fallback prompts:', suggestedPrompts)
    }

    return NextResponse.json({
      message: finalMessage,
      suggestedActions: processedActions as NutritionistAction[] | undefined,
      suggestedPrompts,
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
