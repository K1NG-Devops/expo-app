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
- **Frontend**: React Native (Expo SDK 53) with Expo Router for navigation
- **Backend**: Supabase (PostgreSQL) with Row-Level Security (RLS)
- **State Management**: TanStack Query with AsyncStorage persistence
- **Authentication**: Supabase Auth with biometric support
- **AI Integration**: Anthropic Claude (server-side only via Edge Functions)
- **Monitoring**: Sentry + PostHog (production only)
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
- **ONLY** `README.md` and `WARP.md` may exist at project root
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

1. **Before Starting**: Review `docs/governance/WARP.md` for comprehensive rules
2. **Feature Development**: Mobile-first design, handle empty states properly
3. **Database Changes**: Use migration workflow, never direct SQL execution
4. **Code Quality**: TypeScript strict mode, ESLint compliance, no console.logs in production
5. **Testing**: Focus on Android devices, use production database for development
6. **Security**: Maintain RLS policies, never expose sensitive keys
7. **Documentation**: Update relevant docs in `docs/` directory

## 📚 Key Documentation

- **Master Rules**: `docs/governance/WARP.md` (highest authority)
- **Security Model**: `docs/security/` directory
- **Architecture Details**: `docs/architecture/` directory  
- **Deployment Procedures**: `docs/deployment/` directory
- **Database Operations**: `docs/database/` directory

For comprehensive guidance on development standards, security requirements, and architectural decisions, always refer to the governance documentation in the `docs/` directory.