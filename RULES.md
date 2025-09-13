# Project Rules and Guidelines

## Quality Assurance Process
**CRITICAL**: Before confirming any section or task as complete, always:
1. Run linting/type checking: `npm run lint` or `npx tsc --noEmit`
2. Attempt to build the project: `npx expo start` or equivalent
3. Resolve any compilation errors, missing dependencies, or type issues
4. Only mark tasks complete after successful build verification

This prevents shipping broken code and ensures all dependencies are properly installed.

Authoritative, repeatable rules to prevent regressions in dev and CI. Keep this file up to date as we learn.

## Environment and startup
- Use `.env.local` for local development configuration. Required keys:
  - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
  - Optional monitoring: `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`
  - Ads toggle: `EXPO_PUBLIC_ENABLE_ADS=1|0`
  - Header debug tools: `EXPO_PUBLIC_DEBUG_TOOLS=0|1`
- Start Metro before opening the Dev Client. Prefer:
  - `npm run start` (or `start:clear`), then `npm run open:android`, or
  - `npm run dev:android` (spawns server then opens client).
- Ensure ADB reverse is set for ports 8081 (Metro) and 8083 (Dev server): `adb reverse tcp:8081 tcp:8081 && adb reverse tcp:8083 tcp:8083`.

## Supabase auth
- Additional Redirect URLs in Supabase MUST include: `exp+exp-final://auth-callback`.
- Always pass `emailRedirectTo = Linking.createURL('/auth-callback')` with `signInWithOtp` so magic links return to the app.
- Email templates must include the 6‑digit token: `{{ .Token }}`.
- Route after login via the gate: `profiles-gate` calls `routeAfterLogin()` to select dashboard by role (user_metadata.role or profiles.role) and optional `preschool_id`.
- Persist sessions with `expo-secure-store`. After adding new native modules, rebuild the dev client.

## Monitoring
- Sentry and PostHog are opt‑in via env keys. Do not hardcode keys.
- Use `EXPO_PUBLIC_DEBUG_TOOLS=1` only in dev to expose test buttons that send telemetry events.

## UI/UX guards
- Every form MUST use the keyboard‑aware wrapper `KeyboardScreen` to avoid hidden inputs on focus.
- Dev headers are themed dark for consistency; production headers can be hidden or customized.

## Ads (development only)
- Use `react-native-google-mobile-ads` with Google TEST IDs in dev. We must not ship test IDs in production.
- Android Manifest MUST define: `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="ca-app-pub-3940256099942544~3347511713" tools:replace="android:value"/>` to avoid manifest merge conflicts.
- Only render ads when `EXPO_PUBLIC_ENABLE_ADS=1`. Default should be safe in dev.

## Package/version hygiene
- Never pin to non‑existent package versions. Before adding a library, check the registry:
  - `npm view <package> version` or `npm view <package> versions --json`
- `expo-ads-admob` is deprecated for current SDKs — use `react-native-google-mobile-ads` instead.
- If install errors occur, prefer a clean install: remove `node_modules` and `package-lock.json`, run `npm cache verify`, then `npm install --legacy-peer-deps`.

## Android build guards
- If you see manifest merge failures for Google Mobile Ads APPLICATION_ID, add `tools:replace="android:value"` to the `<meta-data>` entry and include the `xmlns:tools` namespace on the `<manifest>` tag.
- After adding any new native modules (SecureStore, Sentry, PostHog, Google Mobile Ads), run `npx expo run:android` to rebuild the dev client.
- **CRITICAL**: Always rebuild the APK when adding new modules or making significant changes to avoid module resolution errors. Use `npx expo run:android --clear` for a clean rebuild.
- **MODULE SAFETY RULE**: Before testing new features, especially after adding dependencies, run a fresh APK build to prevent runtime module errors and ensure proper native module linking.
- **CODE QUALITY GATE**: Always run `npm run typecheck` and lint checks after every major file/code change and before building. No builds without clean type checking.

## Known device/system log noise
- System logs like `E/UxUtility: notifyAppState error = NULL` and `E/libPowerHal: ...` are device/SoC power subsystem messages and not app failures. Ignore unless accompanied by app stack traces.
- `DevLauncherErrorActivity` indicates the app couldn’t reach Metro. Fix by ensuring the dev server is running and ADB reverse is set; use `npm run dev:android`.

## Release safety
- Do not enable production ads or analytics without explicit env keys and review.
- Ensure we never commit secrets (env files are git‑ignored by default).


# rules.md - EduDash Pro Development Principles

