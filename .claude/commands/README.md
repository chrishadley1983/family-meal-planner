# Claude Code Slash Commands

This folder contains custom slash commands for automating common workflows in the Family Meal Planner project.

## How to Use

Type `/` in Claude Code followed by the command name. For example:
- `/merge-feature` - Runs the merge feature agent

## Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `/merge-feature` | Safely merge a feature branch to main | After completing feature work on a branch |
| `/test-plan` | Analyze test coverage and generate manifests | Before releases, after feature changes, for test planning |
| `/test-build` | Generate test files to fill coverage gaps | After `/test-plan analyze` identifies missing tests |
| `/code-review` | Thorough code review with security, performance, and quality analysis | Before merging PRs, after significant changes |

## How Commands Work

Each `.md` file in this folder defines a slash command:
- The filename (without `.md`) becomes the command name
- The file contents are the instructions Claude follows
- Commands can reference other files (like CLAUDE.md) for context

## Adding New Commands

To add a new command:

1. Create a new `.md` file in this folder (e.g., `security-test.md`)
2. Write clear instructions for the agent to follow
3. The command will be available as `/security-test`

### Command Template

```markdown
# Command Name

You are a **[Role]** responsible for [task description].

## Phase 1: [First Phase Name]
### 1.1 [Step Name]
[Instructions...]

## Phase 2: [Second Phase Name]
[...]

## Agent Behaviour Rules
1. [Rule 1]
2. [Rule 2]
```

## Planned Future Commands

| Command | Purpose | Status |
|---------|---------|--------|
| `/test-execute` | Execute tests based on manifest from test-plan | Planned |
| `/qa-review` | Quality assurance checklist | Planned |
| `/update-docs` | Update documentation | Planned |

## Test Agent Workflow

The test agents work together in a pipeline:

```
/test-plan analyze     →  Identifies coverage gaps
                           ↓
/test-build <mode>     →  Generates test files to fill gaps
                           ↓
/test-execute <mode>   →  Runs the tests (planned)
```

### Test Build Modes

| Mode | Description |
|------|-------------|
| `critical` | Build tests for CRITICAL priority gaps |
| `high` | Build tests for HIGH priority gaps |
| `medium` | Build tests for MEDIUM priority gaps |
| `feature:<name>` | Build tests for specific feature (e.g., `feature:auth`) |
| `type:<type>` | Build specific test type: `type:e2e`, `type:api`, `type:unit` |
| `all` | Build all missing tests (large output) |

## Code Review Workflow

The code review agent provides thorough analysis of code changes:

```
/code-review <mode>     →  Analyzes changes for issues
                            ↓
                        Generates report in docs/reviews/
                            ↓
                        Fix critical/high issues
                            ↓
/code-review staged     →  Re-verify fixes
                            ↓
                        Human approval
                            ↓
/merge-feature          →  Merge to main
```

### Code Review Modes

| Mode | Description |
|------|-------------|
| `staged` | Review only staged changes (`git diff --staged`) |
| `branch` | Review all changes vs main/master branch |
| `commit:<sha>` | Review a specific commit |
| `pr:<number>` | Review a pull request (requires GitHub CLI) |
| `file:<path>` | Deep review of a specific file |
| `feature:<name>` | Review all files related to a feature module |
| `security` | Security-focused review only |
| `performance` | Performance-focused review only |
| `dry` | DRY/duplication-focused review - find redundant code |
| `architecture` | File organisation and structure review |
| `full` | Complete review with all checks |

### Review Severity Levels

| Severity | Action Required |
|----------|-----------------|
| Critical | Must fix before merge |
| High | Should fix before merge |
| Medium | Fix or justify skip |
| Low | Nice to have |
| Info | No action required |

### Configuration

Review settings can be customised in `docs/reviews/config/review-config.ts`:
- Strictness level (strict/moderate/relaxed)
- Enabled categories (security, performance, DRY, etc.)
- Critical paths (always reviewed thoroughly)
- Code quality thresholds (complexity, function length, etc.)
- Custom rules for project-specific checks

## Best Practices

1. **Be explicit** - Commands should have clear steps, not vague instructions
2. **Handle edge cases** - Include what to do when things go wrong
3. **Ask, don't assume** - When decisions are needed, prompt the user
4. **Report clearly** - End with a summary of what was done
5. **Respect permissions** - Note any actions the agent cannot perform (like pushing to main)

## Related Files

- `CLAUDE.md` - Project conventions and workflows (root level)
- `.claude/settings.json` - Claude Code settings
- `docs/testing/config/project-config.ts` - Test and feature configuration (shared with test agents)
- `docs/reviews/config/review-config.ts` - Code review configuration
- `docs/merge-branch-to-main-prompt_1.md` - Original merge prompt (archived reference)
