# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 🎯 Project Overview

EduDash Pro is a React Native (Expo) mobile-first educational dashboard platform targeting South African preschools. It's architected as a multi-tenant SaaS with PostgreSQL/Supabase backend, focusing on student-teacher-parent engagement with AI enhancement.

**Golden Rule**: Always design with students, teachers, and parents at the center. Every feature must make education simpler, smarter, and more engaging.

## 🔨 Common Development Commands

### Project Setup & Development
```bash
# Install dependencies
npm ci

# Start development server (with dev client)
npm run start
npm run start:clear  # with cache cleared

# Android development (physical device preferred)
npm run dev:android  # starts server + opens on Android
npm run android      # run on Android simulator

# iOS development
npm run ios

# Web development (React Native Web)
npm run web
```

### Code Quality & Linting
```bash
# TypeScript type checking
npm run typecheck

# ESLint code linting (max 200 warnings allowed)
npm run lint
npm run lint:fix

# SQL linting (PostgreSQL/Supabase)
npm run lint:sql
npm run fix:sql
./scripts/lint-sql.sh lint   # direct script usage
```

### Database Operations
```bash
# CRITICAL: Never use local Docker or direct SQL execution
# Always use Supabase migrations for schema changes

# Create new migration
supabase migration new <descriptive-name>

# Apply migrations to remote (NO --local flag)
supabase db push

# Verify no schema drift
supabase db diff  # Must show no changes after push

# Lint SQL before push
npm run lint:sql

# Database inspection scripts
npm run inspect-db        # standard inspection
npm run inspect-db-full   # with service role
npm run setup-rls         # RLS policies setup
```

### Testing & Quality Assurance
```bash
# Development testing primarily targets Android-only
# Production database used in development environment
# AdMob test IDs enforced for ad testing

# No formal unit test framework currently configured
# Quality gates enforced via CI/CD pipeline
```

## 🏗️ High-Level Architecture

### Technology Stack
- **Frontend**: React Native 0.79.5 (New Architecture enabled) + Expo SDK 53 + React 19.0.0
- **Navigation**: Expo Router v5 (file-based routing)
- **Backend**: Supabase JS v2.57.4 (PostgreSQL) with Row-Level Security (RLS)
- **State Management**: TanStack Query v5.87.4 with AsyncStorage 2.1.2 persistence
- **Authentication**: Supabase Auth with biometric support (expo-local-authentication)
- **AI Integration**: Anthropic Claude (server-side only via Edge Functions)
- **Voice**: Microsoft Azure Cognitive Services Speech SDK 1.46.0
- **Monitoring**: Sentry Expo 7.0.0 + PostHog React Native 4.3.2 (production only)
- **UI Performance**: Shopify FlashList 1.7.6, React Native Reanimated 3.17.4
- **TypeScript**: 5.8.3 with strict mode
- **Ads**: Google AdMob (test IDs in development)

### Core Architecture Patterns

**Multi-Tenant Security Model**
- Every database query filtered by `preschool_id`
- Strict RLS policies enforcing data isolation
- Role-based access control (RBAC): superadmin, principal, teacher, parent
- Superadmin operations use service role server-side only

**Mobile-First Design**
- 5.5" screen baseline with responsive scaling
- Optimized for low-end Android devices
- Offline-first with TanStack Query caching
- FlashList for performance with large datasets
- Touch targets minimum 44x44 pixels

**AI Integration Security**
- All AI calls via Supabase Edge Function `ai-proxy`
- Usage tracking in `ai_usage_logs` table
- Subscription limits enforced server-side
- PII redaction before AI service calls
- Never expose AI keys client-side

