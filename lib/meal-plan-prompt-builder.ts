// AI Prompt Builder for Meal Plan Generation
// Constructs complex prompts based on user settings and context

import { format, differenceInDays } from 'date-fns'
import {
  MealPlanSettings,
  RecipeUsageHistory,
  InventoryItem,
  RecipeWithScore,
  PromptBuilderParams,
  getCooldownForMealType,
  isPantryStaple,
  getLeftoverShelfLife,
  PANTRY_STAPLES,
  QuickOptions
} from './types/meal-plan-settings'

/**
 * Main function to build the complete AI prompt for meal plan generation
 */
export function buildMealPlanPrompt(
  params: PromptBuilderParams,
  quickOptions?: QuickOptions
): string {
  const systemPrompt = buildSystemPrompt()
  const mainPrompt = buildMainPrompt(params, quickOptions)

  return `${systemPrompt}\n\n${mainPrompt}`
}

/**
 * Build the system prompt (defines Claude's role and behavior)
 */
function buildSystemPrompt(): string {
  return `You are Sarah, an experienced nutritionist and meal planning assistant for busy families. Your role is to generate balanced, practical weekly meal plans that respect dietary needs, maximize variety, and make shopping/cooking efficient.

You have deep knowledge of:
- Macro-nutrient balance and flexible dieting approaches
- Recipe variety and cooldown management to prevent meal fatigue
- Shopping efficiency and pantry staple optimization
- Food expiry management and inventory planning
- Batch cooking and meal prep strategies
- Family dietary preferences and restrictions

Your responses should be:
- Practical and achievable for busy families
- Balanced between nutritional goals and real-life flexibility
- Considerate of time constraints and cooking complexity
- Friendly and encouraging in tone`
}

/**
 * Build the main prompt with all context and requirements
 */
function buildMainPrompt(
  params: PromptBuilderParams,
  quickOptions?: QuickOptions
): string {
  const {
    profiles,
    recipes,
    weekStartDate,
    weekProfileSchedules,
    settings,
    recipeHistory,
    inventory
  } = params

  // Apply quick options (temporary overrides)
  const effectiveSettings = applyQuickOptions(settings, quickOptions)

  const sections: string[] = []

  // 1. Context Section
  sections.push(buildContextSection(profiles, weekStartDate, weekProfileSchedules))

  // 2. Macro Targeting Section
  sections.push(buildMacroSection(effectiveSettings, profiles))

  // 3. Recipe Variety Section
  if (effectiveSettings.varietyEnabled) {
    sections.push(buildVarietySection(effectiveSettings, recipeHistory, recipes))
  }

  // 4. Shopping Efficiency Section
  sections.push(buildShoppingSection(effectiveSettings))

  // 5. Inventory & Expiry Section
  if (inventory.length > 0) {
    sections.push(buildInventorySection(effectiveSettings, inventory))
  }

  // 6. Batch Cooking Section
  if (effectiveSettings.batchCookingEnabled) {
    sections.push(buildBatchCookingSection(effectiveSettings))
  }

  // 7. Priority Ordering Section
  sections.push(buildPrioritySection(effectiveSettings))

  // 8. Recipe List Section (with enrichments)
  sections.push(buildRecipeListSection(recipes, recipeHistory, effectiveSettings, weekStartDate))

  // 9. JSON Output Format Section
  sections.push(buildOutputFormatSection())

  // 10. Sarah's Feedback Section
  sections.push(buildFeedbackSection(effectiveSettings))

  return sections.join('\n\n---\n\n')
}

/**
 * Apply quick options to override settings temporarily
 */
function applyQuickOptions(
  settings: MealPlanSettings,
  quickOptions?: QuickOptions
): MealPlanSettings {
  if (!quickOptions) return settings

  return {
    ...settings,
    shoppingMode: quickOptions.prioritizeShopping ? 'aggressive' : settings.shoppingMode,
    expiryPriority: quickOptions.useExpiring ? 'strong' : settings.expiryPriority,
    batchCookingEnabled: quickOptions.maximizeBatch ?? settings.batchCookingEnabled
  }
}

/**
 * Section 1: Context (Profiles, Week, Schedules)
 */
