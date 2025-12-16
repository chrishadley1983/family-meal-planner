/**
 * Integration Test Template
 *
 * Use this template when creating new integration tests.
 * Integration tests verify API endpoint behavior with a mocked database.
 *
 * Location: tests/integration/<feature-name>.test.ts or tests/api/<endpoint>.test.ts
 */

// =============================================================================
// IMPORTS
// =============================================================================

// Import mocked Prisma client
import { mockPrismaClient, resetPrismaMocks } from '../mocks/prisma'

// Mock Prisma before any imports that use it
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient,
}))

// Import test utilities
import { mockDate, restoreDate } from '../setup'

// Import test fixtures
import {
  createTestUser,
  createTestRecipe,
  // other fixtures...
} from '../fixtures/test-data'

// Import API route handlers (if testing directly)
// import { GET, POST, PUT, DELETE } from '@/app/api/endpoint/route'

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

// Mock NextAuth session
const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
  },
  expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
}

// Mock getServerSession
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(() => Promise.resolve(mockSession)),
}))

// =============================================================================
// TEST SUITE
// =============================================================================

/**
 * [API Endpoint] Integration Tests
 *
 * Tests for /api/[endpoint] route handlers
 *
 * Related files:
 * - app/api/[endpoint]/route.ts
 * - lib/related-module.ts
 */
