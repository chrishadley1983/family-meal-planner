/**
 * E2E Test Template
 *
 * Use this template when creating new E2E tests.
 * E2E tests verify complete user journeys using Playwright MCP.
 *
 * Location: tests/e2e/<journey-name>.spec.ts
 *
 * IMPORTANT: E2E tests use Playwright MCP tools, NOT standard Playwright API.
 * The Test Execution Agent will interpret these test specifications and
 * execute them using MCP tool calls.
 */

// =============================================================================
// TEST SPECIFICATION
// =============================================================================

/**
 * E2E Test Specification Format
 *
 * Each E2E test is defined as a specification object that the Test Execution
 * Agent interprets and executes using MCP tools.
 */

export interface E2ETestSpec {
  id: string
  name: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresAuth: boolean
  timeout: number // seconds
  steps: E2ETestStep[]
  cleanup?: E2ECleanupStep[]
}

export interface E2ETestStep {
  action: E2EAction
  description: string
  params: Record<string, any>
  assertions?: E2EAssertion[]
  screenshot?: boolean
  waitAfter?: number // milliseconds
}

export type E2EAction =
  | 'navigate'
  | 'click'
  | 'type'
  | 'fill_form'
  | 'wait_for'
  | 'snapshot'
  | 'screenshot'
  | 'verify_text'
  | 'verify_element'
  | 'verify_url'
  | 'verify_database'
  | 'check_console_errors'
  | 'check_network'
  | 'seed_data'
  | 'cleanup_data'

export interface E2EAssertion {
  type: 'contains' | 'equals' | 'exists' | 'not_exists' | 'matches'
  target: string
  expected?: any
}

export interface E2ECleanupStep {
  action: 'delete_record' | 'reset_state' | 'clear_cache'
  params: Record<string, any>
}

// =============================================================================
// EXAMPLE: Recipe Import Journey
// =============================================================================

export const recipeImportJourney: E2ETestSpec = {
  id: 'e2e-recipe-import',
  name: 'Recipe Import from URL',
  description: 'Verify user can import a recipe from an external URL',
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
      description: 'Capture initial page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Enter recipe URL
    {
      action: 'type',
      description: 'Enter recipe URL in import field',
      params: {
        element: 'URL input field',
        ref: 'input[name="url"]',
        text: 'https://www.bbcgoodfood.com/recipes/easy-chicken-curry',
      },
    },

    // Step 4: Click import button
    {
      action: 'click',
      description: 'Click import button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import")',
      },
      waitAfter: 5000, // Wait for AI processing
    },

    // Step 5: Wait for loading to complete
    {
      action: 'wait_for',
      description: 'Wait for import to complete',
      params: {
        textGone: 'Importing...',
        timeout: 30000,
      },
    },

    // Step 6: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no console errors during import',
      params: {
        level: 'error',
      },
      assertions: [
        { type: 'equals', target: 'errorCount', expected: 0 },
      ],
    },

    // Step 7: Verify recipe form is populated
    {
      action: 'snapshot',
      description: 'Capture populated form state',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'exists', target: 'input[name="recipeName"]' },
        { type: 'not_exists', target: '.error-message' },
      ],
    },

    // Step 8: Save the recipe
    {
      action: 'click',
      description: 'Click save button',
      params: {
        element: 'Save Recipe button',
        ref: 'button:has-text("Save")',
      },
      waitAfter: 2000,
    },

    // Step 9: Verify redirect to recipe detail
    {
      action: 'verify_url',
      description: 'Verify redirected to recipe detail page',
      params: {
        pattern: '/recipes/[a-z0-9-]+$',
      },
    },

    // Step 10: Verify in database
    {
      action: 'verify_database',
      description: 'Verify recipe exists in database',
      params: {
        query: 'SELECT * FROM "Recipe" WHERE "recipeName" LIKE \'%chicken curry%\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: 'recipeName LIKE \'%chicken curry%\' AND createdAt > NOW() - INTERVAL \'1 hour\'',
      },
    },
  ],
}

// =============================================================================
// EXAMPLE: Meal Plan Generation Journey
// =============================================================================

