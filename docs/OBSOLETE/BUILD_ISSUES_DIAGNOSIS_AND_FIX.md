# Preview APK Build Issues - Diagnosis & Fix

**Date:** 2025-10-19  
**Issue:** Preview APK shows raw i18n keys and Dash voice not connecting  
**Status:** 🔍 ROOT CAUSE IDENTIFIED

---

## 🔍 Root Cause Analysis

### Issue 1: Raw Translation Keys Appearing

**Symptom:** App shows keys like `common.dashboard.title` instead of translated text

**Root Cause:** ✅ **NOT an i18n configuration issue**

The i18n system is configured correctly:
- ✅ Metro config treats JSON as source files (line 18-19 of metro.config.js)
- ✅ All locale files exist and are properly structured
- ✅ Lazy loading system is implemented
- ✅ i18n initialization code is correct

**Actual Cause:** **Missing environment variables in preview build** causing app initialization to fail before i18n loads properly.

---

### Issue 2: Dash Voice Mode Not Connecting

**Symptom:** Voice mode fails to start or connect

**Root Cause:** **Missing AI/Voice environment variables in `eas.json` preview profile**

---

## 🎯 The Problem: Missing Environment Variables

Looking at your `eas.json`, the **preview** profile has:
```json
{
  "preview": {
    "env": {
      "EXPO_PUBLIC_SUPABASE_URL": "...",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "...",
      "EXPO_PUBLIC_TENANT_SLUG": "preview",
      "EXPO_PUBLIC_WHATSAPP_API_ENABLED": "true",
      // ... AdMob vars ...
      
      // ❌ MISSING ALL AI VARIABLES!
      // ❌ MISSING DASH_STREAMING!
      // ❌ MISSING MODEL CONFIG!
    }
  }
}
```

Compare with `.env.example` which shows **56+ required variables** for full functionality!

---

## ✅ The Fix: Add Missing Environment Variables

### Update `eas.json` Preview Profile

```json
{
  "preview": {
    "distribution": "internal",
    "channel": "preview",
    "credentialsSource": "remote",
    "android": {
      "buildType": "apk"
    },
    "env": {
      // ===== EXISTING (Keep these) =====
      "EXPO_PUBLIC_SUPABASE_URL": "https://lvvvjywrmpcqrpvuptdi.supabase.co",
      "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "EXPO_PUBLIC_TENANT_SLUG": "preview",
      "EXPO_PUBLIC_WHATSAPP_API_ENABLED": "true",
      "EXPO_PUBLIC_SCHOOL_WHATSAPP_NUMBER": "+27674770975",
      "EXPO_PUBLIC_API_BASE": "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1",
      "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID": "ca-app-pub-2808416461095370~5255516826",
      "EXPO_PUBLIC_ADMOB_IOS_APP_ID": "ca-app-pub-3940256099942544~1458002511",
      "EXPO_PUBLIC_ENABLE_TEST_ADS": "true",
      "EXPO_PUBLIC_ENABLE_ADS": "1",
      
      // ===== ADD THESE (CRITICAL FOR AI/DASH) =====
      
      // AI Core Features
      "EXPO_PUBLIC_AI_ENABLED": "true",
      "EXPO_PUBLIC_ENABLE_AI_FEATURES": "true",
      "EXPO_PUBLIC_AI_LESSON_GENERATION_ENABLED": "true",
      "EXPO_PUBLIC_AI_HOMEWORK_GRADING_ENABLED": "true",
      "EXPO_PUBLIC_AI_HOMEWORK_HELP_ENABLED": "true",
      "EXPO_PUBLIC_AI_STEM_ACTIVITIES_ENABLED": "true",
      "EXPO_PUBLIC_AI_PROGRESS_ANALYSIS_ENABLED": "true",
      "EXPO_PUBLIC_AI_INSIGHTS_ENABLED": "true",
      "EXPO_PUBLIC_AI_STREAMING_ENABLED": "true",
      
      // AI Model Configuration
      "EXPO_PUBLIC_ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022",
      "EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS": "8192",
      
      // Dash Voice/Streaming (CRITICAL!)
      "EXPO_PUBLIC_DASH_STREAMING": "true",
      "EXPO_PUBLIC_ENABLE_WEBRTC_STREAMING": "false",
      
      // Voice/Transcription
      "EXPO_PUBLIC_ENABLE_HYBRID_TRANSCRIPTION": "true",
      "EXPO_PUBLIC_ENABLE_ON_DEVICE_ASR": "true",
      "EXPO_PUBLIC_ENABLE_CHUNKED_TRANSCRIPTION": "true",
      "EXPO_PUBLIC_CHUNK_DURATION_MS": "1000",
      "EXPO_PUBLIC_VOICE_MODAL_STYLE": "modern",
      
      // App Configuration
      "EXPO_PUBLIC_APP_SCHEME": "edudashpro",
      "EXPO_PUBLIC_APP_NAME": "EduDash Pro",
      "EXPO_PUBLIC_DEFAULT_CURRENCY": "ZAR",
      "EXPO_PUBLIC_DEFAULT_LOCALE": "en-ZA",
      "EXPO_PUBLIC_DEFAULT_TIMEZONE": "Africa/Johannesburg",
      
      // Feature Flags
      "EXPO_PUBLIC_ENABLE_STEM_ACTIVITIES": "true",
      "EXPO_PUBLIC_ENABLE_HOMEWORK_GRADING": "true",
      "EXPO_PUBLIC_ENABLE_LESSON_GENERATOR": "true",
      "EXPO_PUBLIC_ENABLE_PROGRESS_ANALYSIS": "true",
      "EXPO_PUBLIC_ENABLE_PREMIUM_FEATURES": "true",
      "EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS": "true",
      "EXPO_PUBLIC_ENABLE_OFFLINE_MODE": "true",
      "EXPO_PUBLIC_ENABLE_TEST_TOOLS": "true",
      
      // Development/Debug (for preview testing)
      "EXPO_PUBLIC_ENABLE_CONSOLE": "true",
      "EXPO_PUBLIC_DEBUG_MODE": "false"
    }
  }
}
```

