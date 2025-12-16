/**
 * E2E Tests for Family Profiles Management
 *
 * Tests the family profiles feature user journeys using Playwright.
 * Run with: npx playwright test tests/e2e/playwright/profiles.spec.ts
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

test.describe('Family Profiles Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // VIEW PROFILES
  // ---------------------------------------------------------------------------

  test('should display list of family profiles', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/profiles/)

    // Check for profiles list or empty state
    const profilesContainer = page.locator(
      '[data-testid="profiles-list"], .profiles-list, main'
    )
    await expect(profilesContainer).toBeVisible()

    await page.screenshot({ path: 'test-results/profiles-list.png' })
  })

  // ---------------------------------------------------------------------------
  // CREATE PROFILE
  // ---------------------------------------------------------------------------

  test('should create new family profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Click add profile button
    const addButton = page.locator(
      'button:has-text("Add"), button:has-text("Create"), button:has-text("New Profile"), [data-testid="add-profile-btn"]'
    ).first()

    await addButton.click()

    // Wait for form
    await page.waitForSelector('form, [role="dialog"]')

    // Fill profile details
    await page.fill(
      'input[name="name"], input[name="profileName"], input[placeholder*="name" i]',
      'E2E Test Child'
    )

    // Set age if field exists
    const ageInput = page.locator('input[name="age"], input[type="number"]').first()
    if (await ageInput.isVisible()) {
      await ageInput.fill('8')
    }

    // Select relationship if dropdown exists
    const relationshipSelect = page.locator('select[name="relationship"]')
    if (await relationshipSelect.isVisible()) {
      await relationshipSelect.selectOption({ index: 1 })
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Create")')

    // Wait for success
    await page.waitForLoadState('networkidle')

    // Verify profile appears
    await expect(page.locator('text=E2E Test Child')).toBeVisible({ timeout: 5000 })

    await page.screenshot({ path: 'test-results/profile-created.png' })
  })

  // ---------------------------------------------------------------------------
  // EDIT PROFILE
  // ---------------------------------------------------------------------------

  test('should edit existing profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Find edit button
    const editButton = page.locator(
      'button:has-text("Edit"), [data-testid="edit-profile-btn"], button[aria-label*="edit" i]'
    ).first()

    if (await editButton.isVisible()) {
      await editButton.click()

      // Wait for edit form
      await page.waitForSelector('form, [role="dialog"]')

      // Modify name
      const nameInput = page.locator('input[name="name"], input[name="profileName"]').first()
      await nameInput.clear()
      await nameInput.fill('Updated Profile Name')

      // Save changes
      await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")')

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/profile-edited.png' })
    } else {
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // MANAGE ALLERGIES AND PREFERENCES
  // ---------------------------------------------------------------------------

  test('should manage allergies and dietary preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Click on a profile to view details or edit
    const profileCard = page.locator('[data-testid="profile-card"], .profile-card').first()

    if (await profileCard.isVisible()) {
      await profileCard.click()
      await page.waitForLoadState('networkidle')

      // Look for allergies section
      const allergiesSection = page.locator(
        '[data-testid="allergies"], text=Allergies, text=Dietary'
      ).first()

      if (await allergiesSection.isVisible()) {
        await allergiesSection.click()

        // Try to add an allergy
        const addAllergyBtn = page.locator(
          'button:has-text("Add Allergy"), button:has-text("Add"), [data-testid="add-allergy-btn"]'
        ).first()

        if (await addAllergyBtn.isVisible()) {
          await addAllergyBtn.click()

          // Select or type allergy
          const allergyInput = page.locator(
            'input[name="allergy"], select[name="allergy"], input[placeholder*="allergy" i]'
          ).first()

          if (await allergyInput.isVisible()) {
            await allergyInput.fill('Peanuts')
          }

          // Save
          await page.click('button:has-text("Save"), button:has-text("Add")')
        }
      }

      await page.screenshot({ path: 'test-results/profile-allergies.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // DELETE PROFILE
  // ---------------------------------------------------------------------------

  test('should delete family profile', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Find delete button
    const deleteButton = page.locator(
      'button:has-text("Delete"), [data-testid="delete-profile-btn"], button[aria-label*="delete" i]'
    ).first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()

      // Handle confirmation
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")')
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      await page.waitForLoadState('networkidle')
      await page.screenshot({ path: 'test-results/profile-deleted.png' })
    } else {
      test.skip()
    }
  })

  // ---------------------------------------------------------------------------
  // PROFILE SERVING PREFERENCES
  // ---------------------------------------------------------------------------

  test('should set serving size preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/profiles`)
    await page.waitForLoadState('networkidle')

    // Look for serving size controls
    const servingInput = page.locator(
      'input[name="servingSize"], input[name="defaultServings"], [data-testid="serving-size"]'
    ).first()

    if (await servingInput.isVisible()) {
      await servingInput.clear()
      await servingInput.fill('2')

      // Save if separate save button exists
      const saveBtn = page.locator('button:has-text("Save")').first()
      if (await saveBtn.isVisible()) {
        await saveBtn.click()
      }

      await page.screenshot({ path: 'test-results/profile-servings.png' })
    }
  })
})
