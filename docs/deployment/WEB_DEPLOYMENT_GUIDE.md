# Web Deployment Guide

## Overview

This guide covers deploying the EduDash Pro web application to Vercel, including fixes for static asset 404 errors and MIME type issues.

## Problem Statement

**Issue**: Static assets like `/_expo/static/js/web/*` and `manifest.json` were returning 404 errors or being served with incorrect MIME types because Vercel's SPA fallback was catching all routes and serving `index.html` instead of the actual static files.

**Root Cause**: The original `vercel.json` configuration used `rewrites` with a catch-all pattern `"source": "/(.*)"` that intercepted ALL requests, including requests for static assets, before they could be served from the `dist/` output directory.

## Solution: Vercel Routes Configuration

The updated `vercel.json` now uses the `routes` array instead of `rewrites` to explicitly define route handling order:

### Key Changes

1. **Static Asset Routes** (processed first):
   - `/_expo/static/*` → Serve from `dist/_expo/static/` with immutable caching
   - `/assets/*` → Serve from `dist/assets/` with immutable caching
   - `/icons/*` → Serve from `dist/icons/`
   - `/legal/*` → Serve from `dist/legal/`
   - `/.well-known/*` → Serve from `dist/.well-known/` with CORS headers

2. **Root-Level Files**:
   - `manifest.json`, `sw.js`, `assetmap.json`, `metadata.json` → Serve directly
   - `favicon.ico`, `favicon.png` → Serve directly
   - `*.html` → Serve HTML files directly

3. **SPA Fallback** (processed last):
   - `/*` → Fallback to `/index.html` for client-side routing

### Route Processing Order

Vercel processes `routes` in the order defined. The configuration ensures:

1. Static assets are matched and served first
2. Root-level config files are served second
3. HTML files are served third
4. All other routes fall back to `index.html` for client-side routing

## Deployment Steps

### 1. Build the Web Application

```bash
# Clean previous builds
rm -rf dist/

# Build web bundle with Expo
npx expo export --platform web --output-dir dist

# Verify output directory
ls -la dist/
```

**Expected Output**:
```
dist/
├── _expo/
│   └── static/
│       └── js/
│           ├── android/
│           └── ios/
├── assets/
├── icons/
├── legal/
├── .well-known/
├── index.html
├── manifest.json
├── sw.js
├── assetmap.json
└── metadata.json
```

### 2. Deploy to Vercel

#### Option A: Vercel CLI (Recommended)

```bash
# Install Vercel CLI (if not already installed)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod

# Or deploy to preview
vercel
```

#### Option B: Git Push (Automatic)

1. Push changes to the `web` branch:
   ```bash
   git add vercel.json
   git commit -m "fix: update Vercel config to serve static assets correctly"
   git push origin web
   ```

2. Vercel will automatically detect the push and deploy

### 3. Purge Vercel Edge Cache

After deploying the new configuration, purge the edge cache to ensure old cached responses are cleared:

#### Option A: Vercel Dashboard

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Data Cache**
3. Click **Purge Everything** or **Purge by Path**
4. Purge specific paths:
   - `/_expo/static/*`
   - `/manifest.json`
   - `/sw.js`
   - `/index.html`

#### Option B: Vercel API

```bash
# Get your Vercel token from https://vercel.com/account/tokens
export VERCEL_TOKEN="your_vercel_token_here"

# Get your project ID and team ID from Vercel dashboard
export VERCEL_PROJECT_ID="prj_xxxxx"
export VERCEL_TEAM_ID="team_xxxxx"  # Optional, if using team

# Purge entire cache
curl -X DELETE \\
  "https://api.vercel.com/v1/projects/${VERCEL_PROJECT_ID}/cache" \\
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \\
  -H "Content-Type: application/json"

# Purge specific paths (if supported by your plan)
curl -X POST \\
  "https://api.vercel.com/v1/projects/${VERCEL_PROJECT_ID}/cache/purge" \\
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "paths": [
      "/_expo/static/*",
      "/manifest.json",
      "/sw.js",
      "/index.html"
    ]
  }'
```

### 4. Clear Service Worker Cache (Client-Side)

If users are still experiencing issues after deployment, they may need to clear their browser cache and unregister the service worker:

#### User Instructions:

1. **Chrome/Edge**:
   - Open DevTools (F12)
   - Go to **Application** tab
   - Under **Service Workers**, click **Unregister**
   - Under **Storage**, click **Clear site data**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. **Firefox**:
   - Open DevTools (F12)
   - Go to **Storage** tab
   - Right-click **Service Workers** → **Unregister**
   - Clear cache: `Ctrl+Shift+Delete` → Check **Cache** → **Clear Now**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

