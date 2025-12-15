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
import { AI_LOCALE_INSTRUCTION } from './config/locale'

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
  return `You are Emilia, an experienced nutritionist and meal planning assistant for busy families. Your role is to generate balanced, practical weekly meal plans that respect dietary needs, maximize variety, and make shopping/cooking efficient.
${AI_LOCALE_INSTRUCTION}

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
    inventory,
    servingsMap
  } = params

  // Apply quick options (temporary overrides)
  const effectiveSettings = applyQuickOptions(settings, quickOptions)

  const sections: string[] = []

  // 1. Context Section
  sections.push(buildContextSection(profiles, weekStartDate, weekProfileSchedules, servingsMap))

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

  // 10. Emilia's Feedback Section
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
  weekProfileSchedules: any[],
  servingsMap?: Record<string, Record<string, number>>
): string {
  const weekStart = new Date(weekStartDate)
  const formattedDate = format(weekStart, 'MMMM d, yyyy')
  const startDayName = format(weekStart, 'EEEE') // e.g., "Tuesday"

  // Calculate the ordered list of days starting from the week start date
  const dayIndex = weekStart.getDay() // 0=Sunday, 1=Monday, etc.
  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const orderedDays = [...allDays.slice(dayIndex), ...allDays.slice(0, dayIndex)]

  let context = `# CONTEXT\n\n`
  context += `**Week Starting:** ${formattedDate} (${startDayName})\n\n`
  context += `**CRITICAL - Week Day Order:** This meal plan starts on ${startDayName}, not Monday. The chronological order of days for this week is:\n`
  context += orderedDays.map((day, idx) => `${idx + 1}. ${day} (Day ${idx + 1})`).join('\n')
  context += `\n\n**IMPORTANT FOR BATCH COOKING:** When planning batch cooking and leftovers, ONLY reference days that come chronologically BEFORE the leftover meal. For example, if this week starts on ${startDayName}, you CANNOT cook on ${orderedDays[6]} (Day 7) and use leftovers on ${orderedDays[0]} (Day 1) - that would be going backwards in time. Always plan batch cooking from earlier days to later days in the sequence above.\n\n`
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
    context += `\n**Meal Attendance Schedule (Per Person):**\n`
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

  // CRITICAL: Add pre-calculated serving counts so AI doesn't have to count manually
  if (servingsMap && Object.keys(servingsMap).length > 0) {
    context += `\n**REQUIRED SERVINGS (Pre-Calculated - Use These Exact Numbers):**\n`
    context += `IMPORTANT: Use these exact serving counts in your meal plan. These are calculated from the attendance schedule above.\n\n`

    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    days.forEach(day => {
      const dayCapitalized = day.charAt(0).toUpperCase() + day.slice(1)
      const meals = servingsMap[day] || {}
      if (Object.keys(meals).length > 0) {
        const mealStrings = Object.entries(meals).map(([mealType, count]) => {
          const mealName = mealType.charAt(0).toUpperCase() + mealType.slice(1).replace('-', ' ')
          return `${mealName}: ${count} ${count === 1 ? 'serving' : 'servings'}`
        })
        context += `- **${dayCapitalized}:** ${mealStrings.join(', ')}\n`
      }
    })

    context += `\n**For Batch Cooking Notes:** When writing batch cooking notes, use these serving counts. For example, if Monday dinner needs 4 servings and Thursday dinner needs 2 servings, the note should say "Batch cook 6 servings total—covers Monday (4) + Thursday (2)".\n`
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

  section += `**Cooldown Periods (CRITICAL - MUST BE RESPECTED):**\n`
  section += `- Dinners: ${settings.dinnerCooldown} days\n`
  section += `- Lunches: ${settings.lunchCooldown} days\n`
  section += `- Breakfasts: ${settings.breakfastCooldown} days\n`
  section += `- Snacks/Desserts: ${settings.snackCooldown} days\n\n`

  section += `**⚠️ COOLDOWN ENFORCEMENT - THIS IS MANDATORY:**\n`
  section += `- DO NOT use the same recipe within its cooldown period\n`
  section += `- The ONLY exception is batch cooking (cook once, reheat later - see Batch Cooking section)\n`
  section += `- If batch cooking, meals must be marked correctly with isLeftover=true for reheated portions\n\n`

  section += `**❌ COOLDOWN VIOLATION EXAMPLES (DO NOT DO THIS):**\n`
  section += `- Using "Chicken Stir Fry" on Tuesday AND Thursday (only 2 days apart, requires ${settings.dinnerCooldown} days)\n`
  section += `- Using "Spaghetti Bolognese" on Monday AND Wednesday (only 2 days apart, requires ${settings.dinnerCooldown} days)\n`
  section += `- Scheduling the same breakfast recipe twice in the same week (requires ${settings.breakfastCooldown} days)\n\n`

  section += `**✅ CORRECT APPROACHES:**\n`
  section += `- Use completely different recipes for each meal type within the cooldown period\n`
  section += `- OR set up batch cooking: cook once on Monday, reheat on Thursday (mark Thursday as isLeftover=true)\n`
  section += `- Plan shows you have ${recipes.length} recipes available - plenty to avoid repeating within ${settings.dinnerCooldown} days\n\n`

  section += `**Cuisine Variety Requirements:**\n`
  section += `- Minimum different cuisines in the week: ${settings.minCuisines}\n`
  section += `- Maximum meals from same cuisine: ${settings.maxSameCuisine}\n\n`

  section += `**Special Rules:**\n`
  section += `- Manually selected recipes (from previous plans) get a +1.5 rating point bonus\n`
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
  section += `- When choosing between similar-rated recipes, favour those sharing ingredients already in the plan\n`
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
      section += `**Approach:** Strongly favour recipes that use expiring items (+${ratingBoost} rating boost)\n`
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

  section += `**🔴 CRITICAL: CHRONOLOGICAL ORDER FOR BATCH COOKING**\n\n`
  section += `You MUST respect the week's chronological day order when setting up batch cooking:\n`
  section += `- The week has a STARTING DAY (could be Tuesday, Friday, any day)\n`
  section += `- Days are ordered chronologically from that starting day\n`
  section += `- You can ONLY cook on an EARLIER day and reheat on a LATER day\n`
  section += `- NEVER reference a future day as the source of leftovers for a past day\n\n`

  section += `**CHRONOLOGICAL ORDER EXAMPLE:**\n`
  section += `If the week starts on TUESDAY, the chronological order is:\n`
  section += `Day 1: Tuesday → Day 2: Wednesday → Day 3: Thursday → Day 4: Friday → Day 5: Saturday → Day 6: Sunday → Day 7: Monday\n\n`

  section += `**✅ CORRECT BATCH COOKING EXAMPLES:**\n`
  section += `- Week starts Tuesday: Cook on Friday (Day 4) → Reheat on Monday (Day 7) ✓ Goes forward in time\n`
  section += `- Week starts Tuesday: Cook on Tuesday (Day 1) → Reheat on Thursday (Day 3) ✓ Goes forward in time\n`
  section += `- Week starts Monday: Cook on Monday (Day 1) → Reheat on Wednesday (Day 3) ✓ Goes forward in time\n\n`

  section += `**❌ WRONG BATCH COOKING EXAMPLES (DO NOT DO THIS):**\n`
  section += `- Week starts Tuesday: Cook on Monday (Day 7) → Reheat on Tuesday (Day 1) ✗ Goes backwards!\n`
  section += `- Week starts Tuesday: Cook on Thursday (Day 3) → Reheat on Wednesday (Day 2) ✗ Goes backwards!\n`
  section += `- Setting isLeftover=true on the FIRST occurrence of a recipe ✗ Wrong!\n`
  section += `- Putting the batch cook note on the LATER meal instead of the FIRST meal ✗ Wrong!\n\n`

  section += `**BATCH COOKING SETUP RULES:**\n`
  section += `When the same recipe appears multiple times across days:\n\n`
  section += `**On the FIRST occurrence (chronologically earliest day):**\n`
  section += `- Set isLeftover = false (this is when you COOK it)\n`
  section += `- Set servings = TOTAL BATCH AMOUNT (e.g., 8 servings for Tuesday + Thursday)\n`
  section += `- Add note: "Batch cook [X] servings total—covers [Day1] ([Y]) + [Day2] ([Z])"\n`
  section += `- Example: "Batch cook 8 servings total—covers Tuesday (4) + Thursday (4)"\n\n`

  section += `**On SUBSEQUENT occurrences (chronologically later days):**\n`
  section += `- Set isLeftover = true (this is REHEATING)\n`
  section += `- Set batchCookSourceDay = [the actual day name when it was cooked]\n`
  section += `- Set servings = just this meal's amount (e.g., 4 servings)\n`
  section += `- Add note: "Reheat from [source day]"\n`
  section += `- Example: "Reheat from Tuesday"\n\n`

  section += `**Batch Cooking Strategy:**\n`
  section += `- Look for recipes marked with yieldsMultipleMeals=true\n`
  section += `- Calculate if the recipe can serve multiple meals within its shelf life\n`
  section += `- Only batch cook for consecutive or close-together days (not spread across the week)\n`
  section += `- Override maximum leftover days to ${settings.maxLeftoverDays} if ingredient shelf life allows\n`
  section += `- Include storage/reheating instructions in the meal notes\n\n`

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
      "recipeId": "uuid-of-selected-recipe",
      "recipeName": "Name of the recipe",
      "servings": 4,
      "isLeftover": false,
      "batchCookSourceDay": null | "Monday",
      "notes": "Any special notes (e.g., 'Batch cook 6 servings - will cover Wednesday lunch', 'Use expiring chicken', 'Reheat from Monday')"
    }
  ],
  "summary": "Your weekly summary will go here (see next section for format)"
}
\`\`\`

**CRITICAL RECIPE SELECTION RULES:**
- **YOU MUST ONLY use recipes from the "AVAILABLE RECIPES" list above**
- Every meal MUST have a valid recipeId from that list - do NOT suggest recipes that aren't in the database
- **MEAL TYPE MATCHING IS MANDATORY:** Only use recipes for meal slots that match their designated "Meal Types" field:
  * A recipe with mealType: ["Dinner"] can ONLY be used for dinner slots
  * A recipe with mealType: ["Breakfast"] can ONLY be used for breakfast slots
  * A recipe with mealType: ["Breakfast", "Lunch"] can be used for either breakfast OR lunch, but NOT dinner
  * NEVER assign a dinner recipe to breakfast or vice versa - this is a critical error
- **COOLDOWN PERIODS MUST BE RESPECTED** - Do NOT use the same recipe within its cooldown period (see "RECIPE VARIETY & COOLDOWNS" section)
- The ONLY exception to cooldown is batch cooking - if using the same recipe multiple times, it MUST be set up as batch cooking with proper isLeftover flags
- If you cannot create a complete meal plan with the available recipes (e.g., not enough variety, missing meal types, dietary restrictions can't be met), you MUST explain this in your summary
- When explaining shortcomings in your summary, be specific: mention which meals/days couldn't be filled ideally and why (e.g., "Could not find enough breakfast recipes to meet variety targets" or "Limited gluten-free dinner options meant repeating recipes")

**Important:**
- Only include recipeId values that appear in the AVAILABLE RECIPES section above
- NEVER set recipeId to null or suggest recipes not in your database
- Calculate servings based on who's eating each meal (from attendance schedule)
- **For batch cooking:**
  - **CRITICAL RULE:** Batch cooking MUST follow chronological order. You can ONLY cook on an earlier day and use leftovers on a LATER day. NEVER reference a future day as the source of leftovers for a past day.
  - On the FIRST meal (when cooking):
    * Set isLeftover=false
    * Set servings to the TOTAL BATCH AMOUNT (e.g., if cooking on Day 1 for 4 people + Day 3 for 3 people, set servings=7)
    * In notes, explain the breakdown using the actual day names: "Batch cook 7 servings total—covers [Day 1 name] (4) + [Day 3 name] (3)"
  - On SUBSEQUENT meals (leftovers):
    * Set isLeftover=true
    * Set batchCookSourceDay to the actual day name when it was cooked (must be an earlier day in the week sequence)
    * Set servings to just this meal's count (e.g., 3)
    * Add reheating instructions in notes
  - **Example for a week starting on Tuesday:**
    * ✅ CORRECT: Cook on Tuesday (Day 1), use leftovers on Thursday (Day 3) - goes forward in time
    * ❌ WRONG: Cook on Monday (Day 7), use leftovers on Tuesday (Day 1) - goes backward in time
- CRITICAL: For batch cook source meals, the servings field MUST be the total batch amount, not just that meal's count. This ensures the recipe is scaled correctly for shopping lists.`
}

/**
 * Section 10: Emilia's Feedback Format
 */
function buildFeedbackSection(settings: MealPlanSettings): string {
  let section = `# EMILIA'S WEEKLY SUMMARY\n\n`

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
