# Vercel Environment Variables Checklist

## Overview

This document lists all environment variables that need to be configured in Vercel for the EduDash Pro web deployment.

**Vercel Dashboard Path**: Project Settings → Environment Variables

---

## ✅ Current .env Variables (13)

These are currently in your local `.env` file:

1. ✅ `EXPO_PUBLIC_SUPABASE_URL` - **CRITICAL**
2. ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` - **CRITICAL**
3. ✅ `EXPO_PUBLIC_TENANT_SLUG` - Optional (multi-tenant slug)
4. ✅ `EXPO_PUBLIC_WHATSAPP_API_ENABLED` - Feature flag
5. ✅ `EXPO_PUBLIC_SCHOOL_WHATSAPP_NUMBER` - WhatsApp integration
6. ✅ `EXPO_PUBLIC_API_BASE` - API base URL
7. ✅ `EXPO_PUBLIC_ENABLE_TEST_ADS` - Testing flag
8. ✅ `EXPO_PUBLIC_ENABLE_ADS` - Production flag
9. ✅ `EXPO_PUBLIC_ENABLE_CONSOLE` - Debug flag
10. ✅ `EXPO_PUBLIC_ENABLE_TEST_TOOLS` - Testing flag
11. ✅ `EXPO_PUBLIC_ENABLE_OTA_UPDATES` - OTA updates flag
12. ✅ `EXPO_PUBLIC_WEB_FOCUS_REFRESH` - Web-specific refresh
13. ✅ `EXPO_PUBLIC_PICOVOICE_ACCESS_KEY` - Voice AI key

---

## 🔴 Missing Critical Variables (Required for Production)

These variables are referenced in the codebase but **NOT** in your `.env` file. They need to be added to Vercel:

### **Authentication & Database** (CRITICAL)
- ❌ No missing critical DB vars (Supabase vars are present)

### **Monitoring & Analytics** (HIGH PRIORITY)
14. ❌ `EXPO_PUBLIC_SENTRY_DSN` - Error tracking (Sentry)
15. ❌ `EXPO_PUBLIC_ENABLE_SENTRY` - Enable Sentry in production
16. ❌ `EXPO_PUBLIC_POSTHOG_KEY` - Analytics (PostHog)
17. ❌ `EXPO_PUBLIC_POSTHOG_HOST` - PostHog host URL
18. ❌ `EXPO_PUBLIC_ENABLE_POSTHOG` - Enable PostHog in production

### **Email & Notifications** (MEDIUM PRIORITY)
19. ❌ `EXPO_PUBLIC_FROM_EMAIL` - Sender email address
20. ❌ `FROM_EMAIL` - Server-side sender email
21. ❌ `EXPO_PUBLIC_EMAIL_ENABLED` - Enable email features
22. ❌ `EXPO_PUBLIC_EMAIL_MOCK_MODE` - Mock mode for testing

### **AI Features** (HIGH PRIORITY)
23. ❌ `EXPO_PUBLIC_AI_ENABLED` - Enable AI features
24. ❌ `EXPO_PUBLIC_ENABLE_AI_FEATURES` - Global AI toggle
25. ❌ `EXPO_PUBLIC_AI_LESSON_GENERATION_ENABLED` - AI lesson plans
26. ❌ `EXPO_PUBLIC_AI_HOMEWORK_GRADING_ENABLED` - AI grading
27. ❌ `EXPO_PUBLIC_AI_HOMEWORK_HELP_ENABLED` - AI homework help
28. ❌ `EXPO_PUBLIC_AI_STEM_ACTIVITIES_ENABLED` - AI STEM activities
29. ❌ `EXPO_PUBLIC_AI_PROGRESS_ANALYSIS_ENABLED` - AI progress tracking
30. ❌ `EXPO_PUBLIC_AI_INSIGHTS_ENABLED` - AI insights
31. ❌ `EXPO_PUBLIC_AI_CONTENT_MODERATION_ENABLED` - AI moderation
32. ❌ `EXPO_PUBLIC_AI_STREAMING_ENABLED` - AI streaming responses
33. ❌ `EXPO_PUBLIC_AGENTIC_ENABLED` - Agentic AI mode
34. ❌ `EXPO_PUBLIC_AGENTIC_AUTONOMY` - Autonomy level
35. ❌ `EXPO_PUBLIC_AGENTIC_PREDICTIVE` - Predictive features
36. ❌ `EXPO_PUBLIC_AGENTIC_SEMANTIC_MEMORY` - Semantic memory
37. ❌ `EXPO_PUBLIC_ANTHROPIC_MODEL` - Claude model name
38. ❌ `EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS` - Max tokens for Claude

### **AdMob & Monetization** (MEDIUM PRIORITY)
39. ❌ `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` - AdMob Android app ID
40. ❌ `EXPO_PUBLIC_ADMOB_IOS_APP_ID` - AdMob iOS app ID
41. ❌ `EXPO_PUBLIC_ENABLE_FREE_TIER_ADS` - Show ads on free tier
42. ❌ `EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY` - Use test ad IDs
43. ❌ `EXPO_PUBLIC_ADMOB_ADUNIT_BANNER_PARENT_DASHBOARD` - Banner ad unit
44. ❌ `EXPO_PUBLIC_ADMOB_ADUNIT_NATIVE_PARENT_FEED` - Native ad unit
45. ❌ `EXPO_PUBLIC_ADMOB_ADUNIT_INTERSTITIAL_PARENT_NAV` - Interstitial ad unit
46. ❌ `EXPO_PUBLIC_ADMOB_ADUNIT_REWARDED_PARENT_PERK` - Rewarded ad unit
47. ❌ `EXPO_PUBLIC_ADMOB_ANDROID_BANNER_UNIT_ID` - Android banner unit
48. ❌ `EXPO_PUBLIC_ADMOB_ANDROID_INTERSTITIAL_UNIT_ID` - Android interstitial
49. ❌ `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_UNIT_ID` - Android rewarded

### **Payments & Subscriptions** (HIGH PRIORITY)
50. ❌ `EXPO_PUBLIC_REVENUECAT_ANDROID_SDK_KEY` - RevenueCat Android key
51. ❌ `EXPO_PUBLIC_REVENUECAT_IOS_SDK_KEY` - RevenueCat iOS key
52. ❌ `EXPO_PUBLIC_WEBHOOK_PAYPAL_FN` - PayPal webhook function
53. ❌ `EXPO_PUBLIC_WEBHOOK_PAYFAST_FN` - PayFast webhook function
54. ❌ `EXPO_PUBLIC_PAYMENTS_BRIDGE_URL` - Payment bridge URL

### **App Configuration** (LOW PRIORITY)
55. ❌ `EXPO_PUBLIC_APP_SCHEME` - Deep link scheme (e.g., edudashpro://)
56. ❌ `EXPO_PUBLIC_WEB_URL` - Web app URL
57. ❌ `EXPO_PUBLIC_APP_NAME` - App display name
58. ❌ `EXPO_PUBLIC_APP_VERSION` - App version
59. ❌ `EXPO_PUBLIC_DEFAULT_CURRENCY` - Default currency (ZAR)
60. ❌ `EXPO_PUBLIC_DEFAULT_LOCALE` - Default locale (en-ZA)
61. ❌ `EXPO_PUBLIC_DEFAULT_TIMEZONE` - Default timezone (Africa/Johannesburg)

### **Storage & Media** (LOW PRIORITY)
62. ❌ `EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET` - Supabase storage bucket name

### **Feature Flags** (MEDIUM PRIORITY)
63. ❌ `EXPO_PUBLIC_ENABLE_STEM_ACTIVITIES` - STEM activities feature
64. ❌ `EXPO_PUBLIC_ENABLE_HOMEWORK_GRADING` - Homework grading feature
65. ❌ `EXPO_PUBLIC_ENABLE_LESSON_GENERATOR` - Lesson generator feature
66. ❌ `EXPO_PUBLIC_ENABLE_PROGRESS_ANALYSIS` - Progress analysis feature
67. ❌ `EXPO_PUBLIC_ENABLE_PREMIUM_FEATURES` - Premium features gate
68. ❌ `EXPO_PUBLIC_ENABLE_ANALYTICS` - Analytics tracking
69. ❌ `EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS` - Push notifications
70. ❌ `EXPO_PUBLIC_ENABLE_OFFLINE_MODE` - Offline mode support
71. ❌ `EXPO_PUBLIC_DASH_STREAMING` - Dash AI streaming

### **Debug & Development** (DEV ONLY)
72. ❌ `EXPO_PUBLIC_ENVIRONMENT` - Environment name (production/staging/preview)
73. ❌ `EXPO_PUBLIC_DEBUG_MODE` - Debug mode flag
74. ❌ `EXPO_PUBLIC_DEBUG_TOOLS` - Debug tools enabled
75. ❌ `EXPO_PUBLIC_DEBUG_SUPABASE` - Supabase debug logging
76. ❌ `EXPO_PUBLIC_PLATFORM_TESTING` - Platform testing mode
77. ❌ `EXPO_PUBLIC_USE_PRODUCTION_DB_AS_DEV` - Use prod DB in dev

### **Server-Side Only** (NOT EXPO_PUBLIC)
78. ❌ `NODE_BINARY` - Node.js binary path (Vercel manages this)

---

## 📋 Recommended Configuration for Vercel

### **Step 1: Add Critical Variables (DO THIS FIRST)**

Add these to Vercel immediately for production deployment:

```bash
# Database (CRITICAL - Already in .env)
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Monitoring (CRITICAL for production)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
EXPO_PUBLIC_ENABLE_SENTRY=true
EXPO_PUBLIC_POSTHOG_KEY=phc_xxx
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com
EXPO_PUBLIC_ENABLE_POSTHOG=true

