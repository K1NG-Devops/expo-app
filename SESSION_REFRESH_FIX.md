# Session Refresh Token Fix

## 🐛 Issue
```
ERROR [SessionManager] Supabase refresh error: Invalid Refresh Token: Already Used
ERROR Session refresh attempt 1 failed: [AuthApiError: Invalid Refresh Token: Already Used]
```

## 🔍 Root Cause
Multiple concurrent session refresh attempts were racing to refresh the same token. Supabase's refresh tokens are **single-use only**, so when multiple refreshes happen simultaneously, only the first succeeds and subsequent attempts fail with "Already Used" error.

## ✅ Fix Applied

### Changes Made:
**File:** `lib/sessionManager.ts`

1. **Added Concurrency Protection:**
   - Track pending refresh operations with `pendingRefresh` variable
   - If a refresh is already in progress, return the pending promise instead of starting a new one

2. **Handle "Already Used" Errors:**
   - When receiving "Already Used" error, fetch the current stored session instead of failing
   - This handles the case where another concurrent refresh succeeded

3. **Extracted Processing Logic:**
   - Created `processRefreshResult()` helper function to handle refresh response
   - Improves code maintainability and reusability

### Code Changes:
```typescript
// Track pending refresh to prevent concurrent calls
let pendingRefresh: Promise<UserSession | null> | null = null;

async function refreshSession(
  refreshToken: string,
  attempt: number = 1,
  maxAttempts: number = 3
): Promise<UserSession | null> {
  // If refresh is already in progress, return the pending promise
  if (pendingRefresh && attempt === 1) {
    console.log('[SessionManager] Refresh already in progress, waiting...');
    return pendingRefresh;
  }
  
  // Handle "Already Used" error by fetching current session
  if (error.message.includes('Already Used')) {
    const currentSession = await getStoredSession();
    if (currentSession) {
      return currentSession;
    }
  }
  
  // ... rest of logic
}
```

## 🧪 Testing

### Expected Behavior After Fix:
1. First refresh attempt starts and is tracked
2. Concurrent refresh attempts wait for the first to complete
3. If "Already Used" error occurs, fetch and return the refreshed session
4. Session stays valid and voice recording uploads work

### Test Steps:
1. Open the app
2. Wait for automatic session refresh
3. Logs should show:
   ```
   ✅ [INFO] Token refreshed successfully
   ✅ [SessionManager] Session refreshed successfully
   ```
   Instead of:
   ```
   ❌ ERROR Invalid Refresh Token: Already Used
   ```

## 📊 Impact

### Before:
- Session refresh fails randomly
- User gets logged out unexpectedly
- Voice recording fails due to no authentication

### After:
- Session refresh succeeds consistently
- Concurrent refresh attempts are handled gracefully
- Voice recording works reliably

## 🔄 Related Issues
- Voice transcription failing due to auth errors
- "Microphone Permission Error" popup (actually auth issue)
- RLS policy violations (due to missing auth token)

---

**Status:** ✅ Fixed  
**Date:** October 8, 2025  
**Impact:** High - Affects all authenticated operations
