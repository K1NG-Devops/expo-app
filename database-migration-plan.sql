-- ====================================================================
-- Apply Missing Migrations to Supabase Database
-- Run these in Supabase Dashboard → SQL Editor
-- ====================================================================

-- CRITICAL: PDF System Migration
-- This is ESSENTIAL for PDF generation to work
-- File: migrations/20251009_dash_pdf_generator_tables.sql
-- Status: REQUIRED

-- Missing Tables Detected:
-- pdf_user_preferences: PDF user preferences and settings
-- pdf_custom_templates: Custom PDF templates for organizations
-- pdf_documents: PDF document history and metadata
-- user_entitlements: User permissions and access control
-- petty_cash_approvals: Petty cash approval workflow

-- Recommended Migration Order:
-- 1. Core user system migrations
-- 2. PDF system migration (CRITICAL)
-- 3. Feature-specific migrations
-- 4. Error fixes

-- Verification Query (run after applying migrations):
SELECT 
  'pdf_user_preferences' as table_name,
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
