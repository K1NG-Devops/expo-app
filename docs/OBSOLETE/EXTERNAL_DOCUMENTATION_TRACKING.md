# External Documentation Tracking for EduDash Pro

> **Purpose**: This document lists all external services, frameworks, and APIs that EduDash Pro depends on, along with links to their documentation that should be monitored for updates, deprecations, and breaking changes.

**Last Updated**: October 17, 2025  
**App Version**: 1.0.2

---

## 🎯 Critical Path Dependencies

### 1. React Native & Expo Ecosystem

#### **React Native** (v0.79.5)
- **Official Docs**: https://reactnative.dev/docs/getting-started
- **Changelog**: https://github.com/facebook/react-native/releases
- **Upgrade Helper**: https://react-native-community.github.io/upgrade-helper/
- **Monitor For**: Breaking changes in native modules, navigation patterns, performance APIs
- **Update Frequency**: Check monthly (major releases quarterly)

#### **Expo SDK** (~53.0.23)
- **Official Docs**: https://docs.expo.dev/
- **SDK Release Notes**: https://expo.dev/changelog/
- **API Reference**: https://docs.expo.dev/versions/latest/
- **Migration Guides**: https://expo.dev/changelog/
- **Monitor For**: SDK version deprecations, module changes, EAS build updates
- **Critical Modules Used**:
  - expo-router (~5.1.7) - Navigation
  - expo-audio (~0.4.9) - Audio recording
  - expo-av (~15.1.7) - Media playback
  - expo-file-system (~18.1.11) - File operations
  - expo-notifications (~0.31.4) - Push notifications
  - expo-updates (~0.28.17) - OTA updates
  - expo-dev-client (^5.2.4) - Development builds
- **Update Frequency**: Check before each major release (SDK updates every 3 months)

#### **EAS (Expo Application Services)**
- **Build Documentation**: https://docs.expo.dev/build/introduction/
- **Submit Documentation**: https://docs.expo.dev/submit/introduction/
- **Update Documentation**: https://docs.expo.dev/eas-update/introduction/
- **CLI Reference**: https://docs.expo.dev/eas-cli/
- **Monitor For**: Build configuration changes, credential management updates
- **Update Frequency**: Check monthly

---

## 🗄️ Backend & Database

### 2. Supabase (PostgreSQL v17)

#### **Supabase Platform**
- **Official Docs**: https://supabase.com/docs
- **API Reference**: https://supabase.com/docs/reference/javascript/introduction
- **Client Library**: https://github.com/supabase/supabase-js (v2.57.4)
- **CLI Documentation**: https://supabase.com/docs/guides/cli
- **Migration Guide**: https://supabase.com/docs/guides/database/migrations
- **Monitor For**: 
  - Database migration breaking changes
  - RLS policy changes
  - Storage API updates
  - Auth provider changes
  - Edge Functions runtime updates (Deno)
- **Update Frequency**: Check bi-weekly

#### **PostgreSQL** (v17)
- **Official Docs**: https://www.postgresql.org/docs/17/
- **Release Notes**: https://www.postgresql.org/docs/release/
- **Monitor For**: SQL syntax changes, function deprecations, performance improvements
- **Update Frequency**: Check quarterly

#### **Deno Runtime** (Edge Functions)
- **Official Docs**: https://deno.land/manual
- **Deno Deploy**: https://deno.com/deploy/docs
- **Monitor For**: Runtime API changes, module import changes, permission changes
- **Update Frequency**: Check monthly

---

## 🤖 AI & Machine Learning Services

### 3. Anthropic Claude API

#### **Claude API**
- **Official Docs**: https://docs.anthropic.com/
- **API Reference**: https://docs.anthropic.com/claude/reference/getting-started
- **Model Documentation**: https://docs.anthropic.com/claude/docs/models-overview
- **Pricing**: https://www.anthropic.com/pricing
- **Monitor For**: 
  - Model updates and deprecations (currently using Claude 3 family)
  - Rate limit changes
  - Token pricing changes
  - New model releases
  - API version changes
- **Models Used**: 
  - claude-3-haiku (Fast/Free tier)
  - claude-3-sonnet (Balanced/Starter+)
  - claude-3-opus (Advanced/Premium+)
