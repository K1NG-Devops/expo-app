-- Check and ensure seat assignment RPCs work properly with current RLS setup
-- These RPCs should allow principals to assign/revoke seats through the UI

-- 1. Check if the RPCs exist
SELECT 
  'Checking RPCs' as section,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name IN ('assign_teacher_seat', 'revoke_teacher_seat')
AND routine_schema = 'public';

-- 2. Check current RLS status on subscription_seats table
SELECT 
  'Subscription Seats RLS Status' as section,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'subscription_seats';

-- 3. Create/update the RPCs to work with current setup
CREATE OR REPLACE FUNCTION public.assign_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert seat assignment (using composite primary key structure)
  INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
  VALUES (p_subscription_id, p_user_id, NOW())
  ON CONFLICT (subscription_id, user_id) DO NOTHING;
  
  -- Update seats_used counter
  UPDATE public.subscriptions
  SET seats_used = (
    SELECT COUNT(*) FROM public.subscription_seats ss 
    WHERE ss.subscription_id = p_subscription_id
  )
  WHERE id = p_subscription_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_teacher_seat(
  p_subscription_id uuid,
  p_user_id uuid
) 
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove seat assignment
  DELETE FROM public.subscription_seats
  WHERE subscription_id = p_subscription_id AND user_id = p_user_id;
  
  -- Update seats_used counter
  UPDATE public.subscriptions
  SET seats_used = (
    SELECT COUNT(*) FROM public.subscription_seats ss 
    WHERE ss.subscription_id = p_subscription_id
  )
  WHERE id = p_subscription_id;
END;
$$;

-- 4. Grant proper permissions
GRANT EXECUTE ON FUNCTION public.assign_teacher_seat(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_teacher_seat(uuid, uuid) TO authenticated;

-- 5. Test data: Get the subscription and teacher info for manual assignment
SELECT 
  'Test Data for Manual Assignment' as section,
  u.id as teacher_id,
  u.email as teacher_email,
  u.role,
  s.id as subscription_id,
  s.preschool_id,
  pr.name as school_name
FROM public.users u
JOIN public.subscriptions s ON u.preschool_id = s.preschool_id  
JOIN public.preschools pr ON s.preschool_id = pr.id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 6. Check who can assign seats (should be principals and superadmins)
SELECT 
  'Users Who Can Assign Seats' as section,
  u.id,
  u.email,
  u.role,
  u.preschool_id
FROM public.users u
WHERE u.preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
)
AND u.role IN ('principal', 'superadmin');

-- NEXT STEPS:
-- 1. Have the principal login to the seat management UI
-- 2. Use "Assign Seat" button to assign seat to the teacher
-- 3. This should call the assign_teacher_seat RPC
-- 4. Teacher should then have active seat status