-- Migration: Add Geo-Location Support to Hiring Hub
-- Phase 1, Epic 1.1: Hiring Hub - Geo-Location Enhancement
-- Date: 2025-10-01
-- Purpose: Enable proximity-based job matching and distribution

-- =====================================================
-- ENABLE PostGIS Extension (for geo-spatial queries)
-- =====================================================
CREATE EXTENSION IF NOT EXISTS earthdistance CASCADE;
CREATE EXTENSION IF NOT EXISTS cube;

-- =====================================================
-- ADD GEO-LOCATION COLUMNS TO job_postings
-- =====================================================
ALTER TABLE public.job_postings 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS commute_radius_km INTEGER DEFAULT 20 CHECK (commute_radius_km >= 0 AND commute_radius_km <= 200);

-- Add comment for documentation
COMMENT ON COLUMN public.job_postings.latitude IS 'School latitude for proximity matching';
COMMENT ON COLUMN public.job_postings.longitude IS 'School longitude for proximity matching';
COMMENT ON COLUMN public.job_postings.commute_radius_km IS 'Maximum commute distance in kilometers';

-- Create spatial index for proximity searches
CREATE INDEX IF NOT EXISTS idx_job_postings_location 
ON public.job_postings USING GIST (
  ll_to_earth(latitude, longitude)
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'active';

-- =====================================================
-- ADD GEO-LOCATION COLUMNS TO candidate_profiles
-- =====================================================
ALTER TABLE public.candidate_profiles
ADD COLUMN IF NOT EXISTS preferred_location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS preferred_location_lng DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS willing_to_commute_km INTEGER DEFAULT 30 CHECK (willing_to_commute_km >= 0 AND willing_to_commute_km <= 200);

-- Add comment for documentation
COMMENT ON COLUMN public.candidate_profiles.preferred_location_lat IS 'Candidate preferred work location latitude';
COMMENT ON COLUMN public.candidate_profiles.preferred_location_lng IS 'Candidate preferred work location longitude';
COMMENT ON COLUMN public.candidate_profiles.willing_to_commute_km IS 'Maximum distance willing to commute in kilometers';

-- =====================================================
-- FUNCTION: Find Nearby Jobs for Candidate
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_nearby_jobs(
  candidate_lat DECIMAL,
  candidate_lng DECIMAL,
  max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  job_id UUID,
  title TEXT,
  school_name TEXT,
  distance_km DECIMAL,
  employment_type TEXT,
  salary_range_min DECIMAL,
  salary_range_max DECIMAL,
  location TEXT,
  created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    jp.id AS job_id,
    jp.title,
    p.name AS school_name,
    ROUND(
      earth_distance(
        ll_to_earth(jp.latitude, jp.longitude),
        ll_to_earth(candidate_lat, candidate_lng)
      ) / 1000, 1
    )::DECIMAL AS distance_km,
    jp.employment_type,
    jp.salary_range_min,
    jp.salary_range_max,
    jp.location,
    jp.created_at
  FROM public.job_postings jp
  INNER JOIN public.preschools p ON jp.preschool_id = p.id
  WHERE 
    jp.status = 'active'
    AND (jp.expires_at IS NULL OR jp.expires_at > NOW())
    AND jp.latitude IS NOT NULL
    AND jp.longitude IS NOT NULL
    AND earth_distance(
      ll_to_earth(jp.latitude, jp.longitude),
      ll_to_earth(candidate_lat, candidate_lng)
    ) <= (max_distance_km * 1000)
  ORDER BY distance_km ASC;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_jobs IS 'Find active job postings within specified distance from candidate location';

-- =====================================================
-- FUNCTION: Find Nearby Candidates for Job
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_nearby_candidates(
  job_id UUID,
  max_distance_km INTEGER DEFAULT 50
)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  candidate_email TEXT,
  distance_km DECIMAL,
  experience_years INTEGER,
  willing_to_commute_km INTEGER
) 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  job_lat DECIMAL;
  job_lng DECIMAL;
BEGIN
  -- Get job location
  SELECT latitude, longitude INTO job_lat, job_lng
  FROM public.job_postings
  WHERE id = job_id;
  
  -- Return candidates within radius who are willing to commute
  RETURN QUERY
  SELECT 
    cp.id AS candidate_id,
    CONCAT(cp.first_name, ' ', cp.last_name) AS candidate_name,
    cp.email AS candidate_email,
    ROUND(
      earth_distance(
        ll_to_earth(job_lat, job_lng),
        ll_to_earth(cp.preferred_location_lat, cp.preferred_location_lng)
      ) / 1000, 1
    )::DECIMAL AS distance_km,
    cp.experience_years,
    cp.willing_to_commute_km
  FROM public.candidate_profiles cp
  WHERE 
    cp.preferred_location_lat IS NOT NULL
    AND cp.preferred_location_lng IS NOT NULL
    AND earth_distance(
      ll_to_earth(job_lat, job_lng),
      ll_to_earth(cp.preferred_location_lat, cp.preferred_location_lng)
    ) <= (LEAST(max_distance_km, cp.willing_to_commute_km) * 1000)
  ORDER BY distance_km ASC;
END;
$$;

COMMENT ON FUNCTION public.get_nearby_candidates IS 'Find candidates within commute distance of a job posting';

-- =====================================================
-- TABLE: job_alerts (for push notifications)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_profile_id UUID NOT NULL REFERENCES public.candidate_profiles(id) ON DELETE CASCADE,
    preferred_locations TEXT[] DEFAULT ARRAY[]::TEXT[],
    max_commute_km INTEGER DEFAULT 30,
    employment_types TEXT[] DEFAULT ARRAY[]::TEXT[],
    min_salary DECIMAL(10, 2),
    notification_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_alert_per_candidate UNIQUE(candidate_profile_id)
);

