-- Debug: Check why teacher invite is getting 403
-- User ID from logs: 136cf31c-b37c-45c0-9cf7-755bd1b9afbf

-- Check if user exists in profiles table
SELECT 'profiles table check' as check_type,
       id, role, preschool_id, email, first_name, last_name
FROM public.profiles 
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Check if user exists in users table (alternative)
SELECT 'users table check' as check_type,
       id, auth_user_id, role, preschool_id, email
FROM public.users 
WHERE auth_user_id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

-- Check current auth.uid()
SELECT 'auth.uid() check' as check_type, auth.uid() as current_auth_uid;

-- Check what preschools exist
SELECT 'preschools check' as check_type,
       id, name, is_active
FROM public.preschools 
LIMIT 5;

-- Check if teacher_invites table exists and its structure
SELECT 'teacher_invites structure' as check_type,
       column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'teacher_invites' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check existing policies on teacher_invites
SELECT 'teacher_invites policies' as check_type,
       schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'teacher_invites';

-- Test if we can see any data in teacher_invites (should be empty but accessible if policies work)
SELECT 'teacher_invites data test' as check_type,
       COUNT(*) as total_records
FROM public.teacher_invites;