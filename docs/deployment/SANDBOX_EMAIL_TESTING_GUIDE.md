# PayFast Sandbox Email Testing Guide

**Purpose**: Step-by-step guide to test email notifications after payment in PayFast sandbox

## Prerequisites

- ✅ `payments-create-checkout` function deployed with URL fix
- ✅ `payfast-webhook` function deployed with email notification code
- ✅ PayFast sandbox merchant account configured
- ✅ `PAYFAST_TEST_EMAIL` environment variable set (or pass email in request)

## Test Environment Setup

### 1. Verify Environment Variables (Supabase Dashboard)

Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/settings/functions

Required variables:
```
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=10000100
PAYFAST_MERCHANT_KEY=<your-sandbox-key>
PAYFAST_PASSPHRASE=<your-passphrase>
PAYFAST_TEST_EMAIL=<your-email-for-testing>
SUPABASE_URL=https://lvvvjywrmpcqrpvuptdi.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

### 2. Check PayFast Sandbox Configuration

Login to PayFast Sandbox: https://sandbox.payfast.co.za

1. Go to **Settings** → **Integration**
2. Verify **ITN (Instant Transaction Notification)** is enabled
3. Check that your Passphrase matches the env var

## Testing Steps

### Option A: Test via App UI

1. **Start payment flow in app**:
   - Navigate to subscription upgrade screen
   - Select a paid tier (e.g., "Starter", "Professional")
   - Choose billing period (monthly/annual)
   - Click "Subscribe Now"

2. **Verify checkout creation**:
   - Check Supabase Function logs for `payments-create-checkout`
   - Look for log message: `"PayFast webhook URLs"`
   - Confirm `notify_url` is: `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`

3. **Complete payment in sandbox**:
   - You'll be redirected to PayFast sandbox
   - Use test card: `4000 0000 0000 0002`
   - Complete the payment

4. **Verify webhook received**:
   - Check `payfast_itn_logs` table:
     ```sql
     SELECT * FROM payfast_itn_logs 
     ORDER BY created_at DESC 
     LIMIT 1;
     ```
   - Verify `is_valid = true`
   - Check `processing_notes` for success indicators

5. **Verify email queued**:
   - Check `notification_queue` table:
     ```sql
     SELECT * FROM notification_queue 
     WHERE notification_type = 'email' 
     ORDER BY created_at DESC 
     LIMIT 1;
     ```
   - Verify `recipient` matches your email
   - Check `subject` contains "Subscription Activated"

6. **Verify email sent**:
   - Wait 1-2 minutes for dispatcher to process
   - Check your inbox for email from `noreply@edudashpro.org.za`
   - Verify email contains:
     - ✅ Subscription plan name
     - ✅ Transaction ID
     - ✅ PayFast payment ID
     - ✅ Billing frequency
     - ✅ Amount paid
     - ✅ Start and end dates

### Option B: Test via API Call

```bash
# Get auth token first
AUTH_TOKEN="<your-supabase-auth-token>"

# Create checkout session
curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payments-create-checkout \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "scope": "user",
    "userId": "<your-user-id>",
    "planTier": "starter",
    "billing": "monthly",
    "email_address": "your-test-email@example.com"
  }'

