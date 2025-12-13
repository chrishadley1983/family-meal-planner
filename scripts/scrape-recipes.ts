#!/usr/bin/env npx ts-node
/**
 * CLI Script for running recipe scraping jobs
 *
 * Usage:
 *   npx ts-node scripts/scrape-recipes.ts [options]
 *
 * Options:
 *   --site <siteId>      Only scrape a specific site
 *   --category <cat>     Only scrape a specific category
 *   --max-pages <n>      Max pages per category (default: 2)
 *   --help               Show this help message
 *
 * Examples:
 *   npx ts-node scripts/scrape-recipes.ts
 *   npx ts-node scripts/scrape-recipes.ts --category chicken
 *   npx ts-node scripts/scrape-recipes.ts --site bbcgoodfood --category vegetarian
 */

import { runScrapingJob } from '../lib/scraping/index'

interface CLIOptions {
  siteId?: string
  category?: string
  maxPagesPerCategory?: number
  help?: boolean
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    const nextArg = args[i + 1]

    switch (arg) {
      case '--site':
        if (nextArg) {
          options.siteId = nextArg
          i++
        }
        break
      case '--category':
        if (nextArg) {
          options.category = nextArg
          i++
        }
        break
      case '--max-pages':
        if (nextArg) {
          options.maxPagesPerCategory = parseInt(nextArg, 10)
          i++
        }
        break
      case '--help':
      case '-h':
        options.help = true
        break
    }
  }

  return options
}

function showHelp() {
  console.log(`
Recipe Scraping CLI

Usage:
  npx ts-node scripts/scrape-recipes.ts [options]

Options:
  --site <siteId>      Only scrape a specific site (by name, e.g., 'bbcgoodfood')
  --category <cat>     Only scrape a specific category (e.g., 'chicken', 'vegetarian')
  --max-pages <n>      Max search result pages per category (default: 2)
  --help, -h           Show this help message

Examples:
  # Scrape all sites, all categories
  npx ts-node scripts/scrape-recipes.ts

  # Scrape only chicken recipes from all sites
  npx ts-node scripts/scrape-recipes.ts --category chicken

  # Scrape only BBC Good Food
  npx ts-node scripts/scrape-recipes.ts --site bbcgoodfood

  # Scrape vegetarian recipes from BBC Good Food with 3 pages
  npx ts-node scripts/scrape-recipes.ts --site bbcgoodfood --category vegetarian --max-pages 3

Note: This script requires a DATABASE_URL environment variable to be set.
`)
}

async function main() {
  const args = process.argv.slice(2)
  const options = parseArgs(args)

  if (options.help) {
    showHelp()
    process.exit(0)
  }

  console.log('═══════════════════════════════════════════════════════════')
  console.log('   🍳 FamilyFuel Recipe Scraping Job')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`   Started at: ${new Date().toISOString()}`)

  if (options.siteId) {
    console.log(`   Site filter: ${options.siteId}`)
  }
  if (options.category) {
    console.log(`   Category filter: ${options.category}`)
  }
  if (options.maxPagesPerCategory) {
    console.log(`   Max pages: ${options.maxPagesPerCategory}`)
  }

  console.log('═══════════════════════════════════════════════════════════\n')

  try {
    const result = await runScrapingJob({
      siteId: options.siteId,
      category: options.category,
      maxPagesPerCategory: options.maxPagesPerCategory
    })

    console.log('\n═══════════════════════════════════════════════════════════')
    console.log('   📊 Scraping Job Summary')
    console.log('═══════════════════════════════════════════════════════════')
    console.log(`   Job ID:     ${result.jobId}`)
    console.log(`   Status:     ${result.status}`)
    console.log(`   Discovered: ${result.urlsDiscovered} URLs`)
    console.log(`   Processed:  ${result.urlsProcessed} URLs`)
    console.log(`   Succeeded:  ${result.urlsSucceeded} recipes imported`)
    console.log(`   Skipped:    ${result.urlsSkipped} (already exist)`)
    console.log(`   Failed:     ${result.urlsFailed} errors`)
    console.log('═══════════════════════════════════════════════════════════\n')

    if (result.errors.length > 0) {
      console.log('   Errors:')
      result.errors.slice(0, 10).forEach(err => {
        console.log(`     • ${err}`)
      })
      if (result.errors.length > 10) {
        console.log(`     ... and ${result.errors.length - 10} more errors`)
      }
      console.log('')
    }

    process.exit(result.status === 'completed' ? 0 : 1)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

main()
