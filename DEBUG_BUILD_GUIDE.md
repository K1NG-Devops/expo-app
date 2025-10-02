# Local Debug Build Guide

**Purpose:** Trace the exact source of "Unexpected error occurred" on sign-in after app restart

---

## Step 1: Add Enhanced Debug Logging

We'll add strategic console.log statements to trace the exact error flow.

### Files to Monitor:
1. `app/(auth)/sign-in.tsx` - Sign-in error handling
2. `contexts/AuthContext.tsx` - Session initialization and routing
3. `lib/routeAfterLogin.ts` - Post-login routing logic
4. `lib/sessionManager.ts` - Session creation and storage

---

## Step 2: Build Local Android APK

### Option A: Development Build (Recommended for Debugging)
```bash
# Start the Metro bundler in one terminal
npm run start:clear

# In another terminal, build and install on device
npm run android
```

### Option B: Preview APK (Tests production-like behavior)
```bash
# Build preview APK locally
eas build --platform android --profile preview --local

# Install on device
adb install <path-to-generated-apk>
```

---

## Step 3: Monitor Logs in Real-Time

### For Development Build:
```bash
# Terminal 1: Metro bundler logs
npm run start:clear

# Terminal 2: Android device logs (filtered for your app)
adb logcat | grep -E "(ReactNativeJS|EduDash|Sign in|Auth|Session)"
```

### For Preview/Production Build:
```bash
# Capture all app logs
adb logcat -c  # Clear previous logs
adb logcat | grep -E "(ReactNativeJS|chromium)"

# Or use filtered view
adb logcat *:E ReactNativeJS:V
```

---

## Step 4: Reproduce the Issue

1. Sign in successfully
2. Close the app completely (swipe away from recents)
3. Reopen the app
4. Watch the logs as the error appears

---

## Step 5: Identify the Error Source

Look for these patterns in the logs:

### Pattern 1: Session Restoration Error
```
[Session] Failed to restore session: <error>
Sign in error: <actual error message>
```

### Pattern 2: Profile Loading Error
```
Failed to fetch user profile: <error>
[ROUTE DEBUG] fetchEnhancedUserProfile result: NULL
```

### Pattern 3: Routing Error
```
Post-login routing failed: <error>
Navigation failed, falling back to profiles-gate
```

### Pattern 4: Auth State Error
```
Auth state change handler error: <error>
```

---

## Expected Log Flow (Normal Sign-In)

```
1. Sign in successful: user@example.com
2. [Session] Session created successfully
3. [ROUTE DEBUG] Fetching enhanced profile for user: <id>
4. [ROUTE DEBUG] fetchEnhancedUserProfile result: SUCCESS
5. [ROUTE DEBUG] Profile role: principal_admin
6. [ROUTE DEBUG] ==> Determining route for user
7. [ROUTE DEBUG] Routing principal to dashboard with school: <school_id>
8. Navigating to route: { path: '/screens/principal-dashboard', params: { school: '<id>' } }
```

---

## Common Error Scenarios

### Error 1: Generic "Unexpected error occurred"
**Location:** `app/(auth)/sign-in.tsx` line 104-107
```typescript
catch (_error: any) {
  console.error('Sign in error:', _error);
  const msg = _error?.message || t('common.unexpected_error');
  Alert.alert(t('common.error'), msg);
}
```

**Possible Causes:**
- `signInWithSession` threw an error
- Session storage failed
- Network timeout

### Error 2: "Failed to load user profile"
**Location:** `lib/sessionManager.ts` line 578
```typescript
if (!profile) {
  return { session: null, profile: null, error: 'Failed to load user profile' };
}
```

**Possible Causes:**
- Database query failed
- User row missing
- RLS policy blocking access

### Error 3: Navigation/Routing Error
**Location:** `lib/routeAfterLogin.ts` line 173-174
```typescript
catch (navigationError) {
  console.error('Navigation failed, falling back to profiles-gate:', navigationError);
  router.replace('/profiles-gate');
}
```

**Possible Causes:**
- Invalid route path
- Missing required route params
- Router not ready

