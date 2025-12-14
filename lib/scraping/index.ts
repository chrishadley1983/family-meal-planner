/**
 * Recipe Scraping Library
 *
 * This module provides tools for building and maintaining
 * a master recipe database from curated recipe sites.
 */

// Types
export * from './types'

// URL Discovery
export { discoverRecipeUrls, discoverAllCategoriesForSite } from './discovery'

// Recipe Import
export {
  importToMasterDB,
  batchImportToMasterDB,
  addMasterRecipeToUserLibrary
} from './import'

// Job Runner
export {
  runScrapingJob,
  getScrapingJobStatus,
  getScrapingJobs,
  cancelScrapingJob
} from './job-runner'
export type { RunScrapingJobOptions, ScrapingJobResult } from './job-runner'

// Utilities
export { detectAllergens, containsAllergen, getAllergenWarnings } from './allergens'
export {
  calculateQualityScore,
  getQualityBreakdown,
  meetsQualityThreshold,
  getQualityTier
} from './quality-score'
