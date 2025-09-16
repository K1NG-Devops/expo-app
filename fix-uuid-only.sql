-- Simplified fix: Only update the RPC function to handle UUID parameter types
-- This avoids conflicts with existing RLS policies

BEGIN;

-- Drop the existing function (if it exists) and recreate with correct UUID parameter type
DROP FUNCTION IF EXISTS public.update_preschool_subscription(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_preschool_subscription(UUID, TEXT, TEXT, UUID);

-- Create the function with correct UUID parameter type
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

-- Test the function with a simple query (replace with actual IDs)
-- SELECT public.update_preschool_subscription(
--   'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid,
--   'pro',
--   'active', 
--   '54cf2955-c4bb-4bf7-8d8d-18d097f3e2f8'::uuid
-- );