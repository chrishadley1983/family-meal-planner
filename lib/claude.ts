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
// Helper function to extract JSON-LD Recipe schema from HTML
function extractJsonLdRecipe(htmlContent: string): any | null {
  try {
    // Find all JSON-LD script tags
    const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    let match
    const jsonLdBlocks: any[] = []

    while ((match = jsonLdRegex.exec(htmlContent)) !== null) {
      try {
        const parsed = JSON.parse(match[1])
        jsonLdBlocks.push(parsed)
      } catch {
        // Skip invalid JSON
      }
    }

    // Search for Recipe schema in all blocks
    for (const block of jsonLdBlocks) {
      // Handle @graph arrays (common in WordPress sites)
      if (block['@graph'] && Array.isArray(block['@graph'])) {
        for (const item of block['@graph']) {
          if (item['@type'] === 'Recipe' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            return item
          }
        }
      }

      // Handle direct Recipe type
      if (block['@type'] === 'Recipe' ||
          (Array.isArray(block['@type']) && block['@type'].includes('Recipe'))) {
        return block
      }

      // Handle arrays of objects
      if (Array.isArray(block)) {
        for (const item of block) {
          if (item['@type'] === 'Recipe' ||
              (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))) {
            return item
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting JSON-LD:', error)
    return null
  }
}

// Helper function to extract visible text content from HTML (remove scripts, styles, etc.)
function extractVisibleText(htmlContent: string): string {
  // Remove script and style tags with their content
  let text = htmlContent
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')

  // Replace common block elements with newlines
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')

  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, ' ')

  // Decode common HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&frac12;/g, '1/2')
    .replace(/&frac14;/g, '1/4')
    .replace(/&frac34;/g, '3/4')

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim()

  return text
}

export async function parseRecipeFromUrl(url: string, htmlContent: string) {
  console.log('🔷 Parsing recipe from URL:', url)

  // Step 1: Try to extract JSON-LD structured data
  const jsonLdRecipe = extractJsonLdRecipe(htmlContent)

  let structuredDataSection = ''
  if (jsonLdRecipe) {
    console.log('🟢 Found JSON-LD Recipe schema data')
    structuredDataSection = `
**STRUCTURED DATA FOUND (JSON-LD Schema.org Recipe):**
This is the most reliable source - use this data primarily!
\`\`\`json
${JSON.stringify(jsonLdRecipe, null, 2).substring(0, 15000)}
\`\`\`

`
  } else {
    console.log('⚠️ No JSON-LD Recipe schema found, relying on HTML parsing')
  }

  // Step 2: Extract visible text as backup
  const visibleText = extractVisibleText(htmlContent).substring(0, 8000)

  const prompt = `You are an expert recipe extraction assistant. Extract ALL recipe details with high accuracy from the provided data.

URL: ${url}

${structuredDataSection}**HTML CONTENT (backup - use if structured data is missing information):**
${htmlContent.substring(0, jsonLdRecipe ? 10000 : 20000)}

**VISIBLE TEXT CONTENT (for reference):**
${visibleText}

---

EXTRACTION PRIORITY:
1. **FIRST**: Use JSON-LD structured data if available (most accurate)
2. **SECOND**: Parse HTML content for any missing details
3. **THIRD**: Use visible text as fallback

CRITICAL INSTRUCTIONS FOR INGREDIENTS:
- **MUST extract ALL ingredients** - count them carefully, don't miss any!
- Each ingredient MUST have: quantity (number), unit (string), ingredientName (string)
- Convert fractions: 1/2 → 0.5, 1/4 → 0.25, 3/4 → 0.75
- Parse text like "900 grams Potatoes" → quantity: 900, unit: "g", ingredientName: "Potatoes"
- Parse text like "2 unit(s) Carrot" → quantity: 2, unit: "whole", ingredientName: "Carrot"
- Parse text like "4 unit(s) Garlic Clove" → quantity: 4, unit: "cloves", ingredientName: "Garlic"
- Parse text like "2 carton(s) Tomato Passata" → quantity: 2, unit: "cartons", ingredientName: "Tomato Passata"
- Parse text like "2 sachet(s) Dried Oregano" → quantity: 2, unit: "sachets", ingredientName: "Dried Oregano"
- If quantity is missing, default to 1
- For items like "salt and pepper to taste" use quantity: 1, unit: "to taste"

LOOK FOR INGREDIENTS IN:
- JSON-LD "recipeIngredient" array
- HTML elements with class/id containing "ingredient"
- Lists near "Ingredients" heading
- Data attributes like data-ingredient

CRITICAL INSTRUCTIONS FOR COOKING STEPS:
- Extract EVERY cooking step in order
- Number steps sequentially (1, 2, 3...)
- Look in JSON-LD "recipeInstructions"
- Look for "Method", "Directions", "Instructions", "Steps" sections in HTML

TIME CONVERSION:
- "1 hour" = 60 minutes
- "1 hour 30 mins" = 90 minutes
- "PT30M" (ISO 8601) = 30 minutes
- "PT1H" = 60 minutes
- "PT1H30M" = 90 minutes

Return ONLY a valid JSON object:
{
  "recipeName": "string",
  "description": "string or null",
  "servings": number,
  "prepTimeMinutes": number or null,
  "cookTimeMinutes": number or null,
  "cuisineType": "string or null",
  "difficultyLevel": "Easy" | "Medium" | "Hard" | null,
  "mealType": ["Dinner"],
  "isVegetarian": boolean,
  "isVegan": boolean,
  "containsMeat": boolean,
  "containsSeafood": boolean,
  "isDairyFree": boolean,
  "isGlutenFree": boolean,
  "containsNuts": boolean,
  "ingredients": [
    {
      "ingredientName": "string",
      "quantity": number,
      "unit": "string",
      "notes": "string or null"
    }
  ],
  "instructions": [
    {
      "stepNumber": number,
      "instruction": "string"
    }
  ],
  "caloriesPerServing": number or null,
  "proteinPerServing": number or null,
  "carbsPerServing": number or null,
  "fatPerServing": number or null,
  "fiberPerServing": number or null,
  "notes": "string or null"
}

Return ONLY the JSON object, no other text.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 Claude response received')

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse recipe from Claude response')
    }

    const recipe = JSON.parse(jsonMatch[0])
    console.log('🟢 Recipe parsed:', recipe.recipeName, '- Ingredients:', recipe.ingredients?.length || 0)
    return recipe
  } catch (error) {
    console.error('❌ Error parsing recipe with Claude:', error)
    throw error
  }
}

export async function calculateNutrition(ingredients: Array<{
  ingredientName: string
  quantity: number
  unit: string
}>, servings: number) {
  const ingredientList = ingredients
    .map(ing => `${ing.quantity} ${ing.unit} ${ing.ingredientName}`)
    .join('\n')

  const prompt = `You are a nutrition expert. Analyze these recipe ingredients and calculate the approximate nutrition per serving.

INGREDIENTS (for ${servings} servings):
${ingredientList}

Calculate and return ONLY a valid JSON object with nutrition per serving:
{
  "caloriesPerServing": number,
  "proteinPerServing": number (grams),
  "carbsPerServing": number (grams),
  "fatPerServing": number (grams),
  "fiberPerServing": number (grams),
  "sugarPerServing": number (grams),
  "sodiumPerServing": number (milligrams)
}

Use standard nutrition databases for your calculations. Be as accurate as possible.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse nutrition from Claude response')
    }

    const nutrition = JSON.parse(jsonMatch[0])
    return nutrition
  } catch (error) {
    console.error('Error calculating nutrition with Claude:', error)
    throw error
  }
}

