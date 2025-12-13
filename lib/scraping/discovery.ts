/**
 * URL Discovery - Scrape search result pages to find recipe URLs
 * This is lightweight - just extracting links, not parsing recipes
 */

import * as cheerio from 'cheerio'
import { DiscoveryResult } from './types'
import { RecipeSourceSite } from '@prisma/client'

/**
 * Sleep helper for rate limiting
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Fetch URL with retry logic
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔷 Fetching (attempt ${attempt}): ${url}`)

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      console.log(`🟢 Fetched successfully: ${url} (${html.length} bytes)`)
      return html
    } catch (error) {
      lastError = error as Error
      console.warn(`⚠️ Fetch attempt ${attempt} failed: ${lastError.message}`)

      if (attempt < maxRetries) {
        const delay = 1000 * attempt // Exponential backoff
        console.log(`   Retrying in ${delay}ms...`)
        await sleep(delay)
      }
    }
  }

  throw lastError || new Error('Failed to fetch URL')
}

/**
 * Build search URL for a site
 */
function buildSearchUrl(
  site: RecipeSourceSite,
  query: string,
  page: number
): string {
  let url = site.baseUrl + site.searchUrlPattern
  url = url.replace('{query}', encodeURIComponent(query))
  url = url.replace('{page}', String(page))
  return url
}

/**
 * Validate URL looks like a recipe (not category page, not external link)
 */
function isRecipeUrl(url: string, site: RecipeSourceSite): boolean {
  // Must contain /recipe or /recipes
  const hasRecipePath = url.includes('/recipe') ||
                        url.includes('/recipes/')

  // Skip collection/category pages
  const isCollection = url.includes('/collection') ||
                       url.includes('/category') ||
                       url.includes('/tag/') ||
                       url.includes('/search')

  // Must be on same domain (for relative URLs, always accept)
  const isSameDomain = !url.startsWith('http') ||
                       url.includes(new URL(site.baseUrl).hostname)

  return hasRecipePath && !isCollection && isSameDomain
}

/**
 * Extract recipe URLs from search results HTML
 */
function extractRecipeUrls(html: string, site: RecipeSourceSite): string[] {
  const $ = cheerio.load(html)
  const urls: string[] = []

  // Site-specific selector or generic recipe link patterns
  const selectors = site.searchResultsSelector
    ? [site.searchResultsSelector]
    : [
        'a[href*="/recipe/"]',
        'a[href*="/recipes/"]',
        '.recipe-card a',
        '.recipe-link',
        '[data-recipe-id] a',
        'article a[href*="recipe"]'
      ]

  for (const selector of selectors) {
    $(selector).each((_, el) => {
      const href = $(el).attr('href')
      if (href && isRecipeUrl(href, site)) {
        // Make absolute URL
        const fullUrl = href.startsWith('http')
          ? href
          : new URL(href, site.baseUrl).toString()
        urls.push(fullUrl)
      }
    })
  }

  return urls
}

/**
 * Discover recipe URLs from a site's search/category pages
 * Does NOT parse the recipes - just finds URLs
 *
 * @param site - The source site configuration
 * @param category - Search term/category to discover
 * @param options - Discovery options
 * @returns Array of discovered recipe URLs
 */
export async function discoverRecipeUrls(
  site: RecipeSourceSite,
  category: string,
  options?: {
    maxPages?: number
    delayBetweenPages?: number
  }
): Promise<DiscoveryResult> {
  const { maxPages = 3, delayBetweenPages = 1500 } = options || {}
  const urls: string[] = []

  console.log(`🔍 Discovering recipes: ${site.displayName} / "${category}"`)

  for (let page = 1; page <= maxPages; page++) {
    try {
      const searchUrl = buildSearchUrl(site, category, page)
      console.log(`   Page ${page}: ${searchUrl}`)

      const html = await fetchWithRetry(searchUrl)
      const pageUrls = extractRecipeUrls(html, site)

      if (pageUrls.length === 0) {
        console.log(`   No more results on page ${page}, stopping`)
        break
      }

      console.log(`   Found ${pageUrls.length} recipe URLs on page ${page}`)
      urls.push(...pageUrls)

      // Rate limiting between pages
      if (page < maxPages) {
        await sleep(delayBetweenPages)
      }
    } catch (error) {
      console.error(`❌ Error discovering page ${page}:`, error)
      break
    }
  }

  // Dedupe URLs
  const uniqueUrls = [...new Set(urls)]

  console.log(`🟢 Discovered ${uniqueUrls.length} unique recipe URLs from ${site.displayName}/${category}`)

  return {
    urls: uniqueUrls,
    site: site.name,
    category,
    scrapedAt: new Date()
  }
}

/**
 * Discover URLs from multiple categories for a site
 */
export async function discoverAllCategoriesForSite(
  site: RecipeSourceSite,
  options?: {
    maxPagesPerCategory?: number
    delayBetweenCategories?: number
    delayBetweenPages?: number
  }
): Promise<DiscoveryResult[]> {
  const {
    maxPagesPerCategory = 2,
    delayBetweenCategories = 3000,
    delayBetweenPages = 1500
  } = options || {}

  const results: DiscoveryResult[] = []

  for (let i = 0; i < site.categories.length; i++) {
    const category = site.categories[i]

    const result = await discoverRecipeUrls(site, category, {
      maxPages: maxPagesPerCategory,
      delayBetweenPages
    })

    results.push(result)

    // Rate limiting between categories
    if (i < site.categories.length - 1) {
      console.log(`   Waiting ${delayBetweenCategories}ms before next category...`)
      await sleep(delayBetweenCategories)
    }
  }

  return results
}
