-- Check teacher seat assignment status and fix if needed
-- Teacher ID: 48f8086a-3c88-44a2-adcd-570d97d3a580

-- 1. Check current teacher info
SELECT 
  'Teacher Info' as section,
  u.id,
  u.email,
  u.role,
  u.preschool_id,
  u.created_at
FROM public.users u 
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check if teacher has a seat assignment
SELECT 
  'Seat Assignment' as section,
  ss.subscription_id,
  ss.user_id,
  ss.assigned_at
FROM public.subscription_seats ss
WHERE ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 3. Check subscription status for the teacher's preschool
SELECT 
  'Subscription Status' as section,
  s.id as subscription_id,
  s.preschool_id,
  s.plan_id,
  s.status,
  s.seats_used,
  sp.name as plan_name,
  sp.max_seats
FROM public.subscriptions s
JOIN public.subscription_plans sp ON s.plan_id = sp.id
WHERE s.preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 4. If no seat assignment exists, create one
INSERT INTO public.subscription_seats (
  subscription_id,
  user_id,
  assigned_at
)
SELECT 
  s.id as subscription_id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid as user_id,
  NOW() as assigned_at
FROM public.users u
JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
  AND u.preschool_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.subscription_seats ss 
    WHERE ss.user_id = u.id
  );

-- 5. Update subscription seats_used count if needed
UPDATE public.subscriptions 
SET seats_used = (
  SELECT COUNT(*) FROM public.subscription_seats ss 
  WHERE ss.subscription_id = subscriptions.id
)
WHERE preschool_id = (
  SELECT preschool_id FROM public.users 
  WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
);

-- 6. Verify the fix
SELECT 
  'Final Check' as section,
  u.email,
  u.role,
  CASE 
    WHEN ss.user_id IS NOT NULL THEN 'active'
    ELSE 'no_seat'
  END as seat_status,
  s.seats_used,
  sp.max_seats,
  CASE 
    WHEN ss.user_id IS NOT NULL THEN 'Teacher should have dashboard access'
    ELSE 'Issue: Teacher has no seat assignment'
  END as access_status
FROM public.users u
LEFT JOIN public.subscription_seats ss ON u.id = ss.user_id
LEFT JOIN public.subscriptions s ON u.preschool_id = s.preschool_id
LEFT JOIN public.subscription_plans sp ON s.plan_id = sp.id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;
