/**
 * API Tests for /api/profiles endpoints
 *
 * Tests the family profiles CRUD operations
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
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { GET, POST } from '@/app/api/profiles/route'
import { getServerSession } from 'next-auth'
import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
  testDataFactories,
} from '../helpers/api-test-helpers'

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

describe('Profiles API', () => {
  const testUserId = 'test-user-123'
  const mockSession = createMockSession(testUserId)

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/profiles', () => {
    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('GET', '/api/profiles')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await parseJsonResponse(response)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    it('should return profiles for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const mockProfiles = [
        testDataFactories.profile({ id: 'profile-1', profileName: 'Dad' }),
        testDataFactories.profile({ id: 'profile-2', profileName: 'Mum' }),
        testDataFactories.profile({ id: 'profile-3', profileName: 'Child' }),
      ]

      mockPrisma.familyProfile.findMany.mockResolvedValue(mockProfiles as any)

      const request = createMockRequest('GET', '/api/profiles')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await parseJsonResponse<{ profiles: unknown[] }>(response)
      expect(data.profiles).toHaveLength(3)
    })

    it('should only return profiles for the authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.familyProfile.findMany.mockResolvedValue([])

      const request = createMockRequest('GET', '/api/profiles')
      await GET(request)

      expect(mockPrisma.familyProfile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: testUserId },
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.familyProfile.findMany.mockRejectedValue(new Error('Database error'))

      const request = createMockRequest('GET', '/api/profiles')
      const response = await GET(request)

      expect(response.status).toBe(500)
    })
  })

  describe('POST /api/profiles', () => {
    const validProfileData = {
      profileName: 'New Family Member',
      age: 30,
      gender: 'female',
      heightCm: 165,
      currentWeightKg: 60,
      targetWeightKg: 58,
      goalType: 'lose',
      activityLevel: 'moderate',
    }

    it('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const request = createMockRequest('POST', '/api/profiles', {
        body: validProfileData,
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('should create a profile for authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const createdProfile = testDataFactories.profile({
        profileName: 'New Family Member',
      })

      mockPrisma.familyProfile.create.mockResolvedValue(createdProfile as any)

      const request = createMockRequest('POST', '/api/profiles', {
        body: validProfileData,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await parseJsonResponse<{ profile: unknown }>(response)
      expect(data.profile).toMatchObject({ profileName: 'New Family Member' })
    })

    it('should validate required profileName', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)

      const invalidData = {
        age: 30,
        gender: 'female',
        // Missing profileName
      }

      const request = createMockRequest('POST', '/api/profiles', {
        body: invalidData,
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should associate profile with authenticated user', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.familyProfile.create.mockResolvedValue(
        testDataFactories.profile() as any
      )

      const request = createMockRequest('POST', '/api/profiles', {
        body: validProfileData,
      })
      await POST(request)

      expect(mockPrisma.familyProfile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: testUserId,
          }),
        })
      )
    })

    it('should accept profiles without optional fields', async () => {
      mockGetServerSession.mockResolvedValue(mockSession)
      mockPrisma.familyProfile.create.mockResolvedValue(
        testDataFactories.profile({ profileName: 'Minimal Profile' }) as any
      )

      const minimalProfile = {
        profileName: 'Minimal Profile',
      }

      const request = createMockRequest('POST', '/api/profiles', {
        body: minimalProfile,
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })
})
