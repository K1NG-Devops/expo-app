-- Progress Metrics Migration
-- Strategic Parent Dashboard Features: Student Progress Tracking and AI Insights
-- Date: 2025-01-15
-- Purpose: Implement comprehensive student progress tracking with AI-generated insights per roadmap

-- ============================================================================
-- STUDENT PROGRESS METRICS SYSTEM
-- ============================================================================

-- Core student progress metrics (supports strategic KPI: 80% show measurable improvement)
CREATE TABLE IF NOT EXISTS public.student_progress_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  
  -- Subject-based tracking
  subject TEXT NOT NULL CHECK (subject IN ('literacy','numeracy','life_skills','creative_arts','physical_development','social_emotional')),
  skill_area TEXT, -- Specific skill within subject e.g., 'phonics', 'counting', 'fine_motor'
  
  -- Progress scoring (0.00-100.00)
  baseline_score DECIMAL(5,2), -- Initial assessment score
  current_score DECIMAL(5,2) NOT NULL, -- Current performance score
  previous_score DECIMAL(5,2), -- Previous period score for comparison
  progress_index DECIMAL(6,3), -- Computed progress rate (-1.000 to +1.000)
  
  -- Assessment context
  assessment_type TEXT CHECK (assessment_type IN ('homework','quiz','observation','project','peer_assessment','self_assessment')),
  assessment_method TEXT CHECK (assessment_method IN ('ai_graded','teacher_graded','parent_reported','automatic')),
  confidence_level DECIMAL(3,2) DEFAULT 1.00, -- Assessment confidence (0.00-1.00)
  
  -- Benchmarking
  grade_level_benchmark DECIMAL(5,2), -- Expected score for grade level
  peer_percentile INTEGER CHECK (peer_percentile BETWEEN 1 AND 100), -- Position relative to peers
  national_percentile INTEGER CHECK (national_percentile BETWEEN 1 AND 100), -- National comparison
  
  -- Engagement metrics
  completion_rate DECIMAL(3,2), -- Assignment completion rate for period
  time_on_task_mins INTEGER, -- Average time spent on subject
  help_requests INTEGER DEFAULT 0, -- Number of AI help requests
  parent_involvement_score DECIMAL(3,2), -- Parent engagement level
  
  -- Metadata
  assessment_data JSONB, -- Detailed assessment results
  notes TEXT, -- Teacher/AI observations
  tags TEXT[], -- Categorization tags
  
  -- Ensure one record per student-subject-date
  UNIQUE (student_id, subject, metric_date)
);

-- AI-generated student progress insights and recommendations
CREATE TABLE IF NOT EXISTS public.student_progress_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  
  -- Time period for analysis
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- AI-generated content
  ai_summary TEXT NOT NULL, -- Natural language progress summary
  recommendations TEXT NOT NULL, -- Specific improvement recommendations
  strengths TEXT[], -- Identified strengths
  areas_for_improvement TEXT[], -- Areas needing attention
  suggested_activities TEXT[], -- Recommended learning activities
  
  -- Insight metadata
  insight_type TEXT DEFAULT 'periodic' CHECK (insight_type IN ('periodic','milestone','alert','improvement','decline')),
  confidence_score DECIMAL(3,2) DEFAULT 0.85, -- AI confidence in analysis (0.00-1.00)
  model_version TEXT DEFAULT 'claude-3-haiku', -- AI model used for generation
  processing_cost_usd DECIMAL(6,4) DEFAULT 0.0000, -- Track AI costs
  
  -- Parent-facing summary
  parent_summary TEXT, -- Simplified summary for parents
  parent_action_items TEXT[], -- Specific actions parents can take
  celebration_moments TEXT[], -- Achievements to celebrate
  
  -- Tracking and flags
  is_shared_with_parent BOOLEAN DEFAULT false,
  parent_read_at TIMESTAMPTZ,
  teacher_approved BOOLEAN DEFAULT false,
  teacher_notes TEXT,
  requires_intervention BOOLEAN DEFAULT false,
  intervention_type TEXT CHECK (intervention_type IN ('academic','behavioral','social','emotional','physical')),
  
  -- Multi-language support
  language TEXT DEFAULT 'en' CHECK (language IN ('en','af','zu','st')),
  translated_summaries JSONB -- {"af": "...", "zu": "...", "st": "..."}
);

