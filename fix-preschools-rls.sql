-- Fix RLS policies for preschools table to allow subscription updates
-- This fixes the 400 error when trying to update preschool subscription fields

BEGIN;

-- First, let's check what the current policy looks like and fix it
-- The issue is likely that the WITH CHECK clause is too restrictive for subscription updates

-- Drop existing restrictive policy if it exists
DROP POLICY IF EXISTS "Users can access their preschool" ON public.preschools;
DROP POLICY IF EXISTS "Preschool access control" ON public.preschools;
DROP POLICY IF EXISTS "preschool access control" ON public.preschools;

-- Create a more permissive policy for subscription management
-- Super admins can do anything, and users can read their own preschool data
DROP POLICY IF EXISTS "preschools_read_access" ON public.preschools;
CREATE POLICY "preschools_read_access" ON public.preschools
  FOR SELECT 
  TO authenticated
  USING (
    -- Super admin can read all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Users can read their own preschool
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND preschool_id = preschools.id)
    OR
    -- Service role bypass (for admin operations)
    current_setting('role') = 'service_role'
  );

-- Allow updates for subscription-related fields
-- This is critical for the subscription creation workflow
DROP POLICY IF EXISTS "preschools_update_subscription" ON public.preschools;
CREATE POLICY "preschools_update_subscription" ON public.preschools
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admin can update all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Service role bypass (for admin operations via RPC)
    current_setting('role') = 'service_role'
  )
  WITH CHECK (
    -- Super admin can update all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Service role bypass (for admin operations via RPC)
    current_setting('role') = 'service_role'
  );

-- Allow inserts for super admins (for creating new schools)
DROP POLICY IF EXISTS "preschools_insert_admin" ON public.preschools;
CREATE POLICY "preschools_insert_admin" ON public.preschools
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Super admin can create new preschools
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Service role bypass
    current_setting('role') = 'service_role'
  );

-- Alternative approach: Create a security definer function for subscription updates
-- This allows the subscription creation process to bypass RLS safely
CREATE OR REPLACE FUNCTION public.update_preschool_subscription(
  p_preschool_id UUID,
  p_subscription_tier TEXT,
  p_subscription_status TEXT,
  p_subscription_plan_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is super admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('superadmin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: Only super admins can update preschool subscriptions';
  END IF;

  -- Update the preschool subscription fields
  UPDATE public.preschools 
  SET 
    subscription_tier = p_subscription_tier,
    subscription_status = p_subscription_status,
    subscription_plan_id = p_subscription_plan_id,
    updated_at = NOW()
  WHERE id = p_preschool_id;

  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_preschool_subscription(UUID, TEXT, TEXT, UUID) TO authenticated;

COMMIT;

-- Test the fix
-- After running this, test with:
-- SELECT public.update_preschool_subscription('ba79097c-1b93-4b48-bcbe-df73878ab4d1', 'basic', 'active', 'some-plan-id');