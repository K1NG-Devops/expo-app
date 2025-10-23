# 🔥 URGENT: Fix Email Confirmation 404 Error

## Quick Fix (5 minutes)

Your Supabase project ID: **lvvvjywrmpcqrpvuptdi**

### Step 1: Update Site URL

1. **Open this link**: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/auth/url-configuration

2. **Find "Site URL" field** and change it to:
   ```
   https://www.edudashpro.org.za/landing
   ```

3. **Click "Save"**

### Step 2: Add Redirect URLs

On the same page, scroll to **"Redirect URLs"** section:

1. **Add these URLs** (click "+ Add URL" for each):
   ```
   https://www.edudashpro.org.za
   https://www.edudashpro.org.za/landing
   https://www.edudashpro.org.za/landing?**
   https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app
   https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments
   edudashpro://**
   ```

2. **Click "Save"** after adding all URLs

### Step 3: Verify Email Template

1. **Open this link**: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/auth/templates

2. **Click on "Confirm signup" template**

3. **Verify it contains**: `{{ .ConfirmationURL }}`
   - If not, make sure the link uses this variable

4. **Click "Save Changes"** if you made any edits

### Step 4: Test the Fix

1. **Register a new test parent**:
   - Use a real email you can access
   - Email: your-email+test@gmail.com
   - Password: TestPass123!

2. **Check your email**:
   - Look for the confirmation link
   - It should start with: `https://www.edudashpro.org.za/landing`
   - NOT: `https://bridge-edudashpro-ppxykomsp-k1ng-devops-projects.vercel.app`

3. **Click the link**:
   - Should show "Verifying your email..."
   - Then "Email verified"
   - Should redirect to sign-in

## ⚠️ Common Issues

**"URL not allowed" error?**
- Make sure you added the wildcard: `https://www.edudashpro.org.za/landing?**`

**Still getting 404?**
- Wait 1-2 minutes for Supabase to propagate changes
- Clear browser cache
- Try registering a new account

**Email not arriving?**
- Check spam folder
- Verify email confirmations are enabled: https://supabase.com/dashboard/project/lvvvjywrmpcqrpvuptdi/auth/url-configuration
- Look for "Enable email confirmations" toggle (should be ON)

## 📝 What This Fixes

**Before**: Email links → `https://bridge-edudashpro-ppxykomsp-k1ng-devops-projects.vercel.app/payments/?code=...` → **404 ERROR**

**After**: Email links → `https://www.edudashpro.org.za/landing?token_hash=...` → **SUCCESS ✓**

## Need Help?

If you're still having issues after following these steps, check:
- Full documentation: `docs/fixes/email-confirmation-404-fix.md`
- Supabase Auth docs: https://supabase.com/docs/guides/auth/redirect-urls

---

**Status**: Ready to apply  
**Time required**: 5 minutes  
**Requires**: Supabase Dashboard access
