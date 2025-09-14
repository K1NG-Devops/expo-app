-- Push Devices and Sync Infrastructure Migration
-- Strategic Parent Dashboard Features: Push Notifications and Offline-First Sync Engine
-- Date: 2025-01-15
-- Purpose: Implement push notification system and progressive sync infrastructure per roadmap

-- ============================================================================
-- PUSH NOTIFICATION SYSTEM
-- ============================================================================

-- Push notification devices and tokens (Expo Notifications)
CREATE TABLE IF NOT EXISTS public.push_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Device identification
  expo_push_token TEXT NOT NULL, -- Expo push token format: ExponentPushToken[...]
  device_id TEXT, -- Unique device identifier
  device_name TEXT, -- User-friendly device name
  
  -- Platform details
  platform TEXT NOT NULL CHECK (platform IN ('ios','android','web')),
  os_version TEXT,
  app_version TEXT,
  expo_sdk_version TEXT,
  
  -- User preferences
  language TEXT DEFAULT 'en' CHECK (language IN ('en','af','zu','st')),
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  
  -- Notification preferences (JSONB for flexibility)
  notification_preferences JSONB DEFAULT jsonb_build_object(
    'homework_assigned', true,
    'homework_graded', true,
    'announcements', true,
    'messages', true,
    'progress_updates', true,
    'milestones', true,
    'reminders', true,
    'marketing', false
  ),
  
  -- Status and validation
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true, -- Token validity from Expo
  last_validated_at TIMESTAMPTZ,
  validation_error TEXT, -- Error from Expo if token invalid
  
  -- Usage tracking
  last_notification_sent TIMESTAMPTZ,
  total_notifications_sent INTEGER DEFAULT 0,
  last_opened_app TIMESTAMPTZ,
  
  -- Security and compliance
  opt_in_date TIMESTAMPTZ DEFAULT NOW(),
  opt_out_date TIMESTAMPTZ,
  privacy_consent BOOLEAN DEFAULT true,
  
  -- Ensure unique device per user
  UNIQUE (user_id, expo_push_token)
);

-- Push notification delivery log
CREATE TABLE IF NOT EXISTS public.push_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Recipient details
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  push_device_id UUID REFERENCES public.push_devices(id) ON DELETE SET NULL,
  
  -- Notification content
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB, -- Additional structured data
  category_id TEXT, -- For notification categorization
  
  -- Notification type and context
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'homework_assigned','homework_graded','homework_due','homework_overdue',
    'announcement_new','announcement_urgent',
    'message_received','message_thread_new',
    'progress_report','milestone_achieved',
    'reminder_general','reminder_homework','reminder_meeting',
    'alert_system','alert_security'
  )),
  
  -- Delivery tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending','sent','delivered','failed','clicked','dismissed'
  )),
  expo_ticket_id TEXT, -- Expo push receipt ticket
  expo_receipt_id TEXT, -- Expo delivery receipt
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Deep linking
  deep_link_url TEXT, -- App deep link for notification tap
  web_url TEXT, -- Web fallback URL
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Priority and batching
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  batch_id UUID, -- Group related notifications
  
  -- Multi-language support
  language TEXT DEFAULT 'en',
  localized_content JSONB, -- Translations for different languages
  
  -- Metadata
  source_table TEXT, -- Table that triggered notification
  source_id UUID, -- Record ID that triggered notification
  campaign_id TEXT, -- Marketing campaign identifier
  preschool_id UUID REFERENCES public.preschools(id) ON DELETE CASCADE
);

-- ============================================================================
-- PROGRESSIVE SYNC SYSTEM
-- ============================================================================