function buildContextSection(
  profiles: any[],
  weekStartDate: string,
  weekProfileSchedules: any[]
): string {
  const weekStart = new Date(weekStartDate)
  const formattedDate = format(weekStart, 'MMMM d, yyyy')

  let context = `# CONTEXT\n\n`
  context += `**Week Starting:** ${formattedDate}\n\n`
  context += `**Family Profiles:**\n`

  profiles.forEach(profile => {
    context += `\n- **${profile.profileName}** (Age: ${profile.age || 'N/A'})\n`

    if (profile.macroTrackingEnabled && profile.dailyCalorieTarget) {
      context += `  - Macro Targets: ${profile.dailyCalorieTarget} cal/day`
      if (profile.dailyProteinTarget) context += `, ${profile.dailyProteinTarget}g protein`
      if (profile.dailyCarbsTarget) context += `, ${profile.dailyCarbsTarget}g carbs`
      if (profile.dailyFatTarget) context += `, ${profile.dailyFatTarget}g fat`
      context += `\n`
    }

    if (profile.allergies && profile.allergies.length > 0) {
      context += `  - Allergies: ${profile.allergies.join(', ')}\n`
    }

    if (profile.foodDislikes && profile.foodDislikes.length > 0) {
      context += `  - Dislikes: ${profile.foodDislikes.join(', ')}\n`
    }

    if (profile.foodLikes && profile.foodLikes.length > 0) {
      context += `  - Likes: ${profile.foodLikes.join(', ')}\n`
    }
  })

  if (weekProfileSchedules && weekProfileSchedules.length > 0) {
    context += `\n**Meal Attendance Schedule:**\n`
    weekProfileSchedules.forEach((schedule: any) => {
      const profile = profiles.find(p => p.id === schedule.profileId)
      if (profile) {
        context += `\n- ${profile.profileName}:\n`
        Object.entries(schedule.schedule || {}).forEach(([day, meals]: [string, any]) => {
          const eating = Object.entries(meals || {})
            .filter(([_, isEating]) => isEating)
            .map(([mealType]) => mealType)
          if (eating.length > 0) {
            context += `  - ${day}: ${eating.join(', ')}\n`
          }
        })
      }
    })
  }

  return context
}

/**
 * Section 2: Macro Targeting Mode
 */
function buildMacroSection(settings: MealPlanSettings, profiles: any[]): string {
  let section = `# MACRO TARGETING\n\n`

  const macrosProfile = profiles.find(p => p.macroTrackingEnabled)

  if (!macrosProfile) {
    section += `No macro tracking enabled for this week. Focus on balanced nutrition and variety.\n`
    return section
  }

  section += `**Mode:** ${settings.macroMode.replace('_', ' ').toUpperCase()}\n\n`

  switch (settings.macroMode) {
    case 'balanced':
      section += `**Approach:** Flexible daily macro targeting with ±10% tolerance on all macros.\n\n`
      section += `Target daily totals for ${macrosProfile.profileName}:\n`
      section += `- Calories: ${macrosProfile.dailyCalorieTarget} ± ${Math.round(macrosProfile.dailyCalorieTarget * 0.1)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.1)}g\n`
      }
      if (macrosProfile.dailyCarbsTarget) {
        section += `- Carbs: ${macrosProfile.dailyCarbsTarget}g ± ${Math.round(macrosProfile.dailyCarbsTarget * 0.1)}g\n`
      }
      if (macrosProfile.dailyFatTarget) {
        section += `- Fat: ${macrosProfile.dailyFatTarget}g ± ${Math.round(macrosProfile.dailyFatTarget * 0.1)}g\n`
      }
      break

    case 'strict':
      section += `**Approach:** Precise daily tracking with ±5% tolerance on all macros.\n\n`
      section += `Target daily totals for ${macrosProfile.profileName}:\n`
      section += `- Calories: ${macrosProfile.dailyCalorieTarget} ± ${Math.round(macrosProfile.dailyCalorieTarget * 0.05)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.05)}g\n`
      }
      if (macrosProfile.dailyCarbsTarget) {
        section += `- Carbs: ${macrosProfile.dailyCarbsTarget}g ± ${Math.round(macrosProfile.dailyCarbsTarget * 0.05)}g\n`
      }
      if (macrosProfile.dailyFatTarget) {
        section += `- Fat: ${macrosProfile.dailyFatTarget}g ± ${Math.round(macrosProfile.dailyFatTarget * 0.05)}g\n`
      }
      break

    case 'weekday_discipline':
      section += `**Approach:** Strict on weekdays (±5%), relaxed on weekends (±25%).\n\n`
      section += `**Weekday Targets** (Monday-Friday) for ${macrosProfile.profileName}:\n`
      section += `- Calories: ${macrosProfile.dailyCalorieTarget} ± ${Math.round(macrosProfile.dailyCalorieTarget * 0.05)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.05)}g\n`
      }
      section += `\n**Weekend Targets** (Saturday-Sunday):\n`
      section += `- Calories: ${macrosProfile.dailyCalorieTarget} ± ${Math.round(macrosProfile.dailyCalorieTarget * 0.25)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.25)}g\n`
      }
      break

    case 'calorie_banking':
      const weekdayDeficit = Math.round(macrosProfile.dailyCalorieTarget * 0.85)
      const weekendSurplus = Math.round(macrosProfile.dailyCalorieTarget * 1.3)
      section += `**Approach:** Weekday deficit compensated by weekend surplus, weekly balance maintained.\n\n`
      section += `**Weekday Targets** (Monday-Friday) for ${macrosProfile.profileName}:\n`
      section += `- Calories: ~${weekdayDeficit} (85% of daily target)\n`
      section += `\n**Weekend Targets** (Saturday-Sunday):\n`
      section += `- Calories: ~${weekendSurplus} (130% of daily target)\n`
      section += `\n**Weekly Total:** ${macrosProfile.dailyCalorieTarget * 7} calories\n`
      break
  }

  section += `\n**Important:** Prioritize hitting these targets while balancing other constraints.\n`

  return section
}