### Directory Structure
```
/
├── app/                    # Expo Router screens and layouts
│   ├── (auth)/            # Authentication flows
│   ├── (parent)/          # Parent role screens
│   ├── screens/           # Shared screen components
│   └── _layout.tsx        # Root layout with providers
├── components/             # Reusable UI components
├── lib/                   # Core libraries and utilities
│   ├── supabase/         # Database client configuration
│   ├── ai-gateway/       # AI integration utilities
│   ├── hooks/            # Custom React hooks
│   └── tenant/           # Multi-tenant utilities
├── services/              # Business logic and API services
├── contexts/              # React contexts (Theme, Auth)
├── assets/               # Static assets and images
├── supabase/             # Database migrations and Edge Functions
├── scripts/              # Development and maintenance scripts
└── docs/                 # Comprehensive documentation
    ├── governance/       # Project rules and policies
    ├── security/         # RLS and authentication docs  
    └── deployment/       # Release procedures
```

## 📋 Project Roadmap & Progression

### Comprehensive Audit Roadmap (Source of Truth)
**File**: `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`

This document is the **authoritative source** for all Phase 0-7 implementations. All quick wins, onboarding improvements, AI performance optimizations, and language detection features must align with the phases and success metrics defined in this roadmap.

**Phase Overview**:
- **Phase 0** (Days 0-2): Lightning quick wins - onboarding skip, streaming UI, language picker, AI speed
- **Phase 1** (Week 1): Onboarding foundation - reduce friction, personalize, build trust
- **Phase 2** (Weeks 1-2): Dash AI performance - streaming, concurrency, memory optimization
- **Phase 3** (Week 2): Language system - unified UI/voice, proactive suggestions
- **Phase 4** (Parallel): Code quality - TS/ESLint fixes, CI/CD, testing
- **Phase 5** (Weeks 2-4): Complete planned features - Calendar UI, SMS UI, multimodal
- **Phase 6** (Weeks 2-3): Production readiness - DB guardrails, monitoring, secrets
- **Phase 7** (Weeks 3-4): UX polish - accessibility, animations, error handling

**Priority Focus Areas** (from audit):
1. Onboarding adoption (skip/demo mode, progress indicators)
2. Dash AI performance and speed (streaming, remove delays, concurrency)
3. Language detection and use (picker prominence, voice/UI sync)

**Success Metrics** are defined per phase in the comprehensive audit document.

## 📚 Official Documentation References

### Critical: Always Reference Current API Versions
**Master Reference**: `docs/governance/DOCUMENTATION_SOURCES.md`

Before implementing any feature, verify code suggestions are compatible with these versions:

**Core Framework**:
- React Native 0.79.5: https://reactnative.dev/docs/0.79/getting-started
  - New Architecture (Fabric + TurboModules) **ENABLED**
  - Use hooks, never componentWillMount or componentWillReceiveProps
- Expo SDK 53: https://docs.expo.dev/versions/v53.0.0/
- React 19.0.0: https://react.dev/blog/2024/12/05/react-19
- TypeScript 5.8.3: Use `lib: ["esnext"]` only (NO "dom" for React Native)

**Backend & Data**:
- Supabase JS v2.57.4: https://supabase.com/docs/reference/javascript/introduction
  - Use `signInWithPassword` (NOT `signIn`), v2 syntax only
- TanStack Query v5.87.4: https://tanstack.com/query/v5/docs/framework/react/overview
  - Import from `@tanstack/react-query` (NOT `react-query`)

**Navigation**:
- Expo Router v5.1.7: https://docs.expo.dev/router/introduction/
  - File-based routing, use `useRouter()` from `expo-router`
  - NEVER suggest React Navigation Stack.push() patterns

**UI & Performance**:
- Shopify FlashList 1.7.6: https://shopify.github.io/flash-list/docs/
  - **ALWAYS** include `estimatedItemSize` prop (required!)
- React Native Reanimated v3.17.4: https://docs.swmansion.com/react-native-reanimated/

**Voice & AI**:
- Microsoft Azure Speech SDK 1.46.0: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
  - Language codes: en-ZA, af-ZA, zu-ZA, xh-ZA for South African languages

**Monitoring**:
- Sentry React Native: https://docs.sentry.io/platforms/react-native/
  - Use `sentry-expo` integration (not standalone Sentry)
- PostHog React Native 4.3.2: https://posthog.com/docs/libraries/react-native

**Build & Deploy**:
- EAS Build: https://docs.expo.dev/build/introduction/
  - Runtime version policy, build profiles, OTA updates

