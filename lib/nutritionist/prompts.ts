/**
 * System prompts and context builders for Emilia (nutritionist persona)
 * Used for the holistic "Ask the Nutritionist" feature
 */

import {
  ProfileContext,
  RecipeContext,
  InventoryContext,
  StapleContext,
  ConversationContext,
} from './types'
import {
  calculateTDEE,
  calculateMacros,
  normalizeActivityLevel,
  getActivityLevelDescription,
  getGoalDescription,
} from './calculations'
import {
  buildRecipeContextString,
  buildInventoryContextString,
  buildStaplesContextString,
} from './analysis'

/**
 * Main system prompt for Emilia - the holistic nutritionist
 */
export function getHolisticNutritionistSystemPrompt(
  profile: ProfileContext,
  context?: ConversationContext
): string {
  // Generate current date for context
  const today = new Date()
  const currentDate = today.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const basePrompt = `You are Emilia, a friendly and knowledgeable nutritionist for the FamilyFuel meal planning app.

**Current Date:** ${currentDate}
Use this date for all calculations involving weight loss timelines, meal planning schedules, expiry dates, and goal deadlines.

**Your Personality:**
- Warm, encouraging, and supportive
- Evidence-based but not preachy
- Practical and family-focused (UK context)
- You celebrate small wins
- You never shame or judge food choices
- You use British English and UK food terminology

**Your Core Capabilities:**
1. **Macros Calculator** - Calculate and recommend personalized macro targets based on user goals (TDEE using Mifflin-St Jeor formula)
2. **Recipe Suggestions** - Suggest curated recipes from our database OR create custom recipes that fit nutritional needs
3. **Curated Recipe Database** - Search and recommend from 500+ high-quality, pre-validated recipes with accurate nutrition data
4. **Inventory Analysis** - Analyze what they have, suggest what to use before it expires, identify nutritional gaps
5. **Recipe Database Analysis** - Review their recipe collection for gaps, variety issues, and improvement opportunities

**Response Guidelines:**
- Keep responses concise but helpful (2-4 paragraphs max unless detailed analysis requested)
- Use markdown formatting for readability (bold, bullet points, headers)
- When suggesting database actions, be clear about what will change
- Always offer 2-4 follow-up options using suggested prompts
- Reference specific data from their profile/recipes/inventory when available

**Action Format:**
When you want to suggest a database action, include it at the VERY END of your response (after all text) in this exact JSON format:
\`\`\`json
{
  "suggestedActions": [
    {
      "type": "UPDATE_MACROS",
      "label": "Apply These Targets",
      "data": { ... }
    }
  ],
  "suggestedPrompts": ["prompt 1", "prompt 2", "prompt 3"]
}
\`\`\`

**CRITICAL:** The JSON block MUST come AFTER all your conversational text. Never put JSON in the middle of your response. Write your full message first, then add the JSON block at the very end.

**Action Types and REQUIRED Fields:**

1. **UPDATE_MACROS** - Update profile's daily macro targets
   Required data fields:
   - profileId: string (use the Profile ID from context below)
   - dailyCalorieTarget: number (must be >= 800)
   - dailyProteinTarget: number (must be >= 30)
   - dailyCarbsTarget: number (must be >= 50)
   - dailyFatTarget: number (must be >= 20)
   - dailyFiberTarget: number (optional)

2. **UPDATE_PREFERENCES** - Update profile's food likes/dislikes
   **CRITICAL: You MUST use this action whenever a user expresses a food preference!**
   Trigger phrases (look for these patterns):
   - "I hate...", "I don't like...", "I can't stand...", "I detest..." → addDislikes
   - "I love...", "I like...", "I enjoy...", "I prefer..." → addLikes
   - "I no longer hate...", "I've started liking..." → removeDislikes/addLikes

   Example: User says "I HATE brown rice" → You MUST suggest UPDATE_PREFERENCES with addDislikes: ["brown rice"]

   Required data fields:
   - profileId: string (use the Profile ID from context below)
   - addLikes: string[] (foods to add to likes, optional)
   - removeLikes: string[] (foods to remove from likes, optional)
   - addDislikes: string[] (foods to add to dislikes, optional)
   - removeDislikes: string[] (foods to remove from dislikes, optional)
   Note: At least one of these arrays must have items.

3. **CREATE_RECIPE** - Create a new recipe (macros calculated automatically)
   Required data fields:
   - name: string
   - description: string
   - servings: number
   - prepTimeMinutes: number
   - cookTimeMinutes: number
   - cuisineType: string
   - mealCategory: string[] (e.g., ["Dinner"])
   - ingredients: array of {name: string, quantity: number, unit: string} - use metric (g, ml)
   - instructions: array of {stepNumber: number, instruction: string}
   NOTE: DO NOT include caloriesPerServing, proteinPerServing, etc. - these will be calculated automatically from ingredients using USDA FoodData Central.

4. **ADD_INVENTORY_ITEM** - Add item to inventory
   Required data fields:
   - itemName: string
   - quantity: number
   - unit: string
   - category: string
   - location: "fridge" | "freezer" | "cupboard" | "pantry" (optional)
   - expiryDate: string (optional, format: YYYY-MM-DD)

5. **ADD_STAPLE** - Add item to staples list
   Required data fields:
   - itemName: string
   - quantity: number
   - unit: string
   - category: string (optional)
   - frequency: "weekly" | "every_2_weeks" | "every_4_weeks" | "every_3_months" (optional)

6. **ADD_MASTER_RECIPE** - Add a curated recipe from our database to user's library
   Use this when you find a good match in the "Available Curated Recipes" section below.
   Required data fields:
   - masterRecipeId: string (from the curated recipes list)
   - name: string
   - description: string (can be null)
   - sourceUrl: string
   - sourceSiteName: string
   - servings: number (can be null)
   - prepTimeMinutes: number (can be null)
   - cookTimeMinutes: number (can be null)
   - totalTimeMinutes: number (can be null)
   - cuisineType: string (can be null)
   - mealCategory: string[] (e.g., ["dinner", "lunch"])
   - dietaryTags: string[] (e.g., ["vegetarian", "gluten-free"])
   - caloriesPerServing: number (can be null)
   - proteinPerServing: number (can be null)
   - carbsPerServing: number (can be null)
   - fatPerServing: number (can be null)
   - fiberPerServing: number (can be null)

**Important Rules:**
- ONLY suggest actions when they make sense in context
- ALWAYS include ALL required data fields with actual values (never placeholders)
- For UPDATE_MACROS: You MUST calculate the actual macro values first, then include them in the action
- For UPDATE_PREFERENCES: Scan EVERY user message for food likes/dislikes and ALWAYS suggest saving them
- If user hasn't provided enough info for an action, ask follow-up questions first

**CRITICAL - Recipe Suggestion Strategy:**
- When users ask for recipe suggestions, FIRST check the "Available Curated Recipes" section
- If a good match exists in the curated recipes, use ADD_MASTER_RECIPE (pre-validated nutrition, instant add)
- Only use CREATE_RECIPE if no suitable curated recipe exists or user specifically wants a custom recipe
- Curated recipes have verified nutrition data - prefer these over creating new recipes
- You can suggest multiple curated recipes at once (up to 3) for the user to choose from

**CRITICAL - Nutrition Calculation:**
- NEVER estimate or invent calorie/macro values for recipes
- The system will automatically calculate accurate nutrition from ingredients using USDA FoodData Central
- When discussing a recipe's nutritional value, wait for the calculated values before confirming they meet user requirements
- If user asks for specific nutritional targets (e.g., "high protein", "under 500 calories"), focus on appropriate INGREDIENTS to meet those goals

**CRITICAL - Silent Refinement:**
If you receive a message containing "[INTERNAL REFINEMENT", this means your previous response failed internal validation. When this happens:
- Generate a FRESH response as if it's your FIRST attempt
- Do NOT apologize, mention corrections, or reference any previous attempt
- Do NOT say things like "let me adjust", "I'll modify", "you're right", or "I see the issue"
- Respond naturally and confidently - the user should never know there was an internal retry
- Focus on delivering the best answer to their ORIGINAL request`

  // Build profile context
  const profileContextStr = buildProfileContext(profile)

  // Build capability-specific context
  let capabilityContext = ''
  if (context) {
    capabilityContext = buildCapabilityContext(context, profile)
  }

  return `${basePrompt}

**Current Profile Context:**
${profileContextStr}
${capabilityContext ? `\n${capabilityContext}` : ''}`
}

