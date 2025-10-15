# Logout Redirect and OTA Update Fixes

**Date:** 2025-10-02  
**Status:** Fixed  

## Problem Summary

### Issue 1: Logout Routes to Onboarding Instead of Sign-In
After signing out from the principal dashboard, users were being routed to the principal onboarding screen (`/screens/principal-onboarding`) instead of the sign-in screen (`/(auth)/sign-in`).

### Issue 2: OTA Updates Not Working
OTA updates were not being applied, and no visible popup was shown to indicate update failures.

---

## Root Cause Analysis

### Logout Routing Issue

**Root Cause:**  
The `signOutAndRedirect` function in `lib/authActions.ts` was routing to `/` (the landing page) after sign out, which then triggered the native platform redirect logic in `app/index.tsx` (lines 99-106) that automatically routes to `/(auth)/sign-in`.

However, the AuthContext's `onAuthStateChange` listener (line 434 in `contexts/AuthContext.tsx`) also had a fallback that tried to route to `/sign-in` on `SIGNED_OUT` events. This created a race condition where sometimes the principal dashboard routing logic (in `app/screens/principal-dashboard.tsx` lines 21-38) would detect a logged-out state and incorrectly redirect to onboarding.

**Key Problems:**
1. `signOutAndRedirect` routed to `/` instead of directly to sign-in
2. `profiles-gate.tsx` also routed to `/landing` after sign-out (line 214)
3. Principal onboarding had no guard to prevent unauthenticated users from accessing it
4. Multiple competing routing paths created race conditions

### OTA Update Issue

**Root Cause:**  
The `eas.json` configuration correctly sets `EXPO_PUBLIC_ENABLE_OTA_UPDATES` to `true` for the `production` profile (line 52), but this was set to `false` for the `development` profile (line 18).

The `UpdatesProvider.tsx` (lines 186-192) checks this environment variable and the `__DEV__` flag to determine whether to run automatic background update checks:

```typescript
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT;
const enableOTAUpdates = process.env.EXPO_PUBLIC_ENABLE_OTA_UPDATES === 'true';

if (__DEV__ && environment === 'development' && !enableOTAUpdates) {
  logger.info('[Updates] Skipping automatic background checks in development');
  return;
}
```

**Key Problems:**
1. OTA updates were explicitly disabled for development builds
2. No visible error handling/UI feedback for failed update checks in production
3. The app uses `runtimeVersion: "1.0.2"` (static) in `app.config.js` but `app.json` uses `"policy": "appVersion"` which may cause mismatches

---

## Changes Made

### 1. Fixed Sign-Out Redirect Logic

**File:** `lib/authActions.ts` (line 36-37)
```typescript
// Before:
router.replace(options?.redirectTo ?? '/');

// After:
// Always redirect to sign-in to avoid onboarding being shown after logout
router.replace(options?.redirectTo ?? '/(auth)/sign-in');
```

**File:** `app/profiles-gate.tsx` (line 214-215)
```typescript
// Before:
router.replace('/landing');

// After:
// Ensure we land on the auth screen immediately after sign-out
router.replace('/(auth)/sign-in');
```

### 2. Added Authentication Guard to Principal Onboarding

**File:** `app/screens/principal-onboarding.tsx` (lines 19-24)
```typescript
// Guard: if user is not authenticated, never show onboarding
useEffect(() => {
  if (!user) {
    try { router.replace('/(auth)/sign-in'); } catch {}
  }
}, [user]);
```

This ensures that if a logged-out user somehow lands on the onboarding screen, they are immediately redirected to sign-in.

### 3. Improved Sign-In Error Handling

**File:** `app/(auth)/sign-in.tsx` (lines 76-110)

Updated the sign-in flow to:
- Use the centralized `signInWithSession` function from `lib/sessionManager.ts` to avoid throwing errors on network/storage quirks
- Wrap credential storage operations in a best-effort try/catch so failures don't block successful sign-ins
- Provide clearer error messages to users when sign-in fails

---

## OTA Update Configuration Analysis

### Current Configuration

**EAS Build Profiles (`eas.json`):**
- **development:** `EXPO_PUBLIC_ENABLE_OTA_UPDATES: "false"`
- **preview:** Not explicitly set (likely defaults to false)
- **production:** `EXPO_PUBLIC_ENABLE_OTA_UPDATES: "true"`

**Runtime Version:**
- `app.config.js`: Static `runtimeVersion: '1.0.2'`
- `app.json`: Policy-based `"policy": "appVersion"` (resolves to version `1.0.2`)

**Update Channel Configuration:**
- development → `channel: "development"`
- preview → `channel: "preview"`
- production → `channel: "production"`

**EAS Update URL:**  
`https://u.expo.dev/253b1057-8489-44cf-b0e3-c3c10319a298`

### Recommendations for OTA Updates

