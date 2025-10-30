# Registration System Analysis & Proposed Fix

**Date**: 2025-10-29  
**Issue**: Parent registration failing with "Could not find the 'full_name' column of 'users' in the schema cache"

## Current State Analysis

### 1. Database Schema Reality

From migrations and code analysis:

**Two Profile Tables Exist:**
- `users` table: Created in migration `20250917145000_remote_schema_sync.sql` with columns: `id`, `email`, `first_name`, `last_name`, `role`, `organization_id`
- `user_profiles` table: Created in `20250919000900_surgical_auth_fix.sql` with columns: `id`, `auth_user_id`, `email`, `full_name`
- `profiles` table: Referenced in migration `20251022_fix_parent_profile_creation.sql` - appears to be the primary table

**Inconsistency**: Code tries to insert into `users` with `full_name` column, but `users` table has `first_name` and `last_name` instead.

### 2. Registration Flow Issues

#### Parent Registration (Web - `/web/src/app/sign-up/parent/page.tsx`)
```typescript
// ❌ PROBLEM: Inserting into 'users' with 'full_name' column
const { error: profileError } = await supabase
  .from('users')
  .insert({
    auth_user_id: authData.user.id,
    email: email,
    full_name: fullName,  // ← Column doesn't exist in 'users'
    role: 'parent',
    phone_number: phoneNumber || null,
  });
```

