-- STEP 2: Apply RLS to preschools table
-- Apply this AFTER confirming Step 1 (subscription_plans) is working
-- Test the app after applying this step

BEGIN;

-- Enable RLS on preschools table
ALTER TABLE public.preschools ENABLE ROW LEVEL SECURITY;

-- Simple policy: Users can see their own preschool + superadmins see all
CREATE POLICY preschools_access ON public.preschools 
FOR SELECT TO authenticated USING (
  -- Superadmin sees all preschools
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role = 'superadmin'
  ) OR
  -- Users can see their own preschool
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.preschool_id = preschools.id
  )
);

COMMIT;

-- Test queries after applying:
-- 1. Check if superadmin dashboard still loads preschools
-- 2. Check if principals can see their school data
-- 3. Check if seat management page still works
-- 4. Look for any new 500 errors in browser console

-- If everything works, proceed to Step 3
-- If there are issues, revert with: 
-- ALTER TABLE public.preschools DISABLE ROW LEVEL SECURITY;