/**
 * Section 3: Recipe Variety & Cooldowns
 */
function buildVarietySection(
  settings: MealPlanSettings,
  history: RecipeUsageHistory[],
  recipes: any[]
): string {
  let section = `# RECIPE VARIETY & COOLDOWNS\n\n`

  section += `**Cooldown Periods:**\n`
  section += `- Dinners: ${settings.dinnerCooldown} days\n`
  section += `- Lunches: ${settings.lunchCooldown} days\n`
  section += `- Breakfasts: ${settings.breakfastCooldown} days\n`
  section += `- Snacks/Desserts: ${settings.snackCooldown} days\n\n`

  section += `**Cuisine Variety Requirements:**\n`
  section += `- Minimum different cuisines in the week: ${settings.minCuisines}\n`
  section += `- Maximum meals from same cuisine: ${settings.maxSameCuisine}\n\n`

  section += `**Special Rules:**\n`
  section += `- Manually selected recipes (from previous plans) get a +1.5 rating point bonus\n`
  section += `- Respect cooldown periods strictly - don't use a recipe again until its cooldown has passed\n`
  section += `- Aim for diverse cuisine types across the week to prevent monotony\n`

  return section
}

/**
 * Section 4: Shopping Efficiency
 */
function buildShoppingSection(settings: MealPlanSettings): string {
  let section = `# SHOPPING EFFICIENCY\n\n`

  section += `**Mode:** ${settings.shoppingMode.toUpperCase()}\n\n`

  let ratingBoost = 0.3
  let description = ''

  switch (settings.shoppingMode) {
    case 'mild':
      ratingBoost = 0.3
      description = 'Slight preference for recipes that share ingredients (0.3 rating boost)'
      break
    case 'moderate':
      ratingBoost = 0.5
      description = 'Moderate preference for ingredient overlap (0.5 rating boost)'
      break
    case 'aggressive':
      ratingBoost = 0.8
      description = 'Strong preference for minimal unique ingredients (0.8 rating boost)'
      break
  }

  section += `**Approach:** ${description}\n\n`

  section += `**Pantry Staples (excluded from unique ingredient counting):**\n`
  section += PANTRY_STAPLES.slice(0, 20).join(', ') + ', ...\n\n'

  section += `**Implementation:**\n`
  section += `- Count unique ingredients across all selected recipes (excluding pantry staples)\n`
  section += `- When choosing between similar-rated recipes, favor those sharing ingredients already in the plan\n`
  section += `- Apply +${ratingBoost} rating boost to recipes that significantly reduce unique ingredient count\n`

  return section
}

/**
 * Section 5: Inventory & Expiry Management
 */