- **Update Frequency**: Check bi-weekly

### 4. OpenAI API

#### **OpenAI Platform**
- **Official Docs**: https://platform.openai.com/docs/introduction
- **API Reference**: https://platform.openai.com/docs/api-reference
- **Models**: https://platform.openai.com/docs/models
- **Monitor For**: 
  - Whisper model updates (transcription)
  - Realtime API changes (WebSocket voice)
  - Deprecation notices
  - Pricing changes
- **Used For**: 
  - Speech-to-text (Whisper-1) - fallback transcription
  - OpenAI Realtime API - legacy streaming voice
- **Update Frequency**: Check bi-weekly

### 5. Speech & Transcription Services

#### **Deepgram API**
- **Official Docs**: https://developers.deepgram.com/docs
- **API Reference**: https://developers.deepgram.com/reference
- **Models**: https://developers.deepgram.com/docs/models-overview
- **Monitor For**: 
  - Nova-2 model updates
  - Language support changes
  - Streaming API changes
  - Pricing updates
- **Used For**: Primary English transcription (Nova-2)
- **Update Frequency**: Check monthly

#### **Azure Cognitive Services Speech**
- **Official Docs**: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/
- **SDK Docs**: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- **Language Support**: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/language-support
- **Pricing**: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/
- **Monitor For**: 
  - SDK updates (currently v1.46.0)
  - South African language model updates (Zulu, Afrikaans, Xhosa)
  - API deprecations
  - TTS voice updates
- **Used For**: 
  - SA language transcription (zu, af, xh)
  - Text-to-Speech (multilingual)
- **Update Frequency**: Check monthly

#### **Picovoice Porcupine** (Wake Word Detection)
- **Official Docs**: https://picovoice.ai/docs/
- **React Native SDK**: https://github.com/Picovoice/porcupine/tree/master/binding/react-native
- **Console**: https://console.picovoice.ai/
- **Monitor For**: 
  - SDK updates (v3.0.4)
  - Wake word model updates
  - Licensing changes
- **Update Frequency**: Check quarterly

---

## 💰 Payments & Monetization

### 6. RevenueCat (Subscriptions)

#### **RevenueCat Platform**
- **Official Docs**: https://www.revenuecat.com/docs
- **React Native SDK**: https://www.revenuecat.com/docs/getting-started/installation/reactnative
- **API Reference**: https://www.revenuecat.com/reference/basic
- **Webhooks**: https://www.revenuecat.com/docs/integrations/webhooks
- **Monitor For**: 
  - SDK updates (v9.5.0)
  - Webhook payload changes
  - Entitlement API changes
  - Dashboard changes
  - Pricing tier changes
- **Update Frequency**: Check monthly

#### **Apple App Store Connect**
- **Official Docs**: https://developer.apple.com/documentation/storekit
- **In-App Purchase**: https://developer.apple.com/in-app-purchase/
- **Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Monitor For**: 
  - StoreKit API changes
  - Review guideline updates
  - Subscription policy changes
- **Update Frequency**: Check monthly

#### **Google Play Console**
- **Official Docs**: https://developer.android.com/google/play/billing
- **Billing Library**: https://developer.android.com/google/play/billing/integrate
- **Policy Center**: https://play.google.com/about/developer-content-policy/
- **Monitor For**: 
  - Billing library updates
  - Policy changes
  - Review process changes
- **Update Frequency**: Check monthly

### 7. Google AdMob

#### **AdMob Platform**
- **Official Docs**: https://developers.google.com/admob
- **React Native SDK**: https://docs.page/invertase/react-native-google-mobile-ads
- **Ad Formats**: https://developers.google.com/admob/android/quick-start
- **Policy**: https://support.google.com/admob/answer/6128543
- **Monitor For**: 
  - SDK updates (v14.11.0)
  - Ad format changes
  - Policy violations
  - GDPR/Privacy requirements
- **Ad Types Used**: Banner, Interstitial, Rewarded, Native
- **Update Frequency**: Check monthly

### 8. PayFast (South African Payments)

