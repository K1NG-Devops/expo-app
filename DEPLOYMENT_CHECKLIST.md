# 🚀 Invoice Notification Preferences - Deployment Checklist

This checklist ensures a smooth deployment of the Invoice Notification Preferences feature.

## ✅ Pre-Deployment Verification

### Database Setup
- [ ] **Migration files created** in `supabase/migrations/`
- [ ] **Migrations tested** in staging environment
- [ ] **RLS policies verified** (users can only access own data)
- [ ] **Database indexes created** for performance (GIN index on JSONB column)
- [ ] **Storage bucket exists** with proper policies for signatures

### Backend Services  
- [ ] **ProfileSettingsService implemented** with all CRUD operations
- [ ] **InvoiceService updated** with notification triggers
- [ ] **Edge function enhanced** with new invoice event types
- [ ] **Analytics tracking added** to all service methods
- [ ] **Error handling implemented** with proper try/catch blocks

### Frontend Components
- [ ] **TypeScript types defined** in `lib/types/profile.ts`
- [ ] **React Query hooks implemented** in `lib/hooks/useProfileSettings.ts`
- [ ] **Settings UI component ready** (optional - can be built after core deployment)

## 🗄️ Database Deployment Steps

### Step 1: Run Migrations
```bash
# Apply all three migration files in order:
supabase migration up

# Or manually:
# 1. Add preferences columns to profiles
# 2. Create signatures storage bucket  
# 3. Add merge function for safe updates
```

### Step 2: Verify Database Changes
```sql
-- Check that new columns exist in profiles table
\d profiles;

-- Verify default preferences structure
SELECT invoice_notification_preferences FROM profiles LIMIT 1;

-- Check storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'signatures';

-- Test RPC function
SELECT merge_invoice_notification_prefs(
  auth.uid(), 
  '{"events": {"new_invoice": {"email": false}}}'::jsonb
);
```

### Step 3: Test Storage Policies
```sql
-- Verify RLS policies are working
SELECT * FROM storage.objects WHERE bucket_id = 'signatures';
```

## 🔧 Edge Function Deployment

### Step 1: Deploy Enhanced Function
```bash
# Deploy the notifications-dispatcher with invoice support
supabase functions deploy notifications-dispatcher
```

### Step 2: Test Function
```bash
# Test with a sample invoice notification
supabase functions invoke notifications-dispatcher --data '{
  "test": true,
  "event_type": "new_invoice", 
  "channel": "email",
  "target_user_id": "YOUR_TEST_USER_ID"
}'
```

### Step 3: Verify Function Logs
```bash
# Check function logs for any errors
supabase functions logs notifications-dispatcher
```

## 📱 Application Deployment

### Step 1: Backend Services
- [ ] **Deploy updated InvoiceService** with notification triggers
- [ ] **Deploy ProfileSettingsService** for preference management
- [ ] **Verify service imports** work correctly in your app

### Step 2: Test Core Functionality
```typescript
// Test in your staging environment:
import ProfileSettingsService from '@/lib/services/profileSettingsService';

// 1. Get settings (should return default preferences for new users)
const settings = await ProfileSettingsService.getInvoiceNotificationSettings();
console.log('Settings:', settings);

// 2. Update preferences
await ProfileSettingsService.updateInvoiceNotificationPreferences({
  preferences: { events: { new_invoice: { email: false } } }
});

// 3. Send test notification  
await ProfileSettingsService.sendTestNotification({
  event: 'new_invoice',
  channel: 'email'
});
```

### Step 3: Test Invoice Integration
```typescript
// Test that invoice operations trigger notifications:
import InvoiceService from '@/lib/services/invoiceService';

// Create an invoice - should trigger new_invoice notification
const invoice = await InvoiceService.createInvoice({
  /* invoice data */
});

// Send invoice - should trigger invoice_sent notification
await InvoiceService.sendInvoiceEmail(invoice.id);
```

## 🔍 Testing & Verification

### Functional Testing
- [ ] **Create new user** - verify they get default notification preferences
- [ ] **Update preferences** - verify changes persist and merge correctly
- [ ] **Upload signature** - verify file uploads to correct bucket/folder
- [ ] **Delete signature** - verify file removal from storage and database
- [ ] **Test notifications** - verify test emails are received
- [ ] **Invoice lifecycle** - verify real notifications are sent for invoice events

