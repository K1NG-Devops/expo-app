-- Check and ensure seat assignment RPCs work properly - CLEAN VERSION
-- Using correct table structure with school_id

-- 1. Check subscriptions table structure first
SELECT 
  'Subscriptions Table Structure' as section,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'subscriptions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if the RPCs exist
SELECT 
  'Checking RPCs' as section,
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_name IN ('assign_teacher_seat', 'revoke_teacher_seat')
AND routine_schema = 'public';

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

-- 5. Find subscription for teacher's school (using school_id only)
SELECT 
  'Finding Subscription' as section,
  s.id as subscription_id,
  s.school_id,
  s.status,
  s.seats_used
FROM public.subscriptions s
WHERE s.school_id = (
  SELECT u.preschool_id FROM public.users u 
  WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 6. Check teacher info
SELECT 
  'Teacher Info' as section,
  u.id as teacher_id,
  u.email as teacher_email,
  u.role,
  u.preschool_id
FROM public.users u
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 7. Check who can assign seats (principals in same school)
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
-- 1. Note the subscription_id from "Finding Subscription" output
-- 2. Login as one of the principals from "Users Who Can Assign Seats"
-- 3. Go to Seat Management UI
-- 4. Assign seat to the teacher using the UI
-- 5. Teacher should then have active seat status