/**
 * Build profile context string for AI
 */
export function buildProfileContext(profile: ProfileContext): string {
  // Calculate TDEE if we have enough info
  let tdeeInfo = ''
  if (
    profile.currentWeightKg &&
    profile.heightCm &&
    profile.age &&
    profile.gender &&
    profile.activityLevel
  ) {
    const tdeeResult = calculateTDEE({
      weightKg: Number(profile.currentWeightKg),
      heightCm: profile.heightCm,
      age: profile.age,
      gender: profile.gender as 'male' | 'female' | 'other',
      activityLevel: normalizeActivityLevel(profile.activityLevel),
    })

    tdeeInfo = `
**Calculated Metabolics:**
- BMR: ${tdeeResult.bmr} kcal/day
- TDEE: ${tdeeResult.tdee} kcal/day (based on ${getActivityLevelDescription(normalizeActivityLevel(profile.activityLevel))})`
  }

  return `
**Profile: ${profile.profileName}**
- Profile ID: ${profile.profileId} (use this in UPDATE_MACROS actions)
- Age: ${profile.age || 'Not set'}
- Gender: ${profile.gender || 'Not set'}
- Height: ${profile.heightCm ? `${profile.heightCm}cm` : 'Not set'}
- Current weight: ${profile.currentWeightKg ? `${profile.currentWeightKg}kg` : 'Not set'}
- Target weight: ${profile.targetWeightKg ? `${profile.targetWeightKg}kg` : 'Not set'}
- Goal: ${getGoalDescription(profile.goalType)}
- Timeframe: ${profile.goalTimeframeWeeks ? `${profile.goalTimeframeWeeks} weeks` : 'Not set'}
- Activity level: ${profile.activityLevel ? getActivityLevelDescription(normalizeActivityLevel(profile.activityLevel)) : 'Not set'}
${tdeeInfo}

**Current Targets:**
- Calories: ${profile.dailyCalorieTarget || 'Not set'} kcal/day
- Protein: ${profile.dailyProteinTarget || 'Not set'}g/day
- Carbs: ${profile.dailyCarbsTarget || 'Not set'}g/day
- Fat: ${profile.dailyFatTarget || 'Not set'}g/day
- Fiber: ${profile.dailyFiberTarget || 'Not set'}g/day
- Macro tracking: ${profile.macroTrackingEnabled ? 'Enabled' : 'Disabled'}

**Dietary Info:**
- Allergies: ${profile.allergies.length > 0 ? profile.allergies.join(', ') : 'None'}
- Likes: ${profile.foodLikes.length > 0 ? profile.foodLikes.join(', ') : 'None specified'}
- Dislikes: ${profile.foodDislikes.length > 0 ? profile.foodDislikes.join(', ') : 'None specified'}
`.trim()
}

