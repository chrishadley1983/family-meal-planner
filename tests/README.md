# Family Meal Planner - Regression Test Suite

Comprehensive automated test suite for the Family Meal Planner application. These tests can be triggered from the CLI by Claude Code for regular regression testing.

## Quick Start

```powershell
# Install test dependencies
npm install

# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run with coverage report
npm run test:coverage

# Run in watch mode (for development)
npm run test:watch
```

## Test Structure

```
tests/
├── unit/                           # Unit tests (no external dependencies)
│   ├── meal-plan-validation.test.ts   # Cooldown & batch cooking validation
│   ├── unit-conversion.test.ts        # Metric conversion tests
│   ├── expiry-calculations.test.ts    # Inventory expiry logic
│   ├── ingredient-normalization.test.ts # UK/US synonym mapping
│   ├── staples-calculations.test.ts   # Due date calculations
│   ├── nutritionist-calculations.test.ts # BMR, TDEE, macros
│   └── meal-plan-settings.test.ts     # Settings helpers
├── integration/                    # Integration tests (mocked DB)
│   └── api-mock-test.test.ts          # API logic with mocked Prisma
├── fixtures/                       # Test data
│   └── test-data.ts                   # Reusable test fixtures
├── mocks/                          # Mock implementations
│   └── prisma.ts                      # Mocked Prisma client
├── setup.ts                        # Jest setup & global utilities
└── README.md                       # This file
```

## Test Categories

### Unit Tests (`npm run test:unit`)

Unit tests verify individual functions in isolation without any external dependencies.

| Test File | Coverage | Description |
|-----------|----------|-------------|
| `meal-plan-validation.test.ts` | Meal Plan Validation | Tests cooldown period enforcement, batch cooking validation, day indexing |
| `unit-conversion.test.ts` | Unit Conversion | Tests metric conversion, unit compatibility, quantity combining |
| `expiry-calculations.test.ts` | Inventory Expiry | Tests expiry status, shelf life calculations, filtering, sorting |
| `ingredient-normalization.test.ts` | Ingredient Normalization | Tests UK/US synonyms, preparation stripping, duplicate detection |
| `staples-calculations.test.ts` | Staples Calculations | Tests frequency days, due dates, status calculations |
| `nutritionist-calculations.test.ts` | Nutritionist | Tests BMR, TDEE, macro calculations, activity normalization |
| `meal-plan-settings.test.ts` | Settings | Tests cooldown helpers, pantry staples, leftover shelf life |

### Integration Tests (`npm run test:integration`)

Integration tests verify API endpoint logic with a mocked Prisma client.

| Test File | Coverage | Description |
|-----------|----------|-------------|
| `api-mock-test.test.ts` | API Logic | Tests recipe, profile, inventory, meal plan, shopping list, staples APIs |

## Running Tests

### Basic Commands

```powershell
# Run all tests
npm test

# Run specific test file
npm test -- meal-plan-validation

# Run tests matching pattern
npm test -- --testNamePattern="cooldown"

# Run with verbose output
npm test -- --verbose

# Update snapshots (if any)
npm test -- --updateSnapshot
```

### Coverage Report

```powershell
# Generate coverage report
npm run test:coverage

# View HTML coverage report
# Open coverage/lcov-report/index.html in browser
```

Coverage thresholds are set to 60% for:
- Branches
- Functions
- Lines
- Statements

### CI Mode

```powershell
# Run tests in CI mode (exits on failure)
npm run test:ci
```

This mode:
- Runs all tests
- Generates coverage report
- Outputs JUnit XML for CI systems
- Forces exit after completion

### Custom Test Runner

```powershell
# Use the custom CLI test runner
npm run test:runner

# With options
npx ts-node scripts/run-tests.ts --unit --coverage
npx ts-node scripts/run-tests.ts --filter="validation"
npx ts-node scripts/run-tests.ts --help
```

## Test Utilities

### Global Setup (`tests/setup.ts`)

Provides global test utilities:

```typescript
import {
  mockDate,
  restoreDate,
  createTestUser,
  createTestProfile,
  createTestRecipe,
  createTestMealPlan,
  createTestInventoryItem,
  createTestStaple,
  defaultTestSettings,
} from '../setup'

// Mock current date for consistent tests
beforeEach(() => {
  mockDate('2024-01-10')
})

afterEach(() => {
  restoreDate()
})

// Create test data with defaults
const user = createTestUser({ email: 'custom@test.com' })
const recipe = createTestRecipe({ recipeName: 'My Recipe' })
```

### Test Fixtures (`tests/fixtures/test-data.ts`)

Pre-built test data for common scenarios:

```typescript
import {
  testMealPlanSettings,
  testMealsValid,
  testMealsCooldownViolation,
  testMealsBatchCookingError,
  testRecipeHistory,
  testInventoryItems,
  testStaples,
  testRecipes,
  testProfiles,
  testUnitConversions,
  testIngredientNormalization,
} from '../fixtures/test-data'
```

### Prisma Mock (`tests/mocks/prisma.ts`)

Mocked Prisma client for integration tests:

```typescript
import { mockPrismaClient, resetPrismaMocks } from '../mocks/prisma'

beforeEach(() => {
  resetPrismaMocks()
})

// Mock database responses
(mockPrismaClient.recipe.findMany as jest.Mock).mockResolvedValue([...])
```

## Writing New Tests

### Unit Test Template

```typescript
/**
 * [Feature] Tests
 * Tests for [description]
 */

import { functionToTest } from '@/lib/path-to-module'
import { mockDate, restoreDate } from '../setup'
import { testData } from '../fixtures/test-data'

describe('[Feature]', () => {
  beforeEach(() => {
    // Setup
  })

  afterEach(() => {
    // Cleanup
  })

  describe('functionToTest', () => {
    it('should [expected behavior]', () => {
      const result = functionToTest(input)
      expect(result).toBe(expected)
    })

    it('should handle edge cases', () => {
      // Test edge cases
    })
  })
})
```

### Integration Test Template

```typescript
import { mockPrismaClient, resetPrismaMocks } from '../mocks/prisma'

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrismaClient,
}))

describe('API Integration', () => {
  beforeEach(() => {
    resetPrismaMocks()
  })

  it('should handle [scenario]', async () => {
    ;(mockPrismaClient.model.method as jest.Mock).mockResolvedValue(mockData)

    const result = await mockPrismaClient.model.method()

    expect(result).toBeDefined()
    expect(mockPrismaClient.model.method).toHaveBeenCalled()
  })
})
```

## Test Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Meal Plan Validation | 90% | ✅ |
| Unit Conversion | 85% | ✅ |
| Expiry Calculations | 85% | ✅ |
| Ingredient Normalization | 80% | ✅ |
| Staples Calculations | 85% | ✅ |
| Nutritionist Calculations | 80% | ✅ |
| Settings Helpers | 90% | ✅ |
| API Logic (Mocked) | 70% | ✅ |

## Key Test Scenarios

### Meal Plan Validation

- ✅ Day index calculation for different week starts
- ✅ Cooldown enforcement within week
- ✅ Historical cooldown checking
- ✅ Batch cooking validation (chronological order)
- ✅ Leftover marking validation
- ✅ Serving count validation

### Unit Conversion

- ✅ Volume conversions (cups, tbsp, ml, L)
- ✅ Weight conversions (oz, lb, g, kg)
- ✅ Non-convertible units (pieces, cloves)
- ✅ Unit compatibility checking
- ✅ Quantity combining

### Inventory & Expiry

- ✅ Days until expiry calculation
- ✅ Shelf life calculation
- ✅ Expiry status (expired, expiring_soon, fresh)
- ✅ Filtering by status/category/location
- ✅ Sorting by expiry priority
- ✅ Small quantity detection

### Ingredient Normalization

- ✅ UK/US synonym mapping (eggplant → aubergine)
- ✅ Preparation stripping (diced onion → onion)
- ✅ Modifier stripping (organic → removed)
- ✅ Plural normalization
- ✅ Duplicate detection
- ✅ Similarity scoring

### Nutritionist Calculations

- ✅ BMR calculation (Mifflin-St Jeor)
- ✅ TDEE with activity multipliers
- ✅ Macro calculation for weight goals
- ✅ Deficit/surplus limits
- ✅ Activity level normalization

## Troubleshooting

### Tests Not Running

```powershell
# Clear Jest cache
npx jest --clearCache

# Check for TypeScript errors
npm run typecheck

# Reinstall dependencies
rm -rf node_modules; npm install
```

### Mock Issues

```powershell
# Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks()
  resetPrismaMocks()
})
```

### Date-Related Failures

```typescript
// Always mock dates in tests that depend on current time
beforeEach(() => {
  mockDate('2024-01-10')
})

afterEach(() => {
  restoreDate()
})
```

### Import Errors

Ensure `tsconfig.json` has the correct paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run Tests
  run: npm run test:ci

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

### Azure DevOps

```yaml
- script: npm run test:ci
  displayName: 'Run Tests'

- task: PublishTestResults@2
  inputs:
    testResultsFiles: 'test-results/junit.xml'
    testRunTitle: 'Jest Tests'
```

## Contributing

When adding new features:

1. Write tests FIRST (TDD encouraged)
2. Ensure 80%+ coverage for new code
3. Add test fixtures for complex data
4. Update this README if adding new test categories

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Main project instructions
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [ts-jest Documentation](https://kulshekhar.github.io/ts-jest/)