**Current Issues:**
- No invitation code/token support
- No preschool selection mechanism
- Trying to insert `full_name` into `users` table (column doesn't exist)
- Should insert into `profiles` table instead

#### Teacher Registration (Mobile - `app/screens/teacher-registration.tsx`)
- Uses `EnhancedAuthService.registerTeacher()`
- Supports invitation tokens
- Creates profile via `createEnhancedProfile()`

#### Principal Registration
- Uses `EnhancedAuthService.registerPrincipal()`
- Creates organization record
- Has full onboarding flow

### 3. Profile Creation Patterns

**Three Different Approaches Exist:**

1. **Web Parent Signup**: Direct insert into `users` table (broken)
2. **EnhancedAuthService**: Uses `createEnhancedProfile()` helper
3. **Database Trigger**: `create_profile_for_new_user()` creates profile in `profiles` table on auth.users insert

**Problem**: No consistency across registration flows!

### 4. Missing Features

#### No Preschool Selection for Parents
- Parents have no way to choose which preschool/school to join
- No "browse organizations" functionality
- Current system assumes invitation-based only (per `EnhancedAuthService`)

#### Invitation System Incomplete
- `EnhancedAuthService.registerParent()` **requires** invitation token
- Web signup form doesn't support invitation codes
- Mobile parent registration expects invitation flow

## Proposed Solution

### Phase 1: Fix Immediate 400 Error (Quick Fix)

**Option A: Use `profiles` table (Recommended)**
```typescript
// Fix web/src/app/sign-up/parent/page.tsx
const { error: profileError } = await supabase
  .from('profiles')  // ← Use profiles table
  .insert({
    id: authData.user.id,  // ← Profile ID = Auth User ID
    email: email,
    first_name: fullName.split(' ')[0] || fullName,  // ← Split name
    last_name: fullName.split(' ').slice(1).join(' ') || '',
    role: 'parent',
    phone: phoneNumber || null,
  });
```

**Option B: Split full_name into first_name/last_name for `users` table**
```typescript
// If we want to keep using 'users' table
const nameParts = fullName.trim().split(' ');
const { error: profileError } = await supabase
  .from('users')
  .insert({
    id: authData.user.id,  // ← Users table uses auth ID as PK
    email: email,
    first_name: nameParts[0] || fullName,
    last_name: nameParts.slice(1).join(' ') || '',
    role: 'parent',
    phone_number: phoneNumber || null,
  });
```

### Phase 2: Standardize Registration System (Architectural Fix)

#### 1. Consolidate Profile Tables

**Decision Required**: Which table is the source of truth?

**Recommended**: Use `profiles` table as primary
- Already has database trigger (`create_profile_for_new_user()`)
- Referenced in latest migration (20251022)
- Consistent with Supabase Auth best practices

**Action Items:**
1. Verify `profiles` table schema in production database
2. Migrate data from `users` and `user_profiles` to `profiles`
3. Update all code to use `profiles` table exclusively
4. Deprecate `users` and `user_profiles` tables

#### 2. Implement Preschool Selection for Parents

**Two Registration Flows:**

**Flow A: Invitation-Based (Existing)**
- Parent receives invitation from preschool (via email/SMS)
- Invitation contains token + preschool ID
- Registration auto-links to preschool
- **Status**: Already implemented in `EnhancedAuthService`

**Flow B: Self-Service (New)**
- Parent signs up without invitation
- Browse/search available preschools during signup
- Select preschool from dropdown/search
- Submit join request
- Preschool admin approves/rejects

**Implementation:**
```typescript
// Add to sign-up flow
const { data: preschools } = await supabase
  .from('preschools')
  .select('id, name, address, logo_url')
  .eq('is_public', true)  // Only show public preschools
  .eq('accepting_registrations', true)
  .order('name');

// On submit
const { error } = await supabase
  .from('parent_join_requests')
  .insert({
    parent_id: authData.user.id,
    preschool_id: selectedPreschoolId,
    status: 'pending',
    requested_at: new Date().toISOString(),
  });
```

#### 3. Unified Registration Service

**Create**: `/web/src/lib/services/registrationService.ts`

```typescript
export class RegistrationService {
  /**
   * Universal registration handler
   * Supports: parent, teacher, principal roles
   * Handles: invitation tokens, preschool selection, profile creation
   */
  async registerUser(params: {
    role: 'parent' | 'teacher' | 'principal';
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    invitationToken?: string;
    preschoolId?: string;
    organizationData?: OrganizationSetup;
  }): Promise<RegistrationResult> {
    // 1. Validate invitation token if provided
    if (params.invitationToken) {
      await this.validateInvitation(params.invitationToken, params.role);
    }

    // 2. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: params.email.toLowerCase(),
      password: params.password,
      options: {
        data: {
          first_name: params.firstName,
          last_name: params.lastName,
          role: params.role,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    });

    if (authError) throw authError;

    // 3. Create profile (using profiles table)
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email: params.email,
        first_name: params.firstName,
        last_name: params.lastName,
        role: params.role,
        phone: params.phone,
      });

    if (profileError) throw profileError;

    // 4. Role-specific setup
    if (params.role === 'parent') {
      await this.handleParentSetup(authData.user!.id, params);
    } else if (params.role === 'teacher') {
      await this.handleTeacherSetup(authData.user!.id, params);
    } else if (params.role === 'principal') {
      await this.handlePrincipalSetup(authData.user!.id, params);
    }

    return { success: true, user: authData.user! };
  }

  private async handleParentSetup(userId: string, params: any) {
    if (params.invitationToken) {
      // Auto-link via invitation
      await this.linkParentViaInvitation(userId, params.invitationToken);
    } else if (params.preschoolId) {
      // Create join request
      await supabase.from('parent_join_requests').insert({
        parent_id: userId,
        preschool_id: params.preschoolId,
        status: 'pending',
      });
    }
  }
}
```

### Phase 3: Database Schema Alignment

**Migration**: `20251029_consolidate_profile_tables.sql`

```sql
-- Step 1: Ensure profiles table has all necessary columns
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id),
  ADD COLUMN IF NOT EXISTS preschool_id UUID REFERENCES preschools(id);

-- Step 2: Migrate data from users table
INSERT INTO profiles (id, email, first_name, last_name, role, organization_id, created_at, updated_at)
SELECT id, email, first_name, last_name, role, organization_id, created_at, updated_at
FROM users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Migrate data from user_profiles table
UPDATE profiles p
SET 
  email = COALESCE(p.email, up.email),
  first_name = COALESCE(p.first_name, split_part(up.full_name, ' ', 1)),
  last_name = COALESCE(p.last_name, substring(up.full_name from position(' ' in up.full_name) + 1))
FROM user_profiles up
WHERE up.auth_user_id = p.id;

-- Step 4: Create view for backward compatibility
CREATE OR REPLACE VIEW users AS
SELECT 
  id,
  email,
  first_name,
  last_name,
  first_name || ' ' || last_name AS full_name,
  role,
  organization_id,
  created_at,
  updated_at
FROM profiles;

-- Step 5: Update trigger to use profiles table
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_for_new_user();
```

## Implementation Checklist

### Immediate (Fix 400 Error)
- [ ] Update `/web/src/app/sign-up/parent/page.tsx` to use `profiles` table
- [ ] Split `fullName` into `first_name` and `last_name`
- [ ] Update insert to match `profiles` schema
- [ ] Test parent registration flow

### Short-term (Preschool Selection)
- [ ] Add `is_public` and `accepting_registrations` columns to `preschools` table
- [ ] Create `parent_join_requests` table
- [ ] Build preschool selection UI component
- [ ] Add preschool search/filter functionality
- [ ] Implement approval workflow for principals

### Medium-term (Unified System)
- [ ] Create `RegistrationService` class
- [ ] Migrate all registration flows to use service
- [ ] Consolidate `users`, `user_profiles`, `profiles` into single `profiles` table
- [ ] Update all code references
- [ ] Create migration for schema consolidation

### Long-term (Enhanced Features)
- [ ] Add QR code invitation system
- [ ] Bulk parent invitations via CSV upload
- [ ] SMS-based invitation delivery
- [ ] Parent verification via student ID matching

## Decision Points

### 1. Which table should be the source of truth?
**Recommendation**: `profiles` table
- Already has trigger support
- Consistent with Supabase patterns
- Most recently referenced in migrations

### 2. Should parents require invitations?
**Recommendation**: Support both flows
- Invitation-based: Secure, controlled
- Self-service: Better user experience, faster onboarding
- Let preschools configure which flow they prefer

### 3. Approval workflow for parent join requests?
**Recommendation**: Yes, with auto-approval option
- Default: Manual approval by principal/teacher
- Optional: Auto-approval based on criteria (email domain, student ID match)

## Testing Plan

1. **Unit Tests**: Registration service methods
2. **Integration Tests**: End-to-end signup flows
3. **Manual QA**:
   - Parent signup without invitation
   - Parent signup with invitation
   - Teacher signup with invitation
   - Principal signup with organization creation
4. **Database Verification**: Profile records created correctly

## Rollout Strategy

1. **Phase 1** (Day 1): Deploy immediate fix to production
2. **Phase 2** (Week 1): Beta test preschool selection with 2-3 schools
3. **Phase 3** (Week 2): Roll out unified registration service
4. **Phase 4** (Week 3): Schema consolidation migration
5. **Phase 5** (Ongoing): Monitor and iterate

## References

- Web parent signup: `web/src/app/sign-up/parent/page.tsx`
- Enhanced auth service: `services/EnhancedAuthService.ts`
- Mobile teacher registration: `app/screens/teacher-registration.tsx`
- Profile trigger: `supabase/migrations/20251022_fix_parent_profile_creation.sql`
