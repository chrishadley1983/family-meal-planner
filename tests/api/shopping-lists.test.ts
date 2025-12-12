/**
 * API Tests for /api/shopping-lists endpoints
 *
 * Tests the shopping list management operations
 */

import { GET, POST } from '@/app/api/shopping-lists/route'
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

describe('Shopping Lists API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/shopping-lists', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET', '/api/shopping-lists')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return shopping lists for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockLists = [
        { ...testDataFactories.shoppingList({ id: 'sl-1', name: 'Weekly Shop' }), items: [], _count: { items: 5 } },
        { ...testDataFactories.shoppingList({ id: 'sl-2', name: 'Quick Run' }), items: [], _count: { items: 3 } },
      ]

      prismaMock.shoppingList.findMany.mockResolvedValue(mockLists as any)

      const request = createMockRequest('GET', '/api/shopping-lists')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ shoppingLists: unknown[] }>(response)
      expect(data.shoppingLists).toHaveLength(2)
    })

    it('should order shopping lists by creation date descending', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.shoppingList.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/shopping-lists')
      await GET(request)

      expect(prismaMock.shoppingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should include item count', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.shoppingList.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/shopping-lists')
      await GET(request)

      expect(prismaMock.shoppingList.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: expect.anything(),
          }),
        })
      )
    })
  })

  describe('POST /api/shopping-lists', () => {
    const validListData = {
      name: 'New Shopping List',
    }

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/shopping-lists', {
        body: validListData,
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a shopping list for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdList = {
        ...testDataFactories.shoppingList({ name: 'New Shopping List' }),
        items: [],
      }

      prismaMock.shoppingList.create.mockResolvedValue(createdList as any)

      const request = createMockRequest('POST', '/api/shopping-lists', {
        body: validListData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should generate default name if not provided', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.shoppingList.create.mockResolvedValue({
        ...testDataFactories.shoppingList(),
        items: [],
      } as any)

      const request = createMockRequest('POST', '/api/shopping-lists', {
        body: {},
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should create shopping list with initial items if provided', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const listWithItems = {
        name: 'Shopping List',
        items: [
          { itemName: 'Milk', quantity: 2, unit: 'litres' },
          { itemName: 'Bread', quantity: 1, unit: 'loaf' },
        ],
      }

      prismaMock.shoppingList.create.mockResolvedValue({
        ...testDataFactories.shoppingList({ name: 'Shopping List' }),
        items: listWithItems.items,
      } as any)

      const request = createMockRequest('POST', '/api/shopping-lists', {
        body: listWithItems,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should associate shopping list with authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.shoppingList.create.mockResolvedValue({
        ...testDataFactories.shoppingList(),
        items: [],
      } as any)

      const request = createMockRequest('POST', '/api/shopping-lists', {
        body: validListData,
      })
      await POST(request)

      expect(prismaMock.shoppingList.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUserId,
          }),
        })
      )
    })
  })
})
