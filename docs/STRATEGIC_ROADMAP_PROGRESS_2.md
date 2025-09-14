# EduDash Pro – Strategic Roadmap Progress (II)
Role Flow Alignment • Mock/Placeholder Cleanup • Content Library • Compliance

Date: 2025-09-14
Owner: Strategy/Engineering
Status: Initiated

---

## 1) Seamless Role Flow: Principal → Teacher → Parent

Goal: Ensure a clear, consistent, data-backed journey where Principals drive school outcomes, Teachers execute efficiently, and Parents stay informed and engaged.

A. Principal Hub Paths
- Create Announcement → notify teachers/parents (WhatsApp, in-app)
- Review School Metrics → drill into classes/teachers → actions (meeting follow-ups)
- Finance Overview → petty cash, reports, transactions
- Teacher Management → assignments adoption, AI usage, performance indicators

B. Teacher Dashboard Paths
- Generate Lesson with AI → create assignment → assign to class → track submissions/grades
- Grade Homework with AI → post results → parent notified → analytics update
- Communicate with Parents → message or announcement relay → parent dashboard updates

C. Parent Dashboard Paths
- See child progress → view assignments and grades → AI homework helper support
- Access interactive content library (subscription-gated) → STEM/Robotics/AI/Math/English/Afrikaans/Scratch
- Receive announcements/reminders via WhatsApp and in-app notifications

Acceptance Criteria
- [ ] No dead-ends: every action completes or gives a next step
- [ ] Tenant-scoped data with RLS, never leaks across schools
- [ ] Offline-first for critical flows (view dashboard, assignment lists, announcements)
- [ ] Clear error/empty states and i18n coverage
- [ ] Measurable analytics for each step (open, start, complete, fail)
- [ ] Notifications propagate accurately (teacher → parent; principal → all)
- [ ] AI features gated by plan and tracked in server usage logs
- [ ] Typed navigation routes – no invalid router.push strings

---

## 2) Findings: Mock Data, Placeholders, Dead Routes

Flagged items to clean up (partial list; expand during execution):
- lib/services/principalHubService.ts → multiple mock calculations (attendanceRate, financials, upcomingEvents)
- lib/services/finance/FinancialDataService.ts → mock generators (replace with Supabase queries)
- lib/sync/SyncEngine.ts → placeholder for media upload and file size
- lib/adMob.ts → stub implementation (OK behind flags; ensure no prod usage)
- lib/i18n.ts → "coming soon" placeholder logic for languages
- supabase/supabase/functions/ai-proxy/index.ts → placeholder responses and model id
- supabase/supabase/functions/ai-usage/index.ts → placeholder implementation (limits/logs)
- Strategic_Plan.md → references to stubbed actions on Principal Dashboard (ensure all routes exist)
- Migrations backups contain many baseline placeholders (ok as backups; ensure live migrations are authoritative)

Dead/untype-safe routes (from typecheck output; fix via typed helpers):
- Multiple router.push('/screens/...') strings in Teacher/Parent/Principal screens
- Marketing routes like '/marketing/contact' typed mismatch

Missing schema used in code (from errors):
- profiles.preschool_id used widely – ensure present and typed
- profiles.subscription_tier, profiles.preschool_settings referenced – ensure columns exist or guard usage

---

## 3) Action Plan (Concise TODO)

P0 – Blockers (stabilize within 3 days)
- [ ] Restore TypeScript to 0 errors (typed router helpers; Supabase null checks; env typing)
- [ ] Replace ai-proxy and ai-usage placeholder logic with production-safe code (timeouts, standardized errors, rate limits, server usage logs authoritative)
- [ ] Remove/replace mock data in principalHubService and FinancialDataService with real queries and views
- [ ] Add missing profile fields (subscription_tier, preschool_settings) or guard usage; backfill data

P1 – Role Flow and Offline Foundation (days 4–8)
- [ ] Typed navigation map for Principal → Teacher → Parent flows; remove dead routes
- [ ] Offline query persistence + offline mutation queue for dashboards, assignments, announcements
- [ ] Notification propagation audit: teacher grading → parent notification; principal announcement → parent/teacher
- [ ] i18n coverage for new/previously hard-coded strings (en/af + add zu baseline)

P2 – Content Library (subscription-gated) and Enhancements (days 9–14)
- [ ] Implement content library schema and APIs (see section 4)
- [ ] Teacher authoring → publish to library; Parent access via plans/entitlements
- [ ] Categories: STEM, Robotics, AI, Math, English, Afrikaans, Scratch
- [ ] Analytics: content views, completions, time spent; parental engagement
- [ ] PWA + caching for content where feasible