function buildInventorySection(
  settings: MealPlanSettings,
  inventory: InventoryItem[]
): string {
  let section = `# INVENTORY & EXPIRY MANAGEMENT\n\n`

  section += `**Priority Level:** ${settings.expiryPriority.toUpperCase()}\n\n`

  const today = new Date()
  const expiryWindowDate = new Date(today)
  expiryWindowDate.setDate(today.getDate() + settings.expiryWindow)

  const expiringItems = inventory.filter(item => {
    if (!item.expiryDate) return false
    return new Date(item.expiryDate) <= expiryWindowDate
  })

  if (expiringItems.length > 0) {
    section += `**Items Expiring Within ${settings.expiryWindow} Days:**\n`
    expiringItems.forEach(item => {
      const daysUntilExpiry = differenceInDays(new Date(item.expiryDate!), today)
      section += `- ${item.itemName} (${item.quantity} ${item.unit}) - expires in ${daysUntilExpiry} days\n`
    })
    section += `\n`
  }

  if (settings.useItUpItems.length > 0) {
    section += `**"Use It Up" Priority Items:**\n`
    settings.useItUpItems.forEach(itemId => {
      const item = inventory.find(i => i.id === itemId)
      if (item) {
        section += `- ${item.itemName} (${item.quantity} ${item.unit})\n`
      }
    })
    section += `\n`
  }

  let ratingBoost = 0.3
  switch (settings.expiryPriority) {
    case 'soft':
      ratingBoost = 0.3
      section += `**Approach:** Consider expiring items when possible (+${ratingBoost} rating boost)\n`
      break
    case 'moderate':
      ratingBoost = 0.5
      section += `**Approach:** Prioritize recipes using expiring items (+${ratingBoost} rating boost)\n`
      break
    case 'strong':
      ratingBoost = 1.0
      section += `**Approach:** Strongly favor recipes that use expiring items (+${ratingBoost} rating boost)\n`
      break
  }

  section += `\nWhen selecting recipes, check if they use any of the above ingredients and apply the rating boost accordingly.\n`

  return section
}

/**
 * Section 6: Batch Cooking / Meal Prep
 */
function buildBatchCookingSection(settings: MealPlanSettings): string {
  let section = `# BATCH COOKING & MEAL PREP\n\n`

  section += `**Enabled:** Yes\n`
  section += `**Maximum Leftover Days:** ${settings.maxLeftoverDays}\n\n`

  section += `**Leftover Shelf Life Rules:**\n`
  section += `- Chicken/Turkey: 3 days\n`
  section += `- Beef/Pork/Lamb: 4 days\n`
  section += `- Fish/Seafood: 2 days\n`
  section += `- Cooked Vegetables: 4 days\n`
  section += `- Grains/Beans: 5 days\n`
  section += `- Salads: 2 days\n\n`

  section += `**Batch Cooking Strategy:**\n`
  section += `- Look for recipes marked with yieldsMultipleMeals=true\n`
  section += `- Calculate if the recipe can serve multiple meals within its shelf life\n`
  section += `- Only batch cook for consecutive or close-together days (not spread across the week)\n`
  section += `- Override maximum leftover days to ${settings.maxLeftoverDays} if ingredient shelf life allows\n`
  section += `- Include storage/reheating instructions in the meal notes\n\n`

  section += `**Example:** If making a chicken casserole on Monday (3-day shelf life), it can be used for Monday dinner and Wednesday lunch.\n`

  return section
}

/**
 * Section 7: Priority Ordering
 */
function buildPrioritySection(settings: MealPlanSettings): string {
  let section = `# PRIORITY ORDERING\n\n`

  section += `When constraints conflict, resolve them in this priority order (highest to lowest):\n\n`

  const priorityLabels: Record<string, string> = {
    macros: 'Macro Targets',
    ratings: 'Recipe Ratings (family preferences)',
    variety: 'Recipe Variety & Cooldowns',
    shopping: 'Shopping Efficiency',
    prep: 'Meal Prep / Batch Cooking',
    time: 'Cooking Time Minimization'
  }

  settings.priorityOrder.forEach((priority, index) => {
    section += `${index + 1}. **${priorityLabels[priority]}**\n`
  })

  section += `\nIf you cannot satisfy all constraints, sacrifice lower-priority items first.\n`

  return section
}

/**
 * Section 8: Recipe List (with enrichments)
 */
