#!/usr/bin/env npx tsx
/**
 * CLI Script for running recipe scraping jobs
 *
 * Usage:
 *   npm run scrape -- [options]
 *
 * Options:
 *   --site <name>        Only scrape a specific site (e.g., 'bbcgoodfood')
 *   --category <cat>     Only scrape a specific category (e.g., 'chicken')
 *   --max-pages <n>      Max search pages per category (default: 2)
 *   --max-urls <n>       Max URLs per site/category combo (for variety)
 *   --help               Show this help message
 *
 * Examples:
 *   npm run scrape -- --max-urls 5              # 5 per category, all sites
 *   npm run scrape -- --site bbcgoodfood        # All categories from BBC
 *   npm run scrape -- --max-urls 5 --max-pages 1  # Quick variety seed
 */

// Load environment variables FIRST before any other imports
import 'dotenv/config'

import { runScrapingJob } from '../lib/scraping/index'

interface CLIOptions {
  siteName?: string
  category?: string
  maxPagesPerCategory?: number
  maxUrlsPerCategory?: number
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
          options.siteName = nextArg
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
      case '--max-urls':
        if (nextArg) {
          options.maxUrlsPerCategory = parseInt(nextArg, 10)
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
  npm run scrape -- [options]

Options:
  --site <name>        Only scrape a specific site (e.g., 'bbcgoodfood')
  --category <cat>     Only scrape a specific category (e.g., 'chicken', 'vegetarian')
  --max-pages <n>      Max search result pages per category (default: 2)
  --max-urls <n>       Max URLs to import per site/category (for variety)
  --help, -h           Show this help message

Examples:
  # Scrape all sites, all categories (no limits - takes hours!)
  npm run scrape

  # Scrape 5 recipes per category from all sites (recommended for initial seed)
  npm run scrape -- --max-urls 5

  # Scrape only chicken recipes from BBC Good Food
  npm run scrape -- --site bbcgoodfood --category chicken

  # Full variety seed: 5 recipes per site/category combo
  npm run scrape -- --max-urls 5 --max-pages 1

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

  if (options.siteName) {
    console.log(`   Site filter: ${options.siteName}`)
  }
  if (options.category) {
    console.log(`   Category filter: ${options.category}`)
  }
  if (options.maxPagesPerCategory) {
    console.log(`   Max pages: ${options.maxPagesPerCategory}`)
  }
  if (options.maxUrlsPerCategory) {
    console.log(`   Max URLs per category: ${options.maxUrlsPerCategory}`)
  }

  console.log('═══════════════════════════════════════════════════════════\n')

  try {
    const result = await runScrapingJob({
      siteName: options.siteName,
      category: options.category,
      maxPagesPerCategory: options.maxPagesPerCategory,
      maxUrlsPerCategory: options.maxUrlsPerCategory
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
