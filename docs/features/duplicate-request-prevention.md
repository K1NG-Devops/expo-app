# Duplicate Request Prevention Feature

**Date**: 2025-10-30  
**Status**: ✅ Implemented  
**Version**: 1.0

## Overview

Prevents parents from submitting duplicate child registration and claim requests, improving UX and reducing confusion for both parents and school administrators.

## Problem Statement

Previously, parents could accidentally submit multiple registration or claim requests for the same child, leading to:
- Confusion about which request is active
- Duplicate database entries
- Extra work for school administrators reviewing requests
- Poor user experience

## Solution

Implemented **proactive duplicate checking** that queries existing pending requests before form submission, with database uniqueness constraints as a defensive fallback.

---

## Implementation Details

### 1. Register Child Form (`/dashboard/parent/register-child/page.tsx`)

**Pre-submit duplicate check:**
```typescript
// Normalize names: trim and collapse inner spaces
const normalizedFirst = firstName.trim().replace(/\s+/g, ' ');
const normalizedLast = lastName.trim().replace(/\s+/g, ' ');

// Query for existing pending requests
const { data: existingRequests, error: checkError } = await supabase
  .from('child_registration_requests')
  .select('id')
  .eq('parent_id', userId)
  .eq('preschool_id', selectedOrgId)
  .eq('status', 'pending')
  .ilike('child_first_name', normalizedFirst)
  .ilike('child_last_name', normalizedLast);

if (existingRequests && existingRequests.length > 0) {
  // Block submission with friendly message
  alert(`You already have a pending registration request for ${normalizedFirst} ${normalizedLast} at ${selectedOrgName}...`);
  return;
}
```

**Key features:**
- Case-insensitive name matching using `.ilike()`
- Checks parent ID, school ID, status = 'pending', and child names
- Normalizes whitespace (trims and collapses inner spaces)
- Graceful error handling: if query fails, proceed to insert (DB constraint is fallback)

### 2. Claim Child Form (`/dashboard/parent/claim-child/page.tsx`)

**Pre-submit duplicate check:**
```typescript
const { data: existingRequests, error: checkError } = await supabase
  .from('guardian_requests')
  .select('id')
  .eq('parent_auth_id', userId)
  .eq('student_id', studentId)
  .eq('status', 'pending');

if (existingRequests && existingRequests.length > 0) {
  alert(`You have already sent a link request for ${childName}...`);
  return;
}
```

**Key features:**
- Exact match on parent ID, student ID, and status
- Simpler than registration check (no name normalization needed)
- Same graceful error handling pattern

### 3. Database Indexes (Migration `20251030213551_add_duplicate_check_indexes.sql`)

**Child registration requests index:**
```sql
CREATE INDEX idx_child_registration_duplicate_check_ilike
ON child_registration_requests (
  parent_id, 
  preschool_id, 
  status, 
  LOWER(child_first_name), 
  LOWER(child_last_name)
);
```

**Guardian requests index:**
- Already covered by existing `idx_guardian_requests_duplicate_check` index from migration `20251024145800`

**RLS policies:**
- Ensures parents can SELECT their own requests (`parent_id = auth.uid()`)
- Required for pre-submit duplicate checks to work

### 4. Pending Requests Widget (`PendingRequestsWidget.tsx`)

**Purpose:** Surfaces pending registration and claim requests prominently in the parent dashboard.

**Features:**
- Queries both `child_registration_requests` and `guardian_requests` tables
- Shows child name, request type, school name, and requested date
- Only displays when there are pending requests (hidden otherwise)
- Friendly status message: "Your requests are awaiting school approval"

**Location:** Parent dashboard (`/dashboard/parent/page.tsx`), displayed near the top after onboarding banner

---

## User Experience Flow

### Registration Flow (New Child)

1. Parent navigates to **Register New Child** page
2. Fills out form with child details and selects school
3. Clicks **Submit**
4. **Proactive check runs:**
   - If duplicate found → Alert shown, submission blocked
   - If no duplicate → Request submitted
5. **Database constraint (fallback):**
   - If race condition occurs (two devices submit simultaneously), DB constraint prevents duplicate
   - Error code `23505` caught, friendly message shown
6. **Dashboard widget:**
   - Pending request appears in widget immediately
   - Parent sees status: "Awaiting school approval"

### Claim Flow (Existing Child)

1. Parent navigates to **Claim Child** page
2. Selects school (if not already linked)
3. Searches for child by name
4. Clicks **Claim** button for matching child
5. **Proactive check runs:**
   - If duplicate found → Alert shown, submission blocked
   - If no duplicate → Request submitted
6. **Database constraint (fallback):**
   - Unique index on `(parent_auth_id, student_id)` WHERE `status = 'pending'`
7. **Dashboard widget:**
   - Pending request appears immediately

---

## Error Handling & Edge Cases

### Scenario: Network failure during duplicate check
**Behavior:** Query error is logged, but submission proceeds. DB uniqueness constraint acts as fallback.

