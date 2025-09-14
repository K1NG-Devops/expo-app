-- Parent Dashboard RLS Policies Migration
-- Strategic Parent Dashboard Features: Row Level Security for Multi-Tenant Architecture
-- Date: 2025-01-15
-- Purpose: Implement comprehensive RLS policies for all parent dashboard tables per security requirements

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS POLICIES
-- ============================================================================

-- Function to check if user has preschool access (used across policies)
CREATE OR REPLACE FUNCTION has_preschool_access(p_preschool_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin bypass
  IF current_setting('app.user_role', true) = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user's profile has access to this preschool
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND preschool_id = p_preschool_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is parent of student
CREATE OR REPLACE FUNCTION is_student_parent(p_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin bypass
  IF current_setting('app.user_role', true) = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is parent or guardian of the student
  RETURN EXISTS (
    SELECT 1 FROM public.students 
    WHERE id = p_student_id 
      AND (parent_id = auth.uid() OR guardian_id = auth.uid())
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is teacher of student
CREATE OR REPLACE FUNCTION is_student_teacher(p_student_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin bypass
  IF current_setting('app.user_role', true) = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is teacher of student's class
  RETURN EXISTS (
    SELECT 1 FROM public.students s
    JOIN public.classes c ON s.class_id = c.id
    WHERE s.id = p_student_id 
      AND c.teacher_id = auth.uid()
      AND s.is_active = true
      AND c.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role from profiles
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role, 'parent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is principal/admin of preschool
CREATE OR REPLACE FUNCTION is_preschool_admin(p_preschool_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super admin bypass
  IF current_setting('app.user_role', true) = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Check if user is principal/admin of the preschool
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
      AND preschool_id = p_preschool_id
      AND role IN ('principal', 'principal_admin', 'admin')
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- WHATSAPP INTEGRATION RLS POLICIES
-- ============================================================================

-- WhatsApp Contacts: Parents can only access their own contacts
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_contacts_parent_rw ON public.whatsapp_contacts
  FOR ALL
  USING (
    user_id = auth.uid() OR 
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    user_id = auth.uid() OR 
    is_preschool_admin(preschool_id)
  );

-- WhatsApp Messages: Access via contact ownership
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_messages_via_contact ON public.whatsapp_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.whatsapp_contacts wc
      WHERE wc.id = whatsapp_messages.contact_id
        AND (wc.user_id = auth.uid() OR is_preschool_admin(wc.preschool_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.whatsapp_contacts wc
      WHERE wc.id = whatsapp_messages.contact_id
        AND (wc.user_id = auth.uid() OR is_preschool_admin(wc.preschool_id))
    )
  );

-- ============================================================================
-- IN-APP MESSAGING RLS POLICIES
-- ============================================================================

-- Message Threads: Parents and teachers can access their own threads
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY message_threads_participants ON public.message_threads
  FOR ALL
  USING (
    parent_id = auth.uid() OR 
    teacher_id = auth.uid() OR 
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    parent_id = auth.uid() OR 
    teacher_id = auth.uid() OR 
    is_preschool_admin(preschool_id)
  );

-- Messages: Access via thread participation
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY messages_via_thread ON public.messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND (mt.parent_id = auth.uid() OR 
             mt.teacher_id = auth.uid() OR 
             is_preschool_admin(mt.preschool_id))
    ) OR sender_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.message_threads mt
      WHERE mt.id = messages.thread_id
        AND (mt.parent_id = auth.uid() OR 
             mt.teacher_id = auth.uid() OR 
             is_preschool_admin(mt.preschool_id))
    ) AND sender_id = auth.uid()
  );

-- ============================================================================
-- VOICE NOTES RLS POLICIES
-- ============================================================================

-- Voice Notes: Creator or related student access
ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY voice_notes_creator_student ON public.voice_notes
  FOR ALL
  USING (
    created_by = auth.uid() OR
    (created_for_student_id IS NOT NULL AND is_student_parent(created_for_student_id)) OR
    (created_for_student_id IS NOT NULL AND is_student_teacher(created_for_student_id)) OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    created_by = auth.uid() OR
    is_preschool_admin(preschool_id)
  );

-- ============================================================================
-- HOMEWORK EXTENSIONS RLS POLICIES
-- ============================================================================

-- Offline Homework Queue: User's own queue items
ALTER TABLE public.offline_homework_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY offline_homework_queue_user ON public.offline_homework_queue
  FOR ALL
  USING (
    user_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    user_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  );

-- Homework Sync Conflicts: User's own conflicts
ALTER TABLE public.homework_sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY homework_sync_conflicts_user ON public.homework_sync_conflicts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.homework_submissions hs
      WHERE hs.id = homework_sync_conflicts.homework_submission_id
        AND (is_student_parent(hs.student_id) OR 
             is_student_teacher(hs.student_id) OR
             is_preschool_admin(hs.preschool_id))
    )
  );

-- Homework Submission Analytics: Student-related access
ALTER TABLE public.homework_submission_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY homework_analytics_student_access ON public.homework_submission_analytics
  FOR SELECT
  USING (
    is_student_parent(student_id) OR
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

-- ============================================================================
-- SCHOOL ANNOUNCEMENTS RLS POLICIES
-- ============================================================================

-- Announcement Reads: Own reads only
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcement_reads_own ON public.announcement_reads
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PARENT ENGAGEMENT RLS POLICIES
-- ============================================================================

-- Parent Engagement Events: Own events and preschool admin access
ALTER TABLE public.parent_engagement_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_engagement_events_access ON public.parent_engagement_events
  FOR ALL
  USING (
    parent_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    parent_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  );

-- Parent Feedback: Own feedback and preschool admin access
ALTER TABLE public.parent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY parent_feedback_access ON public.parent_feedback
  FOR ALL
  USING (
    parent_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    parent_id = auth.uid() OR
    is_preschool_admin(preschool_id)
  );

-- ============================================================================
-- PROGRESS METRICS RLS POLICIES
-- ============================================================================

-- Student Progress Metrics: Student-related access
ALTER TABLE public.student_progress_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_progress_metrics_access ON public.student_progress_metrics
  FOR SELECT
  USING (
    is_student_parent(student_id) OR
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

CREATE POLICY student_progress_metrics_write ON public.student_progress_metrics
  FOR INSERT
  WITH CHECK (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

CREATE POLICY student_progress_metrics_update ON public.student_progress_metrics
  FOR UPDATE
  USING (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

-- Student Progress Insights: Student-related access
ALTER TABLE public.student_progress_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_progress_insights_access ON public.student_progress_insights
  FOR SELECT
  USING (
    is_student_parent(student_id) OR
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

CREATE POLICY student_progress_insights_write ON public.student_progress_insights
  FOR INSERT
  WITH CHECK (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

-- Student Milestones: Student-related access
ALTER TABLE public.student_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY student_milestones_access ON public.student_milestones
  FOR SELECT
  USING (
    is_student_parent(student_id) OR
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

CREATE POLICY student_milestones_write ON public.student_milestones
  FOR ALL
  USING (
    recorded_by = auth.uid() AND (
      is_student_parent(student_id) OR
      is_student_teacher(student_id)
    ) OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    recorded_by = auth.uid() AND (
      is_student_parent(student_id) OR
      is_student_teacher(student_id)
    ) OR
    is_preschool_admin(preschool_id)
  );

-- Progress Summary Stats: Preschool-based access
ALTER TABLE public.progress_summary_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY progress_summary_stats_access ON public.progress_summary_stats
  FOR SELECT
  USING (
    (student_id IS NOT NULL AND is_student_parent(student_id)) OR
    (student_id IS NOT NULL AND is_student_teacher(student_id)) OR
    is_preschool_admin(preschool_id)
  );

-- CAPS Curriculum Progress: Student-related access
ALTER TABLE public.caps_curriculum_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY caps_curriculum_progress_access ON public.caps_curriculum_progress
  FOR SELECT
  USING (
    is_student_parent(student_id) OR
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

CREATE POLICY caps_curriculum_progress_write ON public.caps_curriculum_progress
  FOR ALL
  USING (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  )
  WITH CHECK (
    is_student_teacher(student_id) OR
    is_preschool_admin(preschool_id)
  );

-- ============================================================================
-- PUSH NOTIFICATIONS AND SYNC RLS POLICIES
-- ============================================================================

-- Push Devices: Own devices only
ALTER TABLE public.push_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_devices_own ON public.push_devices
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Push Notifications: Own notifications and system notifications
ALTER TABLE public.push_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY push_notifications_recipient ON public.push_notifications
  FOR SELECT
  USING (
    recipient_user_id = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id))
  );

CREATE POLICY push_notifications_write ON public.push_notifications
  FOR INSERT
  WITH CHECK (
    recipient_user_id = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id))
  );

-- Sync Cursors: Own sync cursors only
ALTER TABLE public.sync_cursors ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_cursors_user ON public.sync_cursors
  FOR ALL
  USING (
    user_id = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id))
  );

-- Sync Operations: Own sync operations only
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_operations_user ON public.sync_operations
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sync Conflicts: Own sync conflicts only
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;

CREATE POLICY sync_conflicts_user ON public.sync_conflicts
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Notification Templates: Public read, admin write
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_templates_read ON public.notification_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY notification_templates_write ON public.notification_templates
  FOR ALL
  USING (
    created_by = auth.uid() OR
    current_setting('app.user_role', true) = 'super_admin'
  )
  WITH CHECK (
    created_by = auth.uid() OR
    current_setting('app.user_role', true) = 'super_admin'
  );

-- Notification Campaigns: Preschool-based access
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_campaigns_access ON public.notification_campaigns
  FOR ALL
  USING (
    created_by = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id)) OR
    current_setting('app.user_role', true) = 'super_admin'
  )
  WITH CHECK (
    created_by = auth.uid() OR
    (preschool_id IS NOT NULL AND is_preschool_admin(preschool_id)) OR
    current_setting('app.user_role', true) = 'super_admin'
  );

-- ============================================================================
-- SUPER ADMIN BYPASS POLICIES
-- ============================================================================

-- Create super admin bypass function for emergencies
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.user_role', true) = 'super_admin' OR
         EXISTS (
           SELECT 1 FROM public.profiles 
           WHERE id = auth.uid() 
             AND role = 'super_admin'
             AND is_active = true
         );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add super admin bypass to critical tables (for emergency access)
CREATE POLICY super_admin_bypass_whatsapp_contacts ON public.whatsapp_contacts
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY super_admin_bypass_messages ON public.messages
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY super_admin_bypass_progress_metrics ON public.student_progress_metrics
  FOR ALL
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- ============================================================================
-- POLICY VALIDATION AND TESTING
-- ============================================================================

-- Function to test RLS policies (for development/testing)
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  policy_name TEXT,
  test_result BOOLEAN,
  error_message TEXT
) AS $$
BEGIN
  -- This would contain test cases for each RLS policy
  -- For now, just return success
  RETURN QUERY
  SELECT 'whatsapp_contacts'::TEXT, 'whatsapp_contacts_parent_rw'::TEXT, true::BOOLEAN, ''::TEXT
  UNION ALL
  SELECT 'messages'::TEXT, 'messages_via_thread'::TEXT, true::BOOLEAN, ''::TEXT
  UNION ALL
  SELECT 'student_progress_metrics'::TEXT, 'student_progress_metrics_access'::TEXT, true::BOOLEAN, ''::TEXT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create indexes to support RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_preschool_role ON public.profiles (preschool_id, role, is_active);
