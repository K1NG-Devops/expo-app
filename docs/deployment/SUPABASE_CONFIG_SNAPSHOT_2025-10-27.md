# Supabase Configuration Snapshot

**Date**: 2025-10-27 05:24 UTC  
**Purpose**: Baseline configuration before SMTP setup  
**Related**: EMAIL_CONFIRMATION_INCIDENT_2025-10-27.md

---

## Configuration Type

**Managed Supabase Cloud** (not self-hosted)

Evidence:
- Database connection: `aws-0-ap-southeast-1.pooler.supabase.com:6543`
- No local Docker containers running
- Using Supabase pooler infrastructure
- Project ID: `lvvvjywrmpcqrpvuptdi`

---

## Local Configuration File Analysis

**File**: `supabase/config.toml`

### Authentication Settings

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"  # Local development only
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "https://www.edudashpro.org.za",
  "https://www.edudashpro.org.za/landing",
  "https://bridge-edudashpro-ppxykomsp-k1ng-devops-projects.vercel.app",
  "https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app"
]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_signup = true
enable_anonymous_sign_ins = false
enable_manual_linking = false
minimum_password_length = 6
password_requirements = ""
```

**Analysis**:
- ✅ Signups enabled
- ✅ Anonymous sign-ins disabled (good security)
- ⚠️ Minimum password 6 chars (code enforces 12+)
- ⚠️ No password complexity requirements (code validates this)

### Email Configuration

```toml
[auth.email]
# Allow/disallow new user signups via email to your project.
enable_signup = true

# If enabled, a user will be required to confirm any email change on both the old, and new email
# addresses. If disabled, only the new email is required to confirm.
double_confirm_changes = true

# If enabled, users need to confirm their email address before signing in.
enable_confirmations = true  # ✅ ENABLED

# If enabled, users will need to reauthenticate or have logged in recently to change their password.
secure_password_change = false

# Controls the minimum amount of time that must pass before sending another signup confirmation or password reset email.
max_frequency = "1s"

# Number of characters used in the email OTP.
otp_length = 6

# Number of seconds before the email OTP expires (defaults to 1 hour).
otp_expiry = 3600
```

**Analysis**:
- ✅ Email signup enabled
- ✅ Double confirm changes enabled
- ✅ **`enable_confirmations = true`** - REQUIRES email confirmation
- ⚠️ `max_frequency = "1s"` - Very permissive (allows rapid resends)

### SMTP Configuration

```toml
# Use a production-ready SMTP server
# [auth.email.smtp]
# enabled = true
# host = "smtp.sendgrid.net"
# port = 587
# user = "apikey"
# pass = "env(SENDGRID_API_KEY)"
# admin_email = "admin@email.com"
# sender_name = "Admin"
```

**❌ CRITICAL ISSUE**: 
- **ENTIRE SMTP SECTION IS COMMENTED OUT**
- No SMTP host configured
- No credentials configured
- No sender email configured

**Impact**:
- Supabase cannot send emails
- Falls back to **auto-confirm behavior**
- Users never receive confirmation emails

### Rate Limiting

```toml
[auth.rate_limit]
# Number of emails that can be sent per hour. Requires auth.email.smtp to be enabled.
email_sent = 2  # Only 2 emails per hour!

# Number of SMS messages that can be sent per hour. Requires auth.sms to be enabled.
sms_sent = 30

# Number of anonymous sign-ins that can be made per hour per IP address.
anonymous_users = 30

# Number of sessions that can be refreshed in a 5 minute interval per IP address.
token_refresh = 150

# Number of sign up and sign-in requests that can be made in a 5 minute interval per IP address.
sign_in_sign_ups = 30

# Number of OTP / Magic link verifications that can be made in a 5 minute interval per IP address.
token_verifications = 30