export async function analyzeRecipePhoto(images: string[]) {
  const imageCount = images.length
  const prompt = `You are a recipe recognition assistant. Analyze ${imageCount === 1 ? 'this image' : `these ${imageCount} images`} and extract or identify recipe information.

${imageCount > 1 ? 'Note: Multiple images are provided (e.g., front and back of a recipe card, or different angles of the dish). Use all images together to get complete information.' : ''}

The image${imageCount > 1 ? 's' : ''} may contain:
- A photo of prepared food (identify the dish and suggest recipe details)
- A printed/handwritten recipe card (extract the text and recipe information)
- A screenshot or photo of a recipe from a website, book, or app (extract the details)
- Ingredient lists or cooking instructions (read and structure the information)

Based on the image${imageCount > 1 ? 's' : ''}, provide:
1. The name of the dish or recipe
2. Ingredients (extracted directly if visible as text, or suggested if it's a food photo)
3. Instructions (extracted directly if visible as text, or suggested if it's a food photo)
4. Cuisine type, difficulty level, and meal categories

**Important:**
- If the image contains TEXT with recipe details, extract that information directly and accurately
- If the image is a FOOD PHOTO without text, identify the dish and suggest likely ingredients/instructions
- Extract exact quantities and measurements when visible in text
- Preserve cooking instructions as written when visible

Return ONLY a valid JSON object in this exact format:
{
  "recipeName": "string",
  "description": "string",
  "cuisineType": "string or null (e.g., 'Pasta', 'Curry', 'Stir-fry', 'Thai', 'BBQ', 'Pizza', 'Salad')",
  "difficultyLevel": "Easy" | "Medium" | "Hard",
  "mealType": ["Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"],
  "isVegetarian": boolean,
  "isVegan": boolean,
  "containsMeat": boolean,
  "containsSeafood": boolean,
  "isDairyFree": boolean,
  "isGlutenFree": boolean,
  "containsNuts": boolean,
  "suggestedIngredients": [
    {
      "ingredientName": "string",
      "quantity": number,
      "unit": "string"
    }
  ],
  "suggestedInstructions": [
    {
      "stepNumber": number,
      "instruction": "string"
    }
  ]
}

Be accurate when extracting text, and be specific and practical when suggesting details from food photos.`

  try {
    // Build content array with all images followed by the prompt
    const content: any[] = []

    // Add all images to content
    for (const imageData of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.startsWith('data:image/png') ? 'image/png' :
                     imageData.startsWith('data:image/jpeg') ? 'image/jpeg' :
                     imageData.startsWith('data:image/jpg') ? 'image/jpeg' : 'image/jpeg',
          data: imageData.replace(/^data:image\/\w+;base64,/, '')
        }
      })
    }

    // Add text prompt after images
    content.push({
      type: 'text',
      text: prompt
    })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse recipe from Claude response')
    }

    const recipe = JSON.parse(jsonMatch[0])
    return recipe
  } catch (error) {
    console.error('Error analyzing recipe photo with Claude:', error)
    throw error
  }
}

