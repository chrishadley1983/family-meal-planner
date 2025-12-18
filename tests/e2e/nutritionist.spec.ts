/**
 * E2E Test Specifications for AI Nutritionist
 *
 * Tests the AI nutritionist chat functionality:
 * - Viewing nutritionist chat
 * - Sending nutrition questions
 * - Receiving AI responses
 * - Applying suggested actions
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from './types'

// =============================================================================
// NUTRITIONIST CHAT LOADING
// =============================================================================

export const nutritionistChatLoading: E2ETestSpec = {
  id: 'e2e-nutritionist-load',
  name: 'Nutritionist Chat Loading',
  description: 'Verify nutritionist chat interface loads correctly',
  priority: 'high',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to nutritionist page
    {
      action: 'navigate',
      description: 'Navigate to nutritionist chat',
      params: {
        url: 'http://localhost:3000/nutritionist',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/nutritionist' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture nutritionist page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Verify chat interface exists
    {
      action: 'verify_element',
      description: 'Verify chat container is present',
      params: {
        selector: '.chat-container, .nutritionist-chat, [data-testid="chat-interface"]',
        shouldExist: true,
      },
    },

    // Step 4: Verify input field exists
    {
      action: 'verify_element',
      description: 'Verify message input exists',
      params: {
        selector: 'textarea, input[type="text"], [data-testid="chat-input"]',
        shouldExist: true,
      },
    },

    // Step 5: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// SEND NUTRITION QUESTION
// =============================================================================

export const sendNutritionQuestion: E2ETestSpec = {
  id: 'e2e-nutritionist-question',
  name: 'Send Nutrition Question',
  description: 'Verify user can send a question and receive AI response',
  priority: 'high',
  requiresAuth: true,
  timeout: 120,

  steps: [
    // Step 1: Navigate to nutritionist page
    {
      action: 'navigate',
      description: 'Navigate to nutritionist chat',
      params: {
        url: 'http://localhost:3000/nutritionist',
      },
    },

    // Step 2: Type a question
    {
      action: 'type',
      description: 'Type nutrition question',
      params: {
        element: 'Chat input',
        ref: 'textarea, input[type="text"]:not([type="hidden"]), [data-testid="chat-input"]',
        text: 'What are some good high-protein breakfast options?',
      },
    },

    // Step 3: Take screenshot with typed question
    {
      action: 'screenshot',
      description: 'Capture question before sending',
      params: {
        filename: 'e2e-nutritionist-question-typed.png',
      },
    },

    // Step 4: Click send button
    {
      action: 'click',
      description: 'Click send button',
      params: {
        element: 'Send button',
        ref: 'button[type="submit"], button:has-text("Send"), [data-testid="send-message"]',
      },
      waitAfter: 5000,
    },

    // Step 5: Wait for AI response
    {
      action: 'wait_for',
      description: 'Wait for AI response',
      params: {
        timeout: 60000, // AI can take up to 60 seconds
      },
    },

    // Step 6: Verify response appears
    {
      action: 'snapshot',
      description: 'Capture AI response',
      params: {},
      screenshot: true,
    },

    // Step 7: Verify response container
    {
      action: 'verify_element',
      description: 'Verify AI response is displayed',
      params: {
        selector: '.ai-response, .message-ai, [data-testid="ai-message"], .assistant-message',
        shouldExist: true,
      },
    },

    // Step 8: Check for errors
    {
      action: 'check_console_errors',
      description: 'Verify no errors during AI response',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// SUGGESTED PROMPTS
// =============================================================================

export const suggestedPrompts: E2ETestSpec = {
  id: 'e2e-nutritionist-suggested',
  name: 'Suggested Prompts',
  description: 'Verify suggested prompts are displayed and clickable',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to nutritionist page
    {
      action: 'navigate',
      description: 'Navigate to nutritionist chat',
      params: {
        url: 'http://localhost:3000/nutritionist',
      },
    },

    // Step 2: Wait for page to load
    {
      action: 'wait_for',
      description: 'Wait for page to fully load',
      params: {
        timeout: 5000,
      },
    },

    // Step 3: Capture initial state
    {
      action: 'snapshot',
      description: 'Capture suggested prompts',
      params: {},
      screenshot: true,
    },

    // Step 4: Verify suggested prompts exist
    {
      action: 'verify_element',
      description: 'Verify suggested prompt buttons exist',
      params: {
        selector: '.suggested-prompt, [data-testid="suggested-prompt"], button.prompt-suggestion',
        shouldExist: true,
      },
    },

    // Step 5: Click a suggested prompt
    {
      action: 'click',
      description: 'Click a suggested prompt',
      params: {
        element: 'First suggested prompt',
        ref: '.suggested-prompt:first-of-type, [data-testid="suggested-prompt"]:first-of-type',
      },
      waitAfter: 2000,
    },

    // Step 6: Verify prompt fills input or sends message
    {
      action: 'snapshot',
      description: 'Capture state after clicking prompt',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [],
}

// =============================================================================
// RECIPE ANALYSIS
// =============================================================================

export const recipeNutritionAnalysis: E2ETestSpec = {
  id: 'e2e-nutritionist-recipe-analysis',
  name: 'Recipe Nutrition Analysis',
  description: 'Verify nutritionist can analyze a specific recipe',
  priority: 'high',
  requiresAuth: true,
  timeout: 120,

  steps: [
    // Step 1: Seed a test recipe
    {
      action: 'seed_data',
      description: 'Seed test recipe for analysis',
      params: {
        table: 'Recipe',
        records: [
          {
            recipeName: 'E2E Test High Protein Meal',
            servings: 4,
            caloriesPerServing: 500,
            proteinPerServing: 40,
            carbsPerServing: 30,
            fatPerServing: 20,
          },
        ],
      },
    },

    // Step 2: Navigate to nutritionist with recipe context
    {
      action: 'navigate',
      description: 'Navigate to nutritionist chat',
      params: {
        url: 'http://localhost:3000/nutritionist',
      },
    },

    // Step 3: Ask about the recipe
    {
      action: 'type',
      description: 'Ask about recipe nutrition',
      params: {
        element: 'Chat input',
        ref: 'textarea, input[type="text"], [data-testid="chat-input"]',
        text: 'Can you analyze my "E2E Test High Protein Meal" recipe and suggest improvements?',
      },
    },

    // Step 4: Send message
    {
      action: 'click',
      description: 'Send message',
      params: {
        element: 'Send button',
        ref: 'button[type="submit"], button:has-text("Send")',
      },
      waitAfter: 5000,
    },

    // Step 5: Wait for analysis
    {
      action: 'wait_for',
      description: 'Wait for recipe analysis',
      params: {
        timeout: 90000,
      },
    },

    // Step 6: Capture response
    {
      action: 'screenshot',
      description: 'Capture recipe analysis response',
      params: {
        filename: 'e2e-nutritionist-recipe-analysis.png',
      },
    },
  ],

  cleanup: [
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
// ERROR HANDLING
// =============================================================================

export const nutritionistErrorHandling: E2ETestSpec = {
  id: 'e2e-nutritionist-error',
  name: 'Nutritionist Error Handling',
  description: 'Verify graceful error handling when AI fails',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to nutritionist
    {
      action: 'navigate',
      description: 'Navigate to nutritionist chat',
      params: {
        url: 'http://localhost:3000/nutritionist',
      },
    },

    // Step 2: Send empty message (should be prevented)
    {
      action: 'click',
      description: 'Try to send without message',
      params: {
        element: 'Send button',
        ref: 'button[type="submit"], button:has-text("Send")',
      },
      waitAfter: 1000,
    },

    // Step 3: Verify input validation
    {
      action: 'snapshot',
      description: 'Capture validation state',
      params: {},
      screenshot: true,
    },

    // Step 4: Verify no error state (empty message should be prevented)
    {
      action: 'check_console_errors',
      description: 'Check for any JavaScript errors',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All nutritionist E2E test specifications
 */
export const nutritionistE2ETests: E2ETestSpec[] = [
  nutritionistChatLoading,
  sendNutritionQuestion,
  suggestedPrompts,
  recipeNutritionAnalysis,
  nutritionistErrorHandling,
]

export default nutritionistE2ETests
