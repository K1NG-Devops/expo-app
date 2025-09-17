# Fix Authentication Issues - Deployment Guide

## Issue Summary
The app is experiencing authentication errors with the message:
```
ERROR  Failed to fetch user profile: {"code": "42703", "details": null, "hint": null, "message": "column users.capabilities does not exist"}
```

## Root Cause
The database is missing the `capabilities` column that the application code expects to exist in the user profiles.

## Solution Overview
1. **Add missing database columns** - Run SQL migration to add `capabilities` column
2. **Deploy missing Edge Functions** - Deploy `ai-proxy` function for AI operations  
3. **Verify the fix** - Test authentication and push notifications

---

## Step 1: Apply Database Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **SQL Editor**
3. Copy the entire contents of `FIX_AUTHENTICATION_ISSUES_COMPLETE.sql`
4. Paste into SQL Editor and click **Run**
5. Verify successful execution (should see "Success. No rows returned")

### Option B: Command Line (if available)
```bash
npx supabase db push
```

---

## Step 2: Deploy Missing Edge Functions

### Deploy ai-proxy function:
```bash
npx supabase login
npx supabase functions deploy ai-proxy
```

If you get authentication issues:
1. Run `npx supabase login` first
2. Follow the browser authentication flow
3. Retry the deploy command

### Verify Function Deployment:
```bash
npx supabase functions list
```
You should see `ai-proxy` in the list.

---

## Step 3: Verify Database Changes

Run these verification queries in Supabase Dashboard > SQL Editor:

### Check profiles table structure:
```sql
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;
```

### Check that all profiles have capabilities:
```sql
SELECT COUNT(*) as total_profiles, 
       COUNT(capabilities) as profiles_with_capabilities,
       COUNT(*) - COUNT(capabilities) as missing_capabilities
FROM profiles;
```

### Check sample capabilities:
```sql
SELECT id, email, role, capabilities 
FROM profiles 
LIMIT 5;
```

---

## Step 4: Test the Fix

### Mobile App Testing:
1. **Restart the app** completely (kill and relaunch)
2. **Login** with existing credentials:
   - Email: `superadmin@edudashpro.org.za`
   - Password: `#Olivia@17`
3. **Check for errors** - No more "column users.capabilities does not exist" errors
4. **Test push notifications**:
   - Go to Settings
   - Look for "Push Testing" section (should now be visible)
   - Try sending a test notification

### Expected Results After Fix:
✅ No authentication errors in logs  
✅ User profiles load successfully  
✅ Push Testing section visible in Settings  
✅ Dashboard data loads without "User not authenticated" errors  

---

## Step 5: Monitor and Verify

### Check Application Logs:
```bash
adb logcat -d | grep -i "edudash\|react\|expo" | tail -20
```

### What to Look For:
- ✅ **No more "capabilities does not exist" errors**
- ✅ **Successful user profile fetch logs**  
- ✅ **Dashboard data loading properly**
- ✅ **Push notification registration working**

---

## Troubleshooting

### If Authentication Still Fails:
1. **Check RLS Policies**: Ensure profiles table has proper RLS policies
2. **Verify User Exists**: Check if user has a profile record
3. **Check Capabilities**: Ensure capabilities column is populated

### Manual User Profile Creation (if needed):
```sql
INSERT INTO profiles (id, email, role, capabilities)
SELECT 
    id, 
    email, 
    'super_admin',
    '["access_mobile_app", "view_all_organizations", "manage_organizations", "view_billing", "manage_subscriptions", "access_admin_tools"]'::jsonb
FROM auth.users 
WHERE email = 'superadmin@edudashpro.org.za'
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    capabilities = EXCLUDED.capabilities;
```

### If Push Notifications Don't Work:
1. **Check Environment Variables**: Ensure `EXPO_PUBLIC_ENABLE_TEST_TOOLS=1` in app
2. **Verify Function Deployment**: Confirm `ai-proxy` function exists
3. **Test Push Device Registration**: Check push_devices table has records

---

## Success Criteria

The fix is successful when:

1. ✅ **No authentication errors** in app logs
2. ✅ **User profiles load** without database errors  
3. ✅ **Dashboard shows real data** instead of auth errors
4. ✅ **Push Testing section visible** in Settings
5. ✅ **All app features accessible** for logged-in users

---

## Files Created/Modified

- ✅ `FIX_AUTHENTICATION_ISSUES_COMPLETE.sql` - Complete database migration
- ✅ `supabase/functions/ai-proxy/index.ts` - Missing Edge Function  
- ✅ `db/20250917_add_missing_capabilities_column.sql` - Original migration

---

## Next Steps

After successful deployment:

1. **Test all user roles** (super_admin, teacher, parent)
2. **Verify push notifications** work end-to-end
3. **Monitor application performance** 
4. **Update app builds** if needed for production deployment

---

*This guide addresses the authentication issues reported in the error logs and should restore full app functionality.*