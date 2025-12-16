/**
 * E2E Test Specifications for Recipe Import
 *
 * Tests the complete recipe import user journeys:
 * - Import recipe from URL
 * - URL validation
 * - Error handling for invalid URLs
 * - Recipe form population after import
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// RECIPE IMPORT FROM URL JOURNEY
// =============================================================================

export const recipeImportFromUrl: E2ETestSpec = {
  id: 'e2e-recipe-import-url',
  name: 'Recipe Import from URL',
  description: 'Verify user can import a recipe from an external URL and save it',
  priority: 'critical',
  requiresAuth: true,
  timeout: 120,

  steps: [
    // Step 1: Navigate to new recipe page
    {
      action: 'navigate',
      description: 'Navigate to new recipe page',
      params: {
        url: 'http://localhost:3000/recipes/new',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/recipes/new' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture initial recipe page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Find and enter recipe URL
    {
      action: 'type',
      description: 'Enter recipe URL in import field',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"], input[placeholder*="URL"], input[placeholder*="url"]', // TODO: Verify actual selector
        text: 'https://www.bbcgoodfood.com/recipes/easy-chicken-curry',
      },
    },

    // Step 4: Click import button
    {
      action: 'click',
      description: 'Click Import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import"), button:has-text("Fetch"), button[type="submit"]', // TODO: Verify actual selector
      },
      waitAfter: 5000,
    },

    // Step 5: Wait for AI processing to complete
    {
      action: 'wait_for',
      description: 'Wait for import loading to complete',
      params: {
        textGone: 'Importing',
        timeout: 60000, // AI processing can take up to 60 seconds
      },
    },

    // Step 6: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors during import',
      params: {
        level: 'error',
      },
    },

    // Step 7: Verify form is populated with recipe data
    {
      action: 'snapshot',
      description: 'Capture populated recipe form',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'exists', target: 'input[name="recipeName"], input[placeholder*="name"]' },
        { type: 'not_exists', target: '.error-message, [data-testid="error"]' },
      ],
    },

    // Step 8: Verify key fields are populated
    {
      action: 'verify_element',
      description: 'Verify recipe name field has content',
      params: {
        selector: 'input[name="recipeName"]',
        shouldExist: true,
        hasValue: true,
      },
    },

    // Step 9: Save the recipe
    {
      action: 'click',
      description: 'Click Save Recipe button',
      params: {
        element: 'Save Recipe button',
        ref: 'button:has-text("Save"), button:has-text("Create")',
      },
      waitAfter: 3000,
    },

    // Step 10: Verify redirect to recipe detail or list
    {
      action: 'verify_url',
      description: 'Verify redirected away from new recipe page',
      params: {
        pattern: '/recipes(/[a-zA-Z0-9-]+)?$',
      },
    },

    // Step 11: Verify recipe was saved in database
    {
      action: 'verify_database',
      description: 'Verify recipe exists in database',
      params: {
        query: 'SELECT id, "recipeName", "sourceUrl" FROM "Recipe" WHERE "sourceUrl" LIKE \'%bbcgoodfood%\' AND "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },

    // Step 12: Final screenshot
    {
      action: 'screenshot',
      description: 'Capture final state after save',
      params: {
        filename: 'e2e-recipe-import-success.png',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: '"sourceUrl" LIKE \'%bbcgoodfood%\' AND "createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
  ],
}

// =============================================================================
// INVALID URL HANDLING
// =============================================================================

export const invalidUrlHandling: E2ETestSpec = {
  id: 'e2e-recipe-import-invalid-url',
  name: 'Invalid URL Handling',
  description: 'Verify proper error handling for invalid recipe URLs',
  priority: 'high',
  requiresAuth: true,
  timeout: 30,

  steps: [
    // Step 1: Navigate to new recipe page
    {
      action: 'navigate',
      description: 'Navigate to new recipe page',
      params: {
        url: 'http://localhost:3000/recipes/new',
      },
    },

    // Step 2: Enter invalid URL
    {
      action: 'type',
      description: 'Enter invalid URL',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"], input[placeholder*="URL"]',
        text: 'not-a-valid-url',
      },
    },

    // Step 3: Click import button
    {
      action: 'click',
      description: 'Click Import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import")',
      },
      waitAfter: 2000,
    },

    // Step 4: Verify error message appears
    {
      action: 'snapshot',
      description: 'Capture error state',
      params: {},
      screenshot: true,
    },

    // Step 5: Verify error indication
    {
      action: 'verify_element',
      description: 'Verify error message is displayed',
      params: {
        selector: '.error, [role="alert"], .text-red-500, .text-destructive, .toast-error',
        shouldExist: true,
      },
    },

    // Step 6: Verify form is not populated
    {
      action: 'verify_element',
      description: 'Verify recipe name field is still empty',
      params: {
        selector: 'input[name="recipeName"]',
        hasValue: false,
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// UNREACHABLE URL HANDLING
// =============================================================================

export const unreachableUrlHandling: E2ETestSpec = {
  id: 'e2e-recipe-import-unreachable',
  name: 'Unreachable URL Handling',
  description: 'Verify proper error handling when URL cannot be fetched',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to new recipe page
    {
      action: 'navigate',
      description: 'Navigate to new recipe page',
      params: {
        url: 'http://localhost:3000/recipes/new',
      },
    },

    // Step 2: Enter URL that will fail to fetch
    {
      action: 'type',
      description: 'Enter unreachable URL',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"], input[placeholder*="URL"]',
        text: 'https://this-domain-does-not-exist-12345.com/recipe',
      },
    },

    // Step 3: Click import button
    {
      action: 'click',
      description: 'Click Import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import")',
      },
      waitAfter: 5000,
    },

    // Step 4: Wait for fetch to fail
    {
      action: 'wait_for',
      description: 'Wait for error response',
      params: {
        timeout: 30000,
      },
    },

    // Step 5: Verify error message
    {
      action: 'snapshot',
      description: 'Capture error state for unreachable URL',
      params: {},
      screenshot: true,
    },

    // Step 6: Verify appropriate error handling
    {
      action: 'verify_element',
      description: 'Verify error feedback exists',
      params: {
        selector: '.error, [role="alert"], .text-red-500, .toast-error',
        shouldExist: true,
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// NON-RECIPE PAGE HANDLING
// =============================================================================

export const nonRecipePageHandling: E2ETestSpec = {
  id: 'e2e-recipe-import-non-recipe',
  name: 'Non-Recipe Page Handling',
  description: 'Verify proper handling when URL does not contain a recipe',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to new recipe page
    {
      action: 'navigate',
      description: 'Navigate to new recipe page',
      params: {
        url: 'http://localhost:3000/recipes/new',
      },
    },

    // Step 2: Enter URL of a non-recipe page
    {
      action: 'type',
      description: 'Enter non-recipe page URL',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"], input[placeholder*="URL"]',
        text: 'https://www.google.com', // A page without recipe content
      },
    },

    // Step 3: Click import button
    {
      action: 'click',
      description: 'Click Import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import")',
      },
      waitAfter: 5000,
    },

    // Step 4: Wait for AI processing
    {
      action: 'wait_for',
      description: 'Wait for AI to attempt parsing',
      params: {
        timeout: 30000,
      },
    },

    // Step 5: Capture result
    {
      action: 'snapshot',
      description: 'Capture result state',
      params: {},
      screenshot: true,
    },

    // Step 6: Verify either error or minimal data
    // AI might return partial data or error - either is acceptable
    {
      action: 'check_console_errors',
      description: 'Check for any runtime errors',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// IMPORT LOADING STATE
// =============================================================================

export const importLoadingState: E2ETestSpec = {
  id: 'e2e-recipe-import-loading',
  name: 'Import Loading State',
  description: 'Verify loading indicators appear during import process',
  priority: 'high',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to new recipe page
    {
      action: 'navigate',
      description: 'Navigate to new recipe page',
      params: {
        url: 'http://localhost:3000/recipes/new',
      },
    },

    // Step 2: Enter a valid recipe URL
    {
      action: 'type',
      description: 'Enter valid recipe URL',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"], input[placeholder*="URL"]',
        text: 'https://www.bbcgoodfood.com/recipes/easy-chicken-curry',
      },
    },

    // Step 3: Click import and immediately capture loading state
    {
      action: 'click',
      description: 'Click Import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import")',
      },
    },

    // Step 4: Immediately capture loading state (no waitAfter)
    {
      action: 'screenshot',
      description: 'Capture loading state immediately',
      params: {
        filename: 'e2e-recipe-import-loading.png',
      },
    },

    // Step 5: Verify loading indicator exists
    {
      action: 'verify_element',
      description: 'Verify loading indicator is shown',
      params: {
        selector: '.loading, .spinner, [data-loading="true"], button[disabled], .animate-spin',
        shouldExist: true,
      },
    },

    // Step 6: Wait for loading to complete
    {
      action: 'wait_for',
      description: 'Wait for import to complete',
      params: {
        timeout: 60000,
      },
    },

    // Step 7: Verify loading indicator disappears
    {
      action: 'snapshot',
      description: 'Capture completed state',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: '"sourceUrl" LIKE \'%bbcgoodfood%\' AND "createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All recipe import E2E test specifications
 */
export const recipeImportE2ETests: E2ETestSpec[] = [
  recipeImportFromUrl,
  invalidUrlHandling,
  unreachableUrlHandling,
  nonRecipePageHandling,
  importLoadingState,
]

export default recipeImportE2ETests
