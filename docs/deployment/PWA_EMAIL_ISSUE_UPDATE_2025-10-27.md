# PWA Email Confirmation Issue - Critical Update

**Date**: 2025-10-27 05:40 UTC  
**Status**: ROOT CAUSE REVISED  
**Original Report**: EMAIL_CONFIRMATION_INCIDENT_2025-10-27.md

---

## 🔄 MAJOR DISCOVERY

**Previous Assumption**: SMTP not configured, all users affected  
**NEW REALITY**: SMTP IS configured and working, **ONLY PWA users affected**

### Evidence

✅ **SMTP Configuration Confirmed**:
- Host: `smtp.resend.com`
- Port: `587`
- Username: `resend`
- Sender: `noreply@edudashpro.org.za` / `EduDash Pro`
- Status: **ENABLED and WORKING**

✅ **Mobile App Users**: **RECEIVING** confirmation emails  
❌ **PWA Users**: **NOT RECEIVING** confirmation emails

### New Root Cause Hypothesis

The issue is **NOT missing SMTP**. The issue is:

**PWA signup flow uses different code path that doesn't properly trigger email confirmation**

Possible causes:
1. PWA signup bypasses standard auth service
2. PWA signup missing `emailRedirectTo` parameter
3. PWA signup uses different Supabase client configuration
4. Environment variable differences (web-specific config)
5. PWA signup accidentally using `autoConfirm` mode

---

## 🎯 Investigation Required

### 1. Identify PWA Signup Entry Point

**Question**: Where do PWA users sign up?

**Likely paths**:
- `app/marketing/pricing.tsx` → "Get Started" button
- `app/(auth)/sign-up.tsx` → Redirects to sign-in
- `app/(auth)/sign-in.tsx` → Has signup embedded?
- `components/auth/WebBasicSignInForm.web.tsx` → Web-specific signup?

**Need to find**:
- Which component handles PWA user registration
- Does it call `supabase.auth.signUp()`?
- Does it include `options.emailRedirectTo`?
- Are there Platform.OS checks that branch to different code?

### 2. Compare Mobile vs PWA Code Paths

**Mobile App Signup** (WORKING):
```typescript
// app/screens/parent-registration.tsx (Line 76)
await supabase.auth.signUp({
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

**PWA Signup** (NOT WORKING):
- Location: ???
- Code: ???
- Has `emailRedirectTo`: ???

### 3. Check for Platform-Specific Auth Overrides

Look for:
```typescript
if (Platform.OS === 'web') {
  // Different auth behavior?
}
```

Or web-specific files:
- `*.web.tsx` files
- `Platform.select()` calls
- Environment variables that differ between platforms

---

## 🔍 Quick Diagnostic Commands

### Find PWA Signup Code

```bash
# Search for web-specific signup implementations
cd /media/king/0758576e-6f1e-485f-b9e0-00b44a1d3259/home/king/Desktop/edudashpro

# Find web-specific auth files
find app components -name "*.web.tsx" -o -name "*WebBasic*"

# Search for Platform.OS checks in auth code
grep -r "Platform.OS.*web" app/(auth) components/auth

# Search for signUp calls
grep -r "auth.signUp" app components | grep -v node_modules
```

### Check if PWA Uses Different Supabase Client

```bash
# Check for web-specific Supabase initialization
grep -r "Platform.OS.*web" lib/supabase

# Check for env-specific configuration
grep -r "EXPO_PUBLIC.*WEB" .env*
```

### Database Query: Identify PWA vs Mobile Users

```sql
-- Check if there's metadata indicating platform
SELECT 
  email,
  raw_user_meta_data,
  created_at,
  email_confirmed_at
FROM auth.users 
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

Look for:
- `raw_user_meta_data` differences
- Platform indicators
- User agent strings

---

## 🚨 Immediate Action Plan

### Step 1: Find PWA Signup Component (10 minutes)

1. **Check pricing page flow**:
   - User clicks "Get Started" on pricing page
   - Calls `navigateTo.signUpWithPlan()`
   - Where does this go?

2. **Check if there's a web-only signup form**:
   - `components/auth/WebBasicSignInForm.web.tsx` exists
   - Is there a web-only signup component?

3. **Trace the flow**:
   - Start: PWA user on pricing page
   - Action: Click "Get Started"
   - Result: Where do they land?
   - Registration: Which component handles it?

### Step 2: Compare Signup Code (15 minutes)

Once you find the PWA signup component:

1. **Extract the signUp call**:
   ```typescript
   // What does it look like?
   await supabase.auth.signUp({
     email,
     password,
     options: {
       // Does this have emailRedirectTo?
       // Does it match mobile app?
     }
   });
   ```

2. **Check for missing parameters**:
   - ❌ Missing `options.emailRedirectTo`?
   - ❌ Missing `options.data`?
   - ❌ Has `options.emailConfirm: false`?

### Step 3: Test with User Creation (5 minutes)

Create a test user via PWA:
1. Open browser to pricing page
2. Click "Get Started" on Free plan
3. Fill in registration form
4. Submit
5. Check:
   - Browser Network tab: What's the auth.signUp request?
   - Database: Does user get created?
   - Resend: Does email get sent?

### Step 4: Fix the Code (30 minutes)

Once we identify the PWA signup component:

**Add or fix the emailRedirectTo**:
```typescript
// Before (broken)
await supabase.auth.signUp({
  email,
  password,
});

// After (fixed)
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: 'https://www.edudashpro.org.za/landing?flow=email-confirm',
    data: {
      first_name: firstName,
      last_name: lastName,
      role: 'parent', // or derived from context
    }
  }
});
```

---

## 📋 Files to Check

Based on the codebase structure:

### High Priority

1. **`lib/navigation/router-utils.ts`**:
   - Contains `navigateTo.signUpWithPlan()`
   - Where does it route to?

2. **`app/(auth)/sign-in.tsx`**:
   - Line 37, 156, 164 have `Platform.OS` checks
   - Does it handle signup differently for web?

3. **`app/(auth)/sign-up.tsx`**:
   - Currently just redirects to sign-in
   - Is there supposed to be actual signup logic here?

4. **`components/auth/WebBasicSignInForm.web.tsx`**:
   - Web-specific signin form
   - Does it have embedded signup?

### Medium Priority

5. **`services/EnhancedAuthService.ts`**:
   - Has signUp methods for different roles
   - Are these being used by PWA?

6. **`contexts/AuthContext.tsx`**:
   - Lines 194, 244, 405, 407 have `Platform.OS` checks
   - Could affect auth behavior

7. **`lib/supabase.ts`**:
   - Lines 42, 49 have `Platform.OS` checks
   - Different Supabase client for web?

---

## 🎯 Next Steps

**Immediate**:
1. Find where PWA users actually sign up
2. Inspect the signUp code in that component
3. Compare with working mobile app signup
4. Identify what's missing or different

**Once Found**:
1. Add `emailRedirectTo` if missing
2. Test with new PWA user signup
3. Verify email is sent via Resend
4. Confirm user can click link and verify

**After Fix**:
1. Update documentation
2. Add tests to prevent regression
3. Consider unifying mobile + PWA signup code

---

## 💡 Hypothesis

**Most Likely**: PWA users sign up via a web-specific component that doesn't include `emailRedirectTo` in the signUp options.

**Less Likely**: 
- Environment variable difference
- Supabase client configuration difference
- Accidental auto-confirm mode for web

**Next**: Trace the PWA user journey from pricing page → signup → database.

---

**Status**: Investigation in progress  
**Blocker**: Need to identify which component handles PWA signup  
**ETA**: 1 hour once component is identified
