-- FIX STEP 7: Replace assignments RLS policies with ones that work without profiles table
-- The current policies depend on profiles table which doesn't have RLS enabled

BEGIN;

-- Drop existing policies that depend on profiles table
DROP POLICY IF EXISTS assignments_access ON public.assignments;
DROP POLICY IF EXISTS assignments_manage ON public.assignments;

-- Create simpler policies that work with current setup
-- Policy 1: Teachers can see their own assignments
CREATE POLICY assignments_teacher_access ON public.assignments 
FOR SELECT TO authenticated USING (
  teacher_id = auth.uid()
);

-- Policy 2: Allow users from same preschool to see assignments (without profiles dependency)
CREATE POLICY assignments_preschool_access ON public.assignments 
FOR SELECT TO authenticated USING (
  preschool_id IN (
    SELECT u.preschool_id FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.preschool_id IS NOT NULL
  )
);

-- Policy 3: Superadmin access (using users table instead of profiles)
CREATE POLICY assignments_superadmin_access ON public.assignments 
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role = 'superadmin'
  )
);

-- Policy for INSERT/UPDATE operations
CREATE POLICY assignments_manage_simple ON public.assignments 
FOR ALL TO authenticated USING (
  -- Teachers can manage assignments in their preschool
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('teacher', 'principal', 'superadmin')
    AND (u.role = 'superadmin' OR u.preschool_id = assignments.preschool_id)
  )
) WITH CHECK (
  -- Same check for INSERT/UPDATE
  teacher_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.id = auth.uid() 
    AND u.role IN ('teacher', 'principal', 'superadmin')
    AND (u.role = 'superadmin' OR u.preschool_id = assignments.preschool_id)
  )
);

COMMIT;

-- TEST POINTS:
-- 1. ✅ Teacher dashboard should now load assignments without 400 errors
-- 2. ✅ This uses the 'users' table instead of 'profiles' table
-- 3. ✅ Teachers can see assignments they created
-- 4. ✅ Users in same preschool can see each other's assignments