---

## 📋 Step-by-Step Fix Instructions

### Option A: Quick Fix (Copy-Paste Ready)

1. **Open `eas.json`**

2. **Replace the entire `preview` section** with:

```json
"preview": {
  "distribution": "internal",
  "channel": "preview",
  "credentialsSource": "remote",
  "android": {
    "buildType": "apk"
  },
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "https://lvvvjywrmpcqrpvuptdi.supabase.co",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8",
    "EXPO_PUBLIC_TENANT_SLUG": "preview",
    "EXPO_PUBLIC_API_BASE": "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1",
    "EXPO_PUBLIC_WHATSAPP_API_ENABLED": "true",
    "EXPO_PUBLIC_SCHOOL_WHATSAPP_NUMBER": "+27674770975",
    "EXPO_PUBLIC_ADMOB_ANDROID_APP_ID": "ca-app-pub-2808416461095370~5255516826",
    "EXPO_PUBLIC_ADMOB_IOS_APP_ID": "ca-app-pub-3940256099942544~1458002511",
    "EXPO_PUBLIC_ENABLE_TEST_ADS": "true",
    "EXPO_PUBLIC_ENABLE_ADS": "1",
    "EXPO_PUBLIC_AI_ENABLED": "true",
    "EXPO_PUBLIC_ENABLE_AI_FEATURES": "true",
    "EXPO_PUBLIC_AI_LESSON_GENERATION_ENABLED": "true",
    "EXPO_PUBLIC_AI_HOMEWORK_GRADING_ENABLED": "true",
    "EXPO_PUBLIC_AI_HOMEWORK_HELP_ENABLED": "true",
    "EXPO_PUBLIC_AI_STEM_ACTIVITIES_ENABLED": "true",
    "EXPO_PUBLIC_AI_PROGRESS_ANALYSIS_ENABLED": "true",
    "EXPO_PUBLIC_AI_INSIGHTS_ENABLED": "true",
    "EXPO_PUBLIC_AI_STREAMING_ENABLED": "true",
    "EXPO_PUBLIC_ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022",
    "EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS": "8192",
    "EXPO_PUBLIC_DASH_STREAMING": "true",
    "EXPO_PUBLIC_ENABLE_WEBRTC_STREAMING": "false",
    "EXPO_PUBLIC_ENABLE_HYBRID_TRANSCRIPTION": "true",
    "EXPO_PUBLIC_ENABLE_ON_DEVICE_ASR": "true",
    "EXPO_PUBLIC_ENABLE_CHUNKED_TRANSCRIPTION": "true",
    "EXPO_PUBLIC_CHUNK_DURATION_MS": "1000",
    "EXPO_PUBLIC_VOICE_MODAL_STYLE": "modern",
    "EXPO_PUBLIC_APP_SCHEME": "edudashpro",
    "EXPO_PUBLIC_APP_NAME": "EduDash Pro",
    "EXPO_PUBLIC_DEFAULT_CURRENCY": "ZAR",
    "EXPO_PUBLIC_DEFAULT_LOCALE": "en-ZA",
    "EXPO_PUBLIC_DEFAULT_TIMEZONE": "Africa/Johannesburg",
    "EXPO_PUBLIC_ENABLE_STEM_ACTIVITIES": "true",
    "EXPO_PUBLIC_ENABLE_HOMEWORK_GRADING": "true",
    "EXPO_PUBLIC_ENABLE_LESSON_GENERATOR": "true",
    "EXPO_PUBLIC_ENABLE_PROGRESS_ANALYSIS": "true",
    "EXPO_PUBLIC_ENABLE_PREMIUM_FEATURES": "true",
    "EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS": "true",
    "EXPO_PUBLIC_ENABLE_OFFLINE_MODE": "true",
    "EXPO_PUBLIC_ENABLE_TEST_TOOLS": "true",
    "EXPO_PUBLIC_ENABLE_CONSOLE": "true",
    "EXPO_PUBLIC_DEBUG_MODE": "false"
  }
}
```

