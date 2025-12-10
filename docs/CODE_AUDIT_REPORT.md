# familyFuel Code Quality Audit Report

**Generated:** 2025-12-10
**Auditor:** Claude Code (QA Lead Role)
**Status:** READ-ONLY AUDIT - No code changes made

---

## Executive Summary

- **Overall Health Score:** 5/10
- **Total Issues Found:** 32
  - P1 (Critical): 4
  - P2 (High): 8
  - P3 (Medium): 12
  - P4 (Low): 8
- **Settings Verification:** 15/16 settings properly wired (see traceability matrix)
- **Functional Tests:** NOT PERFORMED (Playwright not available in environment)
- **Top 5 Priority Fixes:**
  1. **SessionProvider NOT integrated in layout.tsx** - Authentication may not work properly
  2. **2,634 TypeScript errors** - Node modules not installed/configured correctly
  3. **No test files exist** - Zero test coverage
  4. **3 database tables never used** - ShoppingList, ShoppingListItem, AppSettings, RecipeProfileCompatibility
  5. **Shopping Lists page is a placeholder** - Feature not implemented

---

## What's Working Well

- **API Route Structure:** All 27 API routes follow consistent patterns with proper authentication checks
- **Zod Validation:** Input validation is implemented across recipe and profile APIs
- **Prisma Schema:** Comprehensive data model with proper relationships and indexes
- **Settings System:** Meal planning settings UI and API are well-integrated
- **Async/Await Consistency:** No mixed `.then()` patterns found - consistent modern async
- **Error Handling:** Try/catch blocks with proper HTTP status codes across all APIs
- **Middleware Protection:** Authentication middleware protects all private routes
- **Password Hashing:** bcryptjs used for secure password storage
- **No Hardcoded Secrets:** Environment variables properly used for API keys and secrets
- **Console Logging Standards:** Follows emoji-prefixed logging convention from CLAUDE.md

---

## Settings Traceability Matrix

| Setting Name | UI Exists | DB Column | Persists | API Reads | API Uses | Affects Output | Status |
|--------------|-----------|-----------|----------|-----------|----------|----------------|--------|
| macroMode | ✅ | MealPlanSettings.macroMode | ✅ | ✅ generate/route.ts:70 | ✅ prompt-builder.ts:193 | ✅ | ✅ Working |
| varietyEnabled | ✅ | MealPlanSettings.varietyEnabled | ✅ | ✅ generate/route.ts:71 | ✅ prompt-builder.ts:81 | ✅ | ✅ Working |
| dinnerCooldown | ✅ | MealPlanSettings.dinnerCooldown | ✅ | ✅ generate/route.ts:72 | ✅ prompt-builder.ts:278 | ✅ | ✅ Working |
| lunchCooldown | ✅ | MealPlanSettings.lunchCooldown | ✅ | ✅ generate/route.ts:73 | ✅ prompt-builder.ts:279 | ✅ | ✅ Working |
| breakfastCooldown | ✅ | MealPlanSettings.breakfastCooldown | ✅ | ✅ generate/route.ts:74 | ✅ prompt-builder.ts:280 | ✅ | ✅ Working |
| snackCooldown | ✅ | MealPlanSettings.snackCooldown | ✅ | ✅ generate/route.ts:75 | ✅ prompt-builder.ts:281 | ✅ | ✅ Working |
| minCuisines | ✅ | MealPlanSettings.minCuisines | ✅ | ✅ generate/route.ts:76 | ✅ prompt-builder.ts:284 | ✅ | ✅ Working |
| maxSameCuisine | ✅ | MealPlanSettings.maxSameCuisine | ✅ | ✅ generate/route.ts:77 | ✅ prompt-builder.ts:285 | ✅ | ✅ Working |
| shoppingMode | ✅ | MealPlanSettings.shoppingMode | ✅ | ✅ generate/route.ts:78 | ✅ prompt-builder.ts:298 | ✅ | ✅ Working |
| expiryPriority | ✅ | MealPlanSettings.expiryPriority | ✅ | ✅ generate/route.ts:79 | ✅ prompt-builder.ts:337 | ✅ | ✅ Working |
| expiryWindow | ✅ | MealPlanSettings.expiryWindow | ✅ | ✅ generate/route.ts:80 | ✅ prompt-builder.ts:346 | ✅ | ✅ Working |
| useItUpItems | ✅ | MealPlanSettings.useItUpItems | ✅ | ✅ generate/route.ts:81 | ✅ prompt-builder.ts:363 | ✅ | ✅ Working |
| batchCookingEnabled | ✅ | MealPlanSettings.batchCookingEnabled | ✅ | ✅ generate/route.ts:82 | ✅ prompt-builder.ts:94 | ✅ | ✅ Working |
| maxLeftoverDays | ✅ | MealPlanSettings.maxLeftoverDays | ✅ | ✅ generate/route.ts:83 | ✅ prompt-builder.ts:402 | ✅ | ✅ Working |
| priorityOrder | ✅ | MealPlanSettings.priorityOrder | ✅ | ✅ generate/route.ts:84 | ✅ prompt-builder.ts:427 | ✅ | ✅ Working |
| feedbackDetail | ✅ | MealPlanSettings.feedbackDetail | ✅ | ✅ generate/route.ts:85 | ✅ prompt-builder.ts:615 | ✅ | ✅ Working |

