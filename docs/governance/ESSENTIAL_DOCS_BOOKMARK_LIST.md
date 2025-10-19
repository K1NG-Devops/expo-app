# Essential Documentation - Bookmark List
**Quick Reference for Error-Free Development**  
**Last Updated**: 2025-10-17

---

## 🚨 CRITICAL - Must Read Before Phase 3

### Database & Supabase
1. **Supabase Migrations** ⚠️ REQUIRED
   - 🔗 https://supabase.com/docs/guides/cli/local-development#database-migrations
   - Why: Phase 3 requires complex schema changes

2. **Row Level Security (RLS)** ⚠️ REQUIRED
   - 🔗 https://supabase.com/docs/guides/auth/row-level-security
   - Why: Must update RLS policies for organization_id

3. **Supabase Schema Design**
   - 🔗 https://supabase.com/docs/guides/database/tables
   - Why: Creating organizations table, organization_roles

4. **Foreign Key Constraints**
   - 🔗 https://supabase.com/docs/guides/database/tables#foreign-key-constraints
   - Why: Migrating 4,799 preschool_id references

5. **Migration Rollback**
   - 🔗 https://supabase.com/docs/guides/cli/local-development#reset-the-local-database
   - Why: Must have rollback strategy for Phase 3

### TypeScript Patterns
6. **Discriminated Unions** ⚠️ REQUIRED
   - 🔗 https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
   - Why: For OrganizationType implementation

7. **Enums vs Union Types**
   - 🔗 https://www.typescriptlang.org/docs/handbook/enums.html
   - Why: Deciding OrganizationType implementation

8. **Type Guards**
   - 🔗 https://www.typescriptlang.org/docs/handbook/2/narrowing.html
   - Why: Runtime type checking for organization configs

---

## 🔴 HIGH PRIORITY - Core Technologies

### React Native & Expo
9. **React Native 0.79.5**
   - 🔗 https://reactnative.dev/docs/0.79/getting-started
   - Why: Current version compatibility

10. **Expo SDK 53**
    - 🔗 https://docs.expo.dev/versions/v53.0.0/
    - Why: All Expo module APIs reference

11. **Expo Router 5.1**
    - 🔗 https://docs.expo.dev/router/introduction/
    - Why: Navigation system (using file-based routing)

12. **Expo Dev Client**
    - 🔗 https://docs.expo.dev/develop/development-builds/introduction/
    - Why: Using dev client for custom native code

### Supabase Client
13. **Supabase JS Client 2.57.4**
    - 🔗 https://supabase.com/docs/reference/javascript/introduction
    - Why: All database operations

14. **Edge Functions (Deno)**
    - 🔗 https://supabase.com/docs/guides/functions
    - Why: 14 active edge functions in production

### TypeScript & Build
15. **TypeScript 5.8 Handbook**
    - 🔗 https://www.typescriptlang.org/docs/handbook/intro.html
    - Why: Advanced type system features

16. **ESLint 9.35**
    - 🔗 https://eslint.org/docs/latest/
    - Why: Linting rules and configuration

17. **Metro Bundler**
    - 🔗 https://metrobundler.dev/
    - Why: React Native bundler configuration

---

## 🟡 MEDIUM PRIORITY - Phase 5 Dependencies

### Dependency Injection
18. **tsyringe** ⚠️ For Phase 5
    - 🔗 https://github.com/microsoft/tsyringe
    - Why: Likely DI container choice (lightweight, TypeScript-first)

19. **InversifyJS** (alternative)
    - 🔗 http://inversify.io/
    - Why: Alternative DI container (more features, heavier)

20. **TypeScript Decorators**
    - 🔗 https://www.typescriptlang.org/docs/handbook/decorators.html
    - Why: Required for DI decorators (@injectable, @inject)

### Testing
21. **Jest 29.7**
    - 🔗 https://jestjs.io/docs/getting-started
    - Why: Already configured, need to write tests

