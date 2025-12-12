/**
 * API Tests for /api/inventory endpoints
 *
 * Tests the inventory management operations
 */

import { GET, POST, DELETE } from '@/app/api/inventory/route'
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

      prismaMock.inventoryItem.findMany.mockResolvedValue(mockItems as any)

      const request = createMockRequest('GET', '/api/inventory')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ items: unknown[] }>(response)
      expect(data.items).toHaveLength(3)
    })

    it('should filter by location when specified', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.inventoryItem.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/inventory', {
        searchParams: { location: 'fridge' },
      })
      await GET(request)

      expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: 'fridge',
          }),
        })
      )
    })

    it('should filter by category when specified', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.inventoryItem.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/inventory', {
        searchParams: { category: 'Protein' },
      })
      await GET(request)

      expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: 'Protein',
          }),
        })
      )
    })

    it('should only return active items by default', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.inventoryItem.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/inventory')
      await GET(request)

      expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
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

      prismaMock.inventoryItem.create.mockResolvedValue(createdItem as any)

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

    it('should support bulk item creation', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const bulkItems = {
        items: [
          { itemName: 'Chicken', quantity: 500, unit: 'g' },
          { itemName: 'Rice', quantity: 1, unit: 'kg' },
          { itemName: 'Milk', quantity: 2, unit: 'litres' },
        ],
      }

      prismaMock.inventoryItem.createMany.mockResolvedValue({ count: 3 })

      const request = createMockRequest('POST', '/api/inventory', {
        body: bulkItems,
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

    it('should soft delete inventory item', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      prismaMock.inventoryItem.findFirst.mockResolvedValue(
        testDataFactories.inventoryItem() as any
      )
      prismaMock.inventoryItem.update.mockResolvedValue(
        { ...testDataFactories.inventoryItem(), isActive: false } as any
      )

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'inv-123' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
    })

    it('should return 404 for non-existent item', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.inventoryItem.findFirst.mockResolvedValue(null)

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'non-existent' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })

    it('should not delete items belonging to other users', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      prismaMock.inventoryItem.findFirst.mockResolvedValue(null) // No match for this user

      const request = createMockRequest('DELETE', '/api/inventory', {
        searchParams: { id: 'other-users-item' },
      })
      const response = await DELETE(request)

      expect(response.status).toBe(404)
    })
  })
})
