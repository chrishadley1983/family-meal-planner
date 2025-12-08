# Family Meal Planner - Claude Code Instructions

## Project Overview

A comprehensive family meal planning application with AI-powered features including recipe management, weekly meal planning, inventory tracking via photo recognition, smart shopping lists, and nutritional guidance.

## Tech Stack

- **Frontend:** React Native with Expo (iOS/Android) + React for web
- **Backend:** Node.js with Express
- **Database:** PostgreSQL via Supabase
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage for recipe/inventory images
- **AI Integration:** Anthropic Claude API
- **Language:** TypeScript throughout

## Project Structure

```
/family-meal-planner
├── /apps
│   ├── /mobile          # React Native Expo app
│   └── /web             # React web app
├── /packages
│   ├── /api             # Express backend
│   ├── /shared          # Shared types, utilities, constants
│   └── /database        # Database migrations, seeds, queries
├── /docs                # Documentation including PRD
└── CLAUDE.md
```

---

## 🔴 CRITICAL: LOCAL MACHINE ENVIRONMENT

**The user (Chris) is running this on their LOCAL WINDOWS MACHINE with PowerShell and Chrome browser, not Linux/bash.**

This means:
- **Use PowerShell syntax, NOT bash/Linux commands**
- **Browser testing is done in Chrome** (not Firefox, Safari, Edge)
- All changes must be **committed and pushed to git** for Chris to see them
- Chris must **pull changes** to get updates on their machine
- Always **verify Chris has the latest code** before testing
- Never assume changes are visible until confirmed pushed and pulled

**PowerShell command rules:**
- Use `Remove-Item -Recurse -Force` not `rm -rf`
- Use `$env:VARIABLE` not `export VARIABLE`
- Use semicolon `;` to chain commands, not `&&`
- Paths use backslashes `\` (though `/` often works)
- **CRITICAL: Write commands as single lines or use semicolons** - multiline scripts without proper delimiters won't paste correctly into PowerShell
- Bad: 
  ```
  Remove-Item -Recurse -Force node_modules/.cache
  Remove-Item -Recurse -Force .next/cache
  ```
- Good: 
  ```powershell
  Remove-Item -Recurse -Force node_modules/.cache, .next/cache -ErrorAction SilentlyContinue
  ```
- Or with semicolons:
  ```powershell
  Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue; Remove-Item -Recurse -Force .next/cache -ErrorAction SilentlyContinue
  ```

---

## 📋 WORKFLOW: Follow This For EVERY Change

### Phase 1: BEFORE Making Changes

- [ ] **Understand the requirement clearly** - Ask clarifying questions if anything is ambiguous
- [ ] **Read existing code in affected files** - Don't make assumptions about current implementation
- [ ] **Create a TodoWrite checklist** for the task with specific steps
- [ ] **Identify ALL files that need changes** - Map out the full scope before starting
- [ ] **Check current server status** - Are services running? Any existing errors?

### Phase 2: WHILE Making Changes

- [ ] **Make changes incrementally** - Small, testable chunks rather than large rewrites
- [ ] **Follow existing code patterns** - Match the style already in the codebase
- [ ] **Update related files together** - Types, tests, and implementation in sync
- [ ] **Check TypeScript compiles after each significant change:**
  ```bash
  npx tsc --noEmit
  ```
- [ ] **Don't leave incomplete code** - Each commit should be functional

### Phase 3: AFTER Making Changes (MANDATORY VERIFICATION)

⚠️ **DO NOT report any change as complete until ALL applicable steps below are verified. No exceptions.**

#### 3.1 Server Health Checks

```powershell
# Check all services are running and responding
Invoke-WebRequest -Uri http://localhost:3000/health -UseBasicParsing
Invoke-WebRequest -Uri http://localhost:8081 -UseBasicParsing

