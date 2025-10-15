# 🚀 FINAL RESTART PROCEDURE

## Do This NOW (Step by Step)

### Step 1: Restart Dev Server
```bash
# Kill everything
pkill -f "expo|metro"

# Clear all caches
rm -rf node_modules/.cache
rm -rf .expo

# Start fresh
npm run start -- --clear
```

Wait for: `Metro waiting on exp://localhost:8081`

### Step 2: Close ALL Browser Tabs
- Close EVERY tab that has your app open
- Don't just switch - actually close them all
- This ensures old cached code is gone

### Step 3: Open Fresh Tab
1. Open new browser tab
2. Go to: http://localhost:8081
3. Open DevTools (F12)
4. Go to Console tab

### Step 4: Look for Success Messages
You MUST see these logs when page loads:
```
✅ [Supabase] Blocking storage event listener to prevent cross-tab refresh
✅ [Visibility] Web visibility tracking enabled (NO auto-refresh)
```

If you DON'T see these logs, the fix isn't active yet!

### Step 5: Test Tab Switching
1. Log in to your dashboard
2. Clear console (click 🚫 icon)
3. Open new tab → Go to Google
4. Search for "warp terminal"
5. Wait 5 seconds
6. Switch back to app tab

### Step 6: Check Results

#### ✅ SUCCESS - You should see:
- Dashboard appears INSTANTLY
- Console shows ONLY: `[Analytics] auth.tab_focused`
- No loading spinner
- No `_recoverAndRefresh` logs
- Network tab shows ZERO requests

#### ❌ FAIL - If you see:
- Loading spinner for >1 second
- `_recoverAndRefresh` in console
- `_acquireLock` in console
- Network requests on tab focus

## If It STILL Fails

### Nuclear Option:
```bash
# Save your changes
git add -A
git commit -m "WIP: before nuclear reset"

# Clean everything
rm -rf node_modules/.cache
rm -rf .expo
rm -rf .metro
rm -rf node_modules

# Reinstall
npm install

# Start completely fresh
npm run start -- --clear
```

### Then Check Browser:
1. Open DevTools Console
2. Run this to verify fix is loaded:
```javascript
// Should return "function" with our patch
console.log(window.addEventListener.toString().includes('storage'));
```

Should return `true` if our patch is active.

## Still Stuck?

Share this info:
1. Output of: `grep -n "Blocking storage" lib/supabase.ts`
2. Screenshot of browser console on tab switch
3. Screenshot of Network tab on tab switch
4. Output of: `ps aux | grep expo`

The fix is definitely in the code, so if it's not working, it means:
- Old code is still running (restart needed)
- Browser cached old code (hard reload needed)
- Component-level issue (not auth-level)
