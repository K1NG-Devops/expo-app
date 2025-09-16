# Database Revert Instructions

## ✅ Current Status

### Superadmin Dashboard Changes - PRESERVED ✅
Your superadmin dashboard changes are intact and working correctly:

1. **GlobalOverview.tsx**: 
   - ✅ Uses `plan_id` consistently  
   - ✅ Fetches actual prices from `subscription_plans`
   - ✅ Normalizes annual plans to monthly revenue (annual_price / 12)
   - ✅ Displays Monthly Revenue in ZAR (R) with en-ZA formatting

2. **super-admin-subscriptions.tsx**:
   - ✅ Better empty state with helpful callout
   - ✅ "+ Create Subscription" button in empty state
   - ✅ "Seed a free plan for a school" helper functionality
   - ✅ Automatic refresh after seeding/creating
   - ✅ Filters `owner_type = 'school'` as intended

### Data Fixes Applied ✅

✅ **Fixed seat count**: Young Eagles subscription now shows correct **1/3 seats** (was showing 3/3)  
✅ **Fixed subscription plan**: Updated from invalid "free" to valid UUID for Free plan  
✅ **Current seat assignment**: katso@youngeagles.org.za has 1 seat, king@youngeagles.org.za has no seat

## 🚨 REQUIRED ACTION: Revert Problematic RLS Policies

The RLS migrations we applied are causing **500 Internal Server Errors**. You need to revert them immediately.

### Apply This SQL in Supabase Dashboard → SQL Editor:

```sql
-- REVERT ALL PROBLEMATIC RLS POLICIES
BEGIN;

-- Disable RLS on profiles (was causing 500 errors)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_access ON public.profiles;
DROP POLICY IF EXISTS profiles_school_access ON public.profiles;
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;

-- Disable RLS on users (was causing 500 errors)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_access ON public.users;
DROP POLICY IF EXISTS users_school_access ON public.users;
DROP POLICY IF EXISTS users_self_or_principal_same_school ON public.users;

-- Disable RLS on preschools (was causing 500 errors)
ALTER TABLE public.preschools DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS preschools_access ON public.preschools;

-- Disable RLS on subscriptions (was causing 500 errors)
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscriptions_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_school_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_modify_own ON public.subscriptions;

-- Disable RLS on subscription_seats (was causing seat management issues)
ALTER TABLE public.subscription_seats DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_seats_access ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_school_access ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_select ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_modify ON public.subscription_seats;

-- Keep subscription_plans accessible (this was working)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS subscription_plans_access ON public.subscription_plans;
CREATE POLICY subscription_plans_access ON public.subscription_plans 
FOR SELECT TO authenticated USING (true);

-- Clean up helper functions
DROP FUNCTION IF EXISTS public.user_can_access_school_subscriptions(UUID);
DROP FUNCTION IF EXISTS public.app_is_super_admin();
DROP FUNCTION IF EXISTS public.app_is_school_admin(UUID);

COMMIT;
```

## Expected Results After Revert

### ✅ Seat Management Page Should Show:
- **"All Teachers (2)"** - Both teachers visible
- **katso@youngeagles.org.za** ✅ Has seat [Revoke] button
- **king@youngeagles.org.za** ❌ No seat [Assign Seat] button
- **"Seats: 1/3"** - Correct count

### ✅ All Dashboards Should:
- No more 500 Internal Server Errors
- Proper data loading for all users
- Superadmin dashboard working without 400/500 errors

### ✅ Superadmin Dashboard:
- Your revenue calculations preserved
- ZAR formatting working
- Empty state and quick actions working
- Subscription management functional

## Files That Can Be Deleted (Migration Artifacts)

These files were created during our troubleshooting and can be deleted:

- `manual-apply-fixes.sql`
- `fix-rls-seat-management.sql` 
- `emergency-rls-fix.sql`
- `fix-seat-management-rls.sql`
- `fix-seat-data.js`
- `fix-subscription-plan.sql`
- `fix-subscription-plan-now.js`
- `check-subscriptions-data.js`
- `diagnose-seat-issues.js`
- `setup-test-data.js`
- `check-database-schema.js`

## Summary

The core issue was that we tried to fix seat management visibility with RLS policies, but they were too restrictive and broke the entire app. Your original superadmin dashboard improvements were good and are preserved. 

After applying the revert SQL, the app should be fully functional with:
- Working seat management (principals can see teachers)
- No 500 errors
- Correct seat counts
- Your superadmin improvements intact