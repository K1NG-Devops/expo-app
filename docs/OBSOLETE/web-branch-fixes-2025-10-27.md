# Web Branch Fixes - October 27, 2025

## Overview

This document summarizes the fixes applied to the `web` branch to address token auto-refresh lock contention issues and static asset 404 errors on Vercel deployments.

## Changes Made

### 1. Disable Supabase Internal Auto-Refresh on Web (ALREADY APPLIED)

**File**: `lib/supabase.ts`  
**Line**: 48

**Change**:
```typescript
autoRefreshToken: !isWeb,  // Disable on web to avoid lock contention
```

**Rationale**:
- Supabase JS client's internal auto-refresh on web causes lock contention with our custom session manager
- On web, localStorage locks can cause `getSession()` to timeout during concurrent auto-refresh
- Our session manager (`lib/sessionManager.ts`) already handles token refresh properly
- Mobile platforms (React Native) continue to use Supabase's auto-refresh (no localStorage locks)

**Testing**:
- Verify no more `getSession() timeout` errors on web after sign-out → sign-in
- Confirm session manager still refreshes tokens before expiry
- Check auth state transitions work smoothly on web

---

### 2. Robust Profile RPC with Timeout and Retry (ALREADY APPLIED)

**File**: `lib/rbac.ts`  
**Lines**: 691-715

**Changes**:
- Added 8-second timeout for `get_my_profile` RPC call
- Implemented single retry on timeout with 300ms backoff
- Multiple fallback strategies for profile fetching
- Enhanced security validation and logging

**Fallback Chain**:
1. Primary: `get_my_profile` RPC (with timeout and retry)
2. Fallback 1: Direct `profiles` table read (own profile only)
3. Fallback 2: `debug_get_profile_direct` RPC (SECURITY DEFINER)
4. Final fallback: Minimal profile with lowest privileges

**Rationale**:
- Prevents profile fetch from hanging indefinitely during lock contention
- Provides graceful degradation if primary fetch fails
- Maintains security by validating user identity at each step

**Testing**:
- Profile fetch completes within 8 seconds even under lock contention
- Retry logic triggers on timeout and succeeds
- Fallbacks maintain security (no unauthorized profile access)
- Analytics track which fetch method succeeded

---

### 3. Fix Vercel Static Asset Serving (NEW)

**File**: `vercel.json`  
**Status**: ✅ UPDATED

**Problem**:
- Static assets like `/_expo/static/js/web/*` and `manifest.json` were returning 404 errors
- MIME type errors: assets served as `text/html` instead of correct type
- Root cause: Catch-all `rewrites` intercepting static asset requests

**Solution**:
- Replaced `rewrites` with `routes` array for explicit route handling order
- Static assets matched and served first before SPA fallback

**Route Order**:
1. `/_expo/static/*` → Serve static JS bundles with immutable caching
2. `/assets/*` → Serve fonts/images with immutable caching
3. `/icons/*` → Serve PWA icons
4. `/legal/*` → Serve legal HTML files
5. `/.well-known/*` → Serve assetlinks.json with CORS headers
6. Root files: `manifest.json`, `sw.js`, `assetmap.json`, `metadata.json`
7. `favicon.ico`, `favicon.png`
8. `*.html` files
9. **SPA Fallback (last)**: `/*` → `/index.html`

**Cache Headers**:
- `/_expo/static/*`: `Cache-Control: public, max-age=31536000, immutable`
- `/assets/*`: `Cache-Control: public, max-age=31536000, immutable`
- `manifest.json`, `sw.js`: `Cache-Control: public, max-age=0, must-revalidate`

**Testing**:
- Verify `/_expo/static/js/android/*.hbc` returns `200` with correct MIME type
- Verify `manifest.json` returns `application/json` (not `text/html`)
- Check cache headers in browser DevTools Network tab

---

### 4. Web Deployment Guide (NEW)

**File**: `docs/deployment/WEB_DEPLOYMENT_GUIDE.md`  
**Status**: ✅ CREATED

**Contents**:
- Problem statement and root cause analysis
- Step-by-step deployment instructions
- Vercel cache purging procedures (Dashboard + API)
- Client-side service worker cache clearing
- Troubleshooting common issues
- Performance optimization tips
- Monitoring and analytics setup

**Key Sections**:
1. Build process: `npx expo export --platform web --output-dir dist`
2. Vercel deployment: CLI and Git push options
3. Cache purging: Edge cache and service worker
4. Verification: Static assets, MIME types, cache headers
5. Troubleshooting: 404s, MIME errors, service worker issues

