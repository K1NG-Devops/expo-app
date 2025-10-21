# ROAD-MAP.md — Authoritative Execution Plan (Oct–Nov 2025)

This roadmap is enforceable. All contributors (developers and agents) must follow it exactly. Governance lives in WARP.md (source of truth). This file distills docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md into an execution-ready plan with clear deliverables, acceptance criteria, and metrics.

Non‑negotiables and references
- Root policy: Only README.md, WARP.md, and ROAD-MAP.md are allowed at repository root. All other documentation lives under docs/ per categories in WARP.md.
- Version rules: React Native 0.79.5, Expo SDK 53, React 19, TypeScript 5.8, Supabase JS v2, TanStack Query v5, Expo Router v5. New Architecture enabled. Functional components + hooks only. FlashList must set estimatedItemSize.
- Security and data: All AI calls via Supabase Edge Functions; no client-side AI keys; PII redaction; usage tracked; RLS enforced. Database changes via supabase/migrations only (lint + db diff gates).
- Documentation Sources (MANDATORY): Each PR must include a “Documentation Sources” section listing links to the official docs consulted (React Native, Expo, Supabase, TanStack Query, etc.). Use the quick links below.
- Monorepo: Not in use. Web will be a separate project. An optional shared folder for styles may exist if/when needed.

Immediate 48 hours (parallelizable)
- Onboarding Skip + Demo Mode
  - Owner: @mobile-lead; Reviewer: @product
  - Tasks: Add prominent Skip on first screen; Demo Mode with ephemeral demo profile; ensure analytics mark demo sessions; block server writes in demo.
  - Acceptance: Skip visible; Demo loads dashboard immediately; no writes in demo; PostHog events onboarding_skip_clicked and demo_mode_started.
  - Metrics: TTFV ≤ 60s p50 (install → first dashboard render).
- Streaming AI UI (remove perceived latency)
  - Owner: @ai; Reviewer: @mobile-lead
  - Tasks: Stream tokens from Edge Function (SSE/ReadableStream); render incrementally; streaming indicator; cancel control; backpressure safe.
  - Acceptance: First token visible ≤ 1.2s p50; cancel works during stream; no UI stalls.
  - Metrics: ai_first_token_ms p50 ≤ 1200ms; ai_stream_cancel_success_rate ≥ 99%.
- Remove artificial delays
  - Owner: @perf; Reviewer: @ai
  - Tasks: Remove sleeps/throttles around AI/onboarding; loaders reflect true network state.
  - Acceptance: No artificial waits remain.
  - Metrics: ai_completion_time_ms p50 improves ≥ 20% vs baseline.
- Language Picker prominence
  - Owner: @ux; Reviewer: @l10n
  - Tasks: Language selector on first screen and settings; default via device locale; support en-ZA, af-ZA, zu-ZA, xh-ZA.
  - Acceptance: Selection persists; updates STT/TTS configs.
  - Metrics: language_change_success 100%; null language states 0.
- Voice/UI language sync (Azure STT/TTS)
  - Owner: @voice; Reviewer: @ai
  - Tasks: Bind UI language to Azure STT/TTS; normalize codes; cache last-used voice; quick toggle.
  - Acceptance: No mismatches; fallback to en-ZA if unsupported.
  - Metrics: voice_language_mismatch_rate = 0.
- PostHog funnels and metrics
  - Owner: @analytics; Reviewer: @product
  - Tasks: Instrument onboarding funnel; AI latency events (prompt_submitted, first_token, stream_complete, cancel); record TTFV.
  - Acceptance: Dashboards created and shared; events sampled.
- TS/ESLint quick pass
  - Owner: @quality; Reviewer: @mobile-lead
  - Tasks: Run typecheck:strict; fix top errors; cut ESLint warnings; remove console logs from production.
  - Acceptance: TS errors = 0; ESLint warnings ≤ 300 now (target ≤ 50 by Phase 4).

Success metrics (48h)
- TTFV ≤ 60s p50; AI first token ≤ 1.2s p50; Crash‑free sessions ≥ 99.5%; Demo/Skip live and tracked.

Week 1: Onboarding foundation
- Deliverables: Stepper with progress; role-aware defaults; minimal required fields; privacy note; retry with backoff; offline notice.
- Acceptance: Completion +20% vs baseline; drop‑off concentrated on ≤1 step; no increase in 400/422 rates; progress_step events added.
- Targets: onboarding_completion_rate ≥ 70%; onboarding_avg_duration ≤ 90s p50; onboarding_api_error_rate ≤ 1%.

