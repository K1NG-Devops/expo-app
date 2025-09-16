-- Fix RLS policies for subscriptions table to allow principals to see their school's subscriptions
-- This allows principals to access subscriptions for their own preschool

BEGIN;

-- Ensure subscriptions table has RLS enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS subscriptions_school_access ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_admin_read ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_select_own ON public.subscriptions;
DROP POLICY IF EXISTS subscriptions_modify_own ON public.subscriptions;

-- Helper function to check if user is principal/admin of a school
-- This function uses the existing users/profiles table structure
CREATE OR REPLACE FUNCTION public.user_can_access_school_subscriptions(target_school_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Check if user is super admin (can access all)
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    -- Check if user is principal/admin of the target school
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.preschool_id = target_school_id
    AND u.role IN ('principal', 'principal_admin', 'admin')
  ) OR EXISTS (
    -- Fallback: check profiles table if it exists
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND (
      p.role IN ('superadmin', 'super_admin') 
      OR (p.preschool_id = target_school_id AND p.role IN ('principal', 'principal_admin', 'admin'))
    )
  );
$$;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.user_can_access_school_subscriptions(UUID) TO authenticated;

-- Create comprehensive RLS policy for subscriptions
CREATE POLICY subscriptions_school_access 
ON public.subscriptions 
FOR SELECT 
TO authenticated 
USING (
  -- School-owned subscriptions: accessible by school admins and super admins
  (owner_type = 'school' AND public.user_can_access_school_subscriptions(school_id))
  OR
  -- User-owned subscriptions: accessible by the user themselves
  (owner_type = 'user' AND user_id = auth.uid())
);

-- Create policy for INSERT operations (only super admins and school admins can create)
CREATE POLICY subscriptions_school_write 
ON public.subscriptions 
FOR INSERT 
TO authenticated 
WITH CHECK (
  -- School subscriptions can be created by school admins or super admins
  (owner_type = 'school' AND public.user_can_access_school_subscriptions(school_id))
  OR
  -- User subscriptions can be created by the user themselves
  (owner_type = 'user' AND user_id = auth.uid())
);

-- Create policy for UPDATE operations
CREATE POLICY subscriptions_school_update 
ON public.subscriptions 
FOR UPDATE 
TO authenticated 
USING (
  (owner_type = 'school' AND public.user_can_access_school_subscriptions(school_id))
  OR
  (owner_type = 'user' AND user_id = auth.uid())
)
WITH CHECK (
  (owner_type = 'school' AND public.user_can_access_school_subscriptions(school_id))
  OR
  (owner_type = 'user' AND user_id = auth.uid())
);

-- Create policy for DELETE operations (restricted to super admins)
CREATE POLICY subscriptions_school_delete 
ON public.subscriptions 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.users u 
    WHERE u.auth_user_id = auth.uid() 
    AND u.role IN ('superadmin', 'super_admin')
  ) OR EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('superadmin', 'super_admin')
  )
);

-- Add helpful comment
COMMENT ON FUNCTION public.user_can_access_school_subscriptions(UUID) IS 
'Checks if the current user can access subscriptions for a specific school. Returns true for super admins and school principals/admins.';

COMMIT;

-- Test the policy (these are just for verification - remove in production)
-- SELECT 'Testing RLS policy for subscriptions...' as status;
-- SELECT count(*) as visible_subscriptions FROM public.subscriptions WHERE owner_type = 'school';