-- Sync cursor tracking for progressive data synchronization
CREATE TABLE IF NOT EXISTS public.sync_cursors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Sync scope
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preschool_id UUID REFERENCES public.preschools(id) ON DELETE CASCADE,
  device_id TEXT, -- Optional device-specific sync
  
  -- Sync configuration
  table_name TEXT NOT NULL, -- Table being synced
  sync_direction TEXT DEFAULT 'both' CHECK (sync_direction IN ('up','down','both')),
  
  -- Cursor state
  last_synced_at TIMESTAMPTZ,
  last_sync_token TEXT, -- Opaque sync token for pagination
  last_record_id UUID, -- Last processed record ID
  last_record_timestamp TIMESTAMPTZ, -- Timestamp of last processed record
  
  -- Sync metadata
  total_records_synced BIGINT DEFAULT 0,
  sync_batch_size INTEGER DEFAULT 50,
  sync_frequency_mins INTEGER DEFAULT 15, -- How often to sync
  
  -- Status tracking
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN (
    'idle','running','paused','error','complete'
  )),
  last_sync_duration_ms INTEGER,
  last_sync_error TEXT,
  consecutive_errors INTEGER DEFAULT 0,
  
  -- Network-aware syncing
  requires_wifi BOOLEAN DEFAULT false,
  requires_charging BOOLEAN DEFAULT false,
  max_data_usage_mb INTEGER DEFAULT 100,
  
  UNIQUE (user_id, preschool_id, table_name, COALESCE(device_id, 'default'))
);

-- Sync operation log for monitoring and debugging
CREATE TABLE IF NOT EXISTS public.sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Operation context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_id UUID NOT NULL REFERENCES public.sync_cursors(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('full_sync','incremental_sync','conflict_resolution')),
  
  -- Operation details
  table_name TEXT NOT NULL,
  records_processed INTEGER DEFAULT 0,
  records_inserted INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  records_deleted INTEGER DEFAULT 0,
  conflicts_detected INTEGER DEFAULT 0,
  conflicts_resolved INTEGER DEFAULT 0,
  
  -- Performance metrics
  duration_ms INTEGER,
  data_transferred_bytes INTEGER,
  network_type TEXT, -- wifi, cellular, unknown
  battery_level INTEGER, -- Device battery percentage
  
  -- Status and errors
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
    'running','completed','failed','cancelled','timeout'
  )),
  error_message TEXT,
  error_details JSONB,
  
  -- Metadata
  client_version TEXT,
  server_version TEXT,
  sync_strategy TEXT DEFAULT 'timestamp' CHECK (sync_strategy IN ('timestamp','version','checksum'))
);

-- Sync conflict resolution for offline-first architecture
CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Conflict context
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  
  -- Conflict data
  local_version JSONB NOT NULL, -- Local data version
  server_version JSONB NOT NULL, -- Server data version
  conflict_type TEXT NOT NULL CHECK (conflict_type IN (
    'update_update','update_delete','delete_update','create_create'
  )),
  
  -- Resolution details
  resolution_strategy TEXT CHECK (resolution_strategy IN (
    'use_local','use_server','merge_automatic','merge_manual','ignore'
  )),
  resolved_version JSONB, -- Final resolved data
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Metadata
  local_timestamp TIMESTAMPTZ,
  server_timestamp TIMESTAMPTZ,
  conflict_score DECIMAL(3,2), -- Severity of conflict (0.00-1.00)
  
  -- Auto-resolution flags
  can_auto_resolve BOOLEAN DEFAULT false,
  requires_user_input BOOLEAN DEFAULT true,
  is_critical BOOLEAN DEFAULT false -- Affects data integrity
);

-- ============================================================================
-- NOTIFICATION TEMPLATES AND CAMPAIGNS
-- ============================================================================

-- Reusable notification templates for consistency
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Template identification
  template_key TEXT UNIQUE NOT NULL, -- e.g., 'homework_assigned', 'milestone_achieved'
  template_name TEXT NOT NULL,
  description TEXT,
  
  -- Template content
  title_template TEXT NOT NULL, -- e.g., 'New homework: {{assignment_title}}'
  body_template TEXT NOT NULL, -- e.g., '{{student_name}} has new homework due {{due_date}}'
  
  -- Localization
  language TEXT DEFAULT 'en',
  translations JSONB, -- Multi-language versions
  
  -- Configuration
  default_priority TEXT DEFAULT 'normal',
  category_id TEXT,
  expires_after_hours INTEGER DEFAULT 72,
  requires_action BOOLEAN DEFAULT false,
  
  -- Deep linking
  deep_link_template TEXT, -- e.g., 'edudash://homework/{{assignment_id}}'
  web_link_template TEXT,
  
  -- Usage tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  
  -- Metadata
  tags TEXT[],
  notes TEXT
);