# If not running, start them in separate PowerShell terminals:
# Terminal 1: cd packages/api; npm run dev
# Terminal 2: cd apps/mobile; npx expo start
```

#### 3.2 TypeScript Compilation

```powershell
# Must pass with zero errors
npm run typecheck

# Or per-package:
cd packages/api; npx tsc --noEmit
cd apps/mobile; npx tsc --noEmit
```

#### 3.3 Database Verification (if schema changed)

```bash
# Check connection
npx supabase status

# Apply migrations
npx supabase db push

# Verify migration applied
npx supabase migration list
```

**Migration checklist:**
- [ ] Migration file created in `/packages/database/supabase/migrations/`
- [ ] Migration applied without errors
- [ ] Rollback migration exists
- [ ] Seed data updated if needed

#### 3.4 Unit Tests

```bash
# Run ALL tests - must pass
npm test

# Run with coverage for new code
npm test -- --coverage
```

**Test requirements:**
- [ ] All existing tests pass
- [ ] New tests written for new functionality
- [ ] Edge cases covered (null, empty, validation errors)
- [ ] Minimum 80% coverage for new code

#### 3.5 Integration Verification

```bash
# If API contracts changed
npm run generate:types

# Lint check
npm run lint
```

#### 3.6 Manual Testing

- [ ] For API changes: Test the endpoint with Invoke-WebRequest or Postman
- [ ] For UI changes: Visually verify in Chrome (running app or localhost)
- [ ] For database changes: Query to confirm data structure
- [ ] **If changes don't appear:** Clear Turbopack/Metro cache before investigating further:
  ```powershell
  Remove-Item -Recurse -Force node_modules/.cache, .next/cache, apps/web/.next, apps/mobile/.expo -ErrorAction SilentlyContinue; npx expo start -c
  ```

#### 3.7 Git Commit and Push

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: [description of change]"

# Push to remote
git push origin [branch-name]
```

- [ ] Changes committed with clear message
- [ ] Changes pushed to remote
- [ ] Notify Chris to pull latest changes

---

## 🐛 ERROR HANDLING WORKFLOW

**When Chris reports an error, follow this sequence exactly. Do NOT skip steps or jump straight to coding a fix.**

### Step 1: CLARIFY

Before doing anything, ensure you fully understand the error:

- [ ] What is the exact error message? (Ask Chris to paste it if not provided)
- [ ] What was Chris trying to do when it occurred?
- [ ] Is it reproducible or intermittent?
- [ ] When did it start happening? (After a specific change?)
- [ ] What has Chris already tried?

**If any of the above is unclear, ASK before proceeding.**

### Step 2: REPRODUCE

Confirm you can trigger the same error:

- [ ] Follow the steps Chris described
- [ ] Verify you see the same error message/behaviour
- [ ] If you cannot reproduce, ask Chris for more details - do NOT guess at a fix

```powershell
# Check relevant logs
Get-Content logs/error.log -Tail 50
# Or check console output in the running terminal
```

**If you cannot reproduce the error, STOP and clarify with Chris.**

### Step 3: ROOT CAUSE ANALYSIS

Identify *why* it broke, not just *what* broke:

- [ ] Trace the error to its source (not just where it surfaces)
- [ ] Understand the chain of events that led to the error
- [ ] Check recent changes: `git log --oneline -10` and `git diff HEAD~3`
- [ ] Identify if this is a symptom of a deeper issue

**Document your findings before proposing a fix:**
```
Root cause: [Explain why this is happening]
Affected files: [List files involved]
Risk assessment: [Could the fix break other things?]
```

### Step 4: DEBUG

Investigate with targeted checks:

- [ ] **Check Chrome DevTools Console FIRST** - existing logs often reveal the issue immediately
- [ ] Look for 🔄 state changes, 🔷 API calls, 🟢 responses, ❌ errors in the console
- [ ] Add additional logging if needed to trace execution flow (remove later)
- [ ] Check variable values at key points
- [ ] Verify data in database if relevant
- [ ] Check for cache issues (clear if in doubt - see Troubleshooting)

