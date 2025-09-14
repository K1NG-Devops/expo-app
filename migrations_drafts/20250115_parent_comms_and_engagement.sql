-- Parent Communications and Engagement Migration
-- Strategic Parent Dashboard Features: WhatsApp Integration, In-App Messaging, Announcements
-- Date: 2025-01-15
-- Purpose: Implement parent-teacher communication and engagement tracking per strategic roadmap

-- ============================================================================
-- WHATSAPP INTEGRATION TABLES
-- ============================================================================

-- WhatsApp contacts for opt-in tracking and message routing
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_e164 TEXT NOT NULL, -- E.164 format: +27821234567
  wa_user_id TEXT, -- Meta WhatsApp Business API user ID
  consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending','opted_in','opted_out')),
  last_opt_in_at TIMESTAMPTZ,
  opt_in_method TEXT CHECK (opt_in_method IN ('manual','qr_code','sms_verify','in_app')),
  marketing_consent BOOLEAN DEFAULT false, -- Separate consent for marketing vs transactional
  language_preference TEXT DEFAULT 'en' CHECK (language_preference IN ('en','af','zu','st')),
  UNIQUE (preschool_id, phone_e164),
  UNIQUE (user_id, preschool_id)
);

-- WhatsApp message log (incoming and outgoing)
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  contact_id UUID NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('in','out')),
  message_type TEXT NOT NULL CHECK (message_type IN ('text','image','audio','document','template','interactive')),
  content TEXT, -- Message text content
  media_url TEXT, -- URL for media files
  media_mime_type TEXT, -- image/jpeg, audio/ogg, etc.
  meta_message_id TEXT UNIQUE, -- WhatsApp Business API message ID
  template_name TEXT, -- For template messages
  template_language TEXT, -- Template language code
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed')),
  error_code TEXT, -- WhatsApp API error code if failed
  error_message TEXT, -- Error details
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  cost_usd DECIMAL(8,4), -- Track message costs for billing
  metadata JSONB -- Additional message metadata
);

-- ============================================================================
-- IN-APP MESSAGING SYSTEM
-- ============================================================================

-- Message threads for organized conversations
CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT, -- Thread topic/subject
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','whatsapp','sms')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  unread_count_parent INTEGER DEFAULT 0,
  unread_count_teacher INTEGER DEFAULT 0,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  tags TEXT[], -- For categorization: homework, behavior, attendance, etc.
  -- Ensure at least parent or teacher is specified
  CHECK (parent_id IS NOT NULL OR teacher_id IS NOT NULL)
);

-- Individual messages within threads
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('parent','teacher','principal','system')),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  content_type TEXT NOT NULL DEFAULT 'text' CHECK (content_type IN ('text','image','audio','document','system')),
  media_url TEXT, -- Supabase Storage URL
  media_mime_type TEXT,
  media_size_bytes INTEGER,
  voice_note_id UUID, -- Reference to voice_notes table (created later)
  translated_content JSONB, -- Auto-translations: {"af": "...", "zu": "...", "st": "..."}
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft','sent','delivered','read')),
  read_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES public.messages(id), -- For replies/threads
  metadata JSONB, -- Additional message metadata
  
  -- System message metadata
  system_event_type TEXT CHECK (system_event_type IN ('homework_submitted','homework_graded','announcement_sent','meeting_scheduled')),
  system_event_data JSONB
);

-- ============================================================================
-- VOICE NOTES SYSTEM
-- ============================================================================

-- Voice notes for rich parent-teacher communication
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  storage_bucket TEXT NOT NULL DEFAULT 'voice-notes',
  duration_secs INTEGER CHECK (duration_secs > 0 AND duration_secs <= 300), -- Max 5 minutes
  file_size_bytes INTEGER,
  mime_type TEXT DEFAULT 'audio/m4a', -- m4a for iOS, webm for Android
  language TEXT DEFAULT 'en' CHECK (language IN ('en','af','zu','st')), -- Detected/user language
  transcript TEXT, -- AI-generated transcript
  transcript_confidence DECIMAL(3,2), -- Confidence score 0.00-1.00
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_for_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending','processing','completed','failed')),
  transcription_error TEXT, -- Error details if transcription failed
  is_translated BOOLEAN DEFAULT false, -- Whether auto-translation was applied
  processing_cost_usd DECIMAL(6,4) DEFAULT 0.0000 -- Track AI processing costs
);

-- ============================================================================
-- SCHOOL ANNOUNCEMENTS SYSTEM
-- ============================================================================

