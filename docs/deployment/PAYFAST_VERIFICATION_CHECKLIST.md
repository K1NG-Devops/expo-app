# PayFast Implementation Verification Checklist

**Date**: 2025-10-22  
**Purpose**: Verify current implementation against PayFast official documentation  
**Reference**: `PAYFAST_OFFICIAL_REFERENCE.md`

---

## 🔍 Supabase Environment Variables Checklist

### Required Variables (Check in Supabase Dashboard)

Go to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/settings/functions

| Variable | Expected Value (Sandbox) | Status | Notes |
|----------|--------------------------|--------|-------|
| `PAYFAST_MODE` | `sandbox` | ⏳ | Must be lowercase |
| `PAYFAST_MERCHANT_ID` | `10000100` | ⏳ | Standard for all sandbox accounts |
| `PAYFAST_MERCHANT_KEY` | `<from-sandbox-dashboard>` | ⏳ | Get from Settings → Merchant Details |
| `PAYFAST_PASSPHRASE` | `<from-sandbox-dashboard>` | ⏳ | MUST match dashboard exactly (case-sensitive) |
| `PAYFAST_TEST_EMAIL` | `<your-test-email>` | ⏳ | Optional: default email for testing |
| `SUPABASE_URL` | `https://lvvvjywrmpcqrpvuptdi.supabase.co` | ✅ | Already set |
| `SUPABASE_SERVICE_ROLE_KEY` | `<service-role-key>` | ✅ | Already set |

### Optional Variables (for custom URLs)

| Variable | Purpose | Currently Used |
|----------|---------|----------------|
| `PAYFAST_NOTIFY_URL` | Override ITN webhook URL | ❌ No (using default) |
| `PAYFAST_RETURN_URL` | Override success redirect | ❌ No (using default) |
| `PAYFAST_CANCEL_URL` | Override cancel redirect | ❌ No (using default) |

---

## ✅ Implementation Verification

### 1. Payment Request Parameters

**File**: `supabase/functions/payments-create-checkout/index.ts`

| Parameter | Required by PayFast | Currently Sent | Status |
|-----------|---------------------|----------------|--------|
| `merchant_id` | ✅ Yes | ✅ Yes (line 146) | ✅ |
| `merchant_key` | ✅ Yes | ✅ Yes (line 147) | ✅ |
| `amount` | ✅ Yes | ✅ Yes (line 152) | ✅ |
| `item_name` | ✅ Yes | ✅ Yes (line 153) | ✅ |
| `return_url` | ✅ Yes | ✅ Yes (line 148) | ✅ |
| `cancel_url` | ✅ Yes | ✅ Yes (line 149) | ✅ |
| `notify_url` | ✅ Yes | ✅ Yes (line 150) | ✅ |
| `m_payment_id` | ✅ Yes | ✅ Yes (line 151) | ✅ |
| `email_confirmation` | ⚠️ Recommended | ✅ Yes (line 154) | ✅ |
| `email_address` | ⚠️ Recommended | ✅ Yes (line 155) | ✅ |
| `signature` | ⚠️ If passphrase set | ✅ Yes (line 183) | ✅ |

**Verification**: ✅ All required parameters implemented

### 2. Email Notification Configuration

**According to official docs**: Sandbox DOES send emails

**Requirements**:
- [ ] `email_confirmation` must be string `'1'` (not number 1)
- [ ] `email_address` must be valid email address
- [ ] Check PayFast sandbox dashboard → Settings → Email Notifications (enabled)

**Current Implementation** (line 154-155):
```typescript
email_confirmation: '1',  // ✅ Correct format
email_address: input.email_address || (input.scope === 'user' ? Deno.env.get('PAYFAST_TEST_EMAIL') || '' : ''),
```

**Status**: ✅ Correctly implemented

### 3. Webhook URL Construction

**Official requirement**: Must be publicly accessible HTTPS URL

**Current Implementation** (lines 137-143):
```typescript
const webhookBaseUrl = SUPABASE_URL.replace(/\/$/, '');
const notifyUrl = Deno.env.get('PAYFAST_NOTIFY_URL') || `${webhookBaseUrl}/functions/v1/payfast-webhook`;
console.log('PayFast webhook URLs:', { notifyUrl, returnUrl, cancelUrl, mode });
```

**Expected notify_url**: `https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook`

**Status**: ✅ Correctly implemented with logging

### 4. Signature Generation

**Official algorithm** (RFC1738 encoding + MD5):

**Current Implementation** (lines 165-184):
```typescript
function encodeRFC1738(v: string) {
  return encodeURIComponent(v)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());
}
// ... signature computation
```

**Status**: ✅ Matches official documentation

### 5. ITN Webhook Validation

**File**: `supabase/functions/payfast-webhook/index.ts`

**Official requirements**:
1. ✅ Verify signature (lines 104-139)
2. ✅ Validate with PayFast server (lines 141-143)
3. ✅ Check merchant_id (lines 97-100)
4. ⚠️ Verify amount (NOT implemented)
5. ⚠️ Check source IP (NOT implemented - optional)

**Status**: ⚠️ Missing amount verification (recommended)

### 6. ITN Response

**Official requirement**: Must return HTTP 200 OK

**Current Implementation** (line 591):
```typescript
return new Response("OK", { status: 200, headers: corsHeaders });
```

