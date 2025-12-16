# E2E Tests

End-to-end tests for critical user journeys using Playwright MCP.

## Overview

E2E tests verify complete user workflows by automating browser interactions. These tests use the Playwright MCP server to control the browser, capture screenshots, and verify application behavior.

## Test Structure

```
tests/e2e/
├── README.md                    # This file
├── auth.spec.ts                 # Authentication journeys
├── recipe-import.spec.ts        # Recipe import journeys
├── meal-plan-generation.spec.ts # Meal planning journeys
├── shopping-list.spec.ts        # Shopping list journeys
└── inventory.spec.ts            # Inventory management journeys
```

## Test Specification Format

E2E tests are defined as specification objects that the Test Execution Agent interprets:

```typescript
export interface E2ETestSpec {
  id: string
  name: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  requiresAuth: boolean
  timeout: number
  steps: E2ETestStep[]
  cleanup?: E2ECleanupStep[]
}
```

See `docs/testing/templates/e2e-test-template.ts` for full specification details.

## Running E2E Tests

E2E tests are executed by the Test Execution Agent using Playwright MCP:

```powershell
# Via Test Execution Agent (recommended)
/test-execute e2e

# Via Test Execution Agent - critical only
/test-execute e2e-critical
```

## MCP Tools Used

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URLs |
| `browser_click` | Click elements |
| `browser_type` | Type into inputs |
| `browser_fill_form` | Fill multiple form fields |
| `browser_snapshot` | Capture accessibility tree |
| `browser_take_screenshot` | Visual capture |
| `browser_console_messages` | Check for errors |
| `browser_wait_for` | Wait for text/elements |

## Test Data Management

E2E tests should:
1. Create their own test data (using Supabase MCP)
2. Use unique identifiers (timestamps/UUIDs)
3. Clean up after completion

## Writing New E2E Tests

1. Copy the template from `docs/testing/templates/e2e-test-template.ts`
2. Define test steps following the specification format
3. Include database verification steps
4. Add cleanup to remove test data
5. Test locally before committing

## Critical User Journeys

Priority tests that must pass before release:

| Journey | File | Priority |
|---------|------|----------|
| User Registration & Login | `auth.spec.ts` | Critical |
| Recipe Import from URL | `recipe-import.spec.ts` | Critical |
| Meal Plan Generation | `meal-plan-generation.spec.ts` | Critical |
| Shopping List Creation | `shopping-list.spec.ts` | Critical |
| Inventory Management | `inventory.spec.ts` | High |

## Troubleshooting

### Browser not starting
- Ensure Playwright MCP is configured in `.mcp.json`
- Check that `@playwright/mcp` is installed
- Try `npx @playwright/mcp install`

### Element not found
- Use `browser_snapshot` to see current page state
- Check element selectors are correct
- Add appropriate `waitAfter` delays

### Test flakiness
- Increase `timeout` values
- Add explicit waits between steps
- Use `browser_wait_for` for dynamic content

## Related Documentation

- [Test Approach](../../docs/testing/templates/test-approach.md)
- [E2E Template](../../docs/testing/templates/e2e-test-template.ts)
- [Project Config](../../docs/testing/config/project-config.ts)