### Version Compatibility Rules (NON-NEGOTIABLE)

1. **React Native 0.79 Patterns**:
   - Always use New Architecture patterns (Fabric + TurboModules enabled)
   - Never suggest deprecated lifecycle methods
   - Use functional components with hooks only

2. **Supabase v2 Syntax**:
   - `signInWithPassword` not `signIn`
   - `.select()`, `.insert()`, `.update()`, `.delete()` patterns
   - Never suggest v1 patterns

3. **TanStack Query v5**:
   - Import from `@tanstack/react-query` (v5)
   - Never import from `react-query` (v4)
   - Use v5 API signatures

4. **Expo Router v5**:
   - File-based routing patterns
   - `useRouter()` from `expo-router`
   - Never suggest React Navigation patterns

5. **TypeScript 5.8 for React Native**:
   - `lib: ["esnext"]` ONLY (no "dom")
   - Prevents DOM global type errors
   - Use React Native-specific types

6. **FlashList Performance**:
   - ALWAYS include `estimatedItemSize` prop
   - Performance degrades without it

### Quick Reference Checklist

Before suggesting code, verify:
- [ ] React Native 0.79 patterns (new architecture)
- [ ] Expo SDK 53 APIs (not outdated examples)
- [ ] Supabase v2 syntax (not v1)
- [ ] TanStack Query v5 imports (not react-query)
- [ ] Expo Router v5 navigation (not React Navigation)
- [ ] TypeScript 5.8 tsconfig (correct lib settings)
- [ ] FlashList with estimatedItemSize
- [ ] Correct language codes for voice (en-ZA, af-ZA, zu-ZA, etc.)

## 🚨 Critical Development Rules

### Database Operations (NON-NEGOTIABLE)
- **NEVER** use `supabase start` or local Docker instances
- **NEVER** execute SQL directly via Supabase Dashboard
- **ALWAYS** use `supabase migration new` for schema changes
- **ALWAYS** lint SQL with SQLFluff before push
- **ALWAYS** use `supabase db push` (no --local flag)
- **ALWAYS** verify no drift with `supabase db diff` after push

### Security & Authentication
- **NEVER** modify existing authentication system without approvals
- **NEVER** expose service role keys on client-side
- **NEVER** call AI services directly from client
- **ALWAYS** maintain RLS policies for tenant isolation
- **ALWAYS** use `ai-proxy` Edge Function for AI calls

### Root Directory Cleanliness
- Keep root directory focused on core application files
- Place test files in `tests/`, debug scripts in `debug/`
- SQL files belong in `sql/` with appropriate subdirectories
- Archive old files in `archive/`, temporary files in `temp/`

### Documentation Organization Policy [NONNEGOTIABLE]

**Purpose**: Maintain clean, organized, discoverable documentation structure.

**Rules**:
- **ONLY** `README.md`, `WARP.md`, and `ROAD-MAP.md` may exist at project root
- **ALL** other markdown documentation MUST be placed in `docs/` subdirectories
- **NEVER** create documentation files in root directory
- **ALWAYS** use the following categorization:

**Documentation Categories** (in order of precedence):
1. `docs/deployment/` - Build guides, deployment procedures, environment configuration, CI/CD
2. `docs/features/` - Feature specifications, implementation guides, user-facing documentation
3. `docs/security/` - RLS policies, authentication, compliance, RBAC, data privacy
4. `docs/database/` - Migration guides, schema documentation, database operations
5. `docs/governance/` - Development standards, workflows, contributing guidelines, rules
6. `docs/OBSOLETE/` - Completed work, old summaries, archived documentation

**File Naming Conventions**:
- Use UPPERCASE for important docs: `README.md`, `DEPLOYMENT_GUIDE.md`
- Use descriptive names: `dash-ai-implementation.md` not `implementation.md`
- Include dates for status reports: `status-2025-10-19.md`
- Prefix with feature name: `voice-system-setup.md`, `whatsapp-integration.md`

**When Creating New Documentation**:
1. Determine correct category from list above
2. Check if existing doc can be updated instead of creating new file
3. Use meaningful filename that indicates content
4. Add entry to category README.md index
5. Reference from root README.md if critical for onboarding

