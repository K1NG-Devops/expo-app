# PayFast Official Documentation Reference

**Date**: 2025-10-22  
**Official Docs**: https://developers.payfast.co.za/  
**Purpose**: Implementation reference for both sandbox and production environments

---

## 📋 Official Documentation Links

### Primary Resources
- **Main Documentation**: https://developers.payfast.co.za/docs
- **ITN Documentation**: https://developers.payfast.co.za/documentation/instant-transaction-notification/
- **Integration Guide**: https://developers.payfast.co.za/documentation/integration-overview/
- **Sandbox Guide**: https://developers.payfast.co.za/documentation/sandbox-testing/
- **API Reference**: https://developers.payfast.co.za/documentation/api-reference/

### Account Portals
- **Production Dashboard**: https://www.payfast.co.za/
- **Sandbox Dashboard**: https://sandbox.payfast.co.za/

---

## 🔐 Environment Configuration

### Sandbox Environment

**Purpose**: Testing payments without real money transactions

**Configuration**:
```bash
# Supabase Edge Function Environment Variables
PAYFAST_MODE=sandbox
PAYFAST_MERCHANT_ID=10000100          # Standard sandbox merchant ID
PAYFAST_MERCHANT_KEY=<your-sandbox-key>  # From sandbox dashboard
PAYFAST_PASSPHRASE=<your-passphrase>  # Set in sandbox dashboard Settings → Integration
```

**API Endpoints**:
- **Payment Gateway**: `https://sandbox.payfast.co.za/eng/process`
- **ITN Validation**: `https://sandbox.payfast.co.za/eng/query/validate`

**Key Features**:
- ✅ Test card numbers work (no real charges)
- ✅ ITN (webhooks) sent to your `notify_url`
- ✅ Email confirmations sent (if enabled)
- ✅ Full payment flow simulation
- ⚠️ Data cleared periodically by PayFast

**Test Cards** (from official docs):
| Card Number | CVV | Expiry | Result |
|-------------|-----|--------|--------|
| 4000 0000 0000 0002 | 123 | Any future date | ✅ Approved |
| 4000 0000 0000 0010 | 123 | Any future date | ❌ Declined |
| 4000 0000 0000 0028 | 123 | Any future date | ⏳ Pending |

**Sandbox Merchant ID**:
- Always: `10000100` (standard for all sandbox users)
- Merchant Key: Unique per sandbox account (get from dashboard)

### Production Environment

**Purpose**: Real payment processing with actual money

**Configuration**:
```bash
# Supabase Edge Function Environment Variables
PAYFAST_MODE=live  # or 'production'
PAYFAST_MERCHANT_ID=<your-production-merchant-id>  # From production dashboard
PAYFAST_MERCHANT_KEY=<your-production-key>  # From production dashboard
PAYFAST_PASSPHRASE=<your-production-passphrase>  # Set in production dashboard
```

**API Endpoints**:
- **Payment Gateway**: `https://www.payfast.co.za/eng/process`
- **ITN Validation**: `https://www.payfast.co.za/eng/query/validate`

**Requirements**:
- ✅ Verified PayFast merchant account
- ✅ Business registration documents submitted
- ✅ Bank account verified
- ✅ PCI compliance for handling card data (PayFast handles this)
- ✅ SSL certificate on your domain (for return URLs)

**Production Merchant ID**:
- Format: 8-digit number (e.g., `12345678`)
- Get from: Production dashboard → Settings → Merchant Details

---

## 🔗 Integration Parameters

### Required Parameters (Payment Request)

According to official docs, these parameters MUST be sent:

```typescript
const params = {
  // Merchant credentials
  merchant_id: string,      // Your merchant ID (10000100 for sandbox)
  merchant_key: string,     // Your merchant key
  
  // Transaction details
  amount: string,           // Format: "199.00" (2 decimal places)
  item_name: string,        // Description of purchase
  
  // URLs
  return_url: string,       // Where to redirect after successful payment
  cancel_url: string,       // Where to redirect if user cancels
  notify_url: string,       // Your ITN webhook endpoint (CRITICAL)
  
  // Transaction tracking
  m_payment_id: string,     // Your unique transaction ID
  
  // Optional but recommended
  email_confirmation: '1',  // Enable email notifications
  email_address: string,    // Customer email (optional but recommended)
  
  // Custom fields (max 5)
  custom_str1: string,      // e.g., plan tier
  custom_str2: string,      // e.g., scope (user/school)
  custom_str3: string,      // e.g., user/school ID
  custom_str4: string,      // e.g., JSON metadata
  custom_str5: string,      // Reserved for future use
  
  // Security (required if passphrase is set)
  signature: string,        // MD5 hash of parameters + passphrase
};
```

### Email Notification Parameters

**From official documentation**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email_confirmation` | string | No | Set to `'1'` to enable PayFast email confirmations |
| `email_address` | string | No | Customer email for payment confirmation |
| `confirmation_address` | string | No | Alternative email for merchant confirmation |

**Email Behavior**:
- ✅ **Sandbox**: Emails ARE sent if `email_confirmation: '1'` and `email_address` provided
- ✅ **Production**: Emails sent by default (can be disabled in dashboard)
- ✅ **Format**: HTML emails with payment details
- ✅ **Sender**: `noreply@payfast.co.za`

**Important**: According to official docs, sandbox DOES send emails. If not receiving:
1. Check spam folder
2. Verify `email_confirmation: '1'` is set
3. Verify `email_address` is valid
4. Check PayFast sandbox dashboard → Settings → Email Notifications

---

## 🔔 ITN (Instant Transaction Notification)

### What is ITN?

PayFast's server-to-server notification system (similar to webhooks).

**Official Documentation**: https://developers.payfast.co.za/documentation/instant-transaction-notification/

### ITN Flow

```
1. Customer completes payment on PayFast
2. PayFast redirects customer to return_url (browser)
3. PayFast sends POST to notify_url (server-to-server) ← CRITICAL
4. Your server validates ITN
5. Your server returns HTTP 200 OK
6. PayFast marks ITN as delivered
```

### ITN Validation (Official Steps)

**From official documentation**, validate ITN in this order:

#### 1. Verify Source IP (Optional but Recommended)
```typescript
const PAYFAST_IPS = [
  '41.74.179.194',
  '41.74.179.195',
  '41.74.179.196',
  '41.74.179.197',
  '41.74.179.210',
  // Sandbox may use different IPs
];
```

#### 2. Verify POST Variables
```typescript
// Check required fields exist
const required = ['m_payment_id', 'pf_payment_id', 'payment_status', 'amount_gross'];
for (const field of required) {
  if (!payload[field]) {
    throw new Error(`Missing required field: ${field}`);
  }
}
```

#### 3. Verify Signature (If Passphrase Set)

**Official Algorithm** (from PayFast docs):

```typescript
// Step 1: Build parameter string
// - Exclude 'signature' field
// - Keep original POST order
// - URL encode values (RFC1738: spaces as '+', uppercase hex)
// - Join with '&'

function encodeRFC1738(value: string): string {
  return encodeURIComponent(value)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/g, (match) => match.toUpperCase());
}

const pairs: string[] = [];
for (const [key, value] of postParams.entries()) {
  if (key === 'signature') continue;
  if (value !== '') {
    pairs.push(`${key}=${encodeRFC1738(value)}`);
  }
}

// Step 2: Append passphrase
const paramString = pairs.join('&');
const signatureString = `${paramString}&passphrase=${encodeRFC1738(PASSPHRASE)}`;

// Step 3: Compute MD5 hash
const computedSignature = md5(signatureString);

// Step 4: Compare (case-insensitive)
const isValid = computedSignature.toLowerCase() === providedSignature.toLowerCase();
```

#### 4. Validate with PayFast Server

**Official Endpoint**:
- Sandbox: `POST https://sandbox.payfast.co.za/eng/query/validate`
- Production: `POST https://www.payfast.co.za/eng/query/validate`

```typescript
const response = await fetch(validateUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: rawPostData, // Original POST body exactly as received
});

const result = await response.text();
// Valid response: "VALID"
// Invalid response: "INVALID" or error message
```