-- Learning milestones and achievements tracking
CREATE TABLE IF NOT EXISTS public.student_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  
  -- Milestone details
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('academic','behavioral','social','creative','physical')),
  milestone_name TEXT NOT NULL, -- e.g., "First complete sentence", "Counts to 20"
  description TEXT,
  subject TEXT CHECK (subject IN ('literacy','numeracy','life_skills','creative_arts','physical_development','social_emotional')),
  
  -- Achievement tracking
  achieved_at TIMESTAMPTZ NOT NULL,
  recorded_by UUID NOT NULL REFERENCES auth.users(id), -- Teacher or parent who recorded
  evidence_type TEXT CHECK (evidence_type IN ('homework','observation','video','photo','assessment')),
  evidence_url TEXT, -- Link to supporting media
  
  -- Developmental context
  typical_age_months INTEGER, -- Typical age for milestone in months
  student_age_months INTEGER, -- Student's age when achieved
  early_late_indicator TEXT CHECK (early_late_indicator IN ('early','typical','late')),
  
  -- Social sharing
  is_shareable BOOLEAN DEFAULT true,
  shared_with_parent BOOLEAN DEFAULT true,
  parent_reaction TEXT, -- Parent's response/celebration
  
  -- Metadata
  milestone_category TEXT, -- Fine categorization
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
  related_milestones UUID[], -- Array of related milestone IDs
  tags TEXT[]
);

-- ============================================================================
-- PROGRESS ANALYTICS AND AGGREGATIONS
-- ============================================================================

-- Daily/Weekly/Monthly progress aggregations for dashboards
CREATE TABLE IF NOT EXISTS public.progress_summary_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Scope and time period
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE, -- NULL for school-wide stats
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  summary_date DATE NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('daily','weekly','monthly','quarterly','annual')),
  
  -- Aggregate metrics
  total_assessments INTEGER DEFAULT 0,
  average_score DECIMAL(5,2),
  improvement_rate DECIMAL(4,3), -- -1.000 to +1.000
  completion_rate DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Subject breakdown (JSONB for flexibility)
  subject_scores JSONB, -- {"literacy": 85.5, "numeracy": 78.2, ...}
  subject_improvements JSONB, -- {"literacy": 0.15, "numeracy": -0.03, ...}
  
  -- Engagement metrics
  avg_time_on_task_mins INTEGER,
  total_help_requests INTEGER DEFAULT 0,
  parent_engagement_score DECIMAL(3,2),
  
  -- Benchmarking
  grade_level_performance DECIMAL(3,2), -- Performance vs expected (0.00-2.00, 1.00 = on track)
  peer_ranking_percentile INTEGER,
  
  -- KPI tracking (strategic roadmap metrics)
  students_showing_improvement INTEGER DEFAULT 0, -- For 80% improvement KPI
  on_time_submission_rate DECIMAL(3,2), -- For 90% on-time submission KPI
  parent_response_rate DECIMAL(3,2), -- For 80% response rate KPI
  
  -- Additional context
  notable_achievements TEXT[],
  areas_of_concern TEXT[],
  recommended_actions TEXT[],
  
  UNIQUE (preschool_id, COALESCE(student_id, '00000000-0000-0000-0000-000000000000'::uuid), summary_date, period_type)
);

-- ============================================================================
-- CAPS CURRICULUM ALIGNMENT (SA SPECIFIC)
-- ============================================================================

