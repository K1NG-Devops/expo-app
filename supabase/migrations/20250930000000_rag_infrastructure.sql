-- ==============================================================================
-- RAG Infrastructure Migration
-- ==============================================================================
-- Creates complete infrastructure for document attachment and RAG functionality
-- Including: storage bucket, tables, indexes, RLS policies, and helper functions
-- ==============================================================================

-- ==============================================================================
-- PART 1: Extensions
-- ==============================================================================

-- Enable vector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- PART 2: Storage Bucket Configuration
-- ==============================================================================

-- Create private attachments bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  FALSE, -- private bucket
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- PART 3: Storage RLS Policies
-- ==============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS attachments_select_own_prefix ON storage.objects;
DROP POLICY IF EXISTS attachments_insert_own_prefix ON storage.objects;
DROP POLICY IF EXISTS attachments_update_own_prefix ON storage.objects;
DROP POLICY IF EXISTS attachments_delete_own_prefix ON storage.objects;

-- Policy: Users can SELECT their own files (path starts with their user_id)
CREATE POLICY attachments_select_own_prefix
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can INSERT files with their user_id as prefix
CREATE POLICY attachments_insert_own_prefix
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can UPDATE their own files
CREATE POLICY attachments_update_own_prefix
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can DELETE their own files
CREATE POLICY attachments_delete_own_prefix
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- ==============================================================================
-- PART 4: Database Tables
-- ==============================================================================

-- Table: ai_attachments
-- Stores metadata about uploaded files
CREATE TABLE IF NOT EXISTS ai_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  bucket text NOT NULL DEFAULT 'attachments',
  storage_path text NOT NULL UNIQUE,
  name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL DEFAULT 0,
  sha256 text,
  kind text NOT NULL DEFAULT 'other',
  status text NOT NULL DEFAULT 'uploaded',
  page_count int,
  text_bytes int,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_attachments IS 'Metadata for files uploaded to Dash AI conversations';
COMMENT ON COLUMN ai_attachments.status IS 'Status: pending | uploading | uploaded | processing | ready | failed';
COMMENT ON COLUMN ai_attachments.kind IS 'File kind: document | pdf | word | excel | powerpoint | text | markdown | csv | json | image | audio | other';

