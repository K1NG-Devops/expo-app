-- Simple debug: Check table structures and user data
-- User ID: 136cf31c-b37c-45c0-9cf7-755bd1b9afbf

-- 1. Check what columns exist in users table
SELECT 'users table columns' as check_type, column_name 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check what columns exist in profiles table  
SELECT 'profiles table columns' as check_type, column_name
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check current auth user
SELECT 'current auth user' as check_type, auth.uid() as current_user_id;

-- 4. Check user in users table (basic columns only)
SELECT 'user in users table' as check_type, *
FROM public.users 
WHERE auth_user_id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf'
LIMIT 1;

-- 5. Check user in profiles table
SELECT 'user in profiles table' as check_type, *
FROM public.profiles 
WHERE id = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf'
LIMIT 1;

-- 6. Check teacher_invites policies
SELECT 'teacher_invites policies' as check_type, policyname, cmd, qual
FROM pg_policies 
WHERE tablename = 'teacher_invites';