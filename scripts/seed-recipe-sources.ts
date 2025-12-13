#!/usr/bin/env npx tsx
/**
 * Seed script for recipe source sites configuration
 *
 * Usage:
 *   npx tsx scripts/seed-recipe-sources.ts
 *   npm run seed:sources
 */

// Load environment variables FIRST before any other imports
import 'dotenv/config'

import { prisma } from '../lib/prisma'

// Recipe source site configurations
// Note: searchResultsSelector is null to use generic fallback selectors
// which are more resilient to website structure changes
// Expanded category list for maximum variety
const expandedCategories = [
  // Proteins
  'chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'prawns', 'shrimp',
  'turkey', 'duck', 'mince', 'sausage', 'bacon', 'ham',
  // Dietary
  'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'low-carb', 'keto',
  'high-protein', 'low-calorie', 'healthy',
  // Meal types
  'breakfast', 'brunch', 'lunch', 'dinner', 'snack', 'dessert',
  // Cooking methods
  'slow-cooker', 'instant-pot', 'air-fryer', 'one-pot', 'sheet-pan',
  'roast', 'grill', 'bbq', 'bake', 'stir-fry',
  // Dish types
  'pasta', 'rice', 'noodles', 'curry', 'soup', 'stew', 'salad',
  'sandwich', 'wrap', 'pie', 'casserole', 'tacos', 'burger',
  // Cuisines
  'italian', 'mexican', 'indian', 'chinese', 'thai', 'japanese',
  'mediterranean', 'greek', 'spanish', 'french', 'korean', 'vietnamese',
  // Occasions
  'quick', 'easy', 'weeknight', 'weekend', 'family', 'budget',
  'batch-cooking', 'meal-prep', 'comfort-food', 'holiday', 'party'
]

const sites = [
  {
    name: 'bbcgoodfood',
    displayName: 'BBC Good Food',
    baseUrl: 'https://www.bbcgoodfood.com',
    searchUrlPattern: '/search?q={query}&page={page}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'allrecipes',
    displayName: 'AllRecipes',
    baseUrl: 'https://www.allrecipes.com',
    searchUrlPattern: '/search?q={query}&page={page}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'delicious',
    displayName: 'Delicious Magazine',
    baseUrl: 'https://www.deliciousmagazine.co.uk',
    searchUrlPattern: '/search?q={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'taste',
    displayName: 'Taste.com.au',
    baseUrl: 'https://www.taste.com.au',
    searchUrlPattern: '/search-recipes?q={query}&page={page}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'olivemagazine',
    displayName: 'Olive Magazine',
    baseUrl: 'https://www.olivemagazine.com',
    searchUrlPattern: '/search?q={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'jamieoliver',
    displayName: 'Jamie Oliver',
    baseUrl: 'https://www.jamieoliver.com',
    searchUrlPattern: '/recipes/?s={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'boredoflunch',
    displayName: 'Bored of Lunch',
    baseUrl: 'https://boredoflunch.com',
    searchUrlPattern: '/recipes/?s={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'nytcooking',
    displayName: 'NYT Cooking',
    baseUrl: 'https://cooking.nytimes.com',
    searchUrlPattern: '/search?q={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'bestblogrecipes',
    displayName: 'The Best Blog Recipes',
    baseUrl: 'https://thebestblogrecipes.com',
    searchUrlPattern: '/?s={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  },
  {
    name: 'halfbakedharvest',
    displayName: 'Half Baked Harvest',
    baseUrl: 'https://www.halfbakedharvest.com',
    searchUrlPattern: '/?s={query}',
    searchResultsSelector: null,
    categories: expandedCategories,
    isActive: true
  }
]

async function seedRecipeSources() {
  console.log('🌱 Seeding recipe source sites...\n')

  for (const site of sites) {
    try {
      const result = await prisma.recipeSourceSite.upsert({
        where: { name: site.name },
        update: {
          displayName: site.displayName,
          baseUrl: site.baseUrl,
          searchUrlPattern: site.searchUrlPattern,
          searchResultsSelector: site.searchResultsSelector,
          categories: site.categories,
          isActive: site.isActive
        },
        create: site
      })

      console.log(`   ✅ ${site.displayName} (${site.categories.length} categories)`)
    } catch (error) {
      console.error(`   ❌ Failed to seed ${site.displayName}:`, error)
    }
  }

  // Summary
  const count = await prisma.recipeSourceSite.count()
  console.log(`\n🟢 Recipe sources seeded successfully!`)
  console.log(`   Total sites: ${count}`)
  console.log(`   Total categories: ${sites.reduce((sum, s) => sum + s.categories.length, 0)}`)
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('   🍳 FamilyFuel Recipe Source Sites Seeder')
  console.log('═══════════════════════════════════════════════════════════\n')

  try {
    await seedRecipeSources()
    console.log('\n═══════════════════════════════════════════════════════════\n')
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Seeding failed:', error)
    process.exit(1)
  }
}

main()
