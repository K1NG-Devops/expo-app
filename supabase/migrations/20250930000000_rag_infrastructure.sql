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
create extension if not exists vector;

-- Enable trigram extension for text search
create extension if not exists pg_trgm;

-- Enable pgcrypto for UUID generation
create extension if not exists pgcrypto;

-- ==============================================================================
-- PART 2: Storage Bucket Configuration
-- ==============================================================================

-- Create private attachments bucket
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false, -- private bucket
  52428800, -- 50MB limit
  array[
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
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ensure RLS is enabled on storage.objects
alter table storage.objects enable row level security;

-- ==============================================================================
-- PART 3: Storage RLS Policies
-- ==============================================================================

-- Drop existing policies if they exist
drop policy if exists "attachments_select_own_prefix" on storage.objects;
drop policy if exists "attachments_insert_own_prefix" on storage.objects;
drop policy if exists "attachments_update_own_prefix" on storage.objects;
drop policy if exists "attachments_delete_own_prefix" on storage.objects;

-- Policy: Users can SELECT their own files (path starts with their user_id)
create policy "attachments_select_own_prefix"
on storage.objects for select
using (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can INSERT files with their user_id as prefix
create policy "attachments_insert_own_prefix"
on storage.objects for insert
with check (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can UPDATE their own files
create policy "attachments_update_own_prefix"
on storage.objects for update
using (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- Policy: Users can DELETE their own files
create policy "attachments_delete_own_prefix"
on storage.objects for delete
using (
  bucket_id = 'attachments'
  and split_part(name, '/', 1) = auth.uid()::text
);

-- ==============================================================================
-- PART 4: Database Tables
-- ==============================================================================

-- Table: ai_attachments
-- Stores metadata about uploaded files
create table if not exists ai_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  bucket text not null default 'attachments',
  storage_path text not null unique,
  name text not null,
  mime_type text not null,
  size bigint not null default 0,
  sha256 text,
  kind text not null default 'other',
  status text not null default 'uploaded',
  page_count int,
  text_bytes int,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ai_attachments is 'Metadata for files uploaded to Dash AI conversations';
comment on column ai_attachments.status is 'Status: pending | uploading | uploaded | processing | ready | failed';
comment on column ai_attachments.kind is 'File kind: document | pdf | word | excel | powerpoint | text | markdown | csv | json | image | audio | other';

-- Table: rag_documents
-- Logical document per attachment for RAG
create table if not exists rag_documents (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references ai_attachments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  title text not null,
  language text,
  status text not null default 'processing',
  tokens int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table rag_documents is 'Logical documents derived from attachments for RAG processing';
comment on column rag_documents.status is 'Status: processing | ready | failed';

-- Table: rag_chunks
-- Text chunks with embeddings for semantic search
create table if not exists rag_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references rag_documents(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id text not null,
  attachment_id uuid not null references ai_attachments(id) on delete cascade,
  page int,
  chunk_index int not null,
  start_char int,
  end_char int,
  token_count int,
  content text not null,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at timestamptz not null default now()
);

comment on table rag_chunks is 'Text chunks with embeddings for semantic search';
comment on column rag_chunks.embedding is 'Vector embedding from OpenAI text-embedding-3-small (1536 dimensions)';

-- Table: rag_ingestion_logs
-- Logs for ingestion process observability
create table if not exists rag_ingestion_logs (
  id uuid primary key default gen_random_uuid(),
  attachment_id uuid references ai_attachments(id) on delete cascade,
  stage text not null,
  message text,
  level text not null default 'info',
  created_at timestamptz not null default now()
);

comment on table rag_ingestion_logs is 'Ingestion process logs for debugging and observability';
comment on column rag_ingestion_logs.level is 'Log level: info | warn | error';

-- ==============================================================================
-- PART 5: Indexes
-- ==============================================================================

-- Indexes for ai_attachments
create index if not exists idx_ai_attachments_user 
  on ai_attachments(user_id, conversation_id);

create index if not exists idx_ai_attachments_status 
  on ai_attachments(status) where status in ('processing', 'failed');

-- Indexes for rag_documents
create index if not exists idx_rag_documents_user 
  on rag_documents(user_id, conversation_id);

create index if not exists idx_rag_documents_attachment 
  on rag_documents(attachment_id);

-- Indexes for rag_chunks
create index if not exists idx_rag_chunks_doc 
  on rag_chunks(document_id, chunk_index);

create index if not exists idx_rag_chunks_user 
  on rag_chunks(user_id, conversation_id);

create index if not exists idx_rag_chunks_attachment 
  on rag_chunks(attachment_id);

-- Trigram index for text search
create index if not exists idx_rag_chunks_trgm 
  on rag_chunks using gin (content gin_trgm_ops);

-- Vector index for semantic search (ivfflat)
-- Note: This should be created after some data exists; adjust lists parameter based on data scale
-- For < 10k rows: lists = 100
-- For 10k-100k rows: lists = 500
-- For > 100k rows: lists = 1000
create index if not exists idx_rag_chunks_vec
  on rag_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Index for ingestion logs
create index if not exists idx_rag_ingestion_logs_attachment 
  on rag_ingestion_logs(attachment_id, created_at desc);

-- ==============================================================================
-- PART 6: Triggers and Functions
-- ==============================================================================

-- Function to update updated_at timestamp
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Trigger for ai_attachments
drop trigger if exists trg_ai_attachments_updated on ai_attachments;
create trigger trg_ai_attachments_updated 
  before update on ai_attachments
  for each row execute function set_updated_at();

-- Trigger for rag_documents
drop trigger if exists trg_rag_documents_updated on rag_documents;
create trigger trg_rag_documents_updated 
  before update on rag_documents
  for each row execute function set_updated_at();

-- ==============================================================================
-- PART 7: RLS Policies for Tables
-- ==============================================================================

-- Enable RLS on all tables
alter table ai_attachments enable row level security;
alter table rag_documents enable row level security;
alter table rag_chunks enable row level security;
alter table rag_ingestion_logs enable row level security;

-- RLS Policies for ai_attachments
drop policy if exists "ai_attachments_select_owner" on ai_attachments;
create policy "ai_attachments_select_owner"
  on ai_attachments for select
  using (user_id = auth.uid());

drop policy if exists "ai_attachments_insert_owner" on ai_attachments;
create policy "ai_attachments_insert_owner"
  on ai_attachments for insert
  with check (user_id = auth.uid());

drop policy if exists "ai_attachments_update_owner" on ai_attachments;
create policy "ai_attachments_update_owner"
  on ai_attachments for update
  using (user_id = auth.uid());

drop policy if exists "ai_attachments_delete_owner" on ai_attachments;
create policy "ai_attachments_delete_owner"
  on ai_attachments for delete
  using (user_id = auth.uid());

-- RLS Policies for rag_documents
drop policy if exists "rag_documents_select_owner" on rag_documents;
create policy "rag_documents_select_owner"
  on rag_documents for select
  using (user_id = auth.uid());

drop policy if exists "rag_documents_insert_owner" on rag_documents;
create policy "rag_documents_insert_owner"
  on rag_documents for insert
  with check (user_id = auth.uid());

drop policy if exists "rag_documents_update_owner" on rag_documents;
create policy "rag_documents_update_owner"
  on rag_documents for update
  using (user_id = auth.uid());

drop policy if exists "rag_documents_delete_owner" on rag_documents;
create policy "rag_documents_delete_owner"
  on rag_documents for delete
  using (user_id = auth.uid());

-- RLS Policies for rag_chunks
drop policy if exists "rag_chunks_select_owner" on rag_chunks;
create policy "rag_chunks_select_owner"
  on rag_chunks for select
  using (user_id = auth.uid());

drop policy if exists "rag_chunks_insert_owner" on rag_chunks;
create policy "rag_chunks_insert_owner"
  on rag_chunks for insert
  with check (user_id = auth.uid());

drop policy if exists "rag_chunks_update_owner" on rag_chunks;
create policy "rag_chunks_update_owner"
  on rag_chunks for update
  using (user_id = auth.uid());

drop policy if exists "rag_chunks_delete_owner" on rag_chunks;
create policy "rag_chunks_delete_owner"
  on rag_chunks for delete
  using (user_id = auth.uid());

-- RLS Policy for rag_ingestion_logs (read-only for users)
drop policy if exists "rag_ingestion_logs_select_owner" on rag_ingestion_logs;
create policy "rag_ingestion_logs_select_owner"
  on rag_ingestion_logs for select
  using (
    attachment_id in (
      select id from ai_attachments where user_id = auth.uid()
    )
  );

-- ==============================================================================
-- PART 8: RPC Function for Vector Search
-- ==============================================================================

-- Function to match RAG chunks using vector similarity
create or replace function match_rag_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_conversation_id text default null,
  filter_attachment_ids uuid[] default null,
  min_content_length int default 20
)
returns table (
  chunk_id uuid,
  document_id uuid,
  attachment_id uuid,
  content text,
  page int,
  chunk_index int,
  similarity double precision
)
language sql stable
as $$
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

comment on function match_rag_chunks is 'Semantic search for RAG chunks using cosine similarity';

-- ==============================================================================
-- Success Message
-- ==============================================================================

do $$
begin
  raise notice 'RAG infrastructure migration completed successfully!';
  raise notice 'Next steps:';
  raise notice '  1. Deploy edge functions (ingest-file, rag-search, rag-answer)';
  raise notice '  2. Set Supabase secrets (OPENAI_API_KEY, SUPABASE_SERVICE_ROLE_KEY)';
  raise notice '  3. Test file upload and ingestion';
end $$;