export async function analyzeRecipeText(text: string) {
  const prompt = `You are a recipe parsing assistant. Parse the following recipe text and extract structured recipe information.

The text may be formatted in various ways:
- Traditional recipe format with clear "Ingredients:" and "Instructions:" sections
- Casual recipe shared in an email or message
- Recipe from a cookbook or magazine
- Incomplete or partial recipe information

Extract as much information as possible from the text:

Recipe Text:
---
${text}
---

Return ONLY a valid JSON object in this exact format:
{
  "recipeName": "string",
  "description": "string (brief description of the dish)",
  "servings": number (extract if mentioned, otherwise estimate based on quantities, default to 4),
  "prepTimeMinutes": number or null (extract if mentioned),
  "cookTimeMinutes": number or null (extract if mentioned),
  "cuisineType": "string or null (e.g., 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean')",
  "difficultyLevel": "Easy" | "Medium" | "Hard" (based on complexity of instructions)",
  "mealType": ["Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"],
  "isVegetarian": boolean,
  "isVegan": boolean,
  "containsMeat": boolean,
  "containsSeafood": boolean,
  "isDairyFree": boolean,
  "isGlutenFree": boolean,
  "containsNuts": boolean,
  "ingredients": [
    {
      "ingredientName": "string",
      "quantity": number,
      "unit": "string (e.g., 'cup', 'tbsp', 'tsp', 'g', 'ml', 'oz', 'lb', 'piece', '')"
    }
  ],
  "instructions": [
    {
      "stepNumber": number,
      "instruction": "string"
    }
  ]
}

**Important:**
- Extract exact quantities and measurements from the text
- Preserve the cooking instructions as written
- If ingredient quantities are missing, estimate reasonable amounts
- If instructions are missing, provide basic cooking steps
- Parse various formats: "2 cups", "2c", "2 C", "two cups" should all become quantity: 2, unit: "cup"
- Normalize units: "tablespoon"/"Tbsp"/"T" → "tbsp", "teaspoon"/"tsp"/"t" → "tsp"
- Infer dietary properties from ingredients`

  try {
    console.log('🔷 Calling Claude API to parse recipe text...')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
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
      throw new Error('No valid JSON found in Claude response')
    }

    const recipe = JSON.parse(jsonMatch[0])
    console.log('🟢 Recipe parsed successfully:', recipe.recipeName)

    return recipe
  } catch (error) {
    console.error('❌ Error parsing recipe text with Claude:', error)
    throw error
  }
}

