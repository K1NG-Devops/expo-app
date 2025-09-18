# WARP.md - EduDash Pro Master Rules Document

## 🚨 RULES-FIRST PRECEDENCE
**WARP.md > rules.md > .cursorrules > code**  
This file is the highest authority. Conflicts resolve upward in the chain.  
Golden Rule and Non-negotiables apply to all changes, all environments.  
Tags: [NONNEGOTIABLE], [PROTECTED], [AI-GUIDE], [CHECKLIST]

---

## ✨ GOLDEN RULE [NONNEGOTIABLE]
> **Always design EduDash Pro with students, teachers, and parents at the center of every decision.**  
> **Every feature must make education simpler, smarter, and more engaging.**  
> **Optimize for their learning outcomes, clarity, and safety.**

---

## 🔒 NON-NEGOTIABLES [NONNEGOTIABLE]

These rules are absolute and cannot be overridden without formal approval process:

### 1. Production Database Integrity
- **NEVER** reset, reseed, or otherwise alter the production database state outside the approved migration pipeline
- **NEVER** run `supabase db reset` on production or staging environments  
- **NEVER** execute direct SQL queries via Supabase Dashboard SQL Editor - this breaks migration history
- **NEVER** use raw SQL scripts outside the migration system - leads to schema drift
- **ALWAYS** use Supabase migrations for ALL schema changes (tables, policies, functions, triggers)
- **ALWAYS** use `supabase migration new` to create new migration files
- **ALWAYS** use `supabase db push` to apply migrations consistently
- **ALWAYS** use `supabase migration repair` to fix migration history issues
- **CURRENT STATE**: Production-ready with live superadmin accounts
  - Primary: superadmin@edudashpro.org.za / #Olivia@17
  - Secondary: admin@edudashpro.com / Secure123!
- **Approval Required**: Security Lead + Data Owner + Change Advisory Board

### 2. No Mock Data Policy
- **NEVER** introduce mock data, test fixtures, example content, or seeded data into any production path
- **NEVER** use hardcoded arrays or demo data in components
- **ALWAYS** handle empty states gracefully with proper loading, error, and empty UI
- **ALWAYS** fetch real data from Supabase or return empty arrays
- **Database**: Clean, secure, no mock data ✅
- **Tables**: All essential tables present with proper RLS ✅

### 3. Authentication Sanctity
- **NEVER** change authentication providers, token formats, session handling, or password flows without approval
- **NEVER** modify the working authentication system (SimpleWorkingAuth.tsx)
- **ALWAYS** use existing Supabase Auth configuration
- **Current Status**: Both superadmin accounts active, authenticated, and working ✅
- **Approval Required**: Security Lead + Product Owner + Engineering Lead

### 4. Security Controls
- **NEVER** disable or bypass audit logs, rate limits, input validation, or security controls
- **ALWAYS** maintain RLS policies for tenant isolation
- **ALWAYS** use service role only for superadmin operations
- **RLS Status**: All policies tested and working ✅
- **Exception Process**: Temporary exception ticket with defined rollback plan

### 5. Data Privacy & Compliance
- **NEVER** ship code that violates data residency, privacy, POPIA, GDPR, or child protection requirements
- **ALWAYS** minimize data collection for minors
- **ALWAYS** support data export/deletion requests
- **ALWAYS** maintain WCAG 2.1 AA accessibility compliance
- **NEVER** log secrets, tokens, or PII in any form

### 6. AI Integration Security
- **NEVER** call Anthropic from the client - use Supabase Edge Function `ai-proxy` exclusively
- **NEVER** bundle AI keys (no EXPO_PUBLIC_ANTHROPIC_API_KEY usage in app logic)
- **ALWAYS** log AI usage server-side to `ai_usage_logs`
- **ALWAYS** enforce subscription limits in the server before calling AI
- **ALWAYS** redact PII before sending to AI services

---

## 🎯 MISSION & VISION

### Our Mission
Build the leading educational dashboard platform for South African education, competing effectively with:
- Google Classroom
- Microsoft Teams for Education
- Canvas
- ClassDojo

### Our Vision
Empower every educator, engage every parent, and inspire every student through technology that's:
- **Mobile-first** and accessible to all
- **AI-enhanced** but human-centered
- **Locally relevant** yet globally competitive
- **Affordable** and sustainable

---

## 🏗️ ARCHITECTURAL PRINCIPLES [PROTECTED]

