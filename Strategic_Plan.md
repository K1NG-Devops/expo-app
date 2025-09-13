# Strategic Plan (Updated)

Date: 2025-01-11

## Current Focus and Approach

1) Stabilize and gate AI features (Teacher-first)
- Enforce monthly quotas, prepay overage policy (client + server-aware)
- WARP-style model selection with per-feature preference persistence
- Admin allocation for org-managed usage (preschools on Pro+, K-12 Enterprise)

2) Pricing and tiering aligned to segments
- Individuals/Parents: Free, Parent Starter (R49), Parent Plus (R149)
- Private teachers: R299
- Teachers (Pro): R599
- Organizations: Preschool Pro (Custom), K-12 Enterprise (Special)
- Billing toggle (Monthly/Annual) with clear savings messaging

3) MVP readiness on dashboards
- All key dashboard buttons respond meaningfully (navigate, alert, or manage)
- Teacher Dashboard: AI tools gated; upgrade nudge; org usage summary for admins
- Principal Dashboard: finance navigation wired; other actions stubbed with clear TODOs

4) Next: Principal Hub MVP scope, localization pass, and offline-first hardening
- Principal collaboration features (meeting, actions, metrics)
- Afrikaans/isiZulu copy pass; date/number formats
- Caching + background sync improvements for low-connectivity

## Recent Progress (Checklist)
- [x] TypeScript cleanup (AuthContext, RBAC, Security, SessionManager, Security-audit)
- [x] AI usage tracking (SecureStore) + server-aware fallback
- [x] Quota gating and prepay overage enforcement (client)
- [x] Per-feature model selection (persisted)
- [x] Pricing page revamp with new tiers and annual toggle
- [x] Teacher Dashboard: upgrade nudge, org usage summary (admin), responsive quick actions
- [x] Principal Dashboard: finance navigation wired, other actions stubbed with TODOs
- [x] Typecheck & Lint run after each section

## Near-Term Tasks (Next)
- [x] Add comparison table to pricing as a proper responsive component (current summary present)
- [x] Complete principal settings/announcement/analytics stubs (basic modals or routes)
- [ ] Repo-wide audit for no-op onPress and dead routes; convert to alerts or disable states
- [ ] Server endpoints: ai-usage (limits, org_limits, set_allocation) contract finalize and document
- [ ] Expand feature flags and capabilities mapping for org tiers

## Risks and Mitigations (Active)
- Usage enforcement consistency: client vs server
  - Mitigation: server-side validation of quotas and allocations before processing AI requests
- Cost control under heavy usage
  - Mitigation: model default = Haiku; warn on higher-cost models; org-level caps

## Measurement
- AI feature adoption by segment (parents, private teachers, pro teachers)
- Conversion funnel from pricing: Free -> Parent Starter/Plus; Private Teacher; Pro
- Rate of “over-quota” prompts and upgrade conversions
- Dashboard action responsiveness (no-op rate trending to zero)

