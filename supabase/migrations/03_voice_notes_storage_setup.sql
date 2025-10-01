-- ================================================
-- Voice Notes Storage Setup
-- Create private bucket and RLS policies for voice recordings
-- ================================================

-- 1) Create private bucket for voice notes with 50MB size limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-notes',
  'voice-notes',
  FALSE,
  52428800,  -- 50MB limit
  ARRAY[
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/m4a',
    'audio/aac',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/aac', 'application/octet-stream'];

-- 2) Folder convention: voice-notes/{platform}/{user_id}/{filename}.m4a
-- Allow authenticated users to manage their own folder only

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "insert own voice note" ON storage.objects;
DROP POLICY IF EXISTS "select own voice note" ON storage.objects;
DROP POLICY IF EXISTS "update own voice note" ON storage.objects;
DROP POLICY IF EXISTS "delete own voice note" ON storage.objects;

-- Policy for inserting own voice note files
CREATE POLICY "insert own voice note"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (
    -- Allow platform/user_id/filename structure
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Allow direct user_id/filename structure (fallback)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy for selecting own voice note files
CREATE POLICY "select own voice note"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    -- Allow platform/user_id/filename structure
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Allow direct user_id/filename structure (fallback)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy for updating own voice note files
CREATE POLICY "update own voice note"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    -- Allow platform/user_id/filename structure
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Allow direct user_id/filename structure (fallback)
    (storage.foldername(name))[1] = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'voice-notes'
  AND (
    -- Allow platform/user_id/filename structure
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Allow direct user_id/filename structure (fallback)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy for deleting own voice note files
CREATE POLICY "delete own voice note"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-notes'
  AND (
    -- Allow platform/user_id/filename structure
    (storage.foldername(name))[2] = auth.uid()::text
    OR
    -- Allow direct user_id/filename structure (fallback)
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 3) Create helper function for generating signed URLs for voice notes
CREATE OR REPLACE FUNCTION get_voice_note_signed_url(file_path text, expires_in integer DEFAULT 3600)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  signed_url TEXT;
  user_id_in_path TEXT;
BEGIN
  -- Extract user ID from path (support both platform/user_id/file and user_id/file formats)
  user_id_in_path := COALESCE((storage.foldername(file_path))[2], (storage.foldername(file_path))[1]);
  
  -- Only allow users to get signed URLs for their own voice notes
  IF NOT user_id_in_path = auth.uid()::text THEN
    RAISE EXCEPTION 'Access denied: can only access own voice notes';
  END IF;
  
  -- Generate signed URL
  SELECT storage.get_signed_url('voice-notes', file_path, expires_in) INTO signed_url;
  
  RETURN signed_url;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_voice_note_signed_url IS 'Helper function to generate signed URLs for user voice notes with access control';

-- 4) Optional: Create cleanup function to remove old voice notes (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_voice_notes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER := 0;
  old_file RECORD;
BEGIN
  -- Find and delete voice note files older than 30 days
  FOR old_file IN
    SELECT name
    FROM storage.objects 
    WHERE bucket_id = 'voice-notes' 
    AND created_at < NOW() - INTERVAL '30 days'
  LOOP
    -- Delete the file
    DELETE FROM storage.objects 
    WHERE bucket_id = 'voice-notes' AND name = old_file.name;
    
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_voice_notes IS 'Cleanup function to remove voice notes older than 30 days';
