-- =====================================================================
-- EduDash Pro: Storage Buckets and Policies for Parent Dashboard
-- File: 20250115_storage_buckets_and_policies.sql
-- 
-- Purpose: Create Supabase Storage buckets and configure secure policies
-- for voice notes, homework submissions, and message media attachments
-- =====================================================================

-- Enable storage extension (already enabled in most Supabase projects)
CREATE EXTENSION IF NOT EXISTS "storage" WITH SCHEMA "storage";

-- =====================================================================
-- 1. CREATE STORAGE BUCKETS
-- =====================================================================

-- Voice Notes Bucket
-- Store audio recordings from parents and teachers in conversations
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'voice-notes',
    'voice-notes',
    false, -- Private bucket
    10485760, -- 10MB limit per file
    ARRAY[
        'audio/mpeg',
        'audio/mp4',
        'audio/wav', 
        'audio/m4a',
        'audio/webm',
        'audio/ogg'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Homework Submissions Bucket
-- Store photos, documents, and other attachments for homework submissions
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'homework-submissions',
    'homework-submissions', 
    false, -- Private bucket
    52428800, -- 50MB limit per file
    ARRAY[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'video/mp4',
        'video/quicktime'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Message Media Bucket  
-- Store images, documents shared in parent-teacher messaging
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'message-media',
    'message-media',
    false, -- Private bucket
    26214400, -- 25MB limit per file
    ARRAY[
        'image/jpeg',
        'image/png', 
        'image/webp',
        'image/gif',
        'application/pdf',
        'text/plain',
        'video/mp4',
        'video/quicktime'
    ]
) ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =====================================================================
-- 2. HELPER FUNCTIONS FOR STORAGE POLICIES
-- =====================================================================

-- Helper function to extract preschool_id from file path
-- Expected path format: preschool_{uuid}/users/{auth_uid}/filename.ext
CREATE OR REPLACE FUNCTION public.extract_preschool_id_from_path(file_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Extract preschool_id from path like: preschool_123e4567-e89b-12d3-a456-426614174000/...
    RETURN (
        SELECT regexp_replace(
            split_part(file_path, '/', 1), 
            '^preschool_', 
            ''
        )::uuid
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

-- Helper function to check if user belongs to preschool extracted from path
CREATE OR REPLACE FUNCTION public.user_can_access_path(file_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    path_preschool_id uuid;
    user_preschool_id uuid;
    user_role text;
BEGIN
    -- Extract preschool ID from path
    path_preschool_id := public.extract_preschool_id_from_path(file_path);
    
    IF path_preschool_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get user's preschool and role
    SELECT p.preschool_id, p.role 
    INTO user_preschool_id, user_role
    FROM public.profiles p 
    WHERE p.id = auth.uid();
    
    -- Super admin can access everything
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- User must belong to same preschool as the file path
    RETURN user_preschool_id = path_preschool_id;
END;
$$;

-- Helper function to check if user can access files for a specific student
CREATE OR REPLACE FUNCTION public.user_can_access_student_files(student_id_param uuid, file_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role text;
    user_preschool_id uuid;
    student_preschool_id uuid;
    is_students_parent boolean := false;
    is_students_teacher boolean := false;
BEGIN
    -- Get user role and preschool
    SELECT p.role, p.preschool_id
    INTO user_role, user_preschool_id
    FROM public.profiles p
    WHERE p.id = auth.uid();
    
    -- Super admin can access everything
    IF user_role = 'super_admin' THEN
        RETURN true;
    END IF;
    
    -- Get student's preschool
    SELECT s.preschool_id 
    INTO student_preschool_id
    FROM public.students s 
    WHERE s.id = student_id_param;
    
    -- Must be in same preschool
    IF user_preschool_id != student_preschool_id THEN
        RETURN false;
    END IF;
    
    -- Check basic path access
    IF NOT public.user_can_access_path(file_path) THEN
        RETURN false;
    END IF;
    
    -- Role-specific checks
    CASE user_role
        WHEN 'parent' THEN
            -- Parent can only access their own child's files
            SELECT EXISTS(
                SELECT 1 FROM public.students s 
                WHERE s.id = student_id_param 
                AND (s.parent_id = auth.uid() OR s.guardian_id = auth.uid())
            ) INTO is_students_parent;
            RETURN is_students_parent;
            
        WHEN 'teacher' THEN
            -- Teacher can access files for students in their classes
            SELECT EXISTS(
                SELECT 1 FROM public.students s
                JOIN public.classes c ON s.class_id = c.id
                WHERE s.id = student_id_param 
                AND c.teacher_id = auth.uid()
            ) INTO is_students_teacher;
            RETURN is_students_teacher;
            
        WHEN 'principal_admin' THEN
            -- Principal can access all files in their preschool
            RETURN true;
            
        ELSE
            RETURN false;
    END CASE;
END;
$$;

-- =====================================================================
-- 3. VOICE NOTES BUCKET POLICIES
-- =====================================================================

-- Policy: Users can upload voice notes to their preschool path
CREATE POLICY "voice_notes_upload_policy" ON storage.objects
FOR INSERT TO authenticated 
WITH CHECK (
    bucket_id = 'voice-notes' 
    AND public.user_can_access_path(name)
    AND name ~ '^preschool_[a-f0-9-]+/users/[a-f0-9-]+/.*\.(mp3|m4a|wav|webm|ogg)$'
);

-- Policy: Users can read voice notes they have access to
CREATE POLICY "voice_notes_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'voice-notes'
    AND (
        -- Can access own files (path contains their auth.uid())
        name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
        -- OR can access via student relationship
        OR EXISTS (
            SELECT 1 FROM public.voice_notes vn
            WHERE vn.storage_path = name
            AND (
                vn.created_by = auth.uid()
                OR public.user_can_access_student_files(vn.created_for_student_id, name)
            )
        )
        -- OR can access based on message thread participation
        OR EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.message_threads mt ON m.thread_id = mt.id
            JOIN public.voice_notes vn ON m.voice_note_id = vn.id
            WHERE vn.storage_path = name
            AND (mt.parent_id = auth.uid() OR mt.teacher_id = auth.uid())
        )
    )
);

-- Policy: Users can update/delete their own voice notes
CREATE POLICY "voice_notes_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'voice-notes'
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

CREATE POLICY "voice_notes_delete_policy" ON storage.objects  
FOR DELETE TO authenticated
USING (
    bucket_id = 'voice-notes'
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

-- =====================================================================
-- 4. HOMEWORK SUBMISSIONS BUCKET POLICIES  
-- =====================================================================

-- Policy: Parents can upload homework submissions for their children
CREATE POLICY "homework_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'homework-submissions'
    AND public.user_can_access_path(name)
    AND (
        -- Parents uploading for their students
        (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'parent'
        AND name ~ '^preschool_[a-f0-9-]+/users/[a-f0-9-]+/students/[a-f0-9-]+/.*'
        AND EXISTS (
            SELECT 1 FROM public.students s
            WHERE s.id = (
                SELECT regexp_replace(
                    split_part(name, '/', 4), 
                    '^', ''
                )::uuid
            )
            AND (s.parent_id = auth.uid() OR s.guardian_id = auth.uid())
        )
    )
);

-- Policy: Parents and teachers can read homework submissions they have access to
CREATE POLICY "homework_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'homework-submissions'
    AND (
        -- Own files
        name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
        -- OR files for students they can access
        OR EXISTS (
            SELECT 1 FROM public.homework_submissions hs
            WHERE hs.attachments::text LIKE '%' || name || '%'
            AND (
                -- Parent accessing their child's submissions
                EXISTS (
                    SELECT 1 FROM public.students s
                    WHERE s.id = hs.student_id
                    AND (s.parent_id = auth.uid() OR s.guardian_id = auth.uid())
                )
                -- Teacher accessing submissions from their classes
                OR EXISTS (
                    SELECT 1 FROM public.students s
                    JOIN public.classes c ON s.class_id = c.id
                    WHERE s.id = hs.student_id
                    AND c.teacher_id = auth.uid()
                )
                -- Principal accessing submissions in their preschool
                OR (
                    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'principal_admin'
                    AND EXISTS (
                        SELECT 1 FROM public.students s
                        WHERE s.id = hs.student_id
                        AND s.preschool_id = (SELECT preschool_id FROM public.profiles WHERE id = auth.uid())
                    )
                )
            )
        )
    )
);

-- Policy: Users can update their own homework files
CREATE POLICY "homework_update_policy" ON storage.objects
FOR UPDATE TO authenticated  
USING (
    bucket_id = 'homework-submissions'
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

CREATE POLICY "homework_delete_policy" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'homework-submissions' 
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

-- =====================================================================
-- 5. MESSAGE MEDIA BUCKET POLICIES
-- =====================================================================

-- Policy: Users can upload media to message threads they participate in
CREATE POLICY "message_media_upload_policy" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'message-media'
    AND public.user_can_access_path(name)
    AND name ~ '^preschool_[a-f0-9-]+/users/[a-f0-9-]+/messages/.*'
);

-- Policy: Users can read media from message threads they participate in  
CREATE POLICY "message_media_select_policy" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'message-media'
    AND (
        -- Own files
        name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
        -- OR files from message threads they participate in
        OR EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.message_threads mt ON m.thread_id = mt.id
            WHERE m.media_url LIKE '%' || name || '%'
            AND (mt.parent_id = auth.uid() OR mt.teacher_id = auth.uid())
        )
        -- OR principal accessing messages in their preschool
        OR (
            (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'principal_admin'
            AND EXISTS (
                SELECT 1 FROM public.messages m
                JOIN public.message_threads mt ON m.thread_id = mt.id
                WHERE m.media_url LIKE '%' || name || '%'
                AND mt.preschool_id = (SELECT preschool_id FROM public.profiles WHERE id = auth.uid())
            )
        )
    )
);

-- Policy: Users can update/delete their own message media
CREATE POLICY "message_media_update_policy" ON storage.objects
FOR UPDATE TO authenticated
USING (
    bucket_id = 'message-media'
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

CREATE POLICY "message_media_delete_policy" ON storage.objects
FOR DELETE TO authenticated  
USING (
    bucket_id = 'message-media'
    AND name ~ ('^preschool_[a-f0-9-]+/users/' || auth.uid()::text || '/.*')
);

-- =====================================================================
-- 6. SUPER ADMIN BYPASS POLICIES
-- =====================================================================

-- Super admin can access all buckets for platform management
CREATE POLICY "super_admin_all_access" ON storage.objects
FOR ALL TO authenticated
USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
)
WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'  
);

-- =====================================================================
-- 7. UTILITY FUNCTIONS FOR SIGNED URLS
-- =====================================================================

-- Function to generate signed URL with proper permissions check
CREATE OR REPLACE FUNCTION public.get_signed_url(
    bucket_name text,
    file_path text,
    expires_in integer DEFAULT 3600 -- 1 hour default
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    signed_url text;
BEGIN
    -- Check if user can access this file based on bucket policies
    -- This relies on RLS policies being properly configured
    IF NOT EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = bucket_name AND name = file_path
    ) THEN
        RAISE EXCEPTION 'File not found or access denied';
    END IF;
    
    -- Generate signed URL (this would use Supabase storage API in practice)
    -- For now, return a placeholder that includes the file path
    signed_url := format(
        'https://your-project.supabase.co/storage/v1/object/sign/%s/%s?token=temp_token&expires=%s',
        bucket_name,
        file_path,
        (extract(epoch from now()) + expires_in)::bigint
    );
    
    RETURN signed_url;
END;
$$;

-- =====================================================================
-- 8. AUDIT LOG ENTRY
-- =====================================================================

-- Log the storage setup completion
INSERT INTO public.parent_engagement_events (
    preschool_id,
    parent_id,
    event_type,
    metadata
) VALUES (
    NULL, -- System event
    NULL, -- System event  
    'storage_buckets_deployed',
    jsonb_build_object(
        'buckets_created', ARRAY['voice-notes', 'homework-submissions', 'message-media'],
        'policies_count', 15,
        'deployed_at', NOW()
    )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_storage_objects_bucket_name ON storage.objects(bucket_id, name);

-- =====================================================================
-- 9. GRANTS AND PERMISSIONS
-- =====================================================================

-- Grant necessary permissions for storage operations
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.extract_preschool_id_from_path(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_access_path(text) TO authenticated;  
GRANT EXECUTE ON FUNCTION public.user_can_access_student_files(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_signed_url(text, text, integer) TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

COMMENT ON SCHEMA storage IS 'EduDash Pro storage buckets and policies configured for parent dashboard features';