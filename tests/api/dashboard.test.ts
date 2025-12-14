/**
 * API Tests for /api/dashboard endpoint
 *
 * Tests the dashboard data aggregation including:
 * - Authentication
 * - Weekly meals display with expandable rows (multiple meals per day)
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

// Dashboard response type - updated for expandable meals
interface DayMeal {
  type: string
  name: string
  recipeId: string | null
}

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
    meals: DayMeal[]
  }>
  plannedDays: number
  totalMeals: number
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

    describe('Weekly Meals - Multiple Meals Per Day', () => {
      /**
       * Tests the expandable meals feature where each day can have
       * multiple meals (breakfast, lunch, dinner, etc.)
       */
      it('should return multiple meals per day', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        // Setup meal plan with multiple meals per day
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
              mealType: 'breakfast',
              recipeId: 'recipe-1',
              recipeName: 'Greek Yogurt Bowl',
              recipe: { id: 'recipe-1', recipeName: 'Greek Yogurt Bowl' },
            },
            {
              id: 'meal-2',
              dayOfWeek: 'Sunday',
              mealType: 'lunch',
              recipeId: 'recipe-2',
              recipeName: 'Chicken Wrap',
              recipe: { id: 'recipe-2', recipeName: 'Chicken Wrap' },
            },
            {
              id: 'meal-3',
              dayOfWeek: 'Sunday',
              mealType: 'dinner',
              recipeId: 'recipe-3',
              recipeName: 'Teriyaki Salmon',
              recipe: { id: 'recipe-3', recipeName: 'Teriyaki Salmon' },
            },
            {
              id: 'meal-4',
              dayOfWeek: 'Monday',
              mealType: 'dinner',
              recipeId: 'recipe-4',
              recipeName: 'Pasta Bake',
              recipe: { id: 'recipe-4', recipeName: 'Pasta Bake' },
            },
          ],
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        // Sunday should have 3 meals
        const sundayMeals = data.weeklyMeals.find(m => m.day === 'Sunday')
        expect(sundayMeals?.meals).toHaveLength(3)
        expect(sundayMeals?.meals[0].type).toBe('Breakfast')
        expect(sundayMeals?.meals[0].name).toBe('Greek Yogurt Bowl')
        expect(sundayMeals?.meals[1].type).toBe('Lunch')
        expect(sundayMeals?.meals[2].type).toBe('Dinner')

        // Monday should have 1 meal
        const mondayMeals = data.weeklyMeals.find(m => m.day === 'Monday')
        expect(mondayMeals?.meals).toHaveLength(1)
        expect(mondayMeals?.meals[0].name).toBe('Pasta Bake')

        // Counts should reflect multiple meals
        expect(data.plannedDays).toBe(2) // Sunday and Monday
        expect(data.totalMeals).toBe(4) // 3 + 1
      })

      it('should sort meals by type order (breakfast, lunch, dinner)', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        // Meals in wrong order in database
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
              mealType: 'dinner', // Out of order
              recipeId: 'recipe-3',
              recipeName: 'Dinner Recipe',
              recipe: { id: 'recipe-3', recipeName: 'Dinner Recipe' },
            },
            {
              id: 'meal-2',
              dayOfWeek: 'Sunday',
              mealType: 'breakfast', // Out of order
              recipeId: 'recipe-1',
              recipeName: 'Breakfast Recipe',
              recipe: { id: 'recipe-1', recipeName: 'Breakfast Recipe' },
            },
            {
              id: 'meal-3',
              dayOfWeek: 'Sunday',
              mealType: 'lunch', // Out of order
              recipeId: 'recipe-2',
              recipeName: 'Lunch Recipe',
              recipe: { id: 'recipe-2', recipeName: 'Lunch Recipe' },
            },
          ],
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        // Meals should be sorted: breakfast, lunch, dinner
        const sundayMeals = data.weeklyMeals.find(m => m.day === 'Sunday')
        expect(sundayMeals?.meals[0].type).toBe('Breakfast')
        expect(sundayMeals?.meals[1].type).toBe('Lunch')
        expect(sundayMeals?.meals[2].type).toBe('Dinner')
      })

      it('should handle days with no meals', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const mockMealPlanWithNoMatchingMeals = {
          id: 'mp-123',
          userId: testUserId,
          weekStartDate: WEEK_START,
          weekEndDate: WEEK_END,
          status: 'Finalized',
          meals: [],
        }

        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlanWithNoMatchingMeals)

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<DashboardResponse>(response)

        // All days should have empty meals array
        expect(data.plannedDays).toBe(0)
        expect(data.totalMeals).toBe(0)
        data.weeklyMeals.forEach(day => {
          expect(day.meals).toEqual([])
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

      it('should include dayShort and dateDisplay for each day', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        const response = await GET(request)

        const data = await parseJsonResponse<DashboardResponse>(response)

        // Verify each day has required display fields
        data.weeklyMeals.forEach(day => {
          expect(day.dayShort).toBeDefined()
          expect(day.dayShort.length).toBe(3) // 'Sun', 'Mon', etc.
          expect(day.dateDisplay).toBeDefined()
          expect(day.dateDisplay).toMatch(/^\d{1,2} \w{3}$/) // '14 Dec', '15 Dec', etc.
          expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/) // ISO date format
          expect(day.meals).toBeDefined()
          expect(Array.isArray(day.meals)).toBe(true)
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
        const wednesdayDay = data.weeklyMeals.find(m => m.day === 'Wednesday')
        expect(wednesdayDay?.meals).toHaveLength(1)
        expect(wednesdayDay?.meals[0].name).toBe('Fish and Chips')
        expect(wednesdayDay?.meals[0].type).toBe('Dinner')
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

      it('should fetch ALL meal types (not just dinner)', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        setupDefaultMocks()

        const request = createMockRequest('GET', '/api/dashboard')
        await GET(request)

        // Verify query does NOT filter by mealType
        const callArgs = mockPrisma.mealPlan.findFirst.mock.calls[0][0]
        expect(callArgs.include.meals.where).toBeUndefined()
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
        expect(data.plannedDays).toBe(0)
        expect(data.totalMeals).toBe(0)
        expect(data.weeklyMeals).toHaveLength(7)
        data.weeklyMeals.forEach(day => {
          expect(day.meals).toEqual([])
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