# Number of Web3 logins that can be made in a 5 minute interval per IP address.
web3 = 30
```

**⚠️ ISSUE**: 
- `email_sent = 2` - **EXTREMELY restrictive** (only 2 emails per hour!)
- This will cause problems even after SMTP is configured
- Should be increased to at least 10-20 for production

---

## Dashboard Configuration (To Be Verified)

**Action Required**: Manual inspection of Supabase Dashboard

Navigate to: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi

### Authentication → Email

**To Record**:
- [ ] Confirm email before signing in: ON or OFF?
- [ ] Allow unconfirmed email sign-in: ON or OFF?
- [ ] Double confirm email changes: ON or OFF?
- [ ] Email OTP expiry: value
- [ ] Email OTP length: value

**Expected State** (based on local config):
- Confirm email: **ON** (enable_confirmations = true)
- Allow unconfirmed sign-in: **Should be OFF**
- Double confirm changes: **ON**
- OTP expiry: 3600 seconds (1 hour)
- OTP length: 6 characters

### Authentication → URL Configuration

**To Record**:
- [ ] Site URL: (currently showing)
- [ ] Redirect URLs: (list all)

**Expected State**:
- Site URL: `https://www.edudashpro.org.za` or `https://www.edudashpro.org.za/landing`
- Redirect URLs should include:
  - `https://www.edudashpro.org.za`
  - `https://www.edudashpro.org.za/landing`
  - `https://www.edudashpro.org.za/landing?**`
  - `edudashpro://**`
  - Bridge URLs (for payments)

### Authentication → Templates

**To Record**:
- [ ] Confirm signup template: Enabled? Content preview?
- [ ] Does it use `{{ .ConfirmationURL }}`?

### Project Settings → Auth/Email Provider

**To Record**:
- [ ] SMTP Host: (value or empty)
- [ ] SMTP Port: (value or empty)
- [ ] SMTP Username: (value or empty)
- [ ] SMTP Password: (configured or empty)
- [ ] Sender Name: (value or empty)
- [ ] Sender Email: (value or empty)
- [ ] TLS/STARTTLS: (selected option)

**Expected State** (hypothesis):
- All fields likely **EMPTY** or using Supabase default SMTP
- No custom SMTP configured
- This explains why no emails are being sent

---

## Configuration Discrepancies

### Local vs Production

**Issue**: Local `config.toml` is for **local development only**

The file states:
```toml
site_url = "http://127.0.0.1:3000"  # Local development
```

This means:
- Local config is used for `supabase start` (local dev)
- **Production uses Supabase Dashboard settings**
- Dashboard likely has different (or missing) SMTP config

### Key Questions

1. **Is SMTP configured in Dashboard?**
   - Hypothesis: NO (would explain why no emails sent)

2. **Does Dashboard have correct Site URL?**
   - Should be: `https://www.edudashpro.org.za`
   - Not: `http://127.0.0.1:3000`

3. **Are Redirect URLs correct in Dashboard?**
   - Must include production landing page URL
   - Must include deep link scheme

---

## Recommended Configuration

### For Managed Supabase Dashboard

**SMTP Configuration** (via Authentication → Email provider):
```
Provider: Custom SMTP
Host: smtp.resend.com
Port: 587
Security: STARTTLS
Username: resend
Password: <SMTP_PASSWORD_FROM_RESEND>
Sender Name: EduDash Pro
Sender Email: noreply@edudashpro.org.za
```

**Email Settings** (via Authentication → Email):
```
Confirm email before signing in: ON
Allow unconfirmed email sign-in: OFF
Double confirm email changes: ON
Email rate limit: 20 per hour (increase from 2)
```

**URL Configuration** (via Authentication → URL Configuration):
```
Site URL: https://www.edudashpro.org.za

Redirect URLs:
- https://www.edudashpro.org.za
- https://www.edudashpro.org.za/landing
- https://www.edudashpro.org.za/landing?**
- edudashpro://**
- https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app
- https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments
```

### For Self-Hosted (if applicable)

If you were self-hosting Gotrue (you're not), you'd set:
```bash
GOTRUE_SMTP_HOST=smtp.resend.com
GOTRUE_SMTP_PORT=587
GOTRUE_SMTP_USER=resend
GOTRUE_SMTP_PASS=<password>
GOTRUE_MAILER_DEFAULT_SENDER=noreply@edudashpro.org.za
GOTRUE_ENABLE_CONFIRMATIONS=true
GOTRUE_MAILER_AUTOCONFIRM=false
GOTRUE_SITE_URL=https://www.edudashpro.org.za
```

---

## Next Steps

1. ✅ Local config analysis complete
2. ⏳ **MANUAL ACTION REQUIRED**: Log into Supabase Dashboard and record:
   - Authentication → Email settings (current state)
   - Authentication → URL Configuration (current state)
   - Project Settings → Email provider (SMTP config)
3. ⏳ Configure SMTP with Resend
4. ⏳ Update email rate limit from 2 to 20 per hour
5. ⏳ Verify Site URL is production URL, not localhost

---

**Next Document**: Record Dashboard settings in `SUPABASE_DASHBOARD_SETTINGS_2025-10-27.md`