22. **Jest Mocking Guide**
    - 🔗 https://jestjs.io/docs/mock-functions
    - Why: Mocking services for unit tests

23. **React Native Testing Library**
    - 🔗 https://callstack.github.io/react-native-testing-library/
    - Why: Component testing (should install)

---

## 🟢 AS-NEEDED - Feature-Specific

### AI & Voice
24. **Claude API Reference**
    - 🔗 https://docs.anthropic.com/claude/reference/getting-started-with-the-api
    - Note: Using Claude 3.5 Sonnet (20241022)

25. **Expo Audio 0.4.9**
    - 🔗 https://docs.expo.dev/versions/v53.0.0/sdk/audio/

26. **Microsoft Azure Speech SDK**
    - 🔗 https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
    - Note: TTS proxy edge function uses this

27. **Picovoice Porcupine**
    - 🔗 https://picovoice.ai/docs/porcupine/
    - Note: Wake word detection

### State Management
28. **TanStack Query v5**
    - 🔗 https://tanstack.com/query/v5
    - Note: All data fetching/caching

29. **TanStack Query Persistence**
    - 🔗 https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient

### Internationalization
30. **i18next**
    - 🔗 https://www.i18next.com/

31. **react-i18next**
    - 🔗 https://react.i18next.com/

32. **Expo Localization**
    - 🔗 https://docs.expo.dev/versions/v53.0.0/sdk/localization/

### Monitoring & Analytics
33. **PostHog React Native**
    - 🔗 https://posthog.com/docs/libraries/react-native

34. **Sentry Expo SDK**
    - 🔗 https://docs.sentry.io/platforms/react-native/

### Payments
35. **RevenueCat React Native**
    - 🔗 https://www.revenuecat.com/docs/getting-started/installation/reactnative

36. **RevenueCat Webhooks**
    - 🔗 https://www.revenuecat.com/docs/integrations/webhooks

37. **React Native Google Mobile Ads**
    - 🔗 https://docs.page/invertase/react-native-google-mobile-ads

### Communication
38. **WhatsApp Business Platform**
    - 🔗 https://developers.facebook.com/docs/whatsapp/business-platform

39. **WhatsApp Cloud API**
    - 🔗 https://developers.facebook.com/docs/whatsapp/cloud-api

---

## 📋 Recommended Browser Setup

### Browser Tab Organization

