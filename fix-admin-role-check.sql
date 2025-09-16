-- Fix the admin role checking in admin_create_school_subscription
-- This improves the authorization logic to handle different profile structures

BEGIN;

-- First, let's see if the issue is in the role checking
-- Update the admin_create_school_subscription function with better error handling

CREATE OR REPLACE FUNCTION public.admin_create_school_subscription(
  p_school_id uuid,
  p_plan_id text,
  p_billing_frequency text,
  p_seats_total int default 1
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub_id uuid;
  v_is_admin boolean := false;
  v_user_id uuid;
  v_user_role text;
  v_start timestamptz := now();
  v_end timestamptz;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  
  -- Debug: Log the user ID for troubleshooting
  RAISE NOTICE 'Checking permissions for user ID: %', v_user_id;
  
  -- Check if user exists and get their role
  SELECT role INTO v_user_role 
  FROM public.profiles 
  WHERE id = v_user_id OR auth_user_id = v_user_id
  LIMIT 1;
  
  -- Debug: Log the found role
  RAISE NOTICE 'Found user role: %', v_user_role;
  
  -- Check if user has admin privileges
  v_is_admin := v_user_role IN ('super_admin', 'superadmin', 'principal_admin');
  
  -- Debug: Log the authorization result
  RAISE NOTICE 'Is admin: %', v_is_admin;
  
  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access denied. User role "%" is not authorized to create subscriptions. Required roles: super_admin, superadmin, or principal_admin', COALESCE(v_user_role, 'none');
  END IF;

  -- Validate billing frequency
  IF p_billing_frequency NOT IN ('monthly', 'annual') THEN
    RAISE EXCEPTION 'Invalid billing_frequency: %. Must be monthly or annual', p_billing_frequency;
  END IF;

  -- Calculate end date
  IF p_billing_frequency = 'annual' THEN
    v_end := v_start + interval '1 year';
  ELSE
    v_end := v_start + interval '1 month';
  END IF;

  -- Insert the subscription
  INSERT INTO public.subscriptions (
    id, school_id, plan_id, status, owner_type, billing_frequency,
    start_date, end_date, next_billing_date, seats_total, seats_used, metadata
  ) VALUES (
    gen_random_uuid(), p_school_id, p_plan_id, 'active', 'school', p_billing_frequency,
    v_start, v_end, v_end, GREATEST(1, COALESCE(p_seats_total, 1)), 0,
    jsonb_build_object('created_by', 'admin_rpc', 'created_by_user_id', v_user_id)
  ) RETURNING id INTO v_sub_id;

  -- Update school subscription tier
  UPDATE public.preschools 
  SET subscription_tier = p_plan_id 
  WHERE id = p_school_id;

  RAISE NOTICE 'Successfully created subscription with ID: %', v_sub_id;
  
  RETURN v_sub_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.admin_create_school_subscription(uuid, text, text, int) TO authenticated;

COMMIT;

-- Test the function (uncomment to verify)
-- SELECT public.admin_create_school_subscription(
--   'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid,
--   'starter',
--   'monthly',
--   2
-- );