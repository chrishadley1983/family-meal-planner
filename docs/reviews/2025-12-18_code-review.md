# Code Review Report

**Generated:** 2025-12-18
**Mode:** full
**Reviewer:** Code Review Agent
**Branch:** main

---

## Summary

| Metric | Value |
|--------|-------|
| Files Reviewed | 6 |
| Lines Changed | ~2,200+ |
| Issues Found | 12 |
| Critical | 1 |
| High | 3 |
| Medium | 5 |
| Low | 3 |
| Test Suite Status | 7 failed, 631 passed |

### Verdict: Changes Required

1 critical issue and 3 high-priority issues must be resolved.

---

## Automated Checks

| Check | Status | Notes |
|-------|--------|-------|
| TypeScript | FAIL | Multiple errors - primarily in `.next/types/` generated files and test files |
| ESLint | FAIL | ESLint config issue preventing linting |
| Test Suite | PARTIAL | 7 tests failing, 631 passing |
| Security Scan | PASS | No secrets or vulnerabilities detected |

---

## Findings

### CR-001 - TypeScript Compilation Errors

**Severity:** High
**Category:** Correctness
**Files:** Multiple API routes and test files

**Description:**
TypeScript compilation is failing with 50+ errors. The main categories are:

1. **Next.js 15 Async Params Issue** - Multiple API routes have incorrect param types:
   ```
   .next/types/validator.ts: Type '{ params: { id: string; }; }' is not assignable to type '{ params: Promise<{ id: string; }>; }'
   ```

   Affected routes:
   - `app/api/meal-plans/[id]/route.ts`
   - `app/api/meal-plans/[id]/regenerate/route.ts`
   - `app/api/meal-plans/[id]/status/route.ts`
   - `app/api/meals/[id]/route.ts`
   - And several more dynamic routes

2. **Test File Type Errors** - Test files have outdated type assertions:
   - `tests/unit/emilia-arithmetic.test.ts` - Multiple `itemId`, `stapleId`, `recipeId` property errors
   - `tests/unit/ingredient-state.test.ts` - Property 'ingredients' does not exist on type 'never'
   - `tests/unit/meal-plan-settings.test.ts` - Tests expecting outdated descriptions

**Recommendation:**
- For Next.js 15 async params, update route handlers to use `await params` pattern:
  ```typescript
  export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    // ...
  }
  ```
- Update test files to match current interface definitions

---

### CR-002 - Failing Tests

**Severity:** High
**Category:** Testing
**Files:** `tests/unit/meal-plan-settings.test.ts`, `tests/unit/emilia-arithmetic.test.ts`

**Description:**
7 tests are failing:

1. **meal-plan-settings.test.ts** - 3 failures:
   - Tests expect `SHOPPING_MODE_DESCRIPTIONS` to contain rating boost numbers ('0.3', '0.5', '0.8') but descriptions have been changed
   - Tests expect `EXPIRY_PRIORITY_DESCRIPTIONS` to contain numbers but they now have user-friendly text
   - Test expects `allowDinnerForLunch` key in test fixture but it's missing

2. **emilia-arithmetic.test.ts** - Type errors with `itemId`, `stapleId`, `recipeId` properties

**Recommendation:**
Update tests to match current implementation:
- Fix description tests to match new user-friendly text
- Add `allowDinnerForLunch` to test fixtures
- Fix context types in arithmetic tests

---

### CR-003 - ESLint Configuration Broken

**Severity:** Medium
**Category:** Standards
**File:** `eslint.config.mjs`

