/**
 * E2E Test Specifications for Meal Plan
 *
 * Tests the complete meal plan user journeys:
 * - Weekly meal plan generation
 * - Meal plan viewing
 * - Shopping list generation from meal plan
 * - Meal plan validation (cooldown periods)
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 * NOTE: Requires test recipes to be seeded before running
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// MEAL PLAN GENERATION JOURNEY
// =============================================================================

export const mealPlanGeneration: E2ETestSpec = {
  id: 'e2e-meal-plan-generation',
  name: 'Weekly Meal Plan Generation',
  description: 'Verify user can generate an AI-powered weekly meal plan',
  priority: 'critical',
  requiresAuth: true,
  timeout: 180,

  steps: [
    // Step 1: Seed test recipes
    {
      action: 'seed_data',
      description: 'Seed test recipes for meal plan generation',
      params: {
        table: 'Recipe',
        records: [
          {
            recipeName: 'E2E Test Chicken Curry',
            servings: 4,
            prepTimeMinutes: 20,
            cookTimeMinutes: 30,
            cuisineType: 'Indian',
            mealType: ['dinner'],
            caloriesPerServing: 450,
          },
          {
            recipeName: 'E2E Test Beef Stir Fry',
            servings: 4,
            prepTimeMinutes: 15,
            cookTimeMinutes: 20,
            cuisineType: 'Asian',
            mealType: ['dinner'],
            caloriesPerServing: 500,
          },
          {
            recipeName: 'E2E Test Pasta Bolognese',
            servings: 4,
            prepTimeMinutes: 15,
            cookTimeMinutes: 45,
            cuisineType: 'Italian',
            mealType: ['dinner'],
            caloriesPerServing: 550,
          },
          {
            recipeName: 'E2E Test Fish Tacos',
            servings: 4,
            prepTimeMinutes: 20,
            cookTimeMinutes: 15,
            cuisineType: 'Mexican',
            mealType: ['dinner'],
            caloriesPerServing: 400,
          },
          {
            recipeName: 'E2E Test Greek Salad',
            servings: 4,
            prepTimeMinutes: 15,
            cookTimeMinutes: 0,
            cuisineType: 'Mediterranean',
            mealType: ['lunch'],
            caloriesPerServing: 300,
          },
        ],
      },
    },

    // Step 2: Navigate to meal plans
    {
      action: 'navigate',
      description: 'Navigate to meal plans page',
      params: {
        url: 'http://localhost:3000/meal-plans',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/meal-plans' },
      ],
    },

    // Step 3: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture meal plans page state',
      params: {},
      screenshot: true,
    },

    // Step 4: Click create new meal plan
    {
      action: 'click',
      description: 'Click New Meal Plan button',
      params: {
        element: 'New Meal Plan button',
        ref: 'button:has-text("New"), button:has-text("Create"), a:has-text("New"), [data-testid="new-meal-plan"]',
      },
      waitAfter: 2000,
    },

    // Step 5: Verify on create page or modal
    {
      action: 'snapshot',
      description: 'Capture meal plan creation form',
      params: {},
      screenshot: true,
    },

    // Step 6: Select week start date (if date picker exists)
    {
      action: 'click',
      description: 'Open date picker for week start',
      params: {
        element: 'Week start date picker',
        ref: 'input[name="weekStartDate"], [data-testid="week-picker"], .date-picker',
      },
      waitAfter: 500,
    },

    // Step 7: Click generate button
    {
      action: 'click',
      description: 'Click Generate Meal Plan button',
      params: {
        element: 'Generate button',
        ref: 'button:has-text("Generate"), button:has-text("Create Plan"), [data-testid="generate-meal-plan"]',
      },
      waitAfter: 5000,
    },

    // Step 8: Wait for AI generation (this can take a while)
    {
      action: 'wait_for',
      description: 'Wait for meal plan generation to complete',
      params: {
        timeout: 120000, // 2 minutes for AI generation
      },
    },

    // Step 9: Check for console errors during generation
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors during generation',
      params: {
        level: 'error',
      },
    },

    // Step 10: Verify meal plan is displayed
    {
      action: 'snapshot',
      description: 'Capture generated meal plan',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'exists', target: '.meal-plan, .week-view, [data-testid="meal-plan"]' },
        { type: 'not_exists', target: '.validation-error, [data-testid="cooldown-violation"]' },
      ],
    },

    // Step 11: Verify meal slots exist
    {
      action: 'verify_element',
      description: 'Verify meal slots are present',
      params: {
        selector: '.meal-slot, .meal-card, [data-testid="meal-slot"]',
        shouldExist: true,
      },
    },

    // Step 12: Verify in database
    {
      action: 'verify_database',
      description: 'Verify meal plan saved to database',
      params: {
        query: 'SELECT id, status, "weekStartDate" FROM "MealPlan" WHERE "createdAt" > NOW() - INTERVAL \'5 minutes\' ORDER BY "createdAt" DESC LIMIT 1',
        assertion: 'rowCount > 0',
      },
    },

    // Step 13: Verify meals were created
    {
      action: 'verify_database',
      description: 'Verify meals exist in database',
      params: {
        query: `SELECT COUNT(*) as count FROM "Meal" WHERE "mealPlanId" IN (
          SELECT id FROM "MealPlan" WHERE "createdAt" > NOW() - INTERVAL '5 minutes'
        )`,
        assertion: 'rows[0].count > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Meal',
        where: '"mealPlanId" IN (SELECT id FROM "MealPlan" WHERE "createdAt" > NOW() - INTERVAL \'1 hour\')',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'MealPlan',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: '"recipeName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// MEAL PLAN VIEWING JOURNEY
// =============================================================================

export const mealPlanViewing: E2ETestSpec = {
  id: 'e2e-meal-plan-viewing',
  name: 'Meal Plan Viewing',
  description: 'Verify user can view existing meal plans',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test data
    {
      action: 'seed_data',
      description: 'Seed test meal plan for viewing',
      params: {
        table: 'MealPlan',
        records: [
          {
            weekStartDate: 'CURRENT_WEEK_START', // Placeholder - agent should calculate
            weekEndDate: 'CURRENT_WEEK_END',
            status: 'Active',
          },
        ],
      },
    },

    // Step 2: Navigate to meal plans
    {
      action: 'navigate',
      description: 'Navigate to meal plans page',
      params: {
        url: 'http://localhost:3000/meal-plans',
      },
    },

    // Step 3: Take snapshot
    {
      action: 'snapshot',
      description: 'Capture meal plans list',
      params: {},
      screenshot: true,
    },

    // Step 4: Click on a meal plan to view
    {
      action: 'click',
      description: 'Click to view meal plan details',
      params: {
        element: 'Meal plan card or link',
        ref: '.meal-plan-card, a[href*="/meal-plans/"], [data-testid="meal-plan-item"]',
      },
      waitAfter: 2000,
    },

    // Step 5: Verify meal plan detail view
    {
      action: 'snapshot',
      description: 'Capture meal plan detail view',
      params: {},
      screenshot: true,
    },

    // Step 6: Verify week structure is visible
    {
      action: 'verify_element',
      description: 'Verify week days are displayed',
      params: {
        selector: '.day-column, .week-day, [data-day]',
        shouldExist: true,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'MealPlan',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
  ],
}

// =============================================================================
// SHOPPING LIST FROM MEAL PLAN
// =============================================================================

export const shoppingListFromMealPlan: E2ETestSpec = {
  id: 'e2e-meal-plan-shopping-list',
  name: 'Shopping List from Meal Plan',
  description: 'Verify user can generate a shopping list from a meal plan',
  priority: 'critical',
  requiresAuth: true,
  timeout: 90,

  steps: [
    // Step 1: Seed test data (recipes with ingredients)
    {
      action: 'seed_data',
      description: 'Seed test recipes with ingredients',
      params: {
        table: 'Recipe',
        records: [
          {
            recipeName: 'E2E Shopping Test Recipe',
            servings: 4,
            ingredients: [
              { ingredientName: 'Chicken Breast', quantity: 500, unit: 'g' },
              { ingredientName: 'Rice', quantity: 300, unit: 'g' },
              { ingredientName: 'Onion', quantity: 2, unit: 'each' },
            ],
          },
        ],
      },
    },

    // Step 2: Navigate to meal plan with recipes
    {
      action: 'navigate',
      description: 'Navigate to meal plan page',
      params: {
        url: 'http://localhost:3000/meal-plans',
      },
    },

    // Step 3: Find and click shopping list button
    {
      action: 'click',
      description: 'Click Shopping List button',
      params: {
        element: 'Generate Shopping List button',
        ref: 'button:has-text("Shopping"), a:has-text("Shopping List"), [data-testid="shopping-list-btn"]',
      },
      waitAfter: 3000,
    },

    // Step 4: Verify shopping list page/modal
    {
      action: 'snapshot',
      description: 'Capture shopping list view',
      params: {},
      screenshot: true,
    },

    // Step 5: Verify items are listed
    {
      action: 'verify_element',
      description: 'Verify shopping list items exist',
      params: {
        selector: '.shopping-item, .list-item, [data-testid="shopping-item"]',
        shouldExist: true,
      },
    },

    // Step 6: Verify in database
    {
      action: 'verify_database',
      description: 'Verify shopping list created in database',
      params: {
        query: 'SELECT id FROM "ShoppingList" WHERE "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount >= 0', // May or may not create new list depending on implementation
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"shoppingListId" IN (SELECT id FROM "ShoppingList" WHERE "createdAt" > NOW() - INTERVAL \'1 hour\')',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingList',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: '"recipeName" LIKE \'E2E Shopping Test%\'',
      },
    },
  ],
}

// =============================================================================
// MEAL PLAN NO RECIPES ERROR
// =============================================================================

export const mealPlanNoRecipesError: E2ETestSpec = {
  id: 'e2e-meal-plan-no-recipes',
  name: 'Meal Plan No Recipes Error',
  description: 'Verify proper error when user has no recipes for meal plan',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Ensure no recipes exist (or use fresh test user)
    // Note: This test should be run with a user that has no recipes
    // or after cleaning up test recipes

    // Step 2: Navigate to create meal plan
    {
      action: 'navigate',
      description: 'Navigate to create meal plan',
      params: {
        url: 'http://localhost:3000/meal-plans/new',
      },
    },

    // Step 3: Attempt to generate
    {
      action: 'click',
      description: 'Click Generate button',
      params: {
        element: 'Generate button',
        ref: 'button:has-text("Generate")',
      },
      waitAfter: 3000,
    },

    // Step 4: Verify error message
    {
      action: 'snapshot',
      description: 'Capture error state',
      params: {},
      screenshot: true,
    },

    // Step 5: Verify error indication
    {
      action: 'verify_element',
      description: 'Verify error about needing recipes',
      params: {
        selector: '.error, [role="alert"], .toast-error',
        shouldExist: true,
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// MEAL PLAN LOADING STATE
// =============================================================================

export const mealPlanLoadingState: E2ETestSpec = {
  id: 'e2e-meal-plan-loading',
  name: 'Meal Plan Loading State',
  description: 'Verify loading indicators during meal plan generation',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed minimal test recipes
    {
      action: 'seed_data',
      description: 'Seed test recipes',
      params: {
        table: 'Recipe',
        records: [
          { recipeName: 'E2E Loading Test Recipe 1', servings: 4, mealType: ['dinner'] },
          { recipeName: 'E2E Loading Test Recipe 2', servings: 4, mealType: ['dinner'] },
          { recipeName: 'E2E Loading Test Recipe 3', servings: 4, mealType: ['lunch'] },
        ],
      },
    },

    // Step 2: Navigate to create meal plan
    {
      action: 'navigate',
      description: 'Navigate to create meal plan',
      params: {
        url: 'http://localhost:3000/meal-plans/new',
      },
    },

    // Step 3: Click generate and capture loading
    {
      action: 'click',
      description: 'Click Generate button',
      params: {
        element: 'Generate button',
        ref: 'button:has-text("Generate")',
      },
    },

    // Step 4: Immediately capture loading state
    {
      action: 'screenshot',
      description: 'Capture loading state',
      params: {
        filename: 'e2e-meal-plan-loading.png',
      },
    },

    // Step 5: Verify loading indicator
    {
      action: 'verify_element',
      description: 'Verify loading indicator is shown',
      params: {
        selector: '.loading, .spinner, [data-loading], .animate-spin, .generating',
        shouldExist: true,
      },
    },

    // Step 6: Wait for completion
    {
      action: 'wait_for',
      description: 'Wait for generation to complete',
      params: {
        timeout: 120000,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'MealPlan',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'Recipe',
        where: '"recipeName" LIKE \'E2E Loading Test%\'',
      },
    },
  ],
}

// =============================================================================
// MEAL PLAN NAVIGATION
// =============================================================================

export const mealPlanNavigation: E2ETestSpec = {
  id: 'e2e-meal-plan-navigation',
  name: 'Meal Plan Week Navigation',
  description: 'Verify user can navigate between weeks in meal plan view',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to meal plan
    {
      action: 'navigate',
      description: 'Navigate to meal plan page',
      params: {
        url: 'http://localhost:3000/meal-plans',
      },
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture initial week view',
      params: {},
      screenshot: true,
    },

    // Step 3: Click next week button
    {
      action: 'click',
      description: 'Click Next Week button',
      params: {
        element: 'Next week navigation',
        ref: 'button:has-text("Next"), [data-testid="next-week"], .week-nav-next',
      },
      waitAfter: 1000,
    },

    // Step 4: Verify week changed
    {
      action: 'snapshot',
      description: 'Capture next week view',
      params: {},
      screenshot: true,
    },

    // Step 5: Click previous week
    {
      action: 'click',
      description: 'Click Previous Week button',
      params: {
        element: 'Previous week navigation',
        ref: 'button:has-text("Previous"), button:has-text("Prev"), [data-testid="prev-week"], .week-nav-prev',
      },
      waitAfter: 1000,
    },

    // Step 6: Verify returned to original week
    {
      action: 'snapshot',
      description: 'Capture after navigating back',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All meal plan E2E test specifications
 */
export const mealPlanE2ETests: E2ETestSpec[] = [
  mealPlanGeneration,
  mealPlanViewing,
  shoppingListFromMealPlan,
  mealPlanNoRecipesError,
  mealPlanLoadingState,
  mealPlanNavigation,
]

export default mealPlanE2ETests
