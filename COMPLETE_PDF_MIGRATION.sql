-- ====================================================================
-- COMPLETE PDF MIGRATION - CLEANUP AND VERIFICATION
-- Run this to complete the PDF system setup
-- ====================================================================

-- Verification query to check current status
SELECT 
  'PDF Tables Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences' AND table_schema = 'public')
    THEN '✅ pdf_user_preferences exists'
    ELSE '❌ pdf_user_preferences missing'
  END as pdf_user_preferences_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates' AND table_schema = 'public')
    THEN '✅ pdf_custom_templates exists'
    ELSE '❌ pdf_custom_templates missing'
  END as pdf_custom_templates_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents' AND table_schema = 'public')
    THEN '✅ pdf_documents exists'
    ELSE '❌ pdf_documents missing'
  END as pdf_documents_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs')
    THEN '✅ storage bucket exists'
    ELSE '❌ storage bucket missing'
  END as storage_bucket_status;

-- Create storage bucket if missing
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-pdfs',
  'generated-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Ensure all permissions are granted
GRANT ALL ON public.pdf_user_preferences TO authenticated;
GRANT ALL ON public.pdf_custom_templates TO authenticated;
GRANT ALL ON public.pdf_documents TO authenticated;

-- Final verification
SELECT 
  'PDF Migration Final Status' as check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates')  
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents')
     AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs')
    THEN '🎉 PDF SYSTEM READY - All components installed!'
    ELSE '⚠️ PDF SYSTEM INCOMPLETE - Check missing components above'
  END as final_status;