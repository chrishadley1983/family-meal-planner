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
    servingsMap,
    customInstructions,
    linkedRecipes,
    validationFeedback
  } = params

  // Apply quick options (temporary overrides)
  const effectiveSettings = applyQuickOptions(settings, quickOptions)

  const sections: string[] = []

  // 0. Validation Feedback Section (if this is a retry attempt)
  if (validationFeedback && validationFeedback.length > 0) {
    sections.push(buildValidationFeedbackSection(validationFeedback))
  }

  // 1. Context Section
  sections.push(buildContextSection(profiles, weekStartDate, weekProfileSchedules, servingsMap))

  // 2. Mandatory Recipes Section (if user linked specific recipes)
  if (linkedRecipes && linkedRecipes.length > 0) {
    sections.push(buildMandatoryRecipesSection(linkedRecipes, recipes, customInstructions))
  }

  // 3. Custom User Instructions Section (if provided)
  if (customInstructions && customInstructions.trim()) {
    sections.push(buildCustomInstructionsSection(customInstructions))
  }

  // 3. Macro Targeting Section
  sections.push(buildMacroSection(effectiveSettings, profiles, weekProfileSchedules, servingsMap))

  // 4. Recipe Variety Section
  if (effectiveSettings.varietyEnabled) {
    sections.push(buildVarietySection(effectiveSettings, recipeHistory, recipes))
  }

  // 5. Shopping Efficiency Section
  sections.push(buildShoppingSection(effectiveSettings))

  // 6. Inventory & Expiry Section
  if (inventory.length > 0) {
    sections.push(buildInventorySection(effectiveSettings, inventory))
  }

  // 7. Batch Cooking Section
  if (effectiveSettings.batchCookingEnabled) {
    sections.push(buildBatchCookingSection(effectiveSettings))
  }

  // 8. Priority Ordering Section
  sections.push(buildPrioritySection(effectiveSettings))

  // 9. Recipe List Section (with enrichments)
  sections.push(buildRecipeListSection(recipes, recipeHistory, effectiveSettings, weekStartDate))

  // 10. JSON Output Format Section
  sections.push(buildOutputFormatSection())

  // 11. Emilia's Feedback Section
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
 * Build the custom user instructions section
 * This section highlights specific requests from the user that should be prioritized
 */
function buildCustomInstructionsSection(customInstructions: string): string {
  return `# CUSTOM USER INSTRUCTIONS

**IMPORTANT:** The user has provided the following specific instructions for this meal plan. Please prioritize these requests when making your selections, while still respecting nutritional balance and variety rules:

${customInstructions}

---
*Note: If any instruction conflicts with dietary restrictions or recipe availability, explain the limitation in your summary and offer the closest alternative.*`
}

/**
 * Build the validation feedback section
 * This section is included when a previous generation attempt failed validation
 * It tells the AI what went wrong and how to fix it
 */
function buildValidationFeedbackSection(validationFeedback: string[]): string {
  return `# 🚨 CRITICAL: PREVIOUS ATTEMPT FAILED VALIDATION

**Your previous meal plan was REJECTED because it did not meet the following requirements:**

${validationFeedback.map((error, i) => `${i + 1}. ❌ ${error}`).join('\n')}

**YOU MUST FIX THESE ISSUES in this attempt. This is a retry - your plan will be rejected again if you repeat these mistakes.**

**Specific Actions Required:**
${validationFeedback.map(error => {
  // Provide specific guidance based on error type
  if (error.toLowerCase().includes('calorie') && error.toLowerCase().includes('below')) {
    return '- SELECT HIGHER-CALORIE RECIPES: Choose recipes with more calories per serving to meet the daily target'
  } else if (error.toLowerCase().includes('calorie') && error.toLowerCase().includes('above')) {
    return '- SELECT LOWER-CALORIE RECIPES: Choose recipes with fewer calories per serving to stay within target'
  } else if (error.toLowerCase().includes('protein') && error.toLowerCase().includes('below')) {
    return '- SELECT PROTEIN-RICH RECIPES: Choose recipes with higher protein content (chicken, fish, legumes, eggs)'
  } else if (error.toLowerCase().includes('cooldown')) {
    return '- RESPECT COOLDOWN PERIODS: Do not repeat the same recipe within the specified cooldown period'
  } else if (error.toLowerCase().includes('batch cooking')) {
    return '- FIX BATCH COOKING: Mark leftover meals correctly with isLeftover=true and batchCookSourceDay'
  } else if (error.toLowerCase().includes('meal type')) {
    return '- USE CORRECT MEAL TYPES: Only assign recipes to meal types they are designated for'
  } else if (error.toLowerCase().includes('mandatory') || error.toLowerCase().includes('must use')) {
    return '- INCLUDE MANDATORY RECIPES: You MUST use the recipes the user specifically selected'
  }
  return `- Address this issue: ${error}`
}).join('\n')}

---
**Remember: Meeting macro targets is a HARD REQUIREMENT when macros is a high priority. Your plan will be validated again.**`
}

