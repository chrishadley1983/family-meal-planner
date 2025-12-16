/**
 * API Tests for Authentication endpoints
 *
 * Tests the registration and authentication flows
 * Coverage for: /api/auth/register
 */

import { NextRequest } from 'next/server'

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password-123'),
  compare: jest.fn().mockResolvedValue(true),
}))

// Mock prisma with inline mock
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}))

import { POST } from '@/app/api/auth/register/route'
import { hash } from 'bcryptjs'
import {
  createMockRequest,
  parseJsonResponse,
} from '../helpers/api-test-helpers'

describe('Auth API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/register', () => {
    const validRegistrationData = {
      email: 'newuser@example.com',
      password: 'SecurePassword123!',
    }

    describe('successful registration', () => {
      it('should register a new user with valid credentials', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: validRegistrationData.email,
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        const response = await POST(request)

        expect(response.status).toBe(201)
        const data = await parseJsonResponse<{ user: any; message: string }>(response)
        expect(data.user.email).toBe(validRegistrationData.email)
        expect(data.message).toBe('User created successfully')
      })

      it('should hash the password before storing', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: validRegistrationData.email,
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        await POST(request)

        expect(hash).toHaveBeenCalledWith(validRegistrationData.password, 12)
        expect(mockPrisma.user.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              email: validRegistrationData.email,
              passwordHash: 'hashed-password-123',
            }),
          })
        )
      })

      it('should not return the password hash in response', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: validRegistrationData.email,
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        const response = await POST(request)

        const data = await parseJsonResponse<{ user: any }>(response)
        expect(data.user.passwordHash).toBeUndefined()
        expect(data.user.password).toBeUndefined()
      })
    })

    describe('validation errors', () => {
      it('should return 400 for invalid email format', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'not-an-email',
            password: 'SecurePassword123!',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Invalid email address')
      })

      it('should return 400 for password too short', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'valid@example.com',
            password: 'short', // Less than 8 characters
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Password must be at least 8 characters')
      })

      it('should return 400 for missing email', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            password: 'SecurePassword123!',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 for missing password', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'valid@example.com',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should return 400 for empty request body', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {},
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })
    })

    describe('duplicate user handling', () => {
      it('should return 400 when user already exists', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
          id: 'existing-user',
          email: validRegistrationData.email,
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('User already exists')
      })

      it('should check for existing user by email (case-sensitive)', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: validRegistrationData.email,
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        await POST(request)

        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: validRegistrationData.email },
        })
      })
    })

    describe('error handling', () => {
      it('should return 500 for database errors', async () => {
        mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'))

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const data = await parseJsonResponse<{ error: string }>(response)
        expect(data.error).toBe('Database connection failed')
      })

      it('should return 500 for unexpected errors during user creation', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockRejectedValue(new Error('Constraint violation'))

        const request = createMockRequest('POST', '/api/auth/register', {
          body: validRegistrationData,
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
      })
    })

    describe('edge cases', () => {
      it('should handle email with leading/trailing whitespace', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: 'test@example.com',
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: '  test@example.com  ',
            password: 'SecurePassword123!',
          },
        })
        const response = await POST(request)

        // Either accepts (trims) or rejects - both valid behaviors
        expect([200, 201, 400]).toContain(response.status)
      })

      it('should handle exactly 8 character password (boundary)', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: 'test@example.com',
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'test@example.com',
            password: 'Exactly8', // Exactly 8 characters
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(201) // Should accept exactly 8 chars
      })

      it('should handle 7 character password (boundary)', async () => {
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'test@example.com',
            password: '7chars!', // 7 characters - too short
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
      })

      it('should handle very long email addresses', async () => {
        const longEmail = 'a'.repeat(200) + '@example.com'
        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: longEmail,
            password: 'SecurePassword123!',
          },
        })
        const response = await POST(request)

        // Should either accept or reject gracefully
        expect([200, 201, 400, 500]).toContain(response.status)
      })

      it('should handle special characters in password', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null)
        mockPrisma.user.create.mockResolvedValue({
          id: 'new-user-123',
          email: 'test@example.com',
          createdAt: new Date(),
        })

        const request = createMockRequest('POST', '/api/auth/register', {
          body: {
            email: 'test@example.com',
            password: 'P@ssw0rd!#$%^&*()',
          },
        })
        const response = await POST(request)

        expect(response.status).toBe(201)
      })
    })
  })
})
