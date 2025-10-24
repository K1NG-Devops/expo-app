# PayFast Sandbox Email & Tier Verification Fixes

**Date**: 2025-10-22  
**Status**: ✅ Deployed (Webhook) | ⏳ Pending (Migration)  
**Priority**: High

## Problem Statement

1. **PayFast Sandbox Email**: No email notifications sent after successful sandbox payments
2. **Tier Verification**: Subscription tier not properly updated in `organizations.plan_tier` after payment

## Solutions Implemented

### 1. PayFast Checkout URL Configuration ✅ DEPLOYED

**File**: `supabase/functions/payments-create-checkout/index.ts`

**Issue**: 
- Sandbox payments were not triggering email notifications because PayFast couldn't reach the webhook
- `notify_url` parameter was not being constructed correctly
- Missing explicit logging of webhook URLs for debugging

**Changes** (lines 132-159):
- ✅ Explicit webhook URL construction from `SUPABASE_URL`
- ✅ Handles trailing slashes in base URL
- ✅ Logs all webhook URLs (notify, return, cancel) for debugging
- ✅ Added `email_address` field to `CheckoutInput` interface
- ✅ Uses provided `email_address` or falls back to `PAYFAST_TEST_EMAIL` env var for user subscriptions
- ✅ Email confirmation enabled via `email_confirmation: '1'`

**Code Changes**:
```typescript
// Construct webhook URLs - ensure they use the correct Supabase URL
const webhookBaseUrl = SUPABASE_URL.replace(/\/$/, ''); // Remove trailing slash
const notifyUrl = Deno.env.get('PAYFAST_NOTIFY_URL') || `${webhookBaseUrl}/functions/v1/payfast-webhook`;
const returnUrl = input.return_url || Deno.env.get('PAYFAST_RETURN_URL') || `${webhookBaseUrl}/functions/v1/payments-webhook`;
const cancelUrl = input.cancel_url || Deno.env.get('PAYFAST_CANCEL_URL') || `${webhookBaseUrl}/functions/v1/payments-webhook`;

console.log('PayFast webhook URLs:', { notifyUrl, returnUrl, cancelUrl, mode });

const params: Record<string,string> = {
  // ... other params
  return_url: returnUrl,
  cancel_url: cancelUrl,
  notify_url: notifyUrl,
  email_confirmation: '1',
  email_address: input.email_address || (input.scope === 'user' ? Deno.env.get('PAYFAST_TEST_EMAIL') || '' : ''),
};
```

### 2. PayFast Webhook Email Notifications ✅ DEPLOYED

**File**: `supabase/functions/payfast-webhook/index.ts`

**Changes**:
- Added email notification queuing via `notification_queue` table
- Sends confirmation emails for both school and user subscriptions
- Includes detailed payment and subscription information
- Works in both sandbox and production modes
- Graceful failure - doesn't break webhook if email fails

**Email Content Includes**:
- Payment success confirmation
- Subscription details (plan, billing, amount)
- Transaction IDs (internal + PayFast)
- Start and end dates
- Mode indicator (sandbox/production)

**School Subscription Email** (lines 322-370):
```typescript
await supabase.from('notification_queue').insert({
  notification_type: 'email',
  recipient: schoolData.contact_email,
  subject: `✅ Subscription Activated - ${plan.name}`,
  body: emailBody,
  metadata: { payment_id, pf_payment_id, plan_tier, school_id, mode }
});
```

**User Subscription Email** (lines 494-539):
```typescript
await supabase.from('notification_queue').insert({
  notification_type: 'email',
  recipient: emailAddress,
  subject: `✅ Personal Subscription Activated - ${plan.name}`,
  body: emailBody,
  metadata: { payment_id, pf_payment_id, plan_tier, user_id, mode }
});
```

### 2. Tier Verification & Syncing ⏳ PENDING MIGRATION

**File**: `supabase/migrations/20251022173000_fix_tier_verification.sql`

**Features**:

#### A. Sync Function
```sql
CREATE FUNCTION public.sync_organization_tier(p_org_id uuid)
RETURNS jsonb
```
- Reads tier from active subscription
- Updates both `preschools.subscription_tier` and `organizations.plan_tier`
- Returns sync status as JSON

#### B. Get User Tier Function
```sql
CREATE FUNCTION public.get_user_tier(p_user_id uuid)
RETURNS text
```
- Fallback hierarchy:
  1. `organizations.plan_tier` (new RBAC system)
  2. `preschools.subscription_tier` (legacy)
  3. Active subscription from `subscriptions` table
  4. Default: `'free'`

#### C. User Profile View
```sql
CREATE VIEW public.user_profiles_with_tier
```
- Combines user, preschool, and organization data
- Resolves tier with fallback logic
- Single source of truth for profile queries

#### D. Auto-Sync Trigger
```sql
CREATE TRIGGER sync_tier_on_subscription_change
  AFTER INSERT OR UPDATE OF status, plan_id
  ON subscriptions
```
- Automatically syncs tier when subscription changes
- Ensures consistency across tables

#### E. Migration Bootstrap
- Syncs all existing active subscriptions on migration

### 3. Profile Fetching Enhancement ✅ CODE READY

**File**: `lib/auth/useProfile.ts`