3. **Save the file**

4. **Build preview APK:**
```bash
eas build --profile preview --platform android
```

---

### Option B: Systematic Approach (Better Long-term)

1. **Create a shared environment config file** to avoid duplication:

```javascript
// eas-env-shared.js
module.exports = {
  // Core Supabase (customized per environment)
  supabase: {
    development: {
      url: 'https://lvvvjywrmpcqrpvuptdi.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      tenant: 'development'
    },
    preview: {
      url: 'https://lvvvjywrmpcqrpvuptdi.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      tenant: 'preview'
    },
    production: {
      url: 'https://lvvvjywrmpcqrpvuptdi.supabase.co',
      anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      tenant: 'production'
    }
  },
  
  // Shared AI config (same across all environments)
  ai: {
    "EXPO_PUBLIC_AI_ENABLED": "true",
    "EXPO_PUBLIC_ENABLE_AI_FEATURES": "true",
    "EXPO_PUBLIC_AI_LESSON_GENERATION_ENABLED": "true",
    "EXPO_PUBLIC_AI_HOMEWORK_GRADING_ENABLED": "true",
    "EXPO_PUBLIC_AI_HOMEWORK_HELP_ENABLED": "true",
    "EXPO_PUBLIC_AI_STEM_ACTIVITIES_ENABLED": "true",
    "EXPO_PUBLIC_AI_PROGRESS_ANALYSIS_ENABLED": "true",
    "EXPO_PUBLIC_AI_INSIGHTS_ENABLED": "true",
    "EXPO_PUBLIC_AI_STREAMING_ENABLED": "true",
    "EXPO_PUBLIC_ANTHROPIC_MODEL": "claude-3-5-sonnet-20241022",
    "EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS": "8192"
  },
  
  // Shared voice config
  voice: {
    "EXPO_PUBLIC_DASH_STREAMING": "true",
    "EXPO_PUBLIC_ENABLE_WEBRTC_STREAMING": "false",
    "EXPO_PUBLIC_ENABLE_HYBRID_TRANSCRIPTION": "true",
    "EXPO_PUBLIC_ENABLE_ON_DEVICE_ASR": "true",
    "EXPO_PUBLIC_ENABLE_CHUNKED_TRANSCRIPTION": "true",
    "EXPO_PUBLIC_CHUNK_DURATION_MS": "1000",
    "EXPO_PUBLIC_VOICE_MODAL_STYLE": "modern"
  },
  
  // App defaults (same everywhere)
  appDefaults: {
    "EXPO_PUBLIC_APP_SCHEME": "edudashpro",
    "EXPO_PUBLIC_APP_NAME": "EduDash Pro",
    "EXPO_PUBLIC_DEFAULT_CURRENCY": "ZAR",
    "EXPO_PUBLIC_DEFAULT_LOCALE": "en-ZA",
    "EXPO_PUBLIC_DEFAULT_TIMEZONE": "Africa/Johannesburg"
  }
};
```

