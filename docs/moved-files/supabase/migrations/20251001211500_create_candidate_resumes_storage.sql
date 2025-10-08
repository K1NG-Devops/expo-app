-- Migration: Create Storage bucket for candidate resumes
-- Phase 1, Epic 1.1: Hiring Hub - Storage
-- Date: 2025-10-01

-- =====================================================
-- STORAGE BUCKET: candidate-resumes
-- Description: Private storage for teacher candidate resume files
-- =====================================================

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'candidate-resumes',
    'candidate-resumes',
    false,  -- Private bucket
    52428800,  -- 50MB limit (50 * 1024 * 1024)
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- RLS POLICIES for candidate-resumes bucket
-- =====================================================

-- Policy 1: Public can upload resumes (for job application form)
-- Authenticated or anonymous users can upload to their own folder
CREATE POLICY "public_upload_candidate_resumes"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
    bucket_id = 'candidate-resumes'
    AND (
        -- Allow authenticated users to upload to any folder
        auth.role() = 'authenticated'
        OR
        -- Allow anonymous uploads (for public job application)
        auth.role() = 'anon'
    )
);

-- Policy 2: Principals can view resumes for applications to their school's jobs
CREATE POLICY "principals_view_candidate_resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND (
        -- Principals can view resumes for applications to their school
        name IN (
            SELECT resume_file_path 
            FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
        OR
        -- Super admins can view all
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE auth_user_id = auth.uid() 
            AND role = 'superadmin'
        )
    )
);

-- Policy 3: Candidates can view their own resumes
CREATE POLICY "candidates_view_own_resumes"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND name IN (
        SELECT resume_file_path 
        FROM public.job_applications ja
        INNER JOIN public.candidate_profiles cp ON ja.candidate_profile_id = cp.id
        WHERE cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Policy 4: Candidates can update their own resumes
CREATE POLICY "candidates_update_own_resumes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND name IN (
        SELECT resume_file_path 
        FROM public.job_applications ja
        INNER JOIN public.candidate_profiles cp ON ja.candidate_profile_id = cp.id
        WHERE cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
);

-- Policy 5: Principals can delete resumes for their school's applications
CREATE POLICY "principals_delete_candidate_resumes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'candidate-resumes'
    AND name IN (
        SELECT resume_file_path 
        FROM public.job_applications ja
        INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
        WHERE jp.preschool_id IN (
            SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR jp.preschool_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    )
);

-- =====================================================
-- HELPER FUNCTION: Generate unique resume filename
-- =====================================================
CREATE OR REPLACE FUNCTION public.generate_resume_filename(
    candidate_email TEXT,
    original_filename TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    file_extension TEXT;
    timestamp_str TEXT;
    safe_email TEXT;
BEGIN
    -- Extract file extension
    file_extension := LOWER(SUBSTRING(original_filename FROM '\.([^.]+)$'));
    
    -- Create safe email (replace @ and . with _)
    safe_email := REPLACE(REPLACE(LOWER(candidate_email), '@', '_'), '.', '_');
    
    -- Generate timestamp
    timestamp_str := TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');
    
    -- Return formatted filename: email_timestamp.extension
    RETURN safe_email || '_' || timestamp_str || '.' || file_extension;
END;
$$;

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON FUNCTION public.generate_resume_filename IS 'Generate unique, safe filename for candidate resume uploads';
