# Development Server Restart Checklist

## After Every Code Change - MANDATORY STEPS

### 1. Kill All Existing Dev Servers
```bash
pkill -9 -f "next" || true
```
**Why:** Prevents multiple servers and port conflicts

### 2. Clear Next.js Build Cache
```bash
rm -rf .next
```
**Why:** Ensures fresh compilation of all changes

### 3. Verify No Processes on Port 3000
```bash
lsof -i:3000
```
**Expected:** Should return nothing. If something is there, kill it:
```bash
lsof -ti:3000 | xargs kill -9
```

### 4. Start Dev Server
```bash
npm run dev
```
**Run in background if needed** - keep the shell ID for monitoring

### 5. Wait for Server Ready
```bash
sleep 5
```
**Why:** Give Turbopack time to compile (usually 2-3 seconds)

### 6. Verify Server is Listening
```bash
curl -s http://localhost:3000 | head -20
```
**Expected:** Should return HTML

### 7. Hard Refresh Browser
- **Windows/Linux:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R
**Why:** Clears browser cache of old JavaScript bundles

### 8. Clear Browser Cache (if hard refresh doesn't work)
1. Open DevTools (F12)
2. Application tab → Storage → Clear site data
3. Close and reopen browser

## Quick One-Liner for Steps 1-4
```bash
pkill -9 -f "next" 2>/dev/null; rm -rf .next && sleep 2 && npm run dev
```

## Troubleshooting

### Server Says Ready But Browser Can't Connect
1. Check if process is actually listening: `lsof -iTCP -sTCP:LISTEN -P -n | grep node`
2. If nothing, the server crashed - check logs
3. Kill everything and restart from step 1

### Changes Not Appearing After Restart
1. Verify file was actually saved: `ls -la app/path/to/file`
2. Check git status to see if changes are tracked
3. Clear browser Application cache completely
4. Try incognito/private window

### Multiple Servers Running
1. Find all: `ps aux | grep -E "next|node" | grep -v grep`
2. Kill all: `pkill -9 -f "next"`
3. Clean start from step 1

## Common Issues

**Issue:** Port 3000 in use
**Fix:** `lsof -ti:3000 | xargs kill -9 2>/dev/null`

**Issue:** Lock file error
**Fix:** `rm -rf .next && npm run dev`

**Issue:** Changes not hot-reloading
**Fix:** Turbopack sometimes misses changes - full restart required

**Issue:** Browser showing old version
**Fix:** Clear Application cache + hard refresh

## Best Practices

1. **Always** check dev server is running before expecting changes
2. **Always** wait 3-5 seconds after starting server before testing
3. **Always** hard refresh browser after server restart
4. **Never** edit files while server is compiling
5. **Commit often** to verify what's actually in the codebase

## Automated Helper Script

Consider creating: `scripts/dev-restart.sh`
```bash
#!/bin/bash
echo "🔄 Restarting dev server..."
pkill -9 -f "next" 2>/dev/null
rm -rf .next
echo "✅ Cleaned cache"
sleep 2
npm run dev &
echo "⏳ Waiting for server..."
sleep 5
echo "✅ Server should be ready at http://localhost:3000"
echo "🌐 Hard refresh your browser (Ctrl+Shift+R)"
```

Make executable: `chmod +x scripts/dev-restart.sh`
Run: `./scripts/dev-restart.sh`
