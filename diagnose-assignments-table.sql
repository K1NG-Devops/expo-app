-- DIAGNOSE: Check assignments table structure and RLS status
-- This will help us understand why the assignments RLS is still failing

-- 1. Check if assignments table exists and its structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'assignments' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check RLS status on assignments table
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'assignments';

-- 3. Check current policies on assignments table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'assignments';

-- 4. Test query: Check if current user can see assignments
-- (This simulates what the app is trying to do)
SELECT 
  auth.uid() as current_user_id,
  COUNT(*) as assignments_count
FROM public.assignments 
WHERE teacher_id = auth.uid();

-- 5. Check if there are any assignments in the table at all
SELECT COUNT(*) as total_assignments FROM public.assignments;

-- 6. Check the specific teacher_id from the error
SELECT 
  id,
  teacher_id,
  preschool_id,
  title
FROM public.assignments 
WHERE teacher_id = '48f8086a-3c88-44a2-adcd-570d97d3a580'
LIMIT 5;