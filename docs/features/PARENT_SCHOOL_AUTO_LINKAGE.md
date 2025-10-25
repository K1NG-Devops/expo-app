# Parent-School Automatic Linkage System

**Date**: 2025-10-25  
**Status**: ✅ Implemented  
**Migration**: `20251025202900_auto_link_parent_to_school_on_child_claim.sql`

## Problem Statement

Parents were losing their `preschool_id` linkage when updating profile details, causing them to:
- Not see their children's data
- Get "permission denied" errors when accessing school-specific features
- Become disconnected from the school even though their children were enrolled

## Root Cause

The system had **two competing sources of truth**:
1. **Invitation Code Registration**: Parents get `preschool_id` via `use_invitation_code` RPC
2. **Child Linkage**: Children already enrolled by school have `preschool_id`
3. **Profile Updates**: Any profile update could overwrite/NULL `preschool_id` if not explicitly preserved

**Result**: Parents who updated their profile after registration lost school linkage.

## Solution Architecture

### Strategy: "Child is the Source of Truth"

When a parent links to a child, **automatically inherit the child's `preschool_id`**. This ensures:
- ✅ **Child-first enrollment**: School registers child → Parent claims → Auto-linked to school
- ✅ **Parent-first enrollment**: Parent registers via invite → Child added → Linkage maintained
- ✅ **Profile updates**: Even if parent updates details, linkage is restored via children

### Implementation Layers

#### 1. Database Trigger (Automatic Sync)

**Trigger**: `sync_parent_preschool_on_student_update`  
**Function**: `sync_parent_preschool_from_student()`

```sql
-- Fires on INSERT or UPDATE of students.parent_id, students.guardian_id, students.preschool_id
-- Automatically syncs parent/guardian preschool_id from student's preschool_id
```

**What it does**:
- When `students.parent_id` is set → Update `profiles.preschool_id` for that parent
- When `students.guardian_id` is set → Update `profiles.preschool_id` for that guardian
- Updates **both** `profiles` table (primary) and `users` table (legacy)
- Only updates if `preschool_id` is NULL or different (idempotent)

#### 2. Application Layer (ParentJoinService)

**Enhanced**: `ParentJoinService.approve()`

When principal approves a parent-child link request:
```typescript
// 1. Link parent to student
await supabase.from('students').update({ parent_id: parentAuthId }).eq('id', studentId);

// 2. ✅ NEW: Immediately sync parent's preschool_id from student
if (student.preschool_id) {
  await supabase
    .from('profiles')
    .update({ 
      preschool_id: student.preschool_id,
      organization_id: student.preschool_id
    })
    .eq('id', parentAuthId)
    .eq('role', 'parent');
}
```

**Why both layers?**
- **Trigger**: Catches all student updates (direct SQL, imports, admin tools)
- **Application**: Provides immediate feedback and explicit control

#### 3. One-Time Restoration (Migration)

The migration includes a one-time fix for existing broken linkages:

```sql
-- Find parents who have children but lost preschool_id
-- Restore their preschool_id from their first child's preschool_id
WITH parent_preschool_mapping AS (
  SELECT DISTINCT 
    s.parent_id as profile_id,
    s.preschool_id
  FROM public.students s
  WHERE s.parent_id IS NOT NULL 
    AND s.preschool_id IS NOT NULL
    AND s.is_active = true
)
UPDATE public.profiles p
SET preschool_id = ppm.preschool_id,
    organization_id = ppm.preschool_id
FROM parent_preschool_mapping ppm
WHERE p.id = ppm.profile_id
  AND p.role = 'parent'
  AND p.preschool_id IS NULL;
```

## Data Flow Diagrams

### Scenario 1: School Registers Child First

```
1. Principal adds child to system
   └─> students: { id, name, preschool_id: X, parent_id: NULL }

2. Parent registers with invite code
   └─> profiles: { id, role: 'parent', preschool_id: X }
   
3. Parent claims child via guardian_requests
   └─> ParentJoinService.approve()
       └─> students.parent_id = parent.id
           └─> 🔥 TRIGGER: Syncs preschool_id from student to parent
               └─> profiles: { preschool_id: X } ✅ (already set, no-op)

4. Parent updates profile (e.g., phone number)
   └─> profiles: { phone: '123', preschool_id: X } ✅ (preserved by trigger)
```

### Scenario 2: Parent Registers First (Invitation Code)

