-- Check if Principal Hub tables exist
-- Run this in your Supabase SQL editor

-- Check if principal_announcements table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'principal_announcements'
) AS principal_announcements_exists;

-- Check if financial_transactions table exists  
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'financial_transactions'
) AS financial_transactions_exists;

-- Check if teacher_performance_metrics table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'teacher_performance_metrics'
) AS teacher_performance_metrics_exists;

-- List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;