#### 5. Verify Amount (Recommended)

```typescript
const expectedAmount = '199.00';
const receivedAmount = payload.amount_gross;

if (parseFloat(receivedAmount) !== parseFloat(expectedAmount)) {
  throw new Error('Amount mismatch');
}
```

#### 6. Check Payment Status

```typescript
const status = payload.payment_status;

switch (status) {
  case 'COMPLETE':
    // Payment successful - activate subscription
    break;
  case 'FAILED':
    // Payment failed
    break;
  case 'PENDING':
    // Payment pending (rare)
    break;
  case 'CANCELLED':
    // User cancelled
    break;
  default:
    // Unknown status
}
```

### ITN Response Requirements

**From official docs**:

✅ **Must return HTTP 200 OK** within 10 seconds
❌ **Don't return redirects** (3xx)
❌ **Don't return errors** (4xx, 5xx)
⚠️ **PayFast retries** if no 200 response (up to 5 times over 24 hours)

```typescript
// Correct response
return new Response("OK", { status: 200 });

// Also acceptable
return new Response("SUCCESS", { status: 200 });

// Wrong - will cause retries
return new Response("OK", { status: 201 });  // Must be 200
return new Response("Error", { status: 500 });
```

---

## 🔒 Security Requirements

### Passphrase (Required for Production)

**Official Recommendation**: Always use a passphrase for security

**Setup**:
1. Login to PayFast dashboard
2. Go to **Settings** → **Integration**
3. Set passphrase (strong, random string)
4. Save passphrase in your environment variables
5. Use exact same passphrase in signature computation

**Passphrase Rules**:
- Case-sensitive
- Special characters allowed
- Recommended: 32+ random characters
- Must match exactly between dashboard and code

### SSL/TLS Requirements

**From official docs**:

✅ **Production**: SSL required for all URLs (return, cancel, notify)
⚠️ **Sandbox**: SSL recommended but not required
🔒 **notify_url**: Must be HTTPS in production

**Valid URLs**:
```
✅ https://yourdomain.com/webhook
✅ https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook
❌ http://yourdomain.com/webhook  (HTTP not allowed in production)
```

---

## 📧 Email Notifications

### PayFast Default Emails

**Sent by PayFast** (from `noreply@payfast.co.za`):

1. **Payment Confirmation** (to customer):
   - Sent when `email_confirmation: '1'` and `email_address` provided
   - Contains transaction details
   - Works in both sandbox and production

2. **Merchant Notification** (to merchant):
   - Sent to email in merchant account settings
   - Optional: Set `confirmation_address` to override

### Custom Emails (Your Application)

**Best Practice**: Send your own branded emails via ITN webhook

```typescript
// In payfast-webhook function
if (payment_status === 'COMPLETE') {
  // Queue your custom email
  await supabase.from('notification_queue').insert({
    notification_type: 'email',
    recipient: customerEmail,
    subject: '✅ Subscription Activated',
    body: customHtmlTemplate,
  });
}
```

**Why send custom emails?**:
- ✅ Branded with your logo/colors
- ✅ Include subscription details specific to your app
- ✅ Add next steps / onboarding instructions
- ✅ Track email delivery status

---

## 🧪 Testing Checklist

### Sandbox Testing

- [ ] Merchant credentials set in Supabase Edge Functions
- [ ] `PAYFAST_MODE=sandbox`
- [ ] `notify_url` points to publicly accessible HTTPS endpoint
- [ ] Passphrase matches between dashboard and code
- [ ] Test payment with card `4000 0000 0000 0002`
- [ ] Verify ITN received within 10 seconds
- [ ] Check PayFast sandbox dashboard → Transactions → ITN Status
- [ ] Verify email received (if `email_confirmation: '1'`)

### Production Readiness

- [ ] PayFast merchant account verified
- [ ] Bank account linked
- [ ] `PAYFAST_MODE=live`
- [ ] Production merchant ID and key set
- [ ] Production passphrase configured
- [ ] All URLs use HTTPS
- [ ] notify_url accessible from PayFast servers
- [ ] ITN validation fully implemented
- [ ] Amount verification in place
- [ ] Duplicate transaction prevention (idempotency)
- [ ] Error handling and logging
- [ ] Customer email confirmations working