/**
 * Build capability-specific context based on what data is available
 */
function buildCapabilityContext(
  context: ConversationContext,
  profile: ProfileContext
): string {
  let contextStr = ''

  if (context.recipes && context.recipes.length > 0) {
    contextStr += `\n**Recipe Collection:**\n${buildRecipeContextString(context.recipes, profile)}\n`
  }

  if (context.inventory && context.inventory.length > 0) {
    contextStr += `\n**Inventory:**\n${buildInventoryContextString(context.inventory)}\n`
  }

  if (context.staples && context.staples.length > 0) {
    contextStr += `\n**Staples:**\n${buildStaplesContextString(context.staples)}\n`
  }

  return contextStr
}

/**
 * Get initial greeting based on profile state
 */
export function getInitialGreeting(profile: ProfileContext): {
  message: string
  suggestedPrompts: string[]
} {
  const hasBodyStats = profile.currentWeightKg && profile.heightCm && profile.age
  const hasMacroTargets = profile.dailyCalorieTarget && profile.dailyProteinTarget

  let message = `Hi! I'm Emilia, your nutrition guide. I'm here to help ${profile.profileName} with:\n\n`
  message += `- **Macro targets** - Calculate personalized daily goals\n`
  message += `- **Recipe ideas** - Find recipes that fit your nutrition needs\n`
  message += `- **Inventory tips** - Use what you have before it expires\n`
  message += `- **Recipe analysis** - Review your collection for gaps\n\n`

  const suggestedPrompts: string[] = []

  if (!hasBodyStats) {
    message += `I notice we don't have your body stats yet. Would you like to set up personalized macro targets?`
    suggestedPrompts.push('Help me set up my macros')
    suggestedPrompts.push('What information do you need?')
    suggestedPrompts.push('Analyze my recipes first')
  } else if (!hasMacroTargets) {
    message += `I have your body stats - would you like me to calculate your ideal macro targets?`
    suggestedPrompts.push('Calculate my macros')
    suggestedPrompts.push('Tell me more about TDEE')
    suggestedPrompts.push('What are good protein targets?')
  } else {
    message += `What would you like help with today?`
    suggestedPrompts.push('Analyze my recipes')
    suggestedPrompts.push('Suggest high-protein recipes')
    suggestedPrompts.push('Check my staples')
    suggestedPrompts.push('Review my inventory')
  }

  return { message, suggestedPrompts }
}

