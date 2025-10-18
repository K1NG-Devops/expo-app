/**
 * Server-side tenant context helpers for multi-tenant isolation
 * NOTE: This is adapted for React Native/Expo app context
 * For true server-side operations (when/if we add server actions), use proper cookies
 */

import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getActiveOrganizationId, extractOrganizationId } from './compat';
import type { OrganizationType } from './types';

export type ServerTenantContext = {
  organizationId: string;
  organizationType?: OrganizationType;
  userId: string;
  role: string;
  capabilities?: string[];
  /** @deprecated Use organizationId instead */
  schoolId: string;
};

/**
 * Get tenant context from user session
 * This works in React Native context where we have access to the authenticated Supabase client
 */
export async function getTenantContext(): Promise<ServerTenantContext | null> {
  try {
    // Get current authenticated user
    const { data: { user }, error: userError } = await assertSupabase().auth.getUser();
    
    if (userError || !user) {
      console.warn('No authenticated user found');
      return null;
    }

    // Get user profile with organization info
    const { data: profile, error: profileError } = await assertSupabase()
      .from('profiles')
      .select(`
        preschool_id,
        organization_id,
        role,
        capabilities
      `)
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch user profile:', profileError);
      return null;
    }

    const organizationId = extractOrganizationId(profile);
    if (!organizationId) {
      console.warn('User has no organization assigned');
      return null;
    }

    // Try to get organization type
    let organizationType: OrganizationType | undefined;
    const { data: orgData } = await assertSupabase()
      .from('organizations')
      .select('type')
      .eq('id', organizationId)
      .single();
    
    if (orgData) {
      organizationType = orgData.type as OrganizationType;
    } else {
      // Fallback: assume preschool for legacy data
      organizationType = 'preschool';
    }

    return {
      organizationId,
      organizationType,
      userId: user.id,
      role: profile.role,
      capabilities: profile.capabilities || [],
      // Legacy compatibility
      schoolId: organizationId,
    };
  } catch (error) {
    console.error('Error getting tenant context:', error);
    return null;
  }
}

/**
 * Validate organization access for current user
 */
