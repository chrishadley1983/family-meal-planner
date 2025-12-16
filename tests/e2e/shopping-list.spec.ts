/**
 * E2E Test Specifications for Shopping Lists
 *
 * Tests the shopping list functionality:
 * - Viewing shopping lists
 * - Creating shopping list from meal plan
 * - Managing items (checking off, adding, removing)
 * - PDF export
 * - Sharing lists
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// SHOPPING LIST VIEWING
// =============================================================================

export const shoppingListViewing: E2ETestSpec = {
  id: 'e2e-shopping-list-view',
  name: 'View Shopping List',
  description: 'Verify user can view their shopping lists',
  priority: 'critical',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to shopping lists page
    {
      action: 'navigate',
      description: 'Navigate to shopping lists page',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/shopping-lists' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture shopping lists page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Verify shopping list structure
    {
      action: 'verify_element',
      description: 'Verify shopping list container exists',
      params: {
        selector: '.shopping-list, [data-testid="shopping-list-container"], .list-items',
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
// ADD ITEM TO SHOPPING LIST
// =============================================================================

export const addShoppingListItem: E2ETestSpec = {
  id: 'e2e-shopping-list-add-item',
  name: 'Add Item to Shopping List',
  description: 'Verify user can manually add an item to shopping list',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to shopping lists
    {
      action: 'navigate',
      description: 'Navigate to shopping lists page',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 2: Click add item button
    {
      action: 'click',
      description: 'Click Add Item button',
      params: {
        element: 'Add Item button',
        ref: 'button:has-text("Add"), [data-testid="add-item"], input[placeholder*="Add"]',
      },
      waitAfter: 500,
    },

    // Step 3: Type item name
    {
      action: 'type',
      description: 'Enter item name',
      params: {
        element: 'Item name input',
        ref: 'input[name="itemName"], input[placeholder*="item"], [data-testid="item-input"]',
        text: 'E2E Test Shopping Item',
      },
    },

    // Step 4: Enter quantity
    {
      action: 'fill_form',
      description: 'Fill item details',
      params: {
        fields: [
          {
            name: 'Quantity',
            type: 'textbox',
            ref: 'input[name="quantity"]',
            value: '2',
          },
        ],
      },
    },

    // Step 5: Save item
    {
      action: 'click',
      description: 'Save item',
      params: {
        element: 'Save button',
        ref: 'button:has-text("Add"), button:has-text("Save"), button[type="submit"]',
      },
      waitAfter: 2000,
    },

    // Step 6: Verify item appears
    {
      action: 'snapshot',
      description: 'Capture list with new item',
      params: {},
      screenshot: true,
    },

    // Step 7: Verify in database
    {
      action: 'verify_database',
      description: 'Verify item exists in database',
      params: {
        query: 'SELECT id FROM "ShoppingListItem" WHERE "itemName" LIKE \'E2E Test%\' AND "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// CHECK OFF ITEM
// =============================================================================

export const checkOffItem: E2ETestSpec = {
  id: 'e2e-shopping-list-check-off',
  name: 'Check Off Shopping Item',
  description: 'Verify user can check off items as purchased',
  priority: 'high',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test item
    {
      action: 'seed_data',
      description: 'Seed test shopping list item',
      params: {
        table: 'ShoppingListItem',
        records: [
          {
            itemName: 'E2E Test Check Item',
            quantity: 1,
            unit: 'each',
            isPurchased: false,
          },
        ],
      },
    },

    // Step 2: Navigate to shopping list
    {
      action: 'navigate',
      description: 'Navigate to shopping lists',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 3: Wait for item to load
    {
      action: 'wait_for',
      description: 'Wait for test item to appear',
      params: {
        text: 'E2E Test Check Item',
        timeout: 10000,
      },
    },

    // Step 4: Click checkbox to check off item
    {
      action: 'click',
      description: 'Check off item',
      params: {
        element: 'Item checkbox',
        ref: 'input[type="checkbox"]:near(:text("E2E Test Check Item")), [data-testid="item-checkbox"]:has-text("E2E Test Check Item")',
      },
      waitAfter: 1000,
    },

    // Step 5: Verify item state changed
    {
      action: 'snapshot',
      description: 'Capture checked item state',
      params: {},
      screenshot: true,
    },

    // Step 6: Verify visual change (strikethrough or similar)
    {
      action: 'verify_element',
      description: 'Verify checked state indicator',
      params: {
        selector: '.checked, .purchased, .completed, [data-checked="true"], input:checked',
        shouldExist: true,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// IMPORT FROM MEAL PLAN
// =============================================================================

export const importFromMealPlan: E2ETestSpec = {
  id: 'e2e-shopping-list-import-meal-plan',
  name: 'Import Shopping List from Meal Plan',
  description: 'Verify user can generate shopping list from active meal plan',
  priority: 'critical',
  requiresAuth: true,
  timeout: 90,

  steps: [
    // Step 1: Seed test meal plan with recipes
    {
      action: 'seed_data',
      description: 'Seed test meal plan with recipes',
      params: {
        table: 'MealPlan',
        records: [
          {
            weekStartDate: 'CURRENT_WEEK_START',
            status: 'Active',
          },
        ],
      },
    },

    // Step 2: Navigate to shopping lists
    {
      action: 'navigate',
      description: 'Navigate to shopping lists',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 3: Click import from meal plan button
    {
      action: 'click',
      description: 'Click Import from Meal Plan button',
      params: {
        element: 'Import button',
        ref: 'button:has-text("Import"), button:has-text("From Meal Plan"), [data-testid="import-meal-plan"]',
      },
      waitAfter: 3000,
    },

    // Step 4: Wait for import to complete
    {
      action: 'wait_for',
      description: 'Wait for import processing',
      params: {
        timeout: 30000,
      },
    },

    // Step 5: Verify items imported
    {
      action: 'snapshot',
      description: 'Capture shopping list after import',
      params: {},
      screenshot: true,
    },

    // Step 6: Verify items exist
    {
      action: 'verify_element',
      description: 'Verify shopping items are displayed',
      params: {
        selector: '.shopping-item, [data-testid="shopping-item"], .list-item',
        shouldExist: true,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
    {
      action: 'delete_record',
      params: {
        table: 'MealPlan',
        where: '"createdAt" > NOW() - INTERVAL \'1 hour\'',
      },
    },
  ],
}

// =============================================================================
// IMPORT STAPLES
// =============================================================================

export const importStaples: E2ETestSpec = {
  id: 'e2e-shopping-list-import-staples',
  name: 'Import Staples to Shopping List',
  description: 'Verify user can add due staples to shopping list',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test staples
    {
      action: 'seed_data',
      description: 'Seed test staples due for purchase',
      params: {
        table: 'Staple',
        records: [
          {
            itemName: 'E2E Test Staple Milk',
            quantity: 2,
            unit: 'litres',
            frequency: 'weekly',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to shopping lists
    {
      action: 'navigate',
      description: 'Navigate to shopping lists',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 3: Click import staples button
    {
      action: 'click',
      description: 'Click Import Staples button',
      params: {
        element: 'Import Staples button',
        ref: 'button:has-text("Staples"), button:has-text("Add Staples"), [data-testid="import-staples"]',
      },
      waitAfter: 2000,
    },

    // Step 4: Verify staples imported
    {
      action: 'snapshot',
      description: 'Capture list with imported staples',
      params: {},
      screenshot: true,
    },

    // Step 5: Verify staple item appears
    {
      action: 'wait_for',
      description: 'Wait for staple to appear',
      params: {
        text: 'Milk',
        timeout: 10000,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"itemName" LIKE \'%E2E Test%\' OR "itemName" LIKE \'%Milk%\'',
      },
    },
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
// PDF EXPORT
// =============================================================================

export const exportPDF: E2ETestSpec = {
  id: 'e2e-shopping-list-pdf',
  name: 'Export Shopping List to PDF',
  description: 'Verify user can export shopping list as PDF',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed shopping list with items
    {
      action: 'seed_data',
      description: 'Seed shopping list items for PDF',
      params: {
        table: 'ShoppingListItem',
        records: [
          { itemName: 'E2E PDF Test Item 1', quantity: 1, unit: 'each' },
          { itemName: 'E2E PDF Test Item 2', quantity: 2, unit: 'kg' },
        ],
      },
    },

    // Step 2: Navigate to shopping list
    {
      action: 'navigate',
      description: 'Navigate to shopping lists',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 3: Wait for items to load
    {
      action: 'wait_for',
      description: 'Wait for items',
      params: {
        timeout: 5000,
      },
    },

    // Step 4: Click export PDF button
    {
      action: 'click',
      description: 'Click Export PDF button',
      params: {
        element: 'Export PDF button',
        ref: 'button:has-text("PDF"), button:has-text("Export"), [data-testid="export-pdf"]',
      },
      waitAfter: 3000,
    },

    // Step 5: Verify PDF generated (may trigger download or open preview)
    {
      action: 'snapshot',
      description: 'Capture after PDF export action',
      params: {},
      screenshot: true,
    },

    // Step 6: Check no errors
    {
      action: 'check_console_errors',
      description: 'Verify no errors during PDF generation',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"itemName" LIKE \'E2E PDF%\'',
      },
    },
  ],
}

// =============================================================================
// DELETE ITEM
// =============================================================================

export const deleteShoppingItem: E2ETestSpec = {
  id: 'e2e-shopping-list-delete-item',
  name: 'Delete Shopping List Item',
  description: 'Verify user can remove item from shopping list',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test item
    {
      action: 'seed_data',
      description: 'Seed test item to delete',
      params: {
        table: 'ShoppingListItem',
        records: [
          {
            itemName: 'E2E Test Delete Shopping Item',
            quantity: 1,
            unit: 'each',
          },
        ],
      },
    },

    // Step 2: Navigate to shopping list
    {
      action: 'navigate',
      description: 'Navigate to shopping lists',
      params: {
        url: 'http://localhost:3000/shopping-lists',
      },
    },

    // Step 3: Wait for item
    {
      action: 'wait_for',
      description: 'Wait for test item',
      params: {
        text: 'E2E Test Delete Shopping Item',
        timeout: 10000,
      },
    },

    // Step 4: Click delete button
    {
      action: 'click',
      description: 'Click delete button on item',
      params: {
        element: 'Delete button',
        ref: '[data-testid="delete-item"]:near(:text("E2E Test Delete")), button[aria-label*="delete"]:near(:text("E2E Test Delete"))',
      },
      waitAfter: 1000,
    },

    // Step 5: Confirm deletion if modal
    {
      action: 'click',
      description: 'Confirm deletion',
      params: {
        element: 'Confirm button',
        ref: 'button:has-text("Confirm"), button:has-text("Delete"), [data-testid="confirm-delete"]',
      },
      waitAfter: 2000,
    },

    // Step 6: Verify item removed
    {
      action: 'snapshot',
      description: 'Capture list after deletion',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'ShoppingListItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All shopping list E2E test specifications
 */
export const shoppingListE2ETests: E2ETestSpec[] = [
  shoppingListViewing,
  addShoppingListItem,
  checkOffItem,
  importFromMealPlan,
  importStaples,
  exportPDF,
  deleteShoppingItem,
]

export default shoppingListE2ETests