### Scenario: Race condition (two devices submit at same time)
**Behavior:** One insert succeeds, the other fails with `23505` error. Friendly alert shown to user.

### Scenario: Name variations (extra spaces, different casing)
**Behavior:** 
- Names normalized: `"John  Doe"` → `"John Doe"`
- Case-insensitive matching: `"John Doe"` matches `"john doe"`

### Scenario: Parent submits for different school
**Behavior:** Allowed. Duplicate check filters by `preschool_id`, so same child at different school is not considered a duplicate.

### Scenario: Previous request was approved/rejected
**Behavior:** Parent can resubmit. Check only blocks if status = 'pending'.

---

## Testing Checklist

### Manual Testing

- [x] **Register Child: Same name, same case** → Blocked
- [x] **Register Child: Same name, different case** → Blocked
- [x] **Register Child: Extra spaces in name** → Blocked (normalized)
- [x] **Register Child: Different school** → Allowed
- [x] **Claim Child: Same student twice** → Blocked
- [x] **Claim Child: Different student** → Allowed
- [x] **Network failure simulation** → Proceeds to submit, DB constraint handles
- [x] **Race condition (two devices)** → One succeeds, other shows friendly error
- [x] **Dashboard widget displays pending requests** → Verified
- [x] **Widget hidden when no pending requests** → Verified

### Automated Testing (Future)

- [ ] Playwright E2E test: Submit duplicate registration
- [ ] Playwright E2E test: Submit duplicate claim
- [ ] Unit test: Name normalization function
- [ ] Integration test: RLS policy allows parent SELECT

---

## Database Schema

### `child_registration_requests` Table

**Relevant columns:**
- `parent_id` (references `profiles.id`)
- `preschool_id` (references `preschools.id`)
- `child_first_name`, `child_last_name`
- `status` ('pending', 'approved', 'rejected', 'withdrawn')

**Unique constraint:**
```sql
CREATE UNIQUE INDEX child_registration_unique_pending
ON child_registration_requests (parent_id, preschool_id, child_first_name, child_last_name, child_birth_date)
WHERE status = 'pending';
```

### `guardian_requests` Table

**Relevant columns:**
- `parent_auth_id` (references `profiles.id`)
- `student_id` (references `students.id`)
- `status` ('pending', 'approved', 'rejected', 'cancelled')

**Unique constraint:**
```sql
CREATE UNIQUE INDEX idx_guardian_requests_no_duplicate_pending
ON guardian_requests (parent_auth_id, student_id)
WHERE status = 'pending';
```

---

## Performance Considerations

- **Index usage:** All duplicate check queries use indexes, ensuring sub-millisecond response times even at scale
- **Query efficiency:** SELECT only `id` column (minimal data transfer)
- **Caching:** Consider adding Redis cache for frequently accessed pending request counts (future optimization)

---

## Governance & Rollout

### Feature Flag
**Status:** Not implemented (V1 rollout)  
**Future:** Consider adding flag for gradual rollout or A/B testing

### Monitoring
- **Sentry:** Error logging for query failures
- **Analytics (future):**
  - Event: `duplicate_registration_blocked`
  - Event: `duplicate_claim_blocked`
  - Properties: `child_name_hash`, `preschool_id`, `device`

### Rollback Plan
1. Feature can be disabled by commenting out pre-submit checks
2. DB uniqueness constraints remain as safety net
3. No schema rollback required

---

## Architecture Principles Followed

✅ **Profiles-first:** Uses `profiles.id` consistently (not deprecated `users` table)  
✅ **Defensive programming:** DB constraints as fallback if client-side check fails  
✅ **Graceful degradation:** If query fails, submission still proceeds  
✅ **User-friendly errors:** Clear, actionable messages instead of technical jargon  
✅ **Performance-conscious:** Indexed queries, minimal data transfer  
✅ **Tenant isolation:** Checks include `preschool_id` filter

---

## Future Enhancements

1. **Toast notifications:** Replace `alert()` with modern toast UI component
2. **Pending requests page:** Dedicated page listing all pending requests with actions (withdraw, view status)
3. **Real-time updates:** WebSocket or polling to update widget when request is approved
4. **Email notifications:** Notify parent when request status changes
5. **Admin dashboard:** Show duplicate submission attempts to identify UX issues

---

## Related Files

**Frontend:**
- `web/src/app/dashboard/parent/register-child/page.tsx`
- `web/src/app/dashboard/parent/claim-child/page.tsx`
- `web/src/components/dashboard/parent/PendingRequestsWidget.tsx`
- `web/src/app/dashboard/parent/page.tsx`

**Backend:**
- `supabase/migrations/20251030213551_add_duplicate_check_indexes.sql`
- `supabase/migrations/20251022230000_add_unique_constraint_child_registration.sql`
- `supabase/migrations/20251024145800_add_guardian_requests_enhancements.sql`

**Documentation:**
- `docs/features/duplicate-request-prevention.md` (this file)

---

## Contact & Maintenance

**Owner:** Development Team  
**Last Updated:** 2025-10-30  
**Next Review:** 2025-12-01 (or after 1000 production requests)
