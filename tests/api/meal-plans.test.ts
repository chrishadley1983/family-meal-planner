/**
 * API Tests for /api/meal-plans endpoints
 *
 * Tests the meal plan management operations
 */

import { GET, POST } from '@/app/api/meal-plans/route'
import { prismaMock } from '../mocks/prisma'
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  testDataFactories,
} from '../helpers/api-test-helpers'

// Mock next-auth
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}))

// Mock auth options
jest.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Meal Plans API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/meal-plans', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET', '/api/meal-plans')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return meal plans for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockMealPlans = [
        { ...testDataFactories.mealPlan({ id: 'mp-1', name: 'Week 1' }), meals: [] },
        { ...testDataFactories.mealPlan({ id: 'mp-2', name: 'Week 2' }), meals: [] },
      ]

      prismaMock.mealPlan.findMany.mockResolvedValue(mockMealPlans as any)

      const request = createMockRequest('GET', '/api/meal-plans')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ mealPlans: unknown[] }>(response)
      expect(data.mealPlans).toHaveLength(2)
    })

    it('should order meal plans by weekStarting descending', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.mealPlan.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/meal-plans')
      await GET(request)

      expect(prismaMock.mealPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { weekStarting: 'desc' },
        })
      )
    })

    it('should include meals with the meal plan', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.mealPlan.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/meal-plans')
      await GET(request)

      expect(prismaMock.mealPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            meals: expect.anything(),
          }),
        })
      )
    })
  })

  describe('POST /api/meal-plans', () => {
    const validMealPlanData = {
      name: 'New Week Plan',
      weekStarting: new Date().toISOString(),
    }

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/meal-plans', {
        body: validMealPlanData,
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a meal plan for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdMealPlan = {
        ...testDataFactories.mealPlan({ name: 'New Week Plan' }),
        meals: [],
      }

      prismaMock.mealPlan.create.mockResolvedValue(createdMealPlan as any)

      const request = createMockRequest('POST', '/api/meal-plans', {
        body: validMealPlanData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should associate meal plan with authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.mealPlan.create.mockResolvedValue({
        ...testDataFactories.mealPlan(),
        meals: [],
      } as any)

      const request = createMockRequest('POST', '/api/meal-plans', {
        body: validMealPlanData,
      })
      await POST(request)

      expect(prismaMock.mealPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUserId,
          }),
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.mealPlan.create.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('POST', '/api/meal-plans', {
        body: validMealPlanData,
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
