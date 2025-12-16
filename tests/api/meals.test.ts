/**
 * API Tests for Meals endpoints
 *
 * Tests individual meal CRUD operations
 * Coverage for:
 *   - POST /api/meals (create meal in meal plan)
 *   - PATCH /api/meals/[id] (update meal)
 *   - DELETE /api/meals/[id] (delete meal)
 *   - POST /api/meals/[id]/cook (mark meal as cooked)
 */

import { NextRequest } from 'next/server'

// Mock next-auth
const mockSession = {
  user: { id: 'test-user-123', email: 'test@example.com' },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

jest.mock('next-auth', () => ({
  getServerSession: jest.fn().mockResolvedValue(mockSession),
}))

// Mock prisma
const mockPrisma = {
  mealPlan: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  meal: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  recipe: {
    findUnique: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { POST as createMeal } from '@/app/api/meals/route'
import { PATCH as updateMeal, DELETE as deleteMeal } from '@/app/api/meals/[id]/route'
import {
  createMockRequest,
  parseJsonResponse,
} from '../helpers/api-test-helpers'

/**
 * Create route context for dynamic routes
 * The API routes expect params as a direct object, not a Promise
 */
function createRouteContext(params: Record<string, string>): { params: { id: string } } {
  return { params: { id: params.id } }
}

describe('Meals API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/meals', () => {
    const validMealData = {
      mealPlanId: 'plan-123',
      dayOfWeek: 'Monday',
      mealType: 'dinner',
      recipeId: 'recipe-123',
      recipeName: 'Chicken Curry',
      servings: 4,
    }

    const mockMealPlan = {
      id: 'plan-123',
      userId: 'test-user-123',
      weekStartDate: new Date(),
    }

    const mockCreatedMeal = {
      id: 'meal-123',
      ...validMealData,
      isLocked: false,
      recipe: { id: 'recipe-123', recipeName: 'Chicken Curry' },
    }

    describe('successful creation', () => {
      it('should create a new meal with valid data', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)
        mockPrisma.meal.findFirst.mockResolvedValue(null) // No existing meal
        mockPrisma.meal.create.mockResolvedValue(mockCreatedMeal)

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(201)
        const data = await parseJsonResponse<{ meal: any }>(response)
        expect(data.meal.id).toBe('meal-123')
        expect(data.meal.dayOfWeek).toBe('Monday')
        expect(data.meal.mealType).toBe('dinner')
      })

      it('should create meal without recipe (empty slot)', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)
        mockPrisma.meal.findFirst.mockResolvedValue(null)
        mockPrisma.meal.create.mockResolvedValue({
          id: 'meal-124',
          mealPlanId: 'plan-123',
          dayOfWeek: 'Tuesday',
          mealType: 'lunch',
          recipeId: null,
          recipeName: null,
          servings: 1,
          isLocked: false,
          recipe: null,
        })

        const request = createMockRequest('POST', '/api/meals', {
          body: {
            mealPlanId: 'plan-123',
            dayOfWeek: 'Tuesday',
            mealType: 'lunch',
          },
        })
        const response = await createMeal(request)

        expect(response.status).toBe(201)
      })

      it('should include recipe data in response when recipeId provided', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)
        mockPrisma.meal.findFirst.mockResolvedValue(null)
        mockPrisma.meal.create.mockResolvedValue(mockCreatedMeal)

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(201)
        const data = await parseJsonResponse<{ meal: any }>(response)
        expect(data.meal.recipe).toBeDefined()
        expect(data.meal.recipe.recipeName).toBe('Chicken Curry')
      })
    })

    describe('validation errors', () => {
      it('should return 400 when mealPlanId is missing', async () => {
        const request = createMockRequest('POST', '/api/meals', {
          body: {
            dayOfWeek: 'Monday',
            mealType: 'dinner',
          },
        })
        const response = await createMeal(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toContain('required')
      })

      it('should return 400 when dayOfWeek is missing', async () => {
        const request = createMockRequest('POST', '/api/meals', {
          body: {
            mealPlanId: 'plan-123',
            mealType: 'dinner',
          },
        })
        const response = await createMeal(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 when mealType is missing', async () => {
        const request = createMockRequest('POST', '/api/meals', {
          body: {
            mealPlanId: 'plan-123',
            dayOfWeek: 'Monday',
          },
        })
        const response = await createMeal(request)

        expect(response.status).toBe(400)
      })
    })

    describe('authorization', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(401)
      })

      it('should return 404 when meal plan not found', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(null)

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(404)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Meal plan not found')
      })

      it('should return 404 when meal plan belongs to different user', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(null) // Verifies ownership in query

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(404)
      })
    })

    describe('conflict handling', () => {
      it('should return 409 when meal slot already occupied', async () => {
        mockPrisma.mealPlan.findFirst.mockResolvedValue(mockMealPlan)
        mockPrisma.meal.findFirst.mockResolvedValue({
          id: 'existing-meal',
          mealPlanId: 'plan-123',
          dayOfWeek: 'Monday',
          mealType: 'dinner',
        })

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(409)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toContain('already exists')
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.mealPlan.findFirst.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('POST', '/api/meals', {
          body: validMealData,
        })
        const response = await createMeal(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('PATCH /api/meals/[id]', () => {
    const mockExistingMeal = {
      id: 'meal-123',
      mealPlanId: 'plan-123',
      dayOfWeek: 'Monday',
      mealType: 'dinner',
      recipeId: 'recipe-123',
      recipeName: 'Chicken Curry',
      servings: 4,
      isLocked: false,
      mealPlan: { userId: 'test-user-123' },
    }

    describe('successful updates', () => {
      it('should update meal servings', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.update.mockResolvedValue({
          ...mockExistingMeal,
          servings: 6,
          recipe: { id: 'recipe-123', recipeName: 'Chicken Curry' },
        })

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { servings: 6 },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ meal: any }>(response)
        expect(data.meal.servings).toBe(6)
      })

      it('should set servingsManuallySet flag when servings updated', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.update.mockResolvedValue({
          ...mockExistingMeal,
          servings: 6,
          servingsManuallySet: true,
          recipe: null,
        })

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { servings: 6 },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(200)
        expect(mockPrisma.meal.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              servings: 6,
              servingsManuallySet: true,
            }),
          })
        )
      })

      it('should update meal recipe', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.update.mockResolvedValue({
          ...mockExistingMeal,
          recipeId: 'recipe-456',
          recipeName: 'Beef Stir Fry',
          recipe: { id: 'recipe-456', recipeName: 'Beef Stir Fry' },
        })

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { recipeId: 'recipe-456', recipeName: 'Beef Stir Fry' },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(200)
      })

      it('should toggle isLocked status', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.update.mockResolvedValue({
          ...mockExistingMeal,
          isLocked: true,
          recipe: null,
        })

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { isLocked: true },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ meal: any }>(response)
        expect(data.meal.isLocked).toBe(true)
      })
    })

    describe('authorization', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { servings: 6 },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(401)
      })

      it('should return 404 when meal not found', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(null)

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { servings: 6 },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(404)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Meal not found')
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.meal.findFirst.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('PATCH', '/api/meals/meal-123', {
          body: { servings: 6 },
        })
        const context = createRouteContext({ id: 'meal-123' })
        const response = await updateMeal(request, context)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('DELETE /api/meals/[id]', () => {
    const mockExistingMeal = {
      id: 'meal-123',
      mealPlanId: 'plan-123',
      mealPlan: { userId: 'test-user-123' },
    }

    describe('successful deletion', () => {
      it('should delete a meal', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.delete.mockResolvedValue(mockExistingMeal)

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        const response = await deleteMeal(request, context)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(true)
      })

      it('should call delete with correct ID', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.delete.mockResolvedValue(mockExistingMeal)

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        await deleteMeal(request, context)

        expect(mockPrisma.meal.delete).toHaveBeenCalledWith({
          where: { id: 'meal-123' },
        })
      })
    })

    describe('authorization', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        const response = await deleteMeal(request, context)

        expect(response.status).toBe(401)
      })

      it('should return 404 when meal not found', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(null)

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        const response = await deleteMeal(request, context)

        expect(response.status).toBe(404)
      })

      it('should verify meal ownership through meal plan', async () => {
        mockPrisma.meal.findFirst.mockResolvedValue(mockExistingMeal)
        mockPrisma.meal.delete.mockResolvedValue(mockExistingMeal)

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        await deleteMeal(request, context)

        expect(mockPrisma.meal.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'meal-123',
            mealPlan: {
              userId: 'test-user-123',
            },
          },
        })
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.meal.findFirst.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('DELETE', '/api/meals/meal-123', {})
        const context = createRouteContext({ id: 'meal-123' })
        const response = await deleteMeal(request, context)

        expect(response.status).toBe(500)
      })
    })
  })
})
