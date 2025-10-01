-- Fix Students RLS Policies and WhatsApp Issues
-- Date: 2025-10-01
-- Description: Fixes students table RLS policies to use correct auth_user_id column

-- Drop existing students policies
DROP POLICY IF EXISTS students_superadmin_access ON public.students;
DROP POLICY IF EXISTS students_principal_access ON public.students;
DROP POLICY IF EXISTS students_teacher_access ON public.students;
DROP POLICY IF EXISTS students_parent_access ON public.students;
DROP POLICY IF EXISTS students_tenant_isolation ON public.students;

-- Superadmin: Full access with service role
CREATE POLICY students_superadmin_access ON public.students
FOR ALL
TO service_role
USING (TRUE)
WITH CHECK (TRUE);

-- Principal: Access to all students in their preschool (FIXED: use auth_user_id)
CREATE POLICY students_principal_access ON public.students
FOR ALL
TO authenticated
USING (
  preschool_id IN (
    SELECT preschool_id
    FROM public.users
    WHERE
      auth_user_id = auth.uid()
      AND role IN ('principal', 'preschool_admin', 'admin', 'superadmin')
  )
)
WITH CHECK (
  preschool_id IN (
    SELECT preschool_id
    FROM public.users
    WHERE
      auth_user_id = auth.uid()
      AND role IN ('principal', 'preschool_admin', 'admin', 'superadmin')
  )
);

-- Teacher: Access to students in their classes within preschool (FIXED: use auth_user_id)
CREATE POLICY students_teacher_access ON public.students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users AS u
    WHERE
      u.auth_user_id = auth.uid()
      AND u.role = 'teacher'
      AND u.preschool_id = students.preschool_id
      AND EXISTS (
        SELECT 1 FROM public.classes AS c
        WHERE
          c.teacher_id = u.id
          AND c.id = students.class_id
      )
  )
);

-- Parent: Access only to their own children (parent_id/guardian_id reference auth.users)
CREATE POLICY students_parent_access ON public.students
FOR SELECT
TO authenticated
USING (
  parent_id = auth.uid() OR guardian_id = auth.uid()
);

-- Add comment
COMMENT ON POLICY students_principal_access ON public.students
IS 'Fixed RLS policy using correct auth_user_id column from users table';
