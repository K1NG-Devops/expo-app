-- STEP 3 FINAL: Profiles RLS using private helper function to avoid circular references
-- This approach solves the circular dependency issue by using a SECURITY DEFINER function

BEGIN;

-- 1) Create private schema for helper functions
CREATE SCHEMA IF NOT EXISTS private;

-- 2) Create or replace helper function to return current user's role and preschool_id
CREATE OR REPLACE FUNCTION private.get_current_user_profile()
RETURNS TABLE(role text, preschool_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role, preschool_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- 3) Revoke execute from anon and authenticated for safety
REVOKE EXECUTE ON FUNCTION private.get_current_user_profile() FROM anon, authenticated;

-- 4) Drop any existing policies to start fresh
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_own_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_access" ON public.profiles;

-- 5) Enable RLS on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6) Create a safe SELECT policy using the helper function
CREATE POLICY "profiles_access" ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Superadmin sees all profiles
  (SELECT role FROM private.get_current_user_profile()) = 'superadmin'
  OR
  -- Users can see their own profile
  id = auth.uid()
  OR
  -- Principals can see profiles in their preschool
  ((SELECT role FROM private.get_current_user_profile()) = 'principal'
    AND (SELECT preschool_id FROM private.get_current_user_profile()) = public.profiles.preschool_id)
  OR
  -- Teachers can see profiles in their preschool
  ((SELECT role FROM private.get_current_user_profile()) = 'teacher'
    AND (SELECT preschool_id FROM private.get_current_user_profile()) = public.profiles.preschool_id)
);

-- 7) Allow users to update their own profile
CREATE POLICY "profiles_own_update" ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 8) Allow profile creation for new users
CREATE POLICY "profiles_own_insert" ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 9) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_preschool_id ON public.profiles (preschool_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

COMMIT;

-- TEST POINTS AFTER APPLYING:
-- 1. ✅ Teacher dashboard should load without "Access Restricted"
-- 2. ✅ Profile subscriptions work (UI can read profiles table)
-- 3. ✅ Seat management shows teachers properly 
-- 4. ✅ Principals can see teachers in their school
-- 5. ✅ Superadmin can see all profiles
-- 6. ✅ No circular reference errors
-- 7. ✅ Users can update their own profiles

-- This solves the circular dependency by:
-- - Using SECURITY DEFINER to bypass RLS in the helper function
-- - Helper function reads profiles table without triggering RLS recursion
-- - Main policy uses helper function results for authorization
-- - Maintains proper security boundaries per user role