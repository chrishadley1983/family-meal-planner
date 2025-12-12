/**
 * API Test Helpers for Next.js App Router
 *
 * Provides utilities to test API routes without spinning up a server.
 * Mocks NextRequest/NextResponse and common dependencies.
 */

import { NextRequest } from 'next/server'

/**
 * Creates a mock NextRequest for testing API routes
 */
export function createMockRequest(
  method: string,
  url: string,
  options: {
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  const { body, headers = {}, searchParams = {} } = options

  // Build URL with search params
  const urlObj = new URL(url, 'http://localhost:3000')
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value)
  })

  // Create request init
  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body)
  }

  return new NextRequest(urlObj.toString(), init)
}

/**
 * Creates a mock authenticated request with session
 */
export function createAuthenticatedRequest(
  method: string,
  url: string,
  userId: string,
  options: {
    body?: unknown
    headers?: Record<string, string>
    searchParams?: Record<string, string>
  } = {}
): NextRequest {
  return createMockRequest(method, url, {
    ...options,
    headers: {
      ...options.headers,
      // Mock auth header - actual auth checking is mocked separately
      'x-test-user-id': userId,
    },
  })
}

/**
 * Parses JSON response from API route
 */
export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Failed to parse JSON response: ${text}`)
  }
}

/**
 * Standard API response type
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Mock session for authenticated routes
 */
export interface MockSession {
  user: {
    id: string
    email: string
    name: string
  }
  expires: string
}

/**
 * Creates a mock session
 */
export function createMockSession(userId: string = 'test-user-123'): MockSession {
  return {
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

/**
 * Mock getServerSession for auth
 */
export function mockGetServerSession(session: MockSession | null) {
  return jest.fn().mockResolvedValue(session)
}

/**
 * Creates route context with params for dynamic routes
 */
export function createRouteContext(params: Record<string, string>) {
  return { params: Promise.resolve(params) }
}

/**
 * Test data factories
 */
export const testDataFactories = {
  recipe: (overrides: Partial<{
    id: string
    userId: string
    recipeName: string
    servings: number
    caloriesPerServing: number
    proteinPerServing: number
    carbsPerServing: number
    fatPerServing: number
  }> = {}) => ({
    id: 'recipe-123',
    userId: 'test-user-123',
    recipeName: 'Test Recipe',
    description: 'A test recipe',
    servings: 4,
    prepTimeMinutes: 15,
    cookTimeMinutes: 30,
    totalTimeMinutes: 45,
    cuisineType: 'Italian',
    mealType: ['dinner'],
    caloriesPerServing: 400,
    proteinPerServing: 30,
    carbsPerServing: 40,
    fatPerServing: 15,
    fiberPerServing: 5,
    recipeSource: 'manual',
    isFavorite: false,
    timesUsed: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  profile: (overrides: Partial<{
    id: string
    userId: string
    profileName: string
    age: number
    gender: string
  }> = {}) => ({
    id: 'profile-123',
    userId: 'test-user-123',
    profileName: 'Test Profile',
    age: 35,
    gender: 'male',
    heightCm: 180,
    currentWeightKg: 80,
    targetWeightKg: 75,
    goalType: 'lose',
    goalTimeframeWeeks: 12,
    activityLevel: 'moderate',
    dailyCalorieTarget: 2200,
    dailyProteinTarget: 170,
    dailyCarbsTarget: 200,
    dailyFatTarget: 60,
    dailyFiberTarget: 35,
    macroTrackingEnabled: true,
    allergies: [],
    foodLikes: [],
    foodDislikes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  inventoryItem: (overrides: Partial<{
    id: string
    userId: string
    itemName: string
    quantity: number
    unit: string
  }> = {}) => ({
    id: 'inventory-123',
    userId: 'test-user-123',
    itemName: 'Chicken Breast',
    quantity: 500,
    unit: 'g',
    category: 'Protein',
    location: 'fridge',
    expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    isActive: true,
    addedBy: 'manual',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  mealPlan: (overrides: Partial<{
    id: string
    userId: string
    weekStarting: Date
  }> = {}) => ({
    id: 'mealplan-123',
    userId: 'test-user-123',
    name: 'Test Meal Plan',
    weekStarting: new Date(),
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  shoppingList: (overrides: Partial<{
    id: string
    userId: string
    name: string
  }> = {}) => ({
    id: 'shoppinglist-123',
    userId: 'test-user-123',
    name: 'Test Shopping List',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  staple: (overrides: Partial<{
    id: string
    userId: string
    itemName: string
  }> = {}) => ({
    id: 'staple-123',
    userId: 'test-user-123',
    itemName: 'Milk',
    quantity: 2,
    unit: 'litres',
    category: 'Dairy',
    frequency: 'weekly',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),
}

/**
 * Assertion helpers
 */
export const apiAssertions = {
  /**
   * Assert response is successful with data
   */
  assertSuccess<T>(response: ApiResponse<T>): asserts response is ApiResponse<T> & { success: true; data: T } {
    expect(response.success).toBe(true)
    expect(response.data).toBeDefined()
  },

  /**
   * Assert response is an error
   */
  assertError(response: ApiResponse): asserts response is ApiResponse & { success: false; error: string } {
    expect(response.success).toBe(false)
    expect(response.error).toBeDefined()
  },

  /**
   * Assert response status code
   */
  assertStatus(response: Response, expectedStatus: number) {
    expect(response.status).toBe(expectedStatus)
  },
}
