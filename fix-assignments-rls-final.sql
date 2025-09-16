-- FIX ASSIGNMENTS RLS: Check status and apply working policies
-- This should resolve the 400 Bad Request errors on assignments

-- 1. Check current assignments table RLS status
SELECT 
  'Assignments RLS Status' as check_type,
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'assignments';

-- 2. Check existing policies
SELECT 
  'Current Assignments Policies' as check_type,
  schemaname,
  tablename,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'assignments';

-- 3. Drop all existing assignments policies to start fresh
DROP POLICY IF EXISTS assignments_access ON public.assignments;
DROP POLICY IF EXISTS assignments_manage ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_access ON public.assignments;
DROP POLICY IF EXISTS assignments_preschool_access ON public.assignments;
DROP POLICY IF EXISTS assignments_superadmin_access ON public.assignments;
DROP POLICY IF EXISTS assignments_manage_simple ON public.assignments;

-- 4. Ensure RLS is enabled
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- 5. Create simple, working assignments policies using the same private helper pattern
CREATE POLICY assignments_select_policy ON public.assignments
FOR SELECT TO authenticated USING (
  -- Superadmin sees all assignments
  (SELECT role FROM private.get_current_user_profile()) = 'superadmin'
  OR
  -- Teachers can see assignments they created
  teacher_id = auth.uid()
  OR
  -- Users can see assignments for their preschool  
  preschool_id = (SELECT preschool_id FROM private.get_current_user_profile())
);

-- 6. Create policy for INSERT/UPDATE/DELETE
CREATE POLICY assignments_modify_policy ON public.assignments
FOR ALL TO authenticated USING (
  -- Superadmin can manage all assignments
  (SELECT role FROM private.get_current_user_profile()) = 'superadmin'
  OR
  -- Teachers can manage assignments they created
  teacher_id = auth.uid()
  OR
  -- Principals can manage assignments in their preschool
  ((SELECT role FROM private.get_current_user_profile()) = 'principal'
    AND preschool_id = (SELECT preschool_id FROM private.get_current_user_profile()))
) WITH CHECK (
  -- Same conditions for INSERT/UPDATE
  (SELECT role FROM private.get_current_user_profile()) = 'superadmin'
  OR
  teacher_id = auth.uid()
  OR
  ((SELECT role FROM private.get_current_user_profile()) = 'principal'
    AND preschool_id = (SELECT preschool_id FROM private.get_current_user_profile()))
);

-- 7. Verify the policies were created
SELECT 
  'Final Assignments Policies' as check_type,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'assignments';

-- 8. Test query - this should work now for the teacher
-- NOTE: This will only work when run by the authenticated teacher
-- SELECT COUNT(*) as assignments_visible 
-- FROM public.assignments 
-- WHERE teacher_id = auth.uid();

-- EXPECTED RESULTS:
-- 1. Teacher dashboard should load assignments without 400 errors
-- 2. Teachers can see their own assignments
-- 3. Principals can see assignments from teachers in their school
-- 4. Superadmin can see all assignments