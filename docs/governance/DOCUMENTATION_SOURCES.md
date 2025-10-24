# 📚 Critical Documentation Sources for WARP Rules

**Purpose**: This document lists all critical documentation sources that should be added to WARP rules to ensure accurate, up-to-date development guidance.

**Last Updated**: October 19, 2025

---

## 🎯 Why This Matters

Adding these documentation sources as WARP rules will:
- ✅ Reduce errors from outdated practices
- ✅ Ensure alignment with current API patterns
- ✅ Prevent version drift and compatibility issues
- ✅ Speed up development with accurate guidance

---

## 📦 Current Package Versions (from package.json)

### Core Framework
- **React**: 19.0.0 (latest)
- **React Native**: 0.79.5 (very new!)
- **Expo SDK**: ~53.0.23
- **TypeScript**: ~5.8.3
- **Node**: >=18.0.0

### Backend & Data
- **Supabase JS**: ^2.57.4
- **TanStack Query**: ^5.87.4
- **AsyncStorage**: 2.1.2

### Navigation & Routing
- **Expo Router**: ~5.1.7
- **React Native Screens**: ~4.11.1
- **React Native Gesture Handler**: ~2.24.0

### AI & Voice
- **Microsoft Cognitive Services Speech SDK**: ^1.46.0
- **Picovoice Porcupine**: ^3.0.4

### Monitoring & Analytics
- **Sentry Expo**: ~7.0.0
- **PostHog React Native**: ^4.3.2

### UI & Performance
- **Shopify FlashList**: 1.7.6
- **React Native Reanimated**: ~3.17.4
- **React Native SVG**: 15.11.2

---

## 🔗 Critical Documentation Links

### 1. React Native 0.79.x
**Documentation URL**: https://reactnative.dev/docs/0.79/getting-started
**Key Topics to Reference**:
- New Architecture (Fabric + TurboModules) - ENABLED in your app
- Hooks (useState, useEffect, useCallback, useMemo)
- TypeScript with React Native
- Platform-specific code (Platform.OS)
- Performance best practices
- AsyncStorage migration patterns

**Why Critical**: React Native 0.79 has breaking changes and new architecture patterns that differ significantly from 0.6x versions.

---

### 2. Expo SDK 53
**Documentation URL**: https://docs.expo.dev/versions/v53.0.0/
**Key Topics to Reference**:
- Expo Router (file-based routing)
- Expo Modules API
- Config Plugins
- EAS Build & Updates
- Development builds
- SDK API reference for all expo-* packages

**Critical Modules**:
- expo-router: https://docs.expo.dev/router/introduction/
- expo-dev-client: https://docs.expo.dev/develop/development-builds/introduction/
- expo-updates: https://docs.expo.dev/versions/latest/sdk/updates/
- expo-notifications: https://docs.expo.dev/versions/latest/sdk/notifications/
- expo-local-authentication: https://docs.expo.dev/versions/latest/sdk/local-authentication/
- expo-image-picker: https://docs.expo.dev/versions/latest/sdk/imagepicker/

**Why Critical**: Expo 53 introduced new patterns for routing, development builds, and module configuration.

---

### 3. Supabase JS v2
**Documentation URL**: https://supabase.com/docs/reference/javascript/introduction
**Key Topics to Reference**:
- Authentication (signInWithPassword, signUp, signOut)
- Database queries (.select(), .insert(), .update(), .delete())
- Row Level Security (RLS) patterns
- Real-time subscriptions
- Storage API
- Edge Functions
- TypeScript support

**Critical Sections**:
- Auth: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
- Database: https://supabase.com/docs/reference/javascript/select
- Storage: https://supabase.com/docs/reference/javascript/storage-from-upload
- Edge Functions: https://supabase.com/docs/guides/functions

**Why Critical**: Supabase v2 has different API patterns than v1, especially for auth and real-time.

---

### 4. TanStack Query v5
**Documentation URL**: https://tanstack.com/query/v5/docs/framework/react/overview
**Key Topics to Reference**:
- useQuery hook
- useMutation hook
- Query invalidation
- Persistence with AsyncStorage
- Optimistic updates
- Error handling

**Critical Patterns**:
```typescript
// v5 pattern (correct)
import { useQuery } from '@tanstack/react-query'

// NOT v4 pattern
import { useQuery } from 'react-query'
```

**Why Critical**: v5 has breaking changes from v4 (import paths, API signatures).

---

### 5. Expo Router v5
**Documentation URL**: https://docs.expo.dev/router/introduction/
**Key Topics to Reference**:
- File-based routing
- Dynamic routes ([id].tsx)
- Layouts (_layout.tsx)
- Navigation (router.push, router.replace)
- Search params
- Tabs and Stack navigators
- Deep linking

**Critical Patterns**:
```typescript
// Correct v5 pattern
import { useRouter, useLocalSearchParams } from 'expo-router'

// Navigation
router.push('/path')
router.replace('/path')
```

**Why Critical**: Expo Router v5 is file-based and differs significantly from React Navigation.

---

### 6. React 19
**Documentation URL**: https://react.dev/blog/2024/12/05/react-19
**Key Topics to Reference**:
- New hooks (useActionState, useFormStatus, useOptimistic)
- Server Components (not applicable for React Native)
- ref as prop
- React Compiler
- Cleanup functions in useEffect

**Why Critical**: React 19 has new patterns and deprecations that affect hook usage.

---

### 7. TypeScript 5.8
**Documentation URL**: https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html
**Key Topics to Reference**:
- Type inference improvements
- Template literal types
- Narrowing improvements
- tsconfig.json options

