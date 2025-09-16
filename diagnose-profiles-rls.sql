-- DIAGNOSE: Check profiles table RLS setup and conflicts
-- Run this to understand why RLS is failing on profiles table

-- Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  forcerowsecurity
FROM pg_tables 
WHERE tablename = 'profiles';

-- Check existing policies on profiles table
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
WHERE tablename = 'profiles';

-- Check if there are any triggers or functions on profiles table
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'profiles';

-- Check profiles table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check current user's role and profile
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  p.role as user_role,
  p.preschool_id
FROM profiles p 
WHERE p.id = auth.uid();