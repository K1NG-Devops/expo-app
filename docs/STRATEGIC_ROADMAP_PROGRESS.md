# EduDash Pro – Strategic Roadmap Progress

A living progress log of milestones completed as we execute the roadmap. Append-only. Each milestone includes scope, verification, and follow-ups. Keep entries concise and practical.

---

## 2025-01-11 – Progress Log Initialized
- Created this file to capture working milestones with dates and verification steps.
- Baseline context: 91 TypeScript errors detected across 11 files after discovery; foundational supabase null-safety implemented via assertSupabase().
- Rule alignment: Will run `npm run typecheck` after each coding section before sign-off.

Verification:
- File present at docs/STRATEGIC_ROADMAP_PROGRESS.md
- Next: Add dashboard production-readiness analysis and commence Option A fixes.

---

## NEXT STRATEGIC PRIORITIES (TODO)
- [x] A1. Security/Auth TS cleanup (AuthContext, RBAC, Security, SessionManager, Security-audit)
- [x] A2. UI/Hook TS cleanup (Wireframes dashboards, MeetingRoom state, useDashboardData unions)
- [x] B1. AI Gateway MVP (Teacher-first): harden lesson generator, grading assist, homework helper via feature flags and safe server proxy
- [x] B2. Append progress after each milestone; run typecheck per rule
- [ ] C1. Principal Hub MVP planning: requirements, API/data needs, and rollout gates

---

## 2025-01-11 – Milestone: A1 + A2 Completed (TypeScript zero errors)
Scope:
- Replaced unsafe Supabase usage with assertSupabase() across security/auth layers (AuthContext, RBAC, Security, Security-audit, SessionManager)
- Fixed PostHog identify property types (removed undefineds)
- Resolved realtime service channel typings and cleanup
- Fixed MeetingRoom scheduling navigation bug (setActiveTab instead of undefined setter)
- Cleaned wireframe dashboards to use assertSupabase(); removed subquery misuse

Verification:
- npm run typecheck → 0 errors
- Minimal diff; no runtime behavior changes intended

Follow-ups:
- Monitor dashboards for runtime data loads
- Proceed to B1: Teacher-first AI Gateway wiring and safeguards

---

## 2025-01-11 – Milestone: B1 (Teacher-first) – Phase 1
Scope:
- Added feature-flag gating for Teacher AI tools (ai_lesson_generation, ai_grading_assistance) and build-level AI env toggle
- Wired Teacher dashboard AI tools to real screens with analytics events
- Implemented AI proxy call for Lesson Generator via Supabase Edge Function (functions.invoke('ai-proxy')) with safe prompt and error handling

Verification:
- AI tools disabled when flags off; show clear message
- Lesson Generator: invoke edge function, update preview text, analytics tracked
- npm run typecheck → 0 errors

Next:
- Extend edge function payloads and client error messaging for grading stream
- Add robust empty/loading/error states for AI Homework Grader streaming
- Add feature flag UI indicators (e.g., badge) when gated

---

## 2025-01-11 – Milestone: B1 (Teacher-first) – Phase 2
Scope:
- AI Homework Grader now gated by flags and build env, with analytics on start/complete/fail
- Calls secure Supabase Edge Function (ai-proxy) for grading; falls back to simulated streaming if edge call fails
- Improved UX for disabled states and error reporting

Verification:
- Start button disabled when AI off; clear messages shown
- ai-proxy invoked for grading when enabled; onFinal updates summary; analytics tracked
- npm run typecheck → 0 errors

Follow-ups:
- Optionally show streaming UI based on edge function server-sent events when available
- Add in-app rate-limit feedback (from edge response) and monthly usage counters

---

## 2025-01-11 – Milestone: B1 (Teacher-first) – Phase 3
Scope:
- Client-side monthly usage counters (SecureStore) for AI features added and displayed on AI Lesson Generator
- Teacher Dashboard now shows AI gating indicator (enabled/disabled) below section title
- AI Homework Grader returns user-friendly rate limit messages when server signals limits

Verification:
- Lesson Generator shows local monthly usage and increments on generation
- Teacher dashboard shows correct indicator based on flags/env
- npm run typecheck → 0 errors

Next:
- Extend UI usage counters to Homework Grader and AI Homework Helper screens
- Map server usage counters (when available) to override local counters for accuracy

---

## 2025-01-11 – Milestone: B1 (Teacher-first) – Phase 4
Scope:
- Combined usage counters: attempts server usage via functions.invoke('ai-usage') and falls back to local counters
- Homework Grader UI shows monthly usage; increments on completion

Verification:
- Usage appears on Lesson Generator and Homework Grader; safe when server usage endpoint absent
- Typecheck remains clean (0 errors)

Next:
- Wire AI Homework Helper when screen is available
- If server endpoint for usage exists, map to exact fields (ai_usage_logs monthly)

---

## 2025-01-11 – Milestone: B1 (Teacher-first) – Phase 5
Scope:
- New AI Homework Helper screen with feature-flag/build gating, edge function invocation, analytics, and usage counters
- Teacher Dashboard now includes Homework Helper tile (gated)

Verification:
- AI Helper disabled states show clear message when gated
- Edge function ai-proxy invoked on Ask AI; response shown; usage increments
- Typecheck clean (0 errors)

Next:
- Add small info badge in AI Tools explaining privacy and gating
- Begin C1 Principal Hub MVP planning PRD (requirements, data/APIs, rollout gates)

---

## 2025-01-11 – Milestone: Pricing & Gating Refresh
Scope:
- Added new tiers and quotas: Parent Starter (R49), Parent Plus (R149), Private Teacher (R299), Pro (R599), Preschool Pro (Custom), Enterprise (Special)
- Pricing page now supports Monthly/Annual toggle and WARP-style plan layout
- Enforced quota gating per tier in client with server-aware overrides
- Teacher Dashboard updated: org usage summary for admins, non-op quick actions now show alerts
- Principal Dashboard: financial reports navigation wired; other actions safely stubbed

Verification:
- npm run typecheck → 0 errors
- Pricing page shows plans in order from Free to Enterprise
- AI screens gate based on updated quotas and show quota summaries

Follow-ups:
- Build comparison table as full responsive component (beyond summary list)
- Finalize server functions for org limits and allocation

## 2025-01-11 – Dashboard Production-Readiness Assessment

Principal Dashboard (components/dashboard/PrincipalDashboard.tsx)
- Data correctness: uses usePrincipalDashboard hook. Ensure all queries tenant-scoped (preschool_id) and RLS-enforced. Good use of RealtimeActivityFeed for live updates.
- Performance: list sections are paginated or summarized; OK for mobile. Consider lazy-loading meeting room modal and activity feed.
- Offline: pull-to-refresh exists; recommend TanStack Query persistence for metrics.
- Observability: add track events for quick actions and error surfaces; maintain Sentry breadcrumb on errors.
- Security: ensure actions gated by RBAC (access_principal_hub, manage_teachers). Hide tools if missing capabilities.
- UX: touch targets >=44px; good contrast; multi-language selector present. Add empty states for metrics.

Teacher Dashboard (components/dashboard/TeacherDashboard.tsx)
- Data correctness: uses useTeacherDashboard hook (ensure tenant scoping and RLS). Metrics and cards map cleanly.
- Performance: grids are small; safe for mid-tier devices. For long class lists, flip to FlashList.
- Offline: pull-to-refresh present; recommend cached summaries (students/classes) with background refresh.
- Observability: added analytics for AI tool opens (lesson generator, homework grader).
- Security: gate AI features by feature flags and role capability (ai_lesson_generation, ai_grading_assistance) when enabling at scale.
- UX: status badges and progress bars are compact; ensure color contrast and screen reader labels.

Actions:
- Short-term: wire AI tools (done for navigation), add feature flag gating and loading states when enabling server proxy.
- Medium-term: add lazy routes for heavy sections, ensure i18n coverage for all strings.

