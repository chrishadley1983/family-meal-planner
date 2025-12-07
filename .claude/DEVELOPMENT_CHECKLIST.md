# Development Checklist for Claude

## CRITICAL: User is running on LOCAL MACHINE
- All changes must be committed and pushed to git
- User must pull changes to see them
- Always verify user has latest code before testing

---

## 1. BEFORE Making Changes

- [ ] Understand the requirement clearly
- [ ] Read existing code in affected files
- [ ] Create TodoWrite checklist for the task
- [ ] Identify all files that need changes

---

## 2. WHILE Making Changes

- [ ] Read files before editing (use Read tool)
- [ ] Make changes using Edit/Write tools
- [ ] Add debug logging if needed for testing
- [ ] Verify syntax after changes

---

## 3. TESTING Changes (In Cloud Environment)

- [ ] Verify files contain expected changes (grep/Read)
- [ ] Check for TypeScript/syntax errors
- [ ] Test in cloud environment if applicable
- [ ] Review console logs for errors

---

## 4. COMMITTING Changes

- [ ] Run `git status` to see all changes
- [ ] Run `git diff` to review changes
- [ ] Add files: `git add <files>`
- [ ] Commit with clear message: `git commit -m "type: description"`
- [ ] Verify commit: `git log -1`

---

## 5. PUSHING Changes (CRITICAL)

- [ ] Push to branch: `git push -u origin claude/connect-github-repo-0161FevHXGtfyoGwKBjYn32Z`
- [ ] Verify push succeeded (check output)
- [ ] If network error, retry with exponential backoff (2s, 4s, 8s, 16s)
- [ ] Confirm: `git status` shows "up to date with origin"

---

## 6. USER TESTING (LOCAL MACHINE)

**Tell user to run these commands:**

```bash
# 1. Stop local dev server (Ctrl+C)

# 2. Pull latest changes
git pull origin claude/connect-github-repo-0161FevHXGtfyoGwKBjYn32Z

# 3. Verify code is updated (example)
grep "SEARCH_TERM" path/to/changed/file.tsx

# 4. Delete local cache
rm -rf .next

# 5. Restart dev server
npm run dev
```

- [ ] Instruct user to pull latest changes
- [ ] Instruct user to verify code locally
- [ ] Instruct user to delete .next cache
- [ ] Instruct user to restart dev server
- [ ] Ask user to hard refresh browser (Ctrl+Shift+R)

---

## 7. VERIFICATION

- [ ] User confirms they see the changes
- [ ] User tests functionality works
- [ ] Check browser console for errors (ask user)
- [ ] Mark TodoWrite tasks as completed
- [ ] Remove any debug code if added

---

## 8. COMMON ISSUES

### Changes not appearing:
1. User didn't pull latest code → Tell them to pull
2. User's .next cache is stale → Tell them to delete .next
3. Browser cache → Tell them hard refresh (Ctrl+Shift+R)
4. Service worker cache → Tell them to unregister service workers
5. User not on correct branch → Tell them to checkout correct branch

### Git push fails:
1. Network error → Retry with exponential backoff
2. Branch name incorrect → Must start with 'claude/' and match session ID
3. Authentication error → Check git credentials

---

## NEVER SKIP THESE STEPS:

1. ✅ Always commit changes
2. ✅ Always push to remote
3. ✅ Always tell user to pull before testing
4. ✅ Always tell user to delete .next cache
5. ✅ Always use TodoWrite to track progress

---

## Template Message for User Testing:

```
I've pushed the changes to git. Please run these commands on your local machine:

1. Stop your dev server (Ctrl+C)
2. Pull latest: git pull origin claude/connect-github-repo-0161FevHXGtfyoGwKBjYn32Z
3. Verify code: grep "EXPECTED_TEXT" path/to/file
4. Clear cache: rm -rf .next
5. Restart: npm run dev
6. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

Then test [SPECIFIC FEATURE] and let me know what you see!
```
