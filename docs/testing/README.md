# Test Planning & Management

This directory contains all test planning, analysis, and execution documentation for the Family Meal Planner application.

## Quick Start

```powershell
# Run the Test Plan Agent
/test-plan analyze           # Full gap analysis
/test-plan validate-regression  # Validate regression pack
/test-plan validate-e2e      # Validate E2E coverage
/test-plan audit-mcp         # Audit MCP tool usage
/test-plan generate-manifest regression  # Generate test manifest
```

## Directory Structure

```
docs/testing/
├── README.md                           # This file
├── config/
│   ├── project-config.ts               # Project-specific configuration (edit for new projects)
│   └── test-analyzer.ts                # Analysis functions and utilities
├── registry/
│   ├── feature-registry.json           # Auto-generated feature inventory
│   ├── test-mapping.json               # Maps features to tests
│   └── test-manifest-<mode>.json       # Generated test manifests
├── templates/
│   ├── test-approach.md                # How we test this project
│   ├── unit-test-template.ts           # Boilerplate for unit tests
│   ├── integration-test-template.ts    # Boilerplate for integration tests
│   ├── e2e-test-template.ts            # Boilerplate for E2E tests
│   └── test-report-template.md         # Execution report template
├── execution-history/                  # Audit trail (30-day retention)
│   └── YYYY-MM-DD_HH-MM_<mode>.json    # Test run results
└── analysis/
    ├── coverage-analysis.md            # Current coverage state
    └── mcp-capability-audit.md         # MCP tool usage analysis
```

## Key Components

### Project Configuration (`config/project-config.ts`)

**This is the ONLY file to modify when porting to a new project.**

Contains:
- Project metadata
- Source code paths
- Critical user journeys
- Database entities
- Feature module definitions
- MCP server configuration
- Test execution modes
- Coverage targets

### Test Analyzer (`config/test-analyzer.ts`)

Provides functions for:
- Discovering test files
- Analyzing feature coverage
- Identifying gaps
- Auditing MCP usage
- Generating test manifests
- Creating analysis reports

### Templates

| Template | Purpose |
|----------|---------|
| `test-approach.md` | Overall testing strategy document |
| `unit-test-template.ts` | Starting point for unit tests |
| `integration-test-template.ts` | Starting point for API/integration tests |
| `e2e-test-template.ts` | Starting point for E2E browser tests |
| `test-report-template.md` | Format for execution reports |

## Test Execution Modes

| Mode | Description | Duration |
|------|-------------|----------|
| `quick` | Critical unit tests only | ~1 min |
| `unit` | All unit tests | ~2 min |
| `api` | All API tests | ~3 min |
| `integration` | API + integration tests | ~5 min |
| `e2e` | All E2E browser tests | ~10 min |
| `e2e-critical` | Critical E2E only | ~5 min |
| `regression` | Unit + API + integration | ~10 min |
| `complete` | All test types | ~15 min |
| `smoke` | Quick build + critical E2E | ~2 min |
| `pre-merge` | Regression + critical E2E | ~10 min |

## Agents

### Test Plan Agent (`/test-plan`)

Responsible for:
- Analyzing test coverage
- Identifying gaps
- Generating test manifests
- Auditing MCP usage
- Maintaining documentation

### Test Execution Agent (`/test-execute`) - Planned

Will be responsible for:
- Executing tests based on manifests
- Running specific modes
- Generating execution reports
- Managing execution history

## MCP Integration

The testing system leverages three MCP servers:

| Server | Testing Use |
|--------|-------------|
| **Playwright** | Browser automation for E2E tests |
| **Supabase** | Database verification and test data |
| **Next.js DevTools** | Build/runtime error monitoring |

## Execution History

Test execution results are stored in `execution-history/` with 30-day retention.

Files are named: `YYYY-MM-DD_HH-MM_<mode>.json`

Each file contains:
- Execution timestamp and mode
- Test counts (passed/failed/skipped)
- Coverage metrics
- Duration and performance data
- Failures with stack traces
- MCP tool usage stats

## Coverage Targets

| Type | Branches | Functions | Lines |
|------|----------|-----------|-------|
| Unit | 80% | 85% | 85% |
| Integration | 60% | 70% | 70% |
| Overall | 70% | 80% | 80% |

## Porting to New Projects

To use this testing system on a new project:

1. Copy the `docs/testing/` folder structure
2. Edit `config/project-config.ts`:
   - Update project metadata
   - Define source code paths
   - List critical user journeys
   - Configure feature modules
   - Set MCP servers available
3. Copy `.claude/commands/test-plan.md`
4. Create `tests/e2e/` directory
5. Run `/test-plan analyze` to validate setup

## Related Documentation

- [CLAUDE.md](/CLAUDE.md) - Main project instructions
- [tests/README.md](/tests/README.md) - Test suite documentation
- [tests/e2e/README.md](/tests/e2e/README.md) - E2E test documentation
- [.claude/commands/test-plan.md](/.claude/commands/test-plan.md) - Test Plan Agent

## Maintenance

Run these periodically:

```powershell
# Clean up old execution history
/test-plan cleanup-history

# Update documentation
/test-plan update-docs

# Full analysis
/test-plan analyze
```
