-- Debug script to check users table structure and RLS policies

-- Check if users table exists and its structure
\d users;

-- Check RLS status on users table
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    hasrls
FROM pg_tables t
LEFT JOIN pg_class c ON c.relname = t.tablename 
WHERE tablename = 'users' AND schemaname = 'public';

-- Check existing RLS policies on users table
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
WHERE tablename = 'users' AND schemaname = 'public';

-- Check if auth_user_id column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;