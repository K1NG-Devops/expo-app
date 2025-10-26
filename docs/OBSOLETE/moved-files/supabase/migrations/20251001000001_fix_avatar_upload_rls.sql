-- Fix Avatar Upload RLS Policy
-- Migration: 20251001000001_fix_avatar_upload_rls.sql
-- Fixes profile picture upload RLS violations by allowing users to upload with either their auth UID or database user ID

-- Drop existing avatar policies
DROP POLICY IF EXISTS avatars_upload_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_select_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_update_policy ON storage.objects;
DROP POLICY IF EXISTS avatars_delete_policy ON storage.objects;

-- Policy 1: Authenticated users can upload their own avatars (more flexible matching)
CREATE POLICY avatars_upload_policy ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    -- Allow filename with auth.uid()
    name LIKE (auth.uid()::text || '%')
    OR name LIKE ('profile_' || auth.uid()::text || '_%')
    -- Also check against users table for database user.id
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE
        users.auth_user_id = auth.uid()
        AND (
          users.name LIKE (users.id::text || '%')
          OR users.name LIKE ('profile_' || users.id::text || '_%')
        )
    )
  )
);

-- Policy 2: Anyone can view avatars (public bucket)
CREATE POLICY avatars_select_policy ON storage.objects
FOR SELECT
USING (
  bucket_id = 'avatars'
-- Public access for viewing profile pictures
);

-- Policy 3: Users can update their own avatars (more flexible matching)
CREATE POLICY avatars_update_policy ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    name LIKE (auth.uid()::text || '%')
    OR name LIKE ('profile_' || auth.uid()::text || '_%')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE
        users.auth_user_id = auth.uid()
        AND (
          users.name LIKE (users.id::text || '%')
          OR users.name LIKE ('profile_' || users.id::text || '_%')
        )
    )
  )
);

-- Policy 4: Users can delete their own avatars (more flexible matching)
CREATE POLICY avatars_delete_policy ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.role() = 'authenticated'
  AND (
    name LIKE (auth.uid()::text || '%')
    OR name LIKE ('profile_' || auth.uid()::text || '_%')
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE
        users.auth_user_id = auth.uid()
        AND (
          users.name LIKE (users.id::text || '%')
          OR users.name LIKE ('profile_' || users.id::text || '_%')
        )
    )
  )
);

-- Create comments for documentation
COMMENT ON POLICY avatars_upload_policy ON storage.objects IS 'Allow authenticated users to upload their own avatar files (matches both auth UID and database user ID)';
COMMENT ON POLICY avatars_select_policy ON storage.objects IS 'Allow public read access to avatar files';
COMMENT ON POLICY avatars_update_policy ON storage.objects IS 'Allow users to update their own avatar files (matches both auth UID and database user ID)';
COMMENT ON POLICY avatars_delete_policy ON storage.objects IS 'Allow users to delete their own avatar files (matches both auth UID and database user ID)';
