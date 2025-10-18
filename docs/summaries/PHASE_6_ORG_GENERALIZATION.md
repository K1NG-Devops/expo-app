# Phase 6: Organization Generalization

**Status:** ✅ In Progress (Foundation Complete)  
**Started:** 2025-01-18  
**Priority:** High  
**Related:** Phase 5 (DI Conversion - Complete)

## Overview

Phase 6 removes preschool-specific assumptions from the codebase and introduces a flexible organization type system that supports multiple educational and organizational contexts (K-12 schools, universities, corporate training, sports clubs, etc.).

## Goals

- **Eliminate hardcoded "preschool" terminology** throughout the codebase
- **Support multiple organization types** with dynamic terminology mapping
- **Enable organization-specific role definitions** via dynamic roles system
- **Maintain backward compatibility** with existing preschool-focused deployments
- **Prepare for multi-market expansion** beyond South African preschools

## Architecture

### Organization Type System

Eight organization types are now supported:
- `preschool` - Traditional preschool/daycare (legacy default)
- `k12_school` - K-12 schools (primary, middle, high school)
- `university` - Higher education institutions
- `corporate` - Corporate training departments
- `sports_club` - Athletic clubs and teams
- `community_org` - Community organizations
- `training_center` - Professional training centers
- `tutoring_center` - Tutoring and test prep centers

Each type has:
- **Dynamic terminology** (e.g., "Teacher" → "Coach" for sports clubs)
- **Custom role hierarchies** (e.g., "Principal" → "Manager" for corporate)
- **Type-specific features** enabled/disabled per organization

### Database Schema Changes

#### New Columns

**`organizations` table:**
- `type` (organization_type enum) - Organization type classification
- `preschool_id` (uuid) - Legacy compatibility link to preschools table
- Additional metadata fields for multi-org support

**`profiles` table:**
- `organization_id` (uuid) - Primary organization membership (replaces preschool_id)
- `organization_type` (text) - Cached organization type for quick access
- `organization_name` (text) - Cached organization name for quick access

**`users` table:**
- `organization_id` (uuid) - Organization membership reference

#### New Tables

**`organization_roles`** - Dynamic role definitions per organization
- `organization_id` - Foreign key to organizations
- `role_id` - Internal role identifier (e.g., 'teacher', 'coach')
- `role_name` - Technical role name
- `display_name` - Human-readable label (e.g., "Coach", "Trainer")
- `capabilities` - Array of capability flags
- `hierarchy_level` - For permission inheritance
- `ai_config` - AI-specific role configurations

### API Changes

#### Tenant Context (Organization-First)

**New Primary API:**
```typescript
// Client-side
import { useActiveOrganizationId } from '@/lib/tenant/client';
import { requireOrganizationId } from '@/lib/tenant/compat';

const orgId = useActiveOrganizationId(); // Primary method
const orgId2 = requireOrganizationId(profile); // Throws if missing
```

**Legacy API (Deprecated but functional):**
```typescript
// Still works for backward compatibility
import { useActiveSchoolId } from '@/lib/tenant/client';

const schoolId = useActiveSchoolId(); // Wraps useActiveOrganizationId
```

#### Terminology Mapping

```typescript
import { getTerminology, getRoleDisplayName } from '@/lib/tenant/terminology';
import type { OrganizationType } from '@/lib/tenant/types';

// Get terminology for organization type
const terms = getTerminology('sports_club');
console.log(terms.instructor); // "Coach"
console.log(terms.member); // "Athlete"
console.log(terms.group); // "Team"

// Get role display name with org context
const displayName = getRoleDisplayName('teacher', 'corporate');
// Returns "Trainer" for corporate, "Teacher" for preschool
```

#### Dynamic Roles

```typescript
import { OrganizationRolesService } from '@/lib/services/OrganizationRolesService';

// Get organization-specific roles
const roles = await OrganizationRolesService.getRolesByOrganization(orgId);

// Initialize default roles for new organization
await OrganizationRolesService.initializeDefaultRoles(orgId, 'sports_club');

// Get merged capabilities (static + dynamic)
import { getUserCapabilities } from '@/lib/rbac';
const caps = await getUserCapabilities(role, planTier, seatStatus, organizationId);
```

### RLS Policies

All RLS policies now support **dual-field access**:
- Primary: `organization_id`
- Fallback: `preschool_id` (legacy compatibility)

Example policy pattern:
```sql
-- Check both organization_id and preschool_id
WHERE (
  profiles.organization_id = COALESCE(my_profile.organization_id, my_profile.preschool_id)
  OR
  profiles.preschool_id = COALESCE(my_profile.preschool_id, my_profile.organization_id)
)
```

Helper functions:
- `user_can_access_organization(target_org_id)` - Check access via either field
- `check_organization_access(target_preschool_id)` - RLS policy helper

## Migration Strategy

### Phase 6A: Foundation (✅ Complete)

1. **Type System & Terminology**
   - Created `lib/tenant/types.ts` with OrganizationType union
   - Created `lib/tenant/terminology.ts` with mapping functions
   - No breaking changes

