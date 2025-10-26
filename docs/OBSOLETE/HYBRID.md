# EduDashPro — HYBRID Status Report and Next Plan

Date: 2025-09-19 23:26 UTC
Author: Agent Mode
Location: docs/HYBRID.md

---

## 1) Executive Summary

- Root directory has been re-cleaned: misplaced markdown, tests, SQL, logs, screenshots, and ad-hoc scripts were moved into their correct categories per WARP.
- Governance updated to lock the rules in: only README.md may live at root; all other markdown must be in docs/; added a Console Logging Policy (no console log/debug/warn in production).
- App stack remains Expo + expo-router + RN 0.79.5 + React 19, TanStack Query, Supabase JS, Sentry, PostHog, i18n.
- Superadmin Dashboard backend is largely implemented per docs; the main gap is frontend wiring/feature flags/approvals for production rollout.
- Priority next steps: finalize logging hygiene (central Logger + ESLint/Babel rules), standardize migration directory, resolve credentials.json handling, and wire superadmin UI to RPCs under feature flags.

---

## 2) Root Cleanliness & Documentation Placement

What changed now (high-level):
- Non-README markdown removed from root → docs/_incoming (safe inbox for deduping with existing docs content).
- Root tests moved → tests/_legacy (to avoid collisions with canonical tests already under tests/).
- Root SQL moved → sql/fixes/ unless a duplicate name existed under sql/{migrations,fixes,schema}, in which case the root copy was moved to archive/root-sql/.
- Root debug/diagnose/check scripts moved → scripts/ (or scripts/migrated-debug if a name collision existed).
- Logs/PIDs moved → archive/logs/, inspection JSON reports → archive/reports/.
- Stray screenshots/images moved → docs/assets/images/.
- Kept all allowed root config: README.md, .env, app.config.js, babel.config.js, metro.config.js, tsconfig.json, package.json, app.json, .gitignore, .easignore, eslint.config.mjs, .sqlfluff, eas.json, google-services.json.

Codified rules (new/clarified):
- Only README.md is permitted at root; all other *.md must live under docs/.
- Summaries, status reports, and test plans go in docs/status or docs/analysis.
- Console Logging Policy added: no console.log/debug/warn in production bundles; use __DEV__ guard or a central Logger; route errors through Logger.error to Sentry/PostHog; enforce via ESLint and production Babel transform.

Notes:
- docs/_incoming contains root docs that were moved safely. We should reconcile these against existing authoritative docs and then delete/merge older duplicates.

---

## 3) App Architecture Snapshot (Current)

- Core: Expo 53, expo-router, React 19, React Native 0.79.5
- Data: @tanstack/react-query with async storage persistence
- Auth/Data: @supabase/supabase-js 2.x
- Observability: sentry-expo, posthog-react-native; WARP requires no PII; hash identifiers and role/tenant tagging
- i18n: i18next + react-i18next; locale-aware formatting encouraged
- Ads: react-native-google-mobile-ads (guarded via feature flags)
- Web (partial support via react-native-web); primary target remains mobile (Expo)
- app.config.js: runtimeVersion policy = appVersion; OTA config enabled; android google-services.json referenced at project root

---

## 4) Database & Migrations Posture

- Migrations exist in the repo (migrations/ and sql/migrations/). Some scripts/docs reference supabase/migrations (which is ignored in .gitignore) — pick one canonical directory and update scripts/docs accordingly.
- WARP Non-Negotiables enforced: all schema changes must be through Supabase migrations; lint SQL with sqlfluff; verify no drift using supabase db diff; never make direct SQL changes in the dashboard.
- Personal rule to observe in any future push: supabase db push --yes.

---

## 5) Security & Governance Highlights

- No client-side AI keys; AI calls go through server (edge function) with usage logging and quotas.
- RLS must remain enforced; never expose service-role keys to the client.
- Authentication flows must not be modified without approvals.
- Accessibility (WCAG 2.1 AA), mobile-first, and student/teacher/parent safety are considered non-negotiable guiding principles.

---

## 6) Superadmin Dashboard — Status

Based on status/implementation docs:
- Backend functions and schema largely exist and are validated; naming consistency issues have been addressed historically.
- Integration tests and SQL tests exist; further UI wiring and feature flagging are needed to finish Sprint 1 fully.
- Approvals (Security, Engineering, Legal/Compliance) required before staging-to-production promotion.

What remains:
- Frontend wiring of RPCs to screens
- Feature flag gating and staged rollout
- Stakeholder approvals
- Staging validation passes without drift; then plan production push with --yes flag

---

## 7) Logging & Debugging Hygiene (Current Snapshot)

- console.* usage is present across app/components/lib/contexts/hooks/services (common during development).
- Policy now requires either removal, __DEV__ guards, or routing via a central Logger that no-ops in production.
- Debug components should not render in production; conditionally import/render behind __DEV__ or feature flags.

Recommended implementation:
1) Create lib/logger.ts with methods log/debug/warn that no-op in production; error forwards to Sentry/PostHog.
2) Update eslint.config.mjs to forbid console (allow: ["error"]).
3) Add Babel plugin to strip console in production, excluding error.
4) Replace or guard console usage; gate debug UI.

---

## 8) Comprehensive Next Todos (Prioritized)

P0 — Immediate
- Commit and open PR: chore/root-cleanup & governance update
  - Include moves and updated WARP/rules.
  - Add a PR checklist for root cleanliness and WARP compliance.
- Decide on migration directory canonical path
  - Option A: standardize on sql/migrations and update scripts/docs.
  - Option B: unignore supabase/ and standardize there. Whichever path, future pushes must use supabase db push --yes + supabase db diff.
- Handle credentials.json
  - If it contains secrets, remove from git history (or stop tracking), store via env/secrets manager, and add ignore if needed.
- Introduce Logger + enforce logging policy
  - Add lib/logger.ts; update ESLint & Babel; refactor console usage accordingly.
- Gate debug UI for production
  - Ensure debug screens/components are only imported/rendered in __DEV__ or under flags.

P1 — Short Term
- CI enforcement
  - Add lint:strict (no-console rule) and a root cleanliness check to the pipeline.
- Docs reconciliation
  - Review docs/_incoming vs existing docs; merge newer content; remove duplicates; keep single canonical copies.
- README improvements
  - Add a concise map of where docs live and reference WARP governance sections.

P2 — Medium Term
- Superadmin Dashboard UI wiring
  - Wire RPCs, feature-flag rollout, approvals, and staging validation.
- Observability fine-tuning
  - Ensure Sentry/PostHog capture aligns with WARP (no PII, proper tags); validate performance budgets.
- Monthly hygiene cadence
  - Add a monthly job/script to check root cleanliness, logging violations, and doc placement.

---

## 9) Sources Consulted

- governance: governance/WARP.md, governance/rules.md
- status: status/SUPERADMIN_DASHBOARD_STATUS_2025-09-19.md, status/SUPERADMIN_FIXES_FINAL_STATUS.md, status/SUPERADMIN_DEPLOYMENT_20250919.md
- docs overview: docs/README.md
- project config: ../package.json, ../app.config.js, ../.gitignore
- test & sql layout: ../tests/, ../sql/

---

## 10) Acceptance/Verification Checklist (for PR)

- Root cleanliness: no *.md at root except README.md; no stray tests/SQL/scripts/logs at root.
- Docs placement: summaries/status/test plans live under docs/ per rules.
- Logging hygiene: non-error console removed/guarded; errors routed via Logger; ESLint and Babel enforced.
- Migration alignment: one canonical migrations directory; pushes use supabase db push --yes; supabase db diff shows no drift after changes.
- Debug code: not bundled in production (gated by __DEV__/flags).
- Approvals: Superadmin production rollout subject to required approvals per governance.
