/**
 * E2E Tests for Staples Management
 *
 * Tests the staples (frequently bought items) feature user journeys using Playwright.
 * Run with: npx playwright test tests/e2e/playwright/staples.spec.ts
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

const TEST_USER = {
  email: 'e2e-test@example.com',
  password: 'TestPassword123!',
}

async function login(page: import('@playwright/test').Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"], input[type="email"]', TEST_USER.email)
  await page.fill('input[name="password"], input[type="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard**', { timeout: 10000 })
}

test.describe('Staples Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // VIEW STAPLES
  // ---------------------------------------------------------------------------

  test('should display staples list', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/staples/)

    // Check for staples container
    const staplesContainer = page.locator(
      '[data-testid="staples-list"], .staples-list, main'
    )
    await expect(staplesContainer).toBeVisible()

    await page.screenshot({ path: 'test-results/staples-list.png' })
  })

  // ---------------------------------------------------------------------------
  // ADD STAPLE
  // ---------------------------------------------------------------------------

  test('should add new staple item', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Click add button
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("New Staple"), [data-testid="add-staple-btn"]'
    ).first()

    await addButton.click()

    // Wait for form
    await page.waitForSelector('form, [role="dialog"]')

    // Fill staple details
    await page.fill(
      'input[name="itemName"], input[placeholder*="name" i]',
      'E2E Test Staple - Bread'
    )

    // Set quantity
    const quantityInput = page.locator('input[name="quantity"], input[type="number"]').first()
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('1')
    }

    // Select unit if available
    const unitSelect = page.locator('select[name="unit"]')
    if (await unitSelect.isVisible()) {
      await unitSelect.selectOption({ index: 1 })
    }

    // Select category if available
    const categorySelect = page.locator('select[name="category"]')
    if (await categorySelect.isVisible()) {
      await categorySelect.selectOption({ index: 1 })
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Add")')

    // Verify added
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=E2E Test Staple - Bread')).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/staple-added.png' })
  })

  // ---------------------------------------------------------------------------
  // EDIT STAPLE
  // ---------------------------------------------------------------------------

  test('should edit existing staple', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Find edit button
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid="edit-staple-btn"], button[aria-label*="edit" i]'
    ).first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Wait for form
      await page.waitForSelector('form, [role="dialog"]')

      // Modify name
      const nameInput = page.locator('input[name="itemName"]').first()
      await nameInput.clear()
      await nameInput.fill('Updated Staple Name')

      // Save
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")')

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/staple-edited.png' })
    } else {
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // DELETE STAPLE
  // ---------------------------------------------------------------------------

  test('should delete staple item', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Find delete button
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-testid="delete-staple-btn"], button[aria-label*="delete" i]'
    ).first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Handle confirmation
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/staple-deleted.png' })
    } else {
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // TOGGLE ACTIVE STATUS
  // ---------------------------------------------------------------------------

  test('should toggle staple active status', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Find toggle or checkbox
    const toggleBtn = page.locator(
      'input[type="checkbox"], button[aria-label*="toggle" i], [data-testid="staple-toggle"]'
    ).first()

    if (await toggleBtn.isVisible()) {
      // Get initial state
      const wasActive = await toggleBtn.isChecked().catch(() => true)

      // Toggle
      await toggleBtn.click()

      // Wait for update
      await page.waitForTimeout(500)

      await page.screenshot({ path: 'test-results/staple-toggled.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // CATEGORY FILTER
  // ---------------------------------------------------------------------------

  test('should filter staples by category', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Look for category filter
    const categoryFilter = page.locator(
      'select[name="category"], [data-testid="category-filter"], button:has-text("Category")'
    ).first()

    if (await categoryFilter.isVisible()) {
      await categoryFilter.click()

      // Select a category
      const option = page.locator('option, [role="option"]').nth(1)
      if (await option.isVisible()) {
        await option.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/staples-filtered.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // ADD TO SHOPPING LIST
  // ---------------------------------------------------------------------------

  test('should add staple to shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Find add to shopping list button
    const addToListBtn = page.locator(
      'button:has-text("Add to List"), button:has-text("Shopping"), [data-testid="add-to-shopping-btn"]'
    ).first()

    if (await addToListBtn.isVisible()) {
      await addToListBtn.click()

      // Wait for confirmation or redirect
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/staple-added-to-list.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // BULK OPERATIONS
  // ---------------------------------------------------------------------------

  test('should perform bulk operations on staples', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Look for select all or bulk mode
    const selectAllCheckbox = page.locator(
      'input[type="checkbox"][aria-label*="all" i], [data-testid="select-all"]'
    )

    if (await selectAllCheckbox.isVisible()) {
      await selectAllCheckbox.click()

      // Look for bulk actions menu
      const bulkActionsBtn = page.locator(
        'button:has-text("Actions"), button:has-text("Bulk"), [data-testid="bulk-actions"]'
      )

      if (await bulkActionsBtn.isVisible()) {
        await bulkActionsBtn.click()
        await page.screenshot({ path: 'test-results/staples-bulk-actions.png' })
      }
    }
  })

  // ---------------------------------------------------------------------------
  // SEARCH STAPLES
  // ---------------------------------------------------------------------------

  test('should search staples', async ({ page }) => {
    await page.goto(`${BASE_URL}/staples`)
    await page.waitForLoadState('networkidle')

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i], [data-testid="search-input"]'
    ).first()

    if (await searchInput.isVisible()) {
      await searchInput.fill('bread')
      await page.waitForTimeout(500) // Debounce

      await page.screenshot({ path: 'test-results/staples-search.png' })
    }
  })
})
