# Android App Links Setup Guide

**Date**: 2025-10-22  
**Status**: ✅ Configuration Ready  
**Purpose**: Enable seamless email confirmation redirects from web browser to native app

## Overview

Android App Links allow the app to handle HTTPS URLs directly, opening the app instead of the mobile browser. This is critical for email confirmation flows where users click links in their email.

## Problem Statement

Currently, when users click the email confirmation link on their mobile device:
1. Link opens in mobile browser (Chrome, Firefox, etc.)
2. Landing page tries to use custom scheme `edudashpro://` deep link
3. Deep link may not work reliably on all browsers
4. User has poor experience with extra browser step

**Solution**: Android App Links with verified domain ownership allow the OS to open the app directly when clicking `https://edudashpro.org.za/landing` links.

## Current Configuration

### app.json Intent Filters

Already configured in `app.json` (lines 55-76):

```json path=/media/king/0758576e-6f1e-485f-b9e0-00b44a1d3259/home/king/Desktop/edudashpro/app.json start=55
{
  "android": {
    "intentFilters": [
      {
        "action": "VIEW",
        "autoVerify": true,
        "data": [
          {
            "scheme": "https",
            "host": "www.edudashpro.org.za",
            "pathPrefix": "/landing"
          },
          {
            "scheme": "https",
            "host": "edudashpro.org.za",
            "pathPrefix": "/landing"
          }
        ],
        "category": [
          "BROWSABLE",
          "DEFAULT"
        ]
      }
    ]
  }
}
```

### Key Configuration Details

- **autoVerify**: `true` - Enables automatic verification of app links
- **scheme**: `https` - Uses HTTPS (not custom scheme)
- **hosts**: Both `www.edudashpro.org.za` and `edudashpro.org.za`
- **pathPrefix**: `/landing` - Handles all `/landing*` URLs
- **categories**: `BROWSABLE` + `DEFAULT` required for app links

## Required Steps

### Step 1: Get App Signing Certificate Fingerprint

You need the SHA-256 fingerprint of your app's signing certificate.

#### For Development/Debug Builds:

```bash
# Extract debug keystore fingerprint
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep "SHA256"
```

#### For Production Builds (Play Store):

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: **Release > Setup > App Integrity**
3. Find "App signing" section
4. Copy the **SHA-256 certificate fingerprint**

Example format: `14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5`

### Step 2: Create Digital Asset Links File

Create file: `.well-known/assetlinks.json`

This file must be hosted at:
- `https://edudashpro.org.za/.well-known/assetlinks.json`
- `https://www.edudashpro.org.za/.well-known/assetlinks.json`

**File content**:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.edudashpro",
    "sha256_cert_fingerprints": [
      "PASTE_YOUR_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

**Replace** `PASTE_YOUR_SHA256_FINGERPRINT_HERE` with your actual SHA-256 fingerprint from Step 1 (format: `14:6D:E9:...`).

#### Multiple Fingerprints (Debug + Production)

If you want both debug and production builds to work:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.edudashpro",
    "sha256_cert_fingerprints": [
      "DEBUG_SHA256_FINGERPRINT_HERE",
      "PRODUCTION_SHA256_FINGERPRINT_HERE"
    ]
  }
}]
```

### Step 3: Host the assetlinks.json File

The file must be:
- Accessible via HTTPS
- At exact path `/.well-known/assetlinks.json`
- Served with correct Content-Type: `application/json`
- No redirects (must be 200 OK response)

#### Hosting Options

**Option A: Static Hosting (Vercel, Netlify, Cloudflare Pages)**

1. Create directory: `.well-known/`
2. Add file: `assetlinks.json`
3. Deploy to your domain root
4. Verify: `curl https://edudashpro.org.za/.well-known/assetlinks.json`

**Option B: Nginx**

```nginx
location /.well-known/assetlinks.json {
    alias /var/www/edudashpro/.well-known/assetlinks.json;
    default_type application/json;
    add_header Access-Control-Allow-Origin *;
}
```

**Option C: Apache**

```apache
<Directory /var/www/edudashpro/.well-known>
    <Files assetlinks.json>
        Header set Content-Type application/json
        Header set Access-Control-Allow-Origin *
    </Files>
</Directory>
```

