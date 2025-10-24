# 🎯 WARP.md Violations Fix Plan - October 2025

**Status**: Ready for Execution  
**Target Completion**: 4 weeks  
**Governance**: STRICT adherence to WARP.md + Official Documentation  
**Zero Downtime**: Continuous validation after every change

---

## 📊 Executive Summary

### Current State (Baseline)
- **159 files** violate WARP.md file size limits
- **401 ESLint warnings** (exceeds 200 limit)
- **TypeScript errors**: 0 ✅
- **6 unauthorized docs** in root directory (only README.md, WARP.md, ROAD-MAP.md allowed)

### Already Completed Refactors ✅
1. **TeacherDashboard.tsx**: 1,530 → 340 lines (78% reduction)
2. **dash-ai modularization**: Phase 4 complete (45% overall progress)
   - DashAIAssistant split into 5+ modules
   - Some modules still over limits (DashAICore.ts, DashVoiceService.ts)

### Target State
- **0 file size violations**
- **≤200 ESLint warnings** (target ≤120)
- **0 TypeScript errors**
- **Clean root directory** (only 3 authorized .md files)
- **Zero regressions** in functionality

---

## 🔥 Critical Files (Top 7 Priority)

| File | Current | Target | Overage | Priority |
|------|---------|--------|---------|----------|
| app/screens/teacher-management.tsx | 2,097 | 500 | 1,597 | 🔴 CRITICAL |
| components/dashboard/EnhancedPrincipalDashboard.tsx | 2,049 | 400 | 1,649 | 🔴 CRITICAL |
| app/screens/petty-cash.tsx | 1,875 | 500 | 1,375 | 🔴 CRITICAL |
| components/ai/DashAssistant.tsx | 1,643 | 400 | 1,243 | 🔴 CRITICAL |
| components/dashboard/ParentDashboard.tsx | 1,372 | 400 | 972 | 🔴 CRITICAL |
| services/DashPDFGenerator.ts | 1,315 | 500 | 815 | 🔴 CRITICAL |
| services/modules/DashToolRegistry.ts | 1,154 | 500 | 654 | 🔴 CRITICAL |

**Total**: 7 files, 12,505 lines → target 3,600 lines = **8,905 lines to extract**

---

## 📐 Architecture Standards (NON-NEGOTIABLE)

### Official Documentation References
- **React Native 0.79.5**: https://reactnative.dev/docs/0.79/getting-started
- **Expo SDK 53**: https://docs.expo.dev/versions/v53.0.0/
- **React 19**: https://react.dev/blog/2024/12/05/react-19
- **TanStack Query v5**: https://tanstack.com/query/v5/docs/framework/react/overview
- **Expo Router v5**: https://docs.expo.dev/router/introduction/
- **Supabase JS v2**: https://supabase.com/docs/reference/javascript/introduction
- **FlashList**: https://shopify.github.io/flash-list/docs/
- **Reanimated 3**: https://docs.swmansion.com/react-native-reanimated/

### WARP.md File Size Limits
- **Components**: ≤400 lines
- **Screens**: ≤500 lines
- **Services/Lib**: ≤500 lines
- **Hooks**: ≤200 lines
- **Types**: ≤300 lines (except auto-generated)

### Refactor Protocol (Apply to EVERY file)
1. **Backup**: `cp file.tsx file.tsx.backup`
2. **Extract**:
   - Business logic → services (≤500 lines)
   - State management → hooks (≤200 lines)
   - UI components → subcomponents (≤400 lines)
3. **Standards**:
   - Supabase v2 API (signInWithPassword, not signIn)
   - TanStack Query v5 (@tanstack/react-query)
   - Expo Router v5 (useRouter(), not React Navigation)
   - FlashList with `estimatedItemSize` for lists
   - Multi-tenant: always filter by `preschool_id`
4. **Validate**:
   ```bash
   npm run typecheck && npm run lint && npm run check:file-sizes && npm run start
   ```