#### **PayFast Platform**
- **Official Docs**: https://developers.payfast.co.za/
- **API Documentation**: https://developers.payfast.co.za/docs
- **ITN (Webhooks)**: https://developers.payfast.co.za/documentation/instant-transaction-notification/
- **Monitor For**: 
  - API version changes
  - Webhook signature changes
  - Payment method additions
  - Security requirements
- **Update Frequency**: Check quarterly

---

## 📊 Analytics & Monitoring

### 9. PostHog (Product Analytics)

#### **PostHog Platform**
- **Official Docs**: https://posthog.com/docs
- **React Native SDK**: https://posthog.com/docs/libraries/react-native
- **API Reference**: https://posthog.com/docs/api
- **Monitor For**: 
  - SDK updates (v4.3.2)
  - Feature flags API changes
  - Event capture changes
  - Privacy compliance updates
- **Update Frequency**: Check monthly

### 10. Sentry (Error Tracking)

#### **Sentry Platform**
- **Official Docs**: https://docs.sentry.io/
- **React Native SDK**: https://docs.sentry.io/platforms/react-native/
- **Expo Integration**: https://docs.expo.dev/guides/using-sentry/
- **Monitor For**: 
  - SDK updates (sentry-expo v7.0.0)
  - Source map configuration changes
  - Performance monitoring updates
  - Error grouping algorithm changes
- **Update Frequency**: Check monthly

---

## 🔐 Authentication & Security

### 11. OAuth Providers

#### **Google OAuth**
- **Official Docs**: https://developers.google.com/identity/protocols/oauth2
- **Console**: https://console.cloud.google.com/apis/credentials
- **Monitor For**: 
  - OAuth 2.0 flow changes
  - Scope changes
  - Security requirements
- **Update Frequency**: Check quarterly

#### **Azure AD / Microsoft Identity**
- **Official Docs**: https://learn.microsoft.com/en-us/azure/active-directory/develop/
- **Monitor For**: 
  - Authentication protocol updates
  - Token format changes
  - Security policy updates
- **Update Frequency**: Check quarterly

---

## 📱 Native Libraries & Services

### 12. React Native Community Libraries

#### **@react-native-community/netinfo** (v11.4.1)
- **Docs**: https://github.com/react-native-netinfo/react-native-netinfo
- **Monitor For**: API changes, connection type detection updates

#### **@react-native-voice/voice** (v3.2.4)
- **Docs**: https://github.com/react-native-voice/voice
- **Monitor For**: Speech recognition API changes

#### **@react-native-async-storage/async-storage** (v2.1.2)
- **Docs**: https://react-native-async-storage.github.io/async-storage/
- **Monitor For**: Storage API changes, migration guides

#### **@shopify/flash-list** (v1.7.6)
- **Docs**: https://shopify.github.io/flash-list/
- **Monitor For**: Performance improvements, API changes

---

## 🛠️ Development Tools

### 13. TypeScript

#### **TypeScript**
- **Official Docs**: https://www.typescriptlang.org/docs/
- **Release Notes**: https://devblogs.microsoft.com/typescript/
- **Monitor For**: 
  - Breaking changes (currently v5.8.3)
  - New features
  - Type system improvements
- **Update Frequency**: Check quarterly

### 14. React Query (TanStack Query)

#### **TanStack Query**
- **Official Docs**: https://tanstack.com/query/latest
- **React Query Docs**: https://tanstack.com/query/latest/docs/react/overview
- **Migration Guides**: https://tanstack.com/query/latest/docs/react/guides/migrating-to-v5
- **Monitor For**: 
  - API changes (currently v5.87.4)
  - Cache behavior changes
  - Breaking changes
- **Update Frequency**: Check bi-monthly

### 15. Testing & Quality Tools

#### **Jest** (v29.7.0)
- **Official Docs**: https://jestjs.io/docs/getting-started
- **Monitor For**: Configuration changes, matcher updates

#### **ESLint** (v9.35.0)
- **Official Docs**: https://eslint.org/docs/latest/
- **React Hooks Plugin**: https://www.npmjs.com/package/eslint-plugin-react-hooks
- **Monitor For**: Rule changes, plugin updates

---

## 📞 Communication Services

### 16. WhatsApp Business API