## 🚨 RULES-FIRST PRECEDENCE
**WARP.md > rules.md > .cursorrules > code**  
This file defines development principles. Conflicts resolve upward in the chain.  
Golden Rule and Non-negotiables from WARP.md apply to all changes.  
Tags: [NONNEGOTIABLE], [PROTECTED], [AI-GUIDE], [CHECKLIST]

---

## ✨ GOLDEN RULE [NONNEGOTIABLE]
> **Always design EduDash Pro with students, teachers, and parents at the center of every decision.**  
> **Every feature must make education simpler, smarter, and more engaging.**  
> **Optimize for their learning outcomes, clarity, and safety.**

## 🎯 EduDash Pro Development Principles

Our mission is to build a leading educational platform that competes with Google Classroom, Microsoft Teams for Education, Canvas, and ClassDojo. These principles guide every decision:

### 1. User Experience (UX) First [PROTECTED]

**Principle**: Keep the interface clean, simple, and intuitive for all users.

**Acceptance Criteria**:
- ✅ Mobile-first by default - design and validate on small screens first
- ✅ WCAG 2.1 AA accessibility - no keyboard or screen reader blockers
- ✅ Latency targets: p95 interaction under 400ms on mid-tier Android
- ✅ Core flows completable with one hand on mobile devices
- ✅ Touch targets minimum 44x44 pixels
- ✅ Friendly onboarding with tooltips and guided walkthroughs
- ✅ Progressive disclosure for complex features
- ✅ Consistent navigation patterns across all screens

### 2. Core Features [PROTECTED]

**Principle**: Focus on essential educational tools that drive learning outcomes.

**Acceptance Criteria**:
- ✅ Dashboard Overview - assignments, announcements, attendance, grades visible at a glance
- ✅ Role-Based Access - Admin, Teacher, Student, Parent with appropriate permissions
- ✅ Communication Tools - secure messaging, notifications, announcements
- ✅ Assignment Management - create, submit, grade, feedback with version control
- ✅ Analytics & Progress - real-time tracking with actionable insights
- ✅ No regressions to core flows - feature-flagged enhancements only
- ✅ Offline support for critical features

### 3. Scalability & Performance [PROTECTED]

**Principle**: Build for growth from day one - support millions of users.

**Acceptance Criteria**:
- ✅ Horizontal scalability - stateless services, database sharding ready
- ✅ Idempotent, retry-safe services with exponential backoff
- ✅ Backpressure and rate limiting in place (100 req/min default)
- ✅ Long-running tasks moved to queues (>5 seconds)
- ✅ Caching strategy implemented (Redis/CDN)
- ✅ Database queries optimized (<100ms p95)
- ✅ API response times <200ms p95
- ✅ Bundle size <500KB initial load

### 4. Security & Privacy [NONNEGOTIABLE]

**Principle**: Protect user data, especially minors, with enterprise-grade security.

**Acceptance Criteria**:
- ✅ End-to-end encryption for sensitive data
- ✅ POPIA, GDPR, COPPA compliance verified
- ✅ Role-based authentication with MFA support
- ✅ Regular vulnerability testing (monthly scans)
- ✅ OWASP Top 10 controls implemented
- ✅ Secrets managed via vault (never in code)
- ✅ Least privilege enforced across all services
- ✅ Audit logs for all data access

### 5. Gamification & Engagement [AI-GUIDE]

**Principle**: Make learning fun and rewarding while maintaining educational integrity.

**Acceptance Criteria**:
- ✅ Reward system - badges, XP, progress levels implemented
- ✅ Interactive charts for performance visualization
- ✅ Motivational messages and encouraging reminders
- ✅ Customizable avatars and themes
- ✅ Feature-flagged for classroom appropriateness
- ✅ No dark patterns - ethical design only
- ✅ Parent controls for gamification features
- ✅ Learning outcomes tracked, not just engagement

### 6. Integration & Compatibility [PROTECTED]

**Principle**: Play well with existing educational ecosystems.

**Acceptance Criteria**:
- ✅ Google Drive, Microsoft 365, Dropbox integration
- ✅ API-first approach with OpenAPI documentation
- ✅ Import/export in standard formats (CSV, XLSX, PDF)
- ✅ Calendar sync (Google, iCal, Outlook)
- ✅ LTI compliance for Learning Tools Interoperability
- ✅ SSO support (SAML, OAuth2)
- ✅ Grade passback to SIS systems
- ✅ Data mapping preserves integrity

### 7. Localization & Language Support [AI-GUIDE]

**Principle**: Make EduDash Pro accessible to South Africa's diverse population.

