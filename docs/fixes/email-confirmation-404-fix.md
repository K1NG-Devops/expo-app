# Email Confirmation 404 Error Fix

**Issue ID**: email-confirmation-404-fix  
**Date**: 2025-10-22  
**Severity**: HIGH - Blocking parent registration  
**Status**: Pending Supabase Dashboard Configuration

## Problem Statement

When parents register and try to confirm their email, they receive a 404 error:

```
URL: https://bridge-edudashpro-ppxykomsp-k1ng-devops-projects.vercel.app/payments/?code=4f6fea3a-abf6-4ae7-9db9-e8473b0270b6
Error: 404: NOT_FOUND
Code: DEPLOYMENT_NOT_FOUND
```

### Root Cause

The Supabase email confirmation URL is pointing to the payment bridge Vercel deployment instead of the proper landing page. This is a **Supabase project configuration issue**, not a code issue.

### Expected Behavior

Email confirmation links should redirect to:
```
https://www.edudashpro.org.za/landing?token_hash=<hash>&type=email
```

Or with the flow parameter:
```
https://www.edudashpro.org.za/landing?flow=email-confirm&token_hash=<hash>
```

## Code Analysis

### Current Configuration (CORRECT)

**File**: `app/screens/parent-registration.tsx` (Line 76)

```typescript
const { data: authData, error: authError } = await assertSupabase().auth.signUp({
  email: registration.email,
  password: registration.password,
  options: {
    emailRedirectTo: 'https://www.edudashpro.org.za/landing?flow=email-confirm',
    data: {
      first_name: registration.firstName,
      last_name: registration.lastName,
      phone: registration.phone,
      role: 'parent',
    }
  }
});
```

✅ **The code correctly specifies the redirect URL**

### Landing Page Handler (CORRECT)

**File**: `app/landing.tsx` (Lines 60-84)

```typescript
// EMAIL CONFIRMATION: verify via token_hash if provided
const tokenHash = query.token_hash || query.token || '';
if ((flow === 'email-confirm' || query.type === 'email') && tokenHash) {
  setMessage(t('landing.verifying_email', { defaultValue: 'Verifying your email...' }));
  try {
    const { data, error } = await assertSupabase().auth.verifyOtp({ 
      token_hash: tokenHash, 
      type: 'email' 
    });
    if (error) throw error;
    setMessage(t('landing.email_verified', { defaultValue: 'Email verified. Opening app...' }));
    setStatus('done');
    // On native, route to sign-in or dashboard
    if (!isWeb) {
      router.replace('/(auth)/sign-in');
      return;
    }
    // On web, try to open app with context
    tryOpenApp(`/post-verify`);
    return;
  } catch (e: any) {
    setStatus('error');
    setMessage(e?.message || t('landing.email_verification_failed', { defaultValue: 'Email verification failed.' }));
    // Still try to open the app so the user can continue there
    if (isWeb) tryOpenApp(`/post-verify-error`);
    return;
  }
}
```

✅ **The landing page correctly handles email confirmation**

### Supabase Config (LOCAL - CORRECT)

**File**: `supabase/config.toml` (Lines 120-128)

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "https://www.edudashpro.org.za",
  "https://www.edudashpro.org.za/landing",
  "https://bridge-edudashpro-ppxykomsp-k1ng-devops-projects.vercel.app",
  "https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app"
]
```

⚠️ **Local config includes both landing and bridge URLs, which is fine for testing**

## Solution

### Step 1: Update Supabase Dashboard Configuration ✅ REQUIRED

1. **Log in to Supabase Dashboard**: https://supabase.com/dashboard
2. **Navigate to your project**: `edudashpro` (or appropriate project)
3. **Go to**: `Authentication` → `URL Configuration`
4. **Update the following settings**:

#### Site URL
Set to:
```
https://www.edudashpro.org.za/landing
```

#### Redirect URLs
Ensure the following URLs are in the allowed list:
```
https://www.edudashpro.org.za
https://www.edudashpro.org.za/landing
https://www.edudashpro.org.za/landing?**
https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app
https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments
edudashpro://**
```

**Important Notes**:
- The `?**` wildcard allows query parameters on the landing page
- Keep the bridge URLs for payment flows only
- Include the `edudashpro://**` scheme for deep linking