### Step 4: Verify Digital Asset Links

#### Method 1: Online Tool

Visit: https://developers.google.com/digital-asset-links/tools/generator

- Enter your domain: `edudashpro.org.za`
- Enter package name: `com.edudashpro`
- Verify the configuration

#### Method 2: Command Line

```bash
# Check if file is accessible
curl -v https://edudashpro.org.za/.well-known/assetlinks.json

# Should return:
# - HTTP 200 OK
# - Content-Type: application/json
# - Valid JSON with your package name and fingerprint
```

#### Method 3: ADB (Android Debug Bridge)

```bash
# On connected Android device, check app links status
adb shell pm get-app-links com.edudashpro

# Should show:
# com.edudashpro:
#   ID: <some-uuid>
#   Signatures: [<sha256>]
#   Domain verification state:
#     edudashpro.org.za: verified
#     www.edudashpro.org.za: verified
```

### Step 5: Rebuild and Test App

After hosting the `assetlinks.json` file:

```bash
# Rebuild the app (increments version code)
eas build --platform android --profile production

# Or for preview builds
eas build --platform android --profile preview
```

**Important**: The intent filters in `app.json` are baked into the APK/AAB at build time. You must rebuild the app after making changes to intent filters.

### Step 6: Test on Physical Device

1. Install the rebuilt app on Android device
2. Send yourself a test email confirmation link
3. Open email on the device
4. Tap the confirmation link
5. **Expected**: App opens directly (no browser intermediate step)
6. **Fallback**: If app isn't verified yet, browser opens with option to open app

## Supabase Email Templates

Ensure Supabase email templates use the correct domain:

### Email Confirmation Template

In Supabase Dashboard → Authentication → Email Templates → Confirm signup:

```html
<h2>Confirm your email</h2>
<p>Click the link below to confirm your email address:</p>
<p><a href="https://edudashpro.org.za/landing?type=email&token_hash={{ .TokenHash }}">Confirm Email</a></p>
```

**Key points**:
- Use `https://edudashpro.org.za/landing` (not `http://` or other domains)
- Include query params: `type=email&token_hash={{ .TokenHash }}`
- This URL will match the intent filter and open the app directly

## Testing Checklist

- [ ] **Step 1**: Get SHA-256 fingerprint
  - [ ] Debug keystore fingerprint extracted
  - [ ] Production fingerprint from Play Console

- [ ] **Step 2**: Create assetlinks.json
  - [ ] File created with correct JSON structure
  - [ ] Package name is `com.edudashpro`
  - [ ] SHA-256 fingerprint(s) added

- [ ] **Step 3**: Host the file
  - [ ] File accessible at `https://edudashpro.org.za/.well-known/assetlinks.json`
  - [ ] File accessible at `https://www.edudashpro.org.za/.well-known/assetlinks.json`
  - [ ] Returns 200 OK (no redirects)
  - [ ] Content-Type is `application/json`

- [ ] **Step 4**: Verify configuration
  - [ ] Google's verification tool passes
  - [ ] `curl` shows valid JSON response
  - [ ] ADB shows "verified" status

- [ ] **Step 5**: Rebuild app
  - [ ] New build created with EAS
  - [ ] Version code incremented
  - [ ] Installed on test device

- [ ] **Step 6**: Test end-to-end
  - [ ] Email confirmation link opens app directly
  - [ ] Landing page receives token_hash parameter
  - [ ] Email verification succeeds
  - [ ] User redirected to sign-in screen
  - [ ] Success message shown

## Troubleshooting

### App Links Not Working

**Symptoms**: Clicking email link opens browser instead of app

**Causes**:
1. **assetlinks.json not accessible**
   - Verify: `curl https://edudashpro.org.za/.well-known/assetlinks.json`
   - Should return 200 OK with valid JSON

2. **Wrong SHA-256 fingerprint**
   - Verify fingerprint matches your build
   - Use `keytool` or Play Console to get correct value

3. **App not rebuilt after config change**
   - Intent filters are baked into APK at build time
   - Rebuild app after any `app.json` changes

