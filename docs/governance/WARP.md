# Governance Pointer

This repository's authoritative governance rules live in `/WARP.md` at the repository root. This file intentionally delegates to the root to prevent drift.

For official documentation sources and versions, also see:
- `ROAD-MAP.md` (Non-negotiables, execution plan, and references)
- `docs/governance/DOCUMENTATION_SOURCES.md` (curated external links to official documentation)

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
- **NEVER** use local Docker instances for database development - no `supabase start` or `docker-compose`
- **ALWAYS** use Supabase migrations for ALL schema changes (tables, policies, functions, triggers)
- **ALWAYS** use `supabase migration new` to create new migration files
- **ALWAYS** lint ALL SQL migrations with sqlfluff before any push to Supabase
- **ALWAYS** use `supabase db push` to apply migrations consistently
- **ALWAYS** verify no schema drift exists with `supabase db diff` after pushing
- **ALWAYS** use `supabase migration repair` to fix migration history issues
- **ALWAYS** keep migrations in sync - no schema drift is acceptable under any circumstances
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

### 7. Root Directory Cleanliness [NONNEGOTIABLE]
- **NEVER** leave temporary files, debug scripts, or test artifacts in project root
- **NEVER** commit development tools, logs, or personal files to root directory
- **ALWAYS** use organized directory structure for non-core files
- **ALWAYS** keep root directory clean for production deployments
- **File Organization Rules**:
  - `tests/` for all test files (unit/, integration/, sql/)
  - `debug/` for debugging and diagnostic scripts
  - `scripts/` for build and deployment scripts
  - `sql/` for database-related files (migrations/, fixes/, schema/)
  - `tools/` for utility and maintenance scripts
  - `temp/` for temporary development artifacts
  - `archive/` for old files and backups
  - `artifacts/` for build outputs and configuration artifacts
- **Root Directory Allowed Files**:
  - Core app files: `App.js`, `index.js`, `app.json`, `package.json`
  - Configuration: `.env`, `app.config.js`, `babel.config.js`, `metro.config.js`, `tsconfig.json`
  - Documentation: `README.md`
  - Git/CI: `.gitignore`, `.github/`
  - Essential directories: `app/`, `components/`, `lib/`, `docs/`, `assets/`, `supabase/`, `node_modules/`
- **Naming Conventions**:
  - Use kebab-case for directory names: `sql/`, `debug/`, `test-artifacts/`
  - Use kebab-case for utility files: `check-database.js`, `migrate-users.sql`
  - Prefix test files: `test-*`, `*-test.*`, `*.test.*`
  - Prefix debug files: `debug-*`, `diagnose-*`, `check-*`

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

## 🧹 Root Directory Policy [CHECKLIST]

### Console Logging Policy
- NEVER ship `console.log`, `console.debug`, or `console.warn` in production bundles.
- ALWAYS gate non-error logs with `__DEV__` or route via a central `Logger` that no-ops in production.
- Route errors through `Logger.error` and forward to Sentry/PostHog in production.
- Enforce with ESLint (`no-console` allowing only `error`) and production Babel transform (remove console except `error`).

### Clean Root Principle
- **PURPOSE**: Keep root directory focused on core application files for clean deployments
- **BENEFIT**: Reduces bundle size, improves CI/CD performance, prevents accidental deployment of dev artifacts
- **ENFORCEMENT**: Pre-commit hooks, CI checks, and code review requirements

### Directory Structure Standards
```
/
├── 📁 Core Application
│   ├── app/                    # Main application code
│   ├── components/             # Reusable components
│   ├── lib/                    # Core libraries and utilities
│   ├── assets/                 # Static assets
│   ├── hooks/                  # React hooks
│   ├── contexts/               # React contexts
│   ├── screens/                # Screen components
│   └── services/               # API and external services
├── 📁 Development & Testing
│   ├── tests/                  # All test files organized by type
│   │   ├── unit/               # Unit tests
│   │   ├── integration/        # Integration tests
│   │   └── sql/                # SQL tests
│   ├── debug/                  # Debug and diagnostic scripts
│   ├── scripts/                # Build, deployment, and utility scripts
│   ├── sql/                    # Database-related files
│   │   ├── migrations/         # Database migrations
│   │   ├── fixes/              # Database fixes and patches
│   │   ├── schema/             # Schema files
│   │   └── functions/          # Database functions
│   └── tools/                  # Development tools and utilities
├── 📁 Temporary & Archive
│   ├── temp/                   # Temporary files (gitignored)
│   ├── archive/                # Old files and backups
│   └── artifacts/              # Build artifacts and manifests
├── 📁 Documentation
│   └── docs/                   # All project documentation
├── 📁 Configuration (Root Level Only)
│   ├── .env                    # Environment variables
│   ├── app.config.js           # Expo configuration
│   ├── package.json            # Dependencies and scripts
│   ├── babel.config.js         # Babel configuration
│   ├── metro.config.js         # Metro bundler configuration
│   ├── tsconfig.json           # TypeScript configuration
│   ├── .gitignore              # Git ignore rules
│   └── README.md               # Project overview
└── 📁 Infrastructure
    ├── supabase/               # Database and edge functions
    └── .github/                # CI/CD workflows
```

