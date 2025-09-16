-- ROLLBACK STEP 3: Disable RLS on profiles table
-- Use this if Step 3 causes any issues

BEGIN;

-- Disable RLS on profiles table
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Drop the policy (optional, but clean)
DROP POLICY IF EXISTS profiles_access ON public.profiles;

COMMIT;

-- After running this, test that:
-- 1. Seat management page works again
-- 2. Teacher and principal dashboards load normally
-- 3. Superadmin can see all profiles
-- 4. No more RLS-related errors in console