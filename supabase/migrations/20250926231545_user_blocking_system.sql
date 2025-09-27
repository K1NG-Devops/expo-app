-- =============================================
-- EduDash Pro: User Blocking System
-- Version: 1.0.0
-- Date: 2025-09-26
-- Purpose: Create comprehensive user blocking system for COPPA/GDPR compliance
-- WARP.md Compliance: Migration-only, production-safe, forward-only
-- =============================================

BEGIN;

-- ============================================================================
-- TABLE: USER_BLOCKS
-- Purpose: Track blocked users and user-generated content blocking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  block_type VARCHAR(50) DEFAULT 'user' CHECK (block_type IN ('user', 'content', 'communication')),
  reason VARCHAR(100),
  details TEXT,
  school_id UUID REFERENCES public.preschools(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- For temporary blocks
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Prevent users from blocking themselves and duplicate blocks
  CONSTRAINT user_blocks_no_self_block CHECK (blocker_id != blocked_id),
  CONSTRAINT user_blocks_unique UNIQUE (blocker_id, blocked_id, block_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_active ON public.user_blocks(is_active);
CREATE INDEX IF NOT EXISTS idx_user_blocks_school ON public.user_blocks(school_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_expires ON public.user_blocks(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_blocks_created ON public.user_blocks(created_at);

-- ============================================================================
-- TABLE: BLOCKED_CONTENT
-- Purpose: Track specific content blocks (messages, posts, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.blocked_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL CHECK (content_type IN ('lesson', 'homework', 'message', 'comment', 'announcement', 'activity', 'assessment')),
  content_id UUID NOT NULL,
  author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reason VARCHAR(100),
  school_id UUID REFERENCES public.preschools(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Prevent duplicate content blocks
  CONSTRAINT blocked_content_unique UNIQUE (blocker_id, content_type, content_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_blocked_content_blocker ON public.blocked_content(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_content_author ON public.blocked_content(author_id);
CREATE INDEX IF NOT EXISTS idx_blocked_content_type ON public.blocked_content(content_type, content_id);
CREATE INDEX IF NOT EXISTS idx_blocked_content_school ON public.blocked_content(school_id);
CREATE INDEX IF NOT EXISTS idx_blocked_content_active ON public.blocked_content(is_active);

-- ============================================================================
-- RPC FUNCTION: BLOCK_USER
-- Purpose: Block a user or their content
-- ============================================================================

CREATE OR REPLACE FUNCTION public.block_user(
  p_blocked_user_id UUID,
  p_block_type VARCHAR(50) DEFAULT 'user',
  p_reason VARCHAR(100) DEFAULT NULL,
  p_details TEXT DEFAULT NULL,
  p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_blocker_school_id UUID;
  v_blocked_school_id UUID;
  v_result JSONB;
BEGIN
  -- Validate input
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;
  
  IF p_blocked_user_id IS NULL THEN
    RETURN json_build_object('error', 'Blocked user ID is required');
  END IF;
  
  IF v_current_user_id = p_blocked_user_id THEN
    RETURN json_build_object('error', 'Cannot block yourself');
  END IF;
  
  -- Get school context for both users
  SELECT preschool_id INTO v_blocker_school_id
  FROM public.users WHERE id = v_current_user_id;
  
  SELECT preschool_id INTO v_blocked_school_id
  FROM public.users WHERE id = p_blocked_user_id;
  
  -- For COPPA compliance, ensure users can only block within their school context
  IF v_blocker_school_id IS NOT NULL AND v_blocked_school_id IS NOT NULL 
     AND v_blocker_school_id != v_blocked_school_id THEN
    RETURN json_build_object('error', 'Can only block users within your school');
  END IF;
  
  -- Insert or update block record
  INSERT INTO public.user_blocks (
    blocker_id,
    blocked_id,
    block_type,
    reason,
    details,
    school_id,
    expires_at,
    is_active
  ) VALUES (
    v_current_user_id,
    p_blocked_user_id,
    p_block_type,
    p_reason,
    p_details,
    COALESCE(v_blocker_school_id, v_blocked_school_id),
    p_expires_at,
    TRUE
  )
  ON CONFLICT (blocker_id, blocked_id, block_type)
  DO UPDATE SET
    reason = EXCLUDED.reason,
    details = EXCLUDED.details,
    updated_at = NOW(),
    expires_at = EXCLUDED.expires_at,
    is_active = TRUE;
  
  -- Log the action
  PERFORM create_system_notification(
    p_blocked_user_id,
    'User Interaction Update',
    'A user has limited communication with you. This does not affect your account status.',
    'user_blocking',
    json_build_object(
      'blocker_id', v_current_user_id,
      'block_type', p_block_type,
      'reason', p_reason
    )
  );
  
  v_result := json_build_object(
    'success', TRUE,
    'message', 'User blocked successfully',
    'block_type', p_block_type,
    'blocked_user_id', p_blocked_user_id
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: UNBLOCK_USER
-- Purpose: Unblock a previously blocked user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.unblock_user(
  p_blocked_user_id UUID,
  p_block_type VARCHAR(50) DEFAULT 'user'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_result JSONB;
BEGIN
  -- Validate input
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;
  
  -- Update block record to inactive
  UPDATE public.user_blocks
  SET 
    is_active = FALSE,
    updated_at = NOW()
  WHERE 
    blocker_id = v_current_user_id 
    AND blocked_id = p_blocked_user_id
    AND block_type = p_block_type
    AND is_active = TRUE;
  
  IF FOUND THEN
    v_result := json_build_object(
      'success', TRUE,
      'message', 'User unblocked successfully'
    );
  ELSE
    v_result := json_build_object(
      'error', 'Block record not found or already inactive'
    );
  END IF;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: GET_BLOCKED_USERS
-- Purpose: Get list of users blocked by current user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_blocked_users()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_blocks JSONB;
BEGIN
  -- Validate authentication
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;
  
  -- Get blocked users with details
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', ub.id,
      'blocked_user_id', ub.blocked_id,
      'blocked_user_name', COALESCE(u.first_name || ' ' || u.last_name, u.first_name, 'Unknown User'),
      'blocked_user_role', u.role,
      'block_type', ub.block_type,
      'reason', ub.reason,
      'created_at', ub.created_at,
      'expires_at', ub.expires_at,
      'school_name', COALESCE(p.name, 'Unknown School')
    )
  ) INTO v_blocks
  FROM public.user_blocks ub
  LEFT JOIN public.users u ON ub.blocked_id = u.id
  LEFT JOIN public.preschools p ON ub.school_id = p.id
  WHERE 
    ub.blocker_id = v_current_user_id 
    AND ub.is_active = TRUE
    AND (ub.expires_at IS NULL OR ub.expires_at > NOW())
  ORDER BY ub.created_at DESC;
  
  RETURN COALESCE(v_blocks, '[]'::jsonb);
END;
$$;

-- ============================================================================
-- RPC FUNCTION: IS_USER_BLOCKED
-- Purpose: Check if a user is blocked by current user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_user_blocked(
  p_user_id UUID,
  p_block_type VARCHAR(50) DEFAULT 'user'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_is_blocked BOOLEAN := FALSE;
BEGIN
  -- Check if user is blocked
  SELECT EXISTS(
    SELECT 1 FROM public.user_blocks
    WHERE 
      blocker_id = v_current_user_id
      AND blocked_id = p_user_id
      AND block_type = p_block_type
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  ) INTO v_is_blocked;
  
  RETURN v_is_blocked;
END;
$$;

-- ============================================================================
-- RPC FUNCTION: BLOCK_CONTENT
-- Purpose: Block specific content from a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.block_content(
  p_content_type VARCHAR(50),
  p_content_id UUID,
  p_author_id UUID DEFAULT NULL,
  p_reason VARCHAR(100) DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID := auth.uid();
  v_school_id UUID;
  v_result JSONB;
BEGIN
  -- Validate input
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('error', 'Authentication required');
  END IF;
  
  -- Get school context
  SELECT preschool_id INTO v_school_id
  FROM public.users WHERE id = v_current_user_id;
  
  -- Insert blocked content record
  INSERT INTO public.blocked_content (
    blocker_id,
    content_type,
    content_id,
    author_id,
    reason,
    school_id
  ) VALUES (
    v_current_user_id,
    p_content_type,
    p_content_id,
    p_author_id,
    p_reason,
    v_school_id
  )
  ON CONFLICT (blocker_id, content_type, content_id)
  DO UPDATE SET
    reason = EXCLUDED.reason,
    is_active = TRUE;
  
  v_result := json_build_object(
    'success', TRUE,
    'message', 'Content blocked successfully'
  );
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- TRIGGER: CLEANUP_EXPIRED_BLOCKS
-- Purpose: Automatically cleanup expired blocks
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_blocks()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update expired blocks to inactive
  UPDATE public.user_blocks
  SET is_active = FALSE, updated_at = NOW()
  WHERE expires_at IS NOT NULL 
    AND expires_at <= NOW() 
    AND is_active = TRUE;
  
  RETURN NULL;
END;
$$;

-- Create trigger to run cleanup periodically
CREATE OR REPLACE FUNCTION public.schedule_block_cleanup()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This would typically be called by a cron job or scheduled function
  PERFORM public.cleanup_expired_blocks();
END;
$$;

-- ============================================================================
-- GRANT NECESSARY PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.block_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.unblock_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_blocked_users TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_blocked TO authenticated;
GRANT EXECUTE ON FUNCTION public.block_content TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_block_cleanup TO authenticated;

-- ============================================================================
-- SET UP RLS POLICIES
-- ============================================================================

-- Enable RLS on user_blocks table
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocks (as blocker or blocked)
CREATE POLICY "Users can view blocks they created" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can view blocks against them" ON public.user_blocks
  FOR SELECT TO authenticated
  USING (blocked_id = auth.uid());

-- Users can create blocks
CREATE POLICY "Users can create blocks" ON public.user_blocks
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can update their own blocks
CREATE POLICY "Users can update their blocks" ON public.user_blocks
  FOR UPDATE TO authenticated
  USING (blocker_id = auth.uid());

-- Superadmins can manage all blocks
CREATE POLICY "Superadmins can manage all blocks" ON public.user_blocks
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  ));

-- Enable RLS on blocked_content table
ALTER TABLE public.blocked_content ENABLE ROW LEVEL SECURITY;

-- Users can view their own blocked content
CREATE POLICY "Users can view their blocked content" ON public.blocked_content
  FOR SELECT TO authenticated
  USING (blocker_id = auth.uid());

-- Users can create blocked content records
CREATE POLICY "Users can block content" ON public.blocked_content
  FOR INSERT TO authenticated
  WITH CHECK (blocker_id = auth.uid());

-- Users can update their blocked content
CREATE POLICY "Users can update their blocked content" ON public.blocked_content
  FOR UPDATE TO authenticated
  USING (blocker_id = auth.uid());

-- Superadmins can manage all blocked content
CREATE POLICY "Superadmins can manage blocked content" ON public.blocked_content
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'superadmin'
  ));

-- ============================================================================
-- LOG MIGRATION COMPLETION
-- ============================================================================

INSERT INTO public.config_kv (key, value, description, is_public)
VALUES (
  'user_blocking_system_20250926231545',
  json_build_object(
    'version', '1.0.0',
    'completed_at', NOW()::TEXT,
    'tables_created', json_build_array(
      'user_blocks',
      'blocked_content'
    ),
    'functions_created', json_build_array(
      'block_user',
      'unblock_user',
      'get_blocked_users',
      'is_user_blocked',
      'block_content',
      'cleanup_expired_blocks'
    ),
    'migration_file', '20250926231545_user_blocking_system.sql',
    'compliance', 'COPPA/GDPR compliant with school-scoped blocking'
  ),
  'User blocking system completion log',
  FALSE
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

SELECT 'USER BLOCKING SYSTEM COMPLETED' AS status;

COMMIT;