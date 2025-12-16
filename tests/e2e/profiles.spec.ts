/**
 * E2E Test Specifications for Family Profiles
 *
 * Tests the family profile management:
 * - Viewing profiles
 * - Creating a new profile
 * - Editing profile details
 * - Setting dietary preferences
 * - Managing allergies
 *
 * These specifications are interpreted and executed by the Test Execution Agent
 * using Playwright MCP tools.
 *
 * NOTE: App must be running on localhost:3000 for E2E tests
 */

import type { E2ETestSpec } from '../../docs/testing/templates/e2e-test-template'

// =============================================================================
// PROFILES LIST VIEWING
// =============================================================================

export const profilesListViewing: E2ETestSpec = {
  id: 'e2e-profiles-list',
  name: 'View Family Profiles',
  description: 'Verify user can view their family profiles list',
  priority: 'high',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Navigate to profiles page
    {
      action: 'navigate',
      description: 'Navigate to profiles page',
      params: {
        url: 'http://localhost:3000/profiles',
      },
      assertions: [
        { type: 'contains', target: 'url', expected: '/profiles' },
      ],
    },

    // Step 2: Take initial snapshot
    {
      action: 'snapshot',
      description: 'Capture profiles page state',
      params: {},
      screenshot: true,
    },

    // Step 3: Verify profiles list structure
    {
      action: 'verify_element',
      description: 'Verify profiles container exists',
      params: {
        selector: '.profiles-list, .profile-cards, [data-testid="profiles-container"]',
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
// CREATE NEW PROFILE
// =============================================================================

export const createNewProfile: E2ETestSpec = {
  id: 'e2e-profiles-create',
  name: 'Create New Family Profile',
  description: 'Verify user can create a new family member profile',
  priority: 'high',
  requiresAuth: true,
  timeout: 90,

  steps: [
    // Step 1: Navigate to profiles page
    {
      action: 'navigate',
      description: 'Navigate to profiles page',
      params: {
        url: 'http://localhost:3000/profiles',
      },
    },

    // Step 2: Click add profile button
    {
      action: 'click',
      description: 'Click Add Profile button',
      params: {
        element: 'Add Profile button',
        ref: 'button:has-text("Add"), button:has-text("New"), [data-testid="add-profile"]',
      },
      waitAfter: 1000,
    },

    // Step 3: Capture create form
    {
      action: 'snapshot',
      description: 'Capture profile creation form',
      params: {},
      screenshot: true,
    },

    // Step 4: Fill profile details
    {
      action: 'fill_form',
      description: 'Fill profile basic information',
      params: {
        fields: [
          {
            name: 'Profile Name',
            type: 'textbox',
            ref: 'input[name="profileName"], input[name="name"]',
            value: 'E2E Test Family Member',
          },
          {
            name: 'Age',
            type: 'textbox',
            ref: 'input[name="age"]',
            value: '35',
          },
        ],
      },
    },

    // Step 5: Select gender if dropdown exists
    {
      action: 'click',
      description: 'Open gender dropdown',
      params: {
        element: 'Gender selector',
        ref: 'select[name="gender"], [data-testid="gender-select"]',
      },
      waitAfter: 500,
    },

    // Step 6: Fill physical details
    {
      action: 'fill_form',
      description: 'Fill physical measurements',
      params: {
        fields: [
          {
            name: 'Height',
            type: 'textbox',
            ref: 'input[name="heightCm"], input[name="height"]',
            value: '175',
          },
          {
            name: 'Weight',
            type: 'textbox',
            ref: 'input[name="currentWeightKg"], input[name="weight"]',
            value: '75',
          },
        ],
      },
    },

    // Step 7: Submit form
    {
      action: 'click',
      description: 'Click Save button',
      params: {
        element: 'Save button',
        ref: 'button[type="submit"], button:has-text("Save"), button:has-text("Create")',
      },
      waitAfter: 3000,
    },

    // Step 8: Verify profile created
    {
      action: 'snapshot',
      description: 'Capture profiles list after creation',
      params: {},
      screenshot: true,
    },

    // Step 9: Verify in database
    {
      action: 'verify_database',
      description: 'Verify profile exists in database',
      params: {
        query: 'SELECT id FROM "FamilyProfile" WHERE "profileName" LIKE \'E2E Test%\' AND "createdAt" > NOW() - INTERVAL \'5 minutes\'',
        assertion: 'rowCount > 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'FamilyProfile',
        where: '"profileName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// EDIT PROFILE
// =============================================================================

export const editProfile: E2ETestSpec = {
  id: 'e2e-profiles-edit',
  name: 'Edit Family Profile',
  description: 'Verify user can edit an existing profile',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test profile
    {
      action: 'seed_data',
      description: 'Seed test profile',
      params: {
        table: 'FamilyProfile',
        records: [
          {
            profileName: 'E2E Test Edit Profile',
            age: 30,
            gender: 'female',
            heightCm: 165,
            currentWeightKg: 60,
            activityLevel: 'moderate',
          },
        ],
      },
    },

    // Step 2: Navigate to profiles
    {
      action: 'navigate',
      description: 'Navigate to profiles page',
      params: {
        url: 'http://localhost:3000/profiles',
      },
    },

    // Step 3: Wait for profile to appear
    {
      action: 'wait_for',
      description: 'Wait for test profile to appear',
      params: {
        text: 'E2E Test Edit Profile',
        timeout: 10000,
      },
    },

    // Step 4: Click on profile to edit
    {
      action: 'click',
      description: 'Click to edit profile',
      params: {
        element: 'Profile card or edit button',
        ref: '[data-testid="profile-card"]:has-text("E2E Test Edit Profile"), .profile-card:has-text("E2E Test Edit Profile")',
      },
      waitAfter: 1000,
    },

    // Step 5: Update weight
    {
      action: 'fill_form',
      description: 'Update weight',
      params: {
        fields: [
          {
            name: 'Weight',
            type: 'textbox',
            ref: 'input[name="currentWeightKg"], input[name="weight"]',
            value: '58',
          },
        ],
      },
    },

    // Step 6: Save changes
    {
      action: 'click',
      description: 'Save profile changes',
      params: {
        element: 'Save button',
        ref: 'button:has-text("Save"), button:has-text("Update")',
      },
      waitAfter: 2000,
    },

    // Step 7: Verify update success
    {
      action: 'snapshot',
      description: 'Capture updated profile',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'FamilyProfile',
        where: '"profileName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// MANAGE ALLERGIES
// =============================================================================

export const manageAllergies: E2ETestSpec = {
  id: 'e2e-profiles-allergies',
  name: 'Manage Profile Allergies',
  description: 'Verify user can add and manage allergy information',
  priority: 'high',
  requiresAuth: true,
  timeout: 60,

  steps: [
    // Step 1: Seed test profile
    {
      action: 'seed_data',
      description: 'Seed test profile for allergy management',
      params: {
        table: 'FamilyProfile',
        records: [
          {
            profileName: 'E2E Test Allergy Profile',
            age: 25,
            allergies: [],
          },
        ],
      },
    },

    // Step 2: Navigate to profiles
    {
      action: 'navigate',
      description: 'Navigate to profiles page',
      params: {
        url: 'http://localhost:3000/profiles',
      },
    },

    // Step 3: Open profile for editing
    {
      action: 'click',
      description: 'Click to edit profile',
      params: {
        element: 'Profile card',
        ref: '[data-testid="profile-card"]:has-text("E2E Test Allergy Profile")',
      },
      waitAfter: 1000,
    },

    // Step 4: Navigate to allergies section
    {
      action: 'click',
      description: 'Go to allergies/preferences section',
      params: {
        element: 'Allergies tab or section',
        ref: '[data-testid="allergies-section"], button:has-text("Allergies"), .tab:has-text("Preferences")',
      },
      waitAfter: 500,
    },

    // Step 5: Add an allergy
    {
      action: 'click',
      description: 'Click to add allergy',
      params: {
        element: 'Add allergy button or input',
        ref: 'button:has-text("Add Allergy"), input[name="allergy"], [data-testid="add-allergy"]',
      },
      waitAfter: 500,
    },

    // Step 6: Type allergy name
    {
      action: 'type',
      description: 'Enter allergy name',
      params: {
        element: 'Allergy input',
        ref: 'input[name="allergy"], input[placeholder*="allergy"], [data-testid="allergy-input"]',
        text: 'Peanuts',
      },
    },

    // Step 7: Confirm/save allergy
    {
      action: 'click',
      description: 'Save allergy',
      params: {
        element: 'Save or confirm button',
        ref: 'button:has-text("Add"), button:has-text("Save"), [data-testid="save-allergy"]',
      },
      waitAfter: 2000,
    },

    // Step 8: Verify allergy added
    {
      action: 'snapshot',
      description: 'Capture profile with allergy',
      params: {},
      screenshot: true,
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'FamilyProfile',
        where: '"profileName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// DELETE PROFILE
// =============================================================================

export const deleteProfile: E2ETestSpec = {
  id: 'e2e-profiles-delete',
  name: 'Delete Family Profile',
  description: 'Verify user can delete a family profile',
  priority: 'medium',
  requiresAuth: true,
  timeout: 45,

  steps: [
    // Step 1: Seed test profile
    {
      action: 'seed_data',
      description: 'Seed test profile to delete',
      params: {
        table: 'FamilyProfile',
        records: [
          {
            profileName: 'E2E Test Delete Profile',
            age: 40,
          },
        ],
      },
    },

    // Step 2: Navigate to profiles
    {
      action: 'navigate',
      description: 'Navigate to profiles page',
      params: {
        url: 'http://localhost:3000/profiles',
      },
    },

    // Step 3: Wait for profile to appear
    {
      action: 'wait_for',
      description: 'Wait for test profile',
      params: {
        text: 'E2E Test Delete Profile',
        timeout: 10000,
      },
    },

    // Step 4: Click delete button
    {
      action: 'click',
      description: 'Click delete button',
      params: {
        element: 'Delete button',
        ref: '[data-testid="delete-profile"], button[aria-label*="delete"]:near(:text("E2E Test Delete Profile"))',
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

    // Step 6: Verify profile removed
    {
      action: 'snapshot',
      description: 'Capture profiles after deletion',
      params: {},
      screenshot: true,
    },

    // Step 7: Verify in database
    {
      action: 'verify_database',
      description: 'Verify profile deleted',
      params: {
        query: 'SELECT id FROM "FamilyProfile" WHERE "profileName" = \'E2E Test Delete Profile\'',
        assertion: 'rowCount === 0',
      },
    },
  ],

  cleanup: [
    {
      action: 'delete_record',
      params: {
        table: 'FamilyProfile',
        where: '"profileName" LIKE \'E2E Test%\'',
      },
    },
  ],
}

// =============================================================================
// TEST COLLECTION EXPORT
// =============================================================================

/**
 * All profiles E2E test specifications
 */
export const profilesE2ETests: E2ETestSpec[] = [
  profilesListViewing,
  createNewProfile,
  editProfile,
  manageAllergies,
  deleteProfile,
]

export default profilesE2ETests