-- Announcement read tracking (extends principal_announcements from Principal Hub)
-- Note: Assumes principal_announcements table exists from Principal Hub PRD
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  announcement_id UUID NOT NULL, -- Will reference principal_announcements when created
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_duration_secs INTEGER, -- How long spent reading
  device_type TEXT CHECK (device_type IN ('mobile','web','tablet')),
  UNIQUE (announcement_id, user_id)
);

-- ============================================================================
-- PARENT ENGAGEMENT TRACKING
-- ============================================================================

-- Track all parent engagement events for analytics and KPIs
CREATE TABLE IF NOT EXISTS public.parent_engagement_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- Strategic KPI events
  -- Event types: 'opened_announcement','submitted_homework','replied_message',
  -- 'listened_voice','opted_in_whatsapp','viewed_progress','used_ai_help',
  -- 'completed_survey','shared_content','downloaded_app'
  event_category TEXT CHECK (event_category IN ('communication','homework','engagement','analytics','ai_usage')),
  metadata JSONB, -- Event-specific data
  session_id TEXT, -- Group events by user session
  user_agent TEXT, -- Device/browser info
  ip_address INET, -- For basic fraud detection
  duration_ms INTEGER, -- Time spent on activity
  success BOOLEAN DEFAULT true, -- Whether action completed successfully
  error_details TEXT -- Error info if success=false
);

