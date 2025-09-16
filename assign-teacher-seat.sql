-- Assign active seat to the teacher who is having access issues
-- Teacher ID: 48f8086a-3c88-44a2-adcd-570d97d3a580

-- 1. Check current teacher and subscription info
SELECT 
  'Teacher Info' as section,
  u.id,
  u.email,
  u.role,
  u.preschool_id,
  s.id as subscription_id,
  s.status as subscription_status
FROM public.users u
LEFT JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check if teacher already has a seat assignment
SELECT 
  'Current Seat Status' as section,
  ss.subscription_id,
  ss.user_id,
  ss.assigned_at,
  'ALREADY_HAS_SEAT' as status
FROM public.subscription_seats ss
WHERE ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 3. Assign seat to teacher (only if they don't already have one)
INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
SELECT 
  s.id as subscription_id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid as user_id,
  NOW() as assigned_at
FROM public.users u
JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
AND NOT EXISTS (
  SELECT 1 FROM public.subscription_seats ss 
  WHERE ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 4. Update subscription seats_used count
UPDATE public.subscriptions 
SET seats_used = (
  SELECT COUNT(*) FROM public.subscription_seats ss 
  WHERE ss.subscription_id = subscriptions.id
)
WHERE preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 5. Verify the teacher now has a seat
SELECT 
  'Final Verification' as section,
  u.email,
  u.role,
  CASE 
    WHEN ss.user_id IS NOT NULL THEN 'ACTIVE_SEAT'
    ELSE 'NO_SEAT'
  END as seat_status,
  s.seats_used,
  ss.assigned_at
FROM public.users u
LEFT JOIN public.subscription_seats ss ON u.id = ss.user_id
LEFT JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- EXPECTED RESULT:
-- Teacher should now have seat_status = 'ACTIVE_SEAT'
-- This should resolve the "Access Restricted" issue in the teacher dashboard