P3 – Compliance & Store Readiness (parallel)
- [ ] Play Store checklist (permissions, privacy policy URL, data safety form, content rating, testers)
- [ ] Camera/photo usage rationale and prompts localized
- [ ] Test accounts and seed data for reviewers

P4 – Biometrics Login UX
- [ ] Implement “biometric quick login” via stored refresh token (SecureStore) gated by biometric unlock; do not store password
- [ ] Clarify behavior: full sign-out wipes tokens; enable “Sign out but keep biometric login” as opt-in
- [ ] Ensure setSession(refresh_token) path is robust; add fallback OTP/Magic Link

Deliverables
- [ ] Removal of mocks; 0 TS errors; typed routes; offline-ready dashboards
- [ ] Content library MVP live with subscription gating
- [ ] Store compliance docs complete
- [ ] Biometrics quick-login UX documented and implemented

---

## 4) Content Library Architecture (MVP)

Tables (new)
- content_categories(id, slug, name, parent_id nullable)
- content_lessons(id, title, slug, category_id, locale, age_range, difficulty, created_by, preschool_id nullable, is_published, created_at)
- content_activities(id, lesson_id, type [quiz|video|simulation|scratch], payload jsonb, order_index)
- content_entitlements(id, plan, feature, quota_per_month)
- content_access_logs(id, user_id, lesson_id, activity_id nullable, started_at, completed_at, duration_ms)

Notes
- Use existing resource tables where applicable; content_lessons can reference resources via join if preferred
- Gate by subscription: plan → entitlements → UI checks and server checks (RLS + RPC)
- Locales: en, af, zu (initial)
- Analytics: access_logs; roll-up views for parental engagement and WAC support

APIs
- Public list with pagination and locale/category filters
- Lesson detail with activities; streaming content where applicable
- Entitlement check endpoint (server)

---

## 5) Database Migrations & Logging

- Create migrations for new content_* tables with RLS per preschool_id and/or organization_id when applicable
- Add MIGRATION_LOG.md entries for every error encountered with root cause and fix
- Use views to power Principal metrics and Teacher dashboards to reduce duplicated logic

---

## 6) Biometrics Issue Analysis & Fix Plan

Problem
- After enabling biometrics, signing out forces email/password again – expected “quick login” with biometrics

Root Cause
- Full sign-out clears session and refresh token; no token left to restore; biometrics only protects UI access, not server auth

Plan
- Introduce optional “Keep Biometric Login” at sign-out
- If enabled: retain refresh_token encrypted in SecureStore; on next launch → LocalAuthentication → supabase.auth.setSession({ refresh_token })
- Security: only store refresh token, never password; provide “Remove device trust” to wipe token
- Fallbacks: OTP/Magic Link for recovery

---

## 7) Play Store Compliance – Internal Testing Checklist

- Permissions:
  - CAMERA, READ/WRITE_EXTERNAL_STORAGE if used → provide justifications and in-app rationale
  - RECORD_AUDIO if video/voice features → localized rationale
- Privacy Policy: Public URL required; host and link in app store listing and in-app (Settings → Privacy Policy)
- Data Safety form: declare data collection/usage; analytics and crash reporting; AI usage description
- Content Rating questionnaire: complete and keep consistent with app content
- Testers: create internal testing track; add tester emails; include at least one test user account and sample data
- Store Listing: accurate screenshots, short and long descriptions, icon, feature graphic
- App Signing & Keystore: configure in Play Console; EAS builds mapped to signing config

---

## 8) Schedule & Owners (Suggested)

Week 1
- TS/Routes/Supabase typing fixes; mocks removal; ai-proxy hardening (FE/BE)
- Offline persistence + mutation queue (FE)

Week 2
- Content library schema + MVP UI (BE/FE)
- Compliance docs + Play Console setup (PM/FE)
- Biometrics quick login (FE)

Week 3
- Localization (isiZulu), analytics coverage, performance passes
- Pilot onboarding playbook and data seeding

---

## 9) Verification & Metrics

- TypeScript: 0 errors
- Role flow E2E tests pass (principal→teacher→parent)
- Offline dashboard loads last-known data; queued actions flush on reconnect
- Content library: publish → parent access by plan; analytics captured
- Store: internal testing track live; reviewers can access with test account

---

This v2 progress plan complements the main progress log and focuses on cross-role flows, content library delivery, compliance, and readiness for pilots.
