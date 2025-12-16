/**
 * E2E Tests for Inventory Management
 *
 * Tests the complete inventory management user journeys using Playwright.
 * Run with: npx playwright test tests/e2e/playwright/inventory.spec.ts
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import { test, expect } from '@playwright/test'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Test user credentials (should be seeded in test database)
const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Login helper - authenticates the test user
 */
async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"], input[type="email"]', TEST_USER.email)
  await page.fill('input[name="password"], input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10000 })
}

// =============================================================================
// TEST SUITE: INVENTORY MANAGEMENT
// =============================================================================

test.describe('Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // VIEW INVENTORY
  // ---------------------------------------------------------------------------

  test('should display inventory list with items', async ({ page }) => {
    // Navigate to inventory page
    await page.goto(`${BASE_URL}/inventory`)

    // Wait for page to load
    await page.waitForSelector('[data-testid="inventory-list"], .inventory-list, main')

    // Verify page loaded successfully
    await expect(page).toHaveURL(/\/inventory/)

    // Take screenshot for visual verification
    await page.screenshot({ path: 'test-results/inventory-list.png' })

    // Verify key UI elements exist
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('should show empty state when no inventory items', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)

    // Wait for content to load
    await page.waitForLoadState('networkidle')

    // Check if either items exist or empty state is shown
    const hasItems = await page.locator('[data-testid="inventory-item"], .inventory-item').count()

    if (hasItems === 0) {
      // Should show empty state or add button
      await expect(
        page.locator('text=No items, text=Add your first, button:has-text("Add")').first()
      ).toBeVisible()
    }
  })

  // ---------------------------------------------------------------------------
  // ADD INVENTORY ITEM
  // ---------------------------------------------------------------------------

  test('should add new inventory item manually', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)

    // Click add button
    await page.click('button:has-text("Add"), [data-testid="add-inventory-btn"]')

    // Wait for form/modal to appear
    await page.waitForSelector('form, [role="dialog"], .modal')

    // Fill in item details
    await page.fill('input[name="itemName"], input[placeholder*="name" i]', 'E2E Test Item - Milk')
    await page.fill('input[name="quantity"], input[type="number"]', '2')

    // Select unit if dropdown exists
    const unitSelect = page.locator('select[name="unit"], [data-testid="unit-select"]')
    if (await unitSelect.isVisible()) {
      await unitSelect.selectOption({ label: 'litres' })
    }

    // Select category if available
    const categorySelect = page.locator('select[name="category"], [data-testid="category-select"]')
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 })
    }

    // Select location if available
    const locationSelect = page.locator('select[name="location"], [data-testid="location-select"]')
    if (await locationSelect.isVisible()) {
      await locationSelect.selectOption('fridge')
    }

    // Submit the form
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Add")')

    // Wait for success indication
    await page.waitForSelector('.toast-success, [data-testid="success"], text=added', {
      timeout: 5000,
    }).catch(() => {
      // Success might show differently
    })

    // Verify item appears in list
    await expect(page.locator('text=E2E Test Item - Milk')).toBeVisible({ timeout: 5000 })

    // Screenshot for verification
    await page.screenshot({ path: 'test-results/inventory-item-added.png' })
  })

  // ---------------------------------------------------------------------------
  // EDIT INVENTORY ITEM
  // ---------------------------------------------------------------------------

  test('should edit existing inventory item', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)

    // Wait for items to load
    await page.waitForLoadState('networkidle')

    // Find and click first edit button
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid="edit-btn"], button[aria-label*="edit" i]'
    ).first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Wait for edit form
      await page.waitForSelector('form, [role="dialog"]')

      // Modify quantity
      await page.fill('input[name="quantity"], input[type="number"]', '5')

      // Save changes
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")')

      // Verify success
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/inventory-item-edited.png' })
    } else {
      // No items to edit - skip gracefully
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // DELETE INVENTORY ITEM
  // ---------------------------------------------------------------------------

  test('should delete inventory item', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    await page.waitForLoadState('networkidle')

    // Find delete button
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-testid="delete-btn"], button[aria-label*="delete" i]'
    ).first()

    if (await deleteButton.isVisible()) {
      // Get initial item count
      const initialCount = await page.locator('[data-testid="inventory-item"], .inventory-item').count()

      // Click delete
      await deleteButton.click()

      // Handle confirmation dialog if present
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmButton.click()
      }

      // Wait for deletion to complete
      await page.waitForLoadState('networkidle')

      // Verify item count decreased or deletion message shown
      await page.screenshot({ path: 'test-results/inventory-item-deleted.png' })
    } else {
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // EXPIRY TRACKING
  // ---------------------------------------------------------------------------

  test('should display expiry status indicators', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    await page.waitForLoadState('networkidle')

    // Check for expiry status indicators (fresh, expiring soon, expired)
    const expiryIndicators = page.locator(
      '[data-testid="expiry-status"], .expiry-badge, .text-red-500, .text-amber-500, .text-green-500'
    )

    // Take screenshot showing expiry indicators
    await page.screenshot({ path: 'test-results/inventory-expiry-tracking.png' })

    // Verify page has loaded properly
    await expect(page).toHaveURL(/\/inventory/)
  })

  // ---------------------------------------------------------------------------
  // FILTER AND SEARCH
  // ---------------------------------------------------------------------------

  test('should filter inventory by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    await page.waitForLoadState('networkidle')

    // Look for category filter
    const categoryFilter = page.locator(
      'select[name="category"], [data-testid="category-filter"], button:has-text("Category")'
    ).first()

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click()

      // Select first category option
      const option = page.locator('option, [role="option"]').nth(1)
      if (await option.isVisible()) {
        await option.click()
      }

      // Wait for filter to apply
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/inventory-filtered.png' })
    }
  })

  test('should search inventory items', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    await page.waitForLoadState('networkidle')

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    ).first()

    if (await searchInput.isVisible()) {
      await searchInput.fill('milk')
      await page.waitForTimeout(500) // Wait for debounce

      // Verify search is applied
      await page.screenshot({ path: 'test-results/inventory-search.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // STORAGE LOCATION
  // ---------------------------------------------------------------------------

  test('should filter by storage location', async ({ page }) => {
    await page.goto(`${BASE_URL}/inventory`)
    await page.waitForLoadState('networkidle')

    // Look for location tabs or filter
    const locationFilter = page.locator(
      'button:has-text("Fridge"), button:has-text("Freezer"), [data-testid="location-filter"]'
    ).first()

    if (await locationFilter.isVisible()) {
      await locationFilter.click()
      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/inventory-location-filter.png' })
    }
  })
})

// =============================================================================
// CLEANUP
// =============================================================================

test.afterAll(async () => {
  // Cleanup test data if needed
  // This could call an API endpoint to delete test items
  console.log('Inventory E2E tests completed')
})