**Acceptance Criteria**:
- ✅ Support for English, Afrikaans, isiZulu (minimum)
- ✅ 100% string externalization - no hardcoded text
- ✅ RTL support for future Arabic implementation
- ✅ Context-aware translations (education-specific)
- ✅ Locale-aware formatting (dates, numbers, currency)
- ✅ School-customizable translations
- ✅ i18n framework with fallback support
- ✅ Cultural sensitivity in content and imagery

### 8. Continuous Improvement [AI-GUIDE]

**Principle**: Ship small, measure everything, iterate based on data.

**Acceptance Criteria**:
- ✅ Feature flags for gradual rollout
- ✅ A/B testing with ethical guardrails
- ✅ User feedback collection in-app
- ✅ Performance and crash analytics (Sentry)
- ✅ Clear versioning and changelog
- ✅ Error budgets defined (99.9% uptime)
- ✅ SLOs tracked and visible
- ✅ Weekly deployment capability

### 9. Monetization Strategy [PROTECTED]

**Principle**: Sustainable revenue without compromising education quality.

**Acceptance Criteria**:
- ✅ Free tier with core features (no learning blockers)
- ✅ Premium tiers: Basic, Professional, Enterprise
- ✅ Institution licensing model implemented
- ✅ Entitlement checks at server and client
- ✅ No leakage of premium features
- ✅ Clear, non-intrusive upgrade prompts
- ✅ Transparent pricing displayed
- ✅ Educational discounts available

### 10. Brand & Differentiation [AI-GUIDE]

**Principle**: Position EduDash Pro as professional yet approachable for education.

**Acceptance Criteria**:
- ✅ Consistent design system and tokens used
- ✅ Warm, educational color palette applied
- ✅ Professional yet playful iconography
- ✅ Tone of voice guide followed
- ✅ Unique value proposition clear
- ✅ Visual regression tests passing
- ✅ Brand guidelines documented
- ✅ Marketing materials aligned

---

## Critical Production Constraints [NONNEGOTIABLE]
(Maintained from existing rules)

- No database resets. All schema changes via migrations only
- No mock data in DB or code. Always handle empty/loading/error states
- Do not modify working auth configuration (contexts/SimpleWorkingAuth.tsx)
- RLS must remain secure and enforced for all tenant data access
- **DATABASE SCHEMA FLEXIBILITY**: If code references a table or column that doesn't exist in the database, the missing table/column should be created via migration or manual SQL - the application code should NOT be changed to accommodate missing database schema. This ensures forward compatibility and allows the app to work with evolving database structures.

AI and secrets hardening
- Do not call Anthropic from the client. All AI requests must go through Supabase Edge Function: functions/v1/ai-proxy
- Never bundle AI keys. Use server-side env (SERVER_ANTHROPIC_API_KEY) in edge functions only
- All AI usage must be logged server-side to ai_usage_logs with: user_id, feature, created_at, tokens_used, cost_usd (if known)
- Client-side AsyncStorage usage tracking is allowed for UX only, not billing or limits
- Enforce subscription-tier usage limits in the ai-proxy function before invoking AI
- AI prompts must be child-safe, age-appropriate, and South Africa–contextual
- Strictly redact PII before sending to AI; never include auth tokens or secrets in prompts

Server-state and offline policy
- All server state fetching must use TanStack Query. Do not fetch directly in components with useEffect
- Provide tenant-aware query keys: include preschool_id and user role in the key
- Enable offline persistence with AsyncStorage and backoff retries
- Mutations must use optimistic updates where safe, and gracefully reconcile on failure

Observability and privacy
- Sentry and PostHog are required in production builds, disabled by default in development
- Do not send PII to analytics. Identify users via hashed IDs only (e.g., sha256 of auth_user_id)
- Tag all events with: role, preschool_id (hashed), app version, platform, network status
- All critical admin and superadmin actions must write to audit_logs with timestamp and actor

RLS and data access
- Every query that reads tenant data must scope by preschool_id; prefer RPCs or views that enforce RLS
- Super-admin operations must run through server functions with service role; never bypass RLS in the client
- The client must not include service role keys. Dev-only admin client must be disabled in production

Internationalization
- All new UI strings must be externalized and routed through i18n. Default English with Afrikaans and isiZulu stubs
- AI-generated parent output should support the requested language when available

Performance and mobile-first
- Use FlashList for any list that can exceed 20 items and provide estimatedItemSize
- Prefer expo-image with caching for remote images; never render unbounded images
- Code-split heavy screens (e.g., super-admin) with lazy routing
- Keep production console output minimal and avoid noisy logging

Advertising and safety
- Ads must never render during learning interactions or on children’s content screens
- Ads are allowed for freemium only and must be educational, age-appropriate, and non-intrusive
- Ad placement must be gated behind EXPO_PUBLIC_ENABLE_ADS and use test IDs in non-production