**Note:** All 16 meal planning settings are properly integrated from UI → Database → API → Claude prompt generation.

---

## Functional Test Results

| Test Category | Status | Notes |
|---------------|--------|-------|
| Authentication Flow | ⚠️ NOT TESTED | Playwright not available |
| Dashboard | ⚠️ NOT TESTED | Playwright not available |
| Recipe Management | ⚠️ NOT TESTED | Playwright not available |
| Meal Plans | ⚠️ NOT TESTED | Playwright not available |
| Family Profiles | ⚠️ NOT TESTED | Playwright not available |
| Shopping Lists | ❌ PLACEHOLDER | Page shows "Coming Soon" |
| Settings Persistence | ⚠️ NOT TESTED | Playwright not available |

**Reason:** Playwright MCP was specified but not available in the audit environment. Manual testing recommended.

---

## Detailed Findings

### P1 - Critical (Fix Immediately)

#### [ISSUE-001] SessionProvider NOT integrated in layout.tsx
- **Location:** `app/layout.tsx`
- **Description:** The `SessionProvider` component exists in `components/providers/SessionProvider.tsx` but is NOT imported or used in the root layout. This means client-side authentication hooks like `useSession()` may not work correctly.
- **Evidence:**
  - `components/providers/SessionProvider.tsx` exists (lines 1-12)
  - `app/layout.tsx` (lines 1-24) does NOT import or wrap children with SessionProvider
- **Impact:** Client-side auth state may not persist across pages
- **Recommended Fix:** Import and wrap the layout children with SessionProvider

#### [ISSUE-002] 2,634 TypeScript Compilation Errors
- **Location:** Multiple files across codebase
- **Description:** TypeScript compilation fails with 2,634 error lines. Primary causes:
  1. Missing type declarations for installed packages (next-auth, zod, date-fns, bcryptjs)
  2. Implicit 'any' types in function parameters
  3. Missing JSX element type definitions
- **Evidence:** `npx tsc --noEmit` output shows:
  - `Cannot find module 'next/server'` - 27 occurrences
  - `Cannot find module 'next-auth'` - 32 occurrences
  - `Parameter 'X' implicitly has an 'any' type` - 40+ occurrences
- **Root Cause:** `node_modules` not installed or `tsconfig.json` misconfigured
- **Recommended Fix:**
  1. Run `npm install`
  2. Ensure `@types/*` packages are installed
  3. Add explicit types to function parameters

