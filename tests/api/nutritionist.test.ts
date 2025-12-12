/**
 * API Tests for /api/nutritionist endpoints
 *
 * Tests the Emilia nutritionist chat and action endpoints
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
    update: jest.fn(),
  },
  recipe: {
    create: jest.fn(),
  },
  inventoryItem: {
    create: jest.fn(),
  },
  staple: {
    create: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

// Mock the actions module to avoid PrismaClient initialization
jest.mock('@/lib/nutritionist/actions', () => ({
  executeAction: jest.fn(),
  validateAction: jest.fn(),
}))

import { POST as applyActionPOST } from '@/app/api/nutritionist/apply-action/route'
import { getServerSession } from 'next-auth'
import { executeAction, validateAction } from '@/lib/nutritionist/actions'
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  testDataFactories,
} from '../helpers/api-test-helpers'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockExecuteAction = executeAction as jest.MockedFunction<typeof executeAction>
const mockValidateAction = validateAction as jest.MockedFunction<typeof validateAction>

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
        mockValidateAction.mockReturnValue({ valid: true, errors: [] })
        mockExecuteAction.mockResolvedValue({
          success: true,
          message: 'Macros updated',
          data: {},
        })

        const request = createMockRequest('POST', '/api/nutritionist/apply-action', {
          body: {
            action: {
              type: 'UPDATE_MACROS',
              label: 'Apply Macros',
              data: {
                profileId: 'profile-123',
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

      it('should return error for invalid action', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        mockValidateAction.mockReturnValue({
          valid: false,
          errors: ['Calories must be at least 800']
        })

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

        const data = await parseJsonResponse<{ success: boolean }>(response)
        expect(data.success).toBe(false)
      })
    })

    describe('ADD_INVENTORY_ITEM action', () => {
      it('should add item to inventory', async () => {
        mockGetServerSession.mockResolvedValue(mockSession)
        mockValidateAction.mockReturnValue({ valid: true, errors: [] })
        mockExecuteAction.mockResolvedValue({
          success: true,
          message: 'Item added',
          data: testDataFactories.inventoryItem({ itemName: 'Chicken Breast' }),
        })

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
        mockValidateAction.mockReturnValue({
          valid: false,
          errors: ['Missing item name', 'Quantity must be positive']
        })

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
        mockValidateAction.mockReturnValue({ valid: true, errors: [] })
        mockExecuteAction.mockResolvedValue({
          success: true,
          message: 'Staple added',
          data: testDataFactories.staple({ itemName: 'Milk' }),
        })

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
        mockValidateAction.mockReturnValue({ valid: true, errors: [] })
        mockExecuteAction.mockResolvedValue({
          success: true,
          message: 'Recipe created',
          data: testDataFactories.recipe({ recipeName: 'AI Suggested Recipe' }),
        })

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
        mockValidateAction.mockReturnValue({
          valid: false,
          errors: ['Missing recipe name', 'Recipe must have at least one ingredient']
        })

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
        mockValidateAction.mockReturnValue({
          valid: false,
          errors: ['Unknown action type']
        })

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
