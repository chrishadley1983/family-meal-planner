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
   - Categories: ${r.mealType.join(', ')}
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
  "cuisineType": "string or null (e.g., 'Pasta', 'Curry', 'Stir-fry', 'Thai', 'BBQ', 'Pizza', 'Salad')",
  "difficultyLevel": "Easy" | "Medium" | "Hard" | null,
  "mealType": ["Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert"],
  "isVegetarian": boolean (true if no meat/seafood),
  "isVegan": boolean (true if no animal products at all),
  "containsMeat": boolean (true if contains beef, pork, chicken, lamb, etc.),
  "containsSeafood": boolean (true if contains fish, shrimp, etc.),
  "isDairyFree": boolean (true if no milk, cheese, butter, cream, yogurt),
  "isGlutenFree": boolean (true if no wheat, flour, bread, pasta with gluten),
  "containsNuts": boolean (true if contains any nuts or nut products),
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

  const prompt = `You are Sarah, a friendly and knowledgeable nutritionist. Provide personalized, encouraging feedback about this recipe for your client.

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

Provide warm, personalized feedback (2-4 sentences) as Sarah the nutritionist:
1. Comment on how well this fits ${userProfile.profileName}'s goals
2. Highlight positives (good nutrients, ingredients)
3. If there are concerns (allergies, high in something they should limit), mention gently
4. Offer 1 simple suggestion if relevant (e.g., "swap X for Y", "pair with a salad")

Write in first person as Sarah. Be encouraging and friendly, not clinical. Return ONLY the feedback text, no JSON.

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
