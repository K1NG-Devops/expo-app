
-- ====================================================================
-- Apply All Missing Migrations to Supabase
-- ====================================================================
-- Run these in Supabase SQL Editor if any tables are missing

-- Step 1: Apply PDF Generator Migration (CRITICAL for PDF functionality)
-- Copy the contents of: migrations/20251009_dash_pdf_generator_tables.sql

-- Step 2: Apply other critical migrations
-- Run each .sql file in the migrations/ folder in date order:

-- Core user system (run if profiles table issues)
-- migrations/20250919_complete_users_table_fix.sql
-- migrations/20250919_fix_dashboard_tables_complete.sql  
-- migrations/20250920_user_entitlements_schema.sql

-- Storage and features
-- migrations/20250917_setup_avatars_storage.sql
-- migrations/20250917_fix_announcements_fk.sql

-- AI and messaging features  
-- migrations/20250118_ai_usage_hardening.sql
-- migrations/20250118_parent_messaging_foundation.sql

-- Error fixes
-- migrations/fix_activity_logs_500_error.sql
-- migrations/fix_profiles_app_auth_error.sql

-- ====================================================================
-- Quick verification query (run after applying migrations):
-- ====================================================================

-- PDF System Migration Verification
SELECT 
  'PDF Migration Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates')  
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents')
     AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs')
    THEN '✅ COMPLETE - All PDF tables and storage exist'
    ELSE '❌ INCOMPLETE - PDF migration not fully applied'
  END as status;
  
-- Detailed PDF table check
SELECT 'pdf_user_preferences' as table_name, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'pdf_custom_templates' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL  
SELECT 'pdf_documents' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 'generated-pdfs bucket' as table_name,
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs') 
            THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;
            
-- Check RLS policies for PDF tables
SELECT 
  schemaname,
  tablename,
  policyname,
  'RLS Policy' as type
FROM pg_policies 
WHERE tablename IN ('pdf_user_preferences', 'pdf_custom_templates', 'pdf_documents')
ORDER BY tablename, policyname;