**Description:**
ESLint cannot run due to a module resolution error:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'eslint-config-next/core-web-vitals'
```

**Recommendation:**
Update `eslint.config.mjs` to use the correct import path:
```javascript
import coreWebVitals from 'eslint-config-next/core-web-vitals.js'
```

---

### CR-004 - Duplicate String Normalization Functions

**Severity:** Low
**Category:** DRY/Reusability
**Files:**
- `app/api/meal-plans/generate/route.ts` (lines 576-602)
- `lib/inventory/duplicate-detection.ts`

**Description:**
`normalizeForComparison` and `calculateWordOverlap` functions are defined locally in the generate route when similar functionality exists in `lib/inventory/duplicate-detection.ts`.

**Recommendation:**
Extract shared string matching utilities to a common location like `lib/utils/string-matching.ts` and reuse across both modules.

---

### CR-005 - Large Monolithic Route Handler

**Severity:** Medium
**Category:** Maintainability
**File:** `app/api/meal-plans/generate/route.ts`

**Description:**
The `POST` handler is ~800 lines long with multiple responsibilities:
- Data fetching
- Settings adjustment
- Recipe filtering
- Meal plan generation
- Validation with retry logic
- Recipe ID fuzzy matching
- Servings calculation
- Database operations
- Macro calculations
- Summary building

**Recommendation:**
Consider extracting into smaller, focused modules:
- `lib/meal-plan/data-fetcher.ts` - Database queries
- `lib/meal-plan/settings-adjuster.ts` - Cooldown adjustments
- `lib/meal-plan/generator-service.ts` - Main orchestration
- `lib/meal-plan/recipe-matcher.ts` - Fuzzy matching logic

---

### CR-006 - Incomplete Type Exports

**Severity:** Low
**Category:** Correctness
**File:** `lib/meal-plan-validation.ts`

**Description:**
The `calculatePlanCoverage` function is private but its logic is duplicated in the prompt builder. Both files need to calculate what percentage of daily calories the plan covers.

**Recommendation:**
Export `calculatePlanCoverage` or extract the logic to a shared utility.

---

### CR-007 - Console Logging in Production Code

**Severity:** Low
**Category:** Standards
**Files:** Multiple validation and generation files

**Description:**
Extensive `console.log` statements throughout the codebase. While helpful for debugging, these should be:
- Behind a debug flag
- Using a proper logging library with levels
- Conditionally removed in production

**Examples:**
```typescript
console.log('validateBatchCooking - skipForMealTypes:', skipForMealTypes || 'EMPTY/UNDEFINED')
console.log('validateMealPlan called with options:', JSON.stringify({...}))
```

**Recommendation:**
Implement a logging abstraction with configurable levels (debug, info, warn, error).

---

### CR-008 - Prisma Import Warning

**Severity:** Critical
**Category:** Correctness
**Files:** Multiple API routes

**Description:**
The CLAUDE.md file mentions a recurring error:
```
Export default doesn't exist in target module
import prisma from '@/lib/prisma'
```

This indicates the prisma client export pattern is inconsistent with imports. The import uses `default` but the export may be named.

**Recommendation:**
Verify `lib/prisma.ts` exports correctly:
```typescript
// Named export (recommended)
export const prisma = new PrismaClient()