/**
 * Build the mandatory recipes section
 * These are specific recipes the user has explicitly selected to include in the meal plan
 */
function buildMandatoryRecipesSection(
  linkedRecipes: Array<{ id: string; name: string }>,
  allRecipes: any[],
  customInstructions?: string
): string {
  // Check if user wants "every day" or similar frequency
  const instructionsLower = (customInstructions || '').toLowerCase()
  const wantsEveryDay = /every\s*day|daily|each\s*day|all\s*week|every\s*morning|every\s*night|all\s*7\s*days|seven\s*days/.test(instructionsLower)

  let section = `# 🔴 MANDATORY RECIPES (MUST USE)

**CRITICAL:** The user has explicitly selected the following recipes to be included in this meal plan. You MUST use these exact recipes with the exact recipe IDs provided.

**Recipes you MUST include:**
`

  linkedRecipes.forEach((linked, index) => {
    // Find the full recipe details to get meal type info
    const fullRecipe = allRecipes.find(r => r.id === linked.id)
    const mealTypes = fullRecipe?.mealType?.join(', ') || 'Any meal type'

    section += `\n${index + 1}. **${linked.name}**
   - Recipe ID: \`${linked.id}\` (USE THIS EXACT ID)
   - Suitable for: ${mealTypes}
`
  })

  // Add strong emphasis if user wants every day
  if (wantsEveryDay && linkedRecipes.length === 1) {
    const recipe = linkedRecipes[0]
    const fullRecipe = allRecipes.find(r => r.id === recipe.id)
    const mealType = fullRecipe?.mealType?.[0] || 'meal'

    section += `
## ⚠️ EVERY DAY REQUIREMENT ⚠️

The user has requested "${recipe.name}" for **EVERY SINGLE DAY** of the week.

**YOU MUST:**
- Use recipe ID \`${recipe.id}\` for ALL 7 ${mealType.toLowerCase()} slots (Sunday through Saturday)
- Do NOT use any other recipe for ${mealType.toLowerCase()} - ONLY "${recipe.name}"
- This is NOT batch cooking - prepare fresh each day (no isLeftover flags needed)
- Variety rules DO NOT APPLY to this meal type this week

**EXPECTED OUTPUT for ${mealType}:**
- Sunday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Monday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Tuesday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Wednesday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Thursday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Friday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")
- Saturday ${mealType}: "${recipe.name}" (recipeId: "${recipe.id}")

**FAILURE TO USE THIS EXACT RECIPE FOR ALL 7 DAYS IS AN ERROR.**
`
  } else {
    section += `
**INSTRUCTIONS:**
- Each recipe above MUST appear at least once in your meal plan
- Use the EXACT recipe ID provided (not a similar recipe or made-up ID)
- Assign each recipe to an appropriate meal slot based on its meal type
- If the user's custom instructions mention frequency (e.g., "every day"), use that recipe for ALL days
- These recipes take priority over variety rules - it's OK to reduce variety to accommodate mandatory recipes
- If cooldown rules conflict with using a mandatory recipe, temporarily ignore the cooldown for that specific recipe

**FAILURE TO INCLUDE THESE RECIPES IS AN ERROR.**`
  }

  return section
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
 * Calculate dynamic per-meal calorie budgets based on main user's schedule
 *
 * KEY PRINCIPLE: Each meal type has a FIXED percentage of daily calories:
 * - Breakfast: 25%
 * - Lunch: 35%
 * - Dinner: 40%
 * - Snacks: 20% (when present)
 *
 * If a meal is missing from the schedule, the user is eating those calories OUTSIDE the plan.
 * We do NOT pro-rate remaining meals to fill 100% - that would defeat the purpose.
 *
 * Example: User only has Lunch + Dinner in the plan
 * - Lunch = 35% of daily calories = 700 cal (if 2000 target)
 * - Dinner = 40% of daily calories = 800 cal
 * - Plan covers 75% of daily calories (1500 cal)
 * - User eats remaining 25% (500 cal) outside the plan (breakfast on their own)
 */
interface MealBudgets {
  breakfast: number | null
  lunch: number | null
  dinner: number | null
  snacks: number | null
  totalPlanPercent: number // What % of daily calories the plan covers
  explanation: string
}

function calculateDynamicMealBudgets(
  dailyCalories: number,
  mainUserProfileId: string,
  weekProfileSchedules?: any[],
  servingsMap?: Record<string, Record<string, number>>
): MealBudgets {
  // Fixed percentages for each meal type (these don't change based on what's missing)
  const FIXED_PERCENTAGES = {
    breakfast: 0.25,  // 25% of daily calories
    lunch: 0.35,      // 35% of daily calories
    dinner: 0.40,     // 40% of daily calories
    snacks: 0.20      // 20% of daily calories (when present)
  }

  // Default result if no schedule data (assume full schedule - B:25% + L:35% + D:40% = 100%)
  const defaultBudgets: MealBudgets = {
    breakfast: Math.round(dailyCalories * FIXED_PERCENTAGES.breakfast),
    lunch: Math.round(dailyCalories * FIXED_PERCENTAGES.lunch),
    dinner: Math.round(dailyCalories * FIXED_PERCENTAGES.dinner),
    snacks: null,
    totalPlanPercent: 100,
    explanation: 'Full plan (B:25%, L:35%, D:40%) = 100% of daily target'
  }

  // STRATEGY: Use servingsMap as the primary source of truth since it's pre-calculated
  // and directly represents what meals are scheduled. Fall back to schedule analysis only
  // if servingsMap is not available.

  // Try servingsMap first - it's the most reliable source
  if (servingsMap && Object.keys(servingsMap).length > 0) {
    const mealCounts = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0
    }

    // Count days where each meal type has servings > 0
    Object.values(servingsMap).forEach(dayMeals => {
      Object.entries(dayMeals).forEach(([mealType, servings]) => {
        if (servings <= 0) return

        const normalizedMealType = mealType.toLowerCase().replace(/[\s_]+/g, '-')
        if (normalizedMealType === 'breakfast') {
          mealCounts.breakfast++
        } else if (normalizedMealType === 'lunch') {
          mealCounts.lunch++
        } else if (normalizedMealType === 'dinner') {
          mealCounts.dinner++
        } else if (normalizedMealType.includes('snack') || normalizedMealType === 'dessert') {
          mealCounts.snack++
        }
      })
    })

    console.log('[calculateDynamicMealBudgets] Using servingsMap - meal counts:', mealCounts)

    return buildBudgetsFromCounts(dailyCalories, mealCounts, FIXED_PERCENTAGES)
  }

  // Fall back to schedule analysis if servingsMap not available
  if (!weekProfileSchedules || weekProfileSchedules.length === 0) {
    console.log('[calculateDynamicMealBudgets] No servingsMap or schedules - using defaults (100%)')
    return defaultBudgets
  }

  // Find the main user's schedule - try multiple lookup strategies
  let mainUserSchedule = weekProfileSchedules.find(s => s.profileId === mainUserProfileId)

  // If not found by exact ID match, try finding by isMainUser flag
  if (!mainUserSchedule) {
    mainUserSchedule = weekProfileSchedules.find(s => s.isMainUser === true)
  }

  // If still not found, use the first schedule (usually the main user)
  if (!mainUserSchedule && weekProfileSchedules.length > 0) {
    mainUserSchedule = weekProfileSchedules[0]
    console.log('[calculateDynamicMealBudgets] Profile not found by ID, using first schedule')
  }

  if (!mainUserSchedule || !mainUserSchedule.schedule) {
    console.log('[calculateDynamicMealBudgets] No valid schedule found - using defaults (100%)')
    return defaultBudgets
  }

  // Analyze what meals the main user typically has across the week
  const mealCounts = {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snack: 0
  }

  // Try both lowercase and capitalized day names
  const dayVariants = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ]

  const processedDays = new Set<string>()

  dayVariants.forEach(day => {
    const dayLower = day.toLowerCase()
    if (processedDays.has(dayLower)) return // Already processed this day

    const dayMeals = mainUserSchedule.schedule[day]
    if (!dayMeals) return

    processedDays.add(dayLower)

    Object.entries(dayMeals).forEach(([mealType, isEating]) => {
      if (!isEating) return

      // Normalize meal type - handle various formats
      const normalizedMealType = mealType.toLowerCase().replace(/[\s_]+/g, '-')

      if (normalizedMealType === 'breakfast') {
        mealCounts.breakfast++
      } else if (normalizedMealType === 'lunch') {
        mealCounts.lunch++
      } else if (normalizedMealType === 'dinner') {
        mealCounts.dinner++
      } else if (normalizedMealType.includes('snack') || normalizedMealType === 'dessert') {
        mealCounts.snack++
      }
    })
  })

  console.log('[calculateDynamicMealBudgets] Schedule analysis - meal counts:', mealCounts, 'from profile:', mainUserProfileId)

  // If all counts are 0, something went wrong - default to 100% coverage
  const totalCounts = mealCounts.breakfast + mealCounts.lunch + mealCounts.dinner
  if (totalCounts === 0) {
    console.warn('[calculateDynamicMealBudgets] All meal counts are 0 - defaulting to 100% coverage')
    return defaultBudgets
  }

  return buildBudgetsFromCounts(dailyCalories, mealCounts, FIXED_PERCENTAGES)
}

