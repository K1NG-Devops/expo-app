# Quick Start: Android App Links for Email Confirmation

**Goal**: Make email confirmation links open the app directly instead of showing in a browser.

## ✅ What's Already Done

1. **Intent Filters** - Configured in `app.json` (lines 55-76)
2. **Landing Page** - Handles email verification in `app/landing.tsx`
3. **Custom Scheme** - Fallback `edudashpro://` already works

## 🚀 Next Steps (Production Deployment)

### 1. Get SHA-256 Fingerprint

**From Google Play Console:**
1. Go to https://play.google.com/console
2. Select your app
3. Navigate: **Release → Setup → App Integrity**
4. Copy the **SHA-256 certificate fingerprint** under "App signing"

Example: `14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5`

### 2. Update assetlinks.json

Edit: `.well-known/assetlinks.json`

Replace `REPLACE_WITH_YOUR_PRODUCTION_SHA256_FINGERPRINT` with your actual fingerprint from step 1.

### 3. Host the File

Upload `.well-known/assetlinks.json` to your web server so it's accessible at:
- `https://edudashpro.org.za/.well-known/assetlinks.json`
- `https://www.edudashpro.org.za/.well-known/assetlinks.json`

**Verify it's accessible:**
```bash
curl https://edudashpro.org.za/.well-known/assetlinks.json
```

Should return 200 OK with JSON content.

### 4. Update Supabase Email Template

In Supabase Dashboard → Authentication → Email Templates:

Change confirmation link to:
```
https://edudashpro.org.za/landing?type=email&token_hash={{ .TokenHash }}
```

### 5. Rebuild App

```bash
eas build --platform android --profile production
```

The intent filters need to be baked into the app build.

### 6. Deploy & Test

1. Install rebuilt app from Play Store
2. Register a test account
3. Check email on mobile device
4. Tap confirmation link
5. **Expected**: App opens directly (no browser)

## ⏱️ Timeline

- **Setup**: 15 minutes (get fingerprint, update files, upload)
- **Build**: 20-30 minutes (EAS build)
- **Verification**: Up to 24 hours (Android verifies domain ownership)

## 🔍 Verify It's Working

On Android device with app installed:

```bash
adb shell pm get-app-links com.edudashpro
```

Should show:
```
Domain verification state:
  edudashpro.org.za: verified
  www.edudashpro.org.za: verified
```

## ⚠️ Troubleshooting

**Browser still opens?**
- assetlinks.json not accessible (check with curl)
- Wrong SHA-256 fingerprint (verify from Play Console)
- Domain verification pending (wait up to 24 hours)
- App not rebuilt after config change

**Force re-verification:**
```bash
adb shell pm verify-app-links --re-verify com.edudashpro
```

## 📚 Full Documentation

See: `docs/deployment/android-app-links-setup.md`

## 🎯 Success Criteria

✅ Email links open app directly on Android  
✅ No browser intermediate step  
✅ Seamless email confirmation flow  
✅ Graceful fallback to custom scheme if needed  