-- CAPS (Curriculum and Assessment Policy Statement) alignment tracking
CREATE TABLE IF NOT EXISTS public.caps_curriculum_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  
  -- CAPS specific fields
  caps_subject TEXT NOT NULL, -- 'home_language', 'first_additional_language', 'mathematics', 'life_skills'
  caps_grade TEXT NOT NULL CHECK (caps_grade IN ('grade_r','grade_1','grade_2','grade_3')),
  caps_term INTEGER CHECK (caps_term BETWEEN 1 AND 4),
  caps_week INTEGER CHECK (caps_week BETWEEN 1 AND 10), -- Term weeks
  
  -- Learning programme details
  learning_programme TEXT, -- Specific CAPS learning programme
  learning_outcome TEXT, -- Expected learning outcome
  assessment_standard TEXT, -- CAPS assessment standard
  
  -- Progress tracking
  proficiency_level TEXT CHECK (proficiency_level IN ('not_achieved','developing','competent','outstanding')),
  evidence_collected BOOLEAN DEFAULT false,
  moderation_status TEXT CHECK (moderation_status IN ('pending','approved','requires_revision')),
  
  -- Assessment details
  formal_assessment BOOLEAN DEFAULT false,
  informal_assessment BOOLEAN DEFAULT false,
  assessment_date DATE,
  assessment_score DECIMAL(5,2),
  teacher_comments TEXT,
  
  -- Reporting requirements
  ready_for_report BOOLEAN DEFAULT false,
  included_in_report BOOLEAN DEFAULT false,
  report_comment TEXT,
  
  UNIQUE (student_id, caps_subject, caps_grade, caps_term, learning_programme)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Student progress metrics indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_metrics_student_id ON public.student_progress_metrics (student_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_metrics_preschool_id ON public.student_progress_metrics (preschool_id, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_metrics_subject ON public.student_progress_metrics (subject, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_metrics_improvement ON public.student_progress_metrics (progress_index DESC, metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_metrics_assessment ON public.student_progress_metrics (assessment_type, assessment_method);

-- Student progress insights indexes
CREATE INDEX IF NOT EXISTS idx_student_progress_insights_student_id ON public.student_progress_insights (student_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_insights_preschool_id ON public.student_progress_insights (preschool_id, analysis_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_progress_insights_period ON public.student_progress_insights (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_student_progress_insights_shared ON public.student_progress_insights (is_shared_with_parent, parent_read_at);
CREATE INDEX IF NOT EXISTS idx_student_progress_insights_intervention ON public.student_progress_insights (requires_intervention, intervention_type);

-- Student milestones indexes
CREATE INDEX IF NOT EXISTS idx_student_milestones_student_id ON public.student_milestones (student_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_milestones_preschool_id ON public.student_milestones (preschool_id, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_milestones_type ON public.student_milestones (milestone_type, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_milestones_subject ON public.student_milestones (subject, achieved_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_milestones_shareable ON public.student_milestones (is_shareable, shared_with_parent);

-- Progress summary stats indexes
CREATE INDEX IF NOT EXISTS idx_progress_summary_preschool_date ON public.progress_summary_stats (preschool_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_summary_student_date ON public.progress_summary_stats (student_id, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_summary_period_type ON public.progress_summary_stats (period_type, summary_date DESC);
CREATE INDEX IF NOT EXISTS idx_progress_summary_kpis ON public.progress_summary_stats (students_showing_improvement DESC, on_time_submission_rate DESC);

-- CAPS curriculum indexes
CREATE INDEX IF NOT EXISTS idx_caps_progress_student_id ON public.caps_curriculum_progress (student_id, caps_term, caps_week);
CREATE INDEX IF NOT EXISTS idx_caps_progress_preschool_id ON public.caps_curriculum_progress (preschool_id, caps_subject, caps_grade);
CREATE INDEX IF NOT EXISTS idx_caps_progress_assessment ON public.caps_curriculum_progress (assessment_date DESC, proficiency_level);
CREATE INDEX IF NOT EXISTS idx_caps_progress_reporting ON public.caps_curriculum_progress (ready_for_report, caps_term);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to calculate progress index (improvement rate)
CREATE OR REPLACE FUNCTION calculate_progress_index(
  current_score DECIMAL(5,2),
  previous_score DECIMAL(5,2),
  baseline_score DECIMAL(5,2)
)
RETURNS DECIMAL(6,3) AS $$
DECLARE
  progress_rate DECIMAL(6,3);
BEGIN
  -- Calculate improvement from previous score if available
  IF previous_score IS NOT NULL AND previous_score > 0 THEN
    progress_rate := (current_score - previous_score) / previous_score;
  -- Otherwise calculate from baseline
  ELSIF baseline_score IS NOT NULL AND baseline_score > 0 THEN
    progress_rate := (current_score - baseline_score) / baseline_score;
  ELSE
    -- No comparison available, return neutral
    RETURN 0.000;
  END IF;
  
  -- Cap the progress rate to reasonable bounds (-1.000 to +1.000)
  RETURN GREATEST(-1.000, LEAST(1.000, progress_rate));
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically calculate progress index
CREATE OR REPLACE FUNCTION update_progress_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate progress index based on scores
  NEW.progress_index := calculate_progress_index(
    NEW.current_score,
    NEW.previous_score,
    NEW.baseline_score
  );
  
  -- Update timestamps
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_progress_index ON public.student_progress_metrics;
CREATE TRIGGER trigger_update_progress_index
  BEFORE INSERT OR UPDATE ON public.student_progress_metrics
  FOR EACH ROW EXECUTE FUNCTION update_progress_index();

-- Function to generate AI insights for student progress
CREATE OR REPLACE FUNCTION generate_student_insights(
  p_student_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS UUID AS $$
DECLARE
  insight_id UUID;
  student_data RECORD;
  progress_data RECORD;
  ai_summary TEXT;
  recommendations TEXT;
  parent_summary TEXT;
BEGIN
  -- Get student information
  SELECT s.*, p.name as preschool_name
  INTO student_data
  FROM public.students s
  JOIN public.preschools p ON s.preschool_id = p.id
  WHERE s.id = p_student_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student not found: %', p_student_id;
  END IF;
  
  -- Aggregate progress data for the period
  SELECT 
    COUNT(*) as total_assessments,
    AVG(current_score) as avg_score,
    AVG(progress_index) as avg_progress,
    AVG(completion_rate) as avg_completion,
    AVG(parent_involvement_score) as avg_parent_involvement,
    ARRAY_AGG(DISTINCT subject) as subjects,
    ARRAY_AGG(DISTINCT skill_area) as skills
  INTO progress_data
  FROM public.student_progress_metrics
  WHERE student_id = p_student_id
    AND metric_date BETWEEN p_period_start AND p_period_end;
  
  -- Generate AI summary (placeholder - would call actual AI service)
  ai_summary := FORMAT(
    '%s %s has completed %s assessments during this period with an average score of %.1f%%. ' ||
    'Overall progress trend is %s with a completion rate of %.1f%%. ' ||
    'Parent involvement level is %s.',
    student_data.first_name,
    student_data.last_name,
    progress_data.total_assessments,
    COALESCE(progress_data.avg_score, 0),
    CASE 
      WHEN progress_data.avg_progress > 0.1 THEN 'excellent'
      WHEN progress_data.avg_progress > 0.05 THEN 'good'
      WHEN progress_data.avg_progress > 0 THEN 'steady'
      ELSE 'needs attention'
    END,
    COALESCE(progress_data.avg_completion * 100, 0),
    CASE 
      WHEN progress_data.avg_parent_involvement > 0.8 THEN 'high'
      WHEN progress_data.avg_parent_involvement > 0.6 THEN 'moderate'
      ELSE 'low'
    END
  );
  
  -- Generate recommendations
  recommendations := 'Based on the assessment data, continue with current learning activities. ' ||
    'Focus on areas showing slower progress. Maintain regular parent engagement.';
  
  -- Generate parent-friendly summary
  parent_summary := FORMAT(
    '%s is making progress in their learning journey! They have completed %s activities ' ||
    'and are showing good engagement with an average score of %.1f%%.',
    student_data.first_name,
    progress_data.total_assessments,
    COALESCE(progress_data.avg_score, 0)
  );
  
  -- Insert the generated insight
  INSERT INTO public.student_progress_insights (
    student_id,
    preschool_id,
    period_start,
    period_end,
    ai_summary,
    recommendations,
    parent_summary,
    confidence_score
  ) VALUES (
    p_student_id,
    student_data.preschool_id,
    p_period_start,
    p_period_end,
    ai_summary,
    recommendations,
    parent_summary,
    0.85
  ) RETURNING id INTO insight_id;
  
  RETURN insight_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update progress summary statistics
CREATE OR REPLACE FUNCTION update_progress_summary(
  p_preschool_id UUID,
  p_summary_date DATE,
  p_period_type TEXT DEFAULT 'daily'
)
RETURNS VOID AS $$
DECLARE
  date_start DATE;
  date_end DATE;
  total_students INTEGER;
  improving_students INTEGER;
  summary_stats RECORD;
BEGIN
  -- Calculate date range based on period type
  CASE p_period_type
    WHEN 'daily' THEN
      date_start := p_summary_date;
      date_end := p_summary_date;
    WHEN 'weekly' THEN
      date_start := p_summary_date - INTERVAL '6 days';
      date_end := p_summary_date;
    WHEN 'monthly' THEN
      date_start := date_trunc('month', p_summary_date);
      date_end := (date_trunc('month', p_summary_date) + INTERVAL '1 month - 1 day')::date;
  END CASE;
  
  -- Calculate aggregate statistics
  SELECT 
    COUNT(*) as total_assessments,
    AVG(current_score) as average_score,
    AVG(progress_index) as improvement_rate,
    AVG(completion_rate) as completion_rate,
    AVG(COALESCE(time_on_task_mins, 0)) as avg_time_on_task,
    SUM(help_requests) as total_help_requests,
    AVG(parent_involvement_score) as parent_engagement_score
  INTO summary_stats
  FROM public.student_progress_metrics spm
  JOIN public.students s ON spm.student_id = s.id
  WHERE s.preschool_id = p_preschool_id
    AND spm.metric_date BETWEEN date_start AND date_end;
  
  -- Count students showing improvement
  SELECT COUNT(DISTINCT student_id)
  INTO improving_students
  FROM public.student_progress_metrics spm
  JOIN public.students s ON spm.student_id = s.id
  WHERE s.preschool_id = p_preschool_id
    AND spm.metric_date BETWEEN date_start AND date_end
    AND spm.progress_index > 0;
  
  -- Get total active students
  SELECT COUNT(*)
  INTO total_students
  FROM public.students
  WHERE preschool_id = p_preschool_id
    AND is_active = true;
  
  -- Insert or update summary statistics
  INSERT INTO public.progress_summary_stats (
    preschool_id,
    summary_date,
    period_type,
    total_assessments,
    average_score,
    improvement_rate,
    completion_rate,
    avg_time_on_task_mins,
    total_help_requests,
    parent_engagement_score,
    students_showing_improvement
  ) VALUES (
    p_preschool_id,
    p_summary_date,
    p_period_type,
    COALESCE(summary_stats.total_assessments, 0),
    summary_stats.average_score,
    summary_stats.improvement_rate,
    summary_stats.completion_rate,
    summary_stats.avg_time_on_task::integer,
    COALESCE(summary_stats.total_help_requests, 0),
    summary_stats.parent_engagement_score,
    improving_students
  )
  ON CONFLICT (preschool_id, student_id, summary_date, period_type)
  DO UPDATE SET
    total_assessments = EXCLUDED.total_assessments,
    average_score = EXCLUDED.average_score,
    improvement_rate = EXCLUDED.improvement_rate,
    completion_rate = EXCLUDED.completion_rate,
    avg_time_on_task_mins = EXCLUDED.avg_time_on_task_mins,
    total_help_requests = EXCLUDED.total_help_requests,
    parent_engagement_score = EXCLUDED.parent_engagement_score,
    students_showing_improvement = EXCLUDED.students_showing_improvement,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.student_progress_metrics IS 'Core progress tracking supporting strategic KPI: 80% of students show measurable improvement';
COMMENT ON TABLE public.student_progress_insights IS 'AI-generated progress insights and recommendations for parents and teachers';
COMMENT ON TABLE public.student_milestones IS 'Achievement tracking for celebrating learning milestones and developmental progress';
COMMENT ON TABLE public.progress_summary_stats IS 'Aggregated progress statistics for dashboard analytics and KPI monitoring';
COMMENT ON TABLE public.caps_curriculum_progress IS 'South African CAPS curriculum alignment tracking for compliance reporting';

COMMENT ON COLUMN public.student_progress_metrics.progress_index IS 'Calculated improvement rate (-1.000 to +1.000) supporting 80% improvement KPI';
COMMENT ON COLUMN public.student_progress_insights.ai_summary IS 'AI-generated natural language progress summary using Claude/GPT';
COMMENT ON COLUMN public.student_milestones.early_late_indicator IS 'Developmental timing vs typical milestones for early intervention';
COMMENT ON COLUMN public.progress_summary_stats.students_showing_improvement IS 'Strategic KPI metric: target 80% of students showing improvement';
COMMENT ON COLUMN public.caps_curriculum_progress.caps_subject IS 'CAPS curriculum subjects for SA regulatory compliance';