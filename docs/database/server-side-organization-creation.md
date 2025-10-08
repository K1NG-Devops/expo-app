# Server-Side Organization Creation

**Date**: 2025-10-07  
**Migration**: `20251007064347_create_organization_rpc.sql`  
**Service**: `services/OrganizationService.ts`

## Overview

Organization creation has been moved entirely server-side using a PostgreSQL RPC (Remote Procedure Call) function. This resolves RLS (Row-Level Security) policy conflicts that were blocking client-side organization creation.

## Problem Statement

Previously, organization creation was performed client-side via direct INSERT operations:

```typescript
// OLD APPROACH - PROBLEMATIC
const { data, error } = await supabase
  .from('organizations')
  .insert({
    name: orgName,
    created_by: user.id,
    type: orgType,
    // ...
  });
```

This approach failed because:

1. **RLS Policy Conflicts**: The RLS policies on the `organizations` table required:
   - The user's `preschool_id` to match the new organization's ID (impossible during creation)
   - Principal/teacher role verification tied to existing organization membership

2. **Chicken-and-Egg Problem**: New principals creating their first organization had no existing `preschool_id` to satisfy tenant isolation checks.

3. **Security Complexity**: Client-side creation exposed potential race conditions and validation bypasses.

## Solution Architecture

### Server-Side RPC Function

Created `public.create_organization()` function with `SECURITY DEFINER` privileges:

```sql
CREATE OR REPLACE FUNCTION public.create_organization(
  p_name TEXT,
  p_type TEXT DEFAULT 'preschool',
  p_phone TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active'
)
RETURNS TABLE(...)
SECURITY DEFINER
```

**Key Features**:

1. **Automatic Authentication Check**: Verifies `auth.uid()` is present
2. **Role Validation**: Only principals and superadmins can create organizations
3. **Input Validation**: Validates name, type, and status server-side
4. **Automatic Profile Linking**: Updates creator's `preschool_id` to new organization
5. **Atomic Operation**: All steps in single transaction

### TypeScript Service Wrapper

Created `services/OrganizationService.ts` with clean API:

```typescript
import { createOrganization } from '@/services/OrganizationService';

// Usage
const org = await createOrganization({
  name: 'My Preschool',
  type: 'preschool',
  phone: '+27123456789',
  status: 'pending'
});
```

**Benefits**:

- Type-safe parameters and return values
- User-friendly error messages
- Client-side validation for better UX
- Consistent error handling

### Updated Client Code

Modified `app/screens/org-onboarding.tsx`:

**Before**:
```typescript
const { data, error } = await supabase
  .from('organizations')
  .insert(payload)
  .select('id')
  .single();
```

**After**:
```typescript
const created = await createOrganization({
  name: orgName.trim(),
  type: orgKind,
  phone: phone.trim() || null,
  status: 'pending',
});
```

## Security Model

### RLS Policies

The RPC function bypasses RLS for the insert operation but enforces security through:

1. **Authentication**: Must be logged in (`auth.uid()` check)
2. **Authorization**: Must be principal or superadmin (role check)
3. **Ownership**: Automatically sets `created_by` to authenticated user
4. **Audit Trail**: All fields tracked for compliance

### Permission Hierarchy

- **Superadmin**: Full access via service role policies
- **Principal**: Can create organizations (via RPC only)
- **Teacher**: Cannot create organizations
- **Parent**: Cannot create organizations

### Data Validation

Server-side validation ensures:

- Organization name is required and non-empty
- Type is one of: `preschool`, `daycare`, `primary_school`, `skills`, `tertiary`, `org`, `other`
- Status is one of: `active`, `inactive`, `pending`
- Phone is optional and nullable

## Migration Path

### Database Changes

```sql
-- Migration applied to remote: 20251007064347_create_organization_rpc.sql

1. CREATE FUNCTION public.create_organization(...)
2. GRANT EXECUTE ON FUNCTION TO authenticated
3. ADD COMMENT for documentation
```

**No schema changes** to existing tables - this is purely a procedural addition.

### Code Changes

1. **New Service**: `services/OrganizationService.ts`
   - `createOrganization()` - Main function
   - `getOrganization()` - Fetch by ID
   - `updateOrganization()` - Update details

2. **Updated Screens**:
   - `app/screens/org-onboarding.tsx` - Now uses RPC

3. **Unchanged**:
   - `app/screens/principal-onboarding.tsx` - Uses separate `register_new_school` RPC
   - `app/screens/super-admin/school-onboarding-wizard.tsx` - Admin workflows

## Testing Checklist

- [x] Migration linted with SQLFluff
- [x] Migration pushed to remote database
- [x] TypeScript compiles without errors
- [ ] Manual test: Principal creates organization via onboarding
- [ ] Verify profile gets linked to new organization
- [ ] Verify RLS policies allow access to new organization
- [ ] Test error cases (non-principal, missing name, etc.)
- [ ] Verify audit trail in database

## Error Handling

### Common Error Codes

| Code | Meaning | User Message |
|------|---------|--------------|
| `42501` | Permission denied | "Only principals and superadmins can create organizations" |
| `22023` | Invalid input | Specific validation message from server |
| No auth | Not authenticated | "Not authenticated" |

### Client-Side Validation

Before calling RPC, validate:
- Organization name is non-empty (trimmed)
- User is authenticated

Server-side will handle:
- Role verification
- Type/status validation
- Duplicate detection (if implemented)

## Rollback Procedure

If issues arise:

```sql
-- Drop the RPC function
DROP FUNCTION IF EXISTS public.create_organization(TEXT, TEXT, TEXT, TEXT);

-- Revert client code to direct inserts (not recommended)
```

**Note**: Rollback is NOT recommended as it reintroduces the RLS policy conflicts. Instead, fix bugs in the RPC function.

## Future Enhancements

1. **Duplicate Detection**: Check for existing organizations with same name
2. **Email Verification**: Trigger welcome email on creation
3. **Subscription Integration**: Auto-create free plan subscription
4. **Audit Logging**: Log to `audit_log` table (currently commented out)
5. **Batch Creation**: Support creating multiple organizations (superadmin)
6. **Soft Delete**: Add `deleted_at` column for soft deletes

## Related Documentation

- RLS Policies: `docs/security/rls-policies.md`
- Multi-Tenant Architecture: `docs/architecture/multi-tenant.md`
- Migration Guide: `docs/database/migrations.md`
- Organization Model: `docs/database/schema/organizations.md`

## Support

For issues or questions:
- Check Supabase logs for RPC errors
- Review `services/OrganizationService.ts` error handling
- Verify user role in `profiles` table
- Ensure migration applied successfully