### 1. Mobile-First Architecture
- Design for mobile screens first (5.5" baseline), then scale up
- Optimize for low-end Android devices (majority market)
- Implement offline-first data sync with TanStack Query
- Use React Native (Expo) for native performance
- Touch targets minimum 44x44 pixels
- Use FlashList for lists > 20 items with proper estimatedItemSize
- Use expo-image with caching, avoid unbounded images

### 2. Multi-Tenant Security
- Strict RLS policies for data isolation
- Every tenant query must filter by `preschool_id`
- School-specific data boundaries enforced
- Role-based access control (RBAC)
- Audit trails for all sensitive operations
- Superadmin operations run on server with service role
- Never expose service role keys or bypass RLS on client

### 3. Scalable Infrastructure
- Modular, microservices-ready architecture
- Horizontal scaling capabilities
- Queue-based async processing for tasks >5 seconds
- CDN and edge optimization
- All server reads through TanStack Query
- Persist cache to AsyncStorage
- Scope query keys by `preschool_id` and role

### 4. AI Integration Strategy
- Anthropic Claude for educational content
- Server-side AI proxy (never client-side)
- Usage tracking and quota management
- Graceful fallbacks for AI failures
- Child-safe, age-appropriate prompts
- South African context awareness

### 5. Observability & Privacy
- Initialize Sentry and PostHog in production only (env-gated)
- Do not send PII; use hashed identifiers
- Tag all events with: role, preschool_id (hashed), app version
- All critical actions must write to audit_logs

### 6. Internationalization
- Externalize all new strings
- Add Afrikaans/isiZulu stubs
- Locale-aware formatting for dates, numbers, currency
- RTL support ready

### 7. Child Safety & Advertising
- Ads show only for freemium tier
- Never during active learning
- Educational, age-appropriate ads only
- Guard ads behind `EXPO_PUBLIC_ENABLE_ADS`
- Use test IDs outside production

## 🧰 Local Docker Resource Policy [CHECKLIST]
- No more than one Docker container should be running locally for this project at any time.

---

## 📋 DEVELOPMENT WORKFLOW [CHECKLIST]

### Before Starting Any Task
- [ ] Review WARP.md Golden Rule and Non-negotiables
- [ ] Check rules.md for specific principles
- [ ] Review relevant .cursorrules for component/service
- [ ] Verify no conflict with production safeguards

### During Development
- [ ] Mobile-first design and testing
- [ ] No mock data - handle empty states properly
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Internationalization ready (no hardcoded strings)
- [ ] Security controls in place
- [ ] Performance within budgets
- [ ] Use TanStack Query for server state
- [ ] Implement proper error handling

### Database Changes (CRITICAL)
- [ ] **NEVER** run SQL directly in Supabase Dashboard
- [ ] Create migration with `supabase migration new <descriptive-name>`
- [ ] Write SQL in migration file under `supabase/migrations/`
- [ ] Test migration locally first with `supabase db reset --local`
- [ ] Apply to remote with `supabase db push --linked`
- [ ] Verify migration history with `supabase migration list`
- [ ] Use `supabase migration repair` if history gets corrupted
- [ ] Document breaking changes in migration comments

### Before Committing
- [ ] TypeScript strict mode passing
- [ ] Unit tests for business logic
- [ ] Integration tests for critical paths
- [ ] No console.logs or debug code
- [ ] No secrets or tokens in code
- [ ] Documentation updated

### PR Submission
- [ ] Golden Rule compliance verified
- [ ] Non-negotiables checklist complete
- [ ] Mobile testing evidence provided
- [ ] Accessibility audit passed
- [ ] Performance metrics within targets
- [ ] Required approvals obtained
- [ ] Include "Rules compliance" section

---

## 🔐 APPROVAL MATRIX

| Change Type | Required Approvals | Exception Process |
|------------|-------------------|------------------|
| Database Schema | Data Owner + Engineering Lead | Migration script review |
| Authentication | Security Lead + Product Owner | Security audit required |
| Production Config | DevOps + Engineering Lead | Change advisory board |
| Payment/Billing | Finance + Product Owner | Legal review if needed |
| Child Safety | Legal + Product Owner | Compliance check |
| AI Integration | Engineering Lead + Product | Usage projection required |
| Platform Features | Product Owner + Design | User research data |
| RLS Policies | Security Lead + Data Owner | Penetration test |

---

## 📊 SUCCESS METRICS

### Technical Excellence
- 99.9% uptime SLA
- <400ms p95 response time on mid-tier Android
- Zero critical security vulnerabilities
- 100% RLS policy coverage
- <500KB initial bundle size

### User Experience
- 4.5+ app store rating
- <2% monthly churn
- 60% DAU/MAU ratio
- 80% feature adoption rate
- <3 taps to any core feature

### Business Growth
- 20% MoM user growth
- 30% free-to-paid conversion
- R50k+ MRR within 6 months
- 10+ schools onboarded monthly
- <R100 CAC (Customer Acquisition Cost)

### Educational Impact
- 90% homework completion rate
- 85% parent engagement score
- 95% teacher satisfaction
- Measurable learning improvements
- 100% curriculum alignment

---

## 🚀 RELEASE CRITERIA

### Production Deployment Requirements
1. All Non-negotiables verified ✓
2. Staging validation complete ✓
3. Performance benchmarks met ✓
4. Security scan passed ✓
5. Rollback plan documented ✓
6. Monitoring alerts configured ✓
7. Documentation updated ✓
8. Team notification sent ✓

### Testing Requirements
- New features require unit tests
- Critical flows need at least one E2E test
- Tests target local/test Supabase only
- No destructive operations on production
- Accessibility testing completed
- Mobile device testing verified

---

## 📚 REFERENCE DOCUMENTS

- **[rules.md](rules.md)**: Detailed development principles, database migration rules, and acceptance criteria
- **[.cursorrules](.cursorrules)**: Component and service-specific guidance
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Contribution workflow and standards
- **[README.md](README.md)**: Project overview and setup
- **[SECURITY.md](SECURITY.md)**: Security policies and procedures
- **[Supabase Database Advisors](https://supabase.com/docs/guides/database/database-advisors)**: Official documentation for database security best practices, RLS policies, and security advisor compliance

---

## ⚠️ ENFORCEMENT

This document is enforced through:
- Pre-commit hooks blocking violations
- CI/CD pipeline checks
- Code review requirements
- Automated security scanning
- Performance monitoring
- Regular compliance audits
- Branch protection rules
- CODEOWNERS file

### Violation Response
1. **Minor**: Warning in PR review
2. **Major**: PR blocked until resolved
3. **Critical**: Immediate rollback + incident review
4. **Repeated**: Performance review discussion

---

## 🔄 Governance

### Document Ownership
- **Owner**: Platform Team
- **Reviewers**: Security, Product, Engineering Leads
- **Approvers**: CTO + Product Owner

### Change Process
1. Propose via PR with justification
2. Review by all stakeholders
3. Approval from owners
4. Communication to all teams
5. Update training materials

### Review Schedule
- **Daily**: Check during code reviews
- **Weekly**: Team compliance check
- **Monthly**: Metrics review
- **Quarterly**: Document revision

---

**Last Updated**: 2025-01-09  
**Version**: 1.0.0  
**Status**: ACTIVE  
**Next Review**: 2025-02-09

---

## 🎓 Remember

> **The Golden Rule supersedes all else:**  
> **Students, Teachers, and Parents First. Always.**  
> **Make education simpler, smarter, and more engaging.**

Every line of code, every design decision, every feature we build must serve this purpose. If it doesn't help students learn, teachers teach, or parents engage, we shouldn't be building it.

---

*This is a living document. It will evolve as we learn and grow, but the Golden Rule remains constant.*

---

## 🧹 Chore Rules: Monorepo Migration Plan [CHECKLIST]

Authoritative supplement to WARP.md. This section governs our architecture migration to a monorepo with separate app targets and shared packages. Golden Rule and Non‑Negotiables remain in force and supersede all migration shortcuts.

### Decision
- Adopt a monorepo with:
  - apps/mobile (Expo, Android/iOS)
  - apps/web (Next.js, App Router)
  - apps/desktop (optional)
  - packages/* (ui, api, auth, analytics, types, config)
  - supabase/ (migrations, functions)

### Rationale
- Prevent dependency conflicts between native and web stacks
- Independent versions and release cadence per app
- Shared business logic and design system to avoid drift

### Non‑Negotiables (reaffirmed)
- No client-side AI keys; all AI calls via server `ai-proxy` with quotas and logs
- No auth flow changes without approvals (Security Lead + Product Owner + Eng Lead)
- RLS remains enforced; no service role keys on clients

### Target Layout
```
.
├─ apps/
│  ├─ mobile/
│  └─ web/
├─ packages/
│  ├─ ui/  ├─ api/  ├─ auth/  ├─ analytics/  ├─ types/  └─ config/
├─ supabase/
├─ package.json  pnpm-workspace.yaml  turbo.json  tsconfig.base.json
```

### Phased Plan (low risk)
0) Create a long‑lived migration branch; keep CI green
1) Add workspaces + Turborepo + tsconfig.base.json (no moves)
2) Move current app to apps/mobile unchanged; enable Metro symlinks
3) Scaffold apps/web with Next.js; alias react-native -> react-native-web; transpile shared packages
4) Create packages/ui, packages/api, packages/types (no secrets)
5) Wire apps to shared packages; keep platform screens inside each app
6) Separate env: EXPO_PUBLIC_* (mobile) vs NEXT_PUBLIC_* (web); packages/api reads both
7) Keep PayFast + AI proxy logic in service layer; pass platform return/cancel URLs from apps
8) CI/CD: EAS for mobile, Vercel for web; enable Turborepo cache
9) Versioning: apps independent; optional Changesets for packages; feature flags for safe rollout
10) Incremental extraction from app into packages; verify both bundlers at each step

### Tooling
- pnpm workspaces; Turborepo pipelines
- Metro: watchFolders ../../packages, unstable_enableSymlinks true
- Next: experimental.transpilePackages for @edudash/*; alias `react-native$` to `react-native-web`

### Compliance & Security
- No secrets in shared packages; only public keys
- Server keys remain in Edge Functions
- All AI usage logged and quota‑checked on server

### Migration Checklist (blocker gates)
- [ ] apps/mobile builds locally + CI
- [ ] apps/web builds locally + CI
- [ ] Shared packages compile in Metro and Next
- [ ] Env vars validated per app
- [ ] PayFast return_url/cancel_url verified per platform
- [ ] No RLS/auth regressions; audits pass

### Success Criteria
- Independent builds with zero cross‑platform dep conflicts
- Shared UI/business logic reused across apps
- Independent releases (EAS channels / Vercel envs)
- No Non‑Negotiable violations