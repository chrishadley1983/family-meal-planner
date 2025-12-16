# Claude Code Prompt: Merge Feature Branch to Main

> **ARCHIVED:** This prompt has been superseded by the slash command at `.claude/commands/merge-feature.md`.
> Use `/merge-feature` in Claude Code instead of referencing this file directly.
> This file is kept for historical reference.

## Role

You are a **Senior Developer** responsible for safely merging completed feature work back to main. You are methodical, thorough, and never skip verification steps.

**CRITICAL: Review `CLAUDE.md` before starting. Follow all project conventions.**

---

## Current Context (Fill in before running)

```
Feature branch to merge: ____________________
Can push directly to main: Yes / No
Other branches to review: ____________________
Known pre-existing test failures: ____________________
```

## Your Permissions

For this project:
- ✅ **Can push directly to main** (no PR required)
- ✅ **Can delete remote branches**
- ✅ **Can force delete local branches after merge**

---

## Pre-Merge Checklist

### 1. Check Current State

```powershell
git branch
```

```powershell
git status
```

```powershell
git fetch origin
```

**STOP if there are uncommitted changes. Either commit them or stash them first.**

### 2. Verify What Will Be Merged

**This is critical - confirm you're merging the right commits:**

```powershell
git log --oneline main..<feature-branch-name>
```

Review the commit list. Does it match what you expect? If not, STOP and investigate.

### 3. Check for Other Unmerged Branches

```powershell
git branch -a --no-merged main
```

Note any other branches that may need attention. Don't lose work!

### 4. Ensure Main is Up to Date

```powershell
git checkout main
```

```powershell
git pull origin main
```

---

## Merge Process

### 5. Merge Feature Branch to Main

**Run each command separately - do not concatenate:**

```powershell
git merge <feature-branch-name> --no-ff -m "Merge <feature-branch-name>: <brief description>"
```

The `--no-ff` flag preserves branch history in the commit graph.

### 6. Resolve Any Conflicts

If conflicts occur:
1. Open conflicted files
2. Resolve conflicts carefully (keep both changes where appropriate)
3. Test the merged code
4. `git add .`
5. `git commit`

**If unsure about a conflict, STOP and ask.**

---

## Post-Merge Verification

**Do NOT push until all verification steps pass.**

### 7. TypeScript Compilation

```powershell
npx tsc --noEmit
```

**Must pass with zero errors.**

### 8. Run Tests

```powershell
npm test
```

**Decision point:**
- All tests pass → Continue
- New failures introduced by this merge → STOP, fix before pushing
- Only pre-existing failures (same as before merge) → Document and continue

### 9. Clear Caches and Start Dev Server

```powershell
Remove-Item -Recurse -Force node_modules/.cache, .next -ErrorAction SilentlyContinue
```

```powershell
npm run dev
```

### 10. Manual Smoke Test

Verify in browser (check Chrome DevTools Console for errors):

- [ ] App loads at localhost:3000
- [ ] No console errors on load
- [ ] Authentication works (login/logout)
- [ ] Navigate to main pages without errors
- [ ] **Specifically test the feature that was just merged**
- [ ] Check related functionality for regressions

### 11. Database Check (if schema changed)

```powershell
npx prisma db pull
```

```powershell
npx prisma generate
```

Verify schema is in sync.

---

## Push to Origin

### 12. Push Main

```powershell
git push origin main
```

**Verify the push succeeded before continuing to cleanup.**

---

## Cleanup

### 13. Delete Local Branch

After confirming push succeeded, delete the local branch:

```powershell
git branch -D <feature-branch-name>
```

**Note:** Use `-D` (force delete) not `-d`. Git may warn "not fully merged" because the branch isn't merged to its remote tracking branch - this is safe to ignore *after* you've confirmed the merge to main succeeded and pushed.

### 14. Delete Remote Branch

```powershell
git push origin --delete <feature-branch-name>
```

### 15. Prune Stale References

```powershell
git fetch --prune
```

### 16. Check for Untracked Files

```powershell
git status
```

If there are untracked folders (like `test-results/`, `coverage/`, etc.), add them to `.gitignore`:

```powershell
echo "test-results/" >> .gitignore
```

```powershell
git add .gitignore
```

```powershell
git commit -m "chore: Update .gitignore"
```

```powershell
git push origin main
```

### 17. Final Verification

```powershell
git branch -a
```

Should show:
- `* main` locally
- No deleted feature branches
- `remotes/origin/main`

---

## Completion Report

Provide this summary when done:

```
## Merge Complete ✅

**Branch merged:** <feature-branch-name>
**Commits merged:** <number>
**Description:** <what was in this branch>

### Verification Results
- TypeScript: ✅ Pass
- Tests: ✅ X passing / Y failing (all pre-existing)
- Dev server: ✅ Running
- Manual smoke test: ✅ Pass

### Cleanup
- Local branch deleted: ✅
- Remote branch deleted: ✅
- References pruned: ✅

### Other Branches Noted
- <any unmerged branches that need attention>

### Notes
<any issues encountered, warnings, or follow-up items>
```

---

## Recovery Commands

### Undo merge (before pushing):

```powershell
git reset --hard HEAD~1
```

### Undo merge (after pushing):

```powershell
git revert -m 1 HEAD
```

```powershell
git push origin main
```

### Recover deleted branch:

```powershell
git reflog
```

Find the commit hash, then:

```powershell
git checkout -b <branch-name> <commit-hash>
```

---

## ⚠️ Important Reminders

1. **Run commands one at a time** - Do not copy multiple commands as one line
2. **Verify before merge** - Always check `git log main..<branch>` to confirm what's being merged
3. **`-D` is safe after merge** - The "not fully merged" warning is about the remote tracking branch, not main
4. **Pre-existing test failures** - Document but don't block merge for failures that existed before your changes
5. **Never force push to main** - Use `git push`, not `git push --force`
6. **If unsure, ask** - Better to pause than to break main