```powershell
# Quick cache clear if behaviour is inconsistent
Remove-Item -Recurse -Force node_modules/.cache, .next/cache, apps/web/.next, apps/mobile/.expo -ErrorAction SilentlyContinue
```

### Step 5: PLAN

**Before writing any code, propose the fix to Chris:**

- [ ] Explain the intended solution in plain English
- [ ] List the specific files that will be changed
- [ ] Describe any risks or side effects
- [ ] Mention alternative approaches considered (if any)

**Present the plan like this:**
```
📋 PROPOSED FIX:

Problem: [One sentence summary of root cause]

Solution: [What you plan to do]

Files to modify:
- path/to/file1.ts - [what changes]
- path/to/file2.ts - [what changes]

Risks: [Any potential side effects or things to watch for]

Alternatives considered: [Other approaches and why you didn't choose them]

Shall I proceed?
```

**Wait for Chris to approve before implementing.** This prevents wasted effort on the wrong approach.

### Step 6: FIX

Implement the solution:

- [ ] Make the minimal change required to fix the issue
- [ ] Don't refactor unrelated code while fixing a bug
- [ ] Follow existing code patterns
- [ ] Add comments explaining non-obvious fixes
- [ ] **Add/update console logging** for the affected code path (use emoji prefixes - see Console Logging Standards)

### Step 7: UNIT TEST

Write tests that cover the fix:

- [ ] Write a test that *would have caught* this bug (fails without fix, passes with fix)
- [ ] Cover edge cases related to the error
- [ ] Ensure test names clearly describe what they're testing

```powershell
npm test -- --watch  # Run tests in watch mode while developing
```

### Step 8: REGRESSION CHECK

Verify you haven't broken anything else:

```powershell
# Run FULL test suite, not just new tests
npm test

# TypeScript check
npm run typecheck

# Lint check
npm run lint
```

- [ ] All existing tests still pass
- [ ] No new TypeScript errors
- [ ] No new lint warnings

**If any tests fail, go back to Step 6. Do NOT proceed with broken tests.**

### Step 9: ITERATE

If the error persists or new issues appear:

- [ ] Return to Step 2 (Reproduce) with new information
- [ ] Do NOT stack fixes on top of fixes - understand what's happening
- [ ] If stuck after 2-3 iterations, pause and discuss approach with Chris

### Step 10: DEPLOY

Push the verified fix:

```powershell
git add .; git commit -m "fix: [description of what was fixed and why]"; git push origin <branch-name>
```

- [ ] Commit message explains both WHAT and WHY
- [ ] Changes pushed to remote
- [ ] Notify Chris to pull

### Step 11: SUGGEST UAT

Provide Chris with manual verification steps:

```
✅ FIX DEPLOYED: [Brief description]

Please verify by:
1. Pull latest: `git pull origin <branch-name>`
2. Clear cache: `Remove-Item -Recurse -Force node_modules/.cache, apps/mobile/.expo -ErrorAction SilentlyContinue`
3. Restart app: `npm run dev`
4. Test: [Specific steps to verify the fix]
   - Navigate to [screen/endpoint]
   - Perform [action that previously caused error]
   - Expected result: [what should happen now]

Let me know if the error persists or if you see any new issues.
```

---

### 🔴 Error Workflow Reminders

1. **Never skip REPRODUCE** - Fixing an error you can't reproduce leads to guesswork
2. **Never skip ROOT CAUSE** - Fixing symptoms creates more bugs
3. **Never skip PLAN** - Get approval before writing code to avoid wasted effort
4. **Never skip REGRESSION CHECK** - One fix shouldn't create two new bugs
5. **Minimal fixes only** - Bug fixes are not the time to refactor
6. **If stuck, ask** - Two iterations without progress = time to discuss

---

