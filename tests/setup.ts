/**
 * Jest Test Setup
 * Global configuration and mocks for all tests
 */

import { jest } from '@jest/globals'

// Set test environment variables
;(process.env as Record<string, string>).NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing'
process.env.NEXTAUTH_URL = 'http://localhost:3000'

// Mock console methods to reduce noise in tests
const originalConsole = { ...console }

beforeAll(() => {
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log = jest.fn()
    console.warn = jest.fn()
    console.error = jest.fn()
  }
})

afterAll(() => {
  // Restore console
  console.log = originalConsole.log
  console.warn = originalConsole.warn
  console.error = originalConsole.error
})

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}

// Custom matcher for numeric ranges
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },
})

// Mock Date for consistent test results
export function mockDate(date: Date | string) {
  const mockedDate = new Date(date)
  jest.useFakeTimers()
  jest.setSystemTime(mockedDate)
}

export function restoreDate() {
  jest.useRealTimers()
}

// Test data factory helpers
export function createTestUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createTestProfile(overrides = {}) {
  return {
    id: 'test-profile-id',
    userId: 'test-user-id',
    profileName: 'Test User',
    age: 30,
    allergies: [],
    dietaryPreferences: null,
    foodLikes: [],
    foodDislikes: [],
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createTestRecipe(overrides = {}) {
  return {
    id: 'test-recipe-id',
    userId: 'test-user-id',
    recipeName: 'Test Recipe',
    description: 'A test recipe description',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    isActive: true,
    isFavorite: false,
    tags: [],
    source: 'manual',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createTestMealPlan(overrides = {}) {
  return {
    id: 'test-meal-plan-id',
    userId: 'test-user-id',
    weekStartDate: new Date('2024-01-08'),
    weekEndDate: new Date('2024-01-14'),
    status: 'Draft',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createTestInventoryItem(overrides = {}) {
  return {
    id: 'test-inventory-id',
    userId: 'test-user-id',
    itemName: 'Test Item',
    quantity: 500,
    unit: 'g',
    category: 'Fresh Produce',
    location: 'fridge' as const,
    purchaseDate: new Date('2024-01-01'),
    expiryDate: new Date('2024-01-15'),
    expiryIsEstimated: false,
    isActive: true,
    addedBy: 'manual' as const,
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

export function createTestStaple(overrides = {}) {
  return {
    id: 'test-staple-id',
    userId: 'test-user-id',
    itemName: 'Test Staple',
    quantity: 1,
    unit: 'pack',
    category: 'Cupboard Staples',
    frequency: 'weekly' as const,
    isActive: true,
    lastAddedDate: new Date('2024-01-01'),
    notes: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

// Default meal plan settings for tests
export const defaultTestSettings = {
  macroMode: 'balanced' as const,
  varietyEnabled: true,
  dinnerCooldown: 14,
  lunchCooldown: 7,
  breakfastCooldown: 3,
  snackCooldown: 2,
  minCuisines: 3,
  maxSameCuisine: 2,
  shoppingMode: 'moderate' as const,
  expiryPriority: 'moderate' as const,
  expiryWindow: 5,
  useItUpItems: [],
  batchCookingEnabled: true,
  maxLeftoverDays: 4,
  priorityOrder: ['macros', 'ratings', 'variety', 'shopping', 'prep', 'time'] as const,
  feedbackDetail: 'medium' as const,
}