-- Parent feedback and satisfaction surveys
CREATE TABLE IF NOT EXISTS public.parent_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preschool_id UUID NOT NULL REFERENCES public.preschools(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5), -- 1-5 star rating
  comment TEXT,
  context TEXT NOT NULL, -- 'dashboard','homework','announcement','messaging','ai_help'
  feature_satisfaction JSONB, -- {"messaging": 4, "ai_help": 5, "notifications": 3}
  improvement_suggestions TEXT,
  would_recommend BOOLEAN,
  survey_id TEXT, -- Reference to specific survey campaign
  response_time_secs INTEGER, -- How long to complete survey
  is_anonymous BOOLEAN DEFAULT false
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- WhatsApp contacts indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_preschool_id ON public.whatsapp_contacts (preschool_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_user_id ON public.whatsapp_contacts (user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON public.whatsapp_contacts (phone_e164);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_consent ON public.whatsapp_contacts (consent_status, preschool_id);

-- WhatsApp messages indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_contact_id ON public.whatsapp_messages (contact_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON public.whatsapp_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages (status, created_at);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON public.whatsapp_messages (meta_message_id);

-- Message threads indexes
CREATE INDEX IF NOT EXISTS idx_message_threads_preschool_id ON public.message_threads (preschool_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_parent_id ON public.message_threads (parent_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_teacher_id ON public.message_threads (teacher_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_threads_student_id ON public.message_threads (student_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_active ON public.message_threads (preschool_id, is_archived, last_message_at DESC);

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages (thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_content_type ON public.messages (content_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_voice_note_id ON public.messages (voice_note_id);

-- Voice notes indexes
CREATE INDEX IF NOT EXISTS idx_voice_notes_preschool_id ON public.voice_notes (preschool_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_created_by ON public.voice_notes (created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_notes_student_id ON public.voice_notes (created_for_student_id);
CREATE INDEX IF NOT EXISTS idx_voice_notes_transcription_status ON public.voice_notes (transcription_status, created_at);

-- Announcement reads indexes
CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement_id ON public.announcement_reads (announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_reads_user_id ON public.announcement_reads (user_id, read_at DESC);

-- Parent engagement indexes
CREATE INDEX IF NOT EXISTS idx_parent_engagement_preschool_id ON public.parent_engagement_events (preschool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_engagement_parent_id ON public.parent_engagement_events (parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_engagement_event_type ON public.parent_engagement_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_engagement_session ON public.parent_engagement_events (session_id, created_at ASC);

-- Parent feedback indexes
CREATE INDEX IF NOT EXISTS idx_parent_feedback_preschool_id ON public.parent_feedback (preschool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_feedback_parent_id ON public.parent_feedback (parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_feedback_context ON public.parent_feedback (context, rating, created_at DESC);

-- ============================================================================
-- TRIGGERS FOR DATA CONSISTENCY
-- ============================================================================

-- Update message thread statistics on message insert/delete
CREATE OR REPLACE FUNCTION update_message_thread_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.message_threads SET
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      updated_at = NOW(),
      -- Increment unread count for recipient
      unread_count_parent = CASE 
        WHEN NEW.sender_role != 'parent' THEN unread_count_parent + 1 
        ELSE unread_count_parent 
      END,
      unread_count_teacher = CASE 
        WHEN NEW.sender_role != 'teacher' AND NEW.sender_role != 'principal' THEN unread_count_teacher + 1 
        ELSE unread_count_teacher 
      END
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.message_threads SET
      message_count = GREATEST(message_count - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message thread stats
DROP TRIGGER IF EXISTS trigger_update_message_thread_stats ON public.messages;
CREATE TRIGGER trigger_update_message_thread_stats
  AFTER INSERT OR DELETE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION update_message_thread_stats();

-- Function to mark messages as read and update thread unread counts
CREATE OR REPLACE FUNCTION mark_messages_read(
  p_thread_id UUID,
  p_user_role TEXT
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mark unread messages as read
  UPDATE public.messages SET
    status = 'read',
    read_at = NOW()
  WHERE thread_id = p_thread_id
    AND status != 'read'
    AND sender_role != p_user_role; -- Don't mark own messages as read
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Reset unread count for this user role
  UPDATE public.message_threads SET
    unread_count_parent = CASE WHEN p_user_role = 'parent' THEN 0 ELSE unread_count_parent END,
    unread_count_teacher = CASE WHEN p_user_role IN ('teacher', 'principal') THEN 0 ELSE unread_count_teacher END,
    updated_at = NOW()
  WHERE id = p_thread_id;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get parent's WhatsApp contact info
CREATE OR REPLACE FUNCTION get_parent_whatsapp_contact(
  p_user_id UUID,
  p_preschool_id UUID
)
RETURNS public.whatsapp_contacts AS $$
DECLARE
  contact_record public.whatsapp_contacts;
BEGIN
  SELECT * INTO contact_record
  FROM public.whatsapp_contacts
  WHERE user_id = p_user_id 
    AND preschool_id = p_preschool_id
    AND consent_status = 'opted_in';
  
  RETURN contact_record;
END;
$$ LANGUAGE plpgsql;

-- Function to create message thread with validation
CREATE OR REPLACE FUNCTION create_message_thread(
  p_preschool_id UUID,
  p_student_id UUID DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL,
  p_teacher_id UUID DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_channel TEXT DEFAULT 'in_app'
)
RETURNS UUID AS $$
DECLARE
  thread_id UUID;
BEGIN
  -- Validate that at least parent or teacher is specified
  IF p_parent_id IS NULL AND p_teacher_id IS NULL THEN
    RAISE EXCEPTION 'Either parent_id or teacher_id must be specified';
  END IF;
  
  -- Validate channel
  IF p_channel NOT IN ('in_app', 'whatsapp', 'sms') THEN
    RAISE EXCEPTION 'Invalid channel: %', p_channel;
  END IF;
  
  INSERT INTO public.message_threads (
    preschool_id, student_id, parent_id, teacher_id, subject, channel
  ) VALUES (
    p_preschool_id, p_student_id, p_parent_id, p_teacher_id, p_subject, p_channel
  ) RETURNING id INTO thread_id;
  
  RETURN thread_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.whatsapp_contacts IS 'Parent WhatsApp contact information and consent status for SA market (90%+ penetration)';
COMMENT ON TABLE public.whatsapp_messages IS 'WhatsApp message log for parent-teacher communication via Meta Business API';
COMMENT ON TABLE public.message_threads IS 'Organized conversation threads between parents and teachers';
COMMENT ON TABLE public.messages IS 'Individual messages within conversation threads with rich media support';
COMMENT ON TABLE public.voice_notes IS 'Voice message recordings with AI transcription for multilingual support';
COMMENT ON TABLE public.announcement_reads IS 'Tracking of school announcement reads for engagement metrics';
COMMENT ON TABLE public.parent_engagement_events IS 'Comprehensive parent engagement tracking for KPI dashboards (80% response rate target)';
COMMENT ON TABLE public.parent_feedback IS 'Parent satisfaction surveys and feedback collection';

COMMENT ON COLUMN public.whatsapp_contacts.consent_status IS 'GDPR/POPIA compliant consent tracking for marketing vs transactional messages';
COMMENT ON COLUMN public.whatsapp_contacts.phone_e164 IS 'International phone format required by WhatsApp Business API';
COMMENT ON COLUMN public.messages.translated_content IS 'Auto-translated content for SA multilingual support (EN/AF/ZU/ST)';
COMMENT ON COLUMN public.voice_notes.transcript IS 'AI-generated transcript using Whisper/Deepgram for accessibility';
COMMENT ON COLUMN public.parent_engagement_events.event_type IS 'Strategic KPI events mapped to roadmap success metrics';