## ✅ Change Completion Report Template

**Use this format when reporting ANY change as complete:**

```
✅ CHANGE COMPLETE: [Brief description]

Verification performed:
- [ ] Servers running: API ✓ | Mobile ✓
- [ ] TypeScript compiles: ✓ (0 errors)
- [ ] Database migrations: ✓ Applied / N/A
- [ ] Unit tests: ✓ (X passing, Y new tests added)
- [ ] Manual testing: [describe what was tested]
- [ ] Git: ✓ Committed and pushed to [branch]

Files modified:
- path/to/file1.ts
- path/to/file2.ts

⚡ Action required: Please run `git pull` to get these changes.

Notes: [any observations or follow-up items]
```

🔴 **If ANY verification step fails, FIX IT before reporting complete.**

---

## Development Conventions

### Naming Conventions

- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Database tables: `snake_case`
- API endpoints: `/kebab-case`

### Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over raw promises
- Destructure objects and arrays where readable
- Keep functions under 50 lines; extract helpers if longer
- Match existing patterns in the codebase

### Units and Formatting

- **All measurements in metric units** (grams, millilitres, centimetres)
- Dates: ISO 8601 format (`YYYY-MM-DD`)
- Currency: Store in cents, display with locale formatting
- Ratings: 1-10 scale (integers only)

### API Design

- RESTful conventions
- Always return JSON
- Use HTTP status codes correctly (200, 201, 400, 401, 404, 500)
- Include `{ success: boolean, data?: T, error?: string }` wrapper
- Validate all inputs with Zod schemas

### Error Handling

```typescript
// Always use this pattern for API errors
try {
  // operation
} catch (error) {
  console.error('[EndpointName] Error:', error);
  return res.status(500).json({ 
    success: false, 
    error: 'User-friendly message' 
  });
}
```

### Console Logging Standards

**All significant operations should have clear console logging for debugging.**

Use descriptive prefixes with emoji indicators for easy scanning in Chrome DevTools:

```typescript
// State changes - use 🔄
console.log('🔄 Recipe state changed, checking if should fetch AI...', { hasRecipe, isEditing, hasMacroAnalysis });

// API calls starting - use 🔷
console.log('🔷 Calling macro analysis API...');

// API responses - use 🟢 for success
console.log('🟢 Macro response status:', response.status, response.ok);
console.log('🟢 Macro analysis received:', { analysis });

// Data loading - use 🍳 (or relevant emoji)
console.log('🍳 Recipe data loaded:', recipeName);

// Triggers/events - use ⚡
console.log('⚡ Triggering AI analysis for:', recipeName);
console.log('⚡ Auto-refreshing AI analysis while editing');

// Errors - use ❌
console.error('❌ Failed to fetch recipe:', error);

// Warnings - use ⚠️
console.warn('⚠️ Missing required field:', fieldName);
```

**Logging requirements:**
- Log state changes with relevant variable values
- Log API calls before and after (with status codes)
- Log data transformations with before/after snapshots
- Include file and line references where helpful (e.g., `page.tsx:141`)
- Keep logs concise but informative - should be scannable in DevTools

**When debugging, check Chrome DevTools Console FIRST** - the logs often reveal the issue immediately.

---

## Database Conventions

### Schema Rules

- Primary keys: `id` (UUID, auto-generated)
- Timestamps: `created_at`, `updated_at` on all tables
- Soft deletes: `deleted_at` timestamp (not boolean)
- Foreign keys: `{table_name}_id` format
- Always add indexes on foreign keys and frequently queried columns

### Migration Rules

- One migration per logical change
- Descriptive names: `YYYYMMDDHHMMSS_add_recipe_rating_column.sql`
- Include both up and down migrations
- Never modify existing migrations after they've been applied

---

## AI Integration Guidelines

### Claude API Usage

