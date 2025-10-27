# Principal Report Approvals Dashboard Integration

**Date**: 2025-10-27  
**Status**: Core Implementation Complete ✅  
**Type**: Feature Addition

## Overview

Added pending progress report approval count and navigation to the principal dashboard, allowing principals to quickly see and access reports awaiting their review.

## Problem Statement

**Root Cause**: The principal dashboard was not displaying pending progress report approvals from teachers, even though:
- Database migration `20251025163635_add_progress_report_approval_workflow.sql` added the approval workflow
- `ProgressReportService` had methods to handle approvals
- `/screens/principal-report-review.tsx` screen existed for review

The `usePrincipalHub` hook did not query for pending reports, so the count was never displayed on the dashboard.

## Solution

### 1. Data Layer (`hooks/usePrincipalHub.ts`)

**Added**:
- `pendingReportApprovals: number` field to `PrincipalHubData` interface
- Count query in `fetchData()` using `Promise.allSettled`:
  ```ts
  assertSupabase()
    .from('progress_reports')
    .select('id', { count: 'exact', head: true })
    .eq('preschool_id', preschoolId)
    .or('approval_status.eq.pending_review,status.eq.pending_review')
  ```
- Helper function: `getPendingReportCount(data?: PrincipalHubData | null): number`

**Key Features**:
- ✅ Compatibility with both `status` and `approval_status` columns (handles schema drift)
- ✅ Multi-tenant isolation via `preschool_id` filter (RLS enforced)
- ✅ Count-only query with `head: true` for performance
- ✅ Safe extraction with fallback to 0

### 2. UI Layer - Enhanced Dashboard (`components/dashboard/NewEnhancedPrincipalDashboard.tsx`)

**Added**:
- Import: `getPendingReportCount` from `usePrincipalHub`
- Metric card definition:
  ```ts
  const reportsMetric = {
    id: 'pending_reports',
    title: 'Reports to Review',
    value: getPendingReportCount(data),
    icon: 'document-text-outline',
    color: '#F59E0B', // Amber
    trend: getPendingReportCount(data) > 0 ? 'attention' : 'stable'
  };
  ```
- Navigation handler: `case 'pending_reports': router.push('/screens/principal-report-review')`

### 3. UI Layer - Classic Dashboard (`components/dashboard/EnhancedPrincipalDashboard.tsx`)

**Added**:
- Same metric card and navigation as enhanced variant
- Consistent placement with other approval-related KPIs

## Technical Details

### Database Query
```typescript
// Compatibility query: works with both status columns
.or('approval_status.eq.pending_review,status.eq.pending_review')
```

**Why OR condition?**
- Migration `20251025163635` added `approval_status` column
- ProgressReportService still uses `status` column for writes
- Query ensures count works regardless of which column is populated

### Performance
- **Query type**: COUNT-only with `head: true` (no data transfer)
- **RLS isolation**: Filtered by `preschool_id` for tenant security
- **Caching**: Included in dashboard's `Promise.allSettled` batch
- **Expected load**: <50ms for count query on indexed column

### Security
- ✅ Multi-tenant RLS enforced via `preschool_id` filter
- ✅ Principal-only access (role-based routing in `/screens/principal-report-review.tsx`)
- ✅ No data leakage between preschools

## Files Modified

1. **hooks/usePrincipalHub.ts** (+15 lines)
   - Added `pendingReportApprovals` field
   - Added count query to `fetchData()`
   - Added `getPendingReportCount()` helper

2. **components/dashboard/NewEnhancedPrincipalDashboard.tsx** (+14 lines)
   - Imported `getPendingReportCount`
   - Added reports metric
   - Added navigation case

3. **components/dashboard/EnhancedPrincipalDashboard.tsx** (+14 lines)
   - Imported `getPendingReportCount`
   - Added reports metric
   - Added navigation case

**Total**: ~43 lines of production code added

## Validation

### Type Safety
```bash
npm run typecheck
# Result: 0 errors related to our changes (2 pre-existing errors in DashAIAssistant)
```

### Linting
```bash
npm run lint
# Result: 0 new warnings (only pre-existing file-size warnings)
```

## Usage

### For Principals
1. Open principal dashboard
2. See "Reports to Review" metric card with count
3. Tap card → navigates to `/screens/principal-report-review`
4. Approve or reject pending reports

### For Developers
```typescript
import { usePrincipalHub, getPendingReportCount } from '@/hooks/usePrincipalHub';

const { data } = usePrincipalHub();
const count = getPendingReportCount(data); // Safe: returns 0 if undefined
```

## Next Steps (Remaining TODOs)

### High Priority
1. **Real-time updates** - Subscribe to `progress_reports` changes to auto-refresh count
2. **Quick action button** - Add "Review Reports" in quick actions section

### Medium Priority
3. **Schema normalization** - Migrate to single `approval_status` column after testing
4. **Analytics** - Track "principal_review_opened", "report_approved", "report_rejected"

### Low Priority
5. **Integration** - Add progress reports tab to `principal-approval-dashboard.tsx`
6. **Documentation** - Add user-facing docs with screenshots

## Testing Checklist

- [ ] With 0 pending reports: Shows "0", card navigates correctly
- [ ] With pending reports: Shows correct count, navigates to review screen
- [ ] Multi-tenant: Counts are scoped by preschool_id (no cross-tenant leakage)
- [ ] Performance: Dashboard loads <2s on low-end Android
- [ ] Dark mode: Card colors and text contrast acceptable
- [ ] Role gating: Non-principals cannot access review screen

## Rollout Plan

1. **Phase 1** (Current): Deploy core functionality
   - OTA release (JS-only, no native changes)
   - Monitor Sentry for errors in count query

2. **Phase 2** (48-72h later): Post-deployment validation
   - Verify multi-tenant isolation
   - Check performance metrics
   - Gather user feedback

3. **Phase 3** (After validation): Schema cleanup
   - Backfill `approval_status` from `status`
   - Update service to use `approval_status` only
   - Remove compatibility OR condition

## Compatibility Notes

**Backwards Compatible**: ✅  
**Breaking Changes**: None  
**Database Changes**: None (uses existing columns)  
**Migration Required**: No (reads both status columns)

## References

- **Migration**: `supabase/migrations/20251025163635_add_progress_report_approval_workflow.sql`
- **Service**: `services/ProgressReportService.ts`
- **Review Screen**: `app/screens/principal-report-review.tsx`
- **Component**: `components/progress-report/ReportApprovalCard.tsx`

## Support

For issues or questions:
1. Check TODO list in project
2. Review `ProgressReportService.getReportsForReview()` implementation
3. Verify RLS policies on `progress_reports` table
