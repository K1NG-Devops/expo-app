-- Simple fix for teacher seat assignment
-- Teacher ID: 48f8086a-3c88-44a2-adcd-570d97d3a580

-- 1. Check current teacher info
SELECT 
  'Teacher Info' as section,
  u.id,
  u.email,
  u.role,
  u.preschool_id
FROM public.users u 
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check subscription for this teacher's preschool
SELECT 
  'Subscription Info' as section,
  s.id as subscription_id,
  s.preschool_id,
  s.status,
  s.seats_used,
  (SELECT COUNT(*) FROM public.subscription_seats ss WHERE ss.subscription_id = s.id) as actual_seats_count
FROM public.subscriptions s
WHERE s.preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 3. Check if teacher already has a seat
SELECT 
  'Current Seat Status' as section,
  ss.subscription_id,
  ss.user_id,
  ss.assigned_at
FROM public.subscription_seats ss
WHERE ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 4. Assign seat to teacher (will only insert if doesn't exist)
INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
SELECT 
  s.id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  NOW()
FROM public.subscriptions s
WHERE s.preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
)
AND NOT EXISTS (
  SELECT 1 FROM public.subscription_seats ss 
  WHERE ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 5. Final verification
SELECT 
  'Final Status' as section,
  u.email,
  u.role,
  CASE WHEN ss.user_id IS NOT NULL THEN 'HAS_SEAT' ELSE 'NO_SEAT' END as seat_status
FROM public.users u
LEFT JOIN public.subscription_seats ss ON u.id = ss.user_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;