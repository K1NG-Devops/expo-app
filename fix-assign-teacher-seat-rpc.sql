-- Fix assign_teacher_seat RPC to properly activate seat status
-- This updates both subscription_seats AND organization_members tables

CREATE OR REPLACE FUNCTION public.assign_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Insert into subscription_seats table (existing logic)
  INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
  VALUES (p_subscription_id, p_user_id, NOW())
  ON CONFLICT (subscription_id, user_id) DO NOTHING;
  
  -- 2. Update organization_members to activate seat status
  -- This is the missing piece that was causing "Access Restricted"
  UPDATE public.organization_members
  SET 
    seat_status = 'active',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND seat_status = 'pending';
  
  -- 3. Update subscription seats_used counter
  UPDATE public.subscriptions
  SET seats_used = (
    SELECT COUNT(*) FROM public.subscription_seats ss 
    WHERE ss.subscription_id = p_subscription_id
  )
  WHERE id = p_subscription_id;
END;
$$;

-- Also update revoke_teacher_seat to properly deactivate
CREATE OR REPLACE FUNCTION public.revoke_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Remove from subscription_seats table
  DELETE FROM public.subscription_seats
  WHERE subscription_id = p_subscription_id AND user_id = p_user_id;
  
  -- 2. Update organization_members to deactivate seat status
  UPDATE public.organization_members
  SET 
    seat_status = 'pending',
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND seat_status = 'active';
  
  -- 3. Update subscription seats_used counter
  UPDATE public.subscriptions
  SET seats_used = (
    SELECT COUNT(*) FROM public.subscription_seats ss 
    WHERE ss.subscription_id = p_subscription_id
  )
  WHERE id = p_subscription_id;
END;
$$;

-- Test: Check current seat status before applying fix
SELECT 
  'Before Fix - Organization Members' as section,
  user_id,
  organization_id,
  seat_status,
  updated_at
FROM public.organization_members
WHERE user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;