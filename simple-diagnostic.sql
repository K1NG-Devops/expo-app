-- Simple diagnostic - check each issue separately
-- Teacher: katso@youngeagles.org.za (a1fd12d2-5f09-4a23-822d-f3071bfc544b)

-- 1. Check if get_my_org_member RPC even exists
SELECT 'RPC exists check' as section, 
       COUNT(*) as rpc_count
FROM information_schema.routines 
WHERE routine_name = 'get_my_org_member';

-- 2. Check assignments table RLS status
SELECT 'Assignments RLS' as section, 
       rowsecurity as enabled
FROM pg_tables 
WHERE tablename = 'assignments';

-- 3. Check subscription_seats data
SELECT 'Seat data' as section,
       COUNT(*) as seat_count
FROM public.subscription_seats 
WHERE user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- 4. Check profiles table access (this might fail with 403)
SELECT 'Profile count' as section,
       COUNT(*) as profile_count  
FROM public.profiles 
WHERE id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;