/**
 * Helper function to build meal budgets from meal counts
 */
function buildBudgetsFromCounts(
  dailyCalories: number,
  mealCounts: { breakfast: number; lunch: number; dinner: number; snack: number },
  FIXED_PERCENTAGES: { breakfast: number; lunch: number; dinner: number; snacks: number }
): MealBudgets {
  // Determine which meal types are "active" (at least 4 days = majority of week)
  const hasBreakfast = mealCounts.breakfast >= 4
  const hasLunch = mealCounts.lunch >= 4
  const hasDinner = mealCounts.dinner >= 4
  const hasSnacks = mealCounts.snack >= 4

  // When snacks/desserts are present, scale B+L+D down to 80% so total = 100%
  // Without snacks: B:25% + L:35% + D:40% = 100%
  // With snacks: B:20% + L:28% + D:32% + S:20% = 100%
  const scaleFactor = hasSnacks ? 0.80 : 1.0

  // Calculate budgets - scale main meals when snacks are present
  const budgets: MealBudgets = {
    breakfast: hasBreakfast ? Math.round(dailyCalories * FIXED_PERCENTAGES.breakfast * scaleFactor) : null,
    lunch: hasLunch ? Math.round(dailyCalories * FIXED_PERCENTAGES.lunch * scaleFactor) : null,
    dinner: hasDinner ? Math.round(dailyCalories * FIXED_PERCENTAGES.dinner * scaleFactor) : null,
    snacks: hasSnacks ? Math.round(dailyCalories * FIXED_PERCENTAGES.snacks) : null,
    totalPlanPercent: 0,
    explanation: ''
  }

  // Calculate what % of daily calories the plan covers
  // With snacks: (25+35+40)*0.8 + 20 = 80 + 20 = 100%
  let totalPercent = 0
  if (hasBreakfast) totalPercent += FIXED_PERCENTAGES.breakfast * 100 * scaleFactor
  if (hasLunch) totalPercent += FIXED_PERCENTAGES.lunch * 100 * scaleFactor
  if (hasDinner) totalPercent += FIXED_PERCENTAGES.dinner * 100 * scaleFactor
  if (hasSnacks) totalPercent += FIXED_PERCENTAGES.snacks * 100
  budgets.totalPlanPercent = Math.round(totalPercent)

  // Build explanation with actual percentages
  const percentages: string[] = []
  if (hasBreakfast) percentages.push(`B:${Math.round(FIXED_PERCENTAGES.breakfast * 100 * scaleFactor)}%`)
  if (hasLunch) percentages.push(`L:${Math.round(FIXED_PERCENTAGES.lunch * 100 * scaleFactor)}%`)
  if (hasDinner) percentages.push(`D:${Math.round(FIXED_PERCENTAGES.dinner * 100 * scaleFactor)}%`)
  if (hasSnacks) percentages.push(`S:${Math.round(FIXED_PERCENTAGES.snacks * 100)}%`)

  if (budgets.totalPlanPercent === 100 && !hasSnacks) {
    budgets.explanation = `Full plan (${percentages.join(', ')}) = 100% of daily target`
  } else if (budgets.totalPlanPercent === 100 && hasSnacks) {
    budgets.explanation = `Full plan with snacks (${percentages.join(', ')}) = 100% of daily target (main meals scaled to 80%)`
  } else if (budgets.totalPlanPercent === 0) {
    // This shouldn't happen after our fixes, but if it does, default to 100%
    budgets.totalPlanPercent = 100
    budgets.breakfast = Math.round(dailyCalories * FIXED_PERCENTAGES.breakfast)
    budgets.lunch = Math.round(dailyCalories * FIXED_PERCENTAGES.lunch)
    budgets.dinner = Math.round(dailyCalories * FIXED_PERCENTAGES.dinner)
    budgets.explanation = 'Full plan (B:25%, L:35%, D:40%) = 100% of daily target (fallback)'
  } else {
    budgets.explanation = `Partial plan (${percentages.join(', ')}) = ${budgets.totalPlanPercent}% of daily target - user eats ${100 - budgets.totalPlanPercent}% outside plan`
  }

  return budgets
}

