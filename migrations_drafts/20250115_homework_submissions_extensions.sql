-- Homework Submissions Extensions Migration
-- Strategic Parent Dashboard Features: Enhanced Homework Submission with Offline Support
-- Date: 2025-01-15
-- Purpose: Extend homework_submissions table for offline-first architecture and rich media support

-- ============================================================================
-- EXTEND EXISTING HOMEWORK_SUBMISSIONS TABLE
-- ============================================================================

-- Add new columns for parent dashboard homework features
ALTER TABLE public.homework_submissions
  ADD COLUMN IF NOT EXISTS submitted_via TEXT DEFAULT 'app' CHECK (submitted_via IN ('app','whatsapp','email')),
  ADD COLUMN IF NOT EXISTS submitted_offline BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb, -- [{type:'image', url:'...', name:'...', size:123}]
  ADD COLUMN IF NOT EXISTS voice_note_id UUID, -- Will reference voice_notes table
  ADD COLUMN IF NOT EXISTS submission_method TEXT DEFAULT 'in_app' CHECK (submission_method IN ('in_app','camera','gallery','files','whatsapp')),
  ADD COLUMN IF NOT EXISTS device_info JSONB, -- Platform, OS version, app version
  ADD COLUMN IF NOT EXISTS location_data JSONB, -- Optional location for context (with consent)
  ADD COLUMN IF NOT EXISTS offline_queued_at TIMESTAMPTZ, -- When submission was queued offline
  ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','failed','partial')),
  ADD COLUMN IF NOT EXISTS sync_attempts INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sync_error TEXT, -- Error details for failed syncs
  ADD COLUMN IF NOT EXISTS last_sync_attempt TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parent_notes TEXT, -- Optional notes from parent
  ADD COLUMN IF NOT EXISTS estimated_time_spent_mins INTEGER, -- Time tracking for engagement
  ADD COLUMN IF NOT EXISTS submission_quality_score DECIMAL(3,2); -- AI-assessed quality 0.00-1.00

-- Add foreign key constraint for voice_note_id (will be added after voice_notes table exists)
-- ALTER TABLE public.homework_submissions
--   ADD CONSTRAINT fk_homework_submissions_voice_note_id 
--   FOREIGN KEY (voice_note_id) REFERENCES public.voice_notes(id);

-- ============================================================================
-- OFFLINE HOMEWORK QUEUE TABLES
-- ============================================================================

-- Queue table for offline homework submissions (local storage backup)
CREATE TABLE IF NOT EXISTS public.offline_homework_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  
  -- Submission data (JSON to handle offline flexibility)
  submission_data JSONB NOT NULL, -- Complete submission payload
  media_files JSONB DEFAULT '[]'::jsonb, -- Array of local file paths/blobs
  voice_note_data JSONB, -- Voice note metadata and local path
  
  -- Queue management
  queue_status TEXT NOT NULL DEFAULT 'pending' CHECK (queue_status IN ('pending','processing','completed','failed','cancelled')),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest priority
  
  -- Error tracking
  last_error TEXT,
  error_count INTEGER DEFAULT 0,
  processing_started_at TIMESTAMPTZ,
  processing_completed_at TIMESTAMPTZ,
  
  -- Metadata
  original_created_at TIMESTAMPTZ NOT NULL, -- When originally created offline
  device_info JSONB,
  network_info JSONB -- Connection info when queued
);

-- Sync conflict resolution table
CREATE TABLE IF NOT EXISTS public.homework_sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  homework_submission_id UUID REFERENCES public.homework_submissions(id) ON DELETE CASCADE,
  offline_queue_id UUID REFERENCES public.offline_homework_queue(id) ON DELETE CASCADE,
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('duplicate','version_mismatch','data_corruption','network_timeout')),
  local_data JSONB, -- Local version data
  server_data JSONB, -- Server version data
  resolution_strategy TEXT CHECK (resolution_strategy IN ('use_local','use_server','merge','manual')),
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- ============================================================================
-- HOMEWORK SUBMISSION ANALYTICS
-- ============================================================================

