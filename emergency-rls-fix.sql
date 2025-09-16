-- EMERGENCY RLS FIX - Apply in Supabase SQL Editor immediately
-- This will stop the 500 errors by allowing proper data access

BEGIN;

-- Temporarily allow broader access to stop 500 errors
-- Fix profiles table access
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_access ON public.profiles;
CREATE POLICY profiles_access ON public.profiles 
FOR ALL TO authenticated USING (
  -- Super admin sees all
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin') OR
  -- User sees own profile
  id = auth.uid() OR
  -- Principal sees all in their school
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'principal' AND p.preschool_id = profiles.preschool_id) OR
  -- Teachers can see profiles in their school (needed for app functionality)
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.preschool_id = profiles.preschool_id)
);

-- Fix users table access
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_access ON public.users;
CREATE POLICY users_access ON public.users 
FOR ALL TO authenticated USING (
  -- Super admin sees all
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin') OR
  -- User sees own record
  auth_user_id = auth.uid() OR
  -- Principal sees all in their school
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'principal' AND p.preschool_id = users.preschool_id)
);

-- Fix preschools table access
ALTER TABLE public.preschools ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS preschools_access ON public.preschools;
CREATE POLICY preschools_access ON public.preschools 
FOR ALL TO authenticated USING (
  -- Super admin sees all
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin') OR
  -- Users see their own preschool
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.preschool_id = preschools.id)
);

-- Fix subscriptions table access
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_access ON public.subscriptions;
CREATE POLICY subscriptions_access ON public.subscriptions 
FOR ALL TO authenticated USING (
  -- Super admin sees all
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin') OR
  -- User-owned subscriptions
  (owner_type = 'user' AND user_id = auth.uid()) OR
  -- School-owned subscriptions - accessible by school members
  (owner_type = 'school' AND EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.preschool_id = subscriptions.school_id
  ))
);

-- Fix subscription_seats table access
ALTER TABLE public.subscription_seats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_seats_access ON public.subscription_seats;
CREATE POLICY subscription_seats_access ON public.subscription_seats 
FOR ALL TO authenticated USING (
  -- Super admin sees all
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'superadmin') OR
  -- User sees own seat
  user_id = auth.uid() OR
  -- School members can see seats for their school's subscriptions
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.profiles p ON p.preschool_id = s.school_id
    WHERE s.id = subscription_seats.subscription_id AND p.id = auth.uid()
  )
);

-- Fix subscription_plans access (should be readable by all authenticated users)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_access ON public.subscription_plans;
CREATE POLICY subscription_plans_access ON public.subscription_plans 
FOR SELECT TO authenticated USING (true);

COMMIT;

-- This should immediately stop the 500 errors