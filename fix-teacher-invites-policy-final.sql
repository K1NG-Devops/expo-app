-- Fix: Update teacher_invites policy to check users table instead of profiles table
-- The user data is in users table, but policy was checking profiles table

BEGIN;

-- Drop the incorrect policies
DROP POLICY IF EXISTS teacher_inv_principal_all ON public.teacher_invites;
DROP POLICY IF EXISTS teacher_inv_accept_own ON public.teacher_invites;

-- Create correct policy that checks users table
CREATE POLICY teacher_inv_principal_all ON public.teacher_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('principal','principal_admin','super_admin')
        AND u.preschool_id = teacher_invites.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.role IN ('principal','principal_admin','super_admin')
        AND u.preschool_id = teacher_invites.school_id
    )
  );

-- Allow users to view invites sent to their email (for accepting invites)
CREATE POLICY teacher_inv_accept_own ON public.teacher_invites
  FOR SELECT USING (
    email IN (
      SELECT email FROM public.users WHERE auth_user_id = auth.uid()
    )
  );

COMMIT;