#### [ISSUE-003] No Test Files Exist
- **Location:** Entire codebase
- **Description:** Zero test files (*.test.ts, *.test.tsx, *.spec.ts) exist in the project.
- **Evidence:**
  - `glob **/*.test.{ts,tsx,js}` returns no results
  - `glob **/*.spec.{ts,tsx,js}` returns no results
  - `package.json` has no test script defined (no `"test"` in scripts)
- **Impact:** No automated verification of functionality, regressions can go undetected
- **Recommended Fix:**
  1. Add Jest/Vitest configuration
  2. Write unit tests for critical functions (claude.ts, meal-utils.ts)
  3. Write API route tests
  4. Add Playwright for E2E tests

#### [ISSUE-004] Shopping Lists Feature Not Implemented
- **Location:** `app/shopping-lists/page.tsx`
- **Description:** The Shopping Lists page only displays a "Coming Soon" placeholder. No actual functionality exists despite database schema being defined.
- **Evidence:**
  - `app/shopping-lists/page.tsx` lines 22-23: "Shopping Lists Coming Soon"
  - `prisma.shoppingList` is never called anywhere in the codebase
  - No API routes for shopping lists
- **Impact:** Dashboard links to a non-functional feature
- **Recommended Fix:** Either implement the feature or hide the link from dashboard

---

### P2 - High (Fix This Week)

