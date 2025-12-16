# Test Coverage Analysis Report

**Generated:** 2025-12-16T00:00:00Z
**Project:** Family Meal Planner
**Analysis Mode:** Full Gap Analysis

---

## Executive Summary

| Metric | Value | Status |
|--------|-------|--------|
| **Total Features** | 16 | - |
| **Total Test Files** | 22 | - |
| **Total Tests (Estimated)** | ~236 | - |
| **Overall Coverage Score** | 52% | NEEDS IMPROVEMENT |
| **Critical Gaps** | 4 | BLOCKING |
| **High Gaps** | 8 | ACTION REQUIRED |
| **Medium Gaps** | 12 | RECOMMENDED |
| **E2E Tests** | 0 | MISSING |

### Key Findings

1. **NO E2E TESTS EXIST** - All 12 critical user journeys are untested via browser automation
2. **4 feature modules have NO tests at all** - Authentication, Discover, PDF Export, Meals
3. **Playwright MCP is configured but NOT being used** - No E2E test files exist
4. **API route coverage is partial** - 71 routes exist, only ~6 have dedicated API tests

---

## Test Inventory

### Existing Test Files by Type

| Type | Count | Files |
|------|-------|-------|
| **Unit** | 14 | tests/unit/*.test.ts |
| **API** | 7 | tests/api/*.test.ts |
| **Integration** | 1 | tests/integration/api-mock-test.test.ts |
| **E2E** | 0 | (NONE) |

### Unit Tests (14 files)

| File | Feature | Est. Tests |
|------|---------|------------|
| meal-plan-validation.test.ts | fm-meal-plans | 25 |
| unit-conversion.test.ts | fm-units | 15 |
| expiry-calculations.test.ts | fm-inventory | 12 |
| ingredient-normalization.test.ts | fm-ingredients | 18 |
| staples-calculations.test.ts | fm-staples | 10 |
| nutritionist-calculations.test.ts | fm-nutritionist | 14 |
| meal-plan-settings.test.ts | fm-settings | 8 |
| nutrition-validation.test.ts | fm-nutrition | 10 |
| macro-consistency.test.ts | fm-nutrition | 8 |
| database-macro-sync.test.ts | fm-nutrition | 6 |
| master-recipe-search.test.ts | fm-nutritionist | 8 |
| inventory-normalization-edge-cases.test.ts | fm-inventory | 12 |
| ingredient-state.test.ts | fm-ingredients | 6 |
| emilia-arithmetic.test.ts | fm-profiles | 5 |

### API Tests (7 files)

| File | Feature | Est. Tests |
|------|---------|------------|
| recipes.test.ts | fm-recipes | 20 |
| meal-plans.test.ts | fm-meal-plans | 18 |
| profiles.test.ts | fm-profiles | 12 |
| inventory.test.ts | fm-inventory | 15 |
| shopping-lists.test.ts | fm-shopping-lists | 16 |
| dashboard.test.ts | fm-dashboard | 8 |
| nutritionist.test.ts | fm-nutritionist | 14 |

### Integration Tests (1 file)

| File | Feature | Est. Tests |
|------|---------|------------|
| api-mock-test.test.ts | General | 25 |

---

## Feature Coverage Analysis

### Feature Coverage Matrix

| Feature | Priority | Unit | API | Integration | E2E | Score | Status |
|---------|----------|------|-----|-------------|-----|-------|--------|
| Authentication | CRITICAL | NO | NO | NO | NO | 0% | CRITICAL GAP |
| Recipe Management | CRITICAL | YES | YES | NO | NO | 67% | E2E NEEDED |
| Meal Planning | CRITICAL | YES | YES | NO | NO | 67% | E2E NEEDED |
| Shopping Lists | CRITICAL | NO | YES | NO | NO | 33% | UNIT+E2E NEEDED |
| Inventory Management | HIGH | YES | YES | NO | NO | 67% | E2E NEEDED |
| Family Profiles | HIGH | YES | YES | NO | NO | 67% | E2E NEEDED |
| AI Nutritionist | HIGH | YES | YES | NO | NO | 67% | E2E NEEDED |
| Nutrition Calculations | HIGH | YES | NO | NO | NO | 50% | API TESTS NEEDED |
| Staples Management | MEDIUM | YES | NO | NO | NO | 50% | API TESTS NEEDED |
| Recipe Discovery | MEDIUM | NO | NO | NO | NO | 0% | CRITICAL GAP |
| Unit Conversion | MEDIUM | YES | NO | NO | NO | 50% | API TESTS NEEDED |
| Ingredient Processing | MEDIUM | YES | N/A | NO | NO | 100% | OK |
| PDF Export | MEDIUM | NO | NO | NO | NO | 0% | CRITICAL GAP |
| Dashboard | MEDIUM | NO | YES | NO | NO | 50% | UNIT TESTS NEEDED |
| Meal Operations | MEDIUM | NO | NO | NO | NO | 0% | CRITICAL GAP |
| Settings | LOW | YES | NO | NO | NO | 50% | OK FOR LOW |

### Features with CRITICAL Coverage Gaps (0% coverage)

These features have NO test coverage and should be addressed immediately:

#### 1. Authentication (fm-auth) - CRITICAL PRIORITY
- **Impact:** User cannot login/register - blocks all functionality
- **Lib Files:** lib/auth.ts
- **API Routes:**
  - app/api/auth/register/route.ts
  - app/api/auth/[...nextauth]/route.ts
- **Recommendation:** Create tests/api/auth.test.ts covering registration, login, session validation

#### 2. Recipe Discovery (fm-discover) - MEDIUM PRIORITY
- **Impact:** Users cannot discover new recipes
- **API Routes:**
  - app/api/discover/recipes/route.ts
  - app/api/discover/recipes/[id]/route.ts
  - app/api/discover/recipes/add/route.ts
  - app/api/discover/recipes/add-bulk/route.ts
  - app/api/discover/filters/route.ts
  - app/api/discover/assistant/route.ts
- **Recommendation:** Create tests/api/discover.test.ts

#### 3. PDF Export (fm-pdf-export) - MEDIUM PRIORITY
- **Impact:** Users cannot export meal plans or shopping lists as PDF
- **Lib Files:**
  - lib/export/generatePDF.ts
  - lib/export/generateMealPlanPDF.ts
  - lib/export/generateCookingPlanPDF.ts
- **API Routes:**
  - app/api/meal-plans/[id]/pdf/route.ts
  - app/api/meal-plans/[id]/cooking-plan-pdf/route.ts
- **Recommendation:** Create tests/unit/pdf-generation.test.ts

#### 4. Meal Operations (fm-meals) - MEDIUM PRIORITY
- **Impact:** Individual meal CRUD and cooking workflow untested
- **API Routes:**
  - app/api/meals/route.ts
  - app/api/meals/[id]/route.ts
  - app/api/meals/[id]/cook/route.ts
- **Recommendation:** Create tests/api/meals.test.ts

---

## E2E Test Gap Analysis

### Critical User Journeys WITHOUT E2E Tests

ALL 12 critical user journeys lack E2E test coverage:

| Journey | Priority | Entry Route | Status |
|---------|----------|-------------|--------|
| User Registration & Login | CRITICAL | /auth/register | NO E2E |
| Recipe Import from URL | CRITICAL | /recipes/new | NO E2E |
| Weekly Meal Plan Generation | CRITICAL | /meal-plans/new | NO E2E |
| Shopping List from Meal Plan | CRITICAL | /meal-plans | NO E2E |
| Manual Recipe Creation | HIGH | /recipes/new | NO E2E |
| Shopping List PDF Export | HIGH | /shopping-lists | NO E2E |
| Inventory Management | HIGH | /inventory | NO E2E |
| Nutritionist Chat | HIGH | /nutritionist | NO E2E |
| Family Profile Management | HIGH | /profiles | NO E2E |
| Photo-based Inventory Import | MEDIUM | /inventory | NO E2E |
| Recipe Discovery | MEDIUM | /discover | NO E2E |
| Staples Management | MEDIUM | /staples | NO E2E |

### Recommended E2E Test Files to Create

```
tests/e2e/
├── auth.spec.ts           # CUJ-001: Registration & Login
├── recipe-import.spec.ts  # CUJ-002: Recipe Import from URL
├── recipe-create.spec.ts  # CUJ-003: Manual Recipe Creation
├── meal-plan.spec.ts      # CUJ-004: Meal Plan Generation
├── shopping-list.spec.ts  # CUJ-005, CUJ-006: Shopping Lists & PDF
├── inventory.spec.ts      # CUJ-007, CUJ-008: Inventory Management
├── nutritionist.spec.ts   # CUJ-009: Nutritionist Chat
├── profiles.spec.ts       # CUJ-011: Family Profile Management
├── discover.spec.ts       # CUJ-010: Recipe Discovery
└── staples.spec.ts        # CUJ-012: Staples Management
```

---

## API Route Coverage

### Untested API Routes (56 of 71 routes)

The following API routes have NO dedicated test coverage:

**Authentication (CRITICAL)**
- app/api/auth/register/route.ts
- app/api/auth/[...nextauth]/route.ts

**Recipes - Import/Export**
- app/api/recipes/import-photo/route.ts
- app/api/recipes/import-text/route.ts
- app/api/recipes/import-csv/route.ts
- app/api/recipes/[id]/compatibility/route.ts
- app/api/recipes/backfill-dietary-tags/route.ts

**Nutrition**
- app/api/recipes/analyze-macros/route.ts
- app/api/recipes/calculate-nutrition/route.ts
- app/api/recipes/backfill-nutrition/route.ts
- app/api/recipes/[id]/sync-macros/route.ts
- app/api/recipes/nutritionist-feedback/route.ts
- app/api/recipes/nutritionist-chat/route.ts

**Meal Plans - Advanced**
- app/api/meal-plans/generate/route.ts
- app/api/meal-plans/[id]/regenerate/route.ts
- app/api/meal-plans/[id]/status/route.ts
- app/api/meal-plans/copy/route.ts
- app/api/meal-plans/[id]/pdf/route.ts
- app/api/meal-plans/[id]/cooking-plan-pdf/route.ts

**Shopping Lists - Advanced**
- app/api/shopping-lists/[id]/import/meal-plan/route.ts
- app/api/shopping-lists/[id]/import/staples/route.ts
- app/api/shopping-lists/[id]/deduplicate/route.ts
- app/api/shopping-lists/[id]/convert-to-inventory/route.ts
- app/api/shopping-lists/[id]/excluded-items/route.ts
- app/api/shopping-lists/suggest-category/route.ts
- app/api/shared/shopping-list/[token]/route.ts
- app/api/shared/shopping-list/[token]/pdf/route.ts

**Inventory - Advanced**
- app/api/inventory/photo/route.ts
- app/api/inventory/import-photo/route.ts
- app/api/inventory/import/route.ts
- app/api/inventory/check/route.ts
- app/api/inventory/deduct/route.ts
- app/api/inventory/from-shopping-list/route.ts
- app/api/inventory/settings/route.ts
- app/api/inventory/url/route.ts

**Meals**
- app/api/meals/route.ts
- app/api/meals/[id]/route.ts
- app/api/meals/[id]/cook/route.ts

**Nutritionist - Advanced**
- app/api/nutritionist/apply-action/route.ts
- app/api/nutritionist/suggested-prompts/route.ts

**Staples**
- app/api/staples/route.ts
- app/api/staples/photo/route.ts
- app/api/staples/url/route.ts

**Discover**
- app/api/discover/recipes/route.ts
- app/api/discover/recipes/[id]/route.ts
- app/api/discover/recipes/add/route.ts
- app/api/discover/recipes/add-bulk/route.ts
- app/api/discover/filters/route.ts
- app/api/discover/assistant/route.ts

**Units**
- app/api/units/route.ts
- app/api/units/migrate/route.ts
- app/api/units/seed/route.ts

**Settings**
- app/api/settings/meal-planning/route.ts

---

## MCP Capability Audit

### Configured MCP Servers

| Server | Available | Status |
|--------|-----------|--------|
| playwright | YES | NOT UTILIZED |
| supabase | YES | PARTIALLY UTILIZED |
| next-devtools | YES | PARTIALLY UTILIZED |

### Playwright MCP (Browser Automation)

**Status:** CONFIGURED BUT NOT USED

**Available Capabilities:**
- browser-navigation
- form-filling
- screenshot-capture
- element-clicking
- text-input
- accessibility-snapshot
- console-monitoring
- network-monitoring
- file-upload
- drag-and-drop

**Current Usage:** NONE (No E2E tests exist)

**Unused Capabilities:** ALL

**Recommendations:**
1. Create E2E test suite using Playwright MCP for critical user journeys
2. Use accessibility-snapshot for reliable element targeting
3. Enable console-monitoring to catch client-side errors during E2E
4. Implement screenshot comparison for visual regression

### Supabase MCP (Database)

**Status:** PARTIALLY UTILIZED

**Available Capabilities:**
- sql-execution
- table-listing
- schema-inspection
- migration-management
- data-querying
- typescript-generation

**Current Usage:**
- sql-execution (ad-hoc queries)
- table-listing (schema exploration)

**Unused Capabilities:**
- migration-management
- typescript-generation (could auto-generate types after schema changes)

**Recommendations:**
1. Use Supabase MCP to verify database state after E2E operations
2. Use migration-management for schema change testing
3. Generate TypeScript types to catch type drift

### Next DevTools MCP (App Health)

**Status:** PARTIALLY UTILIZED

**Available Capabilities:**
- build-error-detection
- runtime-error-detection
- typescript-error-monitoring
- component-inspection
- route-listing

**Current Usage:**
- build-error-detection (during development)

**Unused Capabilities:**
- runtime-error-detection
- component-inspection
- route-listing

**Recommendations:**
1. Integrate runtime error detection into E2E test workflow
2. Use route-listing to automatically discover testable endpoints
3. Add TypeScript error monitoring to CI/CD pipeline

### Suggested New MCP Servers

| Server | Reason | Install Command |
|--------|--------|-----------------|
| visual-regression | UI consistency verification after creating E2E tests | `npm install -D @playwright/test pixelmatch` |
| lighthouse | Performance regression testing, accessibility compliance | `npm install -D lighthouse` |

---

## Prioritized Recommendations

### Priority 1: CRITICAL - Create E2E Test Infrastructure

**Effort:** HIGH | **Impact:** HIGH

Create E2E test suite for critical user journeys using Playwright MCP:

```powershell
# Create E2E test directory
mkdir tests/e2e

# Create first E2E test for authentication
# Use template from docs/testing/templates/e2e-test-template.ts
```

**Specific Actions:**
1. Create tests/e2e/auth.spec.ts (User Registration & Login)
2. Create tests/e2e/recipe-import.spec.ts (Recipe Import from URL)
3. Create tests/e2e/meal-plan.spec.ts (Meal Plan Generation)

### Priority 2: CRITICAL - Test Authentication Module

**Effort:** MEDIUM | **Impact:** HIGH

Authentication has ZERO tests but is CRITICAL priority:

```
Create: tests/api/auth.test.ts
Coverage: Register, Login, Session validation, Error cases
```

### Priority 3: HIGH - Fill API Test Gaps for Critical Features

**Effort:** MEDIUM | **Impact:** HIGH

Create API tests for untested routes in critical features:
- app/api/recipes/import-url/route.ts
- app/api/meal-plans/generate/route.ts
- app/api/shopping-lists/[id]/import/meal-plan/route.ts

### Priority 4: MEDIUM - Create Tests for Discover Feature

**Effort:** MEDIUM | **Impact:** MEDIUM

Recipe Discovery has no tests but 6 API routes:
```
Create: tests/api/discover.test.ts
```

### Priority 5: MEDIUM - Create PDF Generation Tests

**Effort:** LOW | **Impact:** MEDIUM

PDF export has complex logic but no unit tests:
```
Create: tests/unit/pdf-generation.test.ts
```

### Priority 6: LOW - Utilize MCP Capabilities

**Effort:** LOW | **Impact:** MEDIUM

- Enable console-monitoring during E2E tests
- Use Supabase MCP for database state verification
- Integrate Next DevTools error detection

---

## Test Execution Commands

### Run All Tests
```powershell
npm test
```

### Run by Type
```powershell
npm run test:unit          # Unit tests only
npm run test:api           # API tests only
npm run test:integration   # Integration tests only
npm run test:e2e           # E2E tests only (once created)
```

### Run with Coverage
```powershell
npm run test:coverage
```

---

## Next Steps

1. **Immediate (This Week):**
   - Create tests/e2e directory structure
   - Create auth.spec.ts E2E test
   - Create tests/api/auth.test.ts

2. **Short-term (Next 2 Weeks):**
   - Create E2E tests for remaining critical user journeys
   - Fill API test gaps for critical features
   - Enable MCP capabilities in test workflow

3. **Medium-term (Next Month):**
   - Achieve 70% overall coverage
   - Implement visual regression testing
   - Add performance testing with Lighthouse MCP

---

## Appendix: Jest Coverage Thresholds

Current thresholds (from jest.config.js):
```javascript
coverageThreshold: {
  global: {
    branches: 5,
    functions: 10,
    lines: 10,
    statements: 10,
  },
},
```

**Recommendation:** These thresholds are too low. Increase after adding more tests:
- Phase 1: 30% (after E2E infrastructure)
- Phase 2: 50% (after critical feature coverage)
- Phase 3: 70% (target state)

---

*Report generated by Test Plan Agent*
