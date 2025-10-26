# Parent-Child Linking Implementation Plan

## Problem Statement

**Scenario**: A child already exists in the school system (added by staff), but the parent hasn't registered on the app yet. When the parent finally registers, they need a way to "claim" or link to their existing child.

**Current Gap**: No clear UI flow for parents to:
1. Search for their child in the school's student list
2. Submit a link/claim request
3. Track approval status
4. Get notified when approved

---

## Solution: "Claim Your Child" Feature

### User Flow

#### **Parent Side**

**Step 1: Post-Registration Landing**
```
┌─────────────────────────────────────┐
│  Welcome to EduDash Pro!            │
│                                      │
│  We see you don't have any          │
│  children linked yet.               │
│                                      │
│  [Claim Existing Child]             │
│  [Register New Child]               │
└─────────────────────────────────────┘
```

**Step 2: Search for Child**
```
┌─────────────────────────────────────┐
│  Find Your Child                    │
│                                      │
│  School: [Young Eagles HCC ▼]       │
│                                      │
│  Child's Name:                      │
│  [Search by name...]           🔍   │
│                                      │
│  OR                                  │
│                                      │
│  Child's ID Number:                 │
│  [Enter ID/Passport #]         🔍   │
│                                      │
│  [Search]                           │
└─────────────────────────────────────┘
```

**Step 3: Confirm and Submit**
```
┌─────────────────────────────────────┐
│  Confirm Child Details              │
│                                      │
│  📝 Child: Sarah Mogashoa           │
│  🎂 Date of Birth: 15/03/2020       │
│  🎓 Class: Grade R-A                │
│  🏫 School: Young Eagles HCC        │
│                                      │
│  ⚠️ Request will be sent to school  │
│     for verification                 │
│                                      │
│  Relationship to child:             │
│  ( ) Mother    ( ) Father           │
│  ( ) Guardian  ( ) Other            │
│                                      │
│  [Submit Claim Request]             │
└─────────────────────────────────────┘
```

**Step 4: Pending Status**
```
┌─────────────────────────────────────┐
│  ⏳ Pending Approval                │
│                                      │
│  Your request to link Sarah         │
│  Mogashoa has been sent to          │
│  Young Eagles HCC.                  │
│                                      │
│  You'll be notified when approved.  │
│                                      │
│  Submitted: 24 Oct 2025, 14:30      │
│                                      │
│  [Cancel Request]                   │
└─────────────────────────────────────┘
```

**Step 5: Approved**
```
┌─────────────────────────────────────┐
│  ✅ Link Approved!                  │
│                                      │
│  You can now view Sarah's           │
│  progress, messages, and updates.   │
│                                      │
│  [Go to Dashboard]                  │
└─────────────────────────────────────┘
```

---

#### **School Staff Side**

**Pending Request Card**
```
┌─────────────────────────────────────┐
│  🔔 New Parent Link Request         │
│                                      │
│  Parent: Dimakatso Mogashoa         │
│  Email: d.mogashoa@example.com      │
│  Phone: +27 67 477 0975             │
│                                      │
│  Wants to link to:                  │
│  Child: Sarah Mogashoa              │
│  DOB: 15/03/2020 (Age 5)            │
│  Class: Grade R-A                   │
│                                      │
│  Relationship: Mother               │
│                                      │
│  Submitted: 24 Oct 2025, 14:30      │
│                                      │
│  [✓ Approve]  [✗ Reject]            │
└─────────────────────────────────────┘
```

**Approval Confirmation**
```
┌─────────────────────────────────────┐
│  Approve Parent Link?               │
│                                      │
│  This will grant Dimakatso          │
│  Mogashoa access to view:           │
│  • Sarah's academic progress        │
│  • Attendance records               │
│  • Messages and announcements       │
│  • Financial information            │
│                                      │
│  Link as:                           │
│  ( ) Primary Parent (parent_id)     │
│  (•) Secondary Guardian             │
│                                      │
│  [Confirm Approval]  [Cancel]       │
└─────────────────────────────────────┘
```

---

## Database Schema

### Reuse Existing `guardian_requests` Table

