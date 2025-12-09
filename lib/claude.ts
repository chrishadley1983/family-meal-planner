import Anthropic from '@anthropic-ai/sdk'
import {
  MealPlanSettings,
  RecipeUsageHistory,
  InventoryItem,
  QuickOptions,
  DEFAULT_SETTINGS
} from './types/meal-plan-settings'
import { buildMealPlanPrompt } from './meal-plan-prompt-builder'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function generateMealPlan(params: {
  profiles: any[]
  recipes: any[]
  weekStartDate: string
  preferences?: any
  weekProfileSchedules?: any[]
  settings?: MealPlanSettings
  recipeHistory?: RecipeUsageHistory[]
  inventory?: InventoryItem[]
  quickOptions?: QuickOptions
}) {
  const {
    profiles,
    recipes,
    weekStartDate,
    preferences,
    weekProfileSchedules,
    settings,
    recipeHistory,
    inventory,
    quickOptions
  } = params

  // If advanced features are provided, use the advanced prompt builder
  if (weekProfileSchedules || settings || recipeHistory?.length || inventory?.length) {
    return generateAdvancedMealPlan({
      profiles,
      recipes,
      weekStartDate,
      weekProfileSchedules: weekProfileSchedules || [],
      settings: settings || DEFAULT_SETTINGS,
      recipeHistory: recipeHistory || [],
      inventory: inventory || [],
      quickOptions
    })
  }

  // Otherwise, use the simple prompt (backward compatibility)

  const prompt = `You are a family meal planning assistant. Generate a weekly meal plan based on the following information:

FAMILY PROFILES:
${profiles.map((p, i) => `
Profile ${i + 1}: ${p.profileName}
- Age: ${p.age || 'Not specified'}
- Food Likes: ${p.foodLikes.join(', ') || 'None specified'}
- Food Dislikes: ${p.foodDislikes.join(', ') || 'None specified'}
- Activity Level: ${p.activityLevel || 'Not specified'}
${p.macroTrackingEnabled ? `- Daily Targets: ${p.dailyCalorieTarget || 0} cal, ${p.dailyProteinTarget || 0}g protein` : ''}
`).join('\n')}

AVAILABLE RECIPES:
${recipes.map((r, i) => `
${i + 1}. ${r.recipeName} (ID: ${r.id})
   - Servings: ${r.servings}
   - Time: ${r.totalTimeMinutes || 'N/A'} min
   - Categories: ${r.mealCategory.join(', ')}
   - Rating: ${r.familyRating || 'Not rated'}
   - Ingredients: ${r.ingredients.map((ing: any) => ing.ingredientName).slice(0, 5).join(', ')}...
`).join('\n')}

WEEK START DATE: ${weekStartDate}

Generate a meal plan for the week with Dinner for each day (Monday through Sunday). For each meal:
1. Select an appropriate recipe from the available recipes
2. Consider family preferences and dietary needs
3. Provide variety throughout the week
4. Balance nutrition across the week

Return ONLY a valid JSON object in this exact format:
{
  "meals": [
    {
      "dayOfWeek": "Monday",
      "mealType": "Dinner",
      "recipeId": "recipe-id-from-list",
      "recipeName": "Recipe Name",
      "servings": 4,
      "notes": "Brief note about why this meal was chosen"
    }
  ],
  "summary": "Brief summary of the meal plan strategy and nutritional balance"
}

Important: Return ONLY the JSON object, no other text.`

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse meal plan from Claude response')
    }

    const mealPlan = JSON.parse(jsonMatch[0])
    return mealPlan
  } catch (error) {
    console.error('Error generating meal plan with Claude:', error)
    throw error
  }
}

export async function getNutritionistFeedback(params: {
  mealPlan: any
  profiles: any[]
}) {
  const { mealPlan, profiles } = params

  const prompt = `You are a professional nutritionist. Analyze this meal plan and provide feedback:

FAMILY PROFILES:
${profiles.map((p, i) => `
Profile ${i + 1}: ${p.profileName}
- Age: ${p.age || 'Not specified'}
- Activity Level: ${p.activityLevel || 'Not specified'}
${p.macroTrackingEnabled ? `- Daily Targets: ${p.dailyCalorieTarget || 0} cal, ${p.dailyProteinTarget || 0}g protein` : ''}
`).join('\n')}

MEAL PLAN:
${mealPlan.meals.map((m: any) => `${m.dayOfWeek} ${m.mealType}: ${m.recipeName}`).join('\n')}

Provide brief, actionable feedback (3-5 bullet points) about:
1. Nutritional balance
2. Variety and food groups coverage
3. Suggestions for improvement
4. Any concerns about the meal plan

Keep it concise and practical.`

  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (error) {
    console.error('Error getting nutritionist feedback:', error)
    throw error
  }
}

// Advanced meal plan generation with batch cooking, servings calculation, etc.
async function generateAdvancedMealPlan(params: {
  profiles: any[]
  recipes: any[]
  weekStartDate: string
  weekProfileSchedules: any[]
  settings: MealPlanSettings
  recipeHistory: RecipeUsageHistory[]
  inventory: InventoryItem[]
  quickOptions?: QuickOptions
}) {
  const {
    profiles,
    recipes,
    weekStartDate,
    weekProfileSchedules,
    settings,
    recipeHistory,
    inventory,
    quickOptions
  } = params

  // Calculate servings map
  type MealSchedule = {
    monday: string[]
    tuesday: string[]
    wednesday: string[]
    thursday: string[]
    friday: string[]
    saturday: string[]
    sunday: string[]
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  let servingsMap: Record<string, Record<string, number>> = {}

  daysOfWeek.forEach(day => {
    servingsMap[day] = {}

    weekProfileSchedules.forEach(profileSchedule => {
      const meals = profileSchedule.schedule?.[day] || []
      meals.forEach((meal: string) => {
        servingsMap[day][meal] = (servingsMap[day][meal] || 0) + 1
      })
    })
  })

  // DEBUG: Log the servingsMap to verify calculations
  console.log('📊 ServingsMap calculated:', JSON.stringify(servingsMap, null, 2))

  // Build the advanced AI prompt
  const prompt = buildMealPlanPrompt(
    {
      profiles,
      recipes,
      weekStartDate,
      weekProfileSchedules,
      settings,
      recipeHistory,
      inventory,
      servingsMap
    },
    quickOptions
  )

  // DEBUG: Log the REQUIRED SERVINGS section of the prompt
  const servingsSection = prompt.match(/\*\*REQUIRED SERVINGS[\s\S]*?(?=\n\n\*\*|$)/)?.[0]
  if (servingsSection) {
    console.log('📋 REQUIRED SERVINGS section sent to AI:')
    console.log(servingsSection)
  }

  try {
    console.log('🔷 Calling Claude API for advanced meal plan generation...')
    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 Claude response received, length:', responseText.length)

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ No JSON found in Claude response')
      throw new Error('Failed to parse meal plan from Claude response')
    }

    const mealPlan = JSON.parse(jsonMatch[0])
    console.log('🟢 Meal plan parsed successfully, meals count:', mealPlan.meals?.length || 0)
    return mealPlan
  } catch (error) {
    console.error('❌ Error generating advanced meal plan:', error)
    throw error
  }
}
