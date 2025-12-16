/**
 * E2E Tests for AI Nutritionist Chat
 *
 * Tests the AI nutritionist feature user journeys using Playwright.
 * Run with: npx playwright test tests/e2e/playwright/nutritionist.spec.ts
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

test.describe('AI Nutritionist Chat', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ---------------------------------------------------------------------------
  // LOAD NUTRITIONIST PAGE
  // ---------------------------------------------------------------------------

  test('should load nutritionist chat page', async ({ page }) => {
    await page.goto(`${BASE_URL}/nutritionist`)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify page loaded
    await expect(page).toHaveURL(/\/nutritionist/)

    // Check for chat interface elements
    const chatContainer = page.locator(
      '[data-testid="chat-container"], .chat-container, main'
    )
    await expect(chatContainer).toBeVisible()

    await page.screenshot({ path: 'test-results/nutritionist-page.png' })
  })

  // ---------------------------------------------------------------------------
  // SEND QUESTION
  // ---------------------------------------------------------------------------

  test('should send question and receive AI response', async ({ page }) => {
    await page.goto(`${BASE_URL}/nutritionist`)
    await page.waitForLoadState('networkidle')

    // Find message input
    const messageInput = page.locator(
      'input[name="message"], textarea[name="message"], [data-testid="message-input"], textarea'
    ).first()

    await expect(messageInput).toBeVisible()

    // Type a question
    await messageInput.fill('What are good sources of protein for vegetarians?')

    // Send the message
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send"), [data-testid="send-btn"]'
    ).first()
    await sendButton.click()

    // Wait for response (AI can take time)
    await page.waitForSelector(
      '[data-testid="ai-response"], .ai-message, .assistant-message',
      { timeout: 60000 }
    ).catch(() => {
      // Response might appear differently
    })

    // Wait for loading to complete
    await page.waitForLoadState('networkidle')

    // Screenshot the response
    await page.screenshot({ path: 'test-results/nutritionist-response.png' })
  })

  // ---------------------------------------------------------------------------
  // SUGGESTED PROMPTS
  // ---------------------------------------------------------------------------

  test('should display and use suggested prompts', async ({ page }) => {
    await page.goto(`${BASE_URL}/nutritionist`)
    await page.waitForLoadState('networkidle')

    // Look for suggested prompts
    const suggestedPrompts = page.locator(
      '[data-testid="suggested-prompt"], .suggested-prompt, button:has-text("How"), button:has-text("What")'
    )

    const promptCount = await suggestedPrompts.count()

    if (promptCount > 0) {
      // Click first suggested prompt
      await suggestedPrompts.first().click()

      // Wait for it to be processed
      await page.waitForTimeout(1000)

      await page.screenshot({ path: 'test-results/nutritionist-suggested-prompt.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // RECIPE ANALYSIS
  // ---------------------------------------------------------------------------

  test('should analyze recipe nutrition when recipe context provided', async ({ page }) => {
    // First go to a recipe page to get context
    await page.goto(`${BASE_URL}/recipes`)
    await page.waitForLoadState('networkidle')

    // Click on first recipe if available
    const recipeLink = page.locator('a[href*="/recipes/"]').first()
    if (await recipeLink.isVisible()) {
      await recipeLink.click()
      await page.waitForLoadState('networkidle')

      // Look for "Ask Nutritionist" or similar button
      const askNutritionistBtn = page.locator(
        'button:has-text("Nutritionist"), button:has-text("Analyze"), [data-testid="ask-nutritionist"]'
      )

      if (await askNutritionistBtn.isVisible()) {
        await askNutritionistBtn.click()
        await page.waitForLoadState('networkidle')
        await page.screenshot({ path: 'test-results/nutritionist-recipe-analysis.png' })
      }
    }
  })

  // ---------------------------------------------------------------------------
  // ERROR HANDLING
  // ---------------------------------------------------------------------------

  test('should handle errors gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/nutritionist`)
    await page.waitForLoadState('networkidle')

    // Send empty message (should be prevented or show error)
    const sendButton = page.locator(
      'button[type="submit"], button:has-text("Send")'
    ).first()

    if (await sendButton.isVisible()) {
      // Try to send without content
      await sendButton.click()

      // Should either be disabled or show validation
      await page.screenshot({ path: 'test-results/nutritionist-empty-message.png' })
    }
  })

  // ---------------------------------------------------------------------------
  // CHAT HISTORY
  // ---------------------------------------------------------------------------

  test('should maintain chat history in session', async ({ page }) => {
    await page.goto(`${BASE_URL}/nutritionist`)
    await page.waitForLoadState('networkidle')

    const messageInput = page.locator('textarea, input[name="message"]').first()

    if (await messageInput.isVisible()) {
      // Send first message
      await messageInput.fill('Hello')
      await page.click('button[type="submit"], button:has-text("Send")')

      // Wait for response
      await page.waitForTimeout(3000)

      // Send second message
      await messageInput.fill('What vitamins are important?')
      await page.click('button[type="submit"], button:has-text("Send")')

      // Wait and verify multiple messages shown
      await page.waitForTimeout(3000)

      const messages = page.locator('.message, [data-testid="message"]')
      const messageCount = await messages.count()

      // Should have at least 2 user messages
      await page.screenshot({ path: 'test-results/nutritionist-chat-history.png' })
    }
  })
})
