-- ====================================================================
-- SIMPLE PDF SYSTEM MIGRATION - WORKING VERSION
-- Basic tables with correct syntax - no complex foreign keys
-- ====================================================================

-- PDF User Preferences Table
CREATE TABLE IF NOT EXISTS public.pdf_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  preschool_id UUID,
  default_theme TEXT CHECK (default_theme IN ('professional', 'colorful', 'minimalist')),
  default_font TEXT DEFAULT 'Arial',
  default_layout JSONB DEFAULT '{}'::jsonb,
  default_branding JSONB DEFAULT '{}'::jsonb,
  header_html_safe TEXT,
  footer_html_safe TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pdf_user_preferences_user_id_key UNIQUE (user_id)
);

-- PDF Custom Templates Table
CREATE TABLE IF NOT EXISTS public.pdf_custom_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  preschool_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'report', 'letter', 'invoice', 'study_guide', 'lesson_plan',
    'progress_report', 'assessment', 'certificate', 'newsletter',
    'worksheet', 'general'
  )),
  template_html TEXT NOT NULL,
  input_schema JSONB DEFAULT '{}'::jsonb,
  thumbnail_url TEXT,
  is_org_shared BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PDF Documents Table
CREATE TABLE IF NOT EXISTS public.pdf_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID,
  preschool_id UUID,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN (
    'report', 'letter', 'invoice', 'study_guide', 'lesson_plan',
    'progress_report', 'assessment', 'certificate', 'newsletter',
    'worksheet', 'general'
  )),
  storage_path TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size_bytes BIGINT,
  page_count INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS pdf_user_preferences_user_id_idx ON public.pdf_user_preferences(user_id);
CREATE INDEX IF NOT EXISTS pdf_custom_templates_owner_user_id_idx ON public.pdf_custom_templates(owner_user_id);
CREATE INDEX IF NOT EXISTS pdf_documents_user_id_idx ON public.pdf_documents(user_id);

-- Storage bucket for PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-pdfs',
  'generated-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.pdf_user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_custom_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_documents ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies - users can only access their own data
CREATE POLICY pdf_user_preferences_policy ON public.pdf_user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY pdf_custom_templates_owner_policy ON public.pdf_custom_templates
  FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY pdf_documents_policy ON public.pdf_documents
  FOR ALL USING (auth.uid() = user_id);

-- Storage policy
CREATE POLICY generated_pdfs_policy ON storage.objects
  FOR ALL USING (
    bucket_id = 'generated-pdfs'
    AND auth.role() = 'authenticated'
  );

-- Grant permissions
GRANT ALL ON public.pdf_user_preferences TO authenticated;
GRANT ALL ON public.pdf_custom_templates TO authenticated;
GRANT ALL ON public.pdf_documents TO authenticated;

-- Verification
SELECT 
  'PDF System' as component,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_user_preferences')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_custom_templates')  
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pdf_documents')
     AND EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'generated-pdfs')
    THEN 'READY ✅'
    ELSE 'NOT READY ❌'
  END as status;