---

## Step 6: Capture Full Stack Trace

If the error is being swallowed, temporarily modify sign-in to log full details:

**File:** `app/(auth)/sign-in.tsx`
```typescript
catch (_error: any) {
  // TEMPORARY: Full error debugging
  console.error('=== SIGN IN ERROR DEBUG ===');
  console.error('Error object:', _error);
  console.error('Error name:', _error?.name);
  console.error('Error message:', _error?.message);
  console.error('Error stack:', _error?.stack);
  console.error('Error cause:', _error?.cause);
  console.error('========================');
  
  const msg = _error?.message || t('common.unexpected_error');
  Alert.alert(t('common.error'), msg);
}
```

---

## Step 7: Check Session Storage State

Add logging to see what's in storage after restart:

**File:** `contexts/AuthContext.tsx` (around line 226)
```typescript
const { session: storedSession, profile: storedProfile } = await initializeSession();

// TEMPORARY: Debug session restoration
console.log('=== SESSION RESTORATION DEBUG ===');
console.log('Stored session exists:', !!storedSession);
console.log('Stored profile exists:', !!storedProfile);
if (storedSession) {
  console.log('Session user_id:', storedSession.user_id);
  console.log('Session expires_at:', new Date(storedSession.expires_at * 1000).toISOString());
}
if (storedProfile) {
  console.log('Profile role:', storedProfile.role);
  console.log('Profile org_id:', storedProfile.organization_id);
}
console.log('================================');
```

---

## Advanced Debugging: Network Inspection

### Check Supabase Requests
```bash
# Install mitmproxy for HTTPS inspection
sudo apt-get install mitmproxy

# Run proxy
mitmproxy -p 8080

# Configure Android device to use proxy
adb shell settings put global http_proxy <your-local-ip>:8080

# Install mitmproxy CA cert on device
```

---

## Quick Test Commands

### Clear App Data & Test Fresh
```bash
# Clear app data
adb shell pm clear com.edudashpro

# Launch app
adb shell am start -n com.edudashpro/.MainActivity

# Watch logs
adb logcat -c && adb logcat | grep ReactNativeJS
```

### Test Specific Scenario
```bash
# 1. Clear logs
adb logcat -c

# 2. Start logging to file
adb logcat > ~/Desktop/app-debug-$(date +%Y%m%d-%H%M%S).log &

# 3. Reproduce issue
# 4. Stop logging (Ctrl+C)
# 5. Review log file
```

---

## What to Share for Analysis

After reproducing the issue, capture:

1. **Full logcat output** from app launch to error
2. **Screenshot** of the error alert
3. **Console output** from Metro bundler (if dev build)
4. **Timing information**: How long after app restart does error appear?
5. **User state**: What role/profile was signed in?

---

## Quick Checklist

- [ ] Enhanced logging added to sign-in catch block
- [ ] Local build compiled and installed
- [ ] adb connected and working (`adb devices`)
- [ ] Logs streaming in terminal
- [ ] Issue reproduced
- [ ] Full log captured
- [ ] Error source identified

---

## Expected Timeline

1. **Add logging:** 2-3 minutes
2. **Build & install:** 5-10 minutes (dev) or 15-20 minutes (preview)
3. **Reproduce & capture logs:** 2-5 minutes
4. **Identify root cause:** 5-10 minutes with logs

**Total:** ~20-30 minutes to pinpoint exact error source

---

## Useful ADB Commands

```bash
# List connected devices
adb devices

# Clear app data
adb shell pm clear com.edudashpro

# Uninstall app
adb uninstall com.edudashpro

# Install APK
adb install -r path/to/app.apk

# View current activity
adb shell dumpsys activity | grep -A 5 "mResumedActivity"

# Take screenshot
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png

# Record screen
adb shell screenrecord /sdcard/demo.mp4
```

---

## Next Steps After Identifying Error

Once you've captured the logs and identified the error source, share:
1. The specific error message from logs
2. The file and line number where error originated
3. Any related stack trace
4. User/profile state at time of error

I can then provide a precise fix for the exact issue.
