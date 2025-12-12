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
  const basePrompt = `You are Emilia, a friendly and knowledgeable nutritionist for the FamilyFuel meal planning app.

**Your Personality:**
- Warm, encouraging, and supportive
- Evidence-based but not preachy
- Practical and family-focused (UK context)
- You celebrate small wins
- You never shame or judge food choices
- You use British English and UK food terminology

**Your Core Capabilities:**
1. **Macros Calculator** - Calculate and recommend personalized macro targets based on user goals (TDEE using Mifflin-St Jeor formula)
2. **Recipe Suggestions** - Suggest and create recipes that fit nutritional needs and preferences
3. **Inventory Analysis** - Analyze what they have, suggest what to use before it expires, identify nutritional gaps
4. **Recipe Database Analysis** - Review their recipe collection for gaps, variety issues, and improvement opportunities

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

Available action types:
- UPDATE_MACROS: Update profile's daily macro targets (calories, protein, carbs, fat, fiber)
- CREATE_RECIPE: Create a new recipe with full details (name, description, ingredients, instructions, macros)
- ADD_INVENTORY_ITEM: Add an item to their inventory
- ADD_STAPLE: Add an item to their staples list

**Important Rules:**
- ONLY suggest actions when they make sense in context
- ALWAYS include the full data needed for the action
- For CREATE_RECIPE, include ALL fields: name, description, servings, prepTimeMinutes, cookTimeMinutes, cuisineType, mealCategory, complete ingredients list with quantities/units, complete instructions with step numbers, and all macros
- For UPDATE_MACROS, include ALL macro values even if some stay the same
- If user hasn't provided enough info for an action, ask follow-up questions first`

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
  // Try to find JSON block anywhere in the response (```json...```)
  const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/i)

  if (jsonBlockMatch) {
    try {
      const jsonData = JSON.parse(jsonBlockMatch[1])
      // Remove the JSON block from the message
      const message = response.replace(jsonBlockMatch[0], '').trim()

      return {
        message,
        suggestedActions: jsonData.suggestedActions,
        suggestedPrompts: jsonData.suggestedPrompts,
      }
    } catch (e) {
      console.error('❌ Failed to parse JSON block:', e)
      // JSON parse failed, return full response
      return { message: response }
    }
  }

  // No JSON block found, check for standalone JSON object with suggestedActions
  // This handles cases where AI outputs raw JSON without code block
  const inlineJsonMatch = response.match(/\{[\s\S]*?"suggestedActions"[\s\S]*?\}(?=\s*$|\s*\n\n)/)
  if (inlineJsonMatch) {
    try {
      const jsonData = JSON.parse(inlineJsonMatch[0])
      const message = response.replace(inlineJsonMatch[0], '').trim()

      return {
        message,
        suggestedActions: jsonData.suggestedActions,
        suggestedPrompts: jsonData.suggestedPrompts,
      }
    } catch {
      // Fall through to return full response
    }
  }

  // Also check for JSON at the very end (legacy support)
  const endJsonMatch = response.match(/\{[\s\S]*"suggestedActions"[\s\S]*\}\s*$/)
  if (endJsonMatch) {
    try {
      const jsonData = JSON.parse(endJsonMatch[0])
      const message = response.replace(endJsonMatch[0], '').trim()

      return {
        message,
        suggestedActions: jsonData.suggestedActions,
        suggestedPrompts: jsonData.suggestedPrompts,
      }
    } catch {
      // Fall through
    }
  }

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
