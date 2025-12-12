/**
 * API Tests for /api/inventory endpoints
 *
 * Tests the inventory management operations
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
  inventoryItem: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET, POST, DELETE } from '@/app/api/inventory/route'
import { getServerSession } from 'next-auth'
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  testDataFactories,
} from '../helpers/api-test-helpers'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Inventory API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/inventory', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET', '/api/inventory')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return inventory items for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockItems = [
        testDataFactories.inventoryItem({ id: 'inv-1', itemName: 'Chicken' }),
        testDataFactories.inventoryItem({ id: 'inv-2', itemName: 'Rice' }),
        testDataFactories.inventoryItem({ id: 'inv-3', itemName: 'Vegetables' }),
      ]

      mockPrisma.inventoryItem.findMany.mockResolvedValue(mockItems as any)

      const request = createMockRequest('GET', '/api/inventory')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ items: unknown[] }>(response)
      expect(data.items).toHaveLength(3)
    })

    it('should order by expiry date and category', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.inventoryItem.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/inventory')
      await GET(request)

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [
            { expiryDate: 'asc' },
            { category: 'asc' }
          ],
        })
      )
    })

    it('should filter by userId', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.inventoryItem.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/inventory')
      await GET(request)

      expect(mockPrisma.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: testUserId,
          },
        })
      )
    })
  })

  describe('POST /api/inventory', () => {
    const validItemData = {
      itemName: 'Chicken Breast',
      quantity: 500,
      unit: 'g',
      category: 'Protein',
      location: 'fridge',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/inventory', {
        body: validItemData,
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create an inventory item for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdItem = testDataFactories.inventoryItem({
        itemName: 'Chicken Breast',
      })

      mockPrisma.inventoryItem.create.mockResolvedValue(createdItem as any)

      const request = createMockRequest('POST', '/api/inventory', {
        body: validItemData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it('should validate required fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const invalidData = {
        // Missing itemName, quantity, unit
        category: 'Protein',
      }

      const request = createMockRequest('POST', '/api/inventory', {
        body: invalidData,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should validate quantity is positive', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const invalidData = {
        itemName: 'Chicken',
        quantity: -5,
        unit: 'g',
      }

      const request = createMockRequest('POST', '/api/inventory', {
        body: invalidData,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should set default values for optional fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdItem = testDataFactories.inventoryItem({
        itemName: 'Test Item',
        isActive: true,
        addedBy: 'manual',
      })

      mockPrisma.inventoryItem.create.mockResolvedValue(createdItem as any)

      const request = createMockRequest('POST', '/api/inventory', {
        body: validItemData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  describe('DELETE /api/inventory', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'inv-123' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(401)
    })

    it('should delete inventory item (hard delete)', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockItem = testDataFactories.inventoryItem({ userId: testUserId })
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(mockItem as any)
      mockPrisma.inventoryItem.delete.mockResolvedValue(mockItem as any)

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'inv-123' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
      expect(mockPrisma.inventoryItem.delete).toHaveBeenCalledWith({
        where: { id: 'inv-123' },
      })
    })

    it('should return 404 for non-existent item', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(null)

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'non-existent' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })

    it('should return 403 for items belonging to other users', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      // Item exists but belongs to different user
      const otherUserItem = testDataFactories.inventoryItem({ userId: 'other-user-456' })
      mockPrisma.inventoryItem.findUnique.mockResolvedValue(otherUserItem as any)

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'other-users-item' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(403)
    })

    it('should return 400 if no item ID provided', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const request = createMockRequest('DELETE', '/api/inventory')
      const response = await DELETE(request)

      expect(response.status).toBe(400)
    })
  })
})