### Step 2: Verify Email Templates ✅ REQUIRED

1. **Navigate to**: `Authentication` → `Email Templates` → `Confirm signup`
2. **Verify the template uses**: `{{ .ConfirmationURL }}`
3. **Example correct template**:

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your account:</p>

<p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>

<p>If you didn't create an account with us, you can safely ignore this email.</p>
```

### Step 3: Test Email Confirmation Flow

1. Register a new parent account:
   ```
   Email: test-parent-$(date +%s)@example.com
   Password: TestPass123!
   ```

2. Check the email confirmation link format:
   - Should contain `https://www.edudashpro.org.za/landing`
   - Should include `token_hash` parameter
   - Should NOT redirect to payment bridge URL

3. Click the confirmation link and verify:
   - Landing page loads successfully
   - Email verification completes
   - User is redirected to sign-in or dashboard

## Alternative Fixes (If Dashboard Access Delayed)

### Option A: Use Environment Variable Override

If you need a temporary workaround while waiting for dashboard access, you can set the redirect URL via environment variable in Supabase Edge Functions:

**File**: Create new migration `supabase/migrations/<timestamp>_set_auth_site_url.sql`

```sql
-- Set site URL for email confirmations
-- This will be overridden by dashboard settings when available
UPDATE auth.config 
SET value = '"https://www.edudashpro.org.za/landing"'::jsonb
WHERE key = 'SITE_URL';
```

⚠️ **Not recommended**: This approach may be overridden by dashboard settings and requires service role access.

### Option B: Custom Email Template with Hardcoded URL

**Not recommended**, but as an emergency measure, you can hardcode the URL in the email template:

```html
<p><a href="https://www.edudashpro.org.za/landing?token_hash={{ .TokenHash }}&type=email">Confirm your email</a></p>
```

⚠️ **Warning**: This bypasses Supabase's URL security checks and should only be used temporarily.

## Verification Checklist

After applying the fix:

- [ ] Supabase Dashboard `site_url` set to `https://www.edudashpro.org.za/landing`
- [ ] Redirect URLs include all required URLs (landing, bridge, deep link)
- [ ] Email template uses `{{ .ConfirmationURL }}`
- [ ] Test parent registration creates account
- [ ] Email confirmation link received
- [ ] Link points to correct landing page URL
- [ ] Clicking link successfully verifies email
- [ ] User redirected to sign-in page after verification
- [ ] Sign-in works with verified email

## Related Files

- `app/screens/parent-registration.tsx` - Parent registration with emailRedirectTo
- `app/landing.tsx` - Landing page handler for email confirmation
- `supabase/config.toml` - Local Supabase configuration
- `lib/config/index.ts` - App configuration including payment bridge URL

## Monitoring

After deploying the fix, monitor:

1. **Sentry Error Reports**: Check for `404: NOT_FOUND` errors on landing page
2. **Email Confirmation Success Rate**: Track verifications in `auth.users` table
3. **User Feedback**: Monitor support channels for email confirmation issues

## Prevention

To prevent similar issues in the future:

1. **Document All Redirect URLs**: Maintain a list of authorized redirect URLs in `docs/security/redirect-urls.md`
2. **Automated Testing**: Create E2E test for email confirmation flow
3. **Dashboard Configuration Sync**: Periodically verify dashboard settings match `supabase/config.toml`
4. **Deployment Checklist**: Include "Verify Supabase redirect URLs" in deployment checklist

## References

- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/redirect-urls
- **WARP.md Rules**: Multi-tenant security and authentication requirements
- **Project ROAD-MAP.md**: Phase 1 - Onboarding improvements

---

**Status**: ✅ Solution documented  
**Next Action**: Apply Supabase Dashboard configuration changes  
**ETA**: 5 minutes (dashboard configuration only)