# Response will contain redirect_url - open in browser
# Example: https://sandbox.payfast.co.za/eng/process?merchant_id=...&notify_url=...
```

### Option C: Manual ITN Test (Webhook Only)

Simulate PayFast ITN callback:

```bash
# PayFast test ITN payload
curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "m_payment_id=<existing-transaction-id>&pf_payment_id=12345&payment_status=COMPLETE&amount_gross=199.00&merchant_id=10000100&merchant_key=<key>&email_address=test@example.com&custom_str1=starter&custom_str2=user&custom_str3=<user-id>&custom_str4={\"billing\":\"monthly\",\"seats\":1}"
```

**Note**: This requires a valid signature. Use PayFast's ITN testing tool instead.

## Verification Checklist

### After Payment Completion:

- [ ] **Function Logs** (`payments-create-checkout`):
  - [ ] "PayFast webhook URLs" log present
  - [ ] `notify_url` matches expected value
  - [ ] No errors in function execution

- [ ] **Function Logs** (`payfast-webhook`):
  - [ ] "PayFast ITN received" log present
  - [ ] "Email notification queued" log present
  - [ ] "PayFast ITN processed successfully" log present
  - [ ] No signature validation errors

- [ ] **Database** (`payfast_itn_logs`):
  - [ ] New row created with correct `m_payment_id`
  - [ ] `is_valid = true`
  - [ ] `processing_notes` indicates success
  - [ ] `notify_url` field populated correctly

- [ ] **Database** (`payment_transactions`):
  - [ ] Status updated to `completed`
  - [ ] `payfast_payment_id` populated
  - [ ] `completed_at` timestamp set

- [ ] **Database** (`notification_queue`):
  - [ ] Email notification queued
  - [ ] Correct recipient email
  - [ ] Subject line includes plan name
  - [ ] Body contains payment details

- [ ] **Database** (`subscriptions`):
  - [ ] New or updated subscription record
  - [ ] Status = `active`
  - [ ] Correct `plan_id` and tier
  - [ ] Start and end dates set correctly

- [ ] **Email Inbox**:
  - [ ] Email received (check spam folder)
  - [ ] From: `noreply@edudashpro.org.za`
  - [ ] Subject: "✅ Subscription Activated - [Plan Name]"
  - [ ] Body contains all expected details
  - [ ] Mode indicator shows "sandbox"

## Troubleshooting

### Email Not Received

**Check 1: Notification Queue**
```sql
SELECT * FROM notification_queue 
WHERE recipient = 'your-email@example.com' 
ORDER BY created_at DESC;
```
- If no rows: Webhook didn't queue email → check webhook logs
- If `status = 'pending'`: Email not yet sent → wait or check dispatcher
- If `status = 'failed'`: Check `error_message` column

**Check 2: PayFast ITN Logs**
```sql
SELECT is_valid, processing_notes, raw_post_data 
FROM payfast_itn_logs 
ORDER BY created_at DESC 
LIMIT 1;
```
- If `is_valid = false`: Signature or validation issue
- Check `processing_notes` for specific error

**Check 3: Function Logs**
- Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/logs/edge-functions
- Filter by `payfast-webhook`
- Look for errors in "Email notification queued" step

### Webhook Not Called

**Check 1: PayFast Dashboard**
- Login to sandbox.payfast.co.za
- Go to **Transactions**
- Find your transaction
- Check **ITN Status** column
- If "Failed", click details to see error

**Check 2: Verify notify_url**
```sql
SELECT notify_url FROM payfast_itn_logs 
ORDER BY created_at DESC 
LIMIT 1;
```
Should be: `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`

**Check 3: Edge Function Deployment**
```bash
supabase functions list
```
Verify both functions are deployed:
- `payments-create-checkout`
- `payfast-webhook`

### Signature Validation Failed

**Check 1: Passphrase Match**
- Verify env var `PAYFAST_PASSPHRASE` matches PayFast dashboard
- Both should be the **exact same string** (case-sensitive)

**Check 2: Merchant ID Match**
```sql
SELECT merchant_id, processing_notes 
FROM payfast_itn_logs 
ORDER BY created_at DESC 
LIMIT 1;
```
- `merchant_id` should be `10000100` for sandbox

## PayFast Sandbox Test Cards

Use these for testing:

| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4000 0000 0000 0002 | 123 | Any future date | Success |
| 4000 0000 0000 0010 | 123 | Any future date | Declined |

## Expected Timeline

1. **Payment initiated**: Instant
2. **Redirected to PayFast**: ~1-2 seconds
3. **Payment completed**: 10-30 seconds (manual input)
4. **ITN sent by PayFast**: ~5-10 seconds after payment
5. **Webhook processes ITN**: ~1-2 seconds
6. **Email queued**: Instant (same webhook call)
7. **Email dispatched**: ~30-60 seconds (depends on dispatcher frequency)
8. **Email received**: ~1-5 seconds after dispatch

**Total time**: ~1-2 minutes from payment completion to email in inbox

## Success Criteria

✅ **Full Success** requires:
1. Payment completed in PayFast sandbox
2. ITN received and validated by webhook
3. Transaction status updated to `completed`
4. Subscription activated in database
5. Email queued in `notification_queue`
6. Email sent (status = `sent`)
7. Email received in inbox with correct details

## Related Documentation

- Main fix: `docs/deployment/SANDBOX_EMAIL_FIX_SUMMARY.md`
- Webhook code: `supabase/functions/payfast-webhook/index.ts`
- Checkout code: `supabase/functions/payments-create-checkout/index.ts`
- PayFast ITN docs: https://developers.payfast.co.za/docs#instant_transaction_notification

---

**Last Updated**: 2025-10-22  
**Status**: Ready for testing
