/**
 * E2E Test Specifications for Inventory Management
 *
 * Tests the complete inventory user journeys:
 * - Viewing inventory items
 * - Adding items manually
 * - Photo-based inventory import
 * - Editing and deleting items
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// INVENTORY VIEWING JOURNEY
// =============================================================================

export const inventoryViewingJourney: E2ETestSpec = {
  id: 'e2e-inventory-view',
  name: 'View Inventory Items',
  description: 'Verify user can view their inventory items grouped by location',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to inventory page
    {
      action: 'navigate',
      description: 'Navigate to inventory page',
      params: {
        url: 'http://localhost:3000/inventory',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/inventory' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture inventory page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Verify inventory structure loads
    {
      action: 'verify_element',
      description: 'Verify inventory sections are displayed',
      params: {
        selector: '.inventory-list, .inventory-section, [data-testid="inventory-items"]',
        shouldExist: true,
      },
    },

    // Step 4: Check for console errors
    {
      action: 'check_console_errors',
      description: 'Verify no JavaScript errors on inventory page',
      params: {
        level: 'error',
      },
    },
  ],

  cleanup: [],
}

// =============================================================================
// ADD INVENTORY ITEM MANUALLY
// =============================================================================

export const addInventoryManually: E2ETestSpec = {
  id: 'e2e-inventory-add-manual',
  name: 'Add Inventory Item Manually',
  description: 'Verify user can manually add an inventory item',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Navigate to inventory page
    {
      action: 'navigate',
      description: 'Navigate to inventory page',
      params: {
        url: 'http://localhost:3000/inventory',
      },
    },

    // Step 2: Click add button
    {
      action: 'click',
      description: 'Click Add Item button',
      params: {
        element: 'Add Item button',
        ref: 'button:has-text("Add"), [data-testid="add-inventory-item"]',
      },
      waitAfter: 1000,
    },

    // Step 3: Take snapshot of add form
    {
      action: 'snapshot',
      description: 'Capture add item form',
      params: {},
      screenshot: true,
    },

    // Step 4: Fill item details
    {
      action: 'fill_form',
      description: 'Fill inventory item details',
      params: {
        fields: [
          {
            name: 'Item Name',
            type: 'textbox',
            ref: 'input[name="itemName"], input[placeholder*="name"]',
            value: 'E2E Test Chicken Breast',
          },
          {
            name: 'Quantity',
            type: 'textbox',
            ref: 'input[name="quantity"]',
            value: '500',
          },
        ],
      },
    },

    // Step 5: Select unit (if dropdown exists)
    {
      action: 'click',
      description: 'Select unit',
      params: {
        element: 'Unit dropdown or button',
        ref: 'select[name="unit"], button:has-text("g"), [data-testid="unit-selector"]',
      },
      waitAfter: 500,
    },

    // Step 6: Submit the form
    {
      action: 'click',
      description: 'Click Save button',
      params: {
        element: 'Save button',
        ref: 'button[type="submit"], button:has-text("Save"), button:has-text("Add")',
      },
      waitAfter: 2000,
    },

    // Step 7: Verify item appears in list
    {
      action: 'snapshot',
      description: 'Capture inventory after adding item',
      params: {},
      screenshot: true,
    },

    // Step 8: Verify in database
    {
      action: 'verify_database',
      description: 'Verify item exists in database',
      params: {
        query: 'SELECT id FROM "InventoryItem" WHERE "itemName" LIKE \'E2E Test%\' AND "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'InventoryItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// EDIT INVENTORY ITEM
// =============================================================================

export const editInventoryItem: E2ETestSpec = {
  id: 'e2e-inventory-edit',
  name: 'Edit Inventory Item',
  description: 'Verify user can edit an existing inventory item',
  priority: 'medium',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test item
    {
      action: 'seed_data',
      description: 'Seed test inventory item',
      params: {
        table: 'InventoryItem',
        records: [
          {
            itemName: 'E2E Test Edit Item',
            quantity: 100,
            unit: 'g',
            category: 'Test',
            location: 'fridge',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to inventory page
    {
      action: 'navigate',
      description: 'Navigate to inventory page',
      params: {
        url: 'http://localhost:3000/inventory',
      },
    },

    // Step 3: Wait for item to load
    {
      action: 'wait_for',
      description: 'Wait for inventory items to load',
      params: {
        text: 'E2E Test Edit Item',
        timeout: 10000,
      },
    },

    // Step 4: Click on item to edit
    {
      action: 'click',
      description: 'Click on item to edit',
      params: {
        element: 'Item row or edit button',
        ref: '[data-testid="inventory-item"]:has-text("E2E Test Edit Item"), .inventory-item:has-text("E2E Test Edit Item")',
      },
      waitAfter: 1000,
    },

    // Step 5: Edit quantity
    {
      action: 'fill_form',
      description: 'Update quantity',
      params: {
        fields: [
          {
            name: 'Quantity',
            type: 'textbox',
            ref: 'input[name="quantity"]',
            value: '200',
          },
        ],
      },
    },

    // Step 6: Save changes
    {
      action: 'click',
      description: 'Click Save button',
      params: {
        element: 'Save button',
        ref: 'button:has-text("Save"), button:has-text("Update")',
      },
      waitAfter: 2000,
    },

    // Step 7: Verify changes saved
    {
      action: 'snapshot',
      description: 'Capture updated item',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'InventoryItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// DELETE INVENTORY ITEM
// =============================================================================

export const deleteInventoryItem: E2ETestSpec = {
  id: 'e2e-inventory-delete',
  name: 'Delete Inventory Item',
  description: 'Verify user can delete an inventory item',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test item
    {
      action: 'seed_data',
      description: 'Seed test inventory item to delete',
      params: {
        table: 'InventoryItem',
        records: [
          {
            itemName: 'E2E Test Delete Item',
            quantity: 50,
            unit: 'g',
            category: 'Test',
            location: 'fridge',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to inventory page
    {
      action: 'navigate',
      description: 'Navigate to inventory page',
      params: {
        url: 'http://localhost:3000/inventory',
      },
    },

    // Step 3: Wait for item to load
    {
      action: 'wait_for',
      description: 'Wait for item to appear',
      params: {
        text: 'E2E Test Delete Item',
        timeout: 10000,
      },
    },

    // Step 4: Click delete button
    {
      action: 'click',
      description: 'Click delete button on item',
      params: {
        element: 'Delete button',
        ref: '[data-testid="delete-inventory-item"], button[aria-label*="delete"]:near(:text("E2E Test Delete Item"))',
      },
      waitAfter: 1000,
    },

    // Step 5: Confirm deletion if modal appears
    {
      action: 'click',
      description: 'Confirm deletion',
      params: {
        element: 'Confirm delete button',
        ref: 'button:has-text("Confirm"), button:has-text("Delete"), [data-testid="confirm-delete"]',
      },
      waitAfter: 2000,
    },

    // Step 6: Verify item removed
    {
      action: 'snapshot',
      description: 'Capture inventory after deletion',
      params: {},
      screenshot: true,
    },

    // Step 7: Verify database
    {
      action: 'verify_database',
      description: 'Verify item deleted from database',
      params: {
        query: 'SELECT id FROM "InventoryItem" WHERE "itemName" = \'E2E Test Delete Item\' AND "isActive" = true',
        assertion: 'rowCount === 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'InventoryItem',
        where: '"itemName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// INVENTORY WITH EXPIRY TRACKING
// =============================================================================

export const inventoryExpiryTracking: E2ETestSpec = {
  id: 'e2e-inventory-expiry',
  name: 'Inventory Expiry Tracking',
  description: 'Verify expiring items are highlighted appropriately',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed items with various expiry dates
    {
      action: 'seed_data',
      description: 'Seed items with expiry dates',
      params: {
        table: 'InventoryItem',
        records: [
          {
            itemName: 'E2E Fresh Item',
            quantity: 100,
            unit: 'g',
            expiryDate: 'NOW + 14 days',
            isActive: true,
          },
          {
            itemName: 'E2E Expiring Soon Item',
            quantity: 100,
            unit: 'g',
            expiryDate: 'NOW + 2 days',
            isActive: true,
          },
        ],
      },
    },

    // Step 2: Navigate to inventory
    {
      action: 'navigate',
      description: 'Navigate to inventory page',
      params: {
        url: 'http://localhost:3000/inventory',
      },
    },

    // Step 3: Wait for items to load
    {
      action: 'wait_for',
      description: 'Wait for items',
      params: {
        timeout: 10000,
      },
    },

    // Step 4: Take screenshot to verify visual indicators
    {
      action: 'screenshot',
      description: 'Capture expiry status indicators',
      params: {
        filename: 'e2e-inventory-expiry.png',
      },
    },

    // Step 5: Verify expiring soon indicator exists
    {
      action: 'verify_element',
      description: 'Verify expiry warning indicator',
      params: {
        selector: '.expiring-soon, .warning, [data-expiry="soon"], .text-warning, .text-orange-500',
        shouldExist: true,
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'InventoryItem',
        where: '"itemName" LIKE \'E2E%\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All inventory E2E test specifications
 */
export const inventoryE2ETests: E2ETestSpec[] = [
  inventoryViewingJourney,
  addInventoryManually,
  editInventoryItem,
  deleteInventoryItem,
  inventoryExpiryTracking,
]

export default inventoryE2ETests
