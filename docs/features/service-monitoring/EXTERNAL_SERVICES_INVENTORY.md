# External Services Inventory

**Generated**: 2025-10-21T20:38:15.410Z  
**Project**: EduDash Pro  
**Purpose**: Track all external APIs and third-party services for monitoring and cost management

---

## Summary

| Category | Services | Criticality |
|----------|----------|-------------|
| Infrastructure | 1 | 🔴 1    |
| Voice | 2 | 🔴 1   ⚪ 1 |
| Payment | 2 |  🟠 1 🟡 1  |
| Monitoring | 2 |    ⚪ 2 |
| Development | 1 |   🟡 1  |

**Legend**: 🔴 Critical | 🟠 High | 🟡 Medium | ⚪ Low

---

## Infrastructure Services

### 🔴 Supabase

- **Category**: infrastructure
- **Criticality**: critical
- **Official Docs**: https://supabase.com/docs

**NPM Packages**:
- `@supabase/supabase-js@^2.57.4`
- `@supabase/supabase-js@^2.57.4`
- `supabase@^2.51.0`

**Environment Variables**:
- `SUPABASE_URL` ✅
- `SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️

**API Domains**:
- `*.supabase.co`

**Used in Edge Functions**:
- `principal-hub-api`
- `ai-gateway`
- `transcribe-audio`
- `rag-search`
- `web-search`
- `payfast-webhook`
- `whatsapp-send`
- `webhooks-payfast`
- `tts-proxy`
- `google-calendar-sync`
- `whatsapp-webhook`
- `ai-usage`
- `azure-speech-token`
- `ingest-file`
- `dash-context-sync`
- `get-secrets`
- `dash-reminders-create`
- `payments-bridge`
- `ai-proxy`
- `revenuecat-webhook`
- `payments-create-checkout`
- `notifications-dispatcher`
- `payments-webhook`
- `.archive`
- `compute-progress-metrics`
- `rag-answer`
- `send-email`
- `stt-proxy`
- `openai-realtime-token`
- `sms-webhook`

---

## Voice Services

### 🔴 Microsoft Azure Cognitive Services Speech

- **Category**: voice
- **Criticality**: critical
- **Official Docs**: https://learn.microsoft.com/azure/ai-services/speech-service/

**NPM Packages**:
- `microsoft-cognitiveservices-speech-sdk@^1.46.0`
- `microsoft-cognitiveservices-speech-sdk@^1.46.0`

**Environment Variables**:
- `AZURE_SPEECH_KEY` ⚠️
- `AZURE_SPEECH_REGION` ⚠️

**API Domains**:
- `*.stt.speech.microsoft.com`
- `*.tts.speech.microsoft.com`

**Used in Edge Functions**:
- `transcribe-audio`
- `tts-proxy`
- `azure-speech-token`
- `stt-proxy`

---

### ⚪ Picovoice

- **Category**: voice
- **Criticality**: low
- **Official Docs**: https://picovoice.ai/docs/

**NPM Packages**:
- `@picovoice/porcupine-react-native@^3.0.4`
- `@picovoice/react-native-voice-processor@^1.2.3`
- `@picovoice/porcupine-react-native@^3.0.4`

**Environment Variables**:
- `PICOVOICE_ACCESS_KEY` ✅

**API Domains**:
- `api.picovoice.ai`

---

## Payment Services

### 🟠 RevenueCat

- **Category**: payment
- **Criticality**: high
- **Official Docs**: https://www.revenuecat.com/docs/api-v1

**NPM Packages**:
- `react-native-purchases@^9.5.0`

**Environment Variables**:
- `REVENUECAT_ANDROID_SDK_KEY` ✅
- `REVENUECAT_IOS_SDK_KEY` ✅
- `REVENUECAT_API_KEY` ⚠️

**API Domains**:
- `api.revenuecat.com`

**Used in Edge Functions**:
- `revenuecat-webhook`

---

### 🟡 Google AdMob

- **Category**: payment
- **Criticality**: medium
- **Official Docs**: https://developers.google.com/admob

**NPM Packages**:
- `react-native-google-mobile-ads@^14.11.0`

**Environment Variables**:
- `ADMOB_ANDROID_APP_ID` ✅
- `ADMOB_IOS_APP_ID` ✅
- `ADMOB_ANDROID_BANNER_UNIT_ID` ✅

**API Domains**:
- `admob.googleapis.com`

---

## Monitoring Services

### ⚪ Sentry

- **Category**: monitoring
- **Criticality**: low
- **Official Docs**: https://docs.sentry.io/platforms/react-native/

**NPM Packages**:
- `sentry-expo@~7.0.0`
- `sentry-expo@~7.0.0`

**Environment Variables**:
- `SENTRY_DSN` ✅
- `SENTRY_AUTH_TOKEN` ⚠️
- `SENTRY_ORG_SLUG` ⚠️

**API Domains**:
- `sentry.io`
- `*.ingest.sentry.io`

---

### ⚪ PostHog

- **Category**: monitoring
- **Criticality**: low
- **Official Docs**: https://posthog.com/docs/libraries/react-native

**NPM Packages**:
- `posthog-react-native@^4.3.2`
- `posthog-react-native@^4.3.2`

**Environment Variables**:
- `POSTHOG_KEY` ✅
- `POSTHOG_HOST` ✅

**API Domains**:
- `app.posthog.com`
- `us.i.posthog.com`

---

## Development Services

### 🟡 Expo (EAS)

- **Category**: development
- **Criticality**: medium
- **Official Docs**: https://docs.expo.dev/

**NPM Packages**:
- `@expo/ngrok@^4.1.3`
- `expo@~53.0.23`
- `expo-application@~6.1.5`
- `expo-audio@~0.4.9`
- `expo-av@~15.1.7`
- `expo-blur@~14.1.5`
- `expo-clipboard@~7.1.5`
- `expo-constants@~17.1.7`
- `expo-crypto@~14.1.5`
- `expo-dev-client@^5.2.4`
- `expo-device@~7.1.4`
- `expo-document-picker@~13.1.6`
- `expo-file-system@~18.1.11`
- `expo-haptics@~14.1.4`
- `expo-image@~2.4.1`
- `expo-image-manipulator@~13.1.7`
- `expo-image-picker@~16.1.4`
- `expo-linear-gradient@~14.1.5`
- `expo-linking@~7.1.7`
- `expo-local-authentication@~16.0.5`
- `expo-localization@~16.1.6`
- `expo-network@~7.1.5`
- `expo-notifications@~0.31.4`
- `expo-print@~14.1.4`
- `expo-router@~5.1.7`
- `expo-secure-store@~14.2.4`
- `expo-sharing@~13.1.5`
- `expo-speech@~13.1.7`
- `expo-speech-recognition@^2.1.5`
- `expo-status-bar@~2.2.3`
- `expo-updates@~0.28.17`
- `expo-web-browser@~14.2.0`
- `sentry-expo@~7.0.0`

**Environment Variables**:
- `EXPO_ACCESS_TOKEN` ⚠️
- `EXPO_PUBLIC_` ⚠️

**API Domains**:
- `expo.dev`
- `api.expo.dev`

**Used in Edge Functions**:
- `principal-hub-api`
- `ai-gateway`
- `transcribe-audio`
- `whatsapp-send`
- `google-calendar-sync`
- `ai-usage`
- `ingest-file`
- `notifications-dispatcher`
- `.archive`
- `compute-progress-metrics`
- `rag-answer`
- `openai-realtime-token`
- `sms-webhook`

---

## Documentation Sources

This inventory was generated using the following official documentation:

- **Microsoft Azure Cognitive Services Speech**: https://learn.microsoft.com/azure/ai-services/speech-service/
- **Supabase**: https://supabase.com/docs
- **RevenueCat**: https://www.revenuecat.com/docs/api-v1
- **Google AdMob**: https://developers.google.com/admob
- **Sentry**: https://docs.sentry.io/platforms/react-native/
- **PostHog**: https://posthog.com/docs/libraries/react-native
- **Expo (EAS)**: https://docs.expo.dev/
- **Picovoice**: https://picovoice.ai/docs/

---

**Maintenance**: This inventory should be regenerated monthly or when new external services are added.
**Command**: `npm run scan:services` or `node scripts/scan-external-services.mjs`
