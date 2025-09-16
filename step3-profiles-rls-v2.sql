-- STEP 3 V2: Safer RLS approach for profiles table
-- This version uses simpler logic to avoid circular reference issues

BEGIN;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Simple policy: Own profile + superadmin bypass
CREATE POLICY profiles_basic_access ON public.profiles 
FOR SELECT TO authenticated USING (
  -- Users can always see their own profile
  id = auth.uid()
);

-- Separate policy for superadmin full access
CREATE POLICY profiles_superadmin_access ON public.profiles 
FOR SELECT TO authenticated USING (
  -- Check if current user is superadmin (avoid circular reference)
  auth.uid() IN (
    SELECT p.id FROM public.profiles p 
    WHERE p.role = 'superadmin' AND p.id = auth.uid()
  )
);

-- Separate policy for same-school access (principals seeing their teachers)
CREATE POLICY profiles_same_school_access ON public.profiles 
FOR SELECT TO authenticated USING (
  -- Users in same school can see each other
  preschool_id IS NOT NULL AND
  preschool_id IN (
    SELECT p.preschool_id FROM public.profiles p 
    WHERE p.id = auth.uid() AND p.preschool_id IS NOT NULL
  )
);

COMMIT;

-- TEST AFTER APPLYING:
-- 1. Can principals still see teachers in seat management?
-- 2. Can teachers access their dashboard?
-- 3. Can superadmin see all profiles?
-- 4. No 500 errors in browser console?

-- If this still fails, we'll try an even simpler approach