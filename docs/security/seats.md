# Teacher Seat Management Security Model

## Overview

The teacher seat management system implements a multi-layered security model to enforce plan-based seat limits while maintaining strict tenant isolation and role-based access controls.

## Security Architecture

### 1. Row-Level Security (RLS)

The `subscription_seats` table is protected by comprehensive RLS policies:

```sql
-- Enable RLS on the table
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;
```

#### Read Access Policy
```sql
CREATE POLICY subscription_seats_select_principal
ON public.subscription_seats
FOR SELECT
USING (
  -- Principals can read all seats in their preschool
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.preschool_id = subscription_seats.preschool_id
      AND p.role = 'principal'
  )
  OR
  -- Teachers can read their own seat only
  subscription_seats.teacher_user_id = auth.uid()
);
```

#### Write Protection Policy
```sql
CREATE POLICY subscription_seats_block_writes
ON public.subscription_seats
FOR ALL
TO public
USING (false)
WITH CHECK (false);
```

**Security Rationale**: Direct DML operations are completely blocked. All modifications must go through SECURITY DEFINER RPCs that implement proper authorization checks.

### 2. RPC Authorization Model

All seat operations use SECURITY DEFINER functions that bypass RLS but implement their own authorization:

#### Principal Authorization
- Only principals can assign/revoke seats for teachers in their preschool
- Verified through `util_caller_principal_school()` helper function
- Cross-preschool operations are explicitly blocked

#### Service Role Path
- Automated operations can use service role for batch processing
- Service role operations still respect preschool boundaries
- Used for system-level operations and admin scripts

#### Teacher Access
- Teachers can only view their own seat assignments
- No assignment/revocation permissions
- Read-only access through RLS policies

### 3. Concurrency Protection

Advisory locks prevent race conditions during seat assignments:

```sql
-- Per-school locking mechanism
CREATE OR REPLACE FUNCTION public.util_acquire_school_lock(p_school uuid)
RETURNS boolean
LANGUAGE sql
VOLATILE
AS $$
  SELECT pg_try_advisory_xact_lock(hashtext(p_school::text))
$$;
```

**Protection Benefits**:
- Prevents over-assignment when multiple admins work simultaneously
- Ensures atomic limit checking and seat creation
- Automatic lock release at transaction end

### 4. Data Validation Controls

#### Same-School Enforcement
Database triggers ensure teachers can only be assigned seats within their own preschool:

```sql
CREATE OR REPLACE FUNCTION public.trg_subscription_seats_validate_same_school()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_teacher_school uuid;
  v_teacher_role text;
BEGIN
  -- Verify teacher belongs to same preschool
  SELECT preschool_id, role
  INTO v_teacher_school, v_teacher_role
  FROM public.profiles
  WHERE id = new.teacher_user_id;

  IF v_teacher_school <> new.preschool_id THEN
    RAISE EXCEPTION 'Teacher must belong to the same preschool';
  END IF;

  IF v_teacher_role IS DISTINCT FROM 'teacher' THEN
    RAISE EXCEPTION 'Target user must have role teacher';
  END IF;

  RETURN new;
END $$;
```

#### Plan Limit Enforcement
RPCs check subscription plan limits before allowing new assignments:
- Fetches current plan's `teacher_seat_limit`
- Counts active seats for the preschool
- Blocks assignment if limit would be exceeded
- NULL limit means unlimited seats (enterprise plans)

### 5. Audit Trail

The system maintains comprehensive audit logs:

#### Seat Assignment Tracking
- `assigned_by`: User who assigned the seat
- `assigned_at`: Timestamp of assignment
- `revoked_by`: User who revoked the seat  
- `revoked_at`: Timestamp of revocation
- `is_active`: Computed field (revoked_at IS NULL)

#### Database Triggers
Automatic audit logging for all seat changes through database triggers.

## Security Controls Summary

| Control Type | Implementation | Purpose |
|--------------|----------------|---------|
| RLS Policies | Table-level access control | Tenant isolation |
| SECURITY DEFINER RPCs | Function-level authorization | Controlled operations |
| Advisory Locks | Transaction-level locking | Concurrency protection |
| Database Triggers | Data validation constraints | Business rule enforcement |
| Audit Logging | Change tracking | Compliance and monitoring |

## Threat Mitigation

### Cross-Tenant Data Access
- **Threat**: Principal accessing another school's teacher data
- **Mitigation**: RLS policies filter by preschool_id, RPC authorization checks

### Privilege Escalation  
- **Threat**: Teacher assigning seats to themselves or others
- **Mitigation**: RPC functions explicitly check caller role

### Over-Assignment
- **Threat**: Exceeding plan seat limits through race conditions
- **Mitigation**: Advisory locks + atomic limit checking

### Data Tampering
- **Threat**: Direct database manipulation bypassing business logic
- **Mitigation**: RLS blocks all direct writes, forces RPC usage

### Audit Evasion
- **Threat**: Seat changes without proper logging
- **Mitigation**: Database triggers ensure all changes are logged

## Security Testing

### RLS Verification
```sql
-- Test as principal - should see own school's seats only
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "principal-uuid", "role": "authenticated"}';
SELECT * FROM subscription_seats;

-- Test as teacher - should see own seat only  
SET LOCAL "request.jwt.claims" TO '{"sub": "teacher-uuid", "role": "authenticated"}';
SELECT * FROM subscription_seats;
```

### Direct Write Protection
```sql
-- Should fail - RLS blocks direct inserts
INSERT INTO subscription_seats (preschool_id, teacher_user_id, assigned_by) 
VALUES ('school-uuid', 'teacher-uuid', 'admin-uuid');
```

### Cross-School Prevention
```sql
-- Should fail - different preschool constraint
SELECT rpc_assign_teacher_seat('teacher-from-different-school-uuid');
```

## Monitoring & Alerting

### Key Metrics
- Seat assignment success/failure rates
- Plan limit violations 
- Cross-tenant access attempts
- RPC authorization failures

### Alert Triggers
- Multiple failed seat assignments (potential attack)
- Service role usage outside normal hours
- Direct table access attempts (RLS violations)

## Compliance Notes

- All PII (user IDs, preschool IDs) are UUIDs, not exposing sensitive data
- Audit logs support data retention and deletion requirements
- Role-based access aligns with principle of least privilege
- Multi-tenant isolation supports data residency requirements

## References

- [Database Migrations](/docs/database/changes/2025-09-seats.md)
- [Billing Architecture](/docs/architecture/billing-and-plans.md)
- [WARP.md Security Guidelines](/docs/governance/WARP.md#security-controls)