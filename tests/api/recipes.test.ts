/**
 * API Tests for /api/recipes endpoints
 *
 * Tests the recipes CRUD operations
 */

import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/recipes/route'
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

// Mock image generation
jest.mock('@/lib/generate-recipe-image', () => ({
  generateRecipeSVG: jest.fn().mockReturnValue('<svg></svg>'),
}))

import { getServerSession } from 'next-auth'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Recipes API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/recipes', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET', '/api/recipes')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await parseJsonResponse(response)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should return recipes for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockRecipes = [
        testDataFactories.recipe({ id: 'recipe-1', recipeName: 'Chicken Curry' }),
        testDataFactories.recipe({ id: 'recipe-2', recipeName: 'Beef Stew' }),
      ]

      prismaMock.recipe.findMany.mockResolvedValue(mockRecipes as any)

      const request = createMockRequest('GET', '/api/recipes')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ recipes: unknown[] }>(response)
      expect(data.recipes).toHaveLength(2)
      expect(data.recipes[0]).toMatchObject({ recipeName: 'Chicken Curry' })
    })

    it('should filter out archived recipes by default', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.recipe.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/recipes')
      await GET(request)

      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUserId,
            isArchived: false,
          }),
        })
      )
    })

    it('should include archived recipes when requested', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.recipe.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/recipes', {
        searchParams: { includeArchived: 'true' },
      })
      await GET(request)

      expect(prismaMock.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: testUserId,
          }),
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.recipe.findMany.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('GET', '/api/recipes')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await parseJsonResponse(response)
      expect(data).toEqual({ error: 'Internal server error' })
    })
  })

  describe('POST /api/recipes', () => {
    const validRecipeData = {
      recipeName: 'Test Recipe',
      description: 'A delicious test recipe',
      servings: 4,
      prepTimeMinutes: 15,
      cookTimeMinutes: 30,
      cuisineType: 'Italian',
      mealType: ['dinner'],
      ingredients: [
        { ingredientName: 'Chicken', quantity: 500, unit: 'g', sortOrder: 0 },
        { ingredientName: 'Rice', quantity: 200, unit: 'g', sortOrder: 1 },
      ],
      instructions: [
        { stepNumber: 1, instruction: 'Cook the chicken', sortOrder: 0 },
        { stepNumber: 2, instruction: 'Cook the rice', sortOrder: 1 },
      ],
    }

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/recipes', {
        body: validRecipeData,
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a recipe for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdRecipe = {
        ...testDataFactories.recipe({ recipeName: 'Test Recipe' }),
        ingredients: validRecipeData.ingredients,
        instructions: validRecipeData.instructions,
      }

      prismaMock.recipe.create.mockResolvedValue(createdRecipe as any)

      const request = createMockRequest('POST', '/api/recipes', {
        body: validRecipeData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await parseJsonResponse<{ recipe: unknown }>(response)
      expect(data.recipe).toMatchObject({ recipeName: 'Test Recipe' })
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const invalidData = {
        // Missing recipeName
        servings: 4,
      }

      const request = createMockRequest('POST', '/api/recipes', {
        body: invalidData,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate ingredient structure', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const invalidData = {
        recipeName: 'Test Recipe',
        ingredients: [
          { ingredientName: '', quantity: 0, unit: '' }, // Invalid
        ],
      }

      const request = createMockRequest('POST', '/api/recipes', {
        body: invalidData,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should calculate total time from prep and cook time', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.recipe.create.mockResolvedValue({
        ...testDataFactories.recipe(),
        ingredients: [],
        instructions: [],
      } as any)

      const request = createMockRequest('POST', '/api/recipes', {
        body: {
          recipeName: 'Quick Dish',
          prepTimeMinutes: 10,
          cookTimeMinutes: 20,
        },
      })
      await POST(request)

      expect(prismaMock.recipe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalTimeMinutes: 30,
          }),
        })
      )
    })
  })
})
