# Vercel Web Deployment Guide

## Overview

This guide covers deploying the EduDash Pro web version to Vercel from the `web` branch.

## Branch Status

**Branch**: `web`  
**Status**: ✅ Ready for Vercel deployment  
**Last Updated**: 2025-10-26

## Recent Changes (Latest 10 Commits)

```
ecab876 fix(web): add TypeScript declarations for platform-specific storage module
15ca6a0 feat(web): configure Vercel deployment with SPA routing and security headers
9b00093 fix(web): guard Edge Function calls to only run when authenticated
e666915 fix(web): update Supabase client and sign-in to use unified storage adapters
7c31412 feat(web): add cross-platform storage, secure-store, and biometrics adapters
da2c40f fix(web): add proper React root div to index.html template
0a275c9 fix(web): restore notifications.ts from development
c6af00d fix(web): add log alias to logger for web bundle compatibility
d12ca73 fix(web): restore ParentDashboard.tsx from development
4f6ce74 fix(web): remove duplicate ad placements and fix JSX structure
```

## Prerequisites

1. Vercel account with access to the EduDash Pro project
2. Environment variables configured in Vercel Project Settings

## Required Environment Variables

Set these in **Vercel Project Settings** → **Environment Variables**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_PAYFAST_MODE=sandbox  # or 'live' for production
```

Optional (for analytics/monitoring):
```env
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
EXPO_PUBLIC_POSTHOG_KEY=your-posthog-key
```

## Deployment Steps

### Option 1: Auto-Deploy from GitHub (Recommended)

1. **Connect Repository to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select the `web` branch

2. **Configure Build Settings**:
   - Framework Preset: `Other`
   - Build Command: `npx expo export --platform web`
   - Output Directory: `dist`
   - Install Command: `npm ci`

3. **Deploy**:
   - Click "Deploy"
   - Wait for build to complete (~3-5 minutes)

### Option 2: Manual Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from web branch
git checkout web
vercel --prod
```

## Vercel Configuration

The project includes a `vercel.json` with:

### Build Settings
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist`
- **Framework**: `null` (custom Expo build)

### SPA Routing
All routes redirect to `/index.html` for client-side routing:
```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

### Security Headers
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`

### Static Asset Caching
- `/_expo/static/*` cached for 1 year (immutable)

### Legal/Policy Pages
- `/.well-known/assetlinks.json` served with correct CORS headers

## Post-Deployment Checklist

After deployment, verify:

- [ ] **Sign-in page loads**: https://your-domain.vercel.app/sign-in
- [ ] **Authentication works**: Can log in with valid credentials
- [ ] **Dashboard accessible**: Redirects to dashboard after login
- [ ] **Console is clean**: No 401 errors on unauthenticated pages
- [ ] **Legal pages accessible**: 
  - `/.well-known/assetlinks.json`
  - Add privacy policy and terms of service as needed
- [ ] **Mobile responsive**: Test on phone/tablet
- [ ] **Performance**: Run Lighthouse audit (aim for 90+ score)

## Known Issues & Limitations

### ✅ Fixed
- ~~SecureStore/AsyncStorage web compatibility~~ → Unified storage adapter
- ~~401 errors on page load~~ → Auth guards added
- ~~Missing React root div~~ → Fixed in public/index.html
- ~~Platform-specific module resolution~~ → TypeScript declarations added

### ⚠️ Not Yet Implemented on Web
- **Biometric authentication**: Disabled on web (uses password only)
- **Push notifications**: No web support (Expo Notifications is mobile-only)
- **AdMob ads**: Disabled on web
- **Voice features**: Azure Speech SDK not configured for web yet
- **File system operations**: Limited compared to native

### 🚧 To-Do
- [ ] Create HTML versions of privacy policy and terms of service
- [ ] Add route for `/legal/privacy-policy`
- [ ] Add route for `/legal/terms-of-service`
- [ ] Set up custom domain (optional)
- [ ] Configure CDN caching (Vercel handles this automatically)

## Troubleshooting

### Build Fails on Vercel

1. **Check environment variables**: Ensure all EXPO_PUBLIC_* vars are set
2. **Check Node version**: Vercel uses Node 18 by default
3. **Check build logs**: Look for specific error messages

### App Shows Blank Screen

1. **Hard refresh**: Ctrl+Shift+R (clears cache)
2. **Check console**: Look for JavaScript errors
3. **Verify session detection**: Check if `detectSessionInUrl` is working

### 401 Errors After Login

1. **Check Supabase URL**: Must match exactly (with https://)
2. **Check anon key**: Must be valid and not expired
3. **Check RLS policies**: Ensure user role is set correctly

### Routes Not Working (404s)

1. **Verify vercel.json**: SPA routing configured correctly
2. **Check Expo Router**: File-based routing should match URL structure
3. **Clear Vercel cache**: Redeploy to force cache invalidation

## Monitoring & Analytics

### Production Monitoring
- **Sentry**: Error tracking (if EXPO_PUBLIC_SENTRY_DSN set)
- **PostHog**: Analytics (if EXPO_PUBLIC_POSTHOG_KEY set)
- **Vercel Analytics**: Automatic performance monitoring

### Key Metrics to Track
- **Web Vitals**: LCP, FID, CLS (Vercel provides these)
- **Sign-in conversion rate**: Track via PostHog
- **Error rate**: Monitor via Sentry
- **Page load time**: Aim for < 2s on 3G

## Rollback Procedure

If deployment fails or has critical issues:

1. **Instant Rollback via Vercel Dashboard**:
   - Go to Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Revert Git Commit**:
   ```bash
   git revert HEAD
   git push origin web
   ```

3. **Redeploy Previous Version**:
   ```bash
   git checkout <previous-commit-hash>
   vercel --prod
   ```

## Support

For deployment issues:
- **Vercel Support**: https://vercel.com/support
- **Expo Web Docs**: https://docs.expo.dev/guides/web/
- **Project README**: See root README.md for development setup

## Next Steps

1. **Push web branch to GitHub**:
   ```bash
   git push origin web
   ```

2. **Connect to Vercel** (if not already connected)

3. **Trigger deployment** (auto or manual)

4. **Test thoroughly** before announcing to users

5. **Update DNS** (if using custom domain)

---

**Last Updated**: 2025-10-26  
**Maintainer**: Development Team  
**Environment**: Production  
**Status**: ✅ Ready for deployment