```sql
-- Already exists, just needs enhanced usage
CREATE TABLE guardian_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Parent info
  parent_auth_id uuid NOT NULL,  -- auth.users.id
  parent_email text,
  
  -- Child info
  student_id uuid REFERENCES students(id),  -- Child being claimed
  child_full_name text,  -- For search display
  child_class text,      -- For verification
  
  -- School info
  school_id uuid REFERENCES preschools(id),
  
  -- Request details
  relationship text CHECK (relationship IN ('mother', 'father', 'guardian', 'other')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  -- Approval tracking
  approved_at timestamptz,
  approved_by uuid REFERENCES users(id),
  rejection_reason text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Enhancement Needed**: Add `relationship` column

```sql
-- Migration to add relationship field
ALTER TABLE guardian_requests 
ADD COLUMN IF NOT EXISTS relationship text 
CHECK (relationship IN ('mother', 'father', 'guardian', 'other'));

COMMENT ON COLUMN guardian_requests.relationship IS 
'Parent/guardian relationship to the child';
```

---

## Implementation Files

### 1. **Parent Claim Child Screen**
**File**: `app/screens/parent-claim-child.tsx`

**Features**:
- School selector (from user's organization)
- Search by child name or ID number
- Fuzzy matching for names
- Age-based filtering (2-7 years for preschool)
- Relationship selector
- Submit claim request
- Navigate to pending status

**Key Functions**:
```typescript
// Search for child
const searchChild = async (query: string) => {
  const { data } = await supabase
    .from('students')
    .select('id, first_name, last_name, date_of_birth, age_group:age_groups(name)')
    .eq('preschool_id', userPreschoolId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);
  
  return data;
};

// Submit claim request
const submitClaim = async (studentId: string, relationship: string) => {
  await ParentJoinService.requestLink({
    schoolId: preschoolId,
    parentAuthId: user.id,
    parentEmail: user.email,
    studentId: studentId,
    relationship: relationship,
  });
};
```

---

### 2. **Pending Link Requests Component**
**File**: `components/dashboard/PendingLinkRequests.tsx`

**Features**:
- Show all pending link requests for parent
- Show child name, photo, class
- Show submission date
- Allow cancel/withdraw
- Real-time status updates

```typescript
const { data: requests } = useQuery({
  queryKey: ['guardian-requests', user.id],
  queryFn: async () => {
    const { data } = await supabase
      .from('guardian_requests')
      .select(`
        *,
        student:students(first_name, last_name, date_of_birth, avatar_url)
      `)
      .eq('parent_auth_id', user.id)
      .in('status', ['pending', 'approved', 'rejected'])
      .order('created_at', { ascending: false });
    
    return data;
  },
});
```

---

### 3. **Staff Review Interface**
**File**: `components/dashboard/PendingParentLinkRequests.tsx`

**Features**:
- Show all pending link requests for school
- Display parent details (name, email, phone)
- Display child details
- Approve/Reject actions
- Choose link type (parent_id vs guardian_id)
- Add rejection reason
- Send notification on approval

**Integration**: Add to `principal-dashboard.tsx` and `teacher-dashboard.tsx`

```typescript
<PendingParentLinkRequests />
```

---

### 4. **Enhanced ParentJoinService**
**File**: `lib/services/parentJoinService.ts`

**Add Methods**:
```typescript
// Search for child
static async searchChild(
  preschoolId: string, 
  query: string
): Promise<Student[]> {
  const { data } = await assertSupabase()
    .from('students')
    .select('id, first_name, last_name, date_of_birth')
    .eq('preschool_id', preschoolId)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
    .limit(10);
  
  return data || [];
}

// Get request with student details
static async getRequestWithStudent(
  requestId: string
): Promise<GuardianRequestWithStudent> {
  const { data } = await assertSupabase()
    .from('guardian_requests')
    .select(`
      *,
      student:students(first_name, last_name, date_of_birth, avatar_url)
    `)
    .eq('id', requestId)
    .single();
  
  return data;
}

