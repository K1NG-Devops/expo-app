-- RBAC-safe update function for school settings
-- Allows principals/principal_admins (of the same school) and superadmins to update preschools.settings
-- Whitelists allowed top-level keys and performs a shallow merge (server becomes source of truth)

CREATE OR REPLACE FUNCTION public.update_school_settings(
  p_preschool_id UUID,
  p_patch JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
  v_org UUID;
  v_current JSONB;
  v_allowed_patch JSONB;
  v_merged JSONB;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Fetch current user's role and organization
  SELECT role, organization_id
  INTO v_role, v_org
  FROM profiles
  WHERE id = v_user_id;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'profile not found';
  END IF;

  -- Role-based access control
  IF v_role NOT IN ('superadmin','principal_admin','principal') THEN
    RAISE EXCEPTION 'insufficient permissions';
  END IF;

  -- Non-superadmin can only update their own school
  IF v_role <> 'superadmin' AND v_org IS DISTINCT FROM p_preschool_id THEN
    RAISE EXCEPTION 'access denied for school';
  END IF;

  -- Load current settings (JSONB)
  SELECT COALESCE(settings, '{}'::jsonb)
  INTO v_current
  FROM preschools
  WHERE id = p_preschool_id;

  -- Whitelist allowed top-level keys
  WITH allowed AS (
    SELECT key, value
    FROM jsonb_each(COALESCE(p_patch, '{}'::jsonb))
    WHERE key IN (
      'schoolName','schoolLogo','primaryColor','secondaryColor','timezone','currency',
      'features','display','permissions','notifications','backup','whatsapp_number'
    )
  )
  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO v_allowed_patch
  FROM allowed;

  -- Shallow merge (server-side)
  v_merged := v_current || v_allowed_patch;

  UPDATE preschools
  SET settings = v_merged
  WHERE id = p_preschool_id;

  -- Best-effort audit log (ignore if table doesn't exist)
  BEGIN
    INSERT INTO audit_logs (admin_user_id, action, details)
    VALUES (
      v_user_id,
      'update_school_settings',
      jsonb_build_object(
        'preschool_id', p_preschool_id,
        'patch', v_allowed_patch
      )
    );
  EXCEPTION WHEN undefined_table THEN
    -- audit_logs table not present; ignore
    NULL;
  END;

  RETURN v_merged;
END;
$$;

COMMENT ON FUNCTION public.update_school_settings(UUID, JSONB) IS 'RBAC-safe update of preschools.settings; merges allowed keys only and enforces role-based access.';

GRANT EXECUTE ON FUNCTION public.update_school_settings(UUID, JSONB) TO authenticated;
