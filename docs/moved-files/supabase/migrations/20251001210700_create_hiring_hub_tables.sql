-- Migration: Create Hiring Hub tables for teacher recruitment
-- Phase 1, Epic 1.1: Hiring Hub
-- Date: 2025-10-01

-- =====================================================
-- TABLE: job_postings
-- Description: Job postings created by principals
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_postings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT,
    salary_range_min DECIMAL(10, 2),
    salary_range_max DECIMAL(10, 2),
    location TEXT,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    
    CONSTRAINT valid_salary_range CHECK (salary_range_min IS NULL OR salary_range_max IS NULL OR salary_range_min <= salary_range_max)
);

-- Indexes for performance
CREATE INDEX idx_job_postings_preschool_status ON public.job_postings(preschool_id, status, created_at DESC);
CREATE INDEX idx_job_postings_status ON public.job_postings(status) WHERE status = 'active';
CREATE INDEX idx_job_postings_expires ON public.job_postings(expires_at) WHERE expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Principals can view job postings for their school
CREATE POLICY "principals_view_own_school_job_postings"
    ON public.job_postings
    FOR SELECT
    USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR
        preschool_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Principals can create job postings for their school
CREATE POLICY "principals_create_job_postings"
    ON public.job_postings
    FOR INSERT
    WITH CHECK (
        preschool_id IN (
            SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR
        preschool_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Principals can update their own school's job postings
CREATE POLICY "principals_update_job_postings"
    ON public.job_postings
    FOR UPDATE
    USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR
        preschool_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Principals can delete their own school's job postings
CREATE POLICY "principals_delete_job_postings"
    ON public.job_postings
    FOR DELETE
    USING (
        preschool_id IN (
            SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
        )
        OR
        preschool_id IN (
            SELECT organization_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- Public can view active job postings (for application form)
CREATE POLICY "public_view_active_job_postings"
    ON public.job_postings
    FOR SELECT
    USING (status = 'active' AND (expires_at IS NULL OR expires_at > NOW()));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_job_postings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.job_postings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_job_postings_updated_at();

-- =====================================================
-- TABLE: candidate_profiles
-- Description: Teacher candidate information
-- =====================================================
CREATE TABLE IF NOT EXISTS public.candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    location TEXT,
    experience_years INTEGER DEFAULT 0,
    qualifications JSONB DEFAULT '[]'::jsonb,
    skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_candidate_profiles_email ON public.candidate_profiles(LOWER(email));
CREATE INDEX idx_candidate_profiles_location ON public.candidate_profiles(location) WHERE location IS NOT NULL;

-- RLS Policies
ALTER TABLE public.candidate_profiles ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own profile
CREATE POLICY "candidates_view_own_profile"
    ON public.candidate_profiles
    FOR SELECT
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Anyone can create a candidate profile (for public application form)
CREATE POLICY "public_create_candidate_profile"
    ON public.candidate_profiles
    FOR INSERT
    WITH CHECK (true);

-- Candidates can update their own profile
CREATE POLICY "candidates_update_own_profile"
    ON public.candidate_profiles
    FOR UPDATE
    USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- =====================================================
-- TABLE: job_applications
-- Description: Applications submitted by candidates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'under_review', 'shortlisted', 'interview_scheduled', 'offered', 'accepted', 'rejected')),
    cover_letter TEXT,
    resume_file_path TEXT,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    notes TEXT,
    
    CONSTRAINT unique_application_per_job UNIQUE(job_posting_id, candidate_profile_id)
);

-- Indexes
CREATE INDEX idx_job_applications_posting_status ON public.job_applications(job_posting_id, status, applied_at DESC);
CREATE INDEX idx_job_applications_candidate ON public.job_applications(candidate_profile_id, applied_at DESC);
CREATE INDEX idx_job_applications_status ON public.job_applications(status, applied_at DESC);

-- RLS Policies
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Principals can view applications for their school's job postings
CREATE POLICY "principals_view_applications"
    ON public.job_applications
    FOR SELECT
    USING (
        job_posting_id IN (
            SELECT id FROM public.job_postings
            WHERE preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Candidates can view their own applications
CREATE POLICY "candidates_view_own_applications"
    ON public.job_applications
    FOR SELECT
    USING (
        candidate_profile_id IN (
            SELECT id FROM public.candidate_profiles WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Public can create applications (for public application form)
CREATE POLICY "public_create_applications"
    ON public.job_applications
    FOR INSERT
    WITH CHECK (true);

-- Principals can update applications for their school's job postings
CREATE POLICY "principals_update_applications"
    ON public.job_applications
    FOR UPDATE
    USING (
        job_posting_id IN (
            SELECT id FROM public.job_postings
            WHERE preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- =====================================================
-- TABLE: interview_schedules
-- Description: Scheduled interviews for candidates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    scheduled_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    interview_date DATE NOT NULL,
    interview_time TIME NOT NULL,
    meeting_link TEXT,
    location TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_interview_schedules_application ON public.interview_schedules(application_id, interview_date DESC);
CREATE INDEX idx_interview_schedules_date ON public.interview_schedules(interview_date, interview_time) WHERE status = 'scheduled';

-- RLS Policies
ALTER TABLE public.interview_schedules ENABLE ROW LEVEL SECURITY;

-- Principals can view interviews for their school's applications
CREATE POLICY "principals_view_interviews"
    ON public.interview_schedules
    FOR SELECT
    USING (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Principals can create interviews
CREATE POLICY "principals_create_interviews"
    ON public.interview_schedules
    FOR INSERT
    WITH CHECK (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Principals can update interviews
CREATE POLICY "principals_update_interviews"
    ON public.interview_schedules
    FOR UPDATE
    USING (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
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
-- TABLE: offer_letters
-- Description: Job offers generated for candidates
-- =====================================================
CREATE TABLE IF NOT EXISTS public.offer_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
    salary_offered DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    employment_type TEXT NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'temporary')),
    terms JSONB DEFAULT '{}'::jsonb,
    generated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    
    CONSTRAINT one_offer_per_application UNIQUE(application_id)
);

-- Indexes
CREATE INDEX idx_offer_letters_application ON public.offer_letters(application_id);
CREATE INDEX idx_offer_letters_status ON public.offer_letters(status, generated_at DESC);

-- RLS Policies
ALTER TABLE public.offer_letters ENABLE ROW LEVEL SECURITY;

-- Principals can view offers for their school's applications
CREATE POLICY "principals_view_offers"
    ON public.offer_letters
    FOR SELECT
    USING (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Principals can create offers
CREATE POLICY "principals_create_offers"
    ON public.offer_letters
    FOR INSERT
    WITH CHECK (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Principals can update offers
CREATE POLICY "principals_update_offers"
    ON public.offer_letters
    FOR UPDATE
    USING (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.job_postings jp ON ja.job_posting_id = jp.id
            WHERE jp.preschool_id IN (
                SELECT preschool_id FROM public.users WHERE auth_user_id = auth.uid()
            )
            OR jp.preschool_id IN (
                SELECT organization_id FROM public.profiles WHERE id = auth.uid()
            )
        )
    );

-- Candidates can view and update their own offers (accept/decline)
CREATE POLICY "candidates_manage_own_offers"
    ON public.offer_letters
    FOR ALL
    USING (
        application_id IN (
            SELECT ja.id FROM public.job_applications ja
            INNER JOIN public.candidate_profiles cp ON ja.candidate_profile_id = cp.id
            WHERE cp.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE public.job_postings IS 'Job postings created by principals for teacher recruitment';
COMMENT ON TABLE public.candidate_profiles IS 'Teacher candidate profiles and qualifications';
COMMENT ON TABLE public.job_applications IS 'Applications submitted by candidates for job postings';
COMMENT ON TABLE public.interview_schedules IS 'Scheduled interviews for job candidates';
COMMENT ON TABLE public.offer_letters IS 'Job offers generated for successful candidates';
