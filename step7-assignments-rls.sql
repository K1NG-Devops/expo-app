-- STEP 7: Apply RLS to assignments table
-- This will fix the teacher dashboard 400 Bad Request error

BEGIN;

-- Enable RLS on assignments table
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can see assignments they created, principals can see all school assignments, superadmins see all
CREATE POLICY assignments_access ON public.assignments 
FOR SELECT TO authenticated USING (
  -- Superadmin sees all assignments
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Teachers can see assignments they created
  teacher_id = auth.uid() OR
  -- Users can see assignments for their preschool
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = assignments.preschool_id
  )
);

-- Policy for INSERT/UPDATE operations
CREATE POLICY assignments_manage ON public.assignments 
FOR ALL TO authenticated USING (
  -- Superadmin can manage all assignments
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Teachers can manage assignments in their preschool
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('teacher', 'principal')
    AND p.preschool_id = assignments.preschool_id
  )
) WITH CHECK (
  -- Same check for INSERT/UPDATE
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('teacher', 'principal', 'superadmin')
    AND (p.role = 'superadmin' OR p.preschool_id = assignments.preschool_id)
  )
);

COMMIT;

-- TEST POINTS AFTER APPLYING:
-- 1. ✅ Teacher dashboard should load assignments without 400 errors
-- 2. ✅ Teachers can see their own assignments
-- 3. ✅ Principals can see assignments from their school
-- 4. ✅ Superadmin can see all assignments
-- 5. ❌ Check browser console - no more 400 Bad Request on assignments

-- If this works, the teacher dashboard should show assignment data properly