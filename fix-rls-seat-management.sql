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

-- Test the policies work by trying a sample query
-- This should now return teachers for the principal's school