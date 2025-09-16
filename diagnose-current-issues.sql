-- Diagnose what's still blocking the teacher dashboard
-- Teacher: katso@youngeagles.org.za (a1fd12d2-5f09-4a23-822d-f3071bfc544b)

-- 1. Check if get_my_org_member RPC returns active seat status
SELECT 
  'get_my_org_member test' as section,
  *
FROM get_my_org_member('ba79097c-1b93-4b48-bcbe-df73878ab4d1'::uuid);

-- 2. Test if the teacher can see their own profile (403 error check)
SELECT 
  'Profile access test' as section,
  id, email, role, preschool_id
FROM public.profiles 
WHERE id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- 3. Check seat assignment status directly
SELECT 
  'Seat status check' as section,
  ss.subscription_id,
  ss.user_id,
  ss.assigned_at,
  s.seats_used,
  u.email,
  u.name
FROM public.subscription_seats ss
JOIN public.subscriptions s ON ss.subscription_id = s.id
JOIN public.users u ON ss.user_id = u.auth_user_id
WHERE ss.user_id = 'a1fd12d2-5f09-4a23-822d-f3071bfc544b'::uuid;

-- 4. Check assignments table RLS status
SELECT 
  'Assignments RLS Status' as section,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'assignments';

-- 5. Check profiles table RLS policies
SELECT 
  'Profiles RLS Policies' as section,
  policyname,
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'profiles';

-- ISSUES TO RESOLVE:
-- 1. If get_my_org_member returns null or inactive - fix the RPC
-- 2. If profiles 403 error - fix profiles RLS policy  
-- 3. If assignments 400 error - apply assignments RLS
-- 4. If seat status not properly detected - fix UI logic