**Changes**:
- Fetches both `preschools` and `organizations` in profile query
- Uses PostgreSQL left joins for optional relationships
- Resolves tier with fallback: `organization.plan_tier || preschool.subscription_tier || 'free'`
- Normalizes profile data with resolved tier

**Key Logic** (lines 142-156):
```typescript
const tier = profile.organization?.plan_tier || 
             profile.preschool?.subscription_tier || 
             'free';

const normalizedProfile = {
  ...profile,
  name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null,
  auth_user_id: profile.auth_user_id || profile.id,
  preschool: profile.preschool ? {
    ...profile.preschool,
    subscription_tier: tier  // Use resolved tier
  } : null,
};
```

## Deployment Status

### ✅ Completed
1. ✅ PayFast checkout URL configuration deployed (`payments-create-checkout`)
2. ✅ PayFast webhook deployed with email notifications (`payfast-webhook`)
3. ✅ Code changes in `useProfile.ts` committed
4. ✅ Webhook URL logging added for debugging

### ⏳ Pending
1. Database migration `20251022173000_fix_tier_verification.sql`
   - **Blocker**: Remote database connection timeout
   - **Workaround**: Deploy via Supabase Dashboard SQL Editor if CLI fails
2. Test sandbox payment with email verification

### 🔍 Verification Steps
1. Check Supabase Function logs for "PayFast webhook URLs" message
2. Verify `notify_url` in logs matches: `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`
3. Test payment in sandbox and check PayFast dashboard for ITN delivery status

## Testing Checklist

### Email Notifications
- [ ] Test sandbox payment with school subscription
- [ ] Test sandbox payment with user subscription
- [ ] Verify email received at registered address
- [ ] Check `notification_queue` table for queued emails
- [ ] Verify `payfast_itn_logs` shows `email_queued: true`

### Tier Verification
- [ ] Complete test payment in sandbox
- [ ] Check `subscriptions` table for active subscription
- [ ] Verify `preschools.subscription_tier` updated
- [ ] Verify `organizations.plan_tier` updated
- [ ] Confirm user profile shows correct tier in app
- [ ] Test `sync_organization_tier()` function manually
- [ ] Test `get_user_tier()` function with test user

## Manual Deployment Steps (If Needed)

### Deploy Migration via Dashboard

1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Paste contents of `supabase/migrations/20251022173000_fix_tier_verification.sql`
4. Run query
5. Verify no errors
6. Test with:
```sql
-- Test sync function
SELECT public.sync_organization_tier('your-org-id-here');

-- Test get tier function
SELECT public.get_user_tier('your-user-id-here');

-- Check view
SELECT * FROM public.user_profiles_with_tier WHERE id = 'your-user-id-here';
```

### Mark Migration as Applied
```bash
supabase migration repair --status applied 20251022173000
```

## Monitoring

### Email Delivery
```sql
-- Check notification queue
SELECT * FROM notification_queue 
WHERE notification_type = 'email' 
ORDER BY created_at DESC LIMIT 10;

-- Check PayFast logs with email status
SELECT m_payment_id, payment_status, processing_notes, created_at
FROM payfast_itn_logs
WHERE created_at > now() - interval '1 day'
ORDER BY created_at DESC;
```

### Tier Consistency
```sql
-- Check tier mismatches
SELECT 
  o.id,
  o.name,
  p.subscription_tier as preschool_tier,
  o.plan_tier as org_tier,
  sp.tier as subscription_tier,
  s.status as subscription_status
FROM organizations o
LEFT JOIN preschools p ON o.id = p.id
LEFT JOIN subscriptions s ON o.id = s.school_id AND s.status = 'active'
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE o.plan_tier != sp.tier OR p.subscription_tier != sp.tier;
```

## Rollback Plan

### Webhook
```bash
# Revert to previous version
git log --oneline supabase/functions/payfast-webhook/index.ts
git checkout <previous-commit> supabase/functions/payfast-webhook/index.ts
supabase functions deploy payfast-webhook
```

### Migration
```sql
-- Rollback functions and triggers
DROP TRIGGER IF EXISTS sync_tier_on_subscription_change ON subscriptions;
DROP FUNCTION IF EXISTS trigger_sync_tier_on_subscription_change();
DROP VIEW IF EXISTS user_profiles_with_tier;
DROP FUNCTION IF EXISTS get_user_tier(uuid);
DROP FUNCTION IF EXISTS sync_organization_tier(uuid);
```

## Next Steps

1. ✅ Build production APK/AAB (in progress)
2. ⏳ Deploy tier verification migration once connection stable
3. 🧪 Test sandbox payment flow end-to-end
4. 🧪 Verify email delivery
5. 🧪 Confirm tier updates in app UI
6. 📊 Monitor error logs and user feedback

## Related Issues

- PayFast sandbox testing requires real email delivery
- Organizations table tier sync missing in payment webhook
- Profile fetching not checking `organizations.plan_tier`

## Documentation References

- [PayFast ITN Documentation](https://developers.payfast.co.za/docs#instant_transaction_notification)
- [WARP.md - Multi-Tenant Security](/WARP.md)
- [Subscription System Design](/docs/features/subscriptions/)

---

**Author**: Warp AI Agent  
**Build Status**: [Check EAS Build Dashboard](https://expo.dev/accounts/dashpro/projects/edudashpro/builds)
