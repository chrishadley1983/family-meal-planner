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
const sites = [
  {
    name: 'bbcgoodfood',
    displayName: 'BBC Good Food',
    baseUrl: 'https://www.bbcgoodfood.com',
    searchUrlPattern: '/search?q={query}&page={page}',
    searchResultsSelector: 'a.standard-card-new__article-title',
    categories: [
      'chicken', 'beef', 'pork', 'lamb', 'fish', 'seafood', 'salmon',
      'vegetarian', 'vegan', 'pasta', 'rice', 'curry', 'stir-fry',
      'soup', 'salad', 'breakfast', 'lunch', 'dinner', 'quick',
      'healthy', 'low-calorie', 'high-protein', 'family', 'budget'
    ],
    isActive: true
  },
  {
    name: 'allrecipes',
    displayName: 'AllRecipes',
    baseUrl: 'https://www.allrecipes.com',
    searchUrlPattern: '/search?q={query}&page={page}',
    searchResultsSelector: 'a.mntl-card-list-card',
    categories: [
      'chicken', 'beef', 'pork', 'fish', 'vegetarian', 'vegan',
      'pasta', 'casserole', 'soup', 'salad', 'breakfast', 'dinner',
      'quick-and-easy', 'healthy', 'low-carb'
    ],
    isActive: true
  },
  {
    name: 'delicious',
    displayName: 'Delicious Magazine',
    baseUrl: 'https://www.deliciousmagazine.co.uk',
    searchUrlPattern: '/search?q={query}',
    searchResultsSelector: 'a.recipe-card',
    categories: [
      'chicken', 'beef', 'fish', 'vegetarian', 'pasta', 'curry',
      'roast', 'salad', 'soup', 'quick', 'weekend'
    ],
    isActive: true
  },
  {
    name: 'taste',
    displayName: 'Taste.com.au',
    baseUrl: 'https://www.taste.com.au',
    searchUrlPattern: '/search-recipes?q={query}&page={page}',
    searchResultsSelector: 'a.recipe-card-link',
    categories: [
      'chicken', 'beef', 'lamb', 'fish', 'vegetarian', 'pasta',
      'asian', 'indian', 'healthy', 'quick', 'family'
    ],
    isActive: true
  },
  {
    name: 'olivemagazine',
    displayName: 'Olive Magazine',
    baseUrl: 'https://www.olivemagazine.com',
    searchUrlPattern: '/search?q={query}',
    searchResultsSelector: 'a.post-card',
    categories: [
      'chicken', 'beef', 'fish', 'vegetarian', 'vegan', 'pasta',
      'mediterranean', 'asian', 'healthy', 'quick'
    ],
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