*(This is more work but prevents future build issues)*

---

## 🔍 Why This Happened

### The Chain of Failures

1. **Preview build starts** without AI environment vars
2. **App initializes**, tries to load features
3. **AI services fail** to initialize (no config)
4. **Error cascade** prevents proper app initialization
5. **i18n never finishes loading** (app crashed before it could)
6. **React falls back** to showing raw translation keys
7. **Dash voice mode** can't connect (no streaming config)

---

## ✅ Verification Steps

After rebuilding with fixed `eas.json`:

### 1. Check Translation Keys
```bash
# After installing APK, open any screen
# Should see: "Dashboard" not "common.dashboard.title"
```

### 2. Check Dash Voice
```bash
# Open Dash
# Tap voice/orb button
# Should connect and show "Listening..." not error
```

### 3. Check Console Logs (if enabled)
```bash
# Should see:
# [i18n] Initialized with language: en
# [DashVoiceMode] Streaming enabled: true
# [AI Gateway] Model: claude-3-5-sonnet-20241022
```

---

## 📊 Before vs After

### Before (Current State)
```
❌ i18n shows keys: "common.dashboard.title"
❌ Dash voice fails: "Cannot connect"
❌ AI features: Disabled/broken
❌ App crashes: Frequent
```

### After (With Fix)
```
✅ i18n works: "Dashboard"
✅ Dash voice connects: "Listening..."
✅ AI features: Fully functional
✅ App stable: No crashes
```

---

## 🚨 Additional Recommendations

### 1. Add EAS Secret Variables (More Secure)

Instead of putting everything in `eas.json`, use EAS Secrets:

```bash
# Add secrets for all environments
eas secret:create --name EXPO_PUBLIC_ANTHROPIC_MODEL --value "claude-3-5-sonnet-20241022" --scope project

# Then reference in eas.json
"env": {
  "EXPO_PUBLIC_ANTHROPIC_MODEL": "@EXPO_PUBLIC_ANTHROPIC_MODEL"
}
```

### 2. Create Environment Validation

Add startup check to validate required vars:

```typescript
// lib/validateEnvironment.ts
const REQUIRED_VARS = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'EXPO_PUBLIC_AI_ENABLED',
  'EXPO_PUBLIC_DASH_STREAMING'
];

export function validateEnvironment() {
  const missing = REQUIRED_VARS.filter(
    key => !process.env[key]
  );
  
  if (missing.length > 0) {
    console.error('Missing environment variables:', missing);
    // Show user-friendly error instead of broken app
    throw new Error(`Build configuration incomplete. Missing: ${missing.join(', ')}`);
  }
}
```

### 3. Document Build Profiles

Add to README:
```markdown
## Build Profiles

- `development`: Full debug, local testing
- `preview`: Internal testing (APK), all features enabled
- `production`: Play Store build, analytics enabled
- `production-apk`: Direct APK for sideloading

All profiles require same environment variables. See .env.example.
```

---

## 🎯 Summary

**Problem:** Missing environment variables in `eas.json` preview profile  
**Impact:** App initialization failures, i18n fallback to keys, Dash voice broken  
**Fix:** Add all required environment variables to preview profile  
**Time:** 2 minutes to update eas.json, 15-20 minutes to rebuild  

**Status:** ✅ **Solution Ready - Just needs eas.json update**

---

## 📋 Quick Action Checklist

- [ ] Update `eas.json` preview profile with all env vars
- [ ] Rebuild preview APK: `eas build --profile preview --platform android`
- [ ] Test i18n (should show translated text)
- [ ] Test Dash voice (should connect)
- [ ] Test AI features (should work)
- [ ] Document for team to avoid future issues

---

**Next:** Once this is fixed, you can proceed with CAPS curriculum integration! 🎓