### File Placement Rules
1. **Test Files**: All `test-*`, `*-test.*`, `*.test.*` files → `tests/`
2. **Debug Files**: All `debug-*`, `diagnose-*`, `check-*` files → `debug/`
3. **Scripts**: All `.sh`, build scripts, utilities → `scripts/` or `tools/`
4. **SQL Files**: All `.sql` files → `sql/` with appropriate subdirectory
5. **Temporary Files**: Logs, temp data, artifacts → `temp/` (gitignored)
6. **Archive**: Old keystores, backups, deprecated files → `archive/`

### Documentation Placement Rules
- Only `README.md` is allowed at the project root. All other Markdown (`*.md`) must live under `docs/`.
- Summary reports, status reports, and test plan documents must be placed in `docs/status/` or `docs/analysis/`.
- Deployment and runbooks → `docs/deployment/`
- Architecture and design → `docs/architecture/`
- Security policies and reports → `docs/security/`
- Feature specifications → `docs/features/`
- Governance and process → `docs/governance/`

### Enforcement Commands
```bash
# Check root directory cleanliness
ls -la | grep -E '\.(js|sql|sh|log|json)$' | grep -v -E '(App|index|app\.config|babel\.config|metro\.config|package|tsconfig)\.'

# Move misplaced files (examples)
mv debug-*.js debug/
mv test-*.js tests/unit/
mv *.sql sql/fixes/
mv *.sh scripts/
```

## 🧰 Local Docker Resource Policy [CHECKLIST]

### Default Policy: Remote-First Development
- **PRIMARY**: Use remote Supabase for all development (as per database non-negotiables)
- **REASONING**: Maintains single source of truth, prevents drift, matches production

### 🐳 Controlled Docker Exception (Special Cases Only)
- **ALLOWED ONLY** for complex migration development requiring multiple iterations
- **REQUIRED**: Run `./scripts/check-docker-resources.sh` before starting
- **REQUIRED**: `supabase stop` immediately after development session
- **REQUIRED**: Final `supabase db push` and `supabase db diff` to ensure sync
- **LIMIT**: Maximum 1 developer using local Docker per team at a time
- **MEMORY LIMIT**: Stop if Docker exceeds 1GB RAM usage
- **DURATION**: Maximum 4-hour sessions, must sync with remote before break

### Resource Management Commands
```bash
# Check resources before starting
./scripts/check-docker-resources.sh

# Local Docker workflow (exception case only)
supabase start                    # After resource check
supabase db push --local          # Test locally
supabase db push                  # Push to remote
supabase db diff                  # Must show no changes
supabase stop                     # Free resources immediately
```

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
- [ ] **NEVER** use local Docker instances (`supabase start`, `docker-compose`)
- [ ] Create migration with `supabase migration new <descriptive-name>`
- [ ] Write SQL in migration file under `supabase/migrations/`
- [ ] Run `sqlfluff lint supabase/migrations` and fix any issues
- [ ] Optionally run `sqlfluff fix supabase/migrations` and re-lint
- [ ] Apply to remote with `supabase db push` (NO --local flag)
- [ ] Verify no drift after push with `supabase db diff` - must show no changes
- [ ] Verify migration history with `supabase migration list`
- [ ] Use `supabase migration repair` if history gets corrupted
- [ ] Document breaking changes in migration comments
- [ ] Reference migration ID and summary in PR description

### Before Committing
- [ ] TypeScript strict mode passing
- [ ] Unit tests for business logic
- [ ] Integration tests for critical paths
- [ ] No console.logs or debug code
- [ ] No secrets or tokens in code
- [ ] Documentation updated
- [ ] **Root Directory Clean**: No test files, debug scripts, or temp artifacts in root
- [ ] **File Organization**: All files in appropriate directories per WARP.md rules
- [ ] **Naming Convention**: All files follow kebab-case convention

### PR Submission
- [ ] Golden Rule compliance verified
- [ ] Non-negotiables checklist complete
- [ ] Mobile testing evidence provided
- [ ] Accessibility audit passed
- [ ] Performance metrics within targets
- [ ] Required approvals obtained
- [ ] Include "Rules compliance" section

#### Database Changes Reviewer Checklist
- [ ] PR includes required migration files under `supabase/migrations/`
- [ ] `sqlfluff lint` is clean with no violations
- [ ] No direct SQL or local Docker usage indicated
- [ ] Schema is in sync post-push; no outstanding diff from `supabase db diff`

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