```
1. Parent registers with invitation code
   └─> use_invitation_code RPC
       └─> profiles: { id, role: 'parent', preschool_id: X }
       └─> users: { auth_user_id, preschool_id: X }

2. Parent adds child via app
   └─> students: { id, name, preschool_id: X, parent_id: parent.id }
       └─> 🔥 TRIGGER: Syncs preschool_id from student to parent
           └─> profiles: { preschool_id: X } ✅ (already set, no-op)
```

### Scenario 3: Parent Loses Linkage (Bug Fix)

```
1. Parent updates profile incorrectly
   └─> profiles: { phone: '123', preschool_id: NULL } ❌ (bug!)

2. Parent tries to claim child
   └─> ParentJoinService.approve()
       └─> students.parent_id = parent.id
           └─> 🔥 TRIGGER: Syncs preschool_id from student to parent
               └─> profiles: { preschool_id: X } ✅ (restored!)

3. OR: Migration runs (one-time fix)
   └─> Finds parents with children but no preschool_id
       └─> profiles: { preschool_id: X } ✅ (restored!)
```

## Database Tables Involved

### profiles (Primary)
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY,                    -- auth.users.id
  role text NOT NULL DEFAULT 'parent',
  preschool_id uuid,                      -- ← KEY FIELD
  organization_id uuid,                   -- ← KEY FIELD (same as preschool_id for parents)
  first_name text,
  last_name text,
  phone text,
  ...
  FOREIGN KEY (preschool_id) REFERENCES preschools(id)
);
```

### students
```sql
CREATE TABLE students (
  id uuid PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  preschool_id uuid NOT NULL,             -- ← SOURCE OF TRUTH
  parent_id uuid,                          -- ← references profiles.id
  guardian_id uuid,                        -- ← references profiles.id (optional)
  ...
  FOREIGN KEY (preschool_id) REFERENCES preschools(id),
  FOREIGN KEY (parent_id) REFERENCES profiles(id),
  FOREIGN KEY (guardian_id) REFERENCES profiles(id)
);
```

### guardian_requests
```sql
CREATE TABLE guardian_requests (
  id uuid PRIMARY KEY,
  school_id uuid,                          -- preschool_id
  parent_auth_id uuid NOT NULL,            -- profiles.id
  student_id uuid,                         -- students.id
  status text NOT NULL,                    -- 'pending' | 'approved' | 'rejected' | 'cancelled'
  relationship text,                       -- 'mother' | 'father' | 'guardian' | 'other'
  ...
);
```

### users (Legacy - for backward compatibility)
```sql
CREATE TABLE users (
  id uuid PRIMARY KEY,
  auth_user_id uuid UNIQUE,                -- auth.users.id
  preschool_id uuid,                       -- ← Also updated by trigger
  organization_id uuid,                    -- ← Also updated by trigger
  role text NOT NULL,
  ...
);
```

## Testing Scenarios

### Manual Test Checklist

- [ ] **Test 1**: School registers child → Parent claims → Verify preschool_id set
- [ ] **Test 2**: Parent registers first → Add child → Verify preschool_id maintained
- [ ] **Test 3**: Parent updates profile → Verify preschool_id preserved
- [ ] **Test 4**: Parent with broken linkage claims child → Verify restored
- [ ] **Test 5**: Guardian (not parent) links to child → Verify preschool_id set

### SQL Validation Queries

```sql
-- Check parents with children but no school linkage (should be 0 after migration)
SELECT p.id, p.email, p.first_name, p.last_name, p.preschool_id
FROM profiles p
JOIN students s ON s.parent_id = p.id
WHERE p.role = 'parent'
  AND p.preschool_id IS NULL
  AND s.is_active = true;

-- Verify trigger is active
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgname = 'sync_parent_preschool_on_student_update';

-- Count parents with/without school linkage
SELECT 
  COUNT(*) FILTER (WHERE preschool_id IS NOT NULL) as linked_parents,
  COUNT(*) FILTER (WHERE preschool_id IS NULL) as unlinked_parents,
  COUNT(*) as total_parents
FROM profiles
WHERE role = 'parent';
```

## Migration Deployment

### Pre-Deployment Checklist

- [x] SQL linting passed: `npm run lint:sql`
- [x] Review by senior developer
- [ ] Backup current state of `profiles` and `students` tables
- [ ] Test on staging environment first

### Deployment Steps

```bash
# 1. Apply migration
supabase db push