// Approve with notification
static async approveWithNotification(
  requestId: string, 
  studentId: string, 
  approverId: string,
  linkType: 'parent' | 'guardian'
): Promise<void> {
  await this.approve(requestId, studentId, approverId);
  
  // Send notification to parent (future: push notification)
  await notificationService.sendLinkApproved(requestId);
}
```

---

## Security Considerations

### RLS Policies

**Guardian Requests Table**:
```sql
-- Parents can only view their own requests
CREATE POLICY guardian_requests_parent_select
ON guardian_requests FOR SELECT TO authenticated
USING (parent_auth_id = auth.uid());

-- Parents can insert requests for their account
CREATE POLICY guardian_requests_parent_insert
ON guardian_requests FOR INSERT TO authenticated
WITH CHECK (parent_auth_id = auth.uid());

-- Parents can cancel pending requests
CREATE POLICY guardian_requests_parent_cancel
ON guardian_requests FOR UPDATE TO authenticated
USING (
  parent_auth_id = auth.uid() 
  AND status = 'pending'
)
WITH CHECK (status = 'cancelled');

-- Staff can view requests for their school
CREATE POLICY guardian_requests_staff_select
ON guardian_requests FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.organization_id = guardian_requests.school_id
      AND profiles.role IN ('principal', 'teacher', 'admin')
  )
);

-- Staff can approve/reject requests
CREATE POLICY guardian_requests_staff_manage
ON guardian_requests FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.organization_id = guardian_requests.school_id
      AND profiles.role IN ('principal', 'teacher', 'admin')
  )
);
```

### Fraud Prevention

**Measures**:
1. **ID Verification**: Require ID/passport number match
2. **Staff Approval**: All links require manual approval
3. **Audit Trail**: Track who approved and when
4. **Rate Limiting**: Max 3 pending requests per parent
5. **Duplicate Detection**: Prevent multiple requests for same child

```typescript
// Check for duplicate requests
const hasPendingRequest = await supabase
  .from('guardian_requests')
  .select('id')
  .eq('parent_auth_id', user.id)
  .eq('student_id', studentId)
  .eq('status', 'pending')
  .maybeSingle();

if (hasPendingRequest.data) {
  throw new Error('You already have a pending request for this child');
}
```

---

## UI/UX Considerations

### Onboarding Flow

**First-time Parent Login**:
```
1. Welcome screen
2. "Do you have children at [School Name]?"
   - Yes → Show "Claim Child" flow
   - No → Show "Register New Child" flow
3. Complete profile
4. Navigate to dashboard
```

### Dashboard Integration

**Empty State** (no children linked):
```
┌─────────────────────────────────────┐
│  👶 No Children Linked              │
│                                      │
│  Get started by:                    │
│                                      │
│  [🔗 Claim Existing Child]          │
│  Link your child if they're         │
│  already enrolled                   │
│                                      │
│  [➕ Register New Child]            │
│  Start enrollment for a new child   │
└─────────────────────────────────────┘
```

**Pending State** (requests submitted):
```
┌─────────────────────────────────────┐
│  ⏳ Pending Link Requests (2)       │
│                                      │
│  • Sarah Mogashoa - Grade R-A       │
│    Submitted 2 hours ago            │
│    [View] [Cancel]                  │
│                                      │
│  • John Mogashoa - Grade R-B        │
│    Submitted 1 day ago              │
│    [View] [Cancel]                  │
└─────────────────────────────────────┘
```

---

## Notifications

### Push Notifications (Future Enhancement)

**Parent Notifications**:
- ✅ Link request approved
- ❌ Link request rejected (with reason)
- 📧 Reminder if no action after 7 days

**Staff Notifications**:
- 🔔 New link request received
- 📊 Daily summary of pending requests

**Implementation**:
```typescript
// Edge Function: notifications-dispatcher
const sendLinkApproved = async (requestId: string) => {
  const request = await getRequestDetails(requestId);
  
  // Send push notification
  await expo.sendPushNotification({
    to: request.parent_push_token,
    title: '✅ Child Link Approved',
    body: `You can now view ${request.child_name}'s progress!`,
    data: { type: 'link_approved', requestId },
  });
  
  // Send email
  await resend.emails.send({
    to: request.parent_email,
    subject: 'Child Link Approved',
    html: linkApprovedTemplate(request),
  });
};
```

---

## Testing Checklist

### Parent Flow
- [ ] Parent can search for child by name
- [ ] Parent can search for child by ID number
- [ ] Fuzzy search works for misspellings
- [ ] Parent can select relationship type
- [ ] Parent can submit claim request
- [ ] Parent can view pending requests
- [ ] Parent can cancel pending requests
- [ ] Parent cannot submit duplicate requests
- [ ] Parent sees success message on approval
- [ ] Child appears in parent dashboard after approval

### Staff Flow
- [ ] Staff can view pending requests for their school
- [ ] Staff cannot view requests for other schools
- [ ] Staff can approve requests
- [ ] Staff can reject requests with reason
- [ ] Staff can choose link type (parent vs guardian)
- [ ] Approval updates student record correctly
- [ ] Notifications sent on approval
- [ ] Rejected requests show rejection reason

### Security
- [ ] RLS policies prevent cross-tenant access
- [ ] Parents can only claim children in their school
- [ ] Duplicate detection works
- [ ] Rate limiting enforced
- [ ] Audit trail captures all actions
- [ ] Staff approval required for all links

---

## Migration Script

```sql
-- Migration: 20251024_add_parent_child_linking_enhancements.sql

