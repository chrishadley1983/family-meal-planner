/**
 * API Tests for /api/nutritionist endpoints
 *
 * Tests the Emilia nutritionist chat and action endpoints
 */

import { POST as applyActionPOST } from '@/app/api/nutritionist/apply-action/route'
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

describe('Nutritionist API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/nutritionist/apply-action', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
        body: {
          action: {
            type: 'UPDATE_MACROS',
            data: {},
          },
        },
      })
      const response = await applyActionPOST(request)

      expect(response.status).toBe(401)
    })

    describe('UPDATE_MACROS action', () => {
      it('should update profile macros', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const profile = testDataFactories.profile()
        prismaMock.familyProfile.findFirst.mockResolvedValue(profile as any)
        prismaMock.familyProfile.update.mockResolvedValue({
          ...profile,
          dailyCalorieTarget: 2200,
          dailyProteinTarget: 170,
          dailyCarbsTarget: 200,
          dailyFatTarget: 60,
          dailyFiberTarget: 35,
        } as any)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'UPDATE_MACROS',
              label: 'Apply Macros',
              data: {
                profileId: profile.id,
                dailyCalorieTarget: 2200,
                dailyProteinTarget: 170,
                dailyCarbsTarget: 200,
                dailyFatTarget: 60,
                dailyFiberTarget: 35,
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(true)
      })

      it('should return 404 if profile not found', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        prismaMock.familyProfile.findFirst.mockResolvedValue(null)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'UPDATE_MACROS',
              label: 'Apply Macros',
              data: {
                profileId: 'non-existent',
                dailyCalorieTarget: 2200,
                dailyProteinTarget: 170,
                dailyCarbsTarget: 200,
                dailyFatTarget: 60,
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        expect(response.status).toBe(200) // Action returns success: false
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })

      it('should validate minimum calorie target', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'UPDATE_MACROS',
              label: 'Apply Macros',
              data: {
                profileId: 'profile-123',
                dailyCalorieTarget: 500, // Too low
                dailyProteinTarget: 170,
                dailyCarbsTarget: 200,
                dailyFatTarget: 60,
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        // Should fail validation
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })
    })

    describe('ADD_INVENTORY_ITEM action', () => {
      it('should add item to inventory', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const newItem = testDataFactories.inventoryItem({
          itemName: 'Chicken Breast',
        })
        prismaMock.inventoryItem.create.mockResolvedValue(newItem as any)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'ADD_INVENTORY_ITEM',
              label: 'Add to Inventory',
              data: {
                itemName: 'Chicken Breast',
                quantity: 500,
                unit: 'g',
                category: 'Protein',
                location: 'fridge',
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(true)
      })

      it('should validate required fields', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'ADD_INVENTORY_ITEM',
              label: 'Add to Inventory',
              data: {
                // Missing itemName, quantity, unit
                category: 'Protein',
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })
    })

    describe('ADD_STAPLE action', () => {
      it('should add item to staples', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const newStaple = testDataFactories.staple({
          itemName: 'Milk',
        })
        prismaMock.staple.create.mockResolvedValue(newStaple as any)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'ADD_STAPLE',
              label: 'Add to Staples',
              data: {
                itemName: 'Milk',
                quantity: 2,
                unit: 'litres',
                frequency: 'weekly',
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(true)
      })
    })

    describe('CREATE_RECIPE action', () => {
      it('should create a new recipe', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const newRecipe = testDataFactories.recipe({
          recipeName: 'AI Suggested Recipe',
        })
        prismaMock.recipe.create.mockResolvedValue({
          ...newRecipe,
          ingredients: [],
          instructions: [],
        } as any)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'CREATE_RECIPE',
              label: 'Create Recipe',
              data: {
                name: 'AI Suggested Recipe',
                description: 'A healthy recipe suggestion',
                servings: 4,
                prepTimeMinutes: 15,
                cookTimeMinutes: 30,
                cuisineType: 'Mediterranean',
                mealCategory: ['dinner'],
                caloriesPerServing: 450,
                proteinPerServing: 35,
                carbsPerServing: 40,
                fatPerServing: 18,
                fiberPerServing: 8,
                ingredients: [
                  { name: 'Chicken', quantity: 500, unit: 'g' },
                ],
                instructions: [
                  { stepNumber: 1, instruction: 'Prepare ingredients' },
                ],
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(true)
      })

      it('should validate recipe has required fields', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'CREATE_RECIPE',
              label: 'Create Recipe',
              data: {
                // Missing name, ingredients, instructions
                servings: 4,
              },
            },
          },
        })
        const response = await applyActionPOST(request)

        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })
    })

    describe('Unknown action type', () => {
      it('should return error for unknown action type', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'UNKNOWN_ACTION',
              label: 'Unknown',
              data: {},
            },
          },
        })
        const response = await applyActionPOST(request)

        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })
    })
  })
})