#### [ISSUE-005] 4 Database Tables Never Used in Code
- **Location:** `prisma/schema.prisma`
- **Description:** Several tables defined in schema are never queried:
  1. `ShoppingList` - never used (shopping feature not implemented)
  2. `ShoppingListItem` - never used
  3. `AppSettings` - never used (separate from MealPlanSettings)
  4. `RecipeProfileCompatibility` - never used (compatibility endpoint calculates on-the-fly but doesn't store)
- **Evidence:** `grep prisma.shoppingList`, `grep prisma.appSettings`, `grep prisma.recipeProfileCompatibility` return no results
- **Recommended Fix:** Either implement features using these tables or remove them from schema

#### [ISSUE-006] API Routes Never Called from Frontend
- **Location:** Multiple API routes
- **Description:** These API routes exist but are never called:
  1. `/api/recipes/import-csv` - CSV import endpoint
  2. `/api/recipes/calculate-nutrition` - Nutrition calculation endpoint
  3. `/api/recipes/backfill-dietary-tags` - Batch update endpoint
  4. `/api/recipes/[id]/compatibility` - Recipe compatibility check
- **Evidence:** Grep for these endpoints in .tsx files returns no results
- **Recommended Fix:** Add UI to call these endpoints or remove unused routes

#### [ISSUE-007] Backup Files in Repository
- **Location:** Root directory
- **Files:**
  1. `prisma.config.ts.backup` - Old configuration file
  2. `app/recipes/[id]/page.tsx.bak` - Old page backup
- **Impact:** Clutters repository, could confuse developers
- **Recommended Fix:** Delete backup files, use git history for old versions

#### [ISSUE-008] Test Page in Production Code
- **Location:** `app/test/page.tsx`
- **Description:** Debug test page accessible at `/test` in production
- **Evidence:** Simple page that displays "TEST PAGE - If you see this, the server works!"
- **Recommended Fix:** Delete this page before production deployment

#### [ISSUE-009] Settings Page Not Protected by Middleware
- **Location:** `middleware.ts`
- **Description:** The `/settings/*` routes are NOT in the middleware matcher, meaning settings page might be accessible without authentication
- **Evidence:** Middleware matcher includes `/dashboard`, `/profiles`, etc., but NOT `/settings`
- **Recommended Fix:** Add `'/settings/:path*'` to middleware matcher

#### [ISSUE-010] TODO Comment Not Resolved
- **Location:** `app/meal-plans/[id]/page.tsx:403`
- **Description:** TODO comment indicates incomplete functionality
- **Evidence:** `// TODO: Persist order to backend if needed`
- **Recommended Fix:** Either implement the feature or document why it's not needed

#### [ISSUE-011] Unsafe Type Casting in Settings API
- **Location:** `app/api/settings/meal-planning/route.ts`
- **Description:** Multiple `as any` type casts used when converting database types
- **Evidence:** Lines 31-46 use `as any` for macroMode, shoppingMode, expiryPriority, priorityOrder, feedbackDetail
- **Impact:** Bypasses TypeScript type safety, could lead to runtime errors
- **Recommended Fix:** Create proper type assertions or use Zod for validation

#### [ISSUE-012] Potential SSRF in Recipe Import
- **Location:** `app/api/recipes/import-url/route.ts`
- **Description:** The endpoint fetches any URL provided by the user
- **Evidence:** Lines 27-40 use `fetch(url)` with user-provided URL
- **Impact:** Could be used to scan internal network or access sensitive internal services
- **Recommended Fix:** Add URL allowlist validation or proxy through a sanitization layer

---

### P3 - Medium (Backlog)

#### [ISSUE-013] Console.log Statements (100+ occurrences)
- **Files Affected:** Multiple
- **Description:** Extensive console.log statements throughout codebase
- **Sample Locations:**
  - `lib/claude.ts`: 21 console statements
  - `lib/meal-utils.ts`: 9 console statements
  - `app/meal-plans/page.tsx`: 11 console statements
  - `app/recipes/[id]/page.tsx`: 22 console statements
- **Note:** These follow the project's emoji-prefixed logging convention and are useful for debugging
- **Recommended Fix:** Consider implementing a proper logging library with log levels for production

#### [ISSUE-014] Unused Imports and Dependencies
- **Location:** `package.json`
- **Description:** depcheck reports potentially unused dependencies:
  - `react-dom` - may not be explicitly imported (used implicitly by Next.js)
  - `uuid` - need to verify usage
- **Recommended Fix:** Verify usage and remove truly unused dependencies

#### [ISSUE-015] Mixed Date Handling
- **Location:** Multiple files
- **Description:** Mix of native Date objects and date-fns functions
- **Recommended Fix:** Standardize on date-fns throughout

#### [ISSUE-016] Large Prompt File
- **Location:** `lib/meal-plan-prompt-builder.ts` (656 lines)
- **Description:** Single file containing all prompt building logic
- **Recommended Fix:** Consider splitting into smaller, focused modules

#### [ISSUE-017] Hardcoded AI Model Names
- **Location:** `lib/claude.ts`
- **Description:** Model name `claude-haiku-4-5` hardcoded multiple times
- **Evidence:** Lines 177, 244, 345, 399, 500, 586, 695, 799
- **Recommended Fix:** Extract to a configuration constant or environment variable

#### [ISSUE-018] Error Messages Expose Stack Traces
- **Location:** Multiple API routes
- **Description:** Some error handlers return `error.message` which could expose internal details
- **Recommended Fix:** Log full errors server-side, return generic messages to client

#### [ISSUE-019] No Rate Limiting on AI Endpoints
- **Location:** AI-calling API routes
- **Description:** No rate limiting implemented for expensive Claude API calls
- **Recommended Fix:** Implement rate limiting to prevent abuse and cost overruns

#### [ISSUE-020] Missing Loading States
- **Location:** Various pages
- **Description:** Some pages don't show loading indicators during data fetch
- **Recommended Fix:** Add consistent loading UI patterns

#### [ISSUE-021] No Error Boundaries
- **Location:** `app/layout.tsx`
- **Description:** No React error boundaries implemented
- **Recommended Fix:** Add error boundary components for graceful error handling

#### [ISSUE-022] Inline Styles in Test Page
- **Location:** `app/test/page.tsx`
- **Description:** Uses inline styles instead of Tailwind classes
- **Recommended Fix:** Either delete the page or convert to Tailwind

#### [ISSUE-023] Missing Database Indexes
- **Location:** `prisma/schema.prisma`
- **Description:** Some frequently queried columns may lack indexes
- **Specific:** `Meal.dayOfWeek` and `Meal.mealType` could benefit from composite index
- **Recommended Fix:** Analyze query patterns and add appropriate indexes

#### [ISSUE-024] No Input Sanitization for HTML
- **Location:** Recipe description/notes fields
- **Description:** Text fields could potentially contain malicious HTML
- **Recommended Fix:** Add HTML sanitization before rendering user-generated content

---

### P4 - Low (Nice to Have)

#### [ISSUE-025] Inconsistent File Naming
- **Location:** Various
- **Description:** Mix of kebab-case and camelCase for utility files
- **Examples:**
  - `date-utils.ts` (kebab)
  - `meal-utils.ts` (kebab)
  - `meal-plan-prompt-builder.ts` (kebab)
  - `generate-recipe-image.ts` (kebab)
- **Note:** This is actually consistent with kebab-case, so this is OK

#### [ISSUE-026] Missing JSDoc Comments
- **Location:** Most functions
- **Description:** Functions lack documentation comments
- **Recommended Fix:** Add JSDoc to exported functions

#### [ISSUE-027] Magic Numbers in UI
- **Location:** `app/settings/meal-planning/page.tsx`
- **Description:** Slider min/max values are hardcoded
- **Evidence:** `min="7" max="30"` for dinner cooldown
- **Recommended Fix:** Extract to constants with explanatory names

#### [ISSUE-028] No Favicon SVG
- **Location:** `app/favicon.ico`
- **Description:** Only ICO format, no SVG for modern browsers
- **Recommended Fix:** Add favicon.svg for better scaling

#### [ISSUE-029] README Needs Update
- **Location:** `README.md`
- **Description:** Default Next.js README, not project-specific
- **Recommended Fix:** Update with project setup instructions

#### [ISSUE-030] No CONTRIBUTING.md
- **Location:** Root directory
- **Description:** No contribution guidelines
- **Recommended Fix:** Add contribution guidelines

#### [ISSUE-031] No .nvmrc File
- **Location:** Root directory
- **Description:** No Node.js version specification
- **Recommended Fix:** Add .nvmrc with required Node version

#### [ISSUE-032] Documentation Files Need Organization
- **Location:** Root and docs/
- **Description:** Multiple markdown files in root that could be in /docs
- **Files:** `RECIPE_IMPLEMENTATION_NOTES.md`, `RECIPE_TEST_PLAN.md`, `NEW_FEATURES_SUMMARY.md`, `CONFIGURATION_GUIDE.md`
- **Recommended Fix:** Move to /docs directory

---

## Orphaned Code Inventory

| File | Type | Status | Recommendation |
|------|------|--------|----------------|
| `prisma.config.ts.backup` | Config backup | Orphaned | Delete |
| `app/recipes/[id]/page.tsx.bak` | Page backup | Orphaned | Delete |
| `app/test/page.tsx` | Test page | Debug code | Delete before production |
| `components/providers/SessionProvider.tsx` | Component | **NOT INTEGRATED** | Integrate into layout.tsx |

---

## Database Schema Issues

| Issue | Table | Column | Description |
|-------|-------|--------|-------------|
| Unused table | shopping_lists | all | Table never queried in code |
| Unused table | shopping_list_items | all | Table never queried in code |
| Unused table | app_settings | all | Table never queried in code |
| Unused table | recipe_profile_compatibility | all | Compatibility calculated on-the-fly, not stored |

---

## Security Assessment

| Check | Status | Notes |
|-------|--------|-------|
| Hardcoded secrets | ✅ PASS | No secrets in code, uses env vars |
| SQL Injection | ✅ PASS | Prisma ORM prevents raw SQL |
| Password hashing | ✅ PASS | bcryptjs with proper implementation |
| Auth middleware | ⚠️ PARTIAL | `/settings` not in protected paths |
| SSRF protection | ❌ FAIL | Recipe URL import vulnerable |
| Rate limiting | ❌ FAIL | No rate limiting on AI endpoints |
| Input validation | ✅ PASS | Zod validation on key endpoints |
| CORS | ✅ PASS | Next.js default handling |

---

## Recommended Action Plan

### Immediate (This Sprint)
1. **[P1-001]** Integrate SessionProvider into layout.tsx
2. **[P1-002]** Run `npm install` and fix TypeScript configuration
3. **[P2-009]** Add `/settings` to middleware matcher
4. **[P2-008]** Delete test page

### Short Term (Next 2 Sprints)
5. **[P1-003]** Set up testing framework and write initial tests
6. **[P2-005]** Remove unused database tables or implement features
7. **[P2-006]** Remove or connect unused API routes
8. **[P2-012]** Add URL validation to recipe import
9. **[P1-004]** Either implement shopping lists or remove from navigation

### Backlog
10. Clean up backup files
11. Implement rate limiting
12. Add error boundaries
13. Standardize logging with log levels
14. Add loading states to all pages
15. Update README with project-specific content

---

## Appendix

### A. Full Console.log List

**lib/claude.ts:**
```
Line 175: console.log('🔷 Calling Claude API for meal plan generation...')
Line 186: console.log('🟢 Claude response received, length:', responseText.length)
Line 187: console.log('🟢 Response preview (first 500 chars):', responseText.substring(0, 500))
Line 192: console.error('❌ No JSON found in Claude response')
Line 193: console.error('Full response:', responseText)
Line 197: console.log('🟢 JSON extracted, length:', jsonMatch[0].length)
Line 201: console.log('🟢 Meal plan parsed successfully, meals count:', mealPlan.meals?.length || 0)
Line 204: console.error('❌ JSON parse error:', parseError.message)
Line 210: console.error('❌ Error generating meal plan with Claude:', error)
Line 254: console.error('Error getting nutritionist feedback:', error)
Line 363: console.error('Error parsing recipe with Claude:', error)
Line 416: console.error('Error calculating nutrition with Claude:', error)
Line 520: console.error('Error analyzing recipe photo with Claude:', error)
Line 583: console.log('🔷 Calling Claude API to parse recipe text...')
Line 595: console.log('🟢 Claude response received, length:', responseText.length)
Line 604: console.log('🟢 Recipe parsed successfully:', recipe.recipeName)
Line 608: console.error('❌ Error parsing recipe text with Claude:', error)
Line 710: console.error('Error analyzing recipe macros with Claude:', error)
Line 807: console.error('Error getting nutritionist feedback with Claude:', error)
```

(Additional console.log locations in 15+ other files - see Phase 1 scan results)

### B. Full TODO/FIXME List

```
app/meal-plans/[id]/page.tsx:403: // TODO: Persist order to backend if needed
```

### C. TypeScript Errors Summary

**Total Error Lines:** 2,634

**Error Categories:**
- `Cannot find module 'next/server'`: 27 files
- `Cannot find module 'next-auth'`: 32 occurrences
- `Cannot find module 'zod'`: 8 files
- `Cannot find module 'date-fns'`: 4 files
- `Cannot find module 'bcryptjs'`: 2 files
- `Cannot find module '@anthropic-ai/sdk'`: 2 files
- `Parameter 'X' implicitly has an 'any' type`: 40+ occurrences
- `JSX element implicitly has type 'any'`: 200+ occurrences (dashboard page)

**Root Cause:** Node modules appear to not be installed in the audit environment, or TypeScript configuration is incorrect.

### D. Unused Dependencies (from depcheck)

**Potentially Unused:**
- `react-dom` (may be implicitly used by Next.js)
- `uuid` (need to verify usage)

**Unused devDependencies:**
- Several @types packages may be unnecessary if main packages include types

---

*End of Audit Report*