# 2. Verify no schema drift
supabase db diff  # Should show no changes

# 3. Check migration output
# Look for:
# - "Fixed X parent profiles with missing preschool_id"
# - "Parent-School Linkage Status" report

# 4. Validate with SQL queries (see above)

# 5. Monitor error logs for 24 hours
# Watch for "permission denied" errors decreasing
```

### Rollback Plan (If Needed)

```sql
-- 1. Disable trigger
DROP TRIGGER IF EXISTS sync_parent_preschool_on_student_update ON public.students;

-- 2. Drop function
DROP FUNCTION IF EXISTS public.sync_parent_preschool_from_student();

-- 3. Restore from backup (if linkages were incorrectly changed)
-- Contact database admin for backup restoration
```

## Monitoring & Alerts

### Key Metrics to Watch

1. **Parent Permission Errors**: Should decrease to near-zero
2. **Guardian Request Approval Success Rate**: Should remain high
3. **Parent Dashboard Load Times**: Should improve (fewer RLS policy rejections)

### PostHog/Sentry Events

```typescript
// Track successful linkage
track('edudash.parent.school_linked', { 
  parent_id, 
  student_id, 
  preschool_id,
  method: 'auto_trigger' | 'manual_approval' 
});

// Track linkage restoration
track('edudash.parent.school_linkage_restored', { 
  parent_id, 
  preschool_id,
  was_null: true 
});
```

## Future Enhancements

### Phase 2: Constraint Enforcement

Add database constraint to prevent NULL preschool_id for parents with children:

```sql
-- Check constraint: parents with children MUST have preschool_id
ALTER TABLE profiles
ADD CONSTRAINT chk_parent_has_preschool
CHECK (
  role != 'parent' 
  OR preschool_id IS NOT NULL 
  OR NOT EXISTS (
    SELECT 1 FROM students WHERE parent_id = profiles.id AND is_active = true
  )
);
```

**Decision**: Deferred to Phase 2 to avoid blocking legitimate edge cases (e.g., admin-created parents pending linkage).

### Phase 3: Multi-School Support

If parents can have children in multiple schools:
- Store `preschool_ids` as array
- UI selector for active school context
- RLS policies filter by selected school

**Status**: Not needed for MVP (single-school per parent assumed).

## Related Documentation

- **RLS Policies**: `docs/security/RLS_POLICIES.md`
- **Parent Registration**: `docs/features/PARENT_REGISTRATION_INVITATION_CODE.md`
- **Student Management**: `docs/features/STUDENT_MANAGEMENT.md`
- **Guardian Requests**: Migration `20251024145800_add_guardian_requests_enhancements.sql`

## Questions & Answers

**Q: Why update both `profiles` and `users` tables?**  
A: `profiles` is primary (auth.users.id FK), but `users` is legacy and still referenced in some reports. We update both for backward compatibility until full migration to profiles-only.

**Q: What if a parent has children in multiple schools?**  
A: Current design assumes single-school per parent. Their `preschool_id` will be set to their first child's school. Multi-school support requires array field and UI selector (Phase 3).

**Q: Can principal manually override a parent's preschool_id?**  
A: Yes, but it will be overwritten by trigger on next student linkage update. Manual overrides should be avoided unless removing parent from school entirely.

**Q: What happens if trigger fails?**  
A: Trigger failures are logged but don't block the student update (SECURITY DEFINER with exception handling). Application-layer sync provides redundancy.

## Support & Troubleshooting

**Issue**: Parent still sees permission denied after claiming child  
**Solution**:
1. Check if trigger fired: `SELECT * FROM students WHERE parent_id = '<parent_id>';`
2. Check if preschool_id was set: `SELECT preschool_id FROM profiles WHERE id = '<parent_id>';`
3. Manually trigger sync: `UPDATE students SET parent_id = parent_id WHERE parent_id = '<parent_id>';`

**Issue**: Migration report shows unlinked parents  
**Solution**:
- Check if they have active children: `SELECT COUNT(*) FROM students WHERE parent_id = '<parent_id>' AND is_active = true;`
- If no children, this is expected (waiting for first child linkage)
- If they have children, manually run restoration query (see migration Part 2)

---

**Migration Author**: EduDash Pro Team  
**Reviewed By**: TBD  
**Approved By**: TBD  
**Deployed**: TBD