BEGIN;

-- Add relationship column to guardian_requests
ALTER TABLE guardian_requests 
ADD COLUMN IF NOT EXISTS relationship text 
CHECK (relationship IN ('mother', 'father', 'guardian', 'other'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_guardian_requests_parent_status 
ON guardian_requests (parent_auth_id, status);

CREATE INDEX IF NOT EXISTS idx_guardian_requests_school_status 
ON guardian_requests (school_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guardian_requests_student 
ON guardian_requests (student_id);

-- Add comments
COMMENT ON COLUMN guardian_requests.relationship IS 
'Parent/guardian relationship to the child: mother, father, guardian, other';

COMMENT ON TABLE guardian_requests IS 
'Requests from parents to link their account to an existing student in the system';

COMMIT;
```

---

## Rollout Plan

### Phase 1: Backend Setup (Week 1)
- [x] Add relationship column to guardian_requests
- [x] Create RLS policies
- [x] Add indexes
- [x] Update ParentJoinService
- [ ] Test security policies

### Phase 2: Parent UI (Week 2)
- [ ] Create parent-claim-child.tsx screen
- [ ] Add search functionality
- [ ] Add relationship selector
- [ ] Create PendingLinkRequests component
- [ ] Integrate with parent dashboard
- [ ] Add empty state guidance

### Phase 3: Staff UI (Week 3)
- [ ] Create PendingParentLinkRequests component
- [ ] Add approve/reject actions
- [ ] Add parent details display
- [ ] Integrate with principal/teacher dashboards
- [ ] Add bulk approval (future)

### Phase 4: Testing & Polish (Week 4)
- [ ] End-to-end testing
- [ ] Security audit
- [ ] UX testing with real parents
- [ ] Performance optimization
- [ ] Documentation update

### Phase 5: Notifications (Week 5)
- [ ] Push notification setup
- [ ] Email templates
- [ ] SMS fallback (optional)
- [ ] Notification preferences

---

## Success Metrics

**Target KPIs**:
- 90%+ of link requests approved within 24 hours
- <5% rejection rate (indicates good search/match)
- 80%+ of new parents use "Claim Child" feature
- Zero security incidents
- 95%+ parent satisfaction with linking process

**Monitoring**:
```sql
-- Daily metrics query
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_requests,
  COUNT(*) FILTER (WHERE status = 'approved') as approved,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  AVG(EXTRACT(EPOCH FROM (approved_at - created_at))/3600) as avg_approval_hours
FROM guardian_requests
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## FAQ

**Q: What if parent already has a child linked?**  
A: They can link additional children using the "Add Another Child" button on their dashboard.

**Q: What if the school made a mistake and needs to unlink?**  
A: Principals can "Remove Link" from the student detail page. Parent loses access immediately.

**Q: What if both parents want to link to the same child?**  
A: Both are allowed. First approved becomes `parent_id`, second becomes `guardian_id`.

**Q: What if parent can't find their child in search?**  
A: Fallback to "Register New Child" flow. Staff can merge duplicates later.

**Q: What about divorced parents with custody arrangements?**  
A: Both can link, but access control is managed through future "restricted access" settings (Phase 2 enhancement).

---

## Related Documentation

- `docs/features/child-registration-improvements.md` - New child registration
- `lib/services/parentJoinService.ts` - Service layer implementation
- `docs/security/` - RLS policies and security model
- `docs/COMPREHENSIVE_AUDIT_ROADMAP_OCT_2025.md` - Phase planning

---

**Status**: 📝 Planning Complete - Ready for Implementation  
**Priority**: High (Parent onboarding blocker)  
**Estimated Effort**: 4-5 weeks  
**Dependencies**: Existing guardian_requests table, RLS policies

**Next Steps**: Begin Phase 1 backend setup and migration.

---

## ✅ IMPLEMENTATION COMPLETE (January 2025)

### Summary

The core parent-child linking system ("Claim Your Child" feature) has been **fully implemented** and integrated into EduDash Pro.

### Completed Components

**Backend** ✅
- Database migration with `relationship` column and performance indexes (`20251024145800_add_guardian_requests_enhancements.sql`)
- Enhanced `ParentJoinService` with search, duplicate detection, and student joins
- Fraud prevention: unique constraint on pending requests, staff approval required

**Parent UI** ✅
- Claim-child search screen (`app/screens/parent-claim-child.tsx`)
- Two-step flow: search by name → confirm with relationship selector
- Dashboard widget showing pending/approved/rejected requests (`components/dashboard/PendingLinkRequests.tsx`)
- "Claim Existing Child" button on parent dashboard (when no children linked)

**Staff UI** ✅
- Staff approval widget (`components/dashboard/PendingParentLinkRequests.tsx`)
- Approve/reject actions with optional rejection reason modal
- Auto-refresh every 60 seconds for real-time updates
- Integrated into Principal and Teacher dashboards

### Files Modified/Created

**New Files:**
1. `app/screens/parent-claim-child.tsx` (284 lines) - Parent claim flow
2. `components/dashboard/PendingLinkRequests.tsx` (371 lines) - Parent dashboard widget
3. `components/dashboard/PendingParentLinkRequests.tsx` (481 lines) - Staff dashboard widget
4. `supabase/migrations/20251024145800_add_guardian_requests_enhancements.sql` - Database migration

**Modified Files:**
1. `lib/services/parentJoinService.ts` - Enhanced with 6 new methods
2. `components/dashboard/ParentDashboard.tsx` - Integrated claim button and widget
3. `components/dashboard/NewEnhancedPrincipalDashboard.tsx` - Added staff widget
4. `components/dashboard/NewEnhancedTeacherDashboard.tsx` - Added staff widget

### Testing Checklist

Before deploying to production:
- [ ] Test on Android device with production database
- [ ] Verify duplicate detection prevents multiple pending requests
- [ ] Test approve flow: parent gains access to child immediately
- [ ] Test reject flow: parent sees rejection reason
- [ ] Test cancel flow: parent can withdraw pending request
- [ ] Validate RLS policies: parents only see their requests, staff only their school's
- [ ] Test search with fuzzy matching (typos, partial names)
- [ ] Verify empty states and error handling
- [ ] Test with multiple pending requests (parent and staff views)
- [ ] Verify mobile UX (touch targets, keyboard handling, scrolling)

### Analytics to Monitor

Track these metrics post-launch:
- **Adoption Rate**: % of new parents using "Claim Child" vs "Register New"
- **Approval Time**: Median time from request → staff approval
- **Rejection Rate**: % of requests rejected (indicator of fraud or confusion)
- **Search Success Rate**: % of searches that result in a claim submission
- **Duplicate Attempts**: Frequency of "already pending" errors (fraud indicator)

### Future Enhancements

**Phase 2 (Optional):**
- Bulk approve/reject for staff (multi-select)
- Email/WhatsApp notifications on approval/rejection
- Request history view for staff (audit trail)
- Advanced search filters (by date, status, class)
- Rate limiting (max 3 pending requests per parent)

**Status Updated**: ✅ **COMPLETE** - Ready for Testing & Deployment  
**Implementation Date**: January 2025  
**Next Action**: User Acceptance Testing on Android Device