-- Table: rag_documents
-- Logical document per attachment for RAG
CREATE TABLE IF NOT EXISTS rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL REFERENCES ai_attachments (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  title text NOT NULL,
  language text,
  status text NOT NULL DEFAULT 'processing',
  tokens int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rag_documents IS 'Logical documents derived from attachments for RAG processing';
COMMENT ON COLUMN rag_documents.status IS 'Status: processing | ready | failed';

-- Table: rag_chunks
-- Text chunks with embeddings for semantic search
CREATE TABLE IF NOT EXISTS rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES rag_documents (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  conversation_id text NOT NULL,
  attachment_id uuid NOT NULL REFERENCES ai_attachments (id) ON DELETE CASCADE,
  page int,
  chunk_index int NOT NULL,
  start_char int,
  end_char int,
  token_count int,
  content text NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rag_chunks IS 'Text chunks with embeddings for semantic search';
COMMENT ON COLUMN rag_chunks.embedding IS 'Vector embedding from OpenAI text-embedding-3-small (1536 dimensions)';

-- Table: rag_ingestion_logs
-- Logs for ingestion process observability
CREATE TABLE IF NOT EXISTS rag_ingestion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid REFERENCES ai_attachments (id) ON DELETE CASCADE,
  stage text NOT NULL,
  message text,
  level text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE rag_ingestion_logs IS 'Ingestion process logs for debugging and observability';
COMMENT ON COLUMN rag_ingestion_logs.level IS 'Log level: info | warn | error';

-- ==============================================================================
-- PART 5: Indexes
-- ==============================================================================

-- Indexes for ai_attachments
CREATE INDEX IF NOT EXISTS idx_ai_attachments_user
ON ai_attachments (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_ai_attachments_status
ON ai_attachments (status) WHERE status IN ('processing', 'failed');

-- Indexes for rag_documents
CREATE INDEX IF NOT EXISTS idx_rag_documents_user
ON rag_documents (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_rag_documents_attachment
ON rag_documents (attachment_id);

-- Indexes for rag_chunks
CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc
ON rag_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_user
ON rag_chunks (user_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_attachment
ON rag_chunks (attachment_id);

-- Trigram index for text search
CREATE INDEX IF NOT EXISTS idx_rag_chunks_trgm
ON rag_chunks USING gin (content gin_trgm_ops);

-- Vector index for semantic search (ivfflat)
-- Note: This should be created after some data exists; adjust lists parameter based on data scale
-- For < 10k rows: lists = 100
-- For 10k-100k rows: lists = 500
-- For > 100k rows: lists = 1000
CREATE INDEX IF NOT EXISTS idx_rag_chunks_vec
ON rag_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Index for ingestion logs
CREATE INDEX IF NOT EXISTS idx_rag_ingestion_logs_attachment
ON rag_ingestion_logs (attachment_id, created_at DESC);

-- ==============================================================================
-- PART 6: Triggers and Functions
-- ==============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for ai_attachments
DROP TRIGGER IF EXISTS trg_ai_attachments_updated ON ai_attachments;
CREATE TRIGGER trg_ai_attachments_updated
BEFORE UPDATE ON ai_attachments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Trigger for rag_documents
DROP TRIGGER IF EXISTS trg_rag_documents_updated ON rag_documents;
CREATE TRIGGER trg_rag_documents_updated
BEFORE UPDATE ON rag_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ==============================================================================
-- PART 7: RLS Policies for Tables
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE ai_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ai_attachments
DROP POLICY IF EXISTS ai_attachments_select_owner ON ai_attachments;
CREATE POLICY ai_attachments_select_owner
ON ai_attachments FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_attachments_insert_owner ON ai_attachments;
CREATE POLICY ai_attachments_insert_owner
ON ai_attachments FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_attachments_update_owner ON ai_attachments;
CREATE POLICY ai_attachments_update_owner
ON ai_attachments FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_attachments_delete_owner ON ai_attachments;
CREATE POLICY ai_attachments_delete_owner
ON ai_attachments FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for rag_documents
DROP POLICY IF EXISTS rag_documents_select_owner ON rag_documents;
CREATE POLICY rag_documents_select_owner
ON rag_documents FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS rag_documents_insert_owner ON rag_documents;
CREATE POLICY rag_documents_insert_owner
ON rag_documents FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rag_documents_update_owner ON rag_documents;
CREATE POLICY rag_documents_update_owner
ON rag_documents FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS rag_documents_delete_owner ON rag_documents;
CREATE POLICY rag_documents_delete_owner
ON rag_documents FOR DELETE
USING (user_id = auth.uid());

-- RLS Policies for rag_chunks
DROP POLICY IF EXISTS rag_chunks_select_owner ON rag_chunks;
CREATE POLICY rag_chunks_select_owner
ON rag_chunks FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS rag_chunks_insert_owner ON rag_chunks;
CREATE POLICY rag_chunks_insert_owner
ON rag_chunks FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS rag_chunks_update_owner ON rag_chunks;
CREATE POLICY rag_chunks_update_owner
ON rag_chunks FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS rag_chunks_delete_owner ON rag_chunks;
CREATE POLICY rag_chunks_delete_owner
ON rag_chunks FOR DELETE
USING (user_id = auth.uid());

-- RLS Policy for rag_ingestion_logs (read-only for users)
DROP POLICY IF EXISTS rag_ingestion_logs_select_owner ON rag_ingestion_logs;
CREATE POLICY rag_ingestion_logs_select_owner
ON rag_ingestion_logs FOR SELECT
USING (
  attachment_id IN (
    SELECT id FROM ai_attachments
    WHERE user_id = auth.uid()
  )
);

-- ==============================================================================
-- PART 8: RPC Function for Vector Search
-- ==============================================================================

-- Function to match RAG chunks using vector similarity
CREATE OR REPLACE FUNCTION match_rag_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_conversation_id text DEFAULT NULL,
  filter_attachment_ids uuid [] DEFAULT NULL,
  min_content_length int DEFAULT 20
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  attachment_id uuid,
  content text,
  page int,
  chunk_index int,
  similarity double precision
)
LANGUAGE sql STABLE
AS $$
  select
    c.id as chunk_id,
    c.document_id,
    c.attachment_id,
    c.content,
    c.page,
    c.chunk_index,
    1 - (c.embedding <#> query_embedding) as similarity
  from rag_chunks c
  where
    c.user_id = auth.uid()
    and (filter_conversation_id is null or c.conversation_id = filter_conversation_id)
    and (filter_attachment_ids is null or c.attachment_id = any(filter_attachment_ids))
    and length(c.content) >= min_content_length
  order by c.embedding <#> query_embedding
  limit match_count;
$$;

COMMENT ON FUNCTION match_rag_chunks IS 'Semantic search for RAG chunks using cosine similarity';

-- ==============================================================================
-- Success Message
-- ==============================================================================

DO $$
begin
  raise notice 'RAG infrastructure migration completed successfully!';
  raise notice 'Next steps:';
  raise notice '  1. Deploy edge functions (ingest-file, rag-search, rag-answer)';
  raise notice '  2. Set Supabase secrets (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY)';
  raise notice '  3. Test file upload and ingestion';
end $$;
