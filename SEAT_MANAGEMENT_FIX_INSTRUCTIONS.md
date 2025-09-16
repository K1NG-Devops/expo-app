# Seat Management Fix Instructions

## Issues Found & Fixed

### ✅ 1. Fixed: Seat Count Mismatch
- **Problem**: Subscription showed 3/3 seats but only 1 actual assignment existed
- **Solution**: Updated `seats_used` from 3 to 1 (correct count)
- **Status**: ✅ COMPLETED

### 🔧 2. To Fix: RLS Policies Blocking Teacher Visibility  
- **Problem**: Principal can't see teachers because RLS policies are too restrictive
- **Solution**: Apply the RLS policy fixes
- **Status**: ⏳ NEEDS MANUAL APPLICATION

### 🔧 3. To Fix: Superadmin Dashboard Errors
- **Problem**: 400 Bad Request trying to fetch plan with id="free" (doesn't exist)  
- **Solution**: Update subscription plan reference
- **Status**: ⏳ NEEDS MANUAL APPLICATION

## Manual Steps Required

### Step 1: Apply RLS Policy Fixes in Supabase Dashboard

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `fix-rls-seat-management.sql`:

```sql
-- Fix RLS policies for seat management
-- Apply this in Supabase SQL Editor

BEGIN;

-- Fix 1: Allow principals to see profiles of users in their school
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_school_access ON public.profiles;

-- Create policy for profiles access
CREATE POLICY profiles_school_access 
ON public.profiles 
FOR SELECT 
TO authenticated 
USING (
  -- Super admin can see all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() 
    AND p2.role IN ('superadmin', 'super_admin')
  ) OR
  -- User can see their own profile
  id = auth.uid() OR
  -- Principal can see profiles of users in their school
  EXISTS (
    SELECT 1 FROM public.profiles p2 
    WHERE p2.id = auth.uid() 
    AND p2.role IN ('principal', 'principal_admin', 'admin')
    AND p2.preschool_id = profiles.preschool_id
  )
);

-- Fix 2: Allow principals to see users table records in their school
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS users_access ON public.users;
DROP POLICY IF EXISTS users_school_access ON public.users;

-- Create policy for users access
CREATE POLICY users_school_access 
ON public.users 
FOR SELECT 
TO authenticated 
USING (
  -- Super admin can see all users
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.users u2 
    WHERE u2.auth_user_id = auth.uid() 
    AND u2.role IN ('superadmin', 'super_admin')
  ) OR
  -- User can see their own record
  auth_user_id = auth.uid() OR
  -- Principal can see users in their school
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('principal', 'principal_admin', 'admin')
    AND p.preschool_id = users.preschool_id
  ) OR EXISTS (
    SELECT 1 FROM public.users u2 
    WHERE u2.auth_user_id = auth.uid() 
    AND u2.role IN ('principal', 'principal_admin', 'admin')
    AND u2.preschool_id = users.preschool_id
  )
);

-- Fix 3: Allow access to subscriptions for principals
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS subscriptions_school_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_access ON public.subscriptions;

-- Create policy for subscriptions access
CREATE POLICY subscriptions_access 
ON public.subscriptions 
FOR ALL 
TO authenticated 
USING (
  -- Super admin can access all subscriptions
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  -- User-owned subscriptions: accessible by the user
  (owner_type = 'user' AND user_id = auth.uid()) OR
  -- School-owned subscriptions: accessible by school principals
  (owner_type = 'school' AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('principal', 'principal_admin', 'admin')
    AND p.preschool_id = subscriptions.school_id
  ))
);

-- Fix 4: Allow access to subscription_seats for principals  
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS subscription_seats_school_access ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_access ON public.subscription_seats;

-- Create policy for subscription_seats access
CREATE POLICY subscription_seats_access 
ON public.subscription_seats 
FOR ALL 
TO authenticated 
USING (
  -- Super admin can access all seats
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  -- User can access their own seat
  user_id = auth.uid() OR
  -- Principal can access seats for their school's subscriptions
  EXISTS (
    SELECT 1 
    FROM public.subscriptions s
    JOIN public.profiles p ON p.preschool_id = s.school_id
    WHERE s.id = subscription_seats.subscription_id
      AND p.id = auth.uid()
      AND p.role IN ('principal', 'principal_admin', 'admin')
  )
);

-- Fix 5: Allow access to subscription_plans (for superadmin dashboard)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS subscription_plans_access ON public.subscription_plans;

-- Create policy for subscription_plans access (readable by all authenticated users)
CREATE POLICY subscription_plans_access 
ON public.subscription_plans 
FOR SELECT 
TO authenticated 
USING (true); -- All authenticated users can read subscription plans

-- Fix 6: Allow access to preschools for principals
ALTER TABLE public.preschools ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS preschools_access ON public.preschools;

-- Create policy for preschools access
CREATE POLICY preschools_access 
ON public.preschools 
FOR SELECT 
TO authenticated 
USING (
  -- Super admin can see all preschools
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  ) OR
  -- Users can see their own preschool
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = preschools.id
  )
);

COMMIT;
```

3. Click **Run** to apply the policies

### Step 2: Fix Subscription Plan Reference

The superadmin dashboard is looking for a plan with id="free" but it doesn't exist. The Young Eagles subscription uses plan_id="free" but should use one of the existing plans.

**Option A: Update the subscription to use an existing plan:**

```sql
-- Update Young Eagles subscription to use the existing Free plan
UPDATE public.subscriptions 
SET plan_id = '11111111-1111-4111-8111-111111111111'  -- Existing "Free" plan
WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1' 
AND plan_id = 'free';
```

**Option B: Create the missing "free" plan:**

```sql
-- Create the missing "free" plan with a proper UUID
INSERT INTO public.subscription_plans (id, name, price_monthly, price_annual)
VALUES (gen_random_uuid(), 'Free', 0, 0)
ON CONFLICT DO NOTHING;

-- Then update the subscription to reference it (need the generated UUID)
```

## Expected Results After Fix

### ✅ Seat Management Page Should Show:
- **"All Teachers (2)"** instead of "All Teachers (0)"
- **Teachers listed:**
  - katso@youngeagles.org.za ✅ **Has seat** [Revoke] button
  - king@youngeagles.org.za ❌ **No seat** [Assign Seat] button
- **"Seats: 1/3"** instead of "Seats: 3/3"

### ✅ Superadmin Dashboard Should:
- No longer show 400 Bad Request errors for subscription_plans
- No longer show 500 Internal Server Error for users table

## Current Data State

**Young Eagles School (`ba79097c-1b93-4b48-bcbe-df73878ab4d1`):**
- **Principal**: elsha@youngeagles.org.za (`136cf31c-b37c-45c0-9cf7-755bd1b9afbf`)
- **Teachers**: 
  - katso@youngeagles.org.za (`a1fd12d2-5f09-4a23-822d-f3071bfc544b`) ✅ **Has seat**
  - king@youngeagles.org.za (`a661cc72-98ae-4256-973f-4e476cd9f33d`) ❌ **No seat**
- **Subscription**: Active, 1/3 seats used

The main issue was that RLS policies were preventing the principal from seeing teacher data, making the seat management interface show "No Teachers Found" even though the data exists.