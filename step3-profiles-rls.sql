-- STEP 3: Apply RLS to profiles table
-- Apply this AFTER confirming Step 2 (preschools) is working
-- Test the app thoroughly after applying this step

BEGIN;

-- Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users see own profile, principals see their school members, superadmins see all
CREATE POLICY profiles_access ON public.profiles 
FOR SELECT TO authenticated USING (
  -- Superadmin sees all profiles
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Users can see their own profile
  id = auth.uid() OR
  -- Principals can see profiles of users in their school
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'principal'
    AND p.preschool_id = profiles.preschool_id
  ) OR
  -- Teachers can see other profiles in their school (needed for some app functionality)
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = profiles.preschool_id
    AND profiles.preschool_id IS NOT NULL
  )
);

COMMIT;

-- CRITICAL TEST POINTS after applying:
-- 1. ✅ Seat management page - can principals see teachers?
-- 2. ✅ Teacher dashboard - can teachers see their own data? 
-- 3. ✅ Principal dashboard - can principals see school data?
-- 4. ✅ Superadmin dashboard - can superadmin see all profiles?
-- 5. ❌ Check browser console for any new 500 errors on profiles queries

-- If any functionality breaks, immediately revert with:
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- If everything works perfectly, proceed to Step 4