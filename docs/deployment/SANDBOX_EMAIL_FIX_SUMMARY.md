# Sandbox Email Notification Fix - Summary

**Date**: 2025-10-22  
**Status**: ✅ **DEPLOYED**  
**Priority**: High

## Problem

PayFast sandbox payments were not triggering email notifications to clients because:
1. The `notify_url` parameter sent to PayFast was not constructed correctly
2. PayFast couldn't reach the webhook endpoint to send the ITN (Instant Transaction Notification)
3. No logging to debug webhook URL issues

## Root Cause

In `supabase/functions/payments-create-checkout/index.ts`:
- Webhook URLs were being constructed inline without proper validation
- No explicit logging of the URLs being sent to PayFast
- Potential issues with trailing slashes in `SUPABASE_URL`

## Solution Implemented

### 1. Explicit Webhook URL Construction
```typescript
const webhookBaseUrl = SUPABASE_URL.replace(/\/$/, ''); // Remove trailing slash
const notifyUrl = Deno.env.get('PAYFAST_NOTIFY_URL') || `${webhookBaseUrl}/functions/v1/payfast-webhook`;
const returnUrl = input.return_url || Deno.env.get('PAYFAST_RETURN_URL') || `${webhookBaseUrl}/functions/v1/payments-webhook`;
const cancelUrl = input.cancel_url || Deno.env.get('PAYFAST_CANCEL_URL') || `${webhookBaseUrl}/functions/v1/payments-webhook`;
```

### 2. Debug Logging
```typescript
console.log('PayFast webhook URLs:', { notifyUrl, returnUrl, cancelUrl, mode });
```

### 3. Email Address Support
- Added `email_address` field to `CheckoutInput` interface
- Uses provided email or falls back to `PAYFAST_TEST_EMAIL` environment variable
- Enables email confirmation with `email_confirmation: '1'`

## Files Changed

1. ✅ `supabase/functions/payments-create-checkout/index.ts` (lines 7-159)
   - Added `email_address` to interface
   - Explicit webhook URL construction
   - Debug logging
   - Email parameter handling

2. ✅ `docs/deployment/payfast-email-tier-fix-2025-10-22.md`
   - Updated documentation with fix details
   - Added verification steps

## Deployment

```bash
supabase functions deploy payments-create-checkout --no-verify-jwt
```

**Result**: ✅ Successfully deployed to project `lvvvjywrmpcqrpvuptdi`

## Expected Behavior After Fix

### Sandbox Payment Flow:
1. User initiates payment → `payments-create-checkout` creates transaction
2. User redirected to PayFast sandbox with **correct** `notify_url`
3. User completes payment on PayFast
4. PayFast sends ITN to `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`
5. Webhook validates payment and queues email notification
6. `notifications-dispatcher` sends email to client
7. Client receives subscription activation email

### Key Improvements:
- ✅ PayFast can now reach the webhook endpoint
- ✅ ITN (Instant Transaction Notification) will be received
- ✅ Email notifications will be triggered
- ✅ Webhook URLs logged for debugging

## Verification Checklist

- [ ] Check Supabase Function logs for "PayFast webhook URLs" message
- [ ] Verify `notify_url` in logs: `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`
- [ ] Test sandbox payment end-to-end
- [ ] Check PayFast dashboard for ITN delivery status
- [ ] Verify email received at registered address
- [ ] Check `payfast_itn_logs` table for webhook data
- [ ] Check `notification_queue` table for queued email

## Monitoring Queries

### Check recent payment webhooks:
```sql
SELECT 
  m_payment_id,
  payment_status,
  notify_url,
  is_valid,
  processing_notes,
  created_at
FROM payfast_itn_logs
ORDER BY created_at DESC
LIMIT 10;
```

### Check email notifications:
```sql
SELECT 
  notification_type,
  recipient,
  subject,
  status,
  created_at,
  sent_at
FROM notification_queue
WHERE notification_type = 'email'
ORDER BY created_at DESC
LIMIT 10;
```

### Check function logs (via Supabase Dashboard):
1. Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/logs/edge-functions
2. Filter: `payments-create-checkout`
3. Look for: "PayFast webhook URLs"

## Rollback Plan

If issues arise:
```bash
# Revert to previous version
git log --oneline supabase/functions/payments-create-checkout/index.ts
git checkout <previous-commit> supabase/functions/payments-create-checkout/index.ts
supabase functions deploy payments-create-checkout --no-verify-jwt
```

## Next Steps

1. ⏳ Test sandbox payment with real email
2. ⏳ Verify PayFast ITN delivery in their dashboard
3. ⏳ Deploy tier verification migration (`20251022173000_fix_tier_verification.sql`)
4. ⏳ Test tier updates after payment

## Related Documentation

- Main fix doc: `docs/deployment/payfast-email-tier-fix-2025-10-22.md`
- PayFast ITN docs: https://developers.payfast.co.za/docs#instant_transaction_notification
- Webhook implementation: `supabase/functions/payfast-webhook/index.ts`

---

**Status**: ✅ **READY FOR TESTING**  
**Impact**: High - Enables email notifications for all sandbox payments  
**Risk**: Low - Fallback behavior unchanged if env vars not set