Testing and environments
- All new features must ship with unit tests. Critical flows must have at least one e2e test
- Tests must use a local/test Supabase instance. Never run destructive tests against production
- Protect internal scripts with environment checks to prevent accidental prod operations

Notifications
- Push notifications must be opt-in, localized, and respect quiet hours where applicable
- No promotional notifications to child accounts; promotions target parents/guardians only

Security hygiene
- Never log secrets or tokens. Never output secrets to console or errors
- Use HTTPS for all network requests. Validate inputs and sanitize outputs in edge functions
- On sign-out, ensure all tokens are cleared across SecureStore and AsyncStorage (already implemented)

Implementation checklists
- AI proxy function
  - Validate user via supabase.auth.getUser() using request Authorization header
  - Load user profile and subscription tier via service role client
  - Enforce monthly usage limits based on ai_usage_logs
  - Invoke Anthropic with server-side API key
  - Insert ai_usage_logs with tokens and optional cost
  - Return minimal content payload to client
- React Query
  - Add QueryClient with sensible defaults (staleTime, retry/backoff)
  - Add persisted cache via AsyncStorage persister
  - Provide a tenant-aware QueryProvider and wrap root layout
- Monitoring
  - Initialize Sentry and PostHog on app bootstrap, gated by EXPO_PUBLIC_ENABLE_* envs
  - Scrub PII and avoid storing sensitive payloads in breadcrumbs/events

How to propose changes
- Reference this rules.md in PR descriptions when adding AI endpoints, new data fetches, or analytics
- Include a brief “Rules compliance” section in PRs covering AI, RLS, state management, and observability

---

## Parent Linking & RLS Flow [NONNEGOTIABLE]

Goal: Allow parents/guardians to link children securely, with staff approval where needed, under strict RLS.

Schema (to be introduced via Task 4 migrations):
- student_parent_links
  - id uuid pk default gen_random_uuid()
  - student_id uuid not null
  - parent_user_id uuid not null
  - relationship_type text check (relationship_type in ('parent','guardian')) not null
  - status text check (status in ('pending','approved','denied','revoked')) not null default 'pending'
  - requested_at timestamptz not null default now()
  - approved_at timestamptz
  - approved_by uuid
  - reason text

- invite_codes
  - id uuid pk default gen_random_uuid()
  - code text unique not null
  - student_id uuid not null
  - expires_at timestamptz not null
  - created_by uuid not null
  - used_by uuid
  - used_at timestamptz

- profile_completion
  - user_id uuid primary key
  - fields_completed jsonb not null default '{}'::jsonb
  - percent int not null default 0
  - updated_at timestamptz not null default now()

RLS policies (principles):
- Enable RLS on all three tables.
- Parents can SELECT their own links only: parent_user_id = auth.uid().
- Parents can INSERT pending link requests for themselves only (parent_user_id = auth.uid()).
- Parents cannot UPDATE status fields directly; approvals/denials only through RPC with SECURITY DEFINER.
- Invite codes are redeemed via RPC only; no direct INSERT/UPDATE/DELETE for public.
- Staff approvals occur via RPC that validates staff capability (principal/teacher) for the student’s school.

RPC endpoints (SECURITY DEFINER):
- create_parent_link_request(student_identifier text | invite_code text, relationship_type text)
- approve_parent_link(link_id uuid)
- deny_parent_link(link_id uuid, reason text)
- create_invite_code(student_id uuid, expires_at timestamptz)
- redeem_invite_code(code text)
- get_my_children()

DB Flow (happy paths):
1) Invite Code (fast path)
   - Staff creates invite code for a student.
   - Parent redeems code via `redeem_invite_code` → inserts approved link.
2) Request Link (no code)
   - Parent submits pending request via `create_parent_link_request`.
   - Staff reviews queue and approves/denies via RPC; audit timestamps are set.

Client Flow:
- Profile Wizard (/profiles-gate) collects parent info → Link Child screen
- Link Child options: Invite Code OR Request Link
- Parent Dashboard: if no children → show empty state + CTA to Link Child; show pending requests if any

Migration Rules [PROTECTED]:
- All migrations must be additive and idempotent (use IF NOT EXISTS where possible)
- Never drop columns/tables in mainline migrations; deprecate and clean up in dedicated, reviewed migrations
- One logical feature per migration file; name with UTC: YYYYMMDD_HHMMSS_parent_linking_schema.sql
- Always enable RLS and add minimum viable policies in the same migration that creates a table
- Staff operations must go through RPCs; avoid broad UPDATE/DELETE policies
- Every migration must be applied locally and in CI before merging; keep schema.sql in sync if used