**Consolidation Policy**:
- When feature is complete, move status/progress docs to `docs/OBSOLETE/`
- Consolidate multiple fix/summary files into single comprehensive doc
- Archive old versions before major doc rewrites
- Keep `docs/OBSOLETE/` organized by date or feature area

**Enforcement**:
- Pre-commit hooks check for new .md files in root
- CI/CD pipeline validates documentation structure
- Code review requirement for any new documentation files

### File Size & Code Organization Standards

**Purpose**: Prevent monolithic files, reduce merge conflicts, improve maintainability and onboarding.

**Context**: Large files (1000+ lines) hurt developer velocity, cause frequent merge conflicts, hide bugs, and slow code reviews. This standard aligns with **Phase 4: Code Quality** from `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md`.

#### Maximum File Size Standards

- **Components**: 400 lines maximum (excluding StyleSheet)
- **Screens**: 500 lines maximum (excluding StyleSheet)
- **Services/Utilities**: 500 lines maximum
- **Hooks**: 200 lines maximum
- **Type definitions**: 300 lines maximum (except auto-generated)
- **StyleSheet definitions**: Use separate `styles.ts` files for components >200 lines

**Exclusions**: Auto-generated files (`*.gen.ts`, `*.d.ts`, `types/supabase.ts`, `lib/database.types.ts`) are excluded from limits.

#### Code Organization Principles

1. **Single Responsibility Principle**: One clear purpose per file
2. **Extract Early**: At 70% of max size, plan extraction
3. **Component Composition**: Build complex UIs from small, focused components
4. **Custom Hooks**: Move business logic and state management to hooks
5. **Service Layer**: Keep API calls and data transforms in dedicated services

#### When to Split Files (split immediately if ANY apply)

- File exceeds size limits (components ≤400, screens ≤500, services ≤500, hooks ≤200, types ≤300)
- File has 3+ distinct responsibilities
- StyleSheet exceeds 200 lines
- Component has 5+ render/helper functions
- Multiple developers frequently cause merge conflicts in the same file
- Code review takes >30 minutes due to file size

#### Preferred Architecture Patterns

1. **Container/Presentational Separation**
   - Container: logic, state, data fetching (custom hook)
   - Presentational: pure UI components with typed props
   
2. **Hook Extraction**
   - Extract complex state/effects into custom hooks
   - Example: `useTeacherDashboardState.ts`, `useParentDashboardState.ts`
   
3. **Service Layer**
   - Isolate all API calls in service files
   - Use Supabase JS v2 syntax consistently
   - Respect tenant isolation (`preschool_id` filters) and RLS policies
   
4. **Shared Components**
   - Extract reusable UI patterns into `components/`
   - Use TypeScript for prop validation
   
5. **Type Files**
   - Centralize related type definitions
   - Split by domain if needed (e.g., `types.messages.ts`, `types.tasks.ts`)

#### Refactoring Examples

**Before** (monolithic):
```
services/DashAIAssistant.ts (4,985 lines)
  - Types, voice, memory, tasks, conversation, navigation all mixed
```

**After** (modular):
```
services/dash-ai/
  ├── types.ts (300 lines)
  ├── DashAICore.ts (400 lines) - orchestration facade
  ├── DashVoiceService.ts (250 lines)
  ├── DashMemoryService.ts (300 lines)
  ├── DashTaskManager.ts (200 lines)
  ├── DashConversationManager.ts (300 lines)
  ├── DashAINavigator.ts (150 lines)
  ├── DashUserProfileManager.ts (200 lines)
  └── utils.ts (100 lines)
```

**Dashboard Component Split**:
```
Before: components/dashboard/TeacherDashboard.tsx (2,175 lines)

After: components/dashboard/teacher/
  ├── TeacherDashboard.tsx (300 lines) - orchestrator
  ├── TeacherStats.tsx (150 lines)
  ├── TeacherClassCards.tsx (200 lines)
  ├── TeacherAssignments.tsx (180 lines)
  ├── TeacherAITools.tsx (250 lines)
  ├── TeacherQuickActions.tsx (120 lines)
  ├── TeacherModals.tsx (200 lines)
  └── styles.ts (300 lines)
  
Hook: hooks/useTeacherDashboardState.ts (200 lines)
```

