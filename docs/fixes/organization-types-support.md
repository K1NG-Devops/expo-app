# Organization Types Support

**Date**: 2025-10-29  
**Status**: Implemented

## Overview

The registration system now supports **multiple organization types**, not just preschools. Parents can register and request to join any of the following organization types:

## Supported Organization Types

1. **Preschool** (`preschool`)
   - Early childhood education centers
   - Daycare facilities
   - Pre-K programs

2. **K-12 School** (`k12_school`)
   - Primary schools (Grade R-7)
   - Secondary schools (Grade 8-12)
   - Combined schools (Grade R-12)
   - International schools

3. **University** (`university`)
   - Higher education institutions
   - Colleges
   - Technical universities

4. **Training Center** (`training_center`)
   - Skills development centers
   - Vocational training facilities
   - Professional certification centers
   - Adult education programs

5. **Tutoring Center** (`tutoring_center`)
   - After-school tutoring
   - Subject-specific learning centers
   - Test prep centers

6. **Sports Club** (`sports_club`)
   - Youth sports organizations
   - Athletic clubs
   - Recreational sports programs

7. **Community Organization** (`community_org`)
   - Community learning centers
   - Non-profit education programs
   - Youth development organizations

8. **Corporate** (`corporate`)
   - Corporate training programs
   - Employee development centers
   - Internal learning platforms

## Database Schema

The `organizations` table uses the `organization_type` enum:

```sql
CREATE TYPE organization_type AS ENUM (
    'preschool',
    'k12_school',
    'university',
    'corporate',
    'sports_club',
    'community_org',
    'training_center',
    'tutoring_center'
);
```

## UI Updates

### Organization Selector Component

Location: `/web/src/components/auth/PreschoolSelector.tsx` (renamed to OrganizationSelector)

**Features**:
- Displays organization type badge (e.g., "K-12 School", "Training Center")
- Search by name, address, description, **or type**
- Type-specific formatting in UI

**Example Display**:
```
Young Eagles Academy (Preschool)
123 Main St, Johannesburg

Elite Skills Training (Training Center)
456 Oak Ave, Cape Town

Johannesburg Sports Club (Sports Club)
789 Park Rd, Johannesburg
```

### Parent Signup Form

Location: `/web/src/app/sign-up/parent/page.tsx`

**Updated Label**:
```
Select Organization *
(Preschool, School, Aftercare, Training Center, etc.)
```

## Migration Updates

File: `supabase/migrations/20251029200000_add_parent_preschool_selection.sql`

**Key Changes**:
1. **Dual Table Support**: Works with both `organizations` (primary) and `preschools` (legacy)
2. **Organization Type Field**: Includes `type` in query results
3. **Flexible Address Format**: Combines `address_line1` and `city` for display
4. **Legacy Compatibility**: `get_public_preschools()` function still works

## API Updates

### New Function: `get_public_organizations()`

Returns all public organizations with their types:

```sql
SELECT id, name, type, description, address, logo_url, website, phone, email
FROM organizations
WHERE is_public = TRUE
  AND accepting_registrations = TRUE
  AND is_active = TRUE
ORDER BY name;
```

### Legacy Function: `get_public_preschools()`

Still supported for backward compatibility, queries `preschools` table only.

## Registration Service

Location: `/web/src/lib/services/registrationService.ts`

The unified registration service now handles organization types:

```typescript
// Service already supports organization_id
await this.supabase
  .from("parent_join_requests")
  .insert({
    parent_id: userId,
    organization_id: params.organizationId, // Not preschool_id
    status: "pending",
  });
```

## User-Facing Terminology

**Before**: "Preschool", "Select Preschool"  
**After**: "Organization", "Select Organization (Preschool, School, Aftercare, etc.)"

**Maintains**: User-friendly labels with organization type badges for clarity

## Benefits

1. **Broader Market**: No longer limited to preschools
2. **Clear Differentiation**: Parents can see organization type at a glance
3. **Flexible Registration**: Same flow works for all organization types
4. **Backward Compatible**: Existing preschool data still works

## Testing

Verify the following organization types display correctly:

```bash
# Add test organizations of different types
INSERT INTO organizations (name, type, is_public, accepting_registrations, is_active)
VALUES 
  ('Test Preschool', 'preschool', true, true, true),
  ('Test K-12 School', 'k12_school', true, true, true),
  ('Test Training Center', 'training_center', true, true, true),
  ('Test Sports Club', 'sports_club', true, true, true);
```

Then visit `/sign-up/parent` and verify:
- [ ] All organization types appear in dropdown
- [ ] Organization type badges display correctly (e.g., "K-12 School")
- [ ] Search by type works (search "school" finds k12_school)
- [ ] Join request creates with `organization_id`

## Future Enhancements

1. **Type-Specific Features**: Different features per organization type
2. **Type-Specific Roles**: Different role structures for schools vs training centers
3. **Type-Specific Dashboards**: Customized dashboard per organization type
4. **Type Filtering**: Allow parents to filter by organization type in search
5. **Multi-Type Organizations**: Support organizations with multiple types (e.g., "K-12 School + Aftercare")

## Related Files

- Migration: `supabase/migrations/20251029200000_add_parent_preschool_selection.sql`
- Component: `web/src/components/auth/PreschoolSelector.tsx` (OrganizationSelector)
- Signup Page: `web/src/app/sign-up/parent/page.tsx`
- Service: `web/src/lib/services/registrationService.ts`
- Type Enum: `supabase/migrations/20251017203336_organization_generalization_phase3b_revised.sql`
