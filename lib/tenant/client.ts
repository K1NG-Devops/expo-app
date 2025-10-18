/**
 * Client-side tenant context helpers for multi-tenant isolation
 * Provides consistent access to current school/organization ID across the app
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getActiveOrganizationId, extractOrganizationId } from './compat';
import type { OrganizationType } from './types';

export type TenantInfo = {
  organizationId: string;
  organizationName?: string;
  organizationType?: OrganizationType;
  role: string;
  permissions: string[];
  /** @deprecated Use organizationId instead */
  schoolId: string;
  /** @deprecated Use organizationName instead */
  schoolName?: string;
};

/**
 * Hook to get current active organization ID for the authenticated user
 * Returns null if no organization is assigned or user is not authenticated
 */
export function useActiveOrganizationId(): string | null {
  const { user, profile } = useAuth();
  return getActiveOrganizationId(profile || user?.user_metadata);
}

/**
 * @deprecated Use useActiveOrganizationId instead
 * Hook to get current active school ID for the authenticated user
 * Returns null if no school is assigned or user is not authenticated
 */
export function useActiveSchoolId(): string | null {
  return useActiveOrganizationId();
}

/**
 * Hook to get comprehensive tenant information
 */
export function useTenantInfo(): {
  tenantInfo: TenantInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const { user, profile, loading: authLoading } = useAuth();
  const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTenantInfo = useCallback(async () => {
    if (!user || authLoading) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get organization ID from profile (primary source)
      let organizationId = getActiveOrganizationId(profile);
      let organizationName = profile?.organization_name;
      let organizationType: OrganizationType | undefined = (profile as any)?.organization_type;
      const role = profile?.role || 'unknown';

      // If not in profile, query profiles table
      if (!organizationId) {
        const { data: userProfile, error: userError } = await assertSupabase()
          .from('profiles')
          .select('preschool_id, organization_id, role')
          .eq('id', user.id)
          .single();

        if (userError) {
          throw new Error(`Failed to fetch user profile: ${userError.message}`);
        }

        organizationId = extractOrganizationId(userProfile);
      }

      // If still no organization ID, user might not be assigned to an organization
      if (!organizationId) {
        setTenantInfo(null);
        track('tenant.no_organization_assigned', { user_id: user.id, role });
        return;
      }

      // Get organization details if we don't have them
      if (!organizationName || !organizationType) {
        // Try organizations table first (new standard)
        const { data: orgData, error: orgError } = await assertSupabase()
          .from('organizations')
          .select('name, type')
          .eq('id', organizationId)
          .single();

        if (!orgError && orgData) {
          organizationName = orgData.name;
          organizationType = orgData.type as OrganizationType;
        } else {
          // Fallback: try preschools table (legacy)
          const { data: schoolData, error: schoolError } = await assertSupabase()
            .from('preschools')
            .select('name')
            .eq('id', organizationId)
            .single();

          if (!schoolError && schoolData) {
            organizationName = schoolData.name;
            organizationType = 'preschool'; // Default type for legacy preschools
          }
        }
      }

      // Get user permissions/capabilities
      const permissions = profile?.capabilities || [];

      const info: TenantInfo = {
        organizationId,
        organizationName,
        organizationType,
        role,
        permissions,
        // Legacy compatibility
        schoolId: organizationId,
        schoolName: organizationName,
      };

      setTenantInfo(info);
      
      track('tenant.context_loaded', {
        user_id: user.id,
        organization_id: organizationId,
        organization_type: organizationType,
        role,
        permissions_count: permissions.length,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tenant info';
      setError(errorMessage);
      console.error('Error fetching tenant info:', err);
      
      track('tenant.load_error', {
        user_id: user.id,
        error: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }, [user, profile, authLoading]);

  useEffect(() => {
    fetchTenantInfo();
  }, [fetchTenantInfo]);

  return {
    tenantInfo,
    loading,
    error,
    refetch: fetchTenantInfo,
  };
}

/**
 * Validate that current user has access to a specific organization
 */
export function useValidateOrganizationAccess() {
  const { user, profile } = useAuth();
  
  return useCallback(async (organizationId: string): Promise<boolean> => {
    if (!user || !organizationId) return false;
    
    // Super admins can access any organization
    if (profile?.role === 'super_admin') return true;
    
    // Check if user belongs to this organization
    const userOrgId = getActiveOrganizationId(profile);
    if (userOrgId === organizationId) return true;
    
    // Additional check for cross-organization access (e.g., district admin)
    try {
      const { data, error } = await assertSupabase()
        .from('user_organization_memberships')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .single();
        
      return !error && !!data;
    } catch {
      // Fallback: try legacy school memberships table
      try {
        const { data, error } = await assertSupabase()
          .from('user_school_memberships')
          .select('school_id')
          .eq('user_id', user.id)
          .eq('school_id', organizationId)
          .eq('status', 'active')
          .single();
          
        return !error && !!data;
      } catch {
        return false;
      }
    }
  }, [user, profile]);
}

/**
 * @deprecated Use useValidateOrganizationAccess instead
 */
export function useValidateSchoolAccess() {
  return useValidateOrganizationAccess();
}

/**
 * Ensure query is properly tenant-scoped
 * Throws error if organizationId is missing for non-super-admin users
 */
export function ensureTenantScope(organizationId: string | null, userRole?: string): string {
  if (userRole === 'super_admin') {
    // Super admins can operate without tenant scope in some cases
    if (!organizationId) {
      throw new Error('Organization ID required even for super admin operations');
    }
  }
  
  if (!organizationId) {
    throw new Error('Organization ID is required for this operation');
  }
  
  return organizationId;
}

/**
 * Get current organization ID or throw error if not available
 */
export function requireOrganizationId(profile: any): string {
  const organizationId = getActiveOrganizationId(profile);
  
  if (!organizationId) {
    throw new Error('No organization assigned to current user');
  }
  
  return organizationId;
}

/**
 * @deprecated Use requireOrganizationId instead
 */
export function requireSchoolId(profile: any): string {
  return requireOrganizationId(profile);
}
