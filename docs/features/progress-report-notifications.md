# Progress Report Notification System

**Created**: 2025-10-25  
**Status**: ✅ Implemented  
**Phase**: Option 3 - Notification System Integration

## Overview

The progress report notification system provides real-time push notifications and email alerts to principals and teachers throughout the report review lifecycle. This ensures timely communication and efficient workflow management.

## Notification Flow

```
Teacher Creates Report
        ↓
[Teacher Signs & Submits]
        ↓
Push Notification → Principals (all in preschool)
"[Teacher Name] submitted a progress report for [Student Name]"
        ↓
[Principal Reviews Report]
        ↓
     APPROVE? ←→ REJECT?
        ↓              ↓
Push Notification → Teacher
"Report approved"   "Report needs revision: [Reason]"
```

## Event Types

### 1. `report_submitted_for_review`
**Trigger**: Teacher submits report for principal review  
**Recipients**: All principals in the preschool  
**Priority**: High  
**Channel**: Push + Email (optional)

**Notification Content**:
- **Title**: "Progress Report Submitted"
- **Body**: "[Teacher Name] submitted a progress report for [Student Name]"
- **Data**: `{ type: 'report', report_id, student_id, screen: 'principal-report-review' }`
- **Sound**: Default notification sound
- **Channel ID**: `reports`

### 2. `report_approved`
**Trigger**: Principal approves a report  
**Recipients**: Teacher who created the report  
**Priority**: Normal  
**Channel**: Push + Email (optional)

**Notification Content**:
- **Title**: "Progress Report Approved"
- **Body**: "Your progress report for [Student Name] has been approved"
- **Data**: `{ type: 'report', report_id, student_id, screen: 'progress-report-creator' }`
- **Sound**: Default notification sound
- **Channel ID**: `reports`

### 3. `report_rejected`
**Trigger**: Principal rejects a report with feedback  
**Recipients**: Teacher who created the report  
**Priority**: High  
**Channel**: Push + Email (optional)

**Notification Content**:
- **Title**: "Progress Report Needs Revision"
- **Body**: "Report for [Student Name] needs revision: [Rejection Reason]"
- **Data**: `{ type: 'report', report_id, student_id, rejection_reason, screen: 'progress-report-creator' }`
- **Sound**: Default notification sound
- **Channel ID**: `reports`

## Implementation Details

### Backend Components

#### 1. Edge Function: `notifications-dispatcher`
**Location**: `supabase/functions/notifications-dispatcher/index.ts`

**New Event Handlers Added**:
```typescript
case 'report_submitted_for_review':
  // Fetches all principals in preschool
  // Sends push notification to each device
  
case 'report_approved':
  // Fetches teacher from progress_reports table
  // Sends approval confirmation notification
  
case 'report_rejected':
  // Fetches teacher from progress_reports table
  // Includes rejection reason in notification body
```

**Context Enrichment**:
The dispatcher automatically enriches notifications with:
- Student name (first + last)
- Teacher name (first + last)
- Rejection reason (if applicable)
- Report ID and student ID for deep linking

### Frontend Components

#### 2. Notification Service
**Location**: `services/notification-service.ts`

**Exported Functions**:
```typescript
// Generic notification sender
sendNotification(options: NotificationOptions): Promise<{ success: boolean; error?: string }>

// Specialized helpers
notifyReportSubmittedForReview(reportId, studentId, preschoolId)
notifyReportApproved(reportId, studentId, preschoolId)
notifyReportRejected(reportId, studentId, preschoolId, rejectionReason)
```

**Authentication**:
- Uses current user session token
- Invokes `notifications-dispatcher` Edge Function via Supabase Functions client
- Handles errors gracefully without disrupting main workflow

#### 3. Integration Points

**Teacher Submission** (`hooks/useProgressReportActions.ts`):
```typescript
// After saving report to database
await notifyReportSubmittedForReview(
  savedReport.id,
  studentId,
  preschoolId
);
```

**Principal Approval** (`app/screens/principal-report-review.tsx`):
```typescript
onSuccess: async () => {
  // Send notification to teacher
  await notifyReportApproved(
    selectedReport.id,
    selectedReport.student_id,
    profile.preschool_id
  );
}
```

**Principal Rejection** (`app/screens/principal-report-review.tsx`):
```typescript
onSuccess: async () => {
  // Send notification with reason
  await notifyReportRejected(
    selectedReport.id,
    selectedReport.student_id,
    profile.preschool_id,
    rejectionReason
  );
}
```

## Database Schema

### Tables Used

**`push_devices`**:
- Stores Expo push tokens for each user device
- Filters by `user_id` to get notification recipients
- Tracks device metadata and language preferences

**`push_notifications`** (optional):
- Records sent notifications for audit trail
- Tracks delivery status and receipts
- Links to user, preschool, and notification type

**`progress_reports`**:
- `status` field: 'pending_review', 'approved', 'rejected'
- `teacher_id`: Used to identify notification recipient for approvals/rejections
- `preschool_id`: Used for multi-tenant filtering

## Security & Compliance

