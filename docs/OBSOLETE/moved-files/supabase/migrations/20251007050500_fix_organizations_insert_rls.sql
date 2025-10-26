-- =============================================================
-- 2025-10-07: Fix organizations RLS to allow safe INSERT by creator
-- Context: Org onboarding screen inserts into public.organizations with created_by = auth.uid()
-- Problem: Existing policy required new row id = current_user_org_id(), blocking INSERTs
-- Solution: Split policies by command, allow INSERT when created_by = auth.uid(),
--           restrict UPDATE within same org for principals, keep superadmin full access.
--           Also grant service_role full access for server-side jobs.
-- =============================================================

BEGIN;

-- Drop conflicting legacy policies
DROP POLICY IF EXISTS organizations_rls_write ON public.organizations;
DROP POLICY IF EXISTS organizations_rls_read ON public.organizations;

-- Read: authenticated users can read their own organization; superadmin can read all
CREATE POLICY organizations_select_self_or_superadmin
ON public.organizations
FOR SELECT
TO authenticated
USING (
  app_auth.is_superadmin() OR app_auth.has_org_access(id)
);

-- Insert: allow authenticated users to create an organization record they own
-- Guard by created_by = auth.uid() to prevent cross-tenant insertion
CREATE POLICY organizations_insert_own
ON public.organizations
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
);

-- Update: principals can manage within their organization; superadmin bypass
CREATE POLICY organizations_update_admins
ON public.organizations
FOR UPDATE
TO authenticated
USING (
  app_auth.is_superadmin() OR (app_auth.has_org_access(id) AND app_auth.is_principal())
)
WITH CHECK (
  app_auth.is_superadmin() OR (app_auth.has_org_access(id) AND app_auth.is_principal())
);

-- Delete: restrict to superadmin only (defensive hardening)
CREATE POLICY organizations_delete_superadmin
ON public.organizations
FOR DELETE
TO authenticated
USING (app_auth.is_superadmin());

-- Service role: full access for backend jobs and edge functions
CREATE POLICY organizations_service_role_full
ON public.organizations
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMIT;