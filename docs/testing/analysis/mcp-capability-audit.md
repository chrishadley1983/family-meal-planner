# MCP Capability Audit Report

**Generated:** 2025-12-16
**Project:** Family Meal Planner

---

## Overview

This audit analyzes the configured MCP (Model Context Protocol) servers and their utilization for automated testing in the Family Meal Planner project.

---

## MCP Server Status

| Server | Configured | Available | Utilized |
|--------|------------|-----------|----------|
| Playwright | YES | YES | NO (0%) |
| Supabase | YES | YES | PARTIAL (33%) |
| Next DevTools | YES | YES | PARTIAL (20%) |

---

## Detailed Server Analysis

### 1. Playwright MCP (Browser Automation)

**Configuration:** `.mcp.json`
```json
{
  "playwright": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "@playwright/mcp@latest"],
    "description": "Playwright browser automation..."
  }
}
```

**Status:** CONFIGURED BUT NOT UTILIZED

#### Capabilities

| Capability | Available | Currently Used | Potential Use Case |
|------------|-----------|----------------|-------------------|
| browser-navigation | YES | NO | Navigate through user journeys |
| form-filling | YES | NO | Test registration, recipe creation |
| screenshot-capture | YES | NO | Visual verification of UI changes |
| element-clicking | YES | NO | Button and link interaction testing |
| text-input | YES | NO | Form field testing |
| accessibility-snapshot | YES | NO | Reliable element targeting |
| console-monitoring | YES | NO | Catch client-side JS errors |
| network-monitoring | YES | NO | Verify API calls during E2E |
| file-upload | YES | NO | Test recipe photo import |
| drag-and-drop | YES | NO | Test drag-to-reorder features |

#### Why Not Utilized

**Root Cause:** No E2E test files exist in the project.

The `tests/e2e/` directory is empty. Without E2E test specifications, the Playwright MCP cannot be invoked.

#### Recommendations

1. **Create E2E Test Suite** (HIGH PRIORITY)
   ```
   tests/e2e/
   ├── auth.spec.ts
   ├── recipe-import.spec.ts
   ├── meal-plan.spec.ts
   └── shopping-list.spec.ts
   ```

2. **Use Accessibility Snapshots**
   Instead of CSS selectors, use accessibility snapshots for more stable element targeting:
   ```typescript
   // Use Playwright MCP's browser_snapshot action
   const snapshot = await mcp_playwright.browser_snapshot()
   // Then interact with elements by ref
   await mcp_playwright.browser_click({ ref: 'button-save', element: 'Save button' })
   ```

3. **Enable Console Monitoring**
   Catch client-side errors during E2E tests:
   ```typescript
   // After page load
   const consoleMessages = await mcp_playwright.browser_console_messages({ level: 'error' })
   // Fail test if errors found
   ```

4. **Implement Visual Regression**
   Use screenshots for visual comparison:
   ```typescript
   await mcp_playwright.browser_take_screenshot({ fullPage: true })
   // Compare with baseline
   ```

---

### 2. Supabase MCP (Database)

**Configuration:** `.mcp.json`
```json
{
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp?project_ref=pocptwknyxyrtmnfnrph",
    "description": "Supabase database access..."
  }
}
```

**Status:** PARTIALLY UTILIZED (~33%)

#### Capabilities

| Capability | Available | Currently Used | Potential Use Case |
|------------|-----------|----------------|-------------------|
| sql-execution | YES | YES | Ad-hoc queries during debugging |
| table-listing | YES | YES | Schema exploration |
| schema-inspection | YES | NO | Validate schema changes |
| migration-management | YES | NO | Track and verify migrations |
| data-querying | YES | PARTIAL | Verify test data |
| typescript-generation | YES | NO | Auto-generate types after schema changes |

#### Current Usage

The Supabase MCP is currently used for:
- Running SQL queries during development
- Listing tables for schema exploration

#### Unused Capabilities

1. **Migration Management**
   - Not used for verifying migration state
   - Could automate schema change validation

2. **TypeScript Generation**
   - Types are manually maintained
   - Could auto-generate after schema changes

3. **Data Verification After E2E**
   - Not integrated into test workflow
   - Should verify database state after user actions

#### Recommendations

1. **Integrate with E2E Tests**
   Verify database state after E2E operations:
   ```typescript
   // After E2E test creates a recipe
   const result = await mcp_supabase.execute_sql({
     query: `SELECT * FROM "Recipe" WHERE "recipeName" = 'Test Recipe'`
   })
   expect(result.rows.length).toBe(1)
   ```

2. **Use Migration Management**
   Before running tests, verify migration state:
   ```typescript
   const migrations = await mcp_supabase.list_migrations()
   // Ensure all migrations are applied
   ```

3. **Generate TypeScript Types**
   After schema changes, regenerate types:
   ```typescript
   const types = await mcp_supabase.generate_typescript_types()
   // Write to prisma/generated/types.ts
   ```

4. **Schema Validation**
   Validate expected schema exists:
   ```typescript
   const tables = await mcp_supabase.list_tables({ schemas: ['public'] })
   expect(tables.map(t => t.name)).toContain('Recipe')
   ```

---

### 3. Next DevTools MCP (Application Health)

**Configuration:** `.mcp.json`
```json
{
  "next-devtools": {
    "command": "cmd",
    "args": ["/c", "npx", "-y", "next-devtools-mcp@latest"],
    "description": "Next.js development tools..."
  }
}
```

**Status:** PARTIALLY UTILIZED (~20%)

#### Capabilities

| Capability | Available | Currently Used | Potential Use Case |
|------------|-----------|----------------|-------------------|
| build-error-detection | YES | YES | Catch build errors |
| runtime-error-detection | YES | NO | Catch runtime errors during E2E |
| typescript-error-monitoring | YES | NO | Pre-test TypeScript validation |
| component-inspection | YES | NO | Debug component issues |
| route-listing | YES | NO | Discover all testable routes |

#### Current Usage

Primarily used for build error detection during development.

#### Unused Capabilities

1. **Runtime Error Detection**
   - Not integrated into E2E workflow
   - Could catch server-side errors during tests

2. **TypeScript Error Monitoring**
   - Not used in CI/CD
   - Could fail tests on type errors

3. **Route Listing**
   - Not used to discover endpoints
   - Could auto-generate API test coverage matrix

#### Recommendations

1. **Pre-Test Health Check**
   Before running tests, verify app health:
   ```typescript
   // Call nextjs_index to check server status
   const servers = await mcp_nextDevtools.nextjs_index()
   // Verify no build errors
   const errors = await mcp_nextDevtools.nextjs_call({
     port: '3000',
     toolName: 'get_errors'
   })
   expect(errors.count).toBe(0)
   ```

2. **Runtime Error Detection During E2E**
   After each E2E test step:
   ```typescript
   // Check for runtime errors
   const errors = await mcp_nextDevtools.nextjs_call({
     port: '3000',
     toolName: 'get_runtime_errors'
   })
   if (errors.length > 0) {
     fail(`Runtime errors detected: ${errors}`)
   }
   ```

3. **Auto-Discover Routes for Testing**
   Generate test coverage map:
   ```typescript
   const routes = await mcp_nextDevtools.nextjs_call({
     port: '3000',
     toolName: 'list_routes'
   })
   // Compare with existing tests
   ```

---

## Suggested Additional MCP Servers

### 1. Visual Regression MCP

**Why:** Once E2E tests exist, visual regression will catch UI changes.

**Install:**
```powershell
npm install -D @playwright/test pixelmatch
```

**Capabilities:**
- Pixel-level screenshot comparison
- Baseline management
- Diff image generation

**Use Cases:**
- Catch unintended UI changes
- Verify design consistency
- Regression detection after style changes

### 2. Lighthouse MCP

**Why:** Performance and accessibility testing.

**Install:**
```powershell
npm install -D lighthouse
```

**Capabilities:**
- Performance auditing
- Accessibility scoring
- SEO checks
- Best practices validation

**Use Cases:**
- Performance regression detection
- Accessibility compliance verification
- Core Web Vitals monitoring

---

## MCP Integration Strategy

### Phase 1: E2E Foundation (Immediate)

1. Create E2E test files in `tests/e2e/`
2. Use Playwright MCP for browser automation
3. Basic navigation and form testing

### Phase 2: Database Integration (Week 2)

1. Use Supabase MCP to verify data after E2E tests
2. Implement test data seeding via MCP
3. Add schema validation checks

### Phase 3: Health Monitoring (Week 3)

1. Integrate Next DevTools error detection
2. Pre-test health checks
3. Runtime error monitoring during E2E

### Phase 4: Advanced Testing (Month 2)

1. Add visual regression with baseline management
2. Implement Lighthouse performance checks
3. Accessibility compliance verification

---

## MCP Usage Examples

### Example 1: E2E Test with All MCPs

```typescript
// tests/e2e/recipe-import.spec.ts

describe('Recipe Import from URL', () => {
  beforeAll(async () => {
    // Health check via Next DevTools
    const errors = await nextjs_call({ toolName: 'get_errors' })
    expect(errors.count).toBe(0)
  })

  test('imports recipe successfully', async () => {
    // Navigate via Playwright
    await browser_navigate({ url: 'http://localhost:3000/recipes/new' })

    // Fill form
    await browser_type({
      ref: 'url-input',
      text: 'https://example.com/recipe',
      element: 'Recipe URL input'
    })

    // Click import
    await browser_click({
      ref: 'import-button',
      element: 'Import button'
    })

    // Wait for completion
    await browser_wait_for({ text: 'Recipe imported successfully' })

    // Verify database state via Supabase
    const result = await execute_sql({
      query: `SELECT * FROM "Recipe" ORDER BY "createdAt" DESC LIMIT 1`
    })
    expect(result.rows[0].recipeName).toBeDefined()

    // Check for runtime errors via Next DevTools
    const runtimeErrors = await nextjs_call({ toolName: 'get_runtime_errors' })
    expect(runtimeErrors.length).toBe(0)
  })
})
```

### Example 2: Pre-Commit Test Script

```powershell
# scripts/pre-commit-test.ps1

# 1. TypeScript check
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) { exit 1 }

# 2. Unit tests
npm run test:unit
if ($LASTEXITCODE -ne 0) { exit 1 }

# 3. API tests (use Supabase MCP for DB verification)
npm run test:api
if ($LASTEXITCODE -ne 0) { exit 1 }

# 4. Critical E2E tests (use all MCPs)
npm run test:e2e -- --grep "critical"
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "All pre-commit tests passed!"
```

---

## Recommendations Summary

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Create E2E tests to utilize Playwright MCP | HIGH | HIGH |
| 2 | Integrate Supabase MCP into E2E for data verification | MEDIUM | HIGH |
| 3 | Add Next DevTools health checks before tests | LOW | MEDIUM |
| 4 | Enable console monitoring during E2E | LOW | MEDIUM |
| 5 | Implement visual regression (after E2E exists) | MEDIUM | MEDIUM |
| 6 | Add Lighthouse performance testing | MEDIUM | LOW |

---

*Report generated by Test Plan Agent - MCP Audit Module*