export const mealPlanGenerationJourney: E2ETestSpec = {
  id: 'e2e-meal-plan-generation',
  name: 'Weekly Meal Plan Generation',
  description: 'Verify user can generate an AI-powered weekly meal plan',
  priority: 'critical',
  requiresAuth: true,
  timeout: 180,

  steps: [
    // Seed test recipes first
    {
      action: 'seed_data',
      description: 'Seed test recipes for meal plan',
      params: {
        table: 'Recipe',
        records: [
          { recipeName: 'E2E Test Recipe 1', servings: 4, cookTime: 30 },
          { recipeName: 'E2E Test Recipe 2', servings: 4, cookTime: 45 },
          { recipeName: 'E2E Test Recipe 3', servings: 4, cookTime: 20 },
        ],
      },
    },

    // Navigate to meal plan page
    {
      action: 'navigate',
      description: 'Navigate to meal plans page',
      params: {
        url: 'http://localhost:3000/meal-plans/new',
      },
    },

    // Select week start date
    {
      action: 'click',
      description: 'Open date picker',
      params: {
        element: 'Week start date picker',
        ref: 'input[name="weekStartDate"]',
      },
    },

    {
      action: 'click',
      description: 'Select next Monday',
      params: {
        element: 'Next Monday in calendar',
        ref: '.calendar-day:has-text("Monday"):not(.past)',
      },
    },

    // Generate meal plan
    {
      action: 'click',
      description: 'Click generate button',
      params: {
        element: 'Generate Meal Plan button',
        ref: 'button:has-text("Generate")',
      },
      waitAfter: 10000,
    },

    // Wait for generation
    {
      action: 'wait_for',
      description: 'Wait for generation to complete',
      params: {
        text: 'Your meal plan is ready',
        timeout: 60000,
      },
    },

    // Verify meal plan structure
    {
      action: 'snapshot',
      description: 'Capture generated meal plan',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'exists', target: '.meal-plan-day' },
        { type: 'exists', target: '.meal-slot' },
      ],
    },

    // Check no cooldown violations
    {
      action: 'verify_element',
      description: 'Verify no validation errors',
      params: {
        selector: '.validation-error',
        shouldNotExist: true,
      },
    },

    // Save meal plan
    {
      action: 'click',
      description: 'Save meal plan',
      params: {
        element: 'Save Meal Plan button',
        ref: 'button:has-text("Save")',
      },
    },

    // Verify saved
    {
      action: 'verify_database',
      description: 'Verify meal plan saved to database',
      params: {
        query: 'SELECT * FROM "MealPlan" WHERE "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'MealPlan',
        where: 'createdAt > NOW() - INTERVAL \'1 hour\'',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: 'recipeName LIKE \'E2E Test Recipe%\'',
      },
    },
  ],
}

// =============================================================================
// EXAMPLE: Authentication Journey
// =============================================================================

export const authenticationJourney: E2ETestSpec = {
  id: 'e2e-authentication',
  name: 'User Registration and Login',
  description: 'Verify new user can register and existing user can login',
  priority: 'critical',
  requiresAuth: false, // This test handles its own auth
  timeout: 90,

  steps: [
    // Navigate to registration
    {
      action: 'navigate',
      description: 'Navigate to registration page',
      params: {
        url: 'http://localhost:3000/auth/register',
      },
    },

    // Fill registration form
    {
      action: 'fill_form',
      description: 'Fill registration form',
      params: {
        fields: [
          { name: 'Email', ref: 'input[name="email"]', value: `e2e-test-${Date.now()}@test.com` },
          { name: 'Password', ref: 'input[name="password"]', value: 'TestPassword123!' },
          { name: 'Confirm Password', ref: 'input[name="confirmPassword"]', value: 'TestPassword123!' },
          { name: 'Name', ref: 'input[name="name"]', value: 'E2E Test User' },
        ],
      },
    },

    // Submit registration
    {
      action: 'click',
      description: 'Submit registration',
      params: {
        element: 'Register button',
        ref: 'button[type="submit"]',
      },
      waitAfter: 3000,
    },

    // Verify redirect to dashboard
    {
      action: 'verify_url',
      description: 'Verify redirected to dashboard',
      params: {
        contains: '/dashboard',
      },
    },

    // Verify user in database
    {
      action: 'verify_database',
      description: 'Verify user created in database',
      params: {
        query: 'SELECT * FROM "User" WHERE email LIKE \'e2e-test-%@test.com\' ORDER BY "createdAt" DESC LIMIT 1',
        assertion: 'rowCount > 0',
      },
    },

    // Screenshot dashboard
    {
      action: 'screenshot',
      description: 'Capture dashboard after registration',
      params: {
        filename: 'e2e-auth-dashboard.png',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'User',
        where: 'email LIKE \'e2e-test-%@test.com\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All E2E test specifications for this project
 * The Test Execution Agent will import and execute these
 */
export const e2eTestSpecs: E2ETestSpec[] = [
  authenticationJourney,
  recipeImportJourney,
  mealPlanGenerationJourney,
  // Add more journeys here...
]

// =============================================================================
// HELPER: Test Spec Validation
// =============================================================================

/**
 * Validates an E2E test specification
 * Used by Test Plan Agent to ensure specs are well-formed
 */
export function validateE2ESpec(spec: E2ETestSpec): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!spec.id) errors.push('Missing test ID')
  if (!spec.name) errors.push('Missing test name')
  if (!spec.steps || spec.steps.length === 0) errors.push('No test steps defined')

  for (let i = 0; i < spec.steps.length; i++) {
    const step = spec.steps[i]
    if (!step.action) errors.push(`Step ${i + 1}: Missing action`)
    if (!step.description) errors.push(`Step ${i + 1}: Missing description`)
    if (!step.params) errors.push(`Step ${i + 1}: Missing params`)
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