-- Track homework submission patterns for insights
CREATE TABLE IF NOT EXISTS public.homework_submission_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submission_date DATE NOT NULL,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID NOT NULL REFERENCES public.homework_assignments(id) ON DELETE CASCADE,
  
  -- Submission metrics
  submission_time_mins INTEGER, -- Time from assignment to submission
  time_spent_on_homework_mins INTEGER, -- Estimated work time
  submission_method TEXT, -- How submitted (app, whatsapp, etc.)
  device_type TEXT, -- mobile, tablet, desktop
  platform TEXT, -- ios, android, web
  
  -- Quality metrics
  attachment_count INTEGER DEFAULT 0,
  has_voice_note BOOLEAN DEFAULT false,
  text_length INTEGER DEFAULT 0,
  submission_completeness DECIMAL(3,2), -- 0.00-1.00 score
  
  -- Timeliness metrics
  was_on_time BOOLEAN,
  days_early_late INTEGER, -- Negative = early, positive = late
  submission_window TEXT CHECK (submission_window IN ('early','on_time','late','very_late')),
  
  -- Engagement metrics
  parent_involvement_score DECIMAL(3,2), -- Based on notes, voice, effort
  revision_count INTEGER DEFAULT 0,
  help_requests INTEGER DEFAULT 0, -- AI help usage
  
  -- Outcome metrics
  grade_received DECIMAL(5,2),
  teacher_feedback_length INTEGER,
  positive_feedback BOOLEAN,
  needs_improvement BOOLEAN
);

-- ============================================================================
-- HOMEWORK ASSIGNMENT EXTENSIONS
-- ============================================================================