Weeks 1–2: Dash AI performance
- Transport/streaming: SSE or streamed responses from Edge Functions; heartbeat; retry with idempotency.
- Concurrency: Client queue; cancel previous on new prompt; server‑side tenant budget protection.
- Memory & caching: Short‑term conversation memory; cached persona/system prompts; embedding cache for common intents; cost logging.
- VAD/TTS: VAD threshold tuning; TTS cache (hash voice+text); pre‑warm Azure Speech on app start.
- Targets: first_token ≤ 0.8s p50 (≤ 1.5s p95); end‑to‑end answer −20% p50; token cost −25% p50; 5xx ≤ 0.5% with ≤ 1 retry at p95.

Week 2: Language system
- Deliverables: Unified language context for UI/STT/TTS/AI; device‑locale default; manual override; persisted selection; string scaffolding for core screens.
- Targets: App‑wide language change applies in ≤ 500ms; mismatch rate = 0; localized strings coverage ≥ 80% for core flows.

Parallel: Code quality and production readiness
- TypeScript strict coverage: 0 TS errors (strict); track weekly delta.
- ESLint reduction: ≤ 300 now; ≤ 200 by Week 1; ≤ 50 by Phase 4.
- CI gates on PR: typecheck:strict; lint; file‑size checks; SQL lint; supabase db diff (no drift).
- EAS channels: preview → staging → production; release notes; Sentry/PostHog gates.
- Observability dashboards: Sentry (crash‑free, errors, slow frames); PostHog (onboarding funnel, AI latency, TTFV, language adoption).

Agentic Developer Mode (Dash‑aware, safety rails)
- Behavior: Read‑only by default; actions via Edge Functions; propose PRs with diffs; never expose secrets on client; no direct client AI calls; irreversible ops require explicit approvals.
- Phased rollout: A) read‑only proposals; B) sandbox PRs (no merges); C) auto‑merge docs‑only after 95% pass rate across 10 PRs; D) limited ops via Edge Functions with dry‑run + approval.
- Auditability: All agent actions logged to PostHog/Sentry with agent_id, action_type, dry_run.

