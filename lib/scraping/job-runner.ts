/**
 * Background job runner for recipe scraping
 * Orchestrates URL discovery and import for scraping jobs
 */

import { prisma } from '../prisma'
import { discoverRecipeUrls } from './discovery'
import { importToMasterDB } from './import'
import { ScrapingJobStatus } from '@prisma/client'

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface RunScrapingJobOptions {
  siteName?: string  // Site name like 'bbcgoodfood', not UUID
  category?: string
  maxPagesPerCategory?: number
  delayBetweenUrls?: number
  delayBetweenCategories?: number
}

export interface ScrapingJobResult {
  jobId: string
  status: ScrapingJobStatus
  urlsDiscovered: number
  urlsProcessed: number
  urlsSucceeded: number
  urlsFailed: number
  urlsSkipped: number
  errors: string[]
}

/**
 * Run a scraping job - discovers URLs then imports each one
 * Called via CLI command or admin API
 */
export async function runScrapingJob(
  options?: RunScrapingJobOptions
): Promise<ScrapingJobResult> {
  const {
    siteName,
    category,
    maxPagesPerCategory = 2,
    delayBetweenUrls = 2500,
    delayBetweenCategories = 3000
  } = options || {}

  // Look up site by name if provided
  let resolvedSiteId: string | null = null
  if (siteName) {
    const site = await prisma.recipeSourceSite.findUnique({
      where: { name: siteName },
      select: { id: true }
    })
    if (!site) {
      throw new Error(`Site not found: "${siteName}". Run 'npm run seed:sources' first.`)
    }
    resolvedSiteId = site.id
  }

  // Create job record
  const job = await prisma.recipeScrapingJob.create({
    data: {
      sourceSiteId: resolvedSiteId,
      category: category || null,
      status: 'running',
      startedAt: new Date()
    }
  })

  console.log(`\n🚀 Starting scraping job: ${job.id}`)
  console.log(`   Site filter: ${siteName || 'all sites'}`)
  console.log(`   Category filter: ${category || 'all categories'}`)

  let totalDiscovered = 0
  let totalProcessed = 0
  let totalSucceeded = 0
  let totalFailed = 0
  let totalSkipped = 0
  const errors: string[] = []

  try {
    // Get sites to scrape
    const sites = await prisma.recipeSourceSite.findMany({
      where: {
        isActive: true,
        ...(resolvedSiteId ? { id: resolvedSiteId } : {})
      }
    })

    if (sites.length === 0) {
      throw new Error('No active source sites found')
    }

    console.log(`   Found ${sites.length} site(s) to scrape\n`)

    for (const site of sites) {
      console.log(`\n📌 Processing site: ${site.displayName}`)

      // Determine categories to scrape
      const categories = category ? [category] : site.categories

      for (const cat of categories) {
        console.log(`\n   📂 Category: ${cat}`)

        // Step 1: Discover URLs
        const discovered = await discoverRecipeUrls(site, cat, {
          maxPages: maxPagesPerCategory
        })

        totalDiscovered += discovered.urls.length
        console.log(`   Found ${discovered.urls.length} URLs`)

        // Update job progress
        await prisma.recipeScrapingJob.update({
          where: { id: job.id },
          data: { urlsDiscovered: totalDiscovered }
        })

        // Step 2: Import each URL
        for (const url of discovered.urls) {
          totalProcessed++

          // Check if exists first (quick check)
          const existing = await prisma.masterRecipe.findUnique({
            where: { sourceUrl: url },
            select: { id: true }
          })

          if (existing) {
            totalSkipped++
            console.log(`   ⏭️  Skipped (exists): ${url}`)
          } else {
            // Import the recipe
            const result = await importToMasterDB(url, site)

            if (result.success && !result.skipped) {
              totalSucceeded++
              console.log(`   ✅ Imported: ${url}`)
            } else if (result.skipped) {
              totalSkipped++
              console.log(`   ⏭️  Skipped: ${url} - ${result.reason}`)
            } else {
              totalFailed++
              const errorMsg = `${url}: ${result.error}`
              errors.push(errorMsg)
              console.log(`   ❌ Failed: ${errorMsg}`)
            }

            // Rate limiting - be nice to source sites
            await sleep(delayBetweenUrls)
          }

          // Update job progress periodically (every 5 URLs)
          if (totalProcessed % 5 === 0) {
            await prisma.recipeScrapingJob.update({
              where: { id: job.id },
              data: {
                urlsDiscovered: totalDiscovered,
                urlsProcessed: totalProcessed,
                urlsSucceeded: totalSucceeded,
                urlsFailed: totalFailed,
                urlsSkipped: totalSkipped
              }
            })
          }
        }

        // Rate limiting between categories
        await sleep(delayBetweenCategories)
      }

      // Update site last scraped
      await prisma.recipeSourceSite.update({
        where: { id: site.id },
        data: { lastScrapedAt: new Date() }
      })
    }

    // Mark job complete
    await prisma.recipeScrapingJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        urlsDiscovered: totalDiscovered,
        urlsProcessed: totalProcessed,
        urlsSucceeded: totalSucceeded,
        urlsFailed: totalFailed,
        urlsSkipped: totalSkipped,
        errorLog: errors.length > 0 ? errors.slice(0, 100).join('\n') : null
      }
    })

    console.log(`\n✅ Scraping job complete!`)
    console.log(`   Job ID: ${job.id}`)
    console.log(`   Discovered: ${totalDiscovered}`)
    console.log(`   Processed: ${totalProcessed}`)
    console.log(`   Succeeded: ${totalSucceeded}`)
    console.log(`   Skipped: ${totalSkipped}`)
    console.log(`   Failed: ${totalFailed}`)

    return {
      jobId: job.id,
      status: 'completed',
      urlsDiscovered: totalDiscovered,
      urlsProcessed: totalProcessed,
      urlsSucceeded: totalSucceeded,
      urlsFailed: totalFailed,
      urlsSkipped: totalSkipped,
      errors
    }

  } catch (error) {
    console.error(`\n❌ Scraping job failed:`, error)

    await prisma.recipeScrapingJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        urlsDiscovered: totalDiscovered,
        urlsProcessed: totalProcessed,
        urlsSucceeded: totalSucceeded,
        urlsFailed: totalFailed,
        urlsSkipped: totalSkipped,
        errorLog: error instanceof Error ? error.message : String(error)
      }
    })

    return {
      jobId: job.id,
      status: 'failed',
      urlsDiscovered: totalDiscovered,
      urlsProcessed: totalProcessed,
      urlsSucceeded: totalSucceeded,
      urlsFailed: totalFailed,
      urlsSkipped: totalSkipped,
      errors: [error instanceof Error ? error.message : String(error)]
    }
  }
}

/**
 * Get status of a scraping job
 */
export async function getScrapingJobStatus(jobId: string) {
  return prisma.recipeScrapingJob.findUnique({
    where: { id: jobId }
  })
}

/**
 * Get all scraping jobs with pagination
 */
export async function getScrapingJobs(options?: {
  status?: ScrapingJobStatus
  limit?: number
  offset?: number
}) {
  const { status, limit = 20, offset = 0 } = options || {}

  return prisma.recipeScrapingJob.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset
  })
}

/**
 * Cancel a running scraping job
 * Note: This just marks it as failed, actual cancellation
 * would require the job runner to check this status
 */
export async function cancelScrapingJob(jobId: string) {
  return prisma.recipeScrapingJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      completedAt: new Date(),
      errorLog: 'Job cancelled by user'
    }
  })
}
