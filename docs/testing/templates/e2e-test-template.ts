/**
 * E2E Test Template (Playwright)
 *
 * Use this template when creating new E2E tests.
 * E2E tests verify complete user journeys using Playwright.
 *
 * Location: tests/e2e/playwright/<journey-name>.spec.ts
 *
 * Run tests:
 *   npx playwright test                              # All E2E tests
 *   npx playwright test tests/e2e/playwright/auth   # Specific file
 *   npx playwright test --ui                         # Interactive UI mode
 *   npx playwright test --debug                      # Debug mode
 *
 * IMPORTANT: App must be running on localhost:3000 before running E2E tests.
 * The playwright.config.ts is configured to auto-start the dev server.
 */

import { test, expect, type Page } from '@playwright/test'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

/**
 * Base URL for the application
 * Can be overridden via PLAYWRIGHT_BASE_URL environment variable
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

/**
 * Test user credentials
 * These should match seeded test data in the database
 */
const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
  name: 'E2E Test User',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Login helper - authenticates the test user
 * Use in beforeEach for tests requiring authentication
 */
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"], input[type="email"]', TEST_USER.email)
  await page.fill('input[name="password"], input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10000 })
}

/**
 * Logout helper
 */
async function logout(page: Page) {
  await page.click('button:has-text("Logout"), [data-testid="logout-btn"]')
  await page.waitForURL('**/login**', { timeout: 5000 })
}

/**
 * Wait for loading to complete
 */
async function waitForLoading(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout })
}

/**
 * Take screenshot with timestamp
 */
async function screenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  await page.screenshot({ path: `test-results/${name}-${timestamp}.png` })
}

// =============================================================================
// TEST SUITE: [Feature Name]
// =============================================================================

