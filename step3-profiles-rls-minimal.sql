-- STEP 3 MINIMAL: Ultra-safe RLS for profiles table
-- Start with the absolute minimum and build up

BEGIN;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ultra-simple policy: Just own profile access for now
-- We'll expand this once we confirm it works
CREATE POLICY profiles_own_access ON public.profiles 
FOR SELECT TO authenticated USING (
  id = auth.uid()
);

COMMIT;

-- MINIMAL TEST:
-- This will break some functionality (principals can't see teachers)
-- But we can confirm RLS works without circular reference errors
-- If this works, we can incrementally add more policies

-- Expected behavior after applying:
-- ✅ Users can see their own profile
-- ❌ Principals can't see teachers (seat management will show 0)
-- ❌ Superadmin can't see all profiles
-- ✅ No RLS circular reference errors

-- If even this minimal version causes errors, 
-- then we have a fundamental RLS setup issue