function buildRecipeListSection(
  recipes: any[],
  history: RecipeUsageHistory[],
  settings: MealPlanSettings,
  weekStartDate: string
): string {
  const today = new Date(weekStartDate)

  // Enrich recipes with history data
  const enrichedRecipes = recipes.map(recipe => {
    const recipeHistory = history.filter(h => h.recipeId === recipe.id)

    if (recipeHistory.length === 0) {
      return {
        ...recipe,
        cooldownDaysRemaining: 0,
        bonusPoints: 0,
        lastUsedDate: null,
        wasManuallySelected: false
      }
    }

    // Find most recent usage
    const sortedHistory = recipeHistory.sort((a, b) =>
      new Date(b.usedDate).getTime() - new Date(a.usedDate).getTime()
    )
    const lastUsage = sortedHistory[0]
    const lastUsedDate = new Date(lastUsage.usedDate)
    const daysSinceUsed = differenceInDays(today, lastUsedDate)

    // Determine cooldown period for this recipe based on its meal types
    const mealTypes = recipe.mealType || []
    const cooldowns = mealTypes.map((type: string) => getCooldownForMealType(type, settings))
    const maxCooldown = Math.max(...cooldowns, 0)

    const cooldownRemaining = Math.max(0, maxCooldown - daysSinceUsed)

    // Check if it was manually selected
    const wasManuallySelected = sortedHistory.some(h => h.wasManual)
    const bonusPoints = wasManuallySelected ? 1.5 : 0

    return {
      ...recipe,
      cooldownDaysRemaining: cooldownRemaining,
      bonusPoints,
      lastUsedDate: format(lastUsedDate, 'yyyy-MM-dd'),
      wasManuallySelected
    }
  })

  let section = `# AVAILABLE RECIPES\n\n`
  section += `Total recipes: ${enrichedRecipes.length}\n\n`

  section += `**Recipe List:**\n\n`

  enrichedRecipes.forEach(recipe => {
    section += `---\n\n`
    section += `**Recipe ID:** ${recipe.id}\n`
    section += `**Name:** ${recipe.recipeName}\n`

    if (recipe.cuisineType) {
      section += `**Cuisine:** ${recipe.cuisineType}\n`
    }

    if (recipe.mealType && recipe.mealType.length > 0) {
      section += `**Meal Types:** ${recipe.mealType.join(', ')}\n`
    }

    if (recipe.familyRating) {
      section += `**Family Rating:** ${recipe.familyRating}/10\n`
    }

    if (recipe.totalTimeMinutes) {
      section += `**Total Time:** ${recipe.totalTimeMinutes} minutes\n`
    }

    // Nutrition info
    if (recipe.caloriesPerServing) {
      section += `**Nutrition (per serving):** ${recipe.caloriesPerServing} cal`
      if (recipe.proteinPerServing) section += `, ${recipe.proteinPerServing}g protein`
      if (recipe.carbsPerServing) section += `, ${recipe.carbsPerServing}g carbs`
      if (recipe.fatPerServing) section += `, ${recipe.fatPerServing}g fat`
      section += `\n`
    }

    // Dietary flags
    const dietaryFlags = []
    if (recipe.isVegetarian) dietaryFlags.push('Vegetarian')
    if (recipe.isVegan) dietaryFlags.push('Vegan')
    if (recipe.isGlutenFree) dietaryFlags.push('Gluten-Free')
    if (recipe.isDairyFree) dietaryFlags.push('Dairy-Free')
    if (recipe.containsNuts) dietaryFlags.push('Contains Nuts')
    if (dietaryFlags.length > 0) {
      section += `**Dietary:** ${dietaryFlags.join(', ')}\n`
    }

    // Batch cooking info
    if (recipe.yieldsMultipleMeals) {
      section += `**Batch Cooking:** Yields ${recipe.mealsYielded || 'multiple'} meals\n`
    }

    // History enrichment
    if (recipe.lastUsedDate) {
      section += `**Last Used:** ${recipe.lastUsedDate} (${recipe.cooldownDaysRemaining} days remaining in cooldown)\n`
    }

    if (recipe.wasManuallySelected) {
      section += `**Bonus:** +${recipe.bonusPoints} points (manually selected previously)\n`
    }

    // Ingredients (first 5 for context)
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      const firstFive = recipe.ingredients.slice(0, 5).map((i: any) => i.ingredientName).join(', ')
      const remaining = recipe.ingredients.length > 5 ? ` (+${recipe.ingredients.length - 5} more)` : ''
      section += `**Key Ingredients:** ${firstFive}${remaining}\n`
    }

    section += `\n`
  })

  return section
}

/**
 * Section 9: Output Format
 */
