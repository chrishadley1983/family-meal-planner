/**
 * One-off script to recalculate macros for ALL existing recipes
 * Uses the nutrition service: cache -> USDA API -> AI estimate
 *
 * Usage: npx tsx scripts/recalculate-all-recipe-macros.ts
 *
 * Note: Requires DATABASE_URL environment variable to be set
 */

import { config } from 'dotenv'
// Load environment variables from .env file
config()

import { prisma } from '../lib/prisma'
import { calculateRecipeNutrition, RecipeIngredient } from '../lib/nutrition/index'

interface RecipeWithIngredients {
  id: string
  recipeName: string
  servings: number | null
  ingredients: {
    ingredientName: string
    quantity: number
    unit: string
  }[]
  caloriesPerServing: number | null
  proteinPerServing: number | null
  carbsPerServing: number | null
  fatPerServing: number | null
}

async function recalculateAllRecipeMacros() {
  console.log('🚀 Starting macro recalculation for all recipes...\n')

  // Fetch all recipes with their ingredients
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      recipeName: true,
      servings: true,
      caloriesPerServing: true,
      proteinPerServing: true,
      carbsPerServing: true,
      fatPerServing: true,
      ingredients: {
        select: {
          ingredientName: true,
          quantity: true,
          unit: true,
        },
      },
    },
  })

  console.log(`📋 Found ${recipes.length} recipes to process\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0
  const errors: { recipeName: string; error: string }[] = []

  // Process recipes with rate limiting (to avoid USDA API rate limits)
  for (let i = 0; i < recipes.length; i++) {
    const recipe = recipes[i] as RecipeWithIngredients
    const progress = `[${i + 1}/${recipes.length}]`

    // Skip recipes with no ingredients
    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      console.log(`${progress} ⏭️  Skipping "${recipe.recipeName}" - no ingredients`)
      skipCount++
      continue
    }

    try {
      // Convert to the format expected by calculateRecipeNutrition
      const ingredients: RecipeIngredient[] = recipe.ingredients.map((ing) => ({
        ingredientName: ing.ingredientName,
        quantity: ing.quantity,
        unit: ing.unit,
      }))

      const servings = recipe.servings || 4

      console.log(`${progress} 🔄 Processing "${recipe.recipeName}" (${ingredients.length} ingredients, ${servings} servings)...`)

      // Calculate nutrition using cache -> USDA -> estimate pipeline
      const nutrition = await calculateRecipeNutrition(ingredients, servings, true)

      // Update recipe with new macro values
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          caloriesPerServing: nutrition.perServing.calories,
          proteinPerServing: nutrition.perServing.protein,
          carbsPerServing: nutrition.perServing.carbs,
          fatPerServing: nutrition.perServing.fat,
          fiberPerServing: nutrition.perServing.fiber,
          sugarPerServing: nutrition.perServing.sugar,
          sodiumPerServing: nutrition.perServing.sodium,
          nutritionCalculatedAt: new Date(),
          nutritionConfidence: nutrition.confidence,
          nutritionSource: 'recalculated',
        },
      })

      // Log the change
      const oldCal = recipe.caloriesPerServing || 0
      const newCal = nutrition.perServing.calories
      const diff = newCal - oldCal
      const diffStr = diff >= 0 ? `+${diff}` : `${diff}`

      console.log(
        `${progress} ✅ "${recipe.recipeName}": ${oldCal} → ${newCal} cal (${diffStr}), ` +
          `${nutrition.perServing.protein}g P, ${nutrition.perServing.carbs}g C, ${nutrition.perServing.fat}g F ` +
          `[${nutrition.confidence} confidence]`
      )

      successCount++

      // Rate limiting: wait 200ms between recipes to avoid USDA API rate limits
      if (i < recipes.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`${progress} ❌ Error processing "${recipe.recipeName}": ${errorMessage}`)
      errors.push({ recipeName: recipe.recipeName, error: errorMessage })
      errorCount++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 SUMMARY')
  console.log('='.repeat(60))
  console.log(`✅ Successfully updated: ${successCount} recipes`)
  console.log(`⏭️  Skipped (no ingredients): ${skipCount} recipes`)
  console.log(`❌ Errors: ${errorCount} recipes`)

  if (errors.length > 0) {
    console.log('\n❌ Errors:')
    errors.forEach((e) => console.log(`   - ${e.recipeName}: ${e.error}`))
  }

  console.log('\n✨ Done!')
}

// Run the script
recalculateAllRecipeMacros()
  .then(() => {
    console.log('\n🔌 Disconnecting from database...')
    return prisma.$disconnect()
  })
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    prisma.$disconnect().finally(() => process.exit(1))
  })