export async function analyzeRecipeMacros(params: {
  recipe: {
    recipeName: string
    servings: number
    ingredients: Array<{
      ingredientName: string
      quantity: number
      unit: string
    }>
    caloriesPerServing?: number | null
    proteinPerServing?: number | null
    carbsPerServing?: number | null
    fatPerServing?: number | null
  }
  userProfile: {
    dailyCalorieTarget?: number | null
    dailyProteinTarget?: number | null
    dailyCarbsTarget?: number | null
    dailyFatTarget?: number | null
    macroTrackingEnabled: boolean
  }
}) {
  const { recipe, userProfile } = params

  const ingredientList = recipe.ingredients
    .map(ing => `${ing.quantity} ${ing.unit} ${ing.ingredientName}`)
    .join('\n')

  const prompt = `You are a nutrition expert. Analyze this recipe and provide macro ratings based on the user's dietary goals.

RECIPE:
Name: ${recipe.recipeName}
Servings: ${recipe.servings}

INGREDIENTS (per ${recipe.servings} servings):
${ingredientList}

USER'S DAILY TARGETS:
${userProfile.macroTrackingEnabled ? `
- Calories: ${userProfile.dailyCalorieTarget || 2000} kcal
- Protein: ${userProfile.dailyProteinTarget || 50}g
- Carbs: ${userProfile.dailyCarbsTarget || 250}g
- Fat: ${userProfile.dailyFatTarget || 70}g
` : 'User has not set macro targets - use general healthy eating guidelines (2000 kcal, 50g protein, 250g carbs, 70g fat)'}

Calculate nutrition per serving and rate suitability for this user.

CRITICAL: You MUST provide a rating for EVERY SINGLE ingredient listed above. The ingredientRatings array must contain exactly ${recipe.ingredients.length} items.

Return ONLY a valid JSON object:
{
  "perServing": {
    "calories": number,
    "protein": number,
    "carbs": number,
    "fat": number,
    "fiber": number,
    "sugar": number,
    "sodium": number
  },
  "overallRating": "green" | "yellow" | "red",
  "overallExplanation": "1 sentence why this rating (mention specific macro concern if yellow/red)",
  "ingredientRatings": [
    {
      "ingredientName": "exact name from ingredients list",
      "rating": "green" | "yellow" | "red",
      "reason": "1 sentence (e.g., 'High in saturated fat' or 'Good protein source')"
    }
    // MUST have one entry for EACH ingredient above
  ]
}

Rating criteria:
- GREEN: Aligns well with user's targets, healthy ingredient
- YELLOW: Moderate concern (e.g., slightly high in calories/fat/sugar for user's goals)
- RED: Poor fit for user's goals (e.g., very high fat when user needs low-fat, excessive calories)

Consider: calories per serving vs daily target, macro ratios, ingredient health profiles.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse macro analysis from Claude response')
    }

    return JSON.parse(jsonMatch[0])
  } catch (error) {
    console.error('Error analyzing recipe macros with Claude:', error)
    throw error
  }
}

export async function analyzeInventoryPhoto(images: string[]) {
  const imageCount = images.length
  const prompt = `You are a grocery and food inventory recognition assistant. Analyze ${imageCount === 1 ? 'this image' : `these ${imageCount} images`} and identify all food items visible.

${imageCount > 1 ? 'Note: Multiple images are provided. Extract items from all images.' : ''}

The image${imageCount > 1 ? 's' : ''} may contain:
- A photo of groceries (shopping bags, items on counter, etc.)
- A photo of refrigerator/freezer/pantry contents
- A receipt or shopping list (extract the items)
- Food packaging with product names

For each item identified, provide:
1. The name of the item (be specific, e.g., "Semi-skimmed Milk" not just "Milk")
2. Estimated quantity if visible (e.g., 2 bottles, 500g pack)
3. Unit of measurement (e.g., "each", "g", "ml", "litres")
4. Suggested category (Meat & Fish, Fresh Produce, Dairy & Eggs, Bakery, Chilled & Deli, Frozen, Cupboard Staples, Baking & Cooking Ingredients, Breakfast, Drinks, Snacks & Treats, Household, Other)
5. Suggested storage location (fridge, freezer, cupboard, pantry)

Return ONLY a valid JSON object in this exact format:
{
  "items": [
    {
      "itemName": "string (be specific)",
      "quantity": number (default 1 if unsure),
      "unit": "string (e.g., 'each', 'g', 'kg', 'ml', 'litres', 'pack')",
      "category": "string (from categories above)",
      "location": "fridge" | "freezer" | "cupboard" | "pantry",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief description of what was found (e.g., '12 items identified from grocery shopping')"
}

Important:
- Include ALL visible food items
- Be as specific as possible with item names
- Use metric units (g, ml, litres) where appropriate
- Don't include non-food items (cleaning products, etc.) unless they're explicitly household category
- Set confidence to "low" if item is partially obscured or unclear`

  try {
    console.log('🔷 Calling Claude API to analyze inventory photo...')

    // Build content array with all images followed by the prompt
    const content: any[] = []

    // Add all images to content
    for (const imageData of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.startsWith('data:image/png') ? 'image/png' :
                     imageData.startsWith('data:image/jpeg') ? 'image/jpeg' :
                     imageData.startsWith('data:image/jpg') ? 'image/jpeg' : 'image/jpeg',
          data: imageData.replace(/^data:image\/\w+;base64,/, '')
        }
      })
    }

    // Add text prompt after images
    content.push({
      type: 'text',
      text: prompt
    })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 Claude response received, length:', responseText.length)

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response')
    }

    const result = JSON.parse(jsonMatch[0])
    console.log('🟢 Inventory items extracted:', result.items?.length || 0)

    return result
  } catch (error) {
    console.error('❌ Error analyzing inventory photo with Claude:', error)
    throw error
  }
}

/**
 * Analyze photos to extract recurring staple items
 */
export async function analyzeStaplesPhoto(images: string[]) {
  const imageCount = images.length
  const prompt = `You are a household staples and recurring purchase assistant. Analyze ${imageCount === 1 ? 'this image' : `these ${imageCount} images`} and identify items that are likely recurring household staples (items purchased regularly).

${imageCount > 1 ? 'Note: Multiple images are provided. Extract items from all images.' : ''}

The image${imageCount > 1 ? 's' : ''} may contain:
- A photo of groceries or shopping items
- A shopping list or grocery list
- A receipt showing regular purchases
- Pantry, fridge, or cupboard contents

Focus on identifying RECURRING STAPLES - items that households typically buy repeatedly, such as:
- Dairy (milk, eggs, butter, cheese)
- Bread and bakery items
- Fresh produce bought weekly
- Cleaning and household supplies
- Basic cooking ingredients
- Snacks and beverages consumed regularly

IMPORTANT - ITEM NAMING RULES:
- Use GENERIC product names only, NOT brand names or country of origin
- Example: "Semi-Skimmed Milk" NOT "Cowbelle British Semi-Skimmed Milk"
- Example: "Hot Sauce" or "Pineapple Hot Sauce" NOT "Sauce Shop Burnt Pineapple Hot Sauce"
- Example: "Cheddar Cheese" NOT "Cathedral City Mature Cheddar"
- Focus on WHAT the product is, not WHO makes it

For each item identified, provide:
1. The GENERIC name of the item (no brands, no country)
2. Suggested quantity per purchase
3. Unit of measurement
4. Category for shopping
5. Suggested purchase frequency

Return ONLY a valid JSON object in this exact format:
{
  "items": [
    {
      "itemName": "string (generic name only - no brands!)",
      "quantity": number,
      "unit": "string (e.g., 'each', 'litres', 'g', 'kg', 'pack')",
      "category": "string (Meat & Fish, Fresh Produce, Dairy & Eggs, Bakery, Chilled & Deli, Frozen, Cupboard Staples, Baking & Cooking Ingredients, Breakfast, Drinks, Snacks & Treats, Household, Other)",
      "frequency": "weekly" | "every_2_weeks" | "every_4_weeks" | "every_3_months",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief description of what was found"
}

Frequency values (use EXACTLY these strings):
- "weekly": Items purchased once a week (milk, bread, fresh produce)
- "every_2_weeks": Items purchased every two weeks (eggs, cheese)
- "every_4_weeks": Items purchased monthly (condiments, sauces, cleaning supplies)
- "every_3_months": Items purchased quarterly (long-lasting pantry items)`

  try {
    console.log('🔷 Calling Claude API to analyze photo for staples...')

    const content: any[] = []

    for (const imageData of images) {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageData.startsWith('data:image/png') ? 'image/png' :
                     imageData.startsWith('data:image/jpeg') ? 'image/jpeg' :
                     imageData.startsWith('data:image/jpg') ? 'image/jpeg' : 'image/jpeg',
          data: imageData.replace(/^data:image\/\w+;base64,/, '')
        }
      })
    }

    content.push({
      type: 'text',
      text: prompt
    })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 Claude response received, length:', responseText.length)

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response')
    }

    const result = JSON.parse(jsonMatch[0])
    console.log('🟢 Staple items extracted:', result.items?.length || 0)

    return result
  } catch (error) {
    console.error('❌ Error analyzing staples photo with Claude:', error)
    throw error
  }
}

/**
 * Analyze URL content to extract recurring staple items
 */
export async function analyzeStaplesUrl(url: string, htmlContent: string) {
  console.log('🔷 Analyzing URL for staples:', url)

  const visibleText = extractVisibleText(htmlContent).substring(0, 15000)

  const prompt = `You are a household staples and recurring purchase assistant. Analyze the following web content and extract items that would make good recurring household staples.

URL: ${url}

**PAGE CONTENT:**
${htmlContent.substring(0, 15000)}

**VISIBLE TEXT:**
${visibleText}

---

Look for shopping lists, grocery lists, weekly meal plans, or any content that mentions items typically purchased repeatedly.

Focus on identifying RECURRING STAPLES - items that households typically buy repeatedly, such as:
- Dairy (milk, eggs, butter, cheese)
- Bread and bakery items
- Fresh produce bought weekly
- Cleaning and household supplies
- Basic cooking ingredients
- Snacks and beverages consumed regularly

IMPORTANT - ITEM NAMING RULES:
- Use GENERIC product names only, NOT brand names or country of origin
- Example: "Semi-Skimmed Milk" NOT "Tesco British Semi-Skimmed Milk"
- Focus on WHAT the product is, not WHO makes it

For each item identified, provide:
1. The GENERIC name of the item (no brands!)
2. Suggested quantity per purchase
3. Unit of measurement
4. Category for shopping
5. Suggested purchase frequency

Return ONLY a valid JSON object in this exact format:
{
  "items": [
    {
      "itemName": "string (generic name only - no brands!)",
      "quantity": number,
      "unit": "string",
      "category": "string (Meat & Fish, Fresh Produce, Dairy & Eggs, Bakery, Chilled & Deli, Frozen, Cupboard Staples, Baking & Cooking Ingredients, Breakfast, Drinks, Snacks & Treats, Household, Other)",
      "frequency": "weekly" | "every_2_weeks" | "every_4_weeks" | "every_3_months",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief description of what was found on the page"
}

Frequency values (use EXACTLY these strings):
- "weekly": Items purchased once a week (milk, bread, fresh produce)
- "every_2_weeks": Items purchased every two weeks (eggs, cheese)
- "every_4_weeks": Items purchased monthly (condiments, cleaning supplies)
- "every_3_months": Items purchased quarterly (long-lasting pantry items)

If no staple items can be identified, return:
{
  "items": [],
  "summary": "No staple items could be identified from this page."
}`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    console.log('🟢 Claude response received, length:', responseText.length)

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in Claude response')
    }

    const result = JSON.parse(jsonMatch[0])
    console.log('🟢 Staple items extracted from URL:', result.items?.length || 0)

    return result
  } catch (error) {
    console.error('❌ Error analyzing staples URL with Claude:', error)
    throw error
  }
}

export async function getNutritionistFeedbackForRecipe(params: {
  recipe: {
    recipeName: string
    description?: string | null
    servings: number
    mealType: string[]
    ingredients: Array<{
      ingredientName: string
      quantity: number
      unit: string
    }>
  }
  userProfile: {
    profileName: string
    age?: number | null
    activityLevel?: string | null
    allergies: any
    foodDislikes: string[]
    dailyCalorieTarget?: number | null
    dailyProteinTarget?: number | null
    dailyCarbsTarget?: number | null
    dailyFatTarget?: number | null
    macroTrackingEnabled: boolean
  }
  macroAnalysis: {
    perServing: {
      calories: number
      protein: number
      carbs: number
      fat: number
    }
    overallRating: string
  }
}) {
  const { recipe, userProfile, macroAnalysis } = params

  const allergies = Array.isArray(userProfile.allergies)
    ? userProfile.allergies
    : (typeof userProfile.allergies === 'string' ? [userProfile.allergies] : [])

  const prompt = `You are Emilia, a friendly and knowledgeable nutritionist. Provide personalized, encouraging feedback about this recipe for your client.

CLIENT PROFILE:
Name: ${userProfile.profileName}
Age: ${userProfile.age || 'Not specified'}
Activity Level: ${userProfile.activityLevel || 'Moderate'}
Allergies: ${allergies.length > 0 ? allergies.join(', ') : 'None'}
Dislikes: ${userProfile.foodDislikes.length > 0 ? userProfile.foodDislikes.join(', ') : 'None specified'}
${userProfile.macroTrackingEnabled ? `
Daily Targets:
- Calories: ${userProfile.dailyCalorieTarget} kcal
- Protein: ${userProfile.dailyProteinTarget}g
- Carbs: ${userProfile.dailyCarbsTarget}g
- Fat: ${userProfile.dailyFatTarget}g
` : ''}

RECIPE:
Name: ${recipe.recipeName}
${recipe.description || ''}
Meal Type: ${recipe.mealType.join(', ')}
Servings: ${recipe.servings}

NUTRITION PER SERVING:
- Calories: ${macroAnalysis.perServing.calories} kcal
- Protein: ${macroAnalysis.perServing.protein}g
- Carbs: ${macroAnalysis.perServing.carbs}g
- Fat: ${macroAnalysis.perServing.fat}g

Overall Rating: ${macroAnalysis.overallRating}

Provide warm, personalized feedback (2-4 sentences) as Emilia the nutritionist:
1. Comment on how well this fits ${userProfile.profileName}'s goals
2. Highlight positives (good nutrients, ingredients)
3. If there are concerns (allergies, high in something they should limit), mention gently
4. Offer 1 simple suggestion if relevant (e.g., "swap X for Y", "pair with a salad")

Write in first person as Emilia. Be encouraging and friendly, not clinical. Return ONLY the feedback text, no JSON.

Example tone: "Hi! This looks like a great choice - the protein content will really support an active lifestyle. The fiber from the beans is a nice bonus too. Just watch the sodium if you're sensitive to salt. Maybe pair it with a fresh salad to add more veggies?"`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    return message.content[0].type === 'text' ? message.content[0].text : ''
  } catch (error) {
    console.error('Error getting nutritionist feedback with Claude:', error)
    throw error
  }
}
