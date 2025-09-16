-- Debug: Check activity_logs table structure and existence

-- 1. Check if activity_logs table exists
SELECT 'activity_logs table exists' as check_type,
       CASE 
         WHEN EXISTS (
           SELECT 1 FROM information_schema.tables 
           WHERE table_name = 'activity_logs' AND table_schema = 'public'
         ) THEN 'YES' 
         ELSE 'NO' 
       END as table_exists;

-- 2. Check activity_logs table columns (if table exists)
SELECT 'activity_logs columns' as check_type, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_logs' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check for similar table names (in case it's named differently)
SELECT 'similar table names' as check_type, table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%activity%' OR table_name LIKE '%log%' OR table_name LIKE '%audit%')
ORDER BY table_name;

-- 4. If activity_logs exists, check RLS policies
SELECT 'activity_logs policies' as check_type, policyname, cmd, permissive
FROM pg_policies 
WHERE tablename = 'activity_logs';

-- 5. Test basic query on activity_logs (if it exists)
-- This will show if the issue is with permissions or missing table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'activity_logs' AND table_schema = 'public'
  ) THEN
    PERFORM 1 FROM public.activity_logs LIMIT 1;
    RAISE NOTICE 'activity_logs table is accessible';
  ELSE
    RAISE NOTICE 'activity_logs table does not exist';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error accessing activity_logs: %', SQLERRM;
END $$;