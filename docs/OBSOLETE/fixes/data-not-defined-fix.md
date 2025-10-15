# Fix for "data is not defined" Error

## 🚨 Error Details

**Error Message**: 
```
Uncaught Error: data is not defined
Source: Line 319 - has_session: !!data.session,
```

**Location**: `contexts/AuthContext.tsx` in the visibility handler callback

## 🎯 Root Cause

The error occurred because in the visibility handler callback, I was trying to reference a variable `data` that was only available in the outer scope of the `useEffect` hook, but not within the callback function passed to `initializeVisibilityHandler`.

### Problematic Code:
```typescript
// ❌ BROKEN - 'data' is not in scope here
initializeVisibilityHandler({
  onVisibilityChange: (isVisible) => {
    if (isVisible) {
      track('auth.tab_focused', {
        has_session: !!data.session,  // <- 'data' not defined in this scope
        has_profile: !!currentProfile,
        timestamp: new Date().toISOString(),
      });
    }
  },
});
```

## ✅ Solution Implemented

I fixed this by making the session check asynchronous within the callback, so it gets the current session state at the time the visibility change occurs:

### Fixed Code:
```typescript
// ✅ FIXED - Get session state when needed
initializeVisibilityHandler({
  onVisibilityChange: (isVisible) => {
    if (isVisible && mounted) {
      // Get current state at the time of visibility change
      assertSupabase().auth.getSession().then(({ data: currentSessionData }) => {
        track('auth.tab_focused', {
          has_session: !!currentSessionData.session,  // <- Now properly defined
          has_profile: !!profile,
          timestamp: new Date().toISOString(),
        });
      }).catch(() => {
        // Fallback tracking if session check fails
        track('auth.tab_focused', {
          has_session: false,
          has_profile: !!profile,
          timestamp: new Date().toISOString(),
        });
      });
    }
  },
});
```

## 🔧 Key Improvements

1. **Proper Scope**: The session data is now fetched within the callback scope
2. **Async Handling**: Uses `.then()` to handle the async session check
3. **Error Handling**: Includes `.catch()` for graceful fallback
4. **Mount Check**: Added `mounted` check to prevent setState on unmounted components
5. **Current State**: Gets the actual current session state, not stale state

## 📋 Changes Made

### Files Modified:
- `contexts/AuthContext.tsx` - Fixed the visibility handler callback
- `test-visibility-fix.js` - Added verification test

### Specific Changes:
1. **Line 319**: Changed `!!data.session` to `!!currentSessionData.session`
2. **Added async handling**: Wrapped the tracking in a promise chain
3. **Added error handling**: Graceful fallback if session check fails
4. **Added mount check**: Prevents errors on unmounted components

## 🧪 Verification

Run the test script to verify the fix:
```bash
node test-visibility-fix.js
```

### Expected Output:
```
✅ Fixed code executes without errors
✅ New code works - tracking data: {
  has_session: true,
  has_profile: true,
  timestamp: '2025-09-19T11:23:50.044Z'
}
```

## 🎯 How to Test in Browser

1. **Start your app** and login as superadmin
2. **Open browser console** (F12)
3. **Switch to another tab** for 30+ seconds  
4. **Switch back** to your app tab
5. **Check console** - should see "Refreshing profile on visibility change"
6. **Verify no errors** - no "data is not defined" error should appear
7. **Dashboard should load** without getting stuck

## 🚀 Benefits of This Fix

- ✅ **Eliminates JavaScript Error**: No more "data is not defined" crashes
- ✅ **Proper State Management**: Gets current session state when needed
- ✅ **Robust Error Handling**: Won't crash if session check fails
- ✅ **Better Performance**: Only fetches session data when visibility changes
- ✅ **Maintains Functionality**: Still tracks analytics properly

## 🔍 Technical Details

The fix changes from:
- **Static reference** to a variable that may not exist
- **To dynamic fetching** of current session state
- **With proper error handling** for robustness

This ensures the visibility handler works reliably without scope-related JavaScript errors.

---

This fix resolves the immediate JavaScript error and maintains all the functionality of the visibility handler for fixing the superadmin dashboard loading states.