-- Clean fix for function overloading ambiguity (PGRST203 error)
-- This removes ALL versions of the function and creates one clean version

BEGIN;

-- Remove ALL possible versions of the function to avoid overloading confusion
-- PostgreSQL function signatures can vary by parameter types, so we need to be thorough

-- Drop any version with TEXT parameter for subscription_plan_id
DROP FUNCTION IF EXISTS public.update_preschool_subscription(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_preschool_subscription(text, text, text, text);
DROP FUNCTION IF EXISTS public.update_preschool_subscription(uuid, text, text, text);

-- Drop any version with UUID parameter for subscription_plan_id  
DROP FUNCTION IF EXISTS public.update_preschool_subscription(UUID, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.update_preschool_subscription(uuid, text, text, uuid);

-- Drop any other potential variations
DROP FUNCTION IF EXISTS public.update_preschool_subscription(uuid, varchar, varchar, uuid);
DROP FUNCTION IF EXISTS public.update_preschool_subscription(uuid, varchar, varchar, text);

-- Now create ONE definitive version with explicit parameter names and types
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
  -- Check if caller is super admin or service role
  IF NOT (
    -- Super admin check
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('superadmin', 'super_admin')
    )
    OR
    -- Service role bypass
    current_setting('role') = 'service_role'
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

  -- Return true if row was updated, false if not found
  RETURN FOUND;
END;
$$;

-- Grant execute permission to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.update_preschool_subscription(UUID, TEXT, TEXT, UUID) TO authenticated, service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.update_preschool_subscription(UUID, TEXT, TEXT, UUID) IS 
'Updates preschool subscription metadata. Requires super admin role or service role.';

COMMIT;

-- Verification query (uncomment to test)
-- SELECT proname, pronargs, pg_get_function_arguments(oid) as args 
-- FROM pg_proc 
-- WHERE proname = 'update_preschool_subscription';