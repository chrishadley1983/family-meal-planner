/**
 * API Tests for /api/dashboard endpoint
 *
 * Tests the dashboard data aggregation including:
 * - Authentication
 * - Weekly meals display (CRITICAL: mealType case sensitivity)
 * - Shopping list summary
 * - Expiring items
 * - User counts
 */

// Mock next-auth BEFORE importing routes
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock prisma with inline mock
const mockPrisma = {
  familyProfile: {
    findFirst: jest.fn(),
    count: jest.fn(),
  },
  mealPlan: {
    findFirst: jest.fn(),
  },
  shoppingList: {
    findFirst: jest.fn(),
  },
  inventoryItem: {
    findMany: jest.fn(),
    count: jest.fn(),
  },
  recipe: {
    count: jest.fn(),
  },
  staple: {
    count: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET } from '@/app/api/dashboard/route'
import { getServerSession } from 'next-auth'
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
} from '../helpers/api-test-helpers'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

// Dashboard response type
interface DashboardResponse {
  user: {
    firstName: string
    familyName: string
    initials: string
    email: string
  }
  weekRange: {
    start: string
    end: string
    label: string
  }
  weeklyMeals: Array<{
    day: string
    dayShort: string
    date: string
    dateDisplay: string
    isToday: boolean
    dinner: string | null
    recipeId: string | null
    planned: boolean
  }>
  plannedCount: number
  mealPlanId: string | null
  shoppingList: {
    id: string | null
    total: number
    purchased: number
    categories: Array<{ name: string; count: number }>
  }
  expiringItems: Array<{
    id: string
    name: string
    quantity: string
    daysUntilExpiry: number
  }>
  counts: {
    recipes: number
    staplesDue: number
    inventoryItems: number
    familyMembers: number
  }
}