# Payments (CRITICAL if using subscriptions)
EXPO_PUBLIC_REVENUECAT_ANDROID_SDK_KEY=xxx
EXPO_PUBLIC_REVENUECAT_IOS_SDK_KEY=xxx

# AI Features (HIGH PRIORITY)
EXPO_PUBLIC_AI_ENABLED=true
EXPO_PUBLIC_ENABLE_AI_FEATURES=true
EXPO_PUBLIC_ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
EXPO_PUBLIC_ANTHROPIC_MAX_TOKENS=4096
```

### **Step 2: Configure Feature Flags**

Set these based on your production plan:

```bash
# AI Feature Flags
EXPO_PUBLIC_AI_LESSON_GENERATION_ENABLED=true
EXPO_PUBLIC_AI_HOMEWORK_GRADING_ENABLED=true
EXPO_PUBLIC_AI_HOMEWORK_HELP_ENABLED=true
EXPO_PUBLIC_AI_STEM_ACTIVITIES_ENABLED=true
EXPO_PUBLIC_AI_PROGRESS_ANALYSIS_ENABLED=true
EXPO_PUBLIC_AI_INSIGHTS_ENABLED=true
EXPO_PUBLIC_AI_STREAMING_ENABLED=true

# Monetization
EXPO_PUBLIC_ENABLE_FREE_TIER_ADS=false  # Disable ads on web for now
EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY=false   # Use real ads in production
```

### **Step 3: Configure App Settings**

```bash
# App Configuration
EXPO_PUBLIC_APP_SCHEME=edudashpro
EXPO_PUBLIC_WEB_URL=https://your-app.vercel.app
EXPO_PUBLIC_APP_NAME=EduDash Pro
EXPO_PUBLIC_APP_VERSION=1.0.2
EXPO_PUBLIC_DEFAULT_CURRENCY=ZAR
EXPO_PUBLIC_DEFAULT_LOCALE=en-ZA
EXPO_PUBLIC_DEFAULT_TIMEZONE=Africa/Johannesburg
EXPO_PUBLIC_ENVIRONMENT=production
```

### **Step 4: Optional - Development/Preview Settings**

For preview deployments, you can override with different values:

```bash
# Preview Environment Overrides
EXPO_PUBLIC_ENVIRONMENT=preview
EXPO_PUBLIC_DEBUG_MODE=true
EXPO_PUBLIC_ENABLE_SENTRY=false  # Disable Sentry in preview
EXPO_PUBLIC_ENABLE_POSTHOG=false # Disable PostHog in preview
EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY=true  # Use test ads in preview
```

---

## 🔧 How to Add Variables to Vercel

### **Via Vercel Dashboard**

1. Go to your project on [vercel.com](https://vercel.com)
2. Navigate to **Settings** → **Environment Variables**
3. For each variable:
   - **Key**: Variable name (e.g., `EXPO_PUBLIC_SENTRY_DSN`)
   - **Value**: Variable value
   - **Environments**: Select **Production**, **Preview**, and **Development** (or specific ones)
4. Click **Save**

### **Via Vercel CLI**

```bash
# Add a single variable
vercel env add EXPO_PUBLIC_SENTRY_DSN production