5. **Commit** immediately after green checks

---

## 🚦 Execution Gates (BLOCKING)

### Gate 0: Environment Setup
**Must complete before ANY changes:**
```bash
node -v && npm -v
npm ci
git checkout -b governance/fix-warp-violations-2025-10
mkdir -p reports/baseline
npm run typecheck | tee reports/baseline/typecheck.txt
npm run lint | tee reports/baseline/eslint.txt
npm run check:file-sizes | tee reports/baseline/file-sizes.txt
```

### Gate 1: Refactor Status Confirmation
**Must confirm before Phase 1:**
- Count of already-refactored files
- Final list of 159 files still violating limits
- Verify top 7 critical files are still over limits

**Decision**: Do not proceed until sign-off received

---

## 📅 Phase Breakdown

### Phase 0: Kickoff & Baseline (Day 0, 2 hours) - BLOCKING GATE
- Environment setup
- Baseline snapshots
- Documentation review
- **Exit Criteria**: Reports directory created with baseline snapshots

### Phase 1: Documentation Organization (Day 1, 2 hours) - NON-NEGOTIABLE
**Move unauthorized root docs:**
- DASH_VOICE_FIXES_2025-10-21.md → docs/fixes/
- DEBUG_STREAMING_FORMAT.md → docs/features/
- DEBUG_VOICE_ORB.md → docs/features/
- FIX_EMAIL_NOW.md → docs/fixes/
- PR_DESCRIPTION.md → DELETE
- REFACTOR_SUMMARY.md → docs/summaries/

**Validation after EACH move:**
```bash
npm run typecheck && npm run lint
ls -1 | grep -E '\.md$' | grep -v -E '^(README\.md|WARP\.md|ROAD-MAP\.md)$'
```

**Exit Criteria**: Only README.md, WARP.md, ROAD-MAP.md in root

### Phase 2: ESLint Warning Reduction (Days 1-2, 8 hours) - CRITICAL
**Target**: ≤200 warnings (aim for ≤120)

**Strategy**:
1. Run `npm run lint:fix` (safe autofix)
2. Fix in batches of ~20 warnings:
   - unused-vars: remove or prefix with `_`
   - exhaustive-deps: add deps or use useCallback/useMemo
   - literal-strings: move to i18n or justify
3. Validate after each batch:
   ```bash
   npm run typecheck && npm run lint
   ```

**Exit Criteria**: 
- ESLint warnings ≤200
- TypeScript errors = 0

### Phase 3: File Refactoring (Weeks 1-4) - SYSTEMATIC
**Week 1**: Critical files 1-7 (top priority)
**Week 2**: High-priority files (500-1000 lines over)
**Weeks 3-4**: Medium-priority files (remaining 152 files)

**Refactor Protocol Applied to EACH File**:
```bash
# 1. Backup
cp app/screens/teacher-management.tsx app/screens/teacher-management.tsx.backup

# 2. Extract (see detailed plans per file in TODO list)
# 3. Validate continuously
npm run typecheck && npm run lint && npm run check:file-sizes

# 4. Test runtime
npm run start

# 5. Commit
git commit -m "refactor(teacher-management): split per WARP size limits"
```