describe('/api/[endpoint]', () => {
  // ===========================================================================
  // SETUP & TEARDOWN
  // ===========================================================================

  beforeAll(() => {
    // One-time setup
  })

  afterAll(() => {
    // One-time cleanup
  })

  beforeEach(() => {
    // Reset mocks before each test
    resetPrismaMocks()
    jest.clearAllMocks()
    mockDate('2024-01-10')
  })

  afterEach(() => {
    restoreDate()
  })

  // ===========================================================================
  // GET ENDPOINT
  // ===========================================================================

  describe('GET /api/[endpoint]', () => {
    // -------------------------------------------------------------------------
    // Success Cases
    // -------------------------------------------------------------------------

    it('should return list of items for authenticated user', async () => {
      // Arrange
      const mockItems = [
        createTestRecipe({ id: '1', recipeName: 'Recipe 1' }),
        createTestRecipe({ id: '2', recipeName: 'Recipe 2' }),
      ]

      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue(mockItems)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      // Assert
      expect(response.status).toBe(200)

      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      expect(mockPrismaClient.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockSession.user.id },
        })
      )
    })

    it('should return empty array when no items exist', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue([])

      // Act & Assert
      const response = await fetch('http://localhost:3000/api/recipes')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual([])
    })

    // -------------------------------------------------------------------------
    // Authentication Cases
    // -------------------------------------------------------------------------

    it('should return 401 when not authenticated', async () => {
      // Arrange - Override session mock for this test
      const { getServerSession } = require('next-auth')
      ;(getServerSession as jest.Mock).mockResolvedValueOnce(null)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes')

      // Assert
      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    // -------------------------------------------------------------------------
    // Error Cases
    // -------------------------------------------------------------------------

    it('should return 500 when database error occurs', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      )

      // Act
      const response = await fetch('http://localhost:3000/api/recipes')

      // Assert
      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })
  })

  // ===========================================================================
  // GET SINGLE ITEM
  // ===========================================================================

  describe('GET /api/[endpoint]/[id]', () => {
    it('should return single item by ID', async () => {
      // Arrange
      const mockItem = createTestRecipe({ id: 'test-id', recipeName: 'Test Recipe' })
      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(mockItem)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/test-id')

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBe('test-id')
    })

    it('should return 404 when item not found', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/nonexistent')

      // Assert
      expect(response.status).toBe(404)
    })

    it('should return 403 when accessing another user\'s item', async () => {
      // Arrange
      const otherUserItem = createTestRecipe({
        id: 'other-id',
        userId: 'other-user-id', // Different from session user
      })
      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(null) // findFirst with userId filter returns null

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/other-id')

      // Assert
      expect(response.status).toBe(404) // Returns 404 to avoid leaking info
    })
  })

  // ===========================================================================
  // POST ENDPOINT
  // ===========================================================================

  describe('POST /api/[endpoint]', () => {
    it('should create new item with valid data', async () => {
      // Arrange
      const newItem = {
        recipeName: 'New Recipe',
        servings: 4,
        cookTime: 30,
      }

      const createdItem = createTestRecipe({
        id: 'new-id',
        ...newItem,
        userId: mockSession.user.id,
      })

      ;(mockPrismaClient.recipe.create as jest.Mock).mockResolvedValue(createdItem)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      })

      // Assert
      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data.recipeName).toBe('New Recipe')
      expect(mockPrismaClient.recipe.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipeName: 'New Recipe',
            userId: mockSession.user.id,
          }),
        })
      )
    })

    it('should return 400 for invalid input', async () => {
      // Arrange - Missing required field
      const invalidItem = {
        // Missing recipeName
        servings: 4,
      }

      // Act
      const response = await fetch('http://localhost:3000/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidItem),
      })

      // Assert
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.success).toBe(false)
      expect(data.error).toContain('required')
    })

    it('should sanitize input data', async () => {
      // Arrange
      const inputWithXSS = {
        recipeName: '<script>alert("xss")</script>Cake',
        servings: 4,
      }

      ;(mockPrismaClient.recipe.create as jest.Mock).mockImplementation(({ data }) => {
        return Promise.resolve({ id: 'new-id', ...data })
      })

      // Act
      const response = await fetch('http://localhost:3000/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputWithXSS),
      })

      // Assert
      expect(response.status).toBe(201)
      // Verify the created data was sanitized (implementation-specific)
      const createCall = (mockPrismaClient.recipe.create as jest.Mock).mock.calls[0][0]
      expect(createCall.data.recipeName).not.toContain('<script>')
    })
  })

  // ===========================================================================
  // PUT/PATCH ENDPOINT
  // ===========================================================================

  describe('PUT /api/[endpoint]/[id]', () => {
    it('should update existing item', async () => {
      // Arrange
      const existingItem = createTestRecipe({ id: 'existing-id' })
      const updates = { recipeName: 'Updated Recipe' }
      const updatedItem = { ...existingItem, ...updates }

      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(existingItem)
      ;(mockPrismaClient.recipe.update as jest.Mock).mockResolvedValue(updatedItem)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/existing-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.recipeName).toBe('Updated Recipe')
    })

    it('should return 404 when updating non-existent item', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeName: 'Updated' }),
      })

      // Assert
      expect(response.status).toBe(404)
    })
  })

  // ===========================================================================
  // DELETE ENDPOINT
  // ===========================================================================

  describe('DELETE /api/[endpoint]/[id]', () => {
    it('should delete existing item', async () => {
      // Arrange
      const existingItem = createTestRecipe({ id: 'to-delete' })

      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(existingItem)
      ;(mockPrismaClient.recipe.delete as jest.Mock).mockResolvedValue(existingItem)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/to-delete', {
        method: 'DELETE',
      })

      // Assert
      expect(response.status).toBe(200)
      expect(mockPrismaClient.recipe.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'to-delete' },
        })
      )
    })

    it('should return 404 when deleting non-existent item', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findFirst as jest.Mock).mockResolvedValue(null)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes/nonexistent', {
        method: 'DELETE',
      })

      // Assert
      expect(response.status).toBe(404)
    })
  })

  // ===========================================================================
  // SPECIAL ENDPOINTS
  // ===========================================================================

  describe('POST /api/[endpoint]/special-action', () => {
    it('should perform special action successfully', async () => {
      // Test specialized endpoints like:
      // - /api/meal-plans/generate
      // - /api/recipes/import-url
      // - /api/shopping-lists/[id]/deduplicate

      // Arrange
      const actionInput = { /* action-specific input */ }
      const expectedResult = { /* expected outcome */ }

      // Mock related services/functions
      // ;(someService.doAction as jest.Mock).mockResolvedValue(expectedResult)

      // Act
      const response = await fetch('http://localhost:3000/api/endpoint/special-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actionInput),
      })

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })

  // ===========================================================================
  // PAGINATION TESTS
  // ===========================================================================

  describe('pagination', () => {
    it('should return paginated results', async () => {
      // Arrange
      const allItems = Array.from({ length: 25 }, (_, i) =>
        createTestRecipe({ id: `item-${i}`, recipeName: `Recipe ${i}` })
      )

      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue(allItems.slice(0, 10))
      ;(mockPrismaClient.recipe.count as jest.Mock).mockResolvedValue(25)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes?page=1&limit=10')

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(10)
      expect(data.pagination.total).toBe(25)
      expect(data.pagination.pages).toBe(3)
    })

    it('should handle page beyond available data', async () => {
      // Arrange
      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrismaClient.recipe.count as jest.Mock).mockResolvedValue(25)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes?page=100&limit=10')

      // Assert
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data).toHaveLength(0)
    })
  })

  // ===========================================================================
  // FILTERING/SEARCH TESTS
  // ===========================================================================

  describe('filtering and search', () => {
    it('should filter by query parameter', async () => {
      // Arrange
      const filteredItems = [createTestRecipe({ recipeName: 'Chicken Curry' })]

      ;(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue(filteredItems)

      // Act
      const response = await fetch('http://localhost:3000/api/recipes?search=chicken')

      // Assert
      expect(response.status).toBe(200)
      expect(mockPrismaClient.recipe.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipeName: expect.objectContaining({
              contains: 'chicken',
            }),
          }),
        })
      )
    })
  })
})

// =============================================================================
// HELPER FUNCTIONS FOR TESTS
// =============================================================================

/**
 * Creates a mock NextRequest for testing route handlers directly
 */
function createMockRequest(
  method: string,
  body?: Record<string, any>,
  searchParams?: Record<string, string>
): Request {
  const url = new URL('http://localhost:3000/api/test')

  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
}

/**
 * Extracts JSON from Response
 */
async function parseResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}
