-- Fix the teacher user record issue - CORRECTED VERSION
-- Teacher exists in profiles but not in users table

-- 1. Check profiles vs users tables
SELECT 'Profiles table' as section, id, email, role, preschool_id
FROM public.profiles 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

SELECT 'Users table' as section, count(*) as user_count
FROM public.users
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check users table structure to see what columns exist
SELECT 'Users table structure' as section, column_name, data_type
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Create user record for the teacher (using only existing columns)
INSERT INTO public.users (
  id, 
  email, 
  role, 
  first_name, 
  last_name, 
  preschool_id,
  created_at
)
SELECT 
  p.id,
  p.email,
  p.role,
  p.first_name,
  p.last_name,
  p.preschool_id,
  p.created_at
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
  'Final Status' as section,
  'User created: ' || CASE WHEN u.id IS NOT NULL THEN 'YES' ELSE 'NO' END as user_status,
  'Seat assigned: ' || CASE WHEN ss.user_id IS NOT NULL THEN 'YES' ELSE 'NO' END as seat_status
FROM public.users u
FULL OUTER JOIN public.subscription_seats ss ON u.id = ss.user_id
WHERE u.id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid 
   OR ss.user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;