3. **Safari**:
   - Go to **Develop** → **Empty Caches**
   - Close and reopen Safari
   - Hard refresh: `Cmd+Option+R`

#### Programmatic Service Worker Reset (Optional)

Add a version check and force service worker update in `app/_layout.tsx` or a dedicated initialization file:

```typescript
// Force service worker update on version mismatch
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.update().catch((err) => {
        console.warn('Service worker update failed:', err);
      });
    });
  });
}
```

### 5. Verify Deployment

#### Check Static Assets

1. Open browser DevTools (F12) → **Network** tab
2. Hard refresh the page (`Ctrl+Shift+R` or `Cmd+Shift+R`)
3. Verify these files load with `200` status code:
   - `/_expo/static/js/android/*.hbc` or `/_expo/static/js/ios/*.hbc`
   - `/manifest.json`
   - `/sw.js`
   - `/assets/*` (fonts, images, etc.)

4. Check MIME types:
   - `manifest.json` → `application/json` (not `text/html`)
   - `.js` files → `application/javascript` (not `text/html`)
   - `.hbc` files → `application/octet-stream` or similar (not `text/html`)

#### Check Cache Headers

Verify cache headers in the **Network** tab:

- `/_expo/static/*` → `Cache-Control: public, max-age=31536000, immutable`
- `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`
- `/manifest.json` → `Cache-Control: public, max-age=0, must-revalidate`
- `/sw.js` → `Cache-Control: public, max-age=0, must-revalidate`

## Troubleshooting

### Issue: Still Getting 404 on Static Assets

**Possible Causes**:
1. Vercel cache not purged
2. Browser cache not cleared
3. Service worker serving stale cache
4. Build output missing files

**Solutions**:
1. Purge Vercel cache (see step 3 above)
2. Clear browser cache and service worker (see step 4 above)
3. Verify `dist/` directory contains the expected files:
   ```bash
   ls -la dist/_expo/static/js/
   ```
4. Rebuild and redeploy:
   ```bash
   rm -rf dist/
   npx expo export --platform web --output-dir dist
   vercel --prod
   ```

### Issue: MIME Type Errors

**Symptom**: Browser console shows:
```
Refused to execute script from '...' because its MIME type ('text/html') is not executable
```

**Cause**: Vercel is serving `index.html` instead of the actual static file.

**Solution**:
1. Verify `vercel.json` has the updated `routes` configuration (not `rewrites`)
2. Purge Vercel cache
3. Clear browser cache

### Issue: Service Worker Not Updating

**Symptom**: Changes not appearing after deployment.

**Solution**:
1. Manually unregister service worker (see step 4)
2. Add service worker update logic to force refresh
3. Increment app version in `app.json` to trigger cache invalidation

### Issue: Expo Router Routes Not Working

**Symptom**: Client-side navigation (e.g., `/dashboard`, `/profile`) returns 404.

**Cause**: SPA fallback not configured correctly.

**Solution**:
1. Verify the last route in `vercel.json` is:
   ```json
   {
     "src": "/(.*)",
     "dest": "/index.html"
   }
   ```
2. This must be the **last route** in the `routes` array

## Performance Optimization

### 1. Enable Compression

Vercel automatically enables gzip/brotli compression for text files. Verify in DevTools **Network** tab:
- `Content-Encoding: br` (Brotli) or `gzip`

### 2. Bundle Size Analysis

```bash
# Analyze bundle size
npx expo export --platform web --output-dir dist --dump-sourcemap

# View bundle size report
ls -lh dist/_expo/static/js/
```

### 3. CDN Caching

With the updated configuration:
- Static assets (`/_expo/static/*`, `/assets/*`) → Cached for 1 year (immutable)
- Dynamic content (`manifest.json`, `sw.js`) → No caching (always fresh)

## Monitoring

### Vercel Analytics

Enable Vercel Analytics to monitor:
- Page load times
- Core Web Vitals
- Route performance

### Sentry Error Tracking

Ensure Sentry is configured in production to catch:
- Asset loading errors
- Service worker errors
- Routing errors

```typescript
import * as Sentry from 'sentry-expo';

if (!__DEV__) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    enableInExpoDevelopment: false,
    environment: 'production',
  });
}
```

## Related Documentation

- [Vercel Configuration Reference](https://vercel.com/docs/project-configuration)
- [Expo Web Deployment](https://docs.expo.dev/distribution/publishing-websites/)
- [Service Worker Caching Strategies](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)

## Support

For deployment issues:
1. Check [Vercel Status Page](https://www.vercel-status.com/)
2. Review [Vercel Deployment Logs](https://vercel.com/dashboard)
3. Contact team lead or DevOps