-- Extend homework_assignments table for enhanced parent features
ALTER TABLE public.homework_assignments
  ADD COLUMN IF NOT EXISTS allows_voice_notes BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_attachments INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] DEFAULT ARRAY['image/jpeg','image/png','application/pdf','text/plain'],
  ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS estimated_duration_mins INTEGER, -- Expected time to complete
  ADD COLUMN IF NOT EXISTS difficulty_level TEXT CHECK (difficulty_level IN ('easy','medium','hard')),
  ADD COLUMN IF NOT EXISTS parent_guidance_notes TEXT, -- Instructions for parents
  ADD COLUMN IF NOT EXISTS supports_offline BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_submission_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_help_allowed BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS collaboration_allowed BOOLEAN DEFAULT true; -- Parent-child collaboration

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Homework submissions indexes (new columns)
CREATE INDEX IF NOT EXISTS idx_homework_submissions_submitted_via ON public.homework_submissions (submitted_via, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_offline ON public.homework_submissions (submitted_offline, sync_status);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_voice_note ON public.homework_submissions (voice_note_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_sync_status ON public.homework_submissions (sync_status, last_sync_attempt);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_quality ON public.homework_submissions (submission_quality_score DESC, created_at DESC);

-- Offline queue indexes
CREATE INDEX IF NOT EXISTS idx_offline_homework_queue_user_id ON public.offline_homework_queue (user_id, queue_status);
CREATE INDEX IF NOT EXISTS idx_offline_homework_queue_status ON public.offline_homework_queue (queue_status, priority, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_offline_homework_queue_assignment ON public.offline_homework_queue (assignment_id, queue_status);
CREATE INDEX IF NOT EXISTS idx_offline_homework_queue_retry ON public.offline_homework_queue (next_retry_at, retry_count);

-- Sync conflicts indexes
CREATE INDEX IF NOT EXISTS idx_homework_sync_conflicts_submission ON public.homework_sync_conflicts (homework_submission_id);
CREATE INDEX IF NOT EXISTS idx_homework_sync_conflicts_unresolved ON public.homework_sync_conflicts (resolved_at) WHERE resolved_at IS NULL;

-- Analytics indexes
CREATE INDEX IF NOT EXISTS idx_homework_analytics_date ON public.homework_submission_analytics (submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_analytics_preschool ON public.homework_submission_analytics (preschool_id, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_analytics_student ON public.homework_submission_analytics (student_id, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_analytics_timeliness ON public.homework_submission_analytics (was_on_time, submission_date DESC);
CREATE INDEX IF NOT EXISTS idx_homework_analytics_quality ON public.homework_submission_analytics (submission_completeness DESC, parent_involvement_score DESC);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to create analytics record on homework submission
CREATE OR REPLACE FUNCTION create_homework_analytics()
RETURNS TRIGGER AS $$
DECLARE
  assignment_record public.homework_assignments;
  days_diff INTEGER;
  window_category TEXT;
  completeness_score DECIMAL(3,2);
  involvement_score DECIMAL(3,2);
BEGIN
  -- Get assignment details
  SELECT * INTO assignment_record
  FROM public.homework_assignments
  WHERE id = NEW.assignment_id;
  
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;
  
  -- Calculate timeliness
  days_diff := EXTRACT(EPOCH FROM (NEW.created_at - assignment_record.due_date)) / (24 * 3600);
  
  window_category := CASE
    WHEN days_diff <= -2 THEN 'early'
    WHEN days_diff <= 0 THEN 'on_time'
    WHEN days_diff <= 2 THEN 'late'
    ELSE 'very_late'
  END;
  
  -- Calculate completeness score (0.0-1.0)
  completeness_score := LEAST(1.0, 
    COALESCE(LENGTH(NEW.submission_text) / 100.0, 0) + -- Text content
    COALESCE(jsonb_array_length(NEW.attachments) / 3.0, 0) + -- Attachments
    CASE WHEN NEW.voice_note_id IS NOT NULL THEN 0.3 ELSE 0 END -- Voice note
  );
  
  -- Calculate parent involvement score (0.0-1.0)
  involvement_score := LEAST(1.0,
    CASE WHEN LENGTH(COALESCE(NEW.parent_notes, '')) > 10 THEN 0.3 ELSE 0 END +
    CASE WHEN NEW.voice_note_id IS NOT NULL THEN 0.4 ELSE 0 END +
    CASE WHEN jsonb_array_length(NEW.attachments) > 0 THEN 0.3 ELSE 0 END
  );
  
  -- Insert analytics record
  INSERT INTO public.homework_submission_analytics (
    submission_date,
    preschool_id,
    student_id,
    assignment_id,
    submission_method,
    device_type,
    platform,
    attachment_count,
    has_voice_note,
    text_length,
    submission_completeness,
    was_on_time,
    days_early_late,
    submission_window,
    parent_involvement_score,
    time_spent_on_homework_mins
  ) VALUES (
    NEW.created_at::date,
    NEW.preschool_id,
    NEW.student_id,
    NEW.assignment_id,
    NEW.submission_method,
    COALESCE((NEW.device_info->>'type')::text, 'unknown'),
    COALESCE((NEW.device_info->>'platform')::text, 'unknown'),
    COALESCE(jsonb_array_length(NEW.attachments), 0),
    NEW.voice_note_id IS NOT NULL,
    COALESCE(LENGTH(NEW.submission_text), 0),
    completeness_score,
    days_diff <= 0,
    days_diff,
    window_category,
    involvement_score,
    NEW.estimated_time_spent_mins
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for homework analytics
DROP TRIGGER IF EXISTS trigger_homework_submission_analytics ON public.homework_submissions;
CREATE TRIGGER trigger_homework_submission_analytics
  AFTER INSERT ON public.homework_submissions
  FOR EACH ROW EXECUTE FUNCTION create_homework_analytics();

-- Function to process offline homework queue
CREATE OR REPLACE FUNCTION process_offline_homework_queue()
RETURNS INTEGER AS $$
DECLARE
  queue_record public.offline_homework_queue;
  processed_count INTEGER := 0;
BEGIN
  -- Process pending items in priority order
  FOR queue_record IN
    SELECT * FROM public.offline_homework_queue
    WHERE queue_status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
    ORDER BY priority ASC, created_at ASC
    LIMIT 10
  LOOP
    BEGIN
      -- Mark as processing
      UPDATE public.offline_homework_queue
      SET queue_status = 'processing',
          processing_started_at = NOW(),
          updated_at = NOW()
      WHERE id = queue_record.id;
      
      -- Try to create homework submission from queue data
      INSERT INTO public.homework_submissions (
        preschool_id,
        assignment_id,
        student_id,
        submission_text,
        submitted_offline,
        sync_status,
        attachments,
        submission_method,
        device_info,
        parent_notes,
        estimated_time_spent_mins,
        created_at
      )
      SELECT 
        queue_record.preschool_id,
        queue_record.assignment_id,
        queue_record.student_id,
        queue_record.submission_data->>'submission_text',
        true,
        'synced',
        COALESCE(queue_record.submission_data->'attachments', '[]'::jsonb),
        COALESCE(queue_record.submission_data->>'submission_method', 'in_app'),
        queue_record.device_info,
        queue_record.submission_data->>'parent_notes',
        (queue_record.submission_data->>'estimated_time_spent_mins')::integer,
        queue_record.original_created_at;
      
      -- Mark as completed
      UPDATE public.offline_homework_queue
      SET queue_status = 'completed',
          processing_completed_at = NOW(),
          updated_at = NOW()
      WHERE id = queue_record.id;
      
      processed_count := processed_count + 1;
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle errors
      UPDATE public.offline_homework_queue
      SET queue_status = 'failed',
          last_error = SQLERRM,
          error_count = error_count + 1,
          retry_count = retry_count + 1,
          next_retry_at = NOW() + INTERVAL '1 hour' * power(2, retry_count), -- Exponential backoff
          updated_at = NOW()
      WHERE id = queue_record.id;
      
      -- Cancel if too many retries
      IF queue_record.retry_count >= queue_record.max_retries THEN
        UPDATE public.offline_homework_queue
        SET queue_status = 'cancelled'
        WHERE id = queue_record.id;
      END IF;
    END;
  END LOOP;
  
  RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to queue homework submission for offline processing
CREATE OR REPLACE FUNCTION queue_homework_submission(
  p_user_id UUID,
  p_assignment_id UUID,
  p_student_id UUID,
  p_submission_data JSONB,
  p_media_files JSONB DEFAULT '[]'::jsonb,
  p_priority INTEGER DEFAULT 5
)
RETURNS UUID AS $$
DECLARE
  queue_id UUID;
  preschool_id_val UUID;
BEGIN
  -- Get preschool_id from assignment
  SELECT preschool_id INTO preschool_id_val
  FROM public.homework_assignments
  WHERE id = p_assignment_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Assignment not found: %', p_assignment_id;
  END IF;
  
  -- Insert into queue
  INSERT INTO public.offline_homework_queue (
    user_id,
    preschool_id,
    assignment_id,
    student_id,
    submission_data,
    media_files,
    priority,
    original_created_at
  ) VALUES (
    p_user_id,
    preschool_id_val,
    p_assignment_id,
    p_student_id,
    p_submission_data,
    p_media_files,
    p_priority,
    NOW()
  ) RETURNING id INTO queue_id;
  
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.offline_homework_queue IS 'Queue for homework submissions created offline, enabling 60% offline completion target';
COMMENT ON TABLE public.homework_sync_conflicts IS 'Conflict resolution for homework submissions with offline-first architecture';
COMMENT ON TABLE public.homework_submission_analytics IS 'Analytics for homework patterns supporting 90%+ on-time submission KPI';

COMMENT ON COLUMN public.homework_submissions.submitted_offline IS 'Strategic offline-first flag for unreliable connectivity support';
COMMENT ON COLUMN public.homework_submissions.attachments IS 'Rich media attachments JSON: images, documents, voice notes';
COMMENT ON COLUMN public.homework_submissions.sync_status IS 'Synchronization status for offline-first architecture';
COMMENT ON COLUMN public.homework_submission_analytics.was_on_time IS 'KPI metric: 90%+ on-time submission rate target';
COMMENT ON COLUMN public.homework_submission_analytics.parent_involvement_score IS 'Engagement metric for parent participation tracking';