4. **Domain verification pending**
   - Android may take up to 24 hours to verify
   - Force verification: `adb shell pm verify-app-links --re-verify com.edudashpro`

5. **HTTP instead of HTTPS**
   - App Links only work with HTTPS
   - Check your Supabase email templates

### Verification Failed

Check ADB status:

```bash
adb shell pm get-app-links com.edudashpro
```

If showing "legacy_failure" or "verification failed":
- Check `assetlinks.json` is accessible
- Verify SHA-256 fingerprint is correct
- Ensure package name matches exactly

Force re-verification:

```bash
adb shell pm verify-app-links --re-verify com.edudashpro
```

### Browser Opens Instead of App

This is expected behavior if:
- App Links verification hasn't completed yet
- User manually chose "Open in browser" previously
- Device is running Android < 6.0 (App Links requires Android 6.0+)

To reset user's choice:

```bash
# Clear default app associations
adb shell pm clear-package-preferred-activities com.edudashpro
```

Or on device:
1. Settings → Apps → EduDash Pro
2. Open by default
3. Clear defaults

## Files Reference

### assetlinks.json Template

```json path=null start=null
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.edudashpro",
    "sha256_cert_fingerprints": [
      "YOUR_PRODUCTION_SHA256_FINGERPRINT",
      "YOUR_DEBUG_SHA256_FINGERPRINT_OPTIONAL"
    ]
  }
}]
```

### Landing Page Handler

Already implemented in `app/landing.tsx`:
- Handles `type=email&token_hash=XYZ` parameters
- Verifies email via Supabase
- Redirects to sign-in with success message
- Graceful fallback for web/browser context

### Intent Filters in app.json

Already configured:
- HTTPS scheme (not custom scheme)
- Both www and non-www domains
- `/landing` path prefix
- Auto-verify enabled

## Production Deployment Steps

### Pre-Deployment

1. **Get Production SHA-256**
   - Google Play Console → App Integrity
   - Copy SHA-256 certificate fingerprint

2. **Create assetlinks.json**
   - Use template above
   - Add production fingerprint
   - Validate JSON syntax

3. **Host on Domain**
   - Upload to `https://edudashpro.org.za/.well-known/assetlinks.json`
   - Upload to `https://www.edudashpro.org.za/.well-known/assetlinks.json`
   - Test accessibility with curl

### Deployment

4. **Rebuild App**
   ```bash
   eas build --platform android --profile production
   ```

5. **Submit to Play Store**
   - Upload new AAB
   - Update release notes: "Improved email confirmation flow"
   - Roll out to production

6. **Monitor**
   - Test email confirmation on real devices
   - Check Play Console for crash reports
   - Monitor Sentry for errors

### Post-Deployment

7. **Verify App Links**
   - Install from Play Store
   - Test email confirmation flow
   - Check ADB verification status

8. **Update Documentation**
   - Mark this feature as deployed
   - Document any issues encountered
   - Update troubleshooting section

## Alternative: Custom Scheme Fallback

If Android App Links verification fails, the custom scheme `edudashpro://` will be used as fallback (already implemented in `landing.tsx`).

**Pros**:
- Works immediately without domain verification
- No server-side hosting required

**Cons**:
- Less reliable on some browsers
- Shows browser intermediate step
- Not as seamless as App Links

## Related Documentation

- **Expo Deep Linking**: https://docs.expo.dev/guides/linking/
- **Android App Links**: https://developer.android.com/training/app-links
- **Digital Asset Links**: https://developers.google.com/digital-asset-links
- **Supabase Email Templates**: `docs/security/` (internal)

## Support

For issues:
- Check troubleshooting section above
- Review ADB logs: `adb logcat | grep -i "applinks"`
- Test with Google's verification tool
- Verify `assetlinks.json` is accessible

## Changelog

### 2025-10-22 - Initial Configuration
- ✅ Intent filters added to app.json
- ✅ Landing page handler implemented
- ✅ Documentation created
- ⏳ assetlinks.json needs production SHA-256
- ⏳ File needs to be hosted on domain
- ⏳ App needs to be rebuilt and deployed