# Add from .env file (be careful with secrets!)
vercel env pull .env.vercel.production
```

### **Via API**

```bash
# Using Vercel API
curl -X POST "https://api.vercel.com/v10/projects/${PROJECT_ID}/env" \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "key": "EXPO_PUBLIC_SENTRY_DSN",
    "value": "https://xxx@sentry.io/xxx",
    "type": "plain",
    "target": ["production", "preview"]
  }'
```

---

## ⚠️ Security Best Practices

1. **Never commit `.env` to git** - Already in `.gitignore`
2. **Use separate values for production vs preview**
   - Production: Real keys, prod database
   - Preview: Test keys, staging database
3. **Rotate keys regularly** - Especially Supabase anon key, API keys
4. **Use Vercel's encrypted variables** for sensitive data
5. **Audit access** - Review who has access to environment variables

---

## 🚨 Critical Variables Summary

**Must Have for Web to Work**:
- ✅ `EXPO_PUBLIC_SUPABASE_URL` (Already set)
- ✅ `EXPO_PUBLIC_SUPABASE_ANON_KEY` (Already set)

**Should Have for Production**:
- ❌ `EXPO_PUBLIC_SENTRY_DSN` (Error tracking)
- ❌ `EXPO_PUBLIC_POSTHOG_KEY` (Analytics)
- ❌ `EXPO_PUBLIC_AI_ENABLED` (AI features)
- ❌ `EXPO_PUBLIC_REVENUECAT_ANDROID_SDK_KEY` (Subscriptions)
- ❌ `EXPO_PUBLIC_WEB_URL` (Deep links, OAuth redirects)

**Nice to Have**:
- ❌ All other feature flags and configurations

---

## 📝 Deployment Checklist

Before pushing to production:

- [x] ✅ TypeScript compiles without errors
- [x] ✅ Web build succeeds (`npx expo export --platform web`)
- [x] ✅ Vercel config has correct routes (`vercel.json`)
- [ ] ⬜ Add critical environment variables to Vercel
- [ ] ⬜ Test auth flow on Vercel preview deployment
- [ ] ⬜ Verify Sentry error tracking works
- [ ] ⬜ Verify PostHog analytics tracking works
- [ ] ⬜ Test subscription flow (if applicable)
- [ ] ⬜ Purge Vercel cache after first deployment
- [ ] ⬜ Test PWA installation
- [ ] ⬜ Verify service worker caching

---

## 🔗 References

- [Vercel Environment Variables Docs](https://vercel.com/docs/concepts/projects/environment-variables)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Supabase Auth with Vercel](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Last Updated**: October 27, 2025  
**Status**: 13 variables configured locally, 65+ missing in Vercel  
**Priority**: Add critical monitoring and AI variables before production deployment
