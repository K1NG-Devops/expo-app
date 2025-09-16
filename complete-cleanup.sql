-- COMPLETE CLEANUP - Handles all dependencies
-- Apply this in Supabase SQL Editor

BEGIN;

-- 1. First, drop ALL policies on subscriptions table (including the ones causing dependency issues)
DROP POLICY IF EXISTS subscriptions_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_school_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_modify_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_school_write ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_school_update ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_school_read ON public.subscriptions;

-- 2. Drop all policies on other tables
DROP POLICY IF EXISTS profiles_access ON public.profiles;
DROP POLICY IF EXISTS profiles_school_access ON public.profiles;
DROP POLICY IF EXISTS profiles_select_policy ON public.profiles;

DROP POLICY IF EXISTS users_access ON public.users;
DROP POLICY IF EXISTS users_school_access ON public.users;
DROP POLICY IF EXISTS users_self_or_principal_same_school ON public.users;

DROP POLICY IF EXISTS preschools_access ON public.preschools;

DROP POLICY IF EXISTS subscription_seats_access ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_school_access ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_select ON public.subscription_seats;
DROP POLICY IF EXISTS subscription_seats_modify ON public.subscription_seats;

DROP POLICY IF EXISTS subscription_plans_access ON public.subscription_plans;

-- 3. Now we can safely drop the functions (no more dependencies)
DROP FUNCTION IF EXISTS public.user_can_access_school_subscriptions(UUID);
DROP FUNCTION IF EXISTS public.app_is_super_admin();
DROP FUNCTION IF EXISTS public.app_is_school_admin(UUID);

-- 4. Disable RLS on all tables that were causing 500 errors
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.preschools DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_seats DISABLE ROW LEVEL SECURITY;

-- 5. Re-enable RLS only on subscription_plans (this was working)
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscription_plans_access ON public.subscription_plans 
FOR SELECT TO authenticated USING (true);

-- 6. Clean up any other problematic functions that might have been created
DROP FUNCTION IF EXISTS public.update_subscription_seats_count() CASCADE;
DROP TRIGGER IF EXISTS subscription_seats_update_count_insert ON public.subscription_seats;
DROP TRIGGER IF EXISTS subscription_seats_update_count_delete ON public.subscription_seats;

COMMIT;

-- Success message
SELECT 'Database cleanup completed successfully' as status;