-- Indexes
CREATE INDEX idx_job_alerts_candidate ON public.job_alerts(candidate_profile_id);
CREATE INDEX idx_job_alerts_enabled ON public.job_alerts(notification_enabled) WHERE notification_enabled = true;

-- RLS Policies
ALTER TABLE public.job_alerts ENABLE ROW LEVEL SECURITY;

-- Candidates can manage their own alerts
CREATE POLICY "candidates_manage_own_alerts"
    ON public.job_alerts
    FOR ALL
    USING (
        candidate_profile_id IN (
            SELECT id FROM public.candidate_profiles 
            WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER set_updated_at_job_alerts
    BEFORE UPDATE ON public.job_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_job_postings_updated_at();

COMMENT ON TABLE public.job_alerts IS 'Teacher job alert preferences for push notifications';

-- =====================================================
-- TABLE: job_distributions (track how job was shared)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.job_distributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_posting_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'sms', 'social_media', 'public_board')),
    recipients_count INTEGER DEFAULT 0,
    distributed_by UUID NOT NULL REFERENCES auth.users(id),
    distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes
CREATE INDEX idx_job_distributions_posting ON public.job_distributions(job_posting_id, distributed_at DESC);
CREATE INDEX idx_job_distributions_channel ON public.job_distributions(channel, distributed_at DESC);

-- RLS Policies
ALTER TABLE public.job_distributions ENABLE ROW LEVEL SECURITY;

-- Principals can view distributions for their school's jobs
CREATE POLICY "principals_view_job_distributions"
    ON public.job_distributions
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

-- Principals can create distributions for their school's jobs
CREATE POLICY "principals_create_job_distributions"
    ON public.job_distributions
    FOR INSERT
    WITH CHECK (
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

COMMENT ON TABLE public.job_distributions IS 'Track job posting distribution across channels';

-- =====================================================
-- FUNCTION: Calculate Distance Between Two Points
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DECIMAL,
  lng1 DECIMAL,
  lat2 DECIMAL,
  lng2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND(
    earth_distance(
      ll_to_earth(lat1, lng1),
      ll_to_earth(lat2, lng2)
    ) / 1000, 1
  );
END;
$$;

COMMENT ON FUNCTION public.calculate_distance_km IS 'Calculate distance in kilometers between two coordinates';

-- =====================================================
-- COMMENTS for documentation
-- =====================================================
COMMENT ON TABLE public.job_postings IS 'Job postings with geo-location for proximity matching';
COMMENT ON TABLE public.candidate_profiles IS 'Teacher candidate profiles with location preferences';