describe('Dashboard API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  // Fixed date for consistent testing
  const TODAY = new Date('2025-12-14T12:00:00.000Z')
  const WEEK_START = new Date('2025-12-13T00:00:00.000Z') // Saturday
  const WEEK_END = new Date('2025-12-19T00:00:00.000Z') // Friday

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock Date.now to return consistent date
    jest.useFakeTimers()
    jest.setSystemTime(TODAY)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('GET /api/dashboard', () => {
    describe('Authentication', () => {
      it('should return 401 when not authenticated', async () => {
        mockGetServerSession.mockResolvedValue(null)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Unauthorized')
      })

      it('should return 200 when authenticated', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
      })
    })

    describe('Weekly Meals - mealType Case Sensitivity', () => {
      /**
       * CRITICAL TEST: This tests the bug where mealType was queried as 'Dinner' (uppercase)
       * but stored as 'dinner' (lowercase) in the database.
       *
       * The database stores mealType in lowercase (e.g., 'dinner', 'lunch', 'breakfast')
       * as defined in lib/meal-plan-prompt-builder.ts and used throughout the codebase.
       */
      it('should query meals with lowercase mealType "dinner"', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        // Setup meal plan with LOWERCASE mealType (how database actually stores it)
        const mockMealPlan = {
          id: 'mp-123',
          userId: testUserId,
          weekStartDate: WEEK_START,
          weekEndDate: WEEK_END,
          status: 'Finalized',
          meals: [
            {
              id: 'meal-1',
              dayOfWeek: 'Sunday',
              mealType: 'dinner', // LOWERCASE - as stored in database
              recipeId: 'recipe-1',
              recipeName: 'Teriyaki Chicken',
              recipe: { id: 'recipe-1', recipeName: 'Teriyaki Chicken' },
            },
            {
              id: 'meal-2',
              dayOfWeek: 'Monday',
              mealType: 'dinner', // LOWERCASE - as stored in database
              recipeId: 'recipe-2',
              recipeName: 'Pasta Bake',
              recipe: { id: 'recipe-2', recipeName: 'Pasta Bake' },
            },
          ],
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        // Verify meals were found (wouldn't work if query used uppercase 'Dinner')
        const sundayMeal = data.weeklyMeals.find(m => m.day === 'Sunday')
        const mondayMeal = data.weeklyMeals.find(m => m.day === 'Monday')

        expect(sundayMeal?.dinner).toBe('Teriyaki Chicken')
        expect(sundayMeal?.planned).toBe(true)
        expect(mondayMeal?.dinner).toBe('Pasta Bake')
        expect(mondayMeal?.planned).toBe(true)

        // Verify the query used lowercase 'dinner'
        expect(mockPrisma.mealPlan.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              meals: expect.objectContaining({
                where: { mealType: 'dinner' }, // MUST be lowercase
              }),
            }),
          })
        )
      })

      it('should NOT find meals if mealType case does not match', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        // This simulates what happened when the bug existed:
        // The query asked for 'Dinner' but database had 'dinner'
        // Result: empty meals array even though meals existed
        const mockMealPlanWithNoMatchingMeals = {
          id: 'mp-123',
          userId: testUserId,
          weekStartDate: WEEK_START,
          weekEndDate: WEEK_END,
          status: 'Finalized',
          meals: [], // Empty because Prisma filter didn't match
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlanWithNoMatchingMeals)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        // All meals should show as unplanned
        expect(data.plannedCount).toBe(0)
        data.weeklyMeals.forEach(meal => {
          expect(meal.dinner).toBeNull()
          expect(meal.planned).toBe(false)
        })
      })
    })

    describe('Weekly Meals Structure', () => {
      it('should return 7 days starting from today', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.weeklyMeals).toHaveLength(7)

        // First day should be today (Sunday Dec 14)
        expect(data.weeklyMeals[0].isToday).toBe(true)
        expect(data.weeklyMeals[0].day).toBe('Sunday')
        expect(data.weeklyMeals[0].dayShort).toBe('Sun')
        expect(data.weeklyMeals[0].dateDisplay).toBe('14 Dec')

        // Remaining days should not be today
        for (let i = 1; i < 7; i++) {
          expect(data.weeklyMeals[i].isToday).toBe(false)
        }
      })

      it('should include dayShort and dateDisplay for each meal', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        // Verify each meal has required display fields
        data.weeklyMeals.forEach(meal => {
          expect(meal.dayShort).toBeDefined()
          expect(meal.dayShort.length).toBe(3) // 'Sun', 'Mon', etc.
          expect(meal.dateDisplay).toBeDefined()
          expect(meal.dateDisplay).toMatch(/^\d{1,2} \w{3}$/) // '14 Dec', '15 Dec', etc.
          expect(meal.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
        })
      })

      it('should correctly match meals by full day name', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const mockMealPlan = {
          id: 'mp-123',
          userId: testUserId,
          weekStartDate: WEEK_START,
          weekEndDate: WEEK_END,
          status: 'Finalized',
          meals: [
            {
              id: 'meal-wed',
              dayOfWeek: 'Wednesday', // Full day name as stored in database
              mealType: 'dinner',
              recipeId: 'recipe-3',
              recipeName: 'Fish and Chips',
              recipe: { id: 'recipe-3', recipeName: 'Fish and Chips' },
            },
          ],
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        // Wednesday meal should be found (3 days from Sunday)
        const wednesdayMeal = data.weeklyMeals.find(m => m.day === 'Wednesday')
        expect(wednesdayMeal?.dinner).toBe('Fish and Chips')
        expect(wednesdayMeal?.planned).toBe(true)
      })
    })

    describe('Meal Plan Query', () => {
      it('should find meal plan that covers today', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        await GET(request)

        // Verify query looks for meal plan covering today
        expect(mockPrisma.mealPlan.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId: testUserId,
              weekStartDate: { lte: expect.any(Date) },
              weekEndDate: { gte: expect.any(Date) },
            }),
          })
        )
      })

      it('should handle no meal plan gracefully', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()
        mockPrisma.mealPlan.findFirst.mockResolvedValue(null)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.mealPlanId).toBeNull()
        expect(data.plannedCount).toBe(0)
        expect(data.weeklyMeals).toHaveLength(7)
        data.weeklyMeals.forEach(meal => {
          expect(meal.dinner).toBeNull()
          expect(meal.planned).toBe(false)
        })
      })
    })

    describe('Shopping List Summary', () => {
      it('should return shopping list with categories', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const mockShoppingList = {
          id: 'sl-123',
          userId: testUserId,
          status: 'Active',
          items: [
            { id: 'i1', category: 'Fresh Produce', isPurchased: false },
            { id: 'i2', category: 'Fresh Produce', isPurchased: true },
            { id: 'i3', category: 'Meat', isPurchased: false },
            { id: 'i4', category: 'Dairy', isPurchased: false },
          ],
        }

        mockPrisma.shoppingList.findFirst.mockResolvedValue(mockShoppingList)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.shoppingList.id).toBe('sl-123')
        expect(data.shoppingList.total).toBe(4)
        expect(data.shoppingList.purchased).toBe(1)
        expect(data.shoppingList.categories).toBeDefined()
        expect(data.shoppingList.categories.length).toBeGreaterThan(0)
      })

      it('should handle no shopping list gracefully', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()
        mockPrisma.shoppingList.findFirst.mockResolvedValue(null)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.shoppingList.id).toBeNull()
        expect(data.shoppingList.total).toBe(0)
        expect(data.shoppingList.purchased).toBe(0)
      })
    })

    describe('Expiring Items', () => {
      it('should return items expiring within 3 days', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const tomorrow = new Date(TODAY)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const mockExpiringItems = [
          {
            id: 'inv-1',
            itemName: 'Chicken Breast',
            quantity: 500,
            unit: 'g',
            expiryDate: tomorrow,
          },
        ]

        mockPrisma.inventoryItem.findMany.mockResolvedValue(mockExpiringItems)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.expiringItems).toHaveLength(1)
        expect(data.expiringItems[0].name).toBe('Chicken Breast')
        expect(data.expiringItems[0].quantity).toBe('500 g')
        expect(data.expiringItems[0].daysUntilExpiry).toBe(2) // Tomorrow = 1 day + 1
      })
    })

    describe('User Info', () => {
      it('should return user info from main profile', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const mockProfile = {
          id: 'profile-123',
          userId: testUserId,
          profileName: 'Chris Hadley',
          isMainUser: true,
        }

        mockPrisma.familyProfile.findFirst.mockResolvedValue(mockProfile)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.user.firstName).toBe('Chris')
        expect(data.user.familyName).toBe('Hadley Family')
        expect(data.user.initials).toBe('CH')
      })

      it('should fallback to email when no profile exists', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()
        mockPrisma.familyProfile.findFirst.mockResolvedValue(null)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.user.firstName).toBe('test') // From test@example.com
      })
    })

    describe('Counts', () => {
      it('should return correct counts', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        mockPrisma.recipe.count.mockResolvedValue(25)
        mockPrisma.staple.count.mockResolvedValue(10)
        mockPrisma.inventoryItem.count.mockResolvedValue(50)
        mockPrisma.familyProfile.count.mockResolvedValue(4)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        expect(data.counts.recipes).toBe(25)
        expect(data.counts.staplesDue).toBe(10)
        expect(data.counts.inventoryItems).toBe(50)
        expect(data.counts.familyMembers).toBe(4)
      })
    })
  })

  /**
   * Helper to setup default mocks for happy path tests
   */
  function setupDefaultMocks() {
    mockPrisma.familyProfile.findFirst.mockResolvedValue({
      id: 'profile-123',
      userId: testUserId,
      profileName: 'Test User',
      isMainUser: true,
    })
    mockPrisma.familyProfile.count.mockResolvedValue(1)
    mockPrisma.mealPlan.findFirst.mockResolvedValue({
      id: 'mp-123',
      userId: testUserId,
      weekStartDate: WEEK_START,
      weekEndDate: WEEK_END,
      status: 'Draft',
      meals: [],
    })
    mockPrisma.shoppingList.findFirst.mockResolvedValue(null)
    mockPrisma.inventoryItem.findMany.mockResolvedValue([])
    mockPrisma.inventoryItem.count.mockResolvedValue(0)
    mockPrisma.recipe.count.mockResolvedValue(0)
    mockPrisma.staple.count.mockResolvedValue(0)
  }
})