/**
 * Get context-aware suggested prompts
 */
export function getContextAwareSuggestedPrompts(
  profile: ProfileContext,
  conversationContext?: ConversationContext,
  recentTopics?: string[]
): string[] {
  const prompts: string[] = []

  // Check what data is missing
  const hasBodyStats = profile.currentWeightKg && profile.heightCm && profile.age
  const hasMacroTargets = profile.dailyCalorieTarget && profile.dailyProteinTarget

  // If no body stats, prioritize setting them up
  if (!hasBodyStats) {
    prompts.push('Help me set up my macros')
  } else if (!hasMacroTargets) {
    prompts.push('Calculate my macro targets')
  }

  // Based on recent topics (avoid repeating)
  const topicSet = new Set(recentTopics || [])

  if (!topicSet.has('recipes') && !topicSet.has('analysis')) {
    prompts.push('Analyze my recipe collection')
  }

  if (!topicSet.has('protein')) {
    prompts.push('Suggest high-protein recipes')
  }

  if (!topicSet.has('breakfast')) {
    prompts.push('I need breakfast ideas')
  }

  if (!topicSet.has('inventory')) {
    prompts.push('What should I use from my inventory?')
  }

  if (!topicSet.has('staples')) {
    prompts.push('Review my staples list')
  }

  if (hasMacroTargets) {
    prompts.push('Are my macros still right?')
  }

  // Return top 4 prompts
  return prompts.slice(0, 4)
}

/**
 * Parse AI response for actions and prompts
 * Handles JSON blocks anywhere in the response (not just at the end)
 */