**Critical tsconfig for React Native**:
```json
{
  "compilerOptions": {
    "target": "esnext",
    "lib": ["esnext"],
    "jsx": "react-native",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

**Why Critical**: TS 5.8 is latest and has different lib requirements for React Native.

---

### 8. React Native Reanimated v3
**Documentation URL**: https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
**Key Topics to Reference**:
- Worklets
- useSharedValue
- useAnimatedStyle
- withTiming, withSpring, withDecay
- Layout animations

**Why Critical**: Reanimated v3 has breaking changes from v2.

---

### 9. Shopify FlashList
**Documentation URL**: https://shopify.github.io/flash-list/docs/
**Key Topics to Reference**:
- Performance optimization
- estimatedItemSize prop (required!)
- getItemType for heterogeneous lists
- Migration from FlatList

**Critical Pattern**:
```typescript
<FlashList
  data={items}
  renderItem={renderItem}
  estimatedItemSize={100} // REQUIRED!
/>
```

**Why Critical**: FlashList requires estimatedItemSize or performance degrades.

---

### 10. Microsoft Azure Cognitive Services Speech SDK
**Documentation URL**: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
**Key Topics to Reference**:
- SpeechConfig
- SpeechRecognizer (STT)
- SpeechSynthesizer (TTS)
- AudioConfig
- Language codes (en-US, en-ZA, af-ZA, zu-ZA, etc.)

**Why Critical**: Voice features depend on correct SDK usage.

---

### 11. Sentry for React Native
**Documentation URL**: https://docs.sentry.io/platforms/react-native/
**Key Topics to Reference**:
- sentry-expo integration
- Error boundary setup
- Performance monitoring
- Release tracking
- Source maps

**Why Critical**: Monitoring depends on correct Sentry setup.

---

### 12. PostHog React Native
**Documentation URL**: https://posthog.com/docs/libraries/react-native
**Key Topics to Reference**:
- Installation
- Event tracking
- Feature flags
- Session replay (mobile)
- User properties

**Why Critical**: Analytics and feature flags depend on correct PostHog setup.

---

### 13. EAS Build & Update
**Documentation URL**: https://docs.expo.dev/build/introduction/
**Key Topics to Reference**:
- eas.json configuration
- Build profiles (development, preview, production)
- Runtime version policy
- OTA updates
- Build hooks
- Secrets and environment variables

**Why Critical**: CI/CD and deployment depend on correct EAS configuration.

---

## 🚀 How to Add These to WARP Rules

### Option 1: Create Individual Rule Files (Recommended)

Create separate rule files for each technology:

1. **Create rule file**: `docs/governance/rules/react-native-0.79.md`
2. **Format**:
```markdown
# React Native 0.79 Guidance

[Paste key sections from official docs]

## Critical Patterns
- [List patterns specific to 0.79]

## Breaking Changes from 0.6x
- [List breaking changes]
```

3. **Add to WARP**: Reference file path in WARP rules

### Option 2: Add URLs to WARP.md (Quick)

Add a section to your WARP.md:

```markdown
## 📚 Official Documentation References

When implementing features, always reference these official docs:

- React Native 0.79: https://reactnative.dev/docs/0.79/getting-started
- Expo SDK 53: https://docs.expo.dev/versions/v53.0.0/
- Supabase JS v2: https://supabase.com/docs/reference/javascript/introduction
- TanStack Query v5: https://tanstack.com/query/v5/docs/framework/react/overview
- Expo Router v5: https://docs.expo.dev/router/introduction/

[etc.]
```

### Option 3: Use This Document as Rule

Simply add this document as a rule:
```
Rule: Follow documentation sources listed in docs/governance/DOCUMENTATION_SOURCES.md
```

---

## 🔄 Maintenance Schedule

**Quarterly Review** (every 3 months):
- Check for package updates
- Review changelog for breaking changes
- Update documentation links if versions change
- Add new critical packages as they're adopted

**Before Major Version Upgrades**:
- Read full changelog
- Update this document with new patterns
- Add migration guide references
- Test breaking changes in isolated branch

---

## 📋 Quick Reference Checklist

Before implementing a feature, verify you're using:

- [ ] React Native 0.79 patterns (new architecture)
- [ ] Expo SDK 53 APIs (not outdated examples)
- [ ] Supabase v2 syntax (not v1)
- [ ] TanStack Query v5 imports (not react-query)
- [ ] Expo Router v5 navigation (not React Navigation)
- [ ] React 19 hooks (not deprecated patterns)
- [ ] TypeScript 5.8 tsconfig (correct lib settings)
- [ ] FlashList with estimatedItemSize
- [ ] Correct Azure Speech SDK language codes
- [ ] Sentry-expo integration (not standalone Sentry)

---

## 🎯 Priority Documentation for Quick Wins

For Phase 0 (Quick Wins), focus on:

1. **Expo Router v5** - Navigation patterns for skip/demo mode
2. **TanStack Query v5** - Data fetching for AI streaming
3. **Supabase v2** - Auth and database queries
4. **React Native 0.79** - TypeScript and performance patterns
5. **TypeScript 5.8** - Correct tsconfig for DOM globals fix

---

## 📞 Next Steps

1. **Add Comprehensive Audit as Rule**:
   - File: `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`
   - Rule: "Follow the comprehensive audit roadmap for all Phase 0-7 implementations"

2. **Add This Documentation Guide as Rule**:
   - File: `docs/governance/DOCUMENTATION_SOURCES.md`
   - Rule: "Reference official documentation links before implementing features"

3. **Create Package Version Lock Rule**:
   - Rule: "When suggesting code, always verify it's compatible with versions in package.json"

4. **Set Up Documentation Update Trigger**:
   - Trigger: When upgrading major dependencies
   - Action: Update this file + comprehensive audit doc

---

**Maintained by**: Development Team  
**Review Frequency**: Quarterly or before major version upgrades  
**Last Review**: October 19, 2025