-- Scheduled notification campaigns
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Campaign details
  campaign_name TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT CHECK (campaign_type IN (
    'one_time','recurring','triggered','drip_campaign'
  )),
  
  -- Targeting
  preschool_id UUID REFERENCES public.preschools(id) ON DELETE CASCADE,
  target_roles TEXT[] DEFAULT ARRAY['parent'], -- parent, teacher, principal
  target_user_ids UUID[], -- Specific users
  target_criteria JSONB, -- Complex targeting rules
  
  -- Content
  template_id UUID REFERENCES public.notification_templates(id),
  custom_title TEXT,
  custom_body TEXT,
  custom_data JSONB,
  
  -- Scheduling
  scheduled_at TIMESTAMPTZ,
  recurring_pattern TEXT, -- cron-like pattern
  recurring_until TIMESTAMPTZ,
  timezone TEXT DEFAULT 'Africa/Johannesburg',
  
  -- Status and tracking
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft','scheduled','running','paused','completed','cancelled'
  )),
  total_recipients INTEGER,
  notifications_sent INTEGER DEFAULT 0,
  notifications_delivered INTEGER DEFAULT 0,
  notifications_clicked INTEGER DEFAULT 0,
  
  -- Performance
  send_rate_per_minute INTEGER DEFAULT 100,
  priority TEXT DEFAULT 'normal',
  
  -- Metadata
  created_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  tags TEXT[]
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Push devices indexes
CREATE INDEX IF NOT EXISTS idx_push_devices_user_id ON public.push_devices (user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_token ON public.push_devices (expo_push_token);
CREATE INDEX IF NOT EXISTS idx_push_devices_platform ON public.push_devices (platform, is_active);
CREATE INDEX IF NOT EXISTS idx_push_devices_validation ON public.push_devices (is_valid, last_validated_at);

-- Push notifications indexes
CREATE INDEX IF NOT EXISTS idx_push_notifications_recipient ON public.push_notifications (recipient_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_status ON public.push_notifications (status, created_at);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON public.push_notifications (notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_push_notifications_scheduled ON public.push_notifications (scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_push_notifications_delivery ON public.push_notifications (sent_at, delivered_at);

-- Sync cursors indexes
CREATE INDEX IF NOT EXISTS idx_sync_cursors_user_table ON public.sync_cursors (user_id, table_name);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_last_sync ON public.sync_cursors (last_synced_at, sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_status ON public.sync_cursors (sync_status, updated_at);
CREATE INDEX IF NOT EXISTS idx_sync_cursors_frequency ON public.sync_cursors (sync_frequency_mins, last_synced_at);

-- Sync operations indexes
CREATE INDEX IF NOT EXISTS idx_sync_operations_user_id ON public.sync_operations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_operations_cursor_id ON public.sync_operations (cursor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_operations_status ON public.sync_operations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_operations_performance ON public.sync_operations (duration_ms DESC, data_transferred_bytes DESC);

-- Sync conflicts indexes
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_user_id ON public.sync_conflicts (user_id, resolved_at);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_table_record ON public.sync_conflicts (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_unresolved ON public.sync_conflicts (resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sync_conflicts_critical ON public.sync_conflicts (is_critical, created_at DESC);

-- Notification templates indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_key ON public.notification_templates (template_key, is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_usage ON public.notification_templates (usage_count DESC, last_used_at DESC);

-- Notification campaigns indexes
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_preschool ON public.notification_campaigns (preschool_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_scheduled ON public.notification_campaigns (scheduled_at, status);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON public.notification_campaigns (status, created_at DESC);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to validate Expo push token format
CREATE OR REPLACE FUNCTION validate_expo_push_token(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  -- Basic validation for Expo push token format
  RETURN token ~ '^ExponentPushToken\[[\w-_]+\]$' OR 
         token ~ '^[a-zA-Z0-9_-]{22}$'; -- Legacy format
END;
$$ LANGUAGE plpgsql;

-- Trigger to validate push token on insert/update
CREATE OR REPLACE FUNCTION validate_push_device()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate Expo push token format
  IF NOT validate_expo_push_token(NEW.expo_push_token) THEN
    NEW.is_valid := false;
    NEW.validation_error := 'Invalid Expo push token format';
  ELSE
    NEW.is_valid := true;
    NEW.validation_error := NULL;
    NEW.last_validated_at := NOW();
  END IF;
  
  -- Update timestamp
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_push_device ON public.push_devices;
CREATE TRIGGER trigger_validate_push_device
  BEFORE INSERT OR UPDATE ON public.push_devices
  FOR EACH ROW EXECUTE FUNCTION validate_push_device();

-- Function to create notification from template
CREATE OR REPLACE FUNCTION create_notification_from_template(
  p_template_key TEXT,
  p_recipient_user_id UUID,
  p_variables JSONB DEFAULT '{}'::jsonb,
  p_scheduled_for TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
  template_record public.notification_templates;
  resolved_title TEXT;
  resolved_body TEXT;
  resolved_deep_link TEXT;
  variable_key TEXT;
  variable_value TEXT;
BEGIN
  -- Get template
  SELECT * INTO template_record
  FROM public.notification_templates
  WHERE template_key = p_template_key
    AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive: %', p_template_key;
  END IF;
  
  -- Start with template content
  resolved_title := template_record.title_template;
  resolved_body := template_record.body_template;
  resolved_deep_link := template_record.deep_link_template;
  
  -- Replace variables in templates
  FOR variable_key, variable_value IN
    SELECT key, value FROM jsonb_each_text(p_variables)
  LOOP
    resolved_title := replace(resolved_title, '{{' || variable_key || '}}', variable_value);
    resolved_body := replace(resolved_body, '{{' || variable_key || '}}', variable_value);
    IF resolved_deep_link IS NOT NULL THEN
      resolved_deep_link := replace(resolved_deep_link, '{{' || variable_key || '}}', variable_value);
    END IF;
  END LOOP;
  
  -- Create notification
  INSERT INTO public.push_notifications (
    recipient_user_id,
    title,
    body,
    notification_type,
    deep_link_url,
    priority,
    scheduled_for,
    expires_at,
    data
  ) VALUES (
    p_recipient_user_id,
    resolved_title,
    resolved_body,
    p_template_key,
    resolved_deep_link,
    template_record.default_priority,
    p_scheduled_for,
    COALESCE(p_scheduled_for, NOW()) + INTERVAL '1 hour' * template_record.expires_after_hours,
    p_variables
  ) RETURNING id INTO notification_id;
  
  -- Update template usage
  UPDATE public.notification_templates
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE template_key = p_template_key;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get next sync batch for a cursor
CREATE OR REPLACE FUNCTION get_sync_batch(
  p_cursor_id UUID,
  p_batch_size INTEGER DEFAULT 50
)
RETURNS SETOF RECORD AS $$
DECLARE
  cursor_record public.sync_cursors;
  query_sql TEXT;
BEGIN
  -- Get cursor details
  SELECT * INTO cursor_record
  FROM public.sync_cursors
  WHERE id = p_cursor_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sync cursor not found: %', p_cursor_id;
  END IF;
  
  -- Build dynamic query based on table name and last sync
  query_sql := format(
    'SELECT * FROM public.%I WHERE updated_at > %L ORDER BY updated_at ASC LIMIT %s',
    cursor_record.table_name,
    COALESCE(cursor_record.last_synced_at, '1970-01-01'::timestamptz),
    p_batch_size
  );
  
  -- Execute dynamic query
  RETURN QUERY EXECUTE query_sql;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.push_devices IS 'Expo push notification device registration supporting 80% parent response rate KPI';
COMMENT ON TABLE public.push_notifications IS 'Push notification delivery log with deep linking for parent engagement';
COMMENT ON TABLE public.sync_cursors IS 'Progressive sync state tracking for offline-first architecture (60% offline target)';
COMMENT ON TABLE public.sync_operations IS 'Sync operation monitoring and performance tracking';
COMMENT ON TABLE public.sync_conflicts IS 'Conflict resolution for offline-first multi-device synchronization';
COMMENT ON TABLE public.notification_templates IS 'Reusable notification templates for consistent parent communication';
COMMENT ON TABLE public.notification_campaigns IS 'Scheduled notification campaigns for parent engagement';

COMMENT ON COLUMN public.push_devices.expo_push_token IS 'Expo push token for React Native push notifications';
COMMENT ON COLUMN public.push_notifications.notification_type IS 'Notification category for tracking engagement by type';
COMMENT ON COLUMN public.sync_cursors.last_synced_at IS 'Timestamp cursor for incremental synchronization';
COMMENT ON COLUMN public.sync_conflicts.conflict_type IS 'Type of data conflict requiring resolution strategy';
COMMENT ON COLUMN public.notification_templates.template_key IS 'Unique identifier for programmatic template usage';