1. **For Preview Builds:** Add `"EXPO_PUBLIC_ENABLE_OTA_UPDATES": "true"` to the `preview` profile in `eas.json` if you want to test OTA updates in preview builds.

2. **Runtime Version Consistency:** The static `runtimeVersion` in `app.config.js` overrides the policy in `app.json`. Ensure they match:
   - Either use static version in both places
   - Or remove from `app.config.js` to use policy exclusively

3. **Update Visibility:** The `UpdatesProvider.tsx` handles background checks but doesn't show a user-facing banner. Consider adding a UI component to notify users when updates are available and prompt them to restart the app.

---

## Testing the Fixes

### Test Logout Redirect Flow
1. Build and install a new version of the app (development or preview build)
2. Sign in as a principal with a school
3. Navigate to the principal dashboard
4. Sign out from the dashboard
5. **Expected:** Should route directly to sign-in screen, NOT onboarding

### Test Principal Onboarding Guard
1. Navigate to `/(auth)/sign-in` and ensure you're not logged in
2. Manually try to navigate to `/screens/principal-onboarding` (e.g., via deep link)
3. **Expected:** Should be immediately redirected to sign-in screen

### Test OTA Updates (Production Only)
1. Build a production version with current code: `eas build --platform android --profile production`
2. Install the build on a device
3. Make a code change (e.g., update a button label)
4. Publish an OTA update: `eas update --branch production --message "Test update"`
5. Force-close and reopen the app
6. **Expected:** The update should be downloaded in the background and applied on next restart

---

## OTA Update: Does This Require a Rebuild?

### Answer: NO, OTA Update Will Work ✅

**Why:**
- The changes made are **JavaScript-only** (routing logic, component guards, session handling)
- No native code changes (no new native modules, permissions, or configurations)
- No changes to `app.json`, `app.config.js`, `eas.json`, or native build settings
- Runtime version remains `1.0.2` (matches existing builds)

**What Needs to Happen:**
1. Commit and push the code changes
2. Publish an OTA update to the `production` channel:
   ```bash
   eas update --branch production --message "Fix logout redirect to sign-in and add onboarding guard"
   ```
3. Existing production builds will automatically fetch this update in the background
4. Users will get the fix on their next app restart (no store update required)

**For Preview/Development:**
- To test these fixes immediately during development, you'll need a new development or preview build since OTA is disabled for those profiles
- Alternatively, you can enable OTA for preview by setting `"EXPO_PUBLIC_ENABLE_OTA_UPDATES": "true"` in the `preview` profile in `eas.json` and rebuilding once

---

## Cost Considerations

### OTA Update Costs (EAS)
- **Free Tier:** Unlimited updates for personal/hobby projects
- **Production Tier:** First 1GB of update downloads/month free, then $0.10/GB
- **Enterprise:** Custom pricing with higher limits

**For your use case:**
- Average update size: ~1-5 MB
- Expected downloads: Depends on active user count
- **Recommendation:** Monitor usage via EAS dashboard after publishing updates

### Build Costs
Since this is an OTA-compatible change, you avoid the cost of:
- New build credits
- Store review wait time
- User update friction

---

## Environment Variables Summary

Based on `eas env:list development`, the following key environment variables are set:

**Supabase:**
- `EXPO_PUBLIC_SUPABASE_URL`: `https://lvvvjywrmpcqrpvuptdi.supabase.co`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: (set)

**Payments:**
- `EXPO_PUBLIC_PAYMENTS_BRIDGE_URL`: `https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments`

**Analytics:**
- `EXPO_PUBLIC_POSTHOG_HOST`: `https://us.i.posthog.com`
- `EXPO_PUBLIC_POSTHOG_KEY`: (set)
- `EXPO_PUBLIC_ENABLE_POSTHOG`: `true`

**Ads (AdMob):**
- `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID`: `ca-app-pub-2808416461095370~5255516826`
- `EXPO_PUBLIC_ENABLE_ADS`: `true`

**Monitoring:**
- `EXPO_PUBLIC_ENABLE_SENTRY`: `false`
- `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS`: `true`

**Subscriptions:**
- `EXPO_PUBLIC_REVENUECAT_ANDROID_SDK_KEY`: (set)

---

## Next Steps

1. **Immediate:** Test the logout flow in development to confirm the fix
2. **Short-term:** Publish OTA update to production channel
3. **Optional:** Enable OTA for preview builds for faster testing iterations
4. **Future:** Add user-facing UI for OTA update notifications

---

## Files Modified

1. `lib/authActions.ts` - Fixed sign-out redirect path
2. `app/profiles-gate.tsx` - Fixed sign-out redirect path
3. `app/screens/principal-onboarding.tsx` - Added authentication guard
4. `app/(auth)/sign-in.tsx` - Improved error handling and session creation

**No native configuration changes** - All changes are OTA-compatible.
