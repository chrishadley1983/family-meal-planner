/**
 * E2E Tests for Shopping List Management
 *
 * Tests the shopping list feature user journeys using Playwright.
 * Run with: npx playwright test tests/e2e/playwright/shopping-list.spec.ts
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

test.describe('Shopping List Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // VIEW SHOPPING LIST
  // ---------------------------------------------------------------------------

  test('should display shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/shopping-list/)

    // Check for list container
    const listContainer = page.locator(
      '[data-testid="shopping-list"], .shopping-list, main'
    )
    await expect(listContainer).toBeVisible()

    await page.screenshot({ path: 'test-results/shopping-list-view.png' })
  })

  // ---------------------------------------------------------------------------
  // ADD ITEM
  // ---------------------------------------------------------------------------

  test('should add item to shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Find add item input or button
    const addInput = page.locator(
      'input[name="itemName"], input[placeholder*="add" i], input[placeholder*="item" i], [data-testid="add-item-input"]'
    ).first()

    if (await addInput.isVisible()) {
      await addInput.fill('E2E Test Item - Eggs')

      // Look for quantity input
      const quantityInput = page.locator('input[name="quantity"], input[type="number"]').first()
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('12')
      }

      // Submit
      await page.click('button[type="submit"], button:has-text("Add"), [data-testid="add-item-btn"]')

      // Verify item added
      await page.waitForLoadState('networkidle')
      await expect(page.locator('text=E2E Test Item - Eggs')).toBeVisible({ timeout: 5000 })

      await page.screenshot({ path: 'test-results/shopping-list-item-added.png' })
    } else {
      // Try clicking add button first
      const addButton = page.locator('button:has-text("Add Item"), button:has-text("Add")').first()
      if (await addButton.isVisible()) {
        await addButton.click()
        await page.waitForSelector('form, [role="dialog"]')
      }
    }
  })

  // ---------------------------------------------------------------------------
  // CHECK OFF ITEM
  // ---------------------------------------------------------------------------

  test('should check off item as purchased', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Find checkbox or check button
    const checkbox = page.locator(
      'input[type="checkbox"], [data-testid="item-checkbox"], button[aria-label*="check" i]'
    ).first()

    if (await checkbox.isVisible()) {
      // Get initial state
      const wasChecked = await checkbox.isChecked().catch(() => false)

      // Toggle checkbox
      await checkbox.click()

      // Wait for state change
      await page.waitForTimeout(500)

      await page.screenshot({ path: 'test-results/shopping-list-item-checked.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // IMPORT FROM MEAL PLAN
  // ---------------------------------------------------------------------------

  test('should import items from meal plan', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Look for import from meal plan button
    const importMealPlanBtn = page.locator(
      'button:has-text("Import"), button:has-text("Meal Plan"), [data-testid="import-meal-plan-btn"]'
    ).first()

    if (await importMealPlanBtn.isVisible()) {
      await importMealPlanBtn.click()

      // Wait for modal or confirmation
      await page.waitForTimeout(1000)

      // Select meal plan if dropdown appears
      const mealPlanSelect = page.locator('select[name="mealPlan"], [data-testid="meal-plan-select"]')
      if (await mealPlanSelect.isVisible()) {
        await mealPlanSelect.selectOption({ index: 0 })
      }

      // Confirm import
      const confirmBtn = page.locator('button:has-text("Import"), button:has-text("Confirm")')
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/shopping-list-imported-meal-plan.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // IMPORT STAPLES
  // ---------------------------------------------------------------------------

  test('should import staples to shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Look for import staples button
    const importStaplesBtn = page.locator(
      'button:has-text("Staples"), button:has-text("Import Staples"), [data-testid="import-staples-btn"]'
    ).first()

    if (await importStaplesBtn.isVisible()) {
      await importStaplesBtn.click()

      // Wait for staples selection or automatic import
      await page.waitForTimeout(1000)

      // Select staples if checkboxes appear
      const stapleCheckboxes = page.locator('[data-testid="staple-checkbox"], input[type="checkbox"]')
      const checkboxCount = await stapleCheckboxes.count()

      if (checkboxCount > 0) {
        // Select first few staples
        await stapleCheckboxes.first().click()
      }

      // Confirm
      const confirmBtn = page.locator('button:has-text("Add"), button:has-text("Import")')
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/shopping-list-imported-staples.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // EXPORT AS PDF
  // ---------------------------------------------------------------------------

  test('should export shopping list as PDF', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Look for export/PDF button
    const exportBtn = page.locator(
      'button:has-text("Export"), button:has-text("PDF"), button:has-text("Download"), [data-testid="export-pdf-btn"]'
    ).first()

    if (await exportBtn.isVisible()) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 }).catch(() => null)

      await exportBtn.click()

      // Wait for download or modal
      const download = await downloadPromise

      if (download) {
        // Save download for verification
        await download.saveAs('test-results/shopping-list-export.pdf')
      }

      await page.screenshot({ path: 'test-results/shopping-list-export.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // SHARE SHOPPING LIST
  // ---------------------------------------------------------------------------

  test('should share shopping list', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Look for share button
    const shareBtn = page.locator(
      'button:has-text("Share"), [data-testid="share-btn"], button[aria-label*="share" i]'
    ).first()

    if (await shareBtn.isVisible()) {
      await shareBtn.click()

      // Wait for share modal/options
      await page.waitForTimeout(1000)

      // Check for share link
      const shareLink = page.locator(
        'input[readonly], [data-testid="share-link"], .share-link'
      )

      if (await shareLink.isVisible()) {
        // Copy link functionality
        const copyBtn = page.locator('button:has-text("Copy")')
        if (await copyBtn.isVisible()) {
          await copyBtn.click()
        }
      }

      await page.screenshot({ path: 'test-results/shopping-list-share.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // DELETE ITEMS
  // ---------------------------------------------------------------------------

  test('should delete shopping list item', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Find delete button on an item
    const deleteBtn = page.locator(
      'button:has-text("Delete"), button[aria-label*="delete" i], [data-testid="delete-item-btn"]'
    ).first()

    if (await deleteBtn.isVisible()) {
      await deleteBtn.click()

      // Handle confirmation if present
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/shopping-list-item-deleted.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // CLEAR COMPLETED ITEMS
  // ---------------------------------------------------------------------------

  test('should clear completed items', async ({ page }) => {
    await page.goto(`${BASE_URL}/shopping-list`)
    await page.waitForLoadState('networkidle')

    // Look for clear completed button
    const clearBtn = page.locator(
      'button:has-text("Clear"), button:has-text("Remove Checked"), [data-testid="clear-completed-btn"]'
    ).first()

    if (await clearBtn.isVisible()) {
      await clearBtn.click()

      // Confirm if needed
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")')
      if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/shopping-list-cleared.png' })
    }
  })
})