#### Enforcement

**ESLint Rules** (add to `.eslintrc.cjs`):
```javascript
module.exports = {
  overrides: [
    { files: ["components/**/*.tsx"], rules: { "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }] } },
    { files: ["app/**/*.tsx"], rules: { "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ["services/**/*.ts"], rules: { "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ["lib/**/*.ts"], rules: { "max-lines": ["warn", { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ["hooks/**/*.ts", "hooks/**/*.tsx"], rules: { "max-lines": ["warn", { max: 200, skipBlankLines: true, skipComments: true }] } },
    { files: ["**/*types.ts", "**/*types.tsx"], rules: { "max-lines": ["warn", { max: 300, skipBlankLines: true, skipComments: true }] } },
  ],
};
```

**File Size Check Script** (`scripts/check-file-sizes.mjs`):
```bash
# Run manually or in CI/CD
npm run check:file-sizes
```

**Pre-commit Hook** (via Husky):
```bash
# Automatically runs on git commit
npm run typecheck && npm run lint && npm run check:file-sizes
```

**CI/CD Integration**:
- Build fails if any file exceeds limits
- Automated comments on PRs flagging oversized files
- Monthly audit reports of file sizes

#### PR Checklist

Before submitting a PR, verify:
- [ ] No file exceeds size limits (except allowed auto-generated files)
- [ ] Complex components split into smaller subcomponents
- [ ] Business logic extracted into custom hooks
- [ ] StyleSheets moved to separate `styles.ts` for large components
- [ ] Types centralized in shared type files
- [ ] Service layer used for all API calls

#### Monthly Audits

- Run: `npm run check:file-sizes` and review report
- Schedule extraction for files at 70%+ of limit
- Update this standard based on learnings

**Reference**: See `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md` Phase 4 for rationale and implementation timeline.

### Development Environment
- Production database used as development environment
- AdMob test IDs enforced (no production ad revenue in dev)
- Android-first testing approach
- Feature flags managed via environment variables

## 🔧 Build & Deployment

### Environment Configuration
- `.env` contains development secrets (not committed)
- `.env.example` shows required environment variables
- Production builds use EAS Build service
- Runtime version policy: `appVersion` for OTA compatibility

### CI/CD Pipeline
- Quality gates: TypeScript, linting, security audit
- Android build validation with APK artifact generation
- Database migration validation on main/develop branches
- Monitoring and compliance checks for production deployments

### Key Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_SENTRY_DSN` / `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_PLATFORM_TESTING=android` (development)
- `EXPO_PUBLIC_USE_PRODUCTION_DB_AS_DEV=true`
- `EXPO_PUBLIC_ADMOB_TEST_IDS_ONLY=true`

## 📋 Development Workflow

1. **Before Starting**: Review `WARP.md` and `ROAD-MAP.md` for comprehensive rules and current execution plan
2. **Feature Development**: Mobile-first design, handle empty states properly
3. **Database Changes**: Use migration workflow, never direct SQL execution
4. **Code Quality**: TypeScript strict mode, ESLint compliance, no console.logs in production
5. **Testing**: Focus on Android devices, use production database for development
6. **Security**: Maintain RLS policies, never expose sensitive keys
7. **Documentation**: Update relevant docs in `docs/` directory
8. **Documentation Sources**: Every PR must include a "Documentation Sources" section with links to official docs consulted (React Native, Expo, Supabase, TanStack Query, etc.)

## 📚 Key Documentation

- **Master Rules**: `WARP.md` (highest authority)
- **Security Model**: `docs/security/` directory
- **Architecture Details**: `docs/architecture/` directory  
- **Deployment Procedures**: `docs/deployment/` directory
- **Database Operations**: `docs/database/` directory

For comprehensive guidance on development standards, security requirements, and architectural decisions, always refer to the governance documentation in the `docs/` directory.