2. **Compatibility Layer**
   - Created `lib/tenant/compat.ts` with organization-first API
   - All old `school*` functions proxy to new `organization*` functions
   - Deprecated old functions with JSDoc annotations

3. **Tenant Context Refactor**
   - Refactored `lib/tenant/client.ts` and `server.ts`
   - Organization ID is now primary, preschool_id is fallback
   - TenantInfo type includes `organizationType` field

4. **Database Migration**
   - Added `organization_id` to profiles and users tables
   - Backfilled from `preschool_id` where present
   - Updated `get_my_profile()` RPC to include organization fields
   - Created `profiles_with_org` view for compatibility
   - Updated RLS policies for dual-field support

5. **Dynamic Roles System**
   - Created `OrganizationRolesService` for role management
   - Extended RBAC to merge dynamic + static capabilities
   - Default role templates for each organization type

### Phase 6B: Code Sweep (In Progress)

**Goal:** Adapt high-traffic services/components to use organization-first API

**Priority areas:**
1. `lib/services/*` - Core business logic services
2. `app/screens/*` - User-facing screens
3. `services/*` - AI and feature services

**Approach:**
- Use compatibility helpers: `getActiveOrganizationId()`, `requireOrganizationId()`
- Update query filters to use `createOrganizationFilter(orgId, tableName)`
- Keep changes minimal - don't rewrite working code
- Focus on readability and future maintainability

### Phase 6C: Documentation & Testing

**Tasks:**
- Update developer documentation
- Create migration guide for custom deployments
- Add regression tests for tenant scoping
- Test multi-org scenarios in staging

### Phase 6D: UI/UX Updates (Future)

**Tasks:**
- Update UI labels to use terminology system
- Add organization type selector in settings
- Create org-type-specific dashboards
- Support multiple organization contexts per user (future)

## Breaking Changes

**None** - Phase 6 maintains full backward compatibility:

- All `preschool_id` references continue to work
- Old `useActiveSchoolId()` hook still functions
- Database dual-field support ensures no data access issues
- Default organization type is `preschool` for legacy data

## Quality Gates

### TypeScript
```bash
npm run typecheck
```
- **Status:** ✅ No new errors introduced by Phase 6
- Pre-existing errors in unrelated DI and AI components

### ESLint
```bash
npm run lint
```
- **Status:** ✅ No new warnings introduced by Phase 6
- Pre-existing warnings (200 allowed) remain under limit

### SQL Linting
```bash
npm run lint:sql
```
- **Status:** ✅ Phase 6 migration passes all SQL style checks

## File Changes

### New Files Created
- `lib/tenant/types.ts` - Organization type definitions
- `lib/tenant/terminology.ts` - Terminology mapping system
- `lib/tenant/compat.ts` - Compatibility layer
- `lib/services/OrganizationRolesService.ts` - Dynamic roles service
- `supabase/migrations/20251018_phase6_profiles_organization_alignment.sql` - Schema migration

### Modified Files
- `lib/tenant/client.ts` - Organization-first API
- `lib/tenant/server.ts` - Server-side org context
- `lib/rbac.ts` - Dynamic roles integration

## Testing Checklist

### Database
- [ ] Migration runs successfully on staging
- [ ] Backfill completes for all profiles
- [ ] RLS policies allow expected access patterns
- [ ] Dual-field queries work correctly
- [ ] `get_my_profile()` RPC returns org fields

### API
- [ ] `useActiveOrganizationId()` returns correct ID
- [ ] `requireOrganizationId()` throws when missing
- [ ] Legacy `useActiveSchoolId()` still works
- [ ] Terminology maps correctly for each org type
- [ ] Dynamic roles merge with static capabilities

### Integration
- [ ] User login works with organization context
- [ ] Teachers can access their classes
- [ ] Parents can view their children
- [ ] Principals can manage organization
- [ ] Super admins can access all organizations

## Rollout Plan

1. **Staging Deployment**
   - Deploy Phase 6 foundation to staging
   - Run migration against staging database
   - Verify all existing functionality works
   - Test new organization type features

2. **Production Deployment**
   - Deploy during low-traffic window
   - Run migration with careful monitoring
   - Verify no access issues for existing users
   - Monitor error rates and user feedback

3. **Gradual Feature Enablement**
   - Enable organization type selection for new sign-ups
   - Allow existing organizations to change type (admin only)
   - Roll out org-specific features gradually
   - Collect feedback and iterate

## Success Metrics

- **Zero** breaking changes for existing users
- **All** existing tests pass after migration
- **No increase** in error rates post-deployment
- **Positive** feedback on multi-org support from pilot users
- **Ready** to onboard non-preschool organizations

## Next Steps

1. Complete code sweep of high-traffic services
2. Update UI to use terminology system
3. Test multi-org scenarios thoroughly
4. Prepare for first non-preschool pilot
5. Document org-type-specific features

## Related Documentation

- [Phase 5: DI Conversion](/docs/summaries/PHASE_5_DI_CONVERSION.md)
- [RBAC System](/lib/rbac.ts)
- [Tenant Context](/lib/tenant/)
- [Database Migrations](/supabase/migrations/)

---

**Last Updated:** 2025-01-18  
**Status:** Foundation Complete, Code Sweep In Progress