**Status**: ✅ Correct

### 7. Email Notification Queueing

**Current Implementation** (lines 322-370, 495-539):
```typescript
await supabase.from('notification_queue').insert({
  notification_type: 'email',
  recipient: schoolData.contact_email,
  subject: emailSubject,
  body: emailBody,
  metadata: { /* ... */ }
});
```

**Status**: ✅ Custom emails implemented (in addition to PayFast emails)

---

## 🐛 Potential Issues to Check

### Issue 1: Passphrase Mismatch

**Symptom**: Signature validation fails in ITN webhook

**Check**:
1. Login to: https://sandbox.payfast.co.za/
2. Go to: **Settings** → **Integration**
3. Copy passphrase EXACTLY (including any special characters)
4. Compare with `PAYFAST_PASSPHRASE` in Supabase env vars
5. Verify no trailing spaces or line breaks

**Critical**: Passphrase is case-sensitive and must match exactly!

### Issue 2: Merchant Key Wrong

**Symptom**: PayFast shows "Invalid merchant" error

**Check**:
1. Login to: https://sandbox.payfast.co.za/
2. Go to: **Settings** → **Merchant Details**
3. Copy **Merchant Key** (not Merchant ID)
4. Verify matches `PAYFAST_MERCHANT_KEY` in Supabase

**Note**: Merchant Key is unique per account, even in sandbox

### Issue 3: Email Not Sent by PayFast

**Symptom**: No email from `noreply@payfast.co.za` after payment

**Check**:
1. Spam/junk folder
2. PayFast dashboard: **Settings** → **Email Notifications** → Verify enabled
3. Verify `email_confirmation: '1'` in logs
4. Verify `email_address` is valid in logs
5. Wait 5-10 minutes (sometimes delayed)

**According to docs**: Sandbox DOES send emails if configured correctly

### Issue 4: ITN Not Received

**Symptom**: No webhook call after payment

**Check**:
1. PayFast sandbox dashboard → **Transactions** → Find your transaction
2. Look at **ITN Status** column
3. If "Failed", click details to see error message
4. Common causes:
   - ❌ notify_url not accessible (test with `curl`)
   - ❌ Endpoint returned non-200 status
   - ❌ Endpoint timed out (>10 seconds)

---

## 📋 Pre-Test Verification

### Before Making Test Payment:

- [ ] All environment variables set in Supabase Dashboard
- [ ] `PAYFAST_MODE=sandbox` (lowercase)
- [ ] `PAYFAST_MERCHANT_ID=10000100`
- [ ] `PAYFAST_MERCHANT_KEY` matches sandbox dashboard
- [ ] `PAYFAST_PASSPHRASE` matches sandbox dashboard exactly
- [ ] Passphrase has no trailing spaces
- [ ] Edge Functions deployed:
  ```bash
  supabase functions list
  # Should show:
  # - payments-create-checkout
  # - payfast-webhook
  ```
- [ ] Check function logs for webhook URL:
  ```
  PayFast webhook URLs: {
    notifyUrl: "https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook",
    ...
  }
  ```

### After Test Payment:

- [ ] Check Supabase logs: Edge Functions → `payfast-webhook`
- [ ] Check database: `SELECT * FROM payfast_itn_logs ORDER BY created_at DESC LIMIT 1;`
- [ ] Check PayFast dashboard: Transactions → ITN Status
- [ ] Check email inbox (and spam)
- [ ] Check database: `SELECT * FROM notification_queue ORDER BY created_at DESC LIMIT 1;`

---

## 🎯 Quick Test Script

Run this after setting environment variables:

```bash
# 1. Verify Edge Functions are deployed
supabase functions list

# 2. Check function logs to verify env vars are loaded
# (Check Supabase Dashboard → Edge Functions → Logs)

# 3. Make a test payment through app UI
# Use card: 4000 0000 0000 0002

# 4. Wait 10-30 seconds

# 5. Check ITN logs in database
psql $DATABASE_URL -c "SELECT m_payment_id, is_valid, processing_notes FROM payfast_itn_logs ORDER BY created_at DESC LIMIT 1;"

# 6. Check email queue
psql $DATABASE_URL -c "SELECT recipient, subject, status FROM notification_queue WHERE notification_type='email' ORDER BY created_at DESC LIMIT 1;"

# 7. Check PayFast sandbox dashboard
# https://sandbox.payfast.co.za/transactions
```

---

## 📞 Support Resources

**If issues persist**:

1. **PayFast Support**: support@payfast.co.za
2. **PayFast Documentation**: https://developers.payfast.co.za/
3. **Supabase Dashboard Logs**: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/logs/edge-functions
4. **Our Reference**: `docs/deployment/PAYFAST_OFFICIAL_REFERENCE.md`

---

## ✅ Final Checklist

**Before moving to production**:

- [ ] All sandbox tests passing
- [ ] Emails received from PayFast
- [ ] ITN webhooks processed successfully
- [ ] Custom emails sent via notification queue
- [ ] Subscription activated in database
- [ ] Amount verification added to webhook
- [ ] Error handling tested
- [ ] Production credentials obtained from PayFast
- [ ] Production environment variables configured
- [ ] SSL certificate valid for production URLs

---

**Status**: Ready for environment variable verification  
**Next**: Check variables in Supabase Dashboard, then test payment