/**
 * Section 2: Macro Targeting Mode
 */
function buildMacroSection(
  settings: MealPlanSettings,
  profiles: any[],
  weekProfileSchedules?: any[],
  servingsMap?: Record<string, Record<string, number>>
): string {
  let section = `# MACRO TARGETING\n\n`

  const macrosProfile = profiles.find(p => p.macroTrackingEnabled)

  if (!macrosProfile) {
    section += `No macro tracking enabled for this week. Focus on balanced nutrition and variety.\n`
    return section
  }

  // Check if macros is in top 3 priorities
  const macroPriority = settings.priorityOrder.indexOf('macros')
  const isMacroHighPriority = macroPriority >= 0 && macroPriority < 3

  // Determine tolerance based on mode
  const tolerance = settings.macroMode === 'strict' ? 0.05 : 0.10
  const tolerancePercent = Math.round(tolerance * 100)

  section += `**Mode:** ${settings.macroMode.replace('_', ' ').toUpperCase()}\n\n`

  // Add strong enforcement message if macros is high priority
  if (isMacroHighPriority) {
    section += `## ⚠️ MACRO TARGETING IS HIGH PRIORITY (#${macroPriority + 1}) - VALIDATION ENFORCED\n\n`
    section += `**THIS IS A HARD REQUIREMENT, NOT A SUGGESTION.**\n`
    section += `Your meal plan will be REJECTED if it does not meet macro targets within the allowed tolerance.\n`
    section += `If you cannot hit targets with available recipes, you MUST explain why in the summary.\n\n`
  }

  // Calculate per-meal budgets dynamically based on main user's schedule
  // Pass servingsMap as the primary source of truth for which meals are scheduled
  const dailyCalories = macrosProfile.dailyCalorieTarget || 2000
  const mealBudgets = calculateDynamicMealBudgets(dailyCalories, macrosProfile.id, weekProfileSchedules, servingsMap)

  switch (settings.macroMode) {
    case 'balanced':
      section += `**Approach:** Flexible daily macro targeting with ±${tolerancePercent}% tolerance on all macros.\n\n`
      section += `**REQUIRED Daily Totals for ${macrosProfile.profileName}:**\n`
      section += `- Calories: ${dailyCalories} ± ${Math.round(dailyCalories * tolerance)} (MUST be between ${Math.round(dailyCalories * (1 - tolerance))} and ${Math.round(dailyCalories * (1 + tolerance))})\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * tolerance)}g\n`
      }
      if (macrosProfile.dailyCarbsTarget) {
        section += `- Carbs: ${macrosProfile.dailyCarbsTarget}g ± ${Math.round(macrosProfile.dailyCarbsTarget * tolerance)}g\n`
      }
      if (macrosProfile.dailyFatTarget) {
        section += `- Fat: ${macrosProfile.dailyFatTarget}g ± ${Math.round(macrosProfile.dailyFatTarget * tolerance)}g\n`
      }
      break

    case 'strict':
      section += `**Approach:** Precise daily tracking with ±${tolerancePercent}% tolerance on all macros.\n\n`
      section += `**REQUIRED Daily Totals for ${macrosProfile.profileName}:**\n`
      section += `- Calories: ${dailyCalories} ± ${Math.round(dailyCalories * tolerance)} (MUST be between ${Math.round(dailyCalories * (1 - tolerance))} and ${Math.round(dailyCalories * (1 + tolerance))})\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * tolerance)}g\n`
      }
      if (macrosProfile.dailyCarbsTarget) {
        section += `- Carbs: ${macrosProfile.dailyCarbsTarget}g ± ${Math.round(macrosProfile.dailyCarbsTarget * tolerance)}g\n`
      }
      if (macrosProfile.dailyFatTarget) {
        section += `- Fat: ${macrosProfile.dailyFatTarget}g ± ${Math.round(macrosProfile.dailyFatTarget * tolerance)}g\n`
      }
      break

    case 'weekday_discipline':
      section += `**Approach:** Strict on weekdays (±5%), relaxed on weekends (±25%).\n\n`
      section += `**REQUIRED Weekday Targets** (Monday-Friday) for ${macrosProfile.profileName}:\n`
      section += `- Calories: ${dailyCalories} ± ${Math.round(dailyCalories * 0.05)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.05)}g\n`
      }
      section += `\n**Weekend Targets** (Saturday-Sunday):\n`
      section += `- Calories: ${dailyCalories} ± ${Math.round(dailyCalories * 0.25)}\n`
      if (macrosProfile.dailyProteinTarget) {
        section += `- Protein: ${macrosProfile.dailyProteinTarget}g ± ${Math.round(macrosProfile.dailyProteinTarget * 0.25)}g\n`
      }
      break

    case 'calorie_banking':
      const weekdayDeficit = Math.round(dailyCalories * 0.85)
      const weekendSurplus = Math.round(dailyCalories * 1.3)
      section += `**Approach:** Weekday deficit compensated by weekend surplus, weekly balance maintained.\n\n`
      section += `**REQUIRED Weekday Targets** (Monday-Friday) for ${macrosProfile.profileName}:\n`
      section += `- Calories: ~${weekdayDeficit} (85% of daily target)\n`
      section += `\n**Weekend Targets** (Saturday-Sunday):\n`
      section += `- Calories: ~${weekendSurplus} (130% of daily target)\n`
      section += `\n**Weekly Total:** ${dailyCalories * 7} calories\n`
      break
  }

  // Add per-meal budgets to help AI select appropriately (dynamic based on user's schedule)
  section += `\n**PER-MEAL CALORIE BUDGETS (Based on ${macrosProfile.profileName}'s Schedule):**\n`
  section += `_${mealBudgets.explanation}_\n\n`

  // Only show budgets for meals that are in the plan
  if (mealBudgets.breakfast !== null) {
    section += `- Breakfast: Target ~${mealBudgets.breakfast} cal per serving (25% of daily target)\n`
  }
  if (mealBudgets.lunch !== null) {
    section += `- Lunch: Target ~${mealBudgets.lunch} cal per serving (35% of daily target)\n`
  }
  if (mealBudgets.dinner !== null) {
    section += `- Dinner: Target ~${mealBudgets.dinner} cal per serving (40% of daily target)\n`
  }
  if (mealBudgets.snacks !== null) {
    section += `- Snacks/Desserts: Target ~${mealBudgets.snacks} cal total across snacks (20% of daily target)\n`
  }

  // Calculate expected daily total from planned meals
  const expectedDailyTotal = (mealBudgets.breakfast || 0) + (mealBudgets.lunch || 0) + (mealBudgets.dinner || 0) + (mealBudgets.snacks || 0)
  section += `\n**Expected Daily Total from Plan:** ~${expectedDailyTotal} cal (${mealBudgets.totalPlanPercent}% of ${dailyCalories} daily target)\n`

  if (mealBudgets.totalPlanPercent < 100) {
    section += `_Note: User eats ${100 - mealBudgets.totalPlanPercent}% of daily calories outside this meal plan_\n`
  }
  section += `\n`

  section += `**RECIPE SELECTION STRATEGY FOR HITTING TARGETS:**\n`
  section += `1. FIRST, check each recipe's caloriesPerServing in the recipe list\n`
  section += `2. Select recipes that sum to approximately ${expectedDailyTotal} cal per day (the planned meals)\n`
  section += `3. If a day's meals are too low in calories, swap for a higher-calorie alternative\n`
  section += `4. Prefer recipes with higher protein to help hit protein targets\n`
  section += `5. VERIFY your selections: mentally add up each day's calories before finalizing\n\n`

  if (isMacroHighPriority) {
    section += `**⚠️ VALIDATION CHECK - Your plan will be rejected if:**\n`
    // Use expectedDailyTotal (from planned meals) not raw dailyCalories (which is full day target)
    section += `- Daily average calories from planned meals are outside ${Math.round(expectedDailyTotal * (1 - tolerance))} - ${Math.round(expectedDailyTotal * (1 + tolerance))} range\n`
    if (macrosProfile.dailyProteinTarget) {
      // Scale protein target by plan coverage percentage
      const expectedProtein = Math.round(macrosProfile.dailyProteinTarget * (mealBudgets.totalPlanPercent / 100))
      section += `- Daily average protein from planned meals is outside ${Math.round(expectedProtein * (1 - tolerance))}g - ${Math.round(expectedProtein * (1 + tolerance))}g range\n`
    }
    if (mealBudgets.totalPlanPercent < 100) {
      section += `\n_Remember: This plan only covers ${mealBudgets.totalPlanPercent}% of daily calories. Validation is against the planned meals total (${expectedDailyTotal} cal), not the full daily target (${dailyCalories} cal)._\n`
    }
    section += `\nIf you cannot meet these targets, explain the constraint in your summary (e.g., "Available recipes limited higher-calorie options").\n`
  } else {
    section += `**Note:** Macro targeting is a lower priority in your settings. Focus on other constraints first, but try to get close to these targets where possible.\n`
  }

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