**Tab Group 1: Phase 3 Development**
- Supabase Migrations (link #1)
- Supabase RLS (link #2)
- TypeScript Discriminated Unions (link #6)
- Your local Supabase dashboard

**Tab Group 2: Daily Development**
- Expo SDK 53 Docs (link #10)
- Supabase JS Client (link #13)
- TypeScript Handbook (link #15)
- TanStack Query (link #28)

**Tab Group 3: Phase 5 Preparation**
- tsyringe (link #18)
- Jest (link #21)
- Jest Mocking (link #22)

---

## 🔖 Bookmark Folders Structure

```
📁 EduDash Pro - Dev Docs
├── 📁 1. CRITICAL - Phase 3
│   ├── Supabase Migrations (#1)
│   ├── Supabase RLS (#2)
│   ├── Schema Design (#3)
│   ├── Foreign Keys (#4)
│   ├── Migration Rollback (#5)
│   ├── Discriminated Unions (#6)
│   ├── Enums (#7)
│   └── Type Guards (#8)
│
├── 📁 2. Core Platform
│   ├── React Native 0.79 (#9)
│   ├── Expo SDK 53 (#10)
│   ├── Expo Router (#11)
│   ├── Expo Dev Client (#12)
│   ├── Supabase JS Client (#13)
│   ├── Edge Functions (#14)
│   ├── TypeScript 5.8 (#15)
│   ├── ESLint (#16)
│   └── Metro (#17)
│
├── 📁 3. Phase 5 - DI & Testing
│   ├── tsyringe (#18)
│   ├── InversifyJS (#19)
│   ├── TS Decorators (#20)
│   ├── Jest (#21)
│   ├── Jest Mocking (#22)
│   └── RN Testing Library (#23)
│
├── 📁 4. AI & Voice
│   ├── Claude API (#24)
│   ├── Expo Audio (#25)
│   ├── Azure Speech (#26)
│   └── Picovoice (#27)
│
├── 📁 5. State & i18n
│   ├── TanStack Query (#28)
│   ├── Query Persistence (#29)
│   ├── i18next (#30)
│   ├── react-i18next (#31)
│   └── Expo Localization (#32)
│
├── 📁 6. Monitoring
│   ├── PostHog (#33)
│   └── Sentry (#34)
│
├── 📁 7. Payments
│   ├── RevenueCat SDK (#35)
│   ├── RevenueCat Webhooks (#36)
│   └── Google Mobile Ads (#37)
│
└── 📁 8. Communication
    ├── WhatsApp Platform (#38)
    └── WhatsApp Cloud API (#39)
```

---

## 🎯 Quick Reference by Phase

### Currently Working: Phase 3
**Open these tabs NOW**:
- Links #1, #2, #3, #4, #5, #6, #7, #8
- Your Supabase dashboard
- Your local database URL

### Next Up: Phase 5
**Pre-read these**:
- Links #18, #19, #20, #21, #22

### Daily Development
**Always accessible**:
- Links #10, #13, #15, #28

---

## 📱 Mobile Quick Access

If you use a tablet/phone for docs while coding:

**Phase 3 Mobile Bookmarks**:
1. Supabase RLS patterns
2. TypeScript Discriminated Unions
3. Migration guides

---

## ⚡ Quick Search Queries

When you need to find something fast:

### Supabase
- "supabase rls policy examples"
- "supabase migration rollback"
- "supabase foreign key cascade"

### TypeScript
- "typescript discriminated union pattern"
- "typescript type narrowing"
- "typescript conditional types"

### Testing
- "jest mock singleton"
- "jest dependency injection testing"
- "react native testing library examples"

### Expo
- "expo router dynamic routes"
- "expo dev client configuration"
- "expo eas build troubleshooting"

---

## 📖 Offline Documentation

**Recommended for offline development**:

1. **Download for Offline**:
   - TypeScript Handbook (PDF)
   - React Native docs (via Dash/Zeal)
   - Expo SDK docs (via Dash/Zeal)

2. **Documentation Browsers**:
   - **macOS**: Dash (https://kapeli.com/dash)
   - **Windows/Linux**: Zeal (https://zealdocs.org/)
   - **VSCode**: "DevDocs" extension

---

## 🆘 When You're Stuck

### Problem: Database migration failing
**Check**:
- Link #1 (Migrations guide)
- Link #2 (RLS policies)
- Link #5 (Rollback strategy)

### Problem: TypeScript type errors
**Check**:
- Link #15 (TypeScript Handbook)
- Link #6 (Discriminated Unions)
- Link #8 (Type Guards)

### Problem: Expo build issues
**Check**:
- Link #10 (Expo SDK)
- Link #12 (Dev Client)
- Link #17 (Metro bundler)

### Problem: Test setup
**Check**:
- Link #21 (Jest)
- Link #22 (Mocking)
- Link #23 (RN Testing Library)

---

**Last Updated**: 2025-10-17  
**Maintainer**: Development Team  
**Version**: 1.0

---

## 💡 Pro Tips

1. **Use browser profiles**: Create a dedicated browser profile for EduDash Pro development with all these links pinned.

2. **Documentation versioning**: Always use the exact version docs (e.g., Expo 53, not "latest").

3. **Search within docs**: Use site-specific search: `site:supabase.com migration rollback`

4. **Bookmark API references**: For libraries you use daily, bookmark the API reference section directly.

5. **Check for updates**: Before starting a new phase, verify you're using the correct documentation versions.
