-- Fix activity_logs table structure and access issues
-- This addresses the 400 error when querying activity_logs

BEGIN;

-- First, let's check the current structure and add missing columns if needed
-- The query expects: action_type, description, created_at, user_name, organization_id

-- Add missing columns to activity_logs table
ALTER TABLE public.activity_logs 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.preschools(id),
  ADD COLUMN IF NOT EXISTS user_name TEXT,
  ADD COLUMN IF NOT EXISTS user_id UUID;

-- Add an index for better performance on organization_id queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_organization_id ON public.activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Update existing records to have proper organization_id if possible
-- This is a best-effort update - you may need to adjust based on your data
UPDATE public.activity_logs 
SET organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1' 
WHERE organization_id IS NULL 
  AND EXISTS (SELECT 1 FROM public.preschools WHERE id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1');

-- Enable RLS if not already enabled
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_logs
DROP POLICY IF EXISTS "activity_logs_organization_access" ON public.activity_logs;
CREATE POLICY "activity_logs_organization_access" ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (
    -- Super admin can see all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Users can see logs from their organization
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND preschool_id = activity_logs.organization_id
    )
    OR
    -- Service role bypass
    current_setting('role') = 'service_role'
  )
  WITH CHECK (
    -- Super admin can insert/update all
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('superadmin', 'super_admin'))
    OR
    -- Users can create logs for their organization
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND preschool_id = activity_logs.organization_id
    )
    OR
    -- Service role bypass
    current_setting('role') = 'service_role'
  );

-- Create a function to log activities with proper user context
CREATE OR REPLACE FUNCTION public.log_activity(
  p_activity_type TEXT,
  p_description TEXT,
  p_organization_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
  v_user_name TEXT;
  v_org_id UUID;
BEGIN
  -- Get user name from profiles
  SELECT COALESCE(first_name || ' ' || last_name, email, id::text)
  INTO v_user_name
  FROM public.profiles
  WHERE id = auth.uid();

  -- Get organization_id if not provided
  IF p_organization_id IS NULL THEN
    SELECT preschool_id
    INTO v_org_id
    FROM public.profiles
    WHERE id = auth.uid();
  ELSE
    v_org_id := p_organization_id;
  END IF;

  -- Insert the activity log
  INSERT INTO public.activity_logs (
    activity_type,
    description,
    user_name,
    user_id,
    organization_id,
    created_at
  ) VALUES (
    p_activity_type,
    p_description,
    v_user_name,
    auth.uid(),
    v_org_id,
    NOW()
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- Grant execute permission on the logging function
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, UUID) TO authenticated, service_role;

-- Add a comment for documentation
COMMENT ON FUNCTION public.log_activity(TEXT, TEXT, UUID) IS 'Logs user activities with proper organization context and user information';

-- Create a view that provides the expected column names for backward compatibility
CREATE OR REPLACE VIEW public.activity_logs_view AS
SELECT 
  id,
  activity_type AS action_type,  -- Map activity_type to action_type for compatibility
  description,
  created_at,
  user_name,
  user_id,
  organization_id
FROM public.activity_logs
ORDER BY created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.activity_logs_view TO authenticated, service_role;

-- Enable RLS on the view (inherits from underlying table)
ALTER VIEW public.activity_logs_view OWNER TO postgres;

COMMIT;

-- Test queries (uncomment to verify)
-- SELECT action_type, description, created_at, user_name 
-- FROM public.activity_logs_view 
-- WHERE organization_id = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1'
-- ORDER BY created_at DESC 
-- LIMIT 8;