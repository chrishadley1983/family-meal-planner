# Claude Code Slash Commands

This folder contains custom slash commands for automating common workflows in the Family Meal Planner project.

## How to Use

Type `/` in Claude Code followed by the command name. For example:
- `/merge-feature` - Runs the merge feature agent

## Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `/merge-feature` | Safely merge a feature branch to main | After completing feature work on a branch |

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
| `/security-test` | Run security checks on codebase | Planned |
| `/regression-test` | Full regression test suite | Planned |
| `/qa-review` | Quality assurance checklist | Planned |
| `/update-docs` | Update documentation | Planned |

## Best Practices

1. **Be explicit** - Commands should have clear steps, not vague instructions
2. **Handle edge cases** - Include what to do when things go wrong
3. **Ask, don't assume** - When decisions are needed, prompt the user
4. **Report clearly** - End with a summary of what was done
5. **Respect permissions** - Note any actions the agent cannot perform (like pushing to main)

## Related Files

- `CLAUDE.md` - Project conventions and workflows (root level)
- `.claude/settings.json` - Claude Code settings
- `docs/merge-branch-to-main-prompt_1.md` - Original merge prompt (archived reference)
