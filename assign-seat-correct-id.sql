-- Assign seat using the correct auth_user_id from the users table
-- Teacher: Dimakatso Mogashoa (katso@youngeagles.org.za)

-- 1. Get subscription for Young Eagles preschool
WITH subscription_info AS (
  SELECT id as subscription_id 
  FROM public.subscriptions 
  WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid
  LIMIT 1
)
-- 2. Assign seat using auth_user_id (not the profile id)
INSERT INTO public.subscription_seats (subscription_id, user_id, assigned_at)
SELECT 
  s.subscription_id,
  'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid,  -- This is the auth_user_id from the users table
  NOW()
FROM subscription_info s
WHERE s.subscription_id IS NOT NULL
ON CONFLICT (subscription_id, user_id) DO NOTHING;

-- 3. Verify seat assignment worked
SELECT 
  'Seat Assignment Result' as section,
  ss.subscription_id, 
  ss.user_id as auth_user_id,
  ss.assigned_at,
  u.email,
  u.name
FROM public.subscription_seats ss
JOIN public.users u ON ss.user_id = u.auth_user_id
WHERE ss.user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- 4. Update subscription seats_used count
UPDATE public.subscriptions 
SET seats_used = (
  SELECT COUNT(*) FROM public.subscription_seats ss 
  WHERE ss.subscription_id = subscriptions.id
)
WHERE school_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid;

-- EXPECTED RESULT:
-- Teacher katso@youngeagles.org.za should now have an active seat assignment
-- This should resolve the "Access Restricted" issue in the teacher dashboard