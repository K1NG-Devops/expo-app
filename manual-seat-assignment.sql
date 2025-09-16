-- Manual seat assignment - check what exists and assign directly

-- 1. Check what's in users table for this teacher ID
SELECT 'Users table check' as section, count(*) as user_count
FROM public.users 
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 2. Check what's in profiles table for this teacher ID  
SELECT 'Profiles table check' as section, count(*) as profile_count
FROM public.profiles
WHERE id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;

-- 3. Check if any subscriptions exist for the preschool
SELECT 'Subscriptions count' as section, count(*) as subscription_count
FROM public.subscriptions 
WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid;

-- 4. Show all subscriptions (to see what exists)
SELECT 'All subscriptions' as section, id, school_id, status
FROM public.subscriptions 
LIMIT 5;

-- 5. If subscription exists, get its ID and assign seat directly
-- First get the subscription ID
WITH subscription_info AS (
  SELECT id as subscription_id 
  FROM public.subscriptions 
  WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid
  LIMIT 1
)
-- Insert seat assignment directly
INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
SELECT 
  s.subscription_id,
  '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid,
  NOW()
FROM subscription_info s
WHERE s.subscription_id IS NOT NULL
ON CONFLICT (subscription_id, user_id) DO NOTHING;

-- 6. Verify seat assignment worked
SELECT 
  'Seat Assignment Result' as section,
  subscription_id, 
  user_id, 
  assigned_at
FROM public.subscription_seats
WHERE user_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'::uuid;