test.describe('[Feature Name]', () => {
  // ---------------------------------------------------------------------------
  // SETUP & TEARDOWN
  // ---------------------------------------------------------------------------

  test.beforeAll(async () => {
    // One-time setup before all tests in this file
    // Example: Seed test data
    // await seedTestData()
  })

  test.afterAll(async () => {
    // One-time cleanup after all tests
    // Example: Clean up test data
    // await cleanupTestData()
  })

  test.beforeEach(async ({ page }) => {
    // Setup before each test
    // Most tests need authentication
    await login(page)
  })

  test.afterEach(async ({ page }) => {
    // Cleanup after each test
    // Optional: logout, clear state, etc.
  })

  // ---------------------------------------------------------------------------
  // HAPPY PATH TESTS
  // ---------------------------------------------------------------------------

  test.describe('Happy Path', () => {
    test('should [expected behavior] when [action]', async ({ page }) => {
      // Arrange - Set up test preconditions
      await page.goto(`${BASE_URL}/[target-page]`)
      await waitForLoading(page)

      // Act - Perform the user action
      await page.fill('[data-testid="input-field"]', 'test value')
      await page.click('[data-testid="submit-btn"]')

      // Assert - Verify expected outcome
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
      await expect(page).toHaveURL(/\/expected-path/)

      // Optional: Screenshot for visual verification
      await screenshot(page, 'feature-success')
    })

    test('should display correct data after [action]', async ({ page }) => {
      // Navigate to target page
      await page.goto(`${BASE_URL}/[target-page]`)
      await waitForLoading(page)

      // Verify data is displayed correctly
      await expect(page.locator('[data-testid="data-container"]')).toBeVisible()
      await expect(page.locator('[data-testid="item-count"]')).toHaveText(/\d+/)
    })
  })

  // ---------------------------------------------------------------------------
  // FORM VALIDATION TESTS
  // ---------------------------------------------------------------------------

  test.describe('Form Validation', () => {
    test('should show error for empty required field', async ({ page }) => {
      await page.goto(`${BASE_URL}/[form-page]`)

      // Submit without filling required fields
      await page.click('[data-testid="submit-btn"]')

      // Verify validation error appears
      await expect(page.locator('.error, [role="alert"]')).toBeVisible()
    })

    test('should show error for invalid format', async ({ page }) => {
      await page.goto(`${BASE_URL}/[form-page]`)

      // Enter invalid data
      await page.fill('[data-testid="email-input"]', 'not-an-email')
      await page.click('[data-testid="submit-btn"]')

      // Verify validation error
      await expect(page.locator('text=valid email')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // ERROR HANDLING TESTS
  // ---------------------------------------------------------------------------

  test.describe('Error Handling', () => {
    test('should display error message when API fails', async ({ page }) => {
      // Mock API failure (if using route interception)
      // await page.route('**/api/endpoint', route => route.abort())

      await page.goto(`${BASE_URL}/[target-page]`)

      // Trigger action that calls API
      await page.click('[data-testid="action-btn"]')

      // Verify error handling
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    })

    test('should handle not found gracefully', async ({ page }) => {
      // Navigate to non-existent resource
      await page.goto(`${BASE_URL}/[resource]/non-existent-id`)

      // Verify 404 handling
      await expect(page.locator('text=not found')).toBeVisible()
    })
  })

  // ---------------------------------------------------------------------------
  // NAVIGATION TESTS
  // ---------------------------------------------------------------------------

  test.describe('Navigation', () => {
    test('should navigate to [destination] when clicking [element]', async ({ page }) => {
      await page.goto(`${BASE_URL}/[start-page]`)

      // Click navigation element
      await page.click('[data-testid="nav-link"]')

      // Verify navigation
      await expect(page).toHaveURL(/\/expected-destination/)
    })

    test('should redirect unauthenticated users to login', async ({ page, context }) => {
      // Clear cookies/storage to remove auth
      await context.clearCookies()

      // Try to access protected page
      await page.goto(`${BASE_URL}/[protected-page]`)

      // Verify redirect to login
      await expect(page).toHaveURL(/\/login/)
    })
  })

  // ---------------------------------------------------------------------------
  // CRUD OPERATION TESTS
  // ---------------------------------------------------------------------------

  test.describe('CRUD Operations', () => {
    test('should create new [resource]', async ({ page }) => {
      await page.goto(`${BASE_URL}/[resource]/new`)

      // Fill form
      await page.fill('[data-testid="name-input"]', 'E2E Test Resource')
      await page.fill('[data-testid="description-input"]', 'Created by E2E test')

      // Submit
      await page.click('[data-testid="submit-btn"]')

      // Verify creation
      await expect(page.locator('text=E2E Test Resource')).toBeVisible()
    })

    test('should update existing [resource]', async ({ page }) => {
      await page.goto(`${BASE_URL}/[resource]/[id]/edit`)

      // Modify field
      await page.fill('[data-testid="name-input"]', 'Updated Name')

      // Save
      await page.click('[data-testid="save-btn"]')

      // Verify update
      await expect(page.locator('text=Updated Name')).toBeVisible()
    })

    test('should delete [resource] with confirmation', async ({ page }) => {
      await page.goto(`${BASE_URL}/[resource]/[id]`)

      // Click delete
      await page.click('[data-testid="delete-btn"]')

      // Confirm in dialog
      await page.click('[data-testid="confirm-delete-btn"]')

      // Verify deletion
      await expect(page).toHaveURL(/\/[resource]$/)
    })
  })

  // ---------------------------------------------------------------------------
  // ACCESSIBILITY TESTS
  // ---------------------------------------------------------------------------

  test.describe('Accessibility', () => {
    test('should have no accessibility violations on main page', async ({ page }) => {
      await page.goto(`${BASE_URL}/[target-page]`)

      // Check for basic accessibility (keyboard navigation, focus)
      await page.keyboard.press('Tab')
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
      expect(focusedElement).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // RESPONSIVE TESTS
  // ---------------------------------------------------------------------------

  test.describe('Responsive Design', () => {
    test('should display mobile menu on small screens', async ({ page }) => {
      // Set viewport to mobile size
      await page.setViewportSize({ width: 375, height: 667 })

      await page.goto(`${BASE_URL}/[target-page]`)

      // Verify mobile-specific elements
      await expect(page.locator('[data-testid="mobile-menu-btn"]')).toBeVisible()
    })
  })
})

// =============================================================================
// EXAMPLE: Complete Authentication Test Suite
// =============================================================================

/*
test.describe('Authentication', () => {
  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      await page.fill('input[name="email"]', TEST_USER.email)
      await page.fill('input[name="password"]', TEST_USER.password)
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL(/\/dashboard/)
      await expect(page.locator(`text=${TEST_USER.name}`)).toBeVisible()
    })

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      await page.fill('input[name="email"]', TEST_USER.email)
      await page.fill('input[name="password"]', 'wrong-password')
      await page.click('button[type="submit"]')

      await expect(page.locator('text=Invalid')).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
    })

    test('should show validation error for empty email', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`)

      await page.fill('input[name="password"]', 'some-password')
      await page.click('button[type="submit"]')

      await expect(page.locator('input[name="email"]:invalid')).toBeVisible()
    })
  })

  test.describe('Registration', () => {
    test('should register new user', async ({ page }) => {
      const newUser = {
        email: `e2e-${Date.now()}@test.com`,
        password: 'SecurePass123!',
        name: 'New E2E User',
      }

      await page.goto(`${BASE_URL}/register`)

      await page.fill('input[name="email"]', newUser.email)
      await page.fill('input[name="password"]', newUser.password)
      await page.fill('input[name="name"]', newUser.name)
      await page.click('button[type="submit"]')

      await expect(page).toHaveURL(/\/dashboard/)
    })
  })

  test.describe('Logout', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await login(page)

      // Logout
      await page.click('[data-testid="logout-btn"]')

      // Verify logged out
      await expect(page).toHaveURL(/\/login/)
    })
  })
})
*/

// =============================================================================
// SELECTOR BEST PRACTICES
// =============================================================================

/*
SELECTOR PRIORITY (most to least preferred):

1. data-testid attributes (most stable)
   await page.click('[data-testid="submit-btn"]')

2. ARIA roles with accessible names
   await page.getByRole('button', { name: 'Submit' })
   await page.getByRole('textbox', { name: 'Email' })

3. Label associations
   await page.getByLabel('Email')
   await page.getByPlaceholder('Enter email')

4. Text content
   await page.getByText('Sign In')
   await page.click('button:has-text("Submit")')

5. CSS selectors (last resort)
   await page.click('.submit-button')
   await page.click('#submit-btn')

AVOID:
- Selectors based on styling classes that may change
- XPath selectors (fragile)
- Index-based selectors like nth-child

RECOMMENDED data-testid pattern:
- [feature]-[element]-[variant]
- Example: "login-submit-btn", "recipe-card-delete"
*/

// =============================================================================
// EXPORTS FOR TYPE CHECKING
// =============================================================================

export { login, logout, waitForLoading, screenshot, TEST_USER, BASE_URL }
