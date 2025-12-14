/**
 * Clear stale nutrition cache entries for ingredients that have updated seed data.
 *
 * Run with: npx tsx scripts/clear-stale-nutrition-cache.ts
 */

import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function main() {
  console.log('🗑️  Clearing stale nutrition cache entries...\n')

  // Ingredients that need to be recalculated due to updated seed data
  const staleIngredients = [
    // Oats - was cooked values (68 cal), now dry values (379 cal)
    'oats',
    'rolled oats',
    'porridge oats',

    // Greek yogurt variants - ensure 0% variants use correct values
    'greek yogurt',
    'greek yoghurt',
    'greek yogurt 0%',
    'greek yoghurt 0%',
    '0% greek yogurt',
    '0% greek yoghurt',
    'fat free greek yogurt',
    'fat free greek yoghurt',
    'nonfat greek yogurt',
  ]

  for (const ingredient of staleIngredients) {
    const result = await prisma.ingredientNutritionCache.deleteMany({
      where: {
        OR: [
          { ingredientName: { equals: ingredient, mode: 'insensitive' } },
          { normalizedName: { equals: ingredient, mode: 'insensitive' } },
        ],
      },
    })

    if (result.count > 0) {
      console.log(`  ✅ Deleted ${result.count} cache entry for: ${ingredient}`)
    }
  }

  // Also clear any recipes that have nutrition calculated for these ingredients
  // so they recalculate on next view
  console.log('\n🔄 Clearing recipe nutrition hashes for affected recipes...')

  const affectedRecipes = await prisma.recipe.updateMany({
    where: {
      OR: [
        { ingredients: { path: '$[*].ingredientName', string_contains: 'oat' } },
        { ingredients: { path: '$[*].ingredientName', string_contains: 'yogurt' } },
        { ingredients: { path: '$[*].ingredientName', string_contains: 'yoghurt' } },
      ],
    },
    data: {
      ingredientsHash: null,
      nutritionCalculatedAt: null,
    },
  })

  console.log(`  ✅ Cleared nutrition cache for ${affectedRecipes.count} recipes`)

  console.log('\n✅ Done! Recipes will recalculate nutrition on next view.')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(() => {
    process.exit(0)
  })