export async function validateOrganizationAccess(organizationId: string): Promise<boolean> {
  try {
    const context = await getTenantContext();
    
    if (!context) {
      return false;
    }

    // Super admins can access any organization
    if (context.role === 'super_admin') {
      return true;
    }

    // Check if user belongs to this organization
    if (context.organizationId === organizationId) {
      return true;
    }

    // Check for cross-organization membership
    const { data: membership } = await assertSupabase()
      .from('user_organization_memberships')
      .select('organization_id')
      .eq('user_id', context.userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (membership) return true;

    // Fallback: check legacy school memberships
    const { data: legacyMembership } = await assertSupabase()
      .from('user_school_memberships')
      .select('school_id')
      .eq('user_id', context.userId)
      .eq('school_id', organizationId)
      .eq('status', 'active')
      .single();

    return !!legacyMembership;
  } catch (error) {
    console.error('Error validating organization access:', error);
    return false;
  }
}

/**
 * @deprecated Use validateOrganizationAccess instead
 */
export async function validateSchoolAccess(schoolId: string): Promise<boolean> {
  return validateOrganizationAccess(schoolId);
}

/**
 * Get organization context with validation
 * Throws error if user doesn't have access
 */
export async function requireOrganizationAccess(organizationId: string): Promise<ServerTenantContext> {
  const context = await getTenantContext();
  
  if (!context) {
    throw new Error('User not authenticated');
  }

  const hasAccess = await validateOrganizationAccess(organizationId);
  
  if (!hasAccess) {
    // Log security event
    track('security.unauthorized_organization_access', {
      user_id: context.userId,
      requested_organization_id: organizationId,
      user_organization_id: context.organizationId,
      role: context.role,
    });
    
    throw new Error('Access denied to requested organization');
  }

  return {
    ...context,
    organizationId, // Use the requested organization ID
    schoolId: organizationId, // Legacy compatibility
  };
}

/**
 * @deprecated Use requireOrganizationAccess instead
 */
export async function requireSchoolAccess(schoolId: string): Promise<ServerTenantContext> {
  return requireOrganizationAccess(schoolId);
}

/**
 * Create tenant-scoped Supabase query builder
 */
export function createTenantQuery(tableName: string, organizationId: string, preferLegacy: boolean = true) {
  // For backward compatibility, default to preschool_id unless table is migrated
  const fieldName = preferLegacy ? 'preschool_id' : 'organization_id';
  
  return assertSupabase()
    .from(tableName)
    .select('*')
    .eq(fieldName, organizationId) as any;
}

/**
 * Create tenant-scoped query with RLS enforcement
 * This adds the organization_id/preschool_id filter and relies on RLS for additional security
 */
export class TenantQueryBuilder {
  private organizationId: string;
  private context: ServerTenantContext;

  constructor(context: ServerTenantContext) {
    this.organizationId = context.organizationId;
    this.context = context;
  }

  /**
   * Create base query for any table with tenant scoping
   * Uses preschool_id by default for backward compatibility
   */
  table(tableName: string, preferLegacy: boolean = true) {
    const fieldName = preferLegacy ? 'preschool_id' : 'organization_id';
    
    return assertSupabase()
      .from(tableName)
      .select('*')
      .eq(fieldName, this.organizationId) as any;
  }

  /**
   * Petty cash transactions query
   */
  pettyCashTransactions() {
    return this.table('petty_cash_transactions');
  }

  /**
   * Petty cash accounts query
   */
  pettyCashAccounts() {
    return this.table('petty_cash_accounts');
  }

  /**
   * Petty cash receipts query
   */
  pettyCashReceipts() {
    return this.table('petty_cash_receipts');
  }

  /**
   * Students query
   */
  students() {
    return this.table('students');
  }

  /**
   * Teachers query
   */
  teachers() {
    return this.table('teachers');
  }

  /**
   * Classes query
   */
  classes() {
    return this.table('classes');
  }

  /**
   * School settings query
   */
  schoolSettings() {
    return this.table('school_settings');
  }

  /**
   * Financial transactions query
   */
  financialTransactions() {
    return this.table('financial_transactions');
  }

  /**
   * Insert with automatic tenant scoping
   */
  async insert(tableName: string, data: any, preferLegacy: boolean = true) {
    const fieldName = preferLegacy ? 'preschool_id' : 'organization_id';
    
    const insertData = {
      ...data,
      [fieldName]: this.organizationId,
      created_by: data.created_by || this.context.userId,
    };

    return assertSupabase()
      .from(tableName)
      .insert(insertData);
  }

  /**
   * Update with tenant validation
   */
  async update(tableName: string, data: any, filters: Record<string, any>, preferLegacy: boolean = true) {
    const fieldName = preferLegacy ? 'preschool_id' : 'organization_id';
    
    return assertSupabase()
      .from(tableName)
      .update(data)
      .eq(fieldName, this.organizationId)
      .match(filters);
  }

  /**
   * Delete with tenant validation
   */
  async delete(tableName: string, filters: Record<string, any>, preferLegacy: boolean = true) {
    const fieldName = preferLegacy ? 'preschool_id' : 'organization_id';
    
    return assertSupabase()
      .from(tableName)
      .delete()
      .eq(fieldName, this.organizationId)
      .match(filters);
  }
}

/**
 * Create tenant query builder with context
 */
export async function createTenantQueryBuilder(organizationId?: string): Promise<TenantQueryBuilder> {
  const context = await getTenantContext();
  
  if (!context) {
    throw new Error('User not authenticated');
  }

  // Use provided organization ID or user's default organization
  const targetOrgId = organizationId || context.organizationId;
  
  // Validate access if different from user's default organization
  if (organizationId && organizationId !== context.organizationId) {
    const hasAccess = await validateOrganizationAccess(organizationId);
    if (!hasAccess) {
      throw new Error('Access denied to requested organization');
    }
  }

  return new TenantQueryBuilder({
    ...context,
    organizationId: targetOrgId,
    schoolId: targetOrgId, // Legacy compatibility
  });
}

/**
 * Execute function with tenant context
 * Provides consistent error handling and logging
 */
export async function withTenantContext<T>(
  organizationId: string,
  fn: (context: ServerTenantContext, queryBuilder: TenantQueryBuilder) => Promise<T>
): Promise<T> {
  try {
    const context = await requireOrganizationAccess(organizationId);
    const queryBuilder = new TenantQueryBuilder(context);
    
    return await fn(context, queryBuilder);
  } catch (error) {
    console.error('Tenant context operation failed:', error);
    
    // Track error for monitoring
    const context = await getTenantContext();
    if (context) {
      track('tenant.operation_error', {
        user_id: context.userId,
        organization_id: organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    throw error;
  }
}
