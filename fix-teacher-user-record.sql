-- Fix the teacher user record issue
-- Teacher exists in profiles but not in users table

-- 1. Check profiles vs users tables
SELECT 'Profiles table' as section, id, email, role, preschool_id
FROM public.profiles 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

SELECT 'Users table' as section, count(*) as user_count
FROM public.users
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check the difference between profiles and users
SELECT 'Profiles without Users' as section, count(*) as missing_users
FROM public.profiles p
LEFT JOIN public.users u ON p.id = u.id
WHERE u.id IS NULL;

-- 3. Create user record for the teacher based on their profile
INSERT INTO public.users (
  id, 
  email, 
  role, 
  first_name, 
  last_name, 
  preschool_id,
  created_at,
  last_login_at
)
SELECT 
  p.id,
  p.email,
  p.role,
  p.first_name,
  p.last_name,
  p.preschool_id,
  p.created_at,
  NOW()
FROM public.profiles p
WHERE p.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid
AND NOT EXISTS (
  SELECT 1 FROM public.users u WHERE u.id = p.id
);

-- 4. Verify user record was created
SELECT 'New User Record' as section, id, email, role, preschool_id
FROM public.users 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 5. Now assign the seat (should work now)
WITH subscription_info AS (
  SELECT id as subscription_id 
  FROM public.subscriptions 
  WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid
  LIMIT 1
)
INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
SELECT 
  s.subscription_id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  NOW()
FROM subscription_info s
WHERE s.subscription_id IS NOT NULL
ON CONFLICT (subscription_id, user_id) DO NOTHING;

-- 6. Final verification
SELECT 
  'Seat Assignment Success' as section,
  subscription_id, 
  user_id, 
  assigned_at
FROM public.subscription_seats
WHERE user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- EXPECTED RESULT:
-- Teacher should now have:
-- 1. Record in users table (copied from profiles)
-- 2. Active seat assignment in subscription_seats
-- 3. Dashboard should work without "Access Restricted"