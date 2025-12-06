# Development Server Restart Checklist

## After Every Code Change - MANDATORY STEPS

### 1. Kill All Existing Dev Servers

**Bash/Linux:**
```bash
pkill -9 -f "next" || true
```

**Windows PowerShell:**
```powershell
taskkill /F /IM node.exe 2>$null
```

**Why:** Prevents multiple servers and port conflicts

### 2. Clear Next.js Build Cache

**Bash/Linux:**
```bash
rm -rf .next
```

**Windows PowerShell:**
```powershell
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
```

**Why:** Ensures fresh compilation of all changes

### 3. Verify No Processes on Port 3000

**Bash/Linux:**
```bash
lsof -i:3000
```

**Windows PowerShell:**
```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

**Expected:** Should return nothing. If something is there, kill it:

**Bash/Linux:**
```bash
lsof -ti:3000 | xargs kill -9
```

**Windows PowerShell:**
```powershell
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

### 4. Start Dev Server

**Both platforms:**
```bash
npm run dev
```

**Why:** Starts the Next.js development server

### 5. Wait for Server Ready

**Bash/Linux:**
```bash
sleep 5
```

**Windows PowerShell:**
```powershell
Start-Sleep -Seconds 5
```

**Why:** Give Turbopack time to compile (usually 2-3 seconds)

### 6. Verify Server is Listening

**Bash/Linux:**
```bash
curl -s http://localhost:3000 | head -20
```

**Windows PowerShell:**
```powershell
(Invoke-WebRequest -Uri http://localhost:3000 -TimeoutSec 5).Content.Substring(0,500)
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

**Bash/Linux:**
```bash
pkill -9 -f "next" 2>/dev/null; rm -rf .next && sleep 2 && npm run dev
```

**Windows PowerShell:**
```powershell
taskkill /F /IM node.exe 2>$null; if (Test-Path .next) { Remove-Item -Recurse -Force .next }; npm run dev
```

## Troubleshooting

### Server Says Ready But Browser Can't Connect

**Bash/Linux:**
1. Check if process is actually listening: `lsof -iTCP -sTCP:LISTEN -P -n | grep node`
2. If nothing, the server crashed - check logs
3. Kill everything and restart from step 1

**Windows PowerShell:**
1. Check if process is listening: `Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue`
2. If nothing, the server crashed - check logs
3. Kill everything and restart from step 1

### Changes Not Appearing After Restart

**Bash/Linux:**
1. Verify file was actually saved: `ls -la app/path/to/file`
2. Check git status to see if changes are tracked
3. Clear browser Application cache completely
4. Try incognito/private window

**Windows PowerShell:**
1. Verify file was actually saved: `Get-ChildItem app/path/to/file`
2. Check git status to see if changes are tracked
3. Clear browser Application cache completely
4. Try incognito/private window

### Multiple Servers Running

**Bash/Linux:**
1. Find all: `ps aux | grep -E "next|node" | grep -v grep`
2. Kill all: `pkill -9 -f "next"`
3. Clean start from step 1

**Windows PowerShell:**
1. Find all: `Get-Process node -ErrorAction SilentlyContinue`
2. Kill all: `taskkill /F /IM node.exe`
3. Clean start from step 1

## Common Issues

**Issue:** Port 3000 in use

**Bash/Linux Fix:** `lsof -ti:3000 | xargs kill -9 2>/dev/null`

**Windows PowerShell Fix:** `Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force`

**Issue:** Lock file error

**Bash/Linux Fix:** `rm -rf .next && npm run dev`

**Windows PowerShell Fix:** `Remove-Item -Recurse -Force .next; npm run dev`

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

## Automated Helper Scripts

### Bash/Linux Script

Create: `scripts/dev-restart.sh`
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

### Windows PowerShell Script

Create: `scripts/dev-restart.ps1`
```powershell
Write-Host "🔄 Restarting dev server..." -ForegroundColor Cyan
taskkill /F /IM node.exe 2>$null
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
}
Write-Host "✅ Cleaned cache" -ForegroundColor Green
Start-Sleep -Seconds 2
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev"
Write-Host "⏳ Waiting for server..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
Write-Host "✅ Server should be ready at http://localhost:3000" -ForegroundColor Green
Write-Host "🌐 Hard refresh your browser (Ctrl+Shift+R)" -ForegroundColor Cyan
```

Run: `.\scripts\dev-restart.ps1`

Note: You may need to enable script execution first:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