function buildOutputFormatSection(): string {
  return `# OUTPUT FORMAT

Please generate a meal plan for the week and return it as a JSON object with this structure:

\`\`\`json
{
  "meals": [
    {
      "dayOfWeek": "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday",
      "mealType": "breakfast" | "lunch" | "dinner" | "afternoon-snack" | "dessert" | etc.,
      "recipeId": "uuid-of-selected-recipe" | null,
      "recipeName": "Name of the recipe",
      "servings": 4,
      "notes": "Any special notes (e.g., 'Batch cook for Wednesday', 'Use expiring chicken')"
    }
  ],
  "summary": "Your weekly summary will go here (see next section for format)"
}
\`\`\`

**Important:**
- Only include recipeId if you're assigning a specific recipe from the list
- If no recipe is appropriate, set recipeId to null and provide a recipeName suggestion
- Calculate servings based on who's eating each meal (from attendance schedule)
- Use notes field for batch cooking instructions, expiry reminders, or substitution suggestions`
}

/**
 * Section 10: Sarah's Feedback Format
 */
function buildFeedbackSection(settings: MealPlanSettings): string {
  let section = `# SARAH'S WEEKLY SUMMARY\n\n`

  section += `**Detail Level:** ${settings.feedbackDetail.toUpperCase()}\n\n`

  switch (settings.feedbackDetail) {
    case 'light':
      section += `Provide a brief 2-3 sentence overview highlighting:\n`
      section += `- Overall macro balance for the week\n`
      section += `- Any notable achievements (e.g., "Great variety with 5 different cuisines!")\n`
      section += `- One friendly tip or observation\n\n`
      section += `**Example:**\n`
      section += `"This week's plan hits your macro targets beautifully with a nice 5-cuisine variety! You're batch cooking on Monday which will save time Wednesday. Consider prepping breakfast ingredients Sunday night to make mornings easier."\n`
      break

    case 'medium':
      section += `Provide a structured summary (4-6 sentences) covering:\n`
      section += `- **Macro Analysis:** How well the week meets macro targets\n`
      section += `- **Variety & Balance:** Cuisine diversity and meal type distribution\n`
      section += `- **Efficiency Notes:** Shopping and batch cooking highlights\n`
      section += `- **Practical Tips:** 1-2 specific suggestions for the week\n\n`
      section += `**Example:**\n`
      section += `"Your week averages 2,010 calories/day, right on target! Protein is strong (averaging 152g), with carbs and fats well-balanced. You've got excellent variety with Italian, Mexican, Asian, and Mediterranean cuisines represented. Monday's chicken casserole batch cook will cover Wednesday's lunch—smart time-saver. The Tuesday salad uses your expiring lettuce perfectly. Pro tip: Marinate Thursday's fish Tuesday night for maximum flavor."\n`
      break

    case 'detailed':
      section += `Provide a comprehensive summary (8-12 sentences) covering:\n`
      section += `- **Macro Breakdown:** Day-by-day or weekly averages with specific numbers\n`
      section += `- **Nutritional Highlights:** Fiber, protein quality, micronutrient diversity\n`
      section += `- **Variety Assessment:** Cuisine types, cooking methods, ingredient diversity\n`
      section += `- **Efficiency Analysis:** Shared ingredients, batch cooking schedule, prep strategy\n`
      section += `- **Inventory Management:** How expiring items were incorporated\n`
      section += `- **Practical Recommendations:** 2-3 specific tips for prep, substitutions, or improvements\n`
      section += `- **Encouragement:** Friendly, motivational closing\n\n`
      section += `**Example:**\n`
      section += `"Excellent work this week! Your macro targets are spot-on: averaging 2,015 cal (target: 2,000), 155g protein (target: 150), 210g carbs (target: 200), and 68g fat (target: 70). Protein quality is diverse with chicken, fish, and legumes. Fiber looks great at 32g average—well above the minimum. You're hitting 5 different cuisines (Italian, Mexican, Asian, Mediterranean, American) which prevents meal fatigue beautifully. Shopping efficiency is high: you're using olive oil, garlic, and onions across 6 recipes, and only need 23 unique ingredients for the week. Monday's chicken casserole batch cook feeds 3 meals, and the Tuesday stir-fry uses your expiring bell peppers perfectly. Time-saving tip: prep all Monday-Wednesday vegetables Sunday evening. The Wednesday pasta would pair wonderfully with a simple side salad. You're building sustainable, healthy habits—keep it up!"\n`
      break
  }

  return section
}
