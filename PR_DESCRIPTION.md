# Code Quality Fixes - Phase 0 Infrastructure & Quick Wins

## 🎯 Overview
This PR implements Phase 0 (48h quick wins) of the Code Quality Fixes Initiative per WARP.md and ROAD-MAP.md, establishing infrastructure for ongoing quality improvements and fixing critical issues.

**Branch**: `chore/quality/a1/guardrails-setup`  
**Commits**: 5  
**Lines Changed**: ~150 additions, ~20 deletions  
**Status**: ✅ Ready for Review

---

## ✅ What's Included

### 1. **Repository Hygiene & Infrastructure** ✓
- ✅ Created comprehensive task document (`docs/governance/CODE_QUALITY_FIXES_TASK_2025-10-21.md`)
- ✅ Added quality scan scripts:
  - `scripts/scan-backups.sh` - Detects backup file artifacts
  - `scripts/scan-todos.sh` - Tracks TODO/FIXME comments
- ✅ Enhanced `.gitignore` with comprehensive backup file patterns:
  - `*.bak`, `*.old`, `*.orig`, `*.rej`, `*.tmp`, `*.backup`
  - `*_BASE_*`, `*_LOCAL_*`, `*_REMOTE_*` (merge artifacts)
  - `.DS_Store`, `Thumbs.db`
- ✅ Added npm scripts:
  - `npm run check:backups`
  - `npm run check:todos`
  - `npm run check:console`
- ✅ Deleted backup files:
  - `app/_layout.tsx.backup`
  - `components/dashboard/NewEnhancedParentDashboard_BASE_490480.tsx`

### 2. **ESLint Configuration Updates** ✓
- ✅ Added `no-console` error rule (allows `console.warn`/`console.error` for debugging)
- ✅ Added `max-lines` enforcement per WARP.md File Size Standards:
  - Components ≤ 400 lines
  - Screens ≤ 500 lines
  - Services/lib ≤ 500 lines
  - Hooks ≤ 200 lines
  - Types ≤ 300 lines (except auto-generated)
- ✅ File size violations now visible in lint output

### 3. **Component Consolidation** ✓
- ✅ Removed duplicate TierBadge at `components/ai/TierBadge.tsx`
- ✅ Updated import in `DashAssistant.tsx` to canonical path
- ✅ Single source of truth: `components/ui/TierBadge.tsx`

### 4. **Service Deprecation** ✓
- ✅ Added comprehensive deprecation notice to `services/DashAIAssistant.ts`
- ✅ Documented migration path to modular `services/dash-ai/*` structure
- ✅ Stub marked for removal after migration verification (ROAD-MAP Phase 3)

### 5. **Console.log Cleanup (Batch 1)** ✓
- ✅ Cleaned 10+ console.log instances from core app files:
  - `app/+not-found.tsx` - Converted to `console.warn` for `__DEV__` debugging
  - `app/_layout.tsx` - Removed Dash initialization log
  - `app/demo-index.tsx` - Removed URL open failure log
  - `app/biometric-test.tsx` - Removed translation hook debug log

---

## 📊 Impact Metrics

**Before**:
- ESLint warnings: 200+
- Backup files: 2
- Duplicate components: 2 (TierBadge)
- File size enforcement: None
- Console.log enforcement: None

**After**:
- ESLint warnings: ~300-400 (increased due to new rules detecting violations)
- Backup files: 0 ✅
- Duplicate components: 0 ✅
- File size enforcement: Active ✅
- Console.log enforcement: Active ✅

**Note**: ESLint warnings increased because we added stricter rules. This is expected and helps us track technical debt systematically.

---

## 🚧 Known Remaining Work

### High Priority (Phase 3 - Console.log Cleanup)
- ~100+ console.log instances remaining across codebase
- Top files requiring attention:
  - `app/profiles-gate.tsx` (8 instances)
  - `app/(auth)/sign-in.tsx` (4 instances)
  - `app/screens/teacher-management.tsx` (10+ instances)
  - `app/screens/subscription-upgrade-post.tsx` (10+ instances)
  - Plus 35+ other files

### Medium Priority (Phase 6 - SQL Migration)
- Direct-run SQL files in `sql/fixes/*`, `sql/debug/*`, `sql/archive/*`
- Need conversion to Supabase migrations per WARP.md database rules

### Medium Priority (Phase 8 - TODO/FIXME Triage)
- Hundreds of TODO/FIXME comments found
- Need conversion to tracked format or removal

### Long-term (File Splitting)
- 57+ files exceed WARP.md size limits
- Documented in `docs/governance/CODE_QUALITY_FIXES_TASK_2025-10-21.md`

---

## 🧪 Testing

### Verification Commands Run
```bash
✅ npm run typecheck           # 0 errors
✅ npm run lint                 # Runs with new rules active
✅ npm run check:file-sizes     # Detects 57+ oversized files
✅ npm run check:backups        # No backup files found
✅ npm run check:console        # Detects remaining console.log
```

### Build Status
- ⏳ **Development APK**: Build blocked by zod version incompatibility in EAS CLI
- ✅ **TypeScript**: Compiles successfully (0 errors)
- ⚠️ **ESLint**: New rules detect existing issues (expected)

**Build Issue**: EAS CLI has `zod_1.z.codec is not a function` error. This is a known zod v3/v4 compatibility issue and does not affect the code quality improvements in this PR.

---

## 📋 PR Checklist

- [x] Follows WARP.md and ROAD-MAP.md phase scope
- [x] TypeScript: `npm run typecheck` passes (0 errors)
- [x] ESLint: New rules added and active
- [x] File sizes: New enforcement active
- [x] Backup files: All removed
- [x] Duplicate components: Consolidated
- [x] Documentation: Task document created in `docs/governance/`
- [x] Commit messages: Follow conventional commit format
- [x] No production code broken

---

## 🎯 Next Steps After Merge

1. **Build Resolution**: Fix zod compatibility to enable EAS builds
2. **Phase 3 Continuation**: Systematic console.log cleanup
3. **Phase 6**: SQL migration conversion
4. **Phase 7**: Complete ESLint autofix
5. **Phase 9**: File splitting for oversized components

---

## 📚 Documentation Sources

- WARP.md: Code Quality & File Size Standards, Governance Policy
- ROAD-MAP.md: Phase 0 quick wins, Phase 4 code quality
- ESLint no-console: https://eslint.org/docs/latest/rules/no-console
- ESLint max-lines: https://eslint.org/docs/latest/rules/max-lines
- React Native 0.79: https://reactnative.dev/docs/0.79/getting-started
- Expo SDK 53: https://docs.expo.dev/versions/v53.0.0/

---

## 👥 Reviewers

Please review with focus on:
1. ESLint configuration changes (ensure rules don't break existing workflows)
2. `.gitignore` additions (ensure no legitimate files are excluded)
3. Task document completeness (will guide future cleanup work)
4. TierBadge consolidation (verify no imports broken)

**Estimated Review Time**: 15-20 minutes

---

**Author**: Code Quality Initiative - Agent 1  
**Date**: 2025-10-21  
**Related**: ROAD-MAP.md Phase 0-4, WARP.md Code Quality Standards
