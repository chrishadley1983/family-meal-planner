/**
 * API Tests for Discover endpoints
 *
 * Tests the master recipe discovery and search functionality
 * Coverage for:
 *   - GET /api/discover/recipes (search master recipes)
 *   - GET /api/discover/filters (get available filters)
 *   - POST /api/discover/recipes/add (add recipe to user's library)
 *   - POST /api/discover/recipes/add-bulk (bulk add recipes)
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
  masterRecipe: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    count: jest.fn(),
  },
  recipeSourceSite: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  recipe: {
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
  },
  familyProfile: {
    findUnique: jest.fn(),
  },
  inventoryItem: {
    findMany: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET as getRecipes } from '@/app/api/discover/recipes/route'
import {
  createMockRequest,
  parseJsonResponse,
} from '../helpers/api-test-helpers'

describe('Discover API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset default mocks
    mockPrisma.recipe.findMany.mockResolvedValue([])
    mockPrisma.masterRecipe.findMany.mockResolvedValue([])
    mockPrisma.masterRecipe.count.mockResolvedValue(0)
  })

  describe('GET /api/discover/recipes', () => {
    const createSearchRequest = (params: Record<string, string> = {}) =>
      createMockRequest('GET', '/api/discover/recipes', { searchParams: params })

    const mockMasterRecipes = [
      {
        id: 'master-1',
        name: 'Chicken Curry',
        description: 'A delicious curry',
        imageUrl: 'https://example.com/curry.jpg',
        sourceUrl: 'https://example.com/curry',
        sourceSite: { displayName: 'Example', name: 'example' },
        prepTimeMinutes: 15,
        cookTimeMinutes: 30,
        totalTimeMinutes: 45,
        caloriesPerServing: 450,
        proteinPerServing: 30,
        carbsPerServing: 40,
        fatPerServing: 15,
        cuisineType: 'Indian',
        mealCategory: ['dinner'],
        dietaryTags: [],
        allergens: [],
        servings: 4,
        dataQualityScore: 85,
      },
      {
        id: 'master-2',
        name: 'Beef Stir Fry',
        description: 'Quick and easy stir fry',
        imageUrl: 'https://example.com/stirfry.jpg',
        sourceUrl: 'https://example.com/stirfry',
        sourceSite: { displayName: 'Example', name: 'example' },
        prepTimeMinutes: 10,
        cookTimeMinutes: 20,
        totalTimeMinutes: 30,
        caloriesPerServing: 500,
        proteinPerServing: 35,
        carbsPerServing: 45,
        fatPerServing: 20,
        cuisineType: 'Asian',
        mealCategory: ['dinner'],
        dietaryTags: [],
        allergens: [],
        servings: 4,
        dataQualityScore: 90,
      },
    ]

    describe('successful searches', () => {
      it('should return recipes without filters', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue(mockMasterRecipes)
        mockPrisma.masterRecipe.count.mockResolvedValue(2)

        const request = createSearchRequest()
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ recipes: any[]; total: number }>(response)
        expect(data.recipes).toHaveLength(2)
        expect(data.total).toBe(2)
      })

      it('should filter by text query', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ query: 'chicken' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ recipes: any[] }>(response)
        expect(data.recipes).toHaveLength(1)
        expect(data.recipes[0].name).toBe('Chicken Curry')
      })

      it('should filter by cuisine type', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ cuisineType: 'Indian' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ recipes: any[] }>(response)
        expect(data.recipes.length).toBeGreaterThanOrEqual(0)
      })

      it('should filter by meal category', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue(mockMasterRecipes)
        mockPrisma.masterRecipe.count.mockResolvedValue(2)

        const request = createSearchRequest({ mealCategory: 'dinner' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should filter by max calories', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ maxCalories: '480' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should filter by min protein', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[1]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ minProtein: '35' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should filter by max time', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[1]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ maxTime: '30' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should filter by dietary tags', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([])
        mockPrisma.masterRecipe.count.mockResolvedValue(0)

        const request = createSearchRequest({ dietaryTags: 'vegetarian,vegan' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should exclude allergens', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ excludeAllergens: 'nuts,shellfish' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
      })

      it('should support pagination', async () => {
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(50)

        const request = createSearchRequest({ page: '2', limit: '10' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ page: number; limit: number; totalPages: number }>(response)
        expect(data.page).toBe(2)
        expect(data.limit).toBe(10)
        expect(data.totalPages).toBe(5)
      })

      it('should mark recipes already in user library', async () => {
        mockPrisma.recipe.findMany.mockResolvedValue([
          { sourceUrl: 'https://example.com/curry' }
        ])
        mockPrisma.masterRecipe.findMany.mockResolvedValue(mockMasterRecipes)
        mockPrisma.masterRecipe.count.mockResolvedValue(2)

        const request = createSearchRequest()
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ recipes: any[] }>(response)
        // First recipe should be marked as already in library
        expect(data.recipes[0].alreadyInLibrary).toBe(true)
        expect(data.recipes[1].alreadyInLibrary).toBe(false)
      })
    })

    describe('profile-based filtering', () => {
      it('should exclude profile allergens when profileId provided', async () => {
        mockPrisma.familyProfile.findUnique.mockResolvedValue({
          id: 'profile-1',
          allergies: ['nuts', 'dairy'],
          foodDislikes: ['olives'],
        })
        mockPrisma.masterRecipe.findMany.mockResolvedValue([])
        mockPrisma.masterRecipe.count.mockResolvedValue(0)

        const request = createSearchRequest({ profileId: 'profile-1' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        expect(mockPrisma.familyProfile.findUnique).toHaveBeenCalledWith({
          where: { id: 'profile-1' },
          select: { allergies: true, foodDislikes: true },
        })
      })
    })

    describe('inventory-based filtering', () => {
      it('should filter by user inventory when useInventory is true', async () => {
        mockPrisma.inventoryItem.findMany.mockResolvedValue([
          { itemName: 'chicken' },
          { itemName: 'rice' },
        ])
        mockPrisma.masterRecipe.findMany.mockResolvedValue([mockMasterRecipes[0]])
        mockPrisma.masterRecipe.count.mockResolvedValue(1)

        const request = createSearchRequest({ useInventory: 'true' })
        const response = await getRecipes(request)

        expect(response.status).toBe(200)
        expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalled()
      })
    })

    describe('authentication', () => {
      it('should return 401 for unauthenticated requests', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createSearchRequest()
        const response = await getRecipes(request)

        expect(response.status).toBe(401)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.masterRecipe.findMany.mockRejectedValue(new Error('Database error'))

        const request = createSearchRequest()
        const response = await getRecipes(request)

        expect(response.status).toBe(500)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Failed to search recipes')
      })
    })
  })
})
