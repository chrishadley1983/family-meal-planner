/**
 * E2E Test Specifications Index
 *
 * This file exports all E2E test specifications for the project.
 * The Test Execution Agent imports these specifications to run E2E tests.
 *
 * Usage:
 * - Import specific test suites: import { authE2ETests } from './tests/e2e'
 * - Import all tests: import { allE2ETests } from './tests/e2e'
 */

// Import all E2E test specifications
import { authE2ETests } from './auth.spec'
import { recipeImportE2ETests } from './recipe-import.spec'
import { mealPlanE2ETests } from './meal-plan.spec'
import { inventoryE2ETests } from './inventory.spec'
import { nutritionistE2ETests } from './nutritionist.spec'
import { profilesE2ETests } from './profiles.spec'
import { shoppingListE2ETests } from './shopping-list.spec'
import { staplesE2ETests } from './staples.spec'

// Import types
import type { E2ETestSpec } from './types'

// =============================================================================
// EXPORT INDIVIDUAL TEST SUITES
// =============================================================================

export { authE2ETests } from './auth.spec'
export { recipeImportE2ETests } from './recipe-import.spec'
export { mealPlanE2ETests } from './meal-plan.spec'
export { inventoryE2ETests } from './inventory.spec'
export { nutritionistE2ETests } from './nutritionist.spec'
export { profilesE2ETests } from './profiles.spec'
export { shoppingListE2ETests } from './shopping-list.spec'
export { staplesE2ETests } from './staples.spec'

// =============================================================================
// COMBINED EXPORTS
// =============================================================================

/**
 * All E2E test specifications combined
 */
export const allE2ETests: E2ETestSpec[] = [
  ...authE2ETests,
  ...recipeImportE2ETests,
  ...mealPlanE2ETests,
  ...inventoryE2ETests,
  ...nutritionistE2ETests,
  ...profilesE2ETests,
  ...shoppingListE2ETests,
  ...staplesE2ETests,
]

/**
 * Critical priority tests only
 */
export const criticalE2ETests: E2ETestSpec[] = allE2ETests.filter(
  (test) => test.priority === 'critical'
)

/**
 * High priority tests (includes critical)
 */
export const highPriorityE2ETests: E2ETestSpec[] = allE2ETests.filter(
  (test) => test.priority === 'critical' || test.priority === 'high'
)

/**
 * Tests by feature area
 */
export const e2eTestsByFeature = {
  auth: authE2ETests,
  recipeImport: recipeImportE2ETests,
  mealPlan: mealPlanE2ETests,
  inventory: inventoryE2ETests,
  nutritionist: nutritionistE2ETests,
  profiles: profilesE2ETests,
  shoppingList: shoppingListE2ETests,
  staples: staplesE2ETests,
} as const

// =============================================================================
// TEST COUNTS FOR REPORTING
// =============================================================================

/**
 * Summary of E2E test coverage
 */
export const e2eTestSummary = {
  total: allE2ETests.length,
  byPriority: {
    critical: allE2ETests.filter((t) => t.priority === 'critical').length,
    high: allE2ETests.filter((t) => t.priority === 'high').length,
    medium: allE2ETests.filter((t) => t.priority === 'medium').length,
    low: allE2ETests.filter((t) => t.priority === 'low').length,
  },
  byFeature: {
    auth: authE2ETests.length,
    recipeImport: recipeImportE2ETests.length,
    mealPlan: mealPlanE2ETests.length,
    inventory: inventoryE2ETests.length,
    nutritionist: nutritionistE2ETests.length,
    profiles: profilesE2ETests.length,
    shoppingList: shoppingListE2ETests.length,
    staples: staplesE2ETests.length,
  },
  requiresAuth: allE2ETests.filter((t) => t.requiresAuth).length,
  noAuthRequired: allE2ETests.filter((t) => !t.requiresAuth).length,
}

export default allE2ETests
