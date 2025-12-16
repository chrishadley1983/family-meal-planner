/**
 * E2E Test Specifications for Authentication
 *
 * Tests the complete authentication user journeys:
 * - User registration
 * - User login
 * - Session persistence
 * - Logout
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// USER REGISTRATION JOURNEY
// =============================================================================

export const userRegistrationJourney: E2ETestSpec = {
  id: 'e2e-auth-register',
  name: 'User Registration',
  description: 'Verify a new user can successfully register and is redirected to dashboard',
  priority: 'critical',
  requiresAuth: false,
  timeout: 90,

  steps: [
    // Step 1: Navigate to registration page
    {
      action: 'navigate',
      description: 'Navigate to registration page',
      params: {
        url: 'http://localhost:3000/auth/register',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/auth/register' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture registration page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Fill registration form
    {
      action: 'fill_form',
      description: 'Fill registration form with valid data',
      params: {
        fields: [
          {
            name: 'Email',
            type: 'textbox',
            ref: 'input[name="email"], input[type="email"]', // TODO: Verify actual selector via Playwright
            value: `e2e-test-${Date.now()}@test.com`,
          },
          {
            name: 'Password',
            type: 'textbox',
            ref: 'input[name="password"], input[type="password"]', // TODO: Verify actual selector
            value: 'TestPassword123!',
          },
        ],
      },
    },

    // Step 4: Submit registration form
    {
      action: 'click',
      description: 'Click Register button',
      params: {
        element: 'Register button',
        ref: 'button[type="submit"], button:has-text("Register"), button:has-text("Sign Up")', // TODO: Verify actual selector
      },
      waitAfter: 3000,
    },

    // Step 5: Wait for navigation
    {
      action: 'wait_for',
      description: 'Wait for redirect to dashboard or login',
      params: {
        timeout: 10000,
      },
    },

    // Step 6: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors during registration',
      params: {
        level: 'error',
      },
      assertions: [
        { type: 'equals', target: 'errorCount', expected: 0 },
      ],
    },

    // Step 7: Verify successful registration
    {
      action: 'snapshot',
      description: 'Capture state after registration',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'not_exists', target: '.error, [role="alert"][data-type="error"]' },
      ],
    },

    // Step 8: Verify user in database
    {
      action: 'verify_database',
      description: 'Verify user was created in database',
      params: {
        query: 'SELECT id, email FROM "User" WHERE email LIKE \'e2e-test-%@test.com\' ORDER BY "createdAt" DESC LIMIT 1',
        assertion: 'rowCount > 0',
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
// USER LOGIN JOURNEY
// =============================================================================

export const userLoginJourney: E2ETestSpec = {
  id: 'e2e-auth-login',
  name: 'User Login',
  description: 'Verify an existing user can login and access protected pages',
  priority: 'critical',
  requiresAuth: false,
  timeout: 60,

  steps: [
    // Step 1: Seed a test user
    {
      action: 'seed_data',
      description: 'Create test user for login',
      params: {
        table: 'User',
        records: [
          {
            email: 'e2e-login-test@test.com',
            passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4UQNlm5H1dXYlz6q', // "TestPassword123!"
          },
        ],
      },
    },

    // Step 2: Navigate to login page
    {
      action: 'navigate',
      description: 'Navigate to login page',
      params: {
        url: 'http://localhost:3000/login',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/login' },
      ],
    },

    // Step 3: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture login page state',
      params: {},
      screenshot: true,
    },

    // Step 4: Fill login form
    {
      action: 'fill_form',
      description: 'Fill login credentials',
      params: {
        fields: [
          {
            name: 'Email',
            type: 'textbox',
            ref: 'input[name="email"], input[type="email"]',
            value: 'e2e-login-test@test.com',
          },
          {
            name: 'Password',
            type: 'textbox',
            ref: 'input[name="password"], input[type="password"]',
            value: 'TestPassword123!',
          },
        ],
      },
    },

    // Step 5: Submit login form
    {
      action: 'click',
      description: 'Click Sign In button',
      params: {
        element: 'Sign In button',
        ref: 'button[type="submit"], button:has-text("Sign In"), button:has-text("Login")',
      },
      waitAfter: 3000,
    },

    // Step 6: Verify redirect to protected area
    {
      action: 'verify_url',
      description: 'Verify redirected to dashboard',
      params: {
        contains: '/dashboard',
      },
    },

    // Step 7: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors during login',
      params: {
        level: 'error',
      },
    },

    // Step 8: Verify dashboard loads correctly
    {
      action: 'snapshot',
      description: 'Capture dashboard state after login',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'not_exists', target: '.error' },
      ],
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'User',
        where: 'email = \'e2e-login-test@test.com\'',
      },
    },
  ],
}

// =============================================================================
// INVALID LOGIN ATTEMPT
// =============================================================================

export const invalidLoginAttempt: E2ETestSpec = {
  id: 'e2e-auth-invalid-login',
  name: 'Invalid Login Attempt',
  description: 'Verify proper error handling for invalid credentials',
  priority: 'high',
  requiresAuth: false,
  timeout: 30,

  steps: [
    // Step 1: Navigate to login page
    {
      action: 'navigate',
      description: 'Navigate to login page',
      params: {
        url: 'http://localhost:3000/login',
      },
    },

    // Step 2: Fill invalid credentials
    {
      action: 'fill_form',
      description: 'Enter invalid credentials',
      params: {
        fields: [
          {
            name: 'Email',
            type: 'textbox',
            ref: 'input[name="email"], input[type="email"]',
            value: 'nonexistent@test.com',
          },
          {
            name: 'Password',
            type: 'textbox',
            ref: 'input[name="password"], input[type="password"]',
            value: 'WrongPassword123!',
          },
        ],
      },
    },

    // Step 3: Submit login form
    {
      action: 'click',
      description: 'Click Sign In button',
      params: {
        element: 'Sign In button',
        ref: 'button[type="submit"]',
      },
      waitAfter: 2000,
    },

    // Step 4: Verify error message appears
    {
      action: 'snapshot',
      description: 'Capture error state',
      params: {},
      screenshot: true,
    },

    // Step 5: Verify still on login page
    {
      action: 'verify_url',
      description: 'Verify not redirected from login',
      params: {
        contains: '/login',
      },
    },

    // Step 6: Verify error indication exists
    {
      action: 'verify_element',
      description: 'Verify error message is displayed',
      params: {
        selector: '.error, [role="alert"], .text-red-500, .text-destructive',
        shouldExist: true,
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// REGISTRATION VALIDATION ERRORS
// =============================================================================

export const registrationValidationErrors: E2ETestSpec = {
  id: 'e2e-auth-registration-validation',
  name: 'Registration Validation Errors',
  description: 'Verify form validation for registration fields',
  priority: 'high',
  requiresAuth: false,
  timeout: 45,

  steps: [
    // Step 1: Navigate to registration page
    {
      action: 'navigate',
      description: 'Navigate to registration page',
      params: {
        url: 'http://localhost:3000/auth/register',
      },
    },

    // Test invalid email
    {
      action: 'fill_form',
      description: 'Enter invalid email format',
      params: {
        fields: [
          {
            name: 'Email',
            type: 'textbox',
            ref: 'input[name="email"], input[type="email"]',
            value: 'not-an-email',
          },
          {
            name: 'Password',
            type: 'textbox',
            ref: 'input[name="password"], input[type="password"]',
            value: 'ValidPassword123!',
          },
        ],
      },
    },

    {
      action: 'click',
      description: 'Submit with invalid email',
      params: {
        element: 'Register button',
        ref: 'button[type="submit"]',
      },
      waitAfter: 1000,
    },

    {
      action: 'snapshot',
      description: 'Capture validation error state',
      params: {},
      screenshot: true,
      assertions: [
        { type: 'exists', target: '.error, [role="alert"], .text-red-500' },
      ],
    },

    // Test short password
    {
      action: 'fill_form',
      description: 'Enter password that is too short',
      params: {
        fields: [
          {
            name: 'Email',
            type: 'textbox',
            ref: 'input[name="email"], input[type="email"]',
            value: 'valid@test.com',
          },
          {
            name: 'Password',
            type: 'textbox',
            ref: 'input[name="password"], input[type="password"]',
            value: 'short', // Less than 8 characters
          },
        ],
      },
    },

    {
      action: 'click',
      description: 'Submit with short password',
      params: {
        element: 'Register button',
        ref: 'button[type="submit"]',
      },
      waitAfter: 1000,
    },

    {
      action: 'snapshot',
      description: 'Capture password validation error',
      params: {},
      screenshot: true,
    },

    // Verify still on registration page
    {
      action: 'verify_url',
      description: 'Verify not redirected from registration',
      params: {
        contains: '/auth/register',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// PROTECTED ROUTE ACCESS
// =============================================================================

export const protectedRouteAccess: E2ETestSpec = {
  id: 'e2e-auth-protected-routes',
  name: 'Protected Route Access',
  description: 'Verify unauthenticated users are redirected from protected pages',
  priority: 'critical',
  requiresAuth: false,
  timeout: 30,

  steps: [
    // Step 1: Attempt to access dashboard without auth
    {
      action: 'navigate',
      description: 'Attempt to access protected dashboard',
      params: {
        url: 'http://localhost:3000/dashboard',
      },
    },

    // Step 2: Wait for redirect
    {
      action: 'wait_for',
      description: 'Wait for authentication redirect',
      params: {
        timeout: 5000,
      },
    },

    // Step 3: Verify redirect to login
    {
      action: 'verify_url',
      description: 'Verify redirected to login page',
      params: {
        contains: '/login',
      },
    },

    // Step 4: Take screenshot
    {
      action: 'screenshot',
      description: 'Capture redirect state',
      params: {
        filename: 'e2e-protected-route-redirect.png',
      },
    },

    // Step 5: Try another protected route
    {
      action: 'navigate',
      description: 'Attempt to access protected recipes page',
      params: {
        url: 'http://localhost:3000/recipes',
      },
    },

    {
      action: 'wait_for',
      description: 'Wait for authentication redirect',
      params: {
        timeout: 5000,
      },
    },

    {
      action: 'verify_url',
      description: 'Verify redirected to login page',
      params: {
        contains: '/login',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All authentication E2E test specifications
 */
export const authE2ETests: E2ETestSpec[] = [
  userRegistrationJourney,
  userLoginJourney,
  invalidLoginAttempt,
  registrationValidationErrors,
  protectedRouteAccess,
]

export default authE2ETests