### Phase 4: Console.log Cleanup (Optional, 4 hours)
**Scope**: services/** and lib/** only
- Guard with `__DEV__`: `if (__DEV__) { console.log(...); }`
- Or route to Sentry for production

### Phase 5: Comprehensive Validation (Final, 6 hours)
**Full Quality Gates**:
```bash
npm run typecheck
npm run lint
npm run check:file-sizes
npm run android
```

**Manual Smoke Tests**:
- All dashboards (Teacher, Parent, Principal, Superadmin)
- AI Assistant with streaming
- Voice orb functionality
- Finance flows (Petty Cash, PDF generation)

**Success Criteria (ALL must pass)**:
- ✅ Root has ONLY 3 .md files
- ✅ ESLint warnings ≤200
- ✅ TypeScript errors = 0
- ✅ File size violations = 0
- ✅ App builds and runs
- ✅ No functional regressions

---

## 🛡️ Continuous Guardrails (ENFORCE ALWAYS)

### After EVERY 20-30 Lines Changed
```bash
npm run typecheck && npm run lint
```

### After EVERY File Refactor
```bash
npm run typecheck && npm run lint && npm run check:file-sizes
npm run start  # validate app still runs
mkdir -p reports/file-size-journey
npm run check:file-sizes | tee "reports/file-size-journey/$(date +%F-%H%M)-post-file.txt"
```

### Commit Discipline
- One file per commit
- Descriptive messages referencing WARP.md
- Examples:
  - `refactor(teacher-management): split per WARP size limits`
  - `chore(lint): reduce ESLint warnings to ≤200`
  - `docs(governance): move unauthorized files per Documentation Policy`

---

## 📈 Tracking & Reporting

### Artifacts
- **Baseline**: reports/baseline/*.txt
- **Progress**: docs/governance/refactor-tracker-2025-10.md
- **Journey**: reports/file-size-journey/*.txt (snapshot after each file)

### Refactor Tracker Format
| File | Size Before | Size After | Reduction | Date | Validations | Status |
|------|-------------|------------|-----------|------|-------------|--------|
| teacher-management.tsx | 2097 | 450 | 78% | 2025-10-25 | ✅ typecheck, lint, size, runtime | DONE |

### Final Reports
- reports/final/typecheck.txt (0 errors)
- reports/final/eslint.txt (≤200 warnings)
- reports/final/file-sizes.txt (0 violations)
- One-page executive summary

---

## ⚠️ Risk Mitigation

### Backup Strategy
- Original file kept as `.backup` next to refactored version
- Git branch protects main/develop
- Rollback via `git restore` or `.backup` file

### Zero Downtime
- App must compile and run after every refactor
- Keep dev server running during changes
- Validate runtime behavior immediately

### API Compatibility
- No breaking changes to component props
- No breaking changes to route params
- No breaking changes to exported service functions
- Maintain identical behavior

---

## 🎯 Success Metrics

### Quantitative
- File size violations: 159 → 0 (100% reduction)
- ESLint warnings: 401 → ≤200 (≥50% reduction, target 70%)
- TypeScript errors: 0 → 0 (maintained)
- Lines of code extracted: ~8,905 lines across top 7 files

### Qualitative
- Improved code maintainability
- Reduced merge conflict risk
- Faster code reviews (smaller PRs)
- Better testability (isolated components/hooks)
- Consistent architecture patterns

---

## 📞 Communication Protocol

### Daily Check-ins
- Report progress on refactor tracker
- Flag any blockers immediately
- Share snapshot from reports/file-size-journey

### Sign-off Gates
- **Before Phase 1**: Confirm refactor status (Gate 1)
- **After Phase 2**: Validate ESLint reduction
- **After Top 7**: Validate critical files refactored
- **Before Merge**: Full Phase 5 validation pass

---

## 🔗 References

- **Master Governance**: docs/governance/WARP.md
- **Audit Roadmap**: docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md
- **Refactor Status**: docs/summaries/REFACTORING_STATUS_REPORT.md
- **Official Docs**: See Appendix A in TODO list
- **Version Matrix**: WARP.md Section "Version Compatibility Matrix"

---

## ✅ Ready to Execute

This plan is:
- ✅ Aligned with WARP.md governance
- ✅ Follows official documentation (RN 0.79, Expo 53, React 19, TanStack Query v5)
- ✅ Zero downtime (continuous validation)
- ✅ Systematic and trackable
- ✅ Risk-mitigated (backups, gates, rollback)

**Next Step**: Execute Gate 0 (Kickoff & Baseline) and await sign-off at Gate 1 before Phase 1.
