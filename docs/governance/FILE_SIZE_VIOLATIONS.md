# File Size Violations - Technical Debt

**Created**: 2025-10-22  
**Status**: Tracking  
**Priority**: Medium (P2)  

## Context

Per WARP.md file size standards:
- **Screens**: 500 lines maximum
- **Components**: 400 lines maximum
- **Services**: 500 lines maximum
- **Hooks**: 200 lines maximum

Exceeding these limits increases merge conflicts, slows code reviews, and hides bugs.

## Current Violations (from ESLint)

### Critical (>800 lines)
- `app/marketing/pricing.tsx` - **884 lines** (limit: 500)
- `app/screens/account.tsx` - **948 lines** (limit: 500)
- `app/screens/ai-lesson-generator.tsx` - **921 lines** (limit: 500)
- `app/screens/class-teacher-management.tsx` - **1030 lines** (limit: 500)
- `app/screens/dash-ai-settings-enhanced.tsx` - **1179 lines** (limit: 500)

### High Priority (700-800 lines)
- `app/(auth)/sign-in.tsx` - **703 lines** (limit: 500)
- `app/screens/activity-detail.tsx` - **732 lines** (limit: 500)
- `app/screens/school-settings.tsx` - **722 lines** (limit: 500)

### Medium Priority (600-700 lines)
- `app/admin-dashboard.tsx` - **673 lines** (limit: 500)
- `app/screens/financial-dashboard.tsx` - **576 lines** (limit: 500)
- `app/screens/financial-reports.tsx` - **586 lines** (limit: 500)
- `app/screens/financial-transactions.tsx` - **588 lines** (limit: 500)

### Lower Priority (500-600 lines)
- `app/(public)/apply/[job_id].tsx` - **551 lines** (limit: 500)
- `app/screens/email-verification.tsx` - **542 lines** (limit: 500)

## Refactoring Strategy

### 1. **pricing.tsx** (884 lines → target: <500 lines)

**Extractions**:
- `components/pricing/PricingTierCard.tsx` - Individual tier card component (~150 lines)
- `components/pricing/PricingToggle.tsx` - Annual/Monthly toggle (~50 lines)
- `lib/pricing/tierConfig.ts` - Tier configuration logic (~100 lines)
- `lib/pricing/formatters.ts` - Price formatting utils (~50 lines)

**Result**: ~480 lines remaining in main file

### 2. **dash-ai-settings-enhanced.tsx** (1179 lines → target: <500 lines)

**Extractions**:
- `components/settings/AIModelSelector.tsx` (~200 lines)
- `components/settings/VoiceSettingsPanel.tsx` (~200 lines)
- `components/settings/PersonalizationPanel.tsx` (~150 lines)
- `hooks/useAISettings.ts` (~150 lines)

**Result**: ~480 lines remaining

### 3. **class-teacher-management.tsx** (1030 lines → target: <500 lines)

**Extractions**:
- `components/teacher/TeacherList.tsx` (~250 lines)
- `components/teacher/TeacherForm.tsx` (~200 lines)
- `components/teacher/SeatAllocationPanel.tsx` (~150 lines)
- `hooks/useTeacherManagement.ts` (~150 lines)

**Result**: ~280 lines remaining

### 4. Legacy Comparison Components

**Files to deprecate or refactor**:
- `components/pricing/ComparisonTable.tsx` - Uses obsolete tier names (parent-starter, parent-plus, private-teacher, pro, preschool-pro)
- `components/pricing/PricingComparisonTable.tsx` - Likely duplicate

**Action**: Mark as deprecated, migrate users to `app/marketing/pricing.tsx` which uses production database tiers.

## Implementation Plan

### Phase 1: Critical Files (Week 1)
- [ ] Refactor `pricing.tsx`
- [ ] Refactor `dash-ai-settings-enhanced.tsx`
- [ ] Refactor `class-teacher-management.tsx`

### Phase 2: High Priority (Week 2)
- [ ] Refactor `sign-in.tsx`
- [ ] Refactor `activity-detail.tsx`
- [ ] Refactor `school-settings.tsx`

### Phase 3: Medium/Low Priority (Week 3+)
- [ ] Refactor financial screens (dashboard, reports, transactions)
- [ ] Refactor `account.tsx`
- [ ] Deprecate legacy pricing components

## Success Metrics

- All screens ≤500 lines
- All components ≤400 lines
- ESLint `max-lines` warnings = 0
- Reduced merge conflicts in refactored files
- Faster code review times

## References

- **WARP.md**: File Size & Code Organization Standards
- **COMPREHENSIVE_AUDIT_ROADMAP.md**: Phase 4 - Code Quality
- **ESLint Config**: `.eslintrc.cjs` max-lines rules
