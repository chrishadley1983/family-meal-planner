import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export async function generateMealPlan(params: {
  profiles: any[]
  recipes: any[]
  weekStartDate: string
  preferences?: any
  weekProfileSchedules?: any[]
}) {
  const { profiles, recipes, weekStartDate, preferences, weekProfileSchedules } = params

  // Calculate which meals need to be planned based on all family profiles
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

  // Use weekProfileSchedules if provided, otherwise build from profiles
  let activeProfiles: any[]
  let mealScheduleUnion: MealSchedule
  let servingsMap: Record<string, Record<string, number>> = {} // day -> mealType -> count

  if (weekProfileSchedules && weekProfileSchedules.length > 0) {
    // Use the provided per-person schedules for this week
    activeProfiles = weekProfileSchedules.filter((ps: any) => ps.included)

    mealScheduleUnion = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }

    // Build union and count servings
    daysOfWeek.forEach(day => {
      servingsMap[day] = {}

      activeProfiles.forEach(profileSchedule => {
        const meals = profileSchedule.schedule[day] || []
        meals.forEach((meal: string) => {
          // Add to union if not already there
          if (!mealScheduleUnion[day as keyof MealSchedule].includes(meal)) {
            mealScheduleUnion[day as keyof MealSchedule].push(meal)
          }
          // Count servings
          servingsMap[day][meal] = (servingsMap[day][meal] || 0) + 1
        })
      })
    })
  } else {
    // Build union of all meal schedules from profile defaults
    activeProfiles = profiles
    mealScheduleUnion = {
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
      sunday: []
    }

    // Collect schedules from all profiles and count servings
    daysOfWeek.forEach(day => {
      servingsMap[day] = {}

      profiles.forEach(profile => {
        const schedule = profile.mealAvailability as MealSchedule | null
        if (schedule) {
          const meals = schedule[day as keyof MealSchedule] || []
          meals.forEach(meal => {
            if (!mealScheduleUnion[day as keyof MealSchedule].includes(meal)) {
              mealScheduleUnion[day as keyof MealSchedule].push(meal)
            }
            servingsMap[day][meal] = (servingsMap[day][meal] || 0) + 1
          })
        }
      })
    })
  }

  // Build schedule summary with servings for the prompt
  const scheduleSummary = daysOfWeek.map(day => {
    const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1)
    const meals = mealScheduleUnion[day as keyof MealSchedule]
    if (meals.length === 0) {
      return `${dayCapitalized}: No meals needed`
    }
    const mealsWithServings = meals.map(m => {
      const mealName = m.charAt(0).toUpperCase() + m.slice(1).replace('-', ' ')
      const servings = servingsMap[day][m] || 1
      return `${mealName} (${servings} ${servings === 1 ? 'person' : 'people'})`
    })
    return `${dayCapitalized}: ${mealsWithServings.join(', ')}`
  }).join('\n')

  // Build per-person schedule for context
  let perPersonSchedules: string
  if (weekProfileSchedules && weekProfileSchedules.length > 0) {
    perPersonSchedules = weekProfileSchedules.map((ps: any, i: number) => {
      if (!ps.included) {
        return `Profile ${i + 1} (${ps.profileName}): EXCLUDED from this week`
      }
      const summary = daysOfWeek.map(day => {
        const meals = ps.schedule[day] || []
        return meals.length > 0 ? meals.join(', ') : 'none'
      }).join(' | ')
      return `Profile ${i + 1} (${ps.profileName}): ${summary}`
    }).join('\n')
  } else {
    perPersonSchedules = profiles.map((p, i) => {
      const schedule = p.mealAvailability as MealSchedule | null
      if (!schedule) {
        return `Profile ${i + 1} (${p.profileName}): No specific schedule`
      }
      const summary = daysOfWeek.map(day => {
        const meals = schedule[day as keyof MealSchedule] || []
        return meals.length > 0 ? meals.join(', ') : 'none'
      }).join(' | ')
      return `Profile ${i + 1} (${p.profileName}): ${summary}`
    }).join('\n')
  }

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

MEAL SCHEDULE (combined from all family members):
${scheduleSummary}

INDIVIDUAL SCHEDULES:
${perPersonSchedules}

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

Generate a meal plan ONLY for the meals specified in the MEAL SCHEDULE above. For each meal listed:
1. Select an appropriate recipe from the available recipes that matches the meal type
2. Consider family preferences and dietary needs
3. Provide variety throughout the week
4. Balance nutrition across the week
5. **IMPORTANT**: Use the EXACT servings count shown in parentheses in the MEAL SCHEDULE (e.g., "Dinner (3 people)" means servings: 3)

Return ONLY a valid JSON object in this exact format:
{
  "meals": [
    {
      "dayOfWeek": "Monday",
      "mealType": "Breakfast",
      "recipeId": "recipe-id-from-list",
      "recipeName": "Recipe Name",
      "servings": 4,
      "notes": "Brief note about why this meal was chosen"
    }
  ],
  "summary": "Brief summary of the meal plan strategy and nutritional balance"
}

Important:
- Return ONLY the JSON object, no other text
- ONLY generate meals that appear in the MEAL SCHEDULE
- Use proper capitalization for dayOfWeek (Monday, Tuesday, etc.)
- Use proper capitalization for mealType (Breakfast, Lunch, Dinner, etc.)`

  try {
    console.log('🔷 Calling Claude API for meal plan generation...')
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
    console.log('🟢 Response preview (first 500 chars):', responseText.substring(0, 500))

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('❌ No JSON found in Claude response')
      console.error('Full response:', responseText)
      throw new Error('Failed to parse meal plan from Claude response')
    }

    console.log('🟢 JSON extracted, length:', jsonMatch[0].length)

    try {
      const mealPlan = JSON.parse(jsonMatch[0])
      console.log('🟢 Meal plan parsed successfully, meals count:', mealPlan.meals?.length || 0)
      return mealPlan
    } catch (parseError: any) {
      console.error('❌ JSON parse error:', parseError.message)
      console.error('❌ Malformed JSON (first 1000 chars):', jsonMatch[0].substring(0, 1000))
      console.error('❌ Malformed JSON (last 500 chars):', jsonMatch[0].substring(Math.max(0, jsonMatch[0].length - 500)))
      throw new Error(`Invalid JSON from Claude: ${parseError.message}`)
    }
  } catch (error) {
    console.error('❌ Error generating meal plan with Claude:', error)
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
