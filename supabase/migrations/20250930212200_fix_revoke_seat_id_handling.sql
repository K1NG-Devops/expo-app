-- ========================================
-- Fix Seat Revocation to Handle Both ID Types
-- ========================================
-- Problem: RPC expects auth.users.id but some teachers only have users.id
-- Solution: Try both ID types in the lookup

CREATE OR REPLACE FUNCTION public.rpc_revoke_teacher_seat(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_service boolean := public.util_is_service_role();
  v_school uuid := public.util_caller_principal_school();
  v_subscription_id uuid;
  v_updated_rows int;
  v_target_user_db_id uuid;
BEGIN
  -- Authorization check
  IF NOT v_is_service AND v_school IS NULL THEN
    RAISE EXCEPTION 'Only principals can revoke teacher seats';
  END IF;

  -- Service role path: infer school from target user
  IF v_is_service AND v_school IS NULL THEN
    SELECT preschool_id INTO v_school 
    FROM public.profiles 
    WHERE id = target_user_id;
  END IF;
  
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'Cannot determine school for operation';
  END IF;

  -- Acquire advisory lock for concurrency control
  IF NOT public.util_acquire_school_lock(v_school) THEN
    RAISE EXCEPTION 'Seat update in progress; please retry';
  END IF;

  -- Get active subscription for the school
  SELECT id INTO v_subscription_id
  FROM public.subscriptions
  WHERE school_id = v_school
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_subscription_id IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for school';
  END IF;

  -- IMPROVED: Try to find the user by multiple ID types
  -- First, try as auth.users.id (original behavior)
  SELECT id INTO v_target_user_db_id
  FROM public.users
  WHERE auth_user_id = target_user_id;
  
  -- If not found, try as users.id directly (fallback for teachers without auth_user_id)
  IF v_target_user_db_id IS NULL THEN
    SELECT id INTO v_target_user_db_id
    FROM public.users
    WHERE id = target_user_id;
  END IF;
  
  -- If still not found, check teachers table
  IF v_target_user_db_id IS NULL THEN
    SELECT user_id INTO v_target_user_db_id
    FROM public.teachers
    WHERE id = target_user_id OR user_id = target_user_id OR auth_user_id = target_user_id;
  END IF;
  
  IF v_target_user_db_id IS NULL THEN
    RAISE EXCEPTION 'Cannot find user record for target user ID: %', target_user_id;
  END IF;

  -- Revoke the seat (soft delete via revoked_at timestamp)
  UPDATE public.subscription_seats
  SET 
    revoked_at = NOW(),
    revoked_by = COALESCE(auth.uid(), target_user_id)
  WHERE subscription_id = v_subscription_id
    AND user_id = v_target_user_db_id
    AND preschool_id = v_school
    AND revoked_at IS NULL;
  
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

  IF v_updated_rows = 0 THEN
    RETURN jsonb_build_object('status', 'no_active_seat');
  END IF;
  
  -- Update seats_used counter in subscriptions table
  UPDATE public.subscriptions 
  SET 
    seats_used = (
      SELECT COUNT(*) 
      FROM public.subscription_seats 
      WHERE subscription_id = v_subscription_id 
        AND (revoked_at IS NULL)
    ),
    updated_at = NOW()
  WHERE id = v_subscription_id;

  RETURN jsonb_build_object('status', 'revoked');
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION public.rpc_revoke_teacher_seat(uuid) TO authenticated, service_role;

-- Log the fix
INSERT INTO public.config_kv (key, value, description, is_public)
VALUES (
  'seat_revocation_id_fix_20250930',
  jsonb_build_object(
    'completed_at', now(),
    'issue_fixed', 'RPC now handles both auth.users.id and users.id',
    'changes_made', ARRAY[
      'Added fallback lookup for users.id',
      'Added teachers table lookup as final fallback',
      'Improved error messages'
    ]
  ),
  'Fix for seat revocation ID type handling',
  FALSE
) ON CONFLICT (key) DO UPDATE SET
  value = excluded.value,
  updated_at = now();

SELECT 'SEAT REVOCATION ID HANDLING FIXED' AS status;