- Model: `claude-sonnet-4-20250514` for standard operations
- Temperature: 0.7 for creative (meal suggestions), 0.3 for structured (parsing)
- Always include system prompts defining the task
- Parse responses with Zod for type safety
- Handle rate limits with exponential backoff

### AI Prompts Location

All AI prompts stored in: `/packages/api/src/prompts/`
- `meal-plan-generator.ts`
- `recipe-parser.ts`
- `nutritionist-feedback.ts`
- `inventory-recognition.ts`

---

## Common Commands

```powershell
# Development
npm run dev                    # Start all services
npm run dev:api               # API only
npm run dev:mobile            # Mobile only

# Testing
npm test                      # Run all tests
npm test -- --watch          # Watch mode
npm test -- --coverage       # With coverage report

# Database
npm run db:migrate           # Apply migrations
npm run db:seed              # Seed development data
npm run db:reset             # Reset and reseed (destructive!)

# Code Quality
npm run lint                 # ESLint
npm run lint:fix            # Auto-fix linting issues
npm run typecheck           # TypeScript check
npm run format              # Prettier

# Build
npm run build               # Production build

# Git
git status                  # Check what's changed
git add .                   # Stage all changes
git commit -m "message"     # Commit
git push                    # Push to remote

# Cache clearing (when things are stale)
Remove-Item -Recurse -Force node_modules/.cache, apps/mobile/.expo, apps/web/.next -ErrorAction SilentlyContinue
```

---

## Troubleshooting

### Server Won't Start

```powershell
# Check if port is in use
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue

# Kill process using a port (find PID from above, then):
Stop-Process -Id <PID> -Force

# Check for missing dependencies
npm install

# Clear caches and restart
cd apps/mobile; npx expo start -c
```

### Database Issues

```powershell
# Check Supabase status
npx supabase status

# Reset local database
npx supabase db reset

# Check migration status
npx supabase migration list
```

### Type Errors After Changes

```powershell
# Regenerate types from database
npm run generate:types

# Clear TypeScript cache
Remove-Item -Recurse -Force node_modules/.cache -ErrorAction SilentlyContinue
npx tsc --build --clean
```

### Chris Can't See Changes

```powershell
# Verify changes are pushed
git status
git log --oneline -3

# If not pushed:
git push origin <branch-name>

# Tell Chris to pull:
# "Please run: git pull origin <branch-name>"
```

### Stale Code / Changes Not Appearing

Turbopack caching can cause old code to persist even after changes. **If changes aren't appearing, clear caches before debugging further:**

```powershell
# Nuclear option - clear ALL caches (single line, paste-friendly)
Remove-Item -Recurse -Force node_modules/.cache, .next/cache, apps/web/.next, apps/mobile/.expo, $env:TEMP/turbopack-* -ErrorAction SilentlyContinue

# Restart Metro bundler with cache clear
cd apps/mobile; npx expo start -c

# Restart Next.js/web with cache clear  
cd apps/web; Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue; npm run dev
```

**Signs of cache issues:**
- Code changes not reflected in running app
- Old console.log statements still appearing
- TypeScript shows no errors but runtime behaviour is wrong
- "I just changed that" but old behaviour persists

**When to suspect caching:**
- After switching git branches
- After pulling significant changes
- After changing config files (tsconfig, babel, etc.)
- When behaviour doesn't match the code you're reading

---

## Documentation References

- Full PRD: `/docs/PRD.md`
- API Documentation: `/docs/api.md`
- Database Schema: `/docs/schema.md`
- Component Library: `/docs/components.md`

---

## 🔴 Final Reminders

1. **Never report complete without verification** - Run the checklist every time
2. **Always commit and push** - Chris can't see uncommitted changes
3. **Test manually** - Don't assume it works because it compiles
4. **Clear caches when stuck** - Turbopack/Metro caching causes stale code; clear before debugging
5. **Read before writing** - Understand existing code first
6. **Ask if unsure** - Clarification beats assumptions