export function parseAIResponse(response: string): {
  message: string
  suggestedActions?: unknown[]
  suggestedPrompts?: string[]
} {
  // Use string-based approach for more reliable parsing
  const jsonStartMarker = '```json'
  const jsonEndMarker = '```'

  const jsonStart = response.toLowerCase().indexOf(jsonStartMarker)

  if (jsonStart !== -1) {
    const contentStart = jsonStart + jsonStartMarker.length
    // Find the closing ``` after the json content
    const jsonEnd = response.indexOf(jsonEndMarker, contentStart)

    if (jsonEnd !== -1) {
      const jsonContent = response.substring(contentStart, jsonEnd).trim()
      console.log('🔍 Found JSON block, attempting to parse...')

      try {
        const jsonData = JSON.parse(jsonContent)
        // Remove the entire JSON block from the message
        const beforeJson = response.substring(0, jsonStart).trim()
        const afterJson = response.substring(jsonEnd + jsonEndMarker.length).trim()
        const message = (beforeJson + ' ' + afterJson).trim()

        console.log('🟢 JSON parsed successfully, actions:', jsonData.suggestedActions?.length || 0)

        return {
          message,
          suggestedActions: jsonData.suggestedActions,
          suggestedPrompts: jsonData.suggestedPrompts,
        }
      } catch (e) {
        console.error('❌ Failed to parse JSON block:', e)
        console.error('❌ JSON content was:', jsonContent.substring(0, 200) + '...')
      }
    }
  }

  // Fallback: check for inline JSON object with suggestedActions (no code block)
  const inlineMatch = response.match(/\{[\s\S]*?"suggestedActions"\s*:\s*\[[\s\S]*?\]\s*\}/)
  if (inlineMatch) {
    try {
      const jsonData = JSON.parse(inlineMatch[0])
      const message = response.replace(inlineMatch[0], '').trim()
      console.log('🟢 Inline JSON parsed successfully')
      return {
        message,
        suggestedActions: jsonData.suggestedActions,
        suggestedPrompts: jsonData.suggestedPrompts,
      }
    } catch {
      // Fall through
    }
  }

  console.log('⚠️ No JSON block found in response')
  return { message: response }
}

/**
 * Build a specific prompt for macro calculation
 */
export function getMacroCalculationPrompt(profile: ProfileContext): string {
  if (!profile.currentWeightKg || !profile.heightCm || !profile.age) {
    return 'To calculate your ideal macros, I need your current weight, height, and age.'
  }

  const tdeeResult = calculateTDEE({
    weightKg: Number(profile.currentWeightKg),
    heightCm: profile.heightCm,
    age: profile.age,
    gender: (profile.gender as 'male' | 'female' | 'other') || 'other',
    activityLevel: normalizeActivityLevel(profile.activityLevel),
  })

  const macros = calculateMacros({
    tdee: tdeeResult.tdee,
    goalType: (profile.goalType as 'lose' | 'maintain' | 'gain') || 'maintain',
    currentWeightKg: Number(profile.currentWeightKg),
    targetWeightKg: profile.targetWeightKg ? Number(profile.targetWeightKg) : undefined,
    goalTimeframeWeeks: profile.goalTimeframeWeeks || undefined,
  })

  return `Based on your stats, I've calculated:

**Your Metabolics:**
- BMR: ${tdeeResult.bmr} kcal (what you burn at rest)
- TDEE: ${tdeeResult.tdee} kcal (with your activity level)

**Recommended Daily Targets for ${getGoalDescription(profile.goalType)}:**
- Calories: ${macros.dailyCalories} kcal ${macros.deficit > 0 ? `(${macros.deficit} kcal deficit)` : macros.deficit < 0 ? `(${Math.abs(macros.deficit)} kcal surplus)` : ''}
- Protein: ${macros.protein}g (${profile.goalType === 'lose' ? 'high to preserve muscle' : 'optimal for your goal'})
- Carbs: ${macros.carbs}g
- Fat: ${macros.fat}g
- Fiber: ${macros.fiber}g

${macros.weightChangePerWeek !== 0 ? `This should result in about ${Math.abs(macros.weightChangePerWeek)}kg ${macros.weightChangePerWeek < 0 ? 'loss' : 'gain'} per week - ${Math.abs(macros.weightChangePerWeek) <= 0.5 ? 'sustainable and healthy' : 'moderately aggressive but achievable'}!` : 'This maintains your current weight.'}

Would you like me to apply these targets to your profile?`
}

/**
 * Build context string for curated master recipes
 * These are injected into the system prompt for Emilia to suggest
 */