---

## ⚠️ Common Issues

### Issue 1: ITN Not Received

**Causes**:
1. ❌ `notify_url` not publicly accessible
2. ❌ `notify_url` using HTTP instead of HTTPS
3. ❌ Firewall blocking PayFast IPs
4. ❌ Endpoint returning non-200 status code
5. ❌ Endpoint timeout (>10 seconds)

**Debug**:
```bash
# Check PayFast dashboard
# Sandbox: https://sandbox.payfast.co.za/transactions
# Look for ITN Status column - shows delivery attempts

# Check your Edge Function logs
# Supabase Dashboard → Edge Functions → payfast-webhook → Logs
```

### Issue 2: Signature Validation Failed

**Causes**:
1. ❌ Passphrase mismatch (case-sensitive!)
2. ❌ Wrong encoding (must be RFC1738)
3. ❌ Incorrect parameter order
4. ❌ Including `signature` field in computation
5. ❌ Modifying POST data before validation

**Fix**:
- Copy passphrase EXACTLY from dashboard (no trailing spaces)
- Use original POST body for validation
- Log signature computation steps for debugging

### Issue 3: Emails Not Sent (Sandbox)

**Causes**:
1. ❌ `email_confirmation` not set to `'1'`
2. ❌ `email_address` empty or invalid
3. ❌ Email in spam folder
4. ❌ PayFast email notifications disabled in dashboard

**Fix**:
```typescript
// Ensure parameters are set
const params = {
  // ... other params
  email_confirmation: '1',  // Must be string '1'
  email_address: 'customer@example.com',  // Valid email
};
```

---

## 📊 Monitoring in Production

### Track These Metrics

1. **ITN Delivery Rate**:
   ```sql
   SELECT 
     COUNT(*) as total,
     SUM(CASE WHEN is_valid THEN 1 ELSE 0 END) as valid,
     SUM(CASE WHEN is_valid THEN 0 ELSE 1 END) as invalid
   FROM payfast_itn_logs
   WHERE created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Payment Success Rate**:
   ```sql
   SELECT 
     payment_status,
     COUNT(*) as count
   FROM payfast_itn_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY payment_status;
   ```

3. **ITN Processing Time**:
   - Monitor Edge Function execution time
   - Should be < 5 seconds to avoid timeouts

### Alert On

- ⚠️ ITN validation failures > 5% of transactions
- ⚠️ No ITNs received for > 1 hour during business hours
- ⚠️ Signature validation failure rate > 1%
- ⚠️ Edge Function errors > 0.1%

---

## 📚 Official Resources Summary

| Resource | URL | Purpose |
|----------|-----|---------|
| Main Docs | https://developers.payfast.co.za/ | Overview and getting started |
| ITN Guide | https://developers.payfast.co.za/documentation/instant-transaction-notification/ | Webhook implementation |
| API Reference | https://developers.payfast.co.za/documentation/api-reference/ | Parameter specifications |
| Sandbox Dashboard | https://sandbox.payfast.co.za/ | Testing account management |
| Production Dashboard | https://www.payfast.co.za/ | Live account management |
| Support | support@payfast.co.za | Technical support email |

---

## 🔄 Implementation Status

### ✅ Currently Implemented

- [x] Sandbox configuration
- [x] Payment request with all required parameters
- [x] ITN webhook endpoint (`payfast-webhook`)
- [x] Signature validation
- [x] PayFast server validation
- [x] Payment status handling
- [x] Custom email notifications (via `notification_queue`)
- [x] Transaction logging (`payfast_itn_logs`)
- [x] Idempotency protection
- [x] Error handling

### ⏳ Pending

- [ ] Production credentials verification
- [ ] Amount verification in ITN handler
- [ ] PayFast IP whitelist check
- [ ] Retry logic for failed ITNs
- [ ] Monitoring dashboard

---

**Last Updated**: 2025-10-22  
**Based On**: PayFast Official Documentation v2024  
**Maintained By**: EduDash Pro DevOps
