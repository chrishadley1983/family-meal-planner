import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function generateMealPlan(params: {
  profiles: any[]
  recipes: any[]
  weekStartDate: string
  preferences?: any
}) {
  const { profiles, recipes, weekStartDate, preferences } = params

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
      model: 'claude-haiku-4-5',
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
      model: 'claude-haiku-4-5',
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

export async function parseRecipeFromUrl(url: string, htmlContent: string) {
  const prompt = `You are an expert recipe extraction assistant. Carefully analyze the HTML content and extract ALL recipe details with high accuracy.

URL: ${url}

HTML CONTENT:
${htmlContent.substring(0, 25000)}

CRITICAL INSTRUCTIONS:
1. **Ingredients**: MUST include quantity + unit + name for EVERY ingredient
   - Convert fractions to decimals (1/2 = 0.5)
   - Use standard units (tsp, tbsp, cup, g, kg, ml, l, oz, lb, whole, clove, etc.)
   - If quantity is missing, use 1 as default
   - Parse ranges (e.g., "2-3 cups" = 2.5 cups)

2. **Cooking Instructions**: Extract EVERY step in order
   - Number steps sequentially (1, 2, 3...)
   - Each step should be a complete instruction
   - Look for "Method", "Directions", "Instructions", "Steps" sections

3. **Times**: Convert ALL times to minutes
   - "1 hour" = 60 minutes
   - "1 hour 30 mins" = 90 minutes
   - "30 seconds" = 0.5 minutes

4. **Servings**: Extract the number (e.g., "Serves 4" = 4)

Extract and return ONLY a valid JSON object in this EXACT format:
{
  "recipeName": "string",
  "description": "string or null",
  "servings": number,
  "prepTimeMinutes": number or null,
  "cookTimeMinutes": number or null,
  "cuisineType": "string or null",
  "difficultyLevel": "Easy" | "Medium" | "Hard" | null,
  "mealCategory": ["Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"],
  "ingredients": [
    {
      "ingredientName": "string",
      "quantity": number (REQUIRED - use 1 if not specified),
      "unit": "string (REQUIRED - use 'whole', 'clove', 'pinch', etc. if no unit)",
      "notes": "string or null (e.g., 'chopped', 'diced')"
    }
  ],
  "instructions": [
    {
      "stepNumber": number,
      "instruction": "string (complete step description)"
    }
  ],
  "caloriesPerServing": number or null,
  "proteinPerServing": number or null,
  "carbsPerServing": number or null,
  "fatPerServing": number or null,
  "fiberPerServing": number or null,
  "notes": "string or null"
}

EXAMPLE of GOOD extraction:
{
  "ingredientName": "lean beef mince",
  "quantity": 500,
  "unit": "g",
  "notes": "lean"
}

EXAMPLE of BAD extraction (missing quantity/unit):
{
  "ingredientName": "lean beef mince",
  "quantity": null,  // WRONG - should never be null!
  "unit": null       // WRONG - should never be null!
}

Return ONLY the JSON object, no explanatory text before or after.`

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

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse recipe from Claude response')
    }

    const recipe = JSON.parse(jsonMatch[0])
    return recipe
  } catch (error) {
    console.error('Error parsing recipe with Claude:', error)
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

export async function analyzeRecipePhoto(imageData: string) {
  const prompt = `You are a recipe recognition assistant. Analyze this food photo and identify the dish.

Based on the image, provide:
1. The name of the dish
2. A list of likely ingredients
3. Suggested cuisine type
4. Estimated difficulty level
5. Suggested meal categories

Return ONLY a valid JSON object in this exact format:
{
  "recipeName": "string",
  "description": "string",
  "cuisineType": "string or null",
  "difficultyLevel": "Easy" | "Medium" | "Hard",
  "mealCategory": ["Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"],
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

Be specific and practical in your suggestions.`

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: imageData.startsWith('data:image/png') ? 'image/png' :
                         imageData.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/jpeg',
              data: imageData.replace(/^data:image\/\w+;base64,/, '')
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
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
