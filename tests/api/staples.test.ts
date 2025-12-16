/**
 * API Tests for Staples endpoints
 *
 * Tests the household staples management functionality
 * Coverage for:
 *   - GET /api/staples (list user's staples)
 *   - POST /api/staples (create staple)
 *   - PATCH /api/staples?id=xxx (update staple)
 *   - DELETE /api/staples?id=xxx (delete staple)
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
  staple: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET, POST, PATCH, DELETE } from '@/app/api/staples/route'
import {
  createMockRequest,
  parseJsonResponse,
} from '../helpers/api-test-helpers'

describe('Staples API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/staples', () => {
    const mockStaples = [
      {
        id: 'staple-1',
        userId: 'test-user-123',
        itemName: 'Milk',
        quantity: 2,
        unit: 'litres',
        category: 'Dairy',
        frequency: 'weekly',
        isActive: true,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'staple-2',
        userId: 'test-user-123',
        itemName: 'Bread',
        quantity: 1,
        unit: 'loaf',
        category: 'Bakery',
        frequency: 'weekly',
        isActive: true,
        notes: 'Wholemeal',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    describe('successful retrieval', () => {
      it('should return all staples for authenticated user', async () => {
        mockPrisma.staple.findMany.mockResolvedValue(mockStaples)

        const request = createMockRequest('GET', '/api/staples', {})
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ staples: any[] }>(response)
        expect(data.staples).toHaveLength(2)
        expect(data.staples[0].itemName).toBe('Milk')
      })

      it('should return empty array when no staples', async () => {
        mockPrisma.staple.findMany.mockResolvedValue([])

        const request = createMockRequest('GET', '/api/staples', {})
        const response = await GET(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ staples: any[] }>(response)
        expect(data.staples).toHaveLength(0)
      })

      it('should order staples by category then name', async () => {
        mockPrisma.staple.findMany.mockResolvedValue(mockStaples)

        const request = createMockRequest('GET', '/api/staples', {})
        await GET(request)

        expect(mockPrisma.staple.findMany).toHaveBeenCalledWith({
          where: { userId: 'test-user-123' },
          orderBy: [{ category: 'asc' }, { itemName: 'asc' }],
        })
      })
    })

    describe('authentication', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('GET', '/api/staples', {})
        const response = await GET(request)

        expect(response.status).toBe(401)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Unauthorized')
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.staple.findMany.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('GET', '/api/staples', {})
        const response = await GET(request)

        expect(response.status).toBe(500)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Internal server error')
      })
    })
  })

  describe('POST /api/staples', () => {
    const validStapleData = {
      itemName: 'Eggs',
      quantity: 12,
      unit: 'each',
      category: 'Dairy',
      frequency: 'weekly',
      isActive: true,
    }

    const mockCreatedStaple = {
      id: 'staple-new',
      userId: 'test-user-123',
      ...validStapleData,
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    describe('successful creation', () => {
      it('should create a staple with valid data', async () => {
        mockPrisma.staple.create.mockResolvedValue(mockCreatedStaple)

        const request = createMockRequest('POST', '/api/staples', {
          body: validStapleData,
        })
        const response = await POST(request)

        expect(response.status).toBe(201)
        const data = await parseJsonResponse<{ staple: any }>(response)
        expect(data.staple.itemName).toBe('Eggs')
        expect(data.staple.quantity).toBe(12)
      })

      it('should assign current user ID to new staple', async () => {
        mockPrisma.staple.create.mockResolvedValue(mockCreatedStaple)

        const request = createMockRequest('POST', '/api/staples', {
          body: validStapleData,
        })
        await POST(request)

        expect(mockPrisma.staple.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: 'test-user-123',
          }),
        })
      })

      it('should accept all valid frequency values', async () => {
        const frequencies = ['weekly', 'every_2_weeks', 'every_4_weeks', 'every_3_months']

        for (const frequency of frequencies) {
          mockPrisma.staple.create.mockResolvedValue({
            ...mockCreatedStaple,
            frequency,
          })

          const request = createMockRequest('POST', '/api/staples', {
            body: { ...validStapleData, frequency },
          })
          const response = await POST(request)

          expect(response.status).toBe(201)
        }
      })

      it('should use default frequency of weekly', async () => {
        const dataWithoutFrequency = {
          itemName: 'Eggs',
          quantity: 12,
          unit: 'each',
        }

        mockPrisma.staple.create.mockResolvedValue({
          ...mockCreatedStaple,
          frequency: 'weekly',
        })

        const request = createMockRequest('POST', '/api/staples', {
          body: dataWithoutFrequency,
        })
        const response = await POST(request)

        expect(response.status).toBe(201)
      })
    })

    describe('validation errors', () => {
      it('should return 400 for missing itemName', async () => {
        const request = createMockRequest('POST', '/api/staples', {
          body: {
            quantity: 12,
            unit: 'each',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 for empty itemName', async () => {
        const request = createMockRequest('POST', '/api/staples', {
          body: {
            itemName: '',
            quantity: 12,
            unit: 'each',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toContain('Item name is required')
      })

      it('should return 400 for non-positive quantity', async () => {
        const request = createMockRequest('POST', '/api/staples', {
          body: {
            itemName: 'Eggs',
            quantity: 0,
            unit: 'each',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 for negative quantity', async () => {
        const request = createMockRequest('POST', '/api/staples', {
          body: {
            itemName: 'Eggs',
            quantity: -5,
            unit: 'each',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 for invalid frequency', async () => {
        const request = createMockRequest('POST', '/api/staples', {
          body: {
            ...validStapleData,
            frequency: 'daily', // Invalid
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })
    })

    describe('authentication', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('POST', '/api/staples', {
          body: validStapleData,
        })
        const response = await POST(request)

        expect(response.status).toBe(401)
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.staple.create.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('POST', '/api/staples', {
          body: validStapleData,
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('PATCH /api/staples', () => {
    const mockExistingStaple = {
      id: 'staple-123',
      userId: 'test-user-123',
      itemName: 'Milk',
      quantity: 2,
      unit: 'litres',
      category: 'Dairy',
      frequency: 'weekly',
      isActive: true,
    }

    describe('successful updates', () => {
      it('should update staple quantity', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)
        mockPrisma.staple.update.mockResolvedValue({
          ...mockExistingStaple,
          quantity: 3,
        })

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ staple: any }>(response)
        expect(data.staple.quantity).toBe(3)
      })

      it('should update staple isActive status', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)
        mockPrisma.staple.update.mockResolvedValue({
          ...mockExistingStaple,
          isActive: false,
        })

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { isActive: false },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ staple: any }>(response)
        expect(data.staple.isActive).toBe(false)
      })

      it('should update multiple fields at once', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)
        mockPrisma.staple.update.mockResolvedValue({
          ...mockExistingStaple,
          quantity: 4,
          frequency: 'every_2_weeks',
          notes: 'Semi-skimmed',
        })

        const request = createMockRequest('PATCH', '/api/staples', {
          body: {
            quantity: 4,
            frequency: 'every_2_weeks',
            notes: 'Semi-skimmed',
          },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(200)
      })
    })

    describe('validation errors', () => {
      it('should return 400 when ID is missing', async () => {
        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Staple ID required')
      })

      it('should return 400 for invalid frequency', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { frequency: 'invalid' },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(400)
      })
    })

    describe('authorization', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(401)
      })

      it('should return 404 when staple not found', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(null)

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
          searchParams: { id: 'nonexistent' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(404)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Staple not found')
      })

      it('should return 403 when staple belongs to different user', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue({
          ...mockExistingStaple,
          userId: 'different-user',
        })

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(403)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Forbidden')
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.staple.findUnique.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('PATCH', '/api/staples', {
          body: { quantity: 3 },
          searchParams: { id: 'staple-123' },
        })
        const response = await PATCH(request)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('DELETE /api/staples', () => {
    const mockExistingStaple = {
      id: 'staple-123',
      userId: 'test-user-123',
      itemName: 'Milk',
    }

    describe('successful deletion', () => {
      it('should delete a staple', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)
        mockPrisma.staple.delete.mockResolvedValue(mockExistingStaple)

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'staple-123' },
        })
        const response = await DELETE(request)

        expect(response.status).toBe(200)
        const data = await parseJsonResponse<{ message: string }>(response)
        expect(data.message).toBe('Staple deleted successfully')
      })

      it('should call delete with correct ID', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(mockExistingStaple)
        mockPrisma.staple.delete.mockResolvedValue(mockExistingStaple)

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'staple-123' },
        })
        await DELETE(request)

        expect(mockPrisma.staple.delete).toHaveBeenCalledWith({
          where: { id: 'staple-123' },
        })
      })
    })

    describe('validation errors', () => {
      it('should return 400 when ID is missing', async () => {
        const request = createMockRequest('DELETE', '/api/staples', {})
        const response = await DELETE(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Staple ID required')
      })
    })

    describe('authorization', () => {
      it('should return 401 when not authenticated', async () => {
        const { getServerSession } = require('next-auth')
        getServerSession.mockResolvedValueOnce(null)

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'staple-123' },
        })
        const response = await DELETE(request)

        expect(response.status).toBe(401)
      })

      it('should return 404 when staple not found', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue(null)

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'nonexistent' },
        })
        const response = await DELETE(request)

        expect(response.status).toBe(404)
      })

      it('should return 403 when staple belongs to different user', async () => {
        mockPrisma.staple.findUnique.mockResolvedValue({
          ...mockExistingStaple,
          userId: 'different-user',
        })

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'staple-123' },
        })
        const response = await DELETE(request)

        expect(response.status).toBe(403)
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.staple.findUnique.mockRejectedValue(new Error('Database error'))

        const request = createMockRequest('DELETE', '/api/staples', {
          searchParams: { id: 'staple-123' },
        })
        const response = await DELETE(request)

        expect(response.status).toBe(500)
      })
    })
  })
})