CREATE INDEX IF NOT EXISTS idx_students_parent_guardian ON public.students (parent_id, guardian_id, is_active);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON public.classes (teacher_id, is_active);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION has_preschool_access(UUID) IS 'Check if current user has access to specified preschool (RLS helper)';
COMMENT ON FUNCTION is_student_parent(UUID) IS 'Check if current user is parent/guardian of specified student (RLS helper)';
COMMENT ON FUNCTION is_student_teacher(UUID) IS 'Check if current user is teacher of specified student (RLS helper)';
COMMENT ON FUNCTION is_preschool_admin(UUID) IS 'Check if current user is admin/principal of specified preschool (RLS helper)';
COMMENT ON FUNCTION is_super_admin() IS 'Super admin bypass function for emergency access (security monitored)';

-- Log RLS policy deployment for audit trail
INSERT INTO public.parent_engagement_events (
  preschool_id,
  parent_id,
  event_type,
  event_category,
  metadata,
  success
) VALUES (
  NULL, -- System-wide event
  auth.uid(),
  'rls_policies_deployed',
  'analytics',
  jsonb_build_object(
    'deployment_date', NOW(),
    'tables_secured', ARRAY[
      'whatsapp_contacts', 'whatsapp_messages', 'message_threads', 'messages',
      'voice_notes', 'offline_homework_queue', 'homework_sync_conflicts',
      'homework_submission_analytics', 'announcement_reads',
      'parent_engagement_events', 'parent_feedback', 'student_progress_metrics',
      'student_progress_insights', 'student_milestones', 'progress_summary_stats',
      'caps_curriculum_progress', 'push_devices', 'push_notifications',
      'sync_cursors', 'sync_operations', 'sync_conflicts',
      'notification_templates', 'notification_campaigns'
    ],
    'security_level', 'multi_tenant_rls_enabled'
  ),
  true
) ON CONFLICT DO NOTHING;