### Security Testing
- [ ] **RLS enforcement** - verify users cannot modify others' preferences
- [ ] **Storage access** - verify users cannot access others' signature files  
- [ ] **Function security** - verify RPC functions check user identity
- [ ] **Test notification limits** - verify users can only test their own notifications

### Performance Testing
- [ ] **JSONB queries** - verify GIN index improves preference query performance
- [ ] **Storage operations** - verify signature uploads/downloads are reasonably fast
- [ ] **Notification batching** - verify edge function handles multiple recipients efficiently

## 📊 Monitoring Setup

### Analytics Events to Monitor
- [ ] `edudash.profile.notify_prefs_updated` - Preference changes
- [ ] `edudash.signature.uploaded` - Signature uploads  
- [ ] `edudash.notification.test_sent` - Test notifications
- [ ] `edudash.invoice.notification_triggered` - Invoice events
- [ ] `edudash.notifications.sent` - Successful notifications
- [ ] `edudash.notifications.skipped` - Skipped notifications

### Error Monitoring
- [ ] **Database errors** - Monitor migration and RPC function errors
- [ ] **Storage errors** - Monitor signature upload/access failures
- [ ] **Function errors** - Monitor edge function invocation failures
- [ ] **Notification errors** - Monitor email delivery failures

## 🔄 Rollback Plan

### If Issues Arise
1. **Disable feature flag** (if using feature flags)
2. **Revert InvoiceService changes** to stop triggering notifications
3. **Keep database changes** - they don't break existing functionality
4. **Monitor for resolution** - investigate specific failure points

### Database Rollback (if necessary)
```sql
-- Remove new columns (CAUTION: This loses all preference data)
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS invoice_notification_preferences,
  DROP COLUMN IF EXISTS signature_url,
  DROP COLUMN IF EXISTS signature_public_id,
  DROP COLUMN IF EXISTS signature_updated_at;

-- Remove storage bucket
DELETE FROM storage.objects WHERE bucket_id = 'signatures';
DELETE FROM storage.buckets WHERE id = 'signatures';

-- Remove RPC function  
DROP FUNCTION IF EXISTS merge_invoice_notification_prefs(UUID, JSONB);
DROP FUNCTION IF EXISTS jsonb_deep_merge(JSONB, JSONB);
```

## 🎯 Go-Live Steps

### Final Pre-Launch
- [ ] **Staging environment tested** end-to-end
- [ ] **All migrations applied** to production database
- [ ] **Edge functions deployed** to production
- [ ] **Monitoring dashboards** configured
- [ ] **Support team notified** of new feature

### Launch Day
- [ ] **Deploy application** with updated services
- [ ] **Enable feature flag** (if using feature flags)
- [ ] **Monitor analytics** for adoption and errors
- [ ] **Test with real users** in production environment

### Post-Launch (First 24 Hours)
- [ ] **Monitor error rates** for any spikes
- [ ] **Check notification delivery** - verify users receive emails
- [ ] **Review user feedback** for any UX issues
- [ ] **Performance monitoring** - check database and function performance

### Post-Launch (First Week)
- [ ] **Analyze adoption metrics** - how many users configure preferences?
- [ ] **Review notification patterns** - which events are most/least popular?
- [ ] **User feedback collection** - survey users about the feature
- [ ] **Performance optimization** - optimize based on real usage patterns

## ✅ Success Criteria

The deployment is successful when:
- [ ] **Users can configure** notification preferences without errors
- [ ] **Notifications are sent** when invoice events occur
- [ ] **Test notifications work** for user verification
- [ ] **Signatures can be managed** (upload/delete) successfully  
- [ ] **No security vulnerabilities** - users can't access others' data
- [ ] **Performance is acceptable** - under 500ms for preference updates
- [ ] **Error rates are low** - under 1% error rate for all operations

## 📞 Emergency Contacts

| Role | Contact | Responsibility |
|------|---------|---------------|
| **Database Admin** | [Your DBA] | Database issues, migrations |
| **DevOps Engineer** | [Your DevOps] | Function deployment, monitoring |
| **Frontend Lead** | [Your Frontend Lead] | UI issues, React Query problems |
| **Product Owner** | [Your PO] | Feature decisions, rollback authorization |

---

**Note**: Keep this checklist updated as the feature evolves. Each deployment should follow this process to ensure consistency and reliability.