#### **WhatsApp Business Platform**
- **Official Docs**: https://developers.facebook.com/docs/whatsapp
- **Cloud API**: https://developers.facebook.com/docs/whatsapp/cloud-api
- **Webhooks**: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks
- **Monitor For**: 
  - API version changes
  - Message template requirements
  - Rate limit changes
  - Policy updates
- **Update Frequency**: Check monthly

### 17. Twilio (SMS Integration)

#### **Twilio Platform**
- **Official Docs**: https://www.twilio.com/docs
- **SMS API**: https://www.twilio.com/docs/sms
- **Pricing**: https://www.twilio.com/sms/pricing
- **Monitor For**: 
  - API updates
  - SMS delivery requirements
  - Pricing changes
- **Update Frequency**: Check quarterly

---

## 🌐 Additional Integrations

### 18. Google Calendar API

#### **Google Calendar**
- **Official Docs**: https://developers.google.com/calendar/api/guides/overview
- **API Reference**: https://developers.google.com/calendar/api/v3/reference
- **Monitor For**: 
  - API quota changes
  - Event format changes
  - OAuth scope updates
- **Update Frequency**: Check quarterly

### 19. React Native WebRTC

#### **WebRTC**
- **React Native WebRTC**: https://github.com/react-native-webrtc/react-native-webrtc
- **WebRTC Spec**: https://webrtc.org/
- **Monitor For**: 
  - Native module updates (v124.0.7)
  - Platform-specific changes
  - Codec support
- **Update Frequency**: Check quarterly

---

## 📦 Package Management

### 20. npm & Node.js

#### **Node.js** (>=18.0.0)
- **Official Docs**: https://nodejs.org/docs/latest/api/
- **Release Schedule**: https://nodejs.org/en/about/releases/
- **Monitor For**: LTS updates, security patches
- **Update Frequency**: Check quarterly

---

## 🔄 Update Monitoring Strategy

### Priority Levels

**🔴 Critical (Weekly Check)**
- Supabase platform status
- Expo SDK security patches
- Payment gateway notices (RevenueCat, PayFast)
- Claude API service status

**🟡 High Priority (Bi-Weekly Check)**
- React Native releases
- AI service updates (Claude, OpenAI, Deepgram)
- Expo SDK changelogs
- AdMob policy updates

**🟢 Standard (Monthly Check)**
- Third-party library updates
- Development tool updates
- Analytics platform changes
- OAuth provider updates

**⚪ Low Priority (Quarterly Check)**
- Documentation improvements
- Minor dependency updates
- Performance optimization guides

### Recommended Tools

1. **GitHub Watch**: Watch repositories for major libraries
2. **RSS Feeds**: Subscribe to changelogs and release notes
3. **Discord/Slack**: Join official communities for early warnings
4. **Email Notifications**: Enable service status alerts
5. **Dependabot**: Enable for automated dependency PRs
6. **npm-check-updates**: Run monthly to check for updates

### Breaking Change Alerts

Monitor these specific areas for breaking changes:
- React Native's "New Architecture" migration
- Expo SDK major version upgrades
- Supabase client library v3 announcement
- Claude API versioning
- RevenueCat SDK v10+ migration
- React 19 changes and hooks behavior

---

## 📋 Action Items

### Immediate Attention Required
- [ ] Set up monitoring for Expo SDK 54 release (expected Q1 2026)
- [ ] Watch for React Native 0.80 new architecture changes
- [ ] Monitor Claude API v2 deprecation timeline
- [ ] Track Supabase PostgreSQL 18 upgrade path

### Regular Maintenance
- [ ] Review dependency updates monthly
- [ ] Test major upgrades in development branch first
- [ ] Document breaking changes in migration guides
- [ ] Update this document when adding new services

---

## 📚 Additional Resources

### General Mobile Development
- **React Native Radio Podcast**: https://reactnativeradio.com/
- **Expo Blog**: https://blog.expo.dev/
- **React Native Newsletter**: https://reactnativenewsletter.com/

### Security & Compliance
- **OWASP Mobile**: https://owasp.org/www-project-mobile-top-10/
- **POPIA Compliance** (SA): https://popia.co.za/
- **GDPR**: https://gdpr.eu/

---

**Maintained by**: Development Team  
**Next Review Date**: November 17, 2025  
**Review Frequency**: Quarterly (with monthly spot checks)
