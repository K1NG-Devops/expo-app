-- Quick fix: Apply missing teacher_invites RLS policies
-- This enables principals to create/manage teacher invites in their schools

BEGIN;

-- Drop existing policies if they exist (safe to ignore errors if they don't exist)
DO $$ 
BEGIN
  DROP POLICY IF EXISTS teacher_inv_principal_all ON public.teacher_invites;
  DROP POLICY IF EXISTS teacher_inv_accept_own ON public.teacher_invites;
EXCEPTION WHEN OTHERS THEN
  -- Ignore errors if policies don't exist
  NULL;
END $$;

-- RLS Policies for teacher_invites
-- Principals: manage invites in their school
CREATE POLICY teacher_inv_principal_all ON public.teacher_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('principal','principal_admin','super_admin')
        AND p.preschool_id = teacher_invites.school_id
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('principal','principal_admin','super_admin')
        AND p.preschool_id = teacher_invites.school_id
    )
  );

-- Optional: Allow users to accept invites sent to their email
-- (This lets people view invites with their email to accept them)
CREATE POLICY teacher_inv_accept_own ON public.teacher_invites
  FOR SELECT USING (
    email IN (
      SELECT email FROM auth.users WHERE id = auth.uid()
      UNION
      SELECT email FROM public.profiles WHERE id = auth.uid()
    )
  );

COMMIT;
