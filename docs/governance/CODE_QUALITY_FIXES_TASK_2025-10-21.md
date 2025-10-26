# CODE_QUALITY_FIXES_TASK_2025-10-21

**Audience**: Multi-agent team (4 agents) executing in parallel with zero conflicts.  
**Authority**: This document follows WARP.md governance and aligns with ROAD-MAP.md phase timing.  
**Location**: docs/governance/ (per Documentation Organization Policy)

---

## 0) Purpose and Scope

Resolve code quality issues in a structured, conflict-free, and verifiable way:
- Backup files
- Duplicate TierBadge components
- Deprecated DashAIAssistant.ts stub
- Direct-run SQL files
- Oversized files (>400/500 lines)
- ESLint warnings (200+)
- console.log statements
- TODO comments

**Outcomes**:
- Repository hygiene enforced
- ESLint and SQL linting pass consistently
- File sizes within standards
- No production-unsafe logging
- Migration-only SQL workflow
- Dash AI service modularization path clear

**Non-negotiables**:
- Follow WARP.md rules at all times
- No direct SQL execution; Only Supabase migrations
- Documentation only in docs/ subdirectories

---

## 1) Alignment with ROAD-MAP.md and WARP.md

**Phase mapping**:
- **Immediate (48h)** → ROAD-MAP Phase 0 quick wins; WARP Phase 4 guardrails
- **Week 1** → ROAD-MAP Phase 1 foundation; expand linting + deprecations
- **Weeks 1-2** → ROAD-MAP Phase 2 performance refactors; file-splitting and Dash AI modularization

**Primary references**:
- WARP.md: Code Quality, File Size Standards, Governance Organization Policy, Database Rules
- ROAD-MAP.md: Phased execution cadence
- docs/governance/DOCUMENTATION_SOURCES.md: Official API versions and links

---

## 2) Critical Issues Inventory

### 1) Backup files (junk artifacts)
- **Definition**: Editor/OS leftovers and ad-hoc backups committed or untracked in repo
- **Patterns**: `*~`, `*.bak`, `*.old`, `*.orig`, `*.rej`, `*.tmp`, `.DS_Store`, `Thumbs.db`
- **Find**:
  ```bash
  find . -type f \( -name "*~" -o -name "*.bak" -o -name "*.old" -o -name "*.orig" -o -name "*.rej" -o -name "*.tmp" -o -name ".DS_Store" -o -name "Thumbs.db" \) -not -path "./node_modules/*"
  rg -n --hidden --glob "!node_modules/**" "(.*(~|\.bak|\.old|\.orig|\.rej|\.tmp)$|\.DS_Store|Thumbs\.db)"
  ```
- **Fix**: Delete from repo; add patterns to .gitignore; add scan script and CI gate
- **Known files**: `app/_layout.tsx.backup`, `components/dashboard/NewEnhancedParentDashboard_BASE_490480.tsx`

### 2) Duplicate TierBadge components
- **Definition**: Multiple implementations of TierBadge causing divergence and merge conflicts
- **Suspected paths**: `components/ai/TierBadge.tsx`, `components/ui/TierBadge.tsx`
- **Find**:
  ```bash
  fd -uu -a -t f "TierBadge*.tsx" components
  rg -n --hidden "export default .*TierBadge" components
  ```
- **Fix**: Choose canonical path `components/ui/badges/TierBadge.tsx`, update all imports, delete duplicates

### 3) Deprecated DashAIAssistant.ts
- **Definition**: Empty stub file (1 line) that should be removed per ROAD-MAP cleanup checklist
- **Location**: `services/DashAIAssistant.ts`
- **Find**:
  ```bash
  fd -uu -a "DashAIAssistant.ts" services lib
  rg -n --hidden "DashAIAssistant" --glob "!node_modules/**"
  ```
- **Fix**: Mark as deprecated; migrate callers to services/dash-ai/* modules; remove stub

### 4) Direct-run SQL files
- **Definition**: Any .sql scripts outside `supabase/migrations/*`
- **Find**:
  ```bash
  fd -uu -t f -e sql -E "supabase/migrations/*"
  rg -n --hidden --glob "!node_modules/**" "(psql\s|--file=.*\.sql)"
  ```
- **Fix**: Convert to Supabase migrations (supabase migration new ...), lint with SQLFluff, push, then delete originals
- **Known locations**: `sql/fixes/*`, `sql/QUICK_FIX.sql`, `sql/QUICK_FIX_REVOKE_SEAT.sql`, `sql/debug/*`, `sql/archive/*`

### 5) Oversized files
- **Definition**: Breach of WARP size caps: components ≤400, screens ≤500, services ≤500, hooks ≤200, types ≤300
- **Find**:
  ```bash
  npm run check:file-sizes
  ```
- **Fix**: Split by responsibility (container/presentational, hooks, services), move styles to styles.ts
- **Top offenders**:
  - `components/dashboard/TeacherDashboard.tsx` (2175 lines)
  - `components/dashboard/ParentDashboard.tsx` (2159 lines)
  - `app/screens/teacher-management.tsx` (2096 lines)
  - `components/ai/DashAssistant.tsx` (1651 lines)
  - `hooks/useDashboardData.ts` (1538 lines)

### 6) ESLint warnings (200+)
- **Definition**: Lint issues; WARP allows max 200 warnings, target 0
- **Find**: `npm run lint`
- **Fix**: `lint:fix` where safe, manual refactors otherwise
- **Common issues**: Empty blocks, missing React Hooks dependencies, unused variables/imports

### 7) console.log statements
- **Definition**: Raw console.log in production code (hundreds found)
- **Find**: 
  ```bash
  rg -n --hidden --glob "!node_modules/**" "console\.log\("
  ```
- **Fix**: Remove or replace with console.warn/console.error where appropriate; enforce ESLint no-console rule

### 8) TODO comments
- **Definition**: TODO/FIXME without tracking; code rot and noise
- **Find**: 
  ```bash
  rg -n --hidden --glob "!node_modules/**" "(TODO|FIXME)"
  ```
- **Fix**: Either resolve, or convert to `TODO[owner|phase|issue]` with link to ROAD-MAP or GitHub issue, or remove

---

## 3) Ownership Zones (to prevent conflicts)

### Agent 1 (Lead; you): Repo hygiene, governance, automation guardrails
- **Owned paths**: `docs/**`, `scripts/**`, `.husky/**`, `package.json`, `.eslintrc.cjs`, `.prettierrc*`, `.editorconfig`, `.gitignore`, `.github/**`
- **May read but NOT modify**: `app/**`, `components/**`, `services/**` (except adding non-invasive scripts/guards)

### Agent 2: ESLint, console/TODO cleanup (Core logic and hooks)
- **Owned paths**: `lib/**`, `services/**` (EXCLUDING `services/dash-ai/**`), `contexts/**`, `hooks/**`
- **Do NOT touch**: `components/**`, `supabase/**`, `services/dash-ai/**`

### Agent 3: File splitting + Dash AI modularization
- **Owned paths**: `services/dash-ai/**`, `services/DashAIAssistant.ts`, `app/screens/**`, `app/(auth)/**`, `app/(parent)/**`
- **Do NOT touch**: `lib/**`, `contexts/**`, `supabase/**`, `components/ui/badges/TierBadge.tsx`

### Agent 4: SQL migrations + TierBadge unification
- **Owned paths**: `supabase/**`, `sql/**`, `scripts/sql/**`, `components/ui/**` (for TierBadge ONLY)
- **Do NOT touch**: `services/dash-ai/**`, `app/screens/**`, `lib/**`

**Coordination rules**:
- One agent per path at a time
- If a change crosses boundaries, split into separate PRs by owner
- Branch naming: `chore/quality/<agent>/<area>-<short>` (example: `chore/quality/a4/sql-migrations-initial`)

---

## 4) Phased Execution Plan

### Phase: Immediate (48h)

#### Agent 1 (Lead): Guardrails and scans
**Tasks**:
- Add .gitignore entries for backup files: `*~`, `*.bak`, `*.old`, `*.orig`, `*.rej`, `*.tmp`, `.DS_Store`, `Thumbs.db`
- Add/verify ESLint rules in `.eslintrc.cjs`:
  - `no-console: ["error", { allow: ["warn", "error"] }]`
  - Add max-lines overrides from WARP.md for components/app/services/hooks/types
- Ensure `scripts/check-file-sizes.mjs` exists per WARP or add it
- Add `scripts/scan-backups.sh` and `scripts/scan-todos.sh`
- Add npm scripts:
  - `"check:file-sizes": "node scripts/check-file-sizes.mjs"`
  - `"check:backups": "bash scripts/scan-backups.sh"`
  - `"check:todos": "bash scripts/scan-todos.sh"`
  - `"check:console": "rg -n --hidden --glob '!node_modules/**' 'console\\.log\\('"`
- Set up Husky pre-commit (if present): typecheck, lint, check:file-sizes, lint:sql
- Delete backup files: `app/_layout.tsx.backup`, `components/dashboard/NewEnhancedParentDashboard_BASE_490480.tsx`

**Acceptance**:
- `.eslintrc.cjs` updated with no-console and max-lines overrides
- npm run check:backups, check:todos, check:console exist and run
- Husky pre-commit runs quality gates
- Backup files deleted

**Verify**:
```bash
npm run lint
npm run check:file-sizes
npm run check:backups
npm run check:console
npm run lint:sql
```

**Documentation Sources**:
- WARP.md: Code Quality & File Size Standards, Pre-commit, Governance Policy
- docs/governance/DOCUMENTATION_SOURCES.md
- ESLint rules: https://eslint.org/docs/latest/rules/no-console

---

#### Agent 2: ESLint baseline + remove console.log + TODO triage (core logic only)
**Tasks**:
- Run `npm run lint` and `npm run lint:fix` on `lib/**`, `services/**` (excluding `services/dash-ai/**`), `contexts/**`, `hooks/**`
- Remove all console.log in owned paths; replace with console.warn/error if needed
- Triage TODO/FIXME: resolve or convert to `TODO[agent2|phase|issue]` with link to ROAD-MAP.md section or GitHub issue

**Acceptance**:
- ESLint warnings in owned paths ≤ 200 (temporary gate)
- 0 occurrences of console.log in owned paths
- 0 bare TODO/FIXME (only tracked format `TODO[...]`)

**Verify**:
```bash
eslint lib services contexts hooks --max-warnings 200
rg -n "console\.log\(" lib services contexts hooks
rg -n "(TODO|FIXME)" lib services contexts hooks
```

**Documentation Sources**:
- WARP.md: Code Quality and ESLint guidance
- ESLint official docs: https://eslint.org/docs/latest/

---

#### Agent 3: Dash AI deprecation prep + oversized file inventory
**Tasks**:
- Create `services/dash-ai/` folder structure (stubs): `types.ts`, `DashAICore.ts`, `DashVoiceService.ts`, `DashMemoryService.ts`, `DashTaskManager.ts`, `DashConversationManager.ts`, `DashAINavigator.ts`, `DashUserProfileManager.ts`, `utils.ts`
- Mark `services/DashAIAssistant.ts` as deprecated with a header comment and TODO to migrate callers
- Produce an inventory of oversized files in `services/dash-ai/**` and `app/screens/**` using `npm run check:file-sizes`

**Acceptance**:
- `services/dash-ai/` exists with stub files (compiles even as stubs)
- Deprecation header added to `services/DashAIAssistant.ts`
- Oversized file list captured in a report file at `docs/OBSOLETE/oversized-report-2025-10-21.md`

**Verify**:
```bash
npm run typecheck
npm run check:file-sizes
rg -n "DashAIAssistant" # to confirm deprecation comment present
```

**Documentation Sources**:
- WARP.md: Preferred Architecture Patterns, File Size Standards
- React Native 0.79: https://reactnative.dev/docs/0.79/getting-started

---

#### Agent 4: SQL hygiene + TierBadge unification plan
**Tasks**:
- Scan repository for direct-run SQL and .sql files outside `supabase/migrations`
- For each found:
  - `supabase migration new migrate-found-sql-YYYYMMDD`
  - Move SQL into migration; `npm run lint:sql`; `supabase db push`; `supabase db diff` (must be clean)
  - Delete or archive original .sql file
- Locate duplicate TierBadge components; choose canonical: `components/ui/badges/TierBadge.tsx`; create directory if needed
- Update imports across repo; remove duplicates

**Acceptance**:
- 0 .sql files outside `supabase/migrations`
- `supabase db diff` shows no changes after push
- Only one TierBadge implementation remains at `components/ui/badges/TierBadge.tsx`
- All imports updated, app compiles

**Verify**:
```bash
fd -uu -t f -e sql -E "supabase/migrations/*"
npm run lint:sql && supabase db diff
fd -uu -a -t f "TierBadge*.tsx" components
npm run typecheck
```

**Documentation Sources**:
- WARP.md: Database Operations (NON-NEGOTIABLE)
- Supabase CLI: https://supabase.com/docs/reference/cli
- SQLFluff: https://docs.sqlfluff.com/

---

### Phase: Week 1

#### Agent 1 (Lead): CI/CD gates and governance docs
**Tasks**:
- Ensure CI enforces: typecheck, lint, check:file-sizes, lint:sql
- Add this task doc to `docs/governance/` index (README) and reference from root README.md if critical
- Add `.github/PULL_REQUEST_TEMPLATE.md` with PR checklist (see section 7 below)

**Acceptance**:
- CI fails if any gate fails
- `docs/governance/README.md` lists this file
- PR template live

**Verify**: Trigger CI on PR to see gates

**Documentation Sources**: WARP.md: CI/CD Integration, Documentation Organization Policy

---

#### Agent 2: ESLint to zero warnings in owned paths + TODO conversion
**Tasks**:
- Reduce ESLint warnings in `lib/**`, `services/**` (excluding `services/dash-ai/**`), `contexts/**`, `hooks/**` to 0
- Replace remaining `TODO[...]`: link to GitHub issues or ROAD-MAP items

**Acceptance**:
- `eslint lib services contexts hooks --max-warnings 0` passes
- 0 bare TODO/FIXME and all `TODO[...]/FIXME[...]` have links

**Verify**:
```bash
npm run lint
rg -n "(TODO|FIXME)" lib services contexts hooks
```

---

#### Agent 3: Remove deprecated DashAIAssistant.ts; migrate to modular services
**Tasks**:
- Move functionality into `services/dash-ai/*` modules per WARP's "After" example
- Update all imports to use DashAICore and related modules
- Delete `services/DashAIAssistant.ts` (or move to `archive/`)

**Acceptance**:
- `rg -n "DashAIAssistant"` returns 0 usage in src
- `npm run typecheck` and `npm run lint` pass

**Verify**:
```bash
rg -n "DashAIAssistant" --glob "!archive/**"
npm run typecheck && npm run lint
```

**Documentation Sources**: WARP.md: Refactoring Examples (DashAIAssistant split)

---

#### Agent 4: Complete TierBadge unification + SQL drift-free
**Tasks**:
- Ensure TierBadge styles and props stable; add types if missing
- Create a barrel export if needed: `components/ui/badges/index.ts`
- Ensure all SQL is via migrations; run full db inspection scripts

**Acceptance**:
- Single canonical import path for TierBadge across repo
- `npm run inspect-db` and `npm run inspect-db-full` execute successfully (if configured)
- `supabase db diff` clean

**Verify**:
```bash
rg -n "from ['\"](.*/)?TierBadge['\"]" --replace # shows only canonical path
npm run inspect-db
supabase db diff
```

---

### Phase: Weeks 1-2

#### Agent 1 (Lead): Policy enforcement and monthly audits
**Tasks**:
- Schedule monthly `npm run check:file-sizes` report
- Ensure pre-commit stays active; update docs if standards revised

**Acceptance**: Documented schedule in `docs/governance/`

---

#### Agent 2: Deep cleanup in owned paths
**Tasks**:
- Eliminate dead code flagged by ESLint/TS
- Normalize imports and path aliases

**Acceptance**: Zero dead imports (tsserver/ESLint no-unused-vars/imports clean)

**Verify**: `npm run lint -- --rule "no-unused-vars:error"`

---

#### Agent 3: File size splits for top offenders in app/screens/**
**Tasks**:
- Split screens >500 lines into container + presentational + hooks; move styles to `styles.ts`
- Ensure FlashList has `estimatedItemSize` where used

**Acceptance**:
- `npm run check:file-sizes` passes for `app/screens/**`
- Any FlashList usage includes `estimatedItemSize`

**Verify**:
```bash
npm run check:file-sizes
rg -n "FlashList" app/screens
```

---

#### Agent 4: SQL polish and RLS guardrails verification
**Tasks**:
- Run `npm run setup-rls` if applicable; verify no violations
- Confirm all migrations lint clean via `npm run lint:sql`

**Acceptance**:
- `npm run lint:sql` passes with 0 errors
- RLS setup re-confirmed (no diffs; policies intact)

**Verify**:
```bash
npm run lint:sql
supabase db diff
```

---

## 5) Cross-Cutting Guardrails

**Branching**:
- `chore/quality/a1/guardrails-setup`
- `chore/quality/a2/eslint-core-clean`
- `chore/quality/a3/dash-ai-modularization`
- `chore/quality/a4/sql-tierbadge-cleanup`

**PR Strategy**:
- Small, focused PRs per owned path
- Do not bundle cross-area changes

**Rebase**: Rebase frequently onto main to minimize conflicts

**Archive**: Move removed files to `archive/` with README pointer when helpful

---

## 6) Verification Commands (quick reference)

```bash
# TypeScript
npm run typecheck

# ESLint (target 0 warnings by end of Week 1)
npm run lint

# SQL Lint
npm run lint:sql
npm run fix:sql

# File Sizes
npm run check:file-sizes

# Backups
npm run check:backups

# Console Logs
npm run check:console

# TODOs
npm run check:todos

# Supabase
supabase migration new <name>
supabase db push
supabase db diff  # must show no changes after push
```

---

## 7) PR Checklist (add to .github/PULL_REQUEST_TEMPLATE.md)

- [ ] Follows WARP.md and ROAD-MAP.md phase scope
- [ ] Owned paths only; no cross-area edits in this PR
- [ ] TypeScript: `npm run typecheck` passes
- [ ] ESLint: `npm run lint` passes (0 warnings for owned paths)
- [ ] SQL: `npm run lint:sql` passes; no direct-run SQL files remain
- [ ] File sizes within limits (`npm run check:file-sizes`)
- [ ] No `console.log` in production code
- [ ] No bare TODO/FIXME comments remain
- [ ] Docs updated in `docs/governance/` index if applicable
- [ ] CI green; migration diff clean after push
- [ ] Documentation Sources: links to official docs used (RN, Expo, Supabase, TanStack, etc.)

---

## 8) Definition of Done (for this initiative)

- All eight issue categories resolved or guarded by CI
- ESLint warnings at 0 for all owned areas
- No direct-run SQL anywhere; migrations only; db diff clean
- `DashAIAssistant.ts` removed or archived; modular services in place
- Single canonical TierBadge implementation in `components/ui/badges/TierBadge.tsx`
- File sizes conform to WARP standards (CI gate active)
- Documentation updated per WARP policy

---

## 9) Implementation Snippets (helpers)

### scripts/scan-backups.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
rg -n --hidden --glob '!node_modules/**' '(.*(~|\.bak|\.old|\.orig|\.rej|\.tmp)$|\.DS_Store|Thumbs\.db)' || true
```

### scripts/scan-todos.sh
```bash
#!/usr/bin/env bash
set -euo pipefail
rg -n --hidden --glob '!node_modules/**' '(TODO|FIXME)' || true
```

### .eslintrc.cjs additions
```js
module.exports = {
  rules: {
    'no-console': ['error', { allow: ['warn', 'error'] }],
  },
  overrides: [
    { files: ['components/**/*.tsx'], rules: { 'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }] } },
    { files: ['app/**/*.tsx'], rules: { 'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ['services/**/*.ts'], rules: { 'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ['lib/**/*.ts'], rules: { 'max-lines': ['warn', { max: 500, skipBlankLines: true, skipComments: true }] } },
    { files: ['hooks/**/*.{ts,tsx}'], rules: { 'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }] } },
    { files: ['**/*types.{ts,tsx}'], rules: { 'max-lines': ['warn', { max: 300, skipBlankLines: true, skipComments: true }] } },
  ],
};
```

### TierBadge canonicalization steps
- Keep: `components/ui/badges/TierBadge.tsx`
- Update all imports: find and replace to the canonical path
- Delete any duplicates; ensure typecheck passes

### SQL migration recipe
```bash
supabase migration new migrate-found-sql-YYYYMMDD
# Move SQL content into new migration file
npm run lint:sql
supabase db push
supabase db diff  # must show no changes
# Remove original .sql file
```

---

## 10) Documentation Organization (WARP compliance)

- This file lives in `docs/governance/`
- Add a link entry in `docs/governance/README.md` under "Code Quality"
- Do not create new docs at the repository root

---

## 11) Risk Notes

- **Production DB usage in development**: follow WARP database rules strictly
- **New Architecture enabled**: only functional components with hooks; no deprecated lifecycles
- **Avoid touching other agents' zones** to prevent merge conflicts

---

**End of document**