// In consuming files:
import { prisma } from '@/lib/prisma'
```

---

### CR-009 - Missing Validation for User Inputs

**Severity:** Medium
**Category:** Security
**File:** `app/api/meal-plans/generate/route.ts`

**Description:**
The `customInstructions` field is passed directly to the AI without sanitization. While this is intended behavior for AI prompts, there's no length validation or content filtering.

**Recommendation:**
Add input validation:
```typescript
if (customInstructions && customInstructions.length > 2000) {
  return NextResponse.json(
    { error: 'Custom instructions must be under 2000 characters' },
    { status: 400 }
  )
}
```

---

### CR-010 - Magic Numbers in Validation

**Severity:** Medium
**Category:** Maintainability
**File:** `lib/meal-plan-validation.ts`

**Description:**
Several magic numbers are used without named constants:
- Line 547: `hasBreakfast = mealCounts.breakfast >= 4` (4 days threshold)
- Line 664: `nutritionCoverage < 50` (50% threshold)
- Tolerance values (0.05, 0.10, 0.15, 0.25)

**Recommendation:**
Extract to named constants at the top of the file:
```typescript
const MIN_DAYS_FOR_MEAL_TYPE = 4
const MIN_NUTRITION_COVERAGE_PERCENT = 50
const TOLERANCE = {
  strict: 0.05,
  balanced: 0.10,
  calorie_banking: 0.15,
  weekend_relaxed: 0.25
} as const
```

---

### CR-011 - Inconsistent Meal Type Normalization

**Severity:** Medium
**Category:** Correctness
**File:** `lib/meal-plan-validation.ts`

**Description:**
Meal type normalization is done differently in various places:
- `normalizedMealType.replace(/\s+/g, '-')` in some places
- `mealType.toLowerCase().replace(/[\s_]+/g, '-')` in others
- Direct string comparisons like `includes('dinner')`

This could lead to edge cases being handled inconsistently.

**Recommendation:**
Create a single `normalizeMealType` utility function and use consistently:
```typescript
export function normalizeMealType(mealType: string): string {
  return mealType.toLowerCase().replace(/[\s_-]+/g, '-')
}
```

---

### CR-012 - Missing Error Boundary in Validation

**Severity:** Low
**Category:** Correctness
**File:** `lib/meal-plan-validation.ts`

**Description:**
The `validateMealPlan` function doesn't wrap its internal calls in try-catch. If any validation function throws an unexpected error, the entire generation process fails.

**Recommendation:**
Add error handling:
```typescript
try {
  const cooldownResult = validateCooldowns(...)
} catch (error) {
  console.error('Cooldown validation failed:', error)
  return { isValid: false, errors: ['Internal validation error'], warnings: [] }
}
```

---

## Test Coverage Analysis

| File | Coverage | Status |
|------|----------|--------|
| lib/meal-plan-validation.ts | Has tests | Tests exist in `tests/unit/meal-plan-validation.test.ts` |
| lib/meal-plan-prompt-builder.ts | Unknown | No specific test file found |
| lib/types/meal-plan-settings.ts | Has tests | Tests failing - needs update |
| app/api/meal-plans/generate/route.ts | Limited | No direct unit tests (API integration tests only) |

---

## Files Reviewed

| File | Lines | Issues |
|------|-------|--------|
| app/api/meal-plans/generate/route.ts | 1010 | 4 |
| lib/meal-plan-validation.ts | 941 | 4 |
| lib/meal-plan-prompt-builder.ts | 1233 | 1 |
| lib/types/meal-plan-settings.ts | 303 | 1 |
| app/meal-plans/[id]/page.tsx | ~700 | 0 |
| app/api/meal-plans/[id]/route.ts | ~400 | 1 |

---

## Recommended Actions

### Before Merge (Required)

1. [ ] **CR-008** Fix Prisma import/export pattern - this is causing 500 errors
2. [ ] **CR-001** Fix Next.js 15 async params in dynamic routes
3. [ ] **CR-002** Fix failing tests
4. [ ] **CR-003** Fix ESLint configuration

### Should Fix (Strongly Recommended)

5. [ ] **CR-005** Refactor large route handler into smaller modules
6. [ ] **CR-009** Add input validation for custom instructions
7. [ ] **CR-010** Extract magic numbers to named constants
8. [ ] **CR-011** Standardize meal type normalization

### Nice to Have

9. [ ] **CR-004** Extract duplicate string matching utilities
10. [ ] **CR-006** Export `calculatePlanCoverage` for reuse
11. [ ] **CR-007** Implement proper logging abstraction
12. [ ] **CR-012** Add error boundaries in validation

---

## Architecture Observations

### Positive Patterns

1. **Good separation of concerns** - Validation logic is properly separated from generation
2. **Smart retry mechanism** - AI generation includes validation with retry logic
3. **Comprehensive validation** - Cooldowns, batch cooking, macros, and meal types all validated
4. **Fuzzy matching recovery** - System attempts to recover from AI mistakes with recipe IDs
5. **Clear type definitions** - `MealPlanSettings` and related types are well-defined

### Areas for Improvement

1. **Route handler size** - 1000+ line handlers are hard to maintain
2. **Test coverage gaps** - New validation functions need more tests
3. **Type consistency** - Some `any` types could be tightened
4. **Configuration management** - Magic numbers should be configurable

---

## Security Checklist

| Check | Status |
|-------|--------|
| Authentication on all routes | PASS - All routes check `session?.user?.id` |
| Input validation | PARTIAL - Missing length limits on some fields |
| SQL Injection | PASS - Using Prisma ORM with parameterized queries |
| Data authorization | PASS - Queries filter by `userId` |
| Secrets exposure | PASS - No hardcoded secrets found |
| Rate limiting | NOT IMPLEMENTED - Consider adding for AI endpoints |

---

## Next Steps

1. Address critical Prisma import issue immediately
2. Fix TypeScript compilation errors in API routes
3. Update failing tests
4. Fix ESLint configuration
5. Consider refactoring large route handler
6. Re-run `/code-review staged` after fixes

---

**Approval Status**

| Reviewer | Status | Notes |
|----------|--------|-------|
| Code Review Agent | Changes Required | Fix critical and high issues |
| Human Reviewer | Pending | - |
