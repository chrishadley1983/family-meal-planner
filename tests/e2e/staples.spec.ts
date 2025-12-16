/**
 * E2E Test Specifications for Staples Management
 *
 * Tests the household staples functionality:
 * - Viewing staples list
 * - Adding new staples
 * - Editing staple details
 * - Deleting staples
 * - Setting purchase frequency
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// STAPLES LIST VIEWING
// =============================================================================

export const staplesListViewing: E2ETestSpec = {
  id: 'e2e-staples-list',
  name: 'View Staples List',
  description: 'Verify user can view their household staples',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to staples page
    {
      action: 'navigate',
      description: 'Navigate to staples page',
      params: {
        url: 'http://localhost:3000/staples',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/staples' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture staples page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Verify staples list structure
    {
      action: 'verify_element',
      description: 'Verify staples container exists',
      params: {
        selector: '.staples-list, [data-testid="staples-container"], .staples-grid',
        shouldExist: true,
      },
    },

    // Step 4: Check for console errors
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
// ADD NEW STAPLE
// =============================================================================

export const addNewStaple: E2ETestSpec = {
  id: 'e2e-staples-add',
  name: 'Add New Staple',
  description: 'Verify user can add a new household staple',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to staples
    {
      action: 'navigate',
      description: 'Navigate to staples page',
      params: {
        url: 'http://localhost:3000/staples',
      },
    },

    // Step 2: Click add button
    {
      action: 'click',
      description: 'Click Add Staple button',
      params: {
        element: 'Add Staple button',
        ref: 'button:has-text("Add"), [data-testid="add-staple"]',
      },
      waitAfter: 1000,
    },

    // Step 3: Capture add form
    {
      action: 'snapshot',
      description: 'Capture add staple form',
      params: {},
      screenshot: true,
    },

    // Step 4: Fill staple details
    {
      action: 'fill_form',
      description: 'Fill staple information',
      params: {
        fields: [
          {
            name: 'Item Name',
            type: 'textbox',
            ref: 'input[name="itemName"], input[placeholder*="name"]',
            value: 'E2E Test Staple Eggs',
          },
          {
            name: 'Quantity',
            type: 'textbox',
            ref: 'input[name="quantity"]',
            value: '12',
          },
        ],
      },
    },

    // Step 5: Select unit
    {
      action: 'click',
      description: 'Select unit',
      params: {
        element: 'Unit selector',
        ref: 'select[name="unit"], [data-testid="unit-select"]',
      },
      waitAfter: 500,
    },

    // Step 6: Select frequency
    {
      action: 'click',
      description: 'Select purchase frequency',
      params: {
        element: 'Frequency selector',
        ref: 'select[name="frequency"], [data-testid="frequency-select"]',
      },
      waitAfter: 500,
    },

    // Step 7: Save staple
    {
      action: 'click',
      description: 'Save staple',
      params: {
        element: 'Save button',
        ref: 'button[type="submit"], button:has-text("Save"), button:has-text("Add")',
      },
      waitAfter: 2000,
    },

    // Step 8: Verify staple added
    {
      action: 'snapshot',
      description: 'Capture list with new staple',
      params: {},
      screenshot: true,
    },

    // Step 9: Verify in database
    {
      action: 'verify_database',
      description: 'Verify staple exists in database',
      params: {
        query: 'SELECT id FROM "Staple" WHERE "itemName" LIKE \'E2E Test%\' AND "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Staple',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// EDIT STAPLE
// =============================================================================

export const editStaple: E2ETestSpec = {
  id: 'e2e-staples-edit',
  name: 'Edit Staple',
  description: 'Verify user can edit an existing staple',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test staple
    {
      action: 'seed_data',
      description: 'Seed test staple',
      params: {
        table: 'Staple',
        records: [
          {
            itemName: 'E2E Test Edit Staple',
            quantity: 1,
            unit: 'each',
            category: 'Test',
            frequency: 'weekly',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to staples
    {
      action: 'navigate',
      description: 'Navigate to staples page',
      params: {
        url: 'http://localhost:3000/staples',
      },
    },

    // Step 3: Wait for staple to appear
    {
      action: 'wait_for',
      description: 'Wait for test staple',
      params: {
        text: 'E2E Test Edit Staple',
        timeout: 10000,
      },
    },

    // Step 4: Click on staple to edit
    {
      action: 'click',
      description: 'Click to edit staple',
      params: {
        element: 'Staple row or edit button',
        ref: '[data-testid="staple-item"]:has-text("E2E Test Edit Staple"), .staple-item:has-text("E2E Test Edit Staple")',
      },
      waitAfter: 1000,
    },

    // Step 5: Update quantity
    {
      action: 'fill_form',
      description: 'Update quantity',
      params: {
        fields: [
          {
            name: 'Quantity',
            type: 'textbox',
            ref: 'input[name="quantity"]',
            value: '5',
          },
        ],
      },
    },

    // Step 6: Save changes
    {
      action: 'click',
      description: 'Save changes',
      params: {
        element: 'Save button',
        ref: 'button:has-text("Save"), button:has-text("Update")',
      },
      waitAfter: 2000,
    },

    // Step 7: Verify update
    {
      action: 'snapshot',
      description: 'Capture updated staple',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Staple',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// DELETE STAPLE
// =============================================================================

export const deleteStaple: E2ETestSpec = {
  id: 'e2e-staples-delete',
  name: 'Delete Staple',
  description: 'Verify user can delete a staple',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test staple
    {
      action: 'seed_data',
      description: 'Seed test staple to delete',
      params: {
        table: 'Staple',
        records: [
          {
            itemName: 'E2E Test Delete Staple',
            quantity: 1,
            unit: 'each',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to staples
    {
      action: 'navigate',
      description: 'Navigate to staples page',
      params: {
        url: 'http://localhost:3000/staples',
      },
    },

    // Step 3: Wait for staple
    {
      action: 'wait_for',
      description: 'Wait for test staple',
      params: {
        text: 'E2E Test Delete Staple',
        timeout: 10000,
      },
    },

    // Step 4: Click delete button
    {
      action: 'click',
      description: 'Click delete button',
      params: {
        element: 'Delete button',
        ref: '[data-testid="delete-staple"], button[aria-label*="delete"]:near(:text("E2E Test Delete Staple"))',
      },
      waitAfter: 1000,
    },

    // Step 5: Confirm deletion
    {
      action: 'click',
      description: 'Confirm deletion',
      params: {
        element: 'Confirm button',
        ref: 'button:has-text("Confirm"), button:has-text("Delete"), [data-testid="confirm-delete"]',
      },
      waitAfter: 2000,
    },

    // Step 6: Verify removal
    {
      action: 'snapshot',
      description: 'Capture list after deletion',
      params: {},
      screenshot: true,
    },

    // Step 7: Verify in database
    {
      action: 'verify_database',
      description: 'Verify staple deleted',
      params: {
        query: 'SELECT id FROM "Staple" WHERE "itemName" = \'E2E Test Delete Staple\' AND "isActive" = true',
        assertion: 'rowCount === 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Staple',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// TOGGLE STAPLE ACTIVE STATUS
// =============================================================================

export const toggleStapleStatus: E2ETestSpec = {
  id: 'e2e-staples-toggle',
  name: 'Toggle Staple Active Status',
  description: 'Verify user can enable/disable staples',
  priority: 'low',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test staple
    {
      action: 'seed_data',
      description: 'Seed active test staple',
      params: {
        table: 'Staple',
        records: [
          {
            itemName: 'E2E Test Toggle Staple',
            quantity: 1,
            unit: 'each',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to staples
    {
      action: 'navigate',
      description: 'Navigate to staples page',
      params: {
        url: 'http://localhost:3000/staples',
      },
    },

    // Step 3: Wait for staple
    {
      action: 'wait_for',
      description: 'Wait for test staple',
      params: {
        text: 'E2E Test Toggle Staple',
        timeout: 10000,
      },
    },

    // Step 4: Click toggle switch
    {
      action: 'click',
      description: 'Toggle active status',
      params: {
        element: 'Active toggle',
        ref: 'input[type="checkbox"]:near(:text("E2E Test Toggle")), [data-testid="toggle-active"]',
      },
      waitAfter: 1000,
    },

    // Step 5: Verify visual change
    {
      action: 'snapshot',
      description: 'Capture toggled state',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'Staple',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All staples E2E test specifications
 */
export const staplesE2ETests: E2ETestSpec[] = [
  staplesListViewing,
  addNewStaple,
  editStaple,
  deleteStaple,
  toggleStapleStatus,
]

export default staplesE2ETests