---

## Deployment Checklist

Before deploying to production, ensure:

- [x] `lib/supabase.ts` has `autoRefreshToken: !isWeb` on line 48
- [x] `lib/rbac.ts` has timeout/retry logic for profile RPC (lines 691-715)
- [x] `vercel.json` uses `routes` (not `rewrites`) for static asset handling
- [ ] Build web app: `npx expo export --platform web --output-dir dist`
- [ ] Deploy to Vercel: `vercel --prod` or Git push
- [ ] Purge Vercel edge cache (Dashboard or API)
- [ ] Test static assets return `200` with correct MIME types
- [ ] Verify auth flow works without `getSession() timeout` errors
- [ ] Monitor Sentry for any new errors

---

## Post-Deployment Verification

### 1. Static Assets Check

```bash
# Test manifest.json
curl -I https://your-app.vercel.app/manifest.json
# Expected: 200 OK, Content-Type: application/json

# Test _expo static bundle
curl -I https://your-app.vercel.app/_expo/static/js/android/entry-*.hbc
# Expected: 200 OK, Cache-Control: public, max-age=31536000, immutable
```

### 2. Auth Flow Check

1. Open app in incognito browser
2. Sign out (if signed in)
3. Sign in with test account
4. Monitor browser console for errors
5. Verify no `getSession() timeout` errors
6. Check profile loads correctly

### 3. Service Worker Check

1. Open DevTools → Application tab
2. Check Service Workers section
3. Verify service worker is registered
4. Check Cache Storage for `/_expo/static/*` entries
5. Verify `manifest.json` is cached

---

## Rollback Plan

If issues occur after deployment:

### Option 1: Quick Revert via Git

```bash
# Revert vercel.json changes
git revert HEAD
git push origin web

# Vercel will auto-deploy reverted config
```

### Option 2: Vercel Instant Rollback

1. Go to Vercel dashboard → Deployments
2. Find the previous stable deployment
3. Click **...** → **Promote to Production**
4. Previous config is live immediately

### Option 3: Manual Config Restore

1. Restore original `vercel.json` with `rewrites` (if static assets weren't critical)
2. Redeploy: `vercel --prod`
3. Investigate issues in staging environment

---

## Known Limitations

### 1. Service Worker Cache Persistence

**Issue**: Service workers may continue serving stale cached assets even after Vercel cache is purged.

**Mitigation**:
- Increment app version in `app.json` to trigger service worker update
- Add version check logic to force service worker update
- Provide user instructions to manually clear cache

### 2. Browser Cache

**Issue**: Browser cache may serve old assets despite Vercel serving new ones.

**Mitigation**:
- Use hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Clear browser cache in DevTools: Application → Clear site data
- Recommend users to restart browser

### 3. CDN Propagation Delay

**Issue**: Vercel edge cache may take a few minutes to propagate globally.

**Mitigation**:
- Wait 5-10 minutes after deployment before verifying
- Test from multiple geographic regions
- Use Vercel Analytics to monitor edge cache hit rates

---

## Success Metrics

Track these metrics to validate the fixes:

1. **Token Auto-Refresh Lock Contention**:
   - Sentry: Zero `getSession() timeout` errors after sign-out → sign-in
   - Analytics: `edudash.auth.session_fetch_timeout` events = 0

2. **Static Asset 404s**:
   - Vercel Analytics: Zero 404 errors for `/_expo/static/*` and `/manifest.json`
   - Browser DevTools: All assets load with `200` status

3. **MIME Type Errors**:
   - Sentry: Zero `Refused to execute script` errors
   - Browser console: No MIME type warnings

4. **Auth Flow Performance**:
   - Analytics: Average sign-in time < 3 seconds
   - Profile fetch time < 8 seconds (including retry)

---

## Related Issues

- **Token Auto-Refresh Lock Contention**: Caused by Supabase's internal auto-refresh on web competing with our session manager
- **Static Asset 404s**: Caused by Vercel's catch-all `rewrites` intercepting static asset requests
- **Profile Fetch Timeout**: Caused by `getSession()` lock contention during concurrent auth operations

## References

- [Supabase JS Client Documentation](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Vercel Configuration Reference](https://vercel.com/docs/project-configuration)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Status**: ✅ All fixes applied and documented  
**Date**: October 27, 2025  
**Author**: Warp Agent  
**Reviewer**: Pending