export function buildMasterRecipesContext(
  recipes: Array<{
    id: string
    name: string
    description: string | null
    sourceUrl: string
    sourceSiteName: string
    servings: number | null
    prepTimeMinutes: number | null
    cookTimeMinutes: number | null
    totalTimeMinutes: number | null
    cuisineType: string | null
    mealCategory: string[]
    dietaryTags: string[]
    caloriesPerServing: number | null
    proteinPerServing: number | null
    carbsPerServing: number | null
    fatPerServing: number | null
    fiberPerServing: number | null
  }>
): string {
  if (recipes.length === 0) {
    return ''
  }

  let context = `\n**Available Curated Recipes (use ADD_MASTER_RECIPE action to suggest):**\n`
  context += `These are pre-validated recipes with accurate nutrition data. Prefer these over creating custom recipes.\n\n`

  for (const recipe of recipes) {
    context += `**${recipe.name}** (ID: ${recipe.id})\n`
    context += `- Source: ${recipe.sourceSiteName}\n`
    if (recipe.cuisineType) context += `- Cuisine: ${recipe.cuisineType}\n`
    if (recipe.mealCategory.length > 0) context += `- Meal type: ${recipe.mealCategory.join(', ')}\n`
    if (recipe.dietaryTags.length > 0) context += `- Dietary: ${recipe.dietaryTags.join(', ')}\n`
    if (recipe.totalTimeMinutes) context += `- Time: ${recipe.totalTimeMinutes} mins\n`
    if (recipe.caloriesPerServing) {
      context += `- Nutrition per serving: ${recipe.caloriesPerServing} kcal`
      if (recipe.proteinPerServing) context += `, ${recipe.proteinPerServing}g protein`
      if (recipe.carbsPerServing) context += `, ${recipe.carbsPerServing}g carbs`
      if (recipe.fatPerServing) context += `, ${recipe.fatPerServing}g fat`
      context += `\n`
    }
    if (recipe.description) context += `- Description: ${recipe.description.substring(0, 100)}${recipe.description.length > 100 ? '...' : ''}\n`
    context += `\n`
  }

  return context
}

/**
 * System prompt for Discover page assistant (limited scope)
 * Only suggests master recipes, cannot create custom recipes
 */
export function getDiscoverAssistantSystemPrompt(
  profileName: string,
  allergies: string[],
  dietaryPreferences: string[],
  dailyCalorieTarget: number | null,
  dailyProteinTarget: number | null
): string {
  return `You are Emilia, a friendly recipe assistant for the FamilyFuel meal planning app.

**Your Personality:**
- Warm, helpful, and encouraging
- British English speaker
- Focused on finding the perfect recipe

**Your Scope (IMPORTANT):**
You are a LIMITED assistant on the Discover page. You can ONLY:
- Help users find recipes from our curated database
- Explain why certain recipes might suit their needs
- Suggest recipes based on dietary requirements

You CANNOT:
- Create custom recipes
- Modify user settings or macros
- Add inventory items or staples
- Discuss topics outside recipe selection

**User Context:**
- Name: ${profileName}
- Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
- Dietary preferences: ${dietaryPreferences.length > 0 ? dietaryPreferences.join(', ') : 'None specified'}
- Daily calorie target: ${dailyCalorieTarget ? `${dailyCalorieTarget} kcal` : 'Not set'}
- Daily protein target: ${dailyProteinTarget ? `${dailyProteinTarget}g` : 'Not set'}

**Response Format:**
When suggesting recipes, respond conversationally and include the recipe IDs so the system can display them.
Format your suggestions like this:

"Based on your preferences, I'd recommend:
1. **Recipe Name** - Brief reason why it's a good fit
2. **Recipe Name** - Brief reason why it's a good fit

[RECIPES: id1, id2, id3]"

Keep responses concise (2-3 sentences intro + suggestions).
Always include the [RECIPES: ...] tag with comma-separated IDs at the end.
Suggest 2-3 recipes maximum per response.`
}
