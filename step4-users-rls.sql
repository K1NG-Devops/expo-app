-- STEP 4: Apply RLS to users table  
-- Apply this AFTER confirming Step 3 (profiles) is working
-- This step is CRITICAL - users table was causing many 500 errors before

BEGIN;

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy: Similar to profiles but uses auth_user_id for self-access
CREATE POLICY users_access ON public.users 
FOR SELECT TO authenticated USING (
  -- Superadmin sees all users
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Users can see their own record (users table uses auth_user_id)
  auth_user_id = auth.uid() OR
  -- Principals can see users in their school
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'principal'
    AND p.preschool_id = users.preschool_id
  ) OR
  -- Teachers can see users in their school (limited scope)
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = users.preschool_id
    AND users.preschool_id IS NOT NULL
  )
);

COMMIT;

-- ULTRA-CRITICAL TEST POINTS after applying:
-- 1. ✅ Superadmin dashboard - check for users table 500 errors (this was failing before)
-- 2. ✅ Seat management page - still shows teachers?
-- 3. ✅ All user dashboards load without errors?
-- 4. ✅ No 500 errors in browser console for users queries?

-- The users table was the main culprit for 500 errors before
-- If you see ANY 500 errors after this step, IMMEDIATELY revert:
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- If this works without issues, we've conquered the hardest part!