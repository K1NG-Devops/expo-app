-- REVERT ALL PROBLEMATIC RLS POLICIES
-- Apply this in Supabase SQL Editor to restore functionality

BEGIN;

-- 1. Disable RLS on all tables that were causing 500 errors
-- This will restore the app to working state

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

-- 2. Clean up any helper functions that were created
DROP FUNCTION IF EXISTS public.user_can_access_school_subscriptions(UUID);
DROP FUNCTION IF EXISTS public.app_is_super_admin();
DROP FUNCTION IF EXISTS public.app_is_school_admin(UUID);

-- 3. Remove any problematic triggers (keep the seat counting trigger if it works)
-- We'll keep the seat counting trigger as it was working correctly
-- DROP TRIGGER IF EXISTS subscription_seats_update_count_insert ON public.subscription_seats;
-- DROP TRIGGER IF EXISTS subscription_seats_update_count_delete ON public.subscription_seats;
-- DROP FUNCTION IF EXISTS public.update_subscription_seats_count();

COMMIT;

-- This should restore the app to full working state
-- The seat management page should now show teachers correctly
-- No more 500 Internal Server Errors
-- Superadmin dashboard should work without errors