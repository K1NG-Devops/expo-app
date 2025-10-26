# EduDash Pro — Master Documentation (Single Source of Truth)

This is the only living documentation file for EduDash Pro. All other documentation has been archived to `docs/OBSOLETE/`. Update this file for any new changes, fixes, or summaries.

Last Updated: 2025-10-14

---

## Purpose

- Consolidate all project knowledge into one authoritative document
- Provide a current-state snapshot of the app that matches the code
- Offer quick start instructions and governance essentials
- Track known issues and next actions (non-DB focus)

---

## Current State Snapshot (2025-10-14)

### Voice System
- Deployment: Text-to-Speech proxy deployed (edge function: `tts-proxy`)
- Data model: `voice_preferences`, `voice_audio_cache`, `voice_usage_logs`
- Storage: `tts-cache` bucket configured with appropriate access controls
- Languages: Afrikaans (af), isiZulu (zu) ready; others fallback as needed
- Quick test: From the app’s voice demo screen, select a language and test synthesis

Reference: voice deployment success summary (archived in `docs/OBSOLETE/voice/DEPLOYMENT_SUCCESS.md`).

### Dash AI Configuration
- Default model: Claude 3.5 Sonnet (20241022) for Starter and above; Haiku for Free
- Voice defaults: Male voice enabled by default; UI toggle available (Male/Female)
- Request queue: ~1.5s spacing between requests; sequential processing with timeout
- Tier quotas (dev mode may increase internal quotas); external provider limits still apply
- Recommendation: If 429s occur, verify provider tier limits; optionally increase spacing to ~3s and add user-facing rate-limit feedback

Reference: consolidated analysis (archived in `docs/OBSOLETE/fixes/DASH_COMPLETE_ANALYSIS_2025-10-14.md`).

### Recent Fixes — Highlights
- Loading experience improvements and dashboard greeting visibility
- Biometric sign-in button and secure credential save/restore
- Avatar initials logic (first + last name)
- Petty cash UI overflow fix; error handling improvements in WhatsApp send function
- Various UX refinements and informative error messaging

Reference: status summaries and fixes (archived in `docs/OBSOLETE/status/FIXES_APPLIED.md` and `docs/OBSOLETE/fixes/`).

---

## Quick Start (Developer)

1) Install
- Node 18+, npm 8+, Expo CLI, EAS CLI, Supabase CLI
- Android Studio (Android) and Xcode (iOS on macOS)

2) Environment
- Copy `.env.example` → `.env` and fill required values
- Ensure public keys/URLs only; never commit secrets

3) Database linking (local/staging)
- Link your Supabase project (as applicable)
- Apply migrations and verify (as applicable to your workflow)

4) Run
- Start the app with dev client and open on device/emulator

See project root README for detailed setup and scripts.

---

## Governance Essentials

- Logging: Use centralized logger (no `console.log`/`console.debug` in production)
- Code quality: Type-check and lint before PRs; follow repository conventions
- Source of truth: Update THIS file for documentation; do not add new files under `docs/` (except images/assets if needed)

---

## Known Issues / Next Actions (Non-DB)

- External rate limits: Even with internal quotas, provider 429s can occur; verify account tier, consider increasing request spacing and add user feedback
- Edge function dependencies: Some features (e.g., AI usage/allocations) depend on specific functions being deployed; ensure required functions are active for the target environment
- Device verification: Test voice synthesis and recording on physical devices (Android/iOS) for end-to-end confirmation

---

## Change Log

- 2025-10-14
  - Voice system live (tts-proxy, preferences/cache tables, storage bucket)
  - Male voice default + UI toggle; improved display logic
  - Rate-limit guidance and UX feedback recommendations
  - Documentation consolidated into a single master file; all others archived

- 2025-10-01
  - App UX improvements (loading, dashboard greeting, biometric sign-in)
  - Error handling improvements; UI overflow fixes; WhatsApp function resilience

---

## Archive Notice

All legacy documentation has been moved to `docs/OBSOLETE/` on 2025-10-14 for historical reference. Do not update archived files. Any new or revised documentation must be added to this master file.

---

## Contributor Notes

- All documentation updates belong in this file (docs/README.md). Do not add new docs files elsewhere.
- If you need to reference historical content, link to files under `docs/OBSOLETE/` and summarize here.

### How to add a change to this doc

Use this micro-template when appending to the Change Log:

- Date: YYYY-MM-DD
- Context: What area or feature this affects
- Change: One-line summary of the change
- Impact: Why it matters (user-visible, developer guidance, etc.)