Cleanup checklist (execute in dedicated PRs)
- Delete backups/strays: app/_layout.tsx.backup; components/dashboard/NewEnhancedParentDashboard_BASE_490480.tsx.
- Consolidate TierBadge: keep components/ui/TierBadge.tsx; update imports; remove components/ai/TierBadge.tsx.
- Deprecated stub: remove services/DashAIAssistant.ts if unused; otherwise migrate callers to services/dash-ai/DashAICompat or services/core/getAssistant then remove.
- Direct‑run SQL: move/delete sql/fixes/*; convert necessary scripts into supabase/migrations/* with lint and db diff.

Official documentation quick links
- React Native 0.79: https://reactnative.dev/docs/0.79/getting-started
- Expo 53: https://docs.expo.dev/versions/v53.0.0/
- React 19: https://react.dev/blog/2024/12/05/react-19
- TypeScript 5.8: https://www.typescriptlang.org/docs/handbook/intro.html
- Supabase JS v2: https://supabase.com/docs/reference/javascript/introduction
- TanStack Query v5: https://tanstack.com/query/v5/docs/framework/react/overview
- Expo Router v5: https://docs.expo.dev/router/introduction/
- Reanimated v3: https://docs.swmansion.com/react-native-reanimated/
- FlashList: https://shopify.github.io/flash-list/docs/
- Azure Speech SDK: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- Sentry (sentry‑expo): https://docs.expo.dev/guides/using-sentry/ and https://docs.sentry.io/platforms/react-native/
- PostHog RN: https://posthog.com/docs/libraries/react-native
- EAS Build: https://docs.expo.dev/build/introduction/

Definition of Done
- 48h DoD: Demo/Skip live; streaming UI live; artificial delays removed; TS errors 0; ESLint ≤ 300; TTFV ≤ 60s p50; first token ≤ 1.2s p50; this file updated.
- Week 1 DoD: Onboarding stepper shipped; funnels live; conversion +20%; CI gates enforced.
- Weeks 1–2 DoD: AI targets met (≤ 0.8s p50 first token; −25% token cost); VAD/TTS stable; unified language; no direct‑run SQL in source.

PR checklist (must be included in every PR)
- [ ] Follows WARP.md rules and this ROAD-MAP.md
- [ ] Documentation Sources: links to official docs used (RN, Expo, Supabase, TanStack, etc.)
- [ ] No secrets on client; AI calls via Edge Functions
- [ ] typecheck:strict passes; ESLint within thresholds; file sizes within limits
- [ ] Database changes via supabase/migrations; SQL lint and db diff pass
- [ ] PostHog/Sentry instrumentation updated where applicable

---

## Update — 2025-10-21: Dash AI Settings & Voice UX

What shipped
- Consolidated settings: Single source `app/screens/dash-ai-settings-enhanced.tsx`; old route keeps backward-compat link.
- Init race fix: Settings load only after DashAI instance is ready; removed noisy alert.
- Manual Save UX: Removed auto-save. Footer button shows Save (green) when dirty; otherwise Reset. Prevents redundant state updates.
- Voice system (SA accents): Unified short codes (en, af, zu, xh, nso); English (SA) voices added (Leah/Luke). Play Sample uses tts-proxy.
- Dash speech path: `DashVoiceService.speakText` now prefers Supabase Edge `tts-proxy` with correct language + voice_id; device TTS is fallback.
- Preferences: Persisted voice preferences (voice_preferences) and mapped Auto-Read Responses → autoSpeak.

Impact
- SA accents are used reliably for both samples and assistant speech via Azure/Google through Edge Function.
- Settings changes are explicit and predictable; no background saves.
- Typecheck passes; lint still >200 warnings (tracked separately per roadmap).

Next steps (actionable)
- Verify Edge configs: Ensure AZURE_SPEECH_KEY/REGION and (optional) GOOGLE_CLOUD_TTS_API_KEY are set in production/staging Functions.
- Expand locale coverage: Confirm `xh` and `nso` fallbacks (Google/device) produce acceptable quality; add caching keys for those paths.
- Instrumentation: Add PostHog events for save/reset actions and voice test usage; chart adoption of SA voices.
- Lint reduction PR: Triage top 50 warnings (unused vars, hooks deps); add autofix where feasible; lower max warnings gate toward 200.
- E2E smoke: Add manual test sheet for five languages (sample + assistant reply) on Android device.
- Docs: Update docs/features/VOICE_MODE_SETUP.md with new short-code flow and Save UX.

Acceptance criteria
- Samples and assistant replies use the selected SA accent ≥ 99% (no unintended US accent fallbacks).
- Save/Reset UX shows correct state; no autosave occurs; no accidental loss of changes.

Documentation Sources
- Azure Speech languages/voices: https://learn.microsoft.com/azure/ai-services/speech-service/language-support?tabs=tts
- Expo Speech (fallback behavior): https://docs.expo.dev/versions/v53.0.0/sdk/speech/
- Supabase Edge Functions: https://supabase.com/docs/guides/functions/overview

## Update — 2025-10-21: Voice Orb reliability & SA language enforcement

What changed
- Voice Orb: added audio-level visualization and smarter “no audio detected” logic with runtime fallback to on-device RN Voice when Expo SR yields no partials.
- SA languages end-to-end: enforced reply language for LLM via system directive; TTS now respects override language (en-ZA/af-ZA/zu-ZA/xh-ZA) with Azure/Google via tts-proxy; device TTS remains a safe fallback.
- RN Voice guard: gracefully skips fallback if the native module isn’t available (prevents null module crash in Expo Go).

Impact
- Reduced false “no audio” errors; more reliable capture on Android low-end devices.
- Dash replies and speaks in the chosen or detected South African language consistently.

Next steps
- Build dev client to enable RN Voice fallback: npx eas build -p android --profile development → install → npx expo start --dev-client.
- Trim ESLint warnings to ≤200 (remove unused styles, fix trivial deps/vars).

Documentation Sources
- Expo Speech Recognition: https://docs.expo.dev/versions/v53.0.0/sdk/speech-recognition/
- @react-native-voice/voice: https://github.com/react-native-voice/voice
- Azure Speech SDK (JS): https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/

# ROAD-MAP.md — Authoritative Execution Plan (Oct–Nov 2025)

This roadmap is enforceable. All contributors (developers and agents) must follow it exactly. Governance lives in WARP.md (source of truth). This file distills docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md into an execution-ready plan with clear deliverables, acceptance criteria, and metrics.

Non‑negotiables and references
- Root policy: Only README.md, WARP.md, and ROAD-MAP.md are allowed at repository root. All other documentation lives under docs/ per categories in WARP.md.
- Version rules: React Native 0.79.5, Expo SDK 53, React 19, TypeScript 5.8, Supabase JS v2, TanStack Query v5, Expo Router v5. New Architecture enabled. Functional components + hooks only. FlashList must set estimatedItemSize.
- Security and data: All AI calls via Supabase Edge Functions; no client-side AI keys; PII redaction; usage tracked; RLS enforced. Database changes via supabase/migrations only (lint + db diff gates).
- Documentation Sources (MANDATORY): Each PR must include a “Documentation Sources” section listing links to the official docs consulted (React Native, Expo, Supabase, TanStack Query, etc.). Use the quick links below.
- Monorepo: Not in use. Web will be a separate project. An optional shared folder for styles may exist if/when needed.

Immediate 48 hours (parallelizable)
- Onboarding Skip + Demo Mode
  - Owner: @mobile-lead; Reviewer: @product
  - Tasks: Add prominent Skip on first screen; Demo Mode with ephemeral demo profile; ensure analytics mark demo sessions; block server writes in demo.
  - Acceptance: Skip visible; Demo loads dashboard immediately; no writes in demo; PostHog events onboarding_skip_clicked and demo_mode_started.
  - Metrics: TTFV ≤ 60s p50 (install → first dashboard render).
- Streaming AI UI (remove perceived latency)
  - Owner: @ai; Reviewer: @mobile-lead
  - Tasks: Stream tokens from Edge Function (SSE/ReadableStream); render incrementally; streaming indicator; cancel control; backpressure safe.
  - Acceptance: First token visible ≤ 1.2s p50; cancel works during stream; no UI stalls.
  - Metrics: ai_first_token_ms p50 ≤ 1200ms; ai_stream_cancel_success_rate ≥ 99%.
- Remove artificial delays
  - Owner: @perf; Reviewer: @ai
  - Tasks: Remove sleeps/throttles around AI/onboarding; loaders reflect true network state.
  - Acceptance: No artificial waits remain.
  - Metrics: ai_completion_time_ms p50 improves ≥ 20% vs baseline.
- Language Picker prominence
  - Owner: @ux; Reviewer: @l10n
  - Tasks: Language selector on first screen and settings; default via device locale; support en-ZA, af-ZA, zu-ZA, xh-ZA.
  - Acceptance: Selection persists; updates STT/TTS configs.
  - Metrics: language_change_success 100%; null language states 0.
- Voice/UI language sync (Azure STT/TTS)
  - Owner: @voice; Reviewer: @ai
  - Tasks: Bind UI language to Azure STT/TTS; normalize codes; cache last-used voice; quick toggle.
  - Acceptance: No mismatches; fallback to en-ZA if unsupported.
  - Metrics: voice_language_mismatch_rate = 0.
- PostHog funnels and metrics
  - Owner: @analytics; Reviewer: @product
  - Tasks: Instrument onboarding funnel; AI latency events (prompt_submitted, first_token, stream_complete, cancel); record TTFV.
  - Acceptance: Dashboards created and shared; events sampled.
- TS/ESLint quick pass
  - Owner: @quality; Reviewer: @mobile-lead
  - Tasks: Run typecheck:strict; fix top errors; cut ESLint warnings; remove console logs from production.
  - Acceptance: TS errors = 0; ESLint warnings ≤ 300 now (target ≤ 50 by Phase 4).

Success metrics (48h)
- TTFV ≤ 60s p50; AI first token ≤ 1.2s p50; Crash‑free sessions ≥ 99.5%; Demo/Skip live and tracked.

Week 1: Onboarding foundation
- Deliverables: Stepper with progress; role-aware defaults; minimal required fields; privacy note; retry with backoff; offline notice.
- Acceptance: Completion +20% vs baseline; drop‑off concentrated on ≤1 step; no increase in 400/422 rates; progress_step events added.
- Targets: onboarding_completion_rate ≥ 70%; onboarding_avg_duration ≤ 90s p50; onboarding_api_error_rate ≤ 1%.

Weeks 1–2: Dash AI performance
- Transport/streaming: SSE or streamed responses from Edge Functions; heartbeat; retry with idempotency.
- Concurrency: Client queue; cancel previous on new prompt; server‑side tenant budget protection.
- Memory & caching: Short‑term conversation memory; cached persona/system prompts; embedding cache for common intents; cost logging.
- VAD/TTS: VAD threshold tuning; TTS cache (hash voice+text); pre‑warm Azure Speech on app start.
- Targets: first_token ≤ 0.8s p50 (≤ 1.5s p95); end‑to‑end answer −20% p50; token cost −25% p50; 5xx ≤ 0.5% with ≤ 1 retry at p95.

Week 2: Language system
- Deliverables: Unified language context for UI/STT/TTS/AI; device‑locale default; manual override; persisted selection; string scaffolding for core screens.
- Targets: App‑wide language change applies in ≤ 500ms; mismatch rate = 0; localized strings coverage ≥ 80% for core flows.

Parallel: Code quality and production readiness
- TypeScript strict coverage: 0 TS errors (strict); track weekly delta.
- ESLint reduction: ≤ 300 now; ≤ 200 by Week 1; ≤ 50 by Phase 4.
- CI gates on PR: typecheck:strict; lint; file‑size checks; SQL lint; supabase db diff (no drift).
- EAS channels: preview → staging → production; release notes; Sentry/PostHog gates.
- Observability dashboards: Sentry (crash‑free, errors, slow frames); PostHog (onboarding funnel, AI latency, TTFV, language adoption).

Agentic Developer Mode (Dash‑aware, safety rails)
- Behavior: Read‑only by default; actions via Edge Functions; propose PRs with diffs; never expose secrets on client; no direct client AI calls; irreversible ops require explicit approvals.
- Phased rollout: A) read‑only proposals; B) sandbox PRs (no merges); C) auto‑merge docs‑only after 95% pass rate across 10 PRs; D) limited ops via Edge Functions with dry‑run + approval.
- Auditability: All agent actions logged to PostHog/Sentry with agent_id, action_type, dry_run.

Cleanup checklist (execute in dedicated PRs)
- Delete backups/strays: app/_layout.tsx.backup; components/dashboard/NewEnhancedParentDashboard_BASE_490480.tsx.
- Consolidate TierBadge: keep components/ui/TierBadge.tsx; update imports; remove components/ai/TierBadge.tsx.
- Deprecated stub: remove services/DashAIAssistant.ts if unused; otherwise migrate callers to services/dash-ai/DashAICompat or services/core/getAssistant then remove.
- Direct‑run SQL: move/delete sql/fixes/*; convert necessary scripts into supabase/migrations/* with lint and db diff.

Official documentation quick links
- React Native 0.79: https://reactnative.dev/docs/0.79/getting-started
- Expo 53: https://docs.expo.dev/versions/v53.0.0/
- React 19: https://react.dev/blog/2024/12/05/react-19
- TypeScript 5.8: https://www.typescriptlang.org/docs/handbook/intro.html
- Supabase JS v2: https://supabase.com/docs/reference/javascript/introduction
- TanStack Query v5: https://tanstack.com/query/v5/docs/framework/react/overview
- Expo Router v5: https://docs.expo.dev/router/introduction/
- Reanimated v3: https://docs.swmansion.com/react-native-reanimated/
- FlashList: https://shopify.github.io/flash-list/docs/
- Azure Speech SDK: https://learn.microsoft.com/en-us/javascript/api/microsoft-cognitiveservices-speech-sdk/
- Sentry (sentry‑expo): https://docs.expo.dev/guides/using-sentry/ and https://docs.sentry.io/platforms/react-native/
- PostHog RN: https://posthog.com/docs/libraries/react-native
- EAS Build: https://docs.expo.dev/build/introduction/

Definition of Done
- 48h DoD: Demo/Skip live; streaming UI live; artificial delays removed; TS errors 0; ESLint ≤ 300; TTFV ≤ 60s p50; first token ≤ 1.2s p50; this file updated.
- Week 1 DoD: Onboarding stepper shipped; funnels live; conversion +20%; CI gates enforced.
- Weeks 1–2 DoD: AI targets met (≤ 0.8s p50 first token; −25% token cost); VAD/TTS stable; unified language; no direct‑run SQL in source.

PR checklist (must be included in every PR)
- [ ] Follows WARP.md rules and this ROAD-MAP.md
- [ ] Documentation Sources: links to official docs used (RN, Expo, Supabase, TanStack, etc.)
- [ ] No secrets on client; AI calls via Edge Functions
- [ ] typecheck:strict passes; ESLint within thresholds; file sizes within limits
- [ ] Database changes via supabase/migrations; SQL lint and db diff pass
- [ ] PostHog/Sentry instrumentation updated where applicable