### Multi-Tenant Isolation
- All queries filtered by `preschool_id`
- Row-Level Security (RLS) policies enforce data isolation
- Principals only see reports from their preschool
- Teachers only receive notifications for their own reports

### Service Role Usage
- Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS
- Required to fetch user lists across roles
- Carefully scoped to only notification-related operations

### Error Handling
- Notification failures are logged but don't block the main workflow
- If notification fails, the report approval/rejection still succeeds
- Teachers/principals see success message regardless of notification status

## Testing

### Manual Testing Checklist

**Setup**:
1. Ensure `EXPO_ACCESS_TOKEN` is configured in Edge Function environment
2. Verify push notification permissions granted on test devices
3. Check that test devices have registered push tokens in `push_devices` table

**Test Scenarios**:

#### Scenario 1: Report Submission
1. Login as teacher
2. Create and submit a progress report
3. Verify principals receive push notification
4. Check notification taps opens principal review screen

#### Scenario 2: Report Approval
1. Login as principal
2. Approve a pending report with signature
3. Verify teacher receives approval notification
4. Check notification taps opens report creator screen

#### Scenario 3: Report Rejection
1. Login as principal
2. Reject a report with a detailed reason
3. Verify teacher receives rejection notification with reason
4. Check notification displays rejection reason in detail

#### Scenario 4: Multi-Preschool Isolation
1. Create reports in different preschools
2. Verify notifications only go to relevant principals
3. Confirm no cross-preschool notification leakage

### Automated Testing
```bash
# Test notification dispatcher directly (requires service role key)
curl -X POST https://[PROJECT_REF].supabase.co/functions/v1/notifications-dispatcher \
  -H "Authorization: Bearer [SERVICE_ROLE_KEY]" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "report_submitted_for_review",
    "preschool_id": "[PRESCHOOL_ID]",
    "report_id": "[REPORT_ID]",
    "student_id": "[STUDENT_ID]",
    "test": true,
    "target_user_id": "[USER_ID]"
  }'
```

## Performance Considerations

### Push Notification Limits
- Expo allows ~600 requests/second
- Batch notifications for large preschools (>100 principals)
- Consider queueing for very large deployments

### Real-time Subscriptions
- Each screen with real-time updates creates a WebSocket connection
- Limit concurrent subscriptions per user
- Principal review screen subscribes to `progress_reports` changes

### Caching & Optimization
- TanStack Query caches pending reports for 30 seconds
- Real-time updates invalidate cache immediately
- Polling backup every 60 seconds for reliability

## Troubleshooting

### Notifications Not Received

**Check**:
1. Push token exists in `push_devices` table for recipient
2. `is_active = true` for the device
3. Edge Function environment has `EXPO_ACCESS_TOKEN`
4. User has granted notification permissions
5. App is not in "Do Not Disturb" mode

**Debug**:
```sql
-- Check push tokens for a user
SELECT * FROM push_devices 
WHERE user_id = '[USER_ID]' 
AND is_active = true;

-- Check sent notifications
SELECT * FROM push_notifications 
WHERE recipient_user_id = '[USER_ID]'
ORDER BY created_at DESC
LIMIT 10;
```

### Notification Sent But Not Displayed

**Possible Causes**:
1. Invalid push token (device uninstalled app)
2. Expo push service error (check Expo dashboard)
3. Device-level notification settings disabled
4. Network connectivity issues

**Solutions**:
- Re-register push token on app launch
- Check Expo push receipt IDs for delivery confirmation
- Verify device notification settings

### Cross-Preschool Leakage

**Verify**:
```typescript
// All queries must include preschool_id filter
const { data: principals } = await supabase
  .from('profiles')
  .select('id')
  .eq('preschool_id', request.preschool_id) // REQUIRED!
  .in('role', ['principal', 'principal_admin']);
```

## Future Enhancements

### Phase 1 Improvements
- [ ] Email notifications as fallback (if push fails)
- [ ] SMS notifications for critical events (optional)
- [ ] Batch digest emails for principals (daily summary)
- [ ] Notification preferences per user (opt-in/opt-out)

### Phase 2 Analytics
- [ ] Track notification open rates
- [ ] Measure time-to-review metrics
- [ ] Report average approval/rejection times
- [ ] Identify bottlenecks in review workflow

### Phase 3 Advanced Features
- [ ] Scheduled reminder notifications (3-day pending reports)
- [ ] Escalation notifications (1-week pending reports)
- [ ] Parent notifications when report finalized
- [ ] Multi-language notification templates

## Related Documentation

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Expo Push Notifications](https://docs.expo.dev/push-notifications/overview/)
- [TanStack Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/invalidations-from-mutations)
- [Progress Report Architecture](./progress-report-architecture.md)
- [Principal Review Workflow](./principal-review-workflow.md)

## Changelog

### 2025-10-25 - Initial Implementation
- ✅ Added 3 new event types to notifications-dispatcher
- ✅ Created notification service helper functions
- ✅ Integrated notifications into report submission workflow
- ✅ Integrated notifications into approval/rejection workflows
- ✅ TypeScript validation passed
- ✅ Documentation created

### Next Steps
- Option 1: PDF Generation Enhancement
- Option 2: RefreshableScreen Integration
- Option 4: Report History & Analytics
