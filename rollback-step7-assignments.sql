-- ROLLBACK STEP 7: Disable RLS on assignments table
-- Use this if Step 7 causes any issues

BEGIN;

-- Disable RLS on assignments table
ALTER TABLE public.assignments DISABLE ROW LEVEL SECURITY;

-- Drop the policies (optional, but clean)
DROP POLICY IF EXISTS assignments_access ON public.assignments;
DROP POLICY IF EXISTS assignments_manage ON public.assignments;

COMMIT;

-- After running this, test that:
-- 1. Teacher dashboard loads assignments again
-- 2. No more RLS-related errors in console