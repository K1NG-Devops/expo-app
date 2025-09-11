/**
 * Role-Based Access Control (RBAC) System
 * 
 * Comprehensive permission system with role hierarchy, capability flags,
 * and organization-level access control for the EduDash platform.
 */

import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { reportError } from '@/lib/monitoring';
import { shouldAllowFallback, trackFallbackUsage } from '@/lib/security-config';
import { getCurrentSession } from '@/lib/sessionManager';
import type { UserProfile } from './sessionManager';

// Core role definitions with hierarchy (higher number = more permissions)
export const ROLES = {
  parent: { level: 1, name: 'parent', display: 'Parent' },
  teacher: { level: 2, name: 'teacher', display: 'Teacher' },
  principal_admin: { level: 3, name: 'principal_admin', display: 'Principal/Admin' },
  super_admin: { level: 4, name: 'super_admin', display: 'Super Admin' },
} as const;

export type Role = keyof typeof ROLES;
export type SeatStatus = 'active' | 'inactive' | 'pending' | 'revoked';
export type PlanTier = 'free' | 'starter' | 'premium' | 'enterprise';

// Comprehensive capability flags
export const CAPABILITIES = {
  // Core access capabilities
  view_dashboard: 'view_dashboard',
  access_mobile_app: 'access_mobile_app',
  
  // Organization-level capabilities
  view_organization_settings: 'view_organization_settings',
  manage_organization: 'manage_organization',
  invite_members: 'invite_members',
  manage_seats: 'manage_seats',
  
  // School/educational capabilities
  view_school_metrics: 'view_school_metrics',
  manage_teachers: 'manage_teachers',
  manage_students: 'manage_students',
  manage_classes: 'manage_classes',
  access_principal_hub: 'access_principal_hub',
  generate_school_reports: 'generate_school_reports',
  
  // Teaching capabilities
  create_assignments: 'create_assignments',
  grade_assignments: 'grade_assignments',
  view_class_analytics: 'view_class_analytics',
  communicate_with_parents: 'communicate_with_parents',
  
  // Parent capabilities
  view_child_progress: 'view_child_progress',
  communicate_with_teachers: 'communicate_with_teachers',
  access_homework_help: 'access_homework_help',
  
  // AI capabilities (tier-dependent)
  ai_lesson_generation: 'ai_lesson_generation',
  ai_grading_assistance: 'ai_grading_assistance',
  ai_homework_helper: 'ai_homework_helper',
  ai_stem_activities: 'ai_stem_activities',
  
  // Premium/Enterprise capabilities
  advanced_analytics: 'advanced_analytics',
  bulk_operations: 'bulk_operations',
  custom_reports: 'custom_reports',
  api_access: 'api_access',
  sso_access: 'sso_access',
  priority_support: 'priority_support',
  
  // Admin capabilities
  view_all_organizations: 'view_all_organizations',
  manage_billing: 'manage_billing',
  manage_subscriptions: 'manage_subscriptions',
  access_admin_tools: 'access_admin_tools',
  manage_feature_flags: 'manage_feature_flags',
  view_system_logs: 'view_system_logs',
} as const;

export type Capability = keyof typeof CAPABILITIES;

// Role-based capability mapping
const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  parent: [
    'view_dashboard',
    'access_mobile_app',
    'view_child_progress',
    'communicate_with_teachers',
    'access_homework_help',
  ],
  teacher: [
    'view_dashboard',
    'access_mobile_app',
    'manage_classes',
    'create_assignments',
    'grade_assignments',
    'view_class_analytics',
    'communicate_with_parents',
  ],
  principal_admin: [
    'view_dashboard',
    'access_mobile_app',
    'view_organization_settings',
    'invite_members',
    'manage_seats',
    'view_school_metrics',
    'manage_teachers',
    'manage_students',
    'manage_classes',
    'access_principal_hub',
    'generate_school_reports',
    'create_assignments',
    'grade_assignments',
    'view_class_analytics',
  ],
  super_admin: [
    'view_dashboard',
    'access_mobile_app',
    'view_all_organizations',
    'manage_organization',
    'manage_billing',
    'manage_subscriptions',
    'access_admin_tools',
    'manage_feature_flags',
    'view_system_logs',
    'advanced_analytics',
    'bulk_operations',
    'custom_reports',
    'api_access',
    'priority_support',
  ],
};

// Plan tier capability additions
const TIER_CAPABILITIES: Record<PlanTier, Capability[]> = {
  free: [
    'ai_homework_helper', // Limited usage
  ],
  starter: [
    'ai_homework_helper',
    'ai_lesson_generation', // Limited usage
  ],
  premium: [
    'ai_homework_helper',
    'ai_lesson_generation',
    'ai_grading_assistance',
    'ai_stem_activities',
    'advanced_analytics',
  ],
  enterprise: [
    'ai_homework_helper',
    'ai_lesson_generation',
    'ai_grading_assistance',
    'ai_stem_activities',
    'advanced_analytics',
    'bulk_operations',
    'custom_reports',
    'sso_access',
    'priority_support',
  ],
};

/**
 * Student record type with parent and guardian support
 */
export interface Student {
  id: string;
  created_at: string;
  updated_at: string;
  preschool_id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  parent_id?: string;
  guardian_id?: string; // New field for secondary parent/guardian
  parent_email?: string;
  class_id?: string;
  is_active: boolean;
}

/**
 * Enhanced user profile with complete RBAC information
 */
export interface EnhancedUserProfile extends UserProfile {
  // Organization membership
  organization_membership?: {
    organization_id: string;
    organization_name: string;
    plan_tier: PlanTier;
    seat_status: SeatStatus;
    invited_by?: string;
    joined_at: string;
  };
  
  // Complete capabilities list
  capabilities: Capability[];
  
  // Permission checking methods
  hasCapability: (capability: Capability) => boolean;
  hasRole: (role: Role) => boolean;
  hasRoleOrHigher: (role: Role) => boolean;
  isOrgMember: (orgId: string) => boolean;
  hasActiveSeat: () => boolean;
}

/**
 * Get comprehensive user capabilities based on role, organization, and subscription
 */
export async function getUserCapabilities(
  role: string,
  planTier?: string,
  seatStatus?: string
): Promise<Capability[]> {
  const normalizedRole = (normalizeRole(role) || 'parent') as Role;
  const capabilities = new Set<Capability>();
  
  // Add role-based capabilities
  if (normalizedRole && ROLE_CAPABILITIES[normalizedRole]) {
    ROLE_CAPABILITIES[normalizedRole].forEach(cap => capabilities.add(cap));
  }
  
  // Add tier-based capabilities (only if seat is active)
  if (planTier && seatStatus === 'active') {
    const tier = planTier as PlanTier;
    if (TIER_CAPABILITIES[tier]) {
      TIER_CAPABILITIES[tier].forEach(cap => capabilities.add(cap));
    }
  }
  
  return Array.from(capabilities);
}

/**
 * Normalize role strings to canonical format
 */
export function normalizeRole(role: string): Role | null {
  const normalized = role?.toLowerCase().trim();
  
  if (!normalized) return null;
  
  // Map various role formats to canonical roles
  if (normalized.includes('super') || normalized === 'superadmin') {
    return 'super_admin';
  }
  if (normalized.includes('principal') || normalized === 'admin') {
    return 'principal_admin';
  }
  if (normalized.includes('teacher')) {
    return 'teacher';
  }
  if (normalized.includes('parent')) {
    return 'parent';
  }
  
  return null;
}

/**
 * Create enhanced user profile with permission checking methods
 */
export function createEnhancedProfile(
  baseProfile: UserProfile,
  orgMembership?: any
): EnhancedUserProfile {
  const profile = baseProfile as EnhancedUserProfile;
  
  // Add organization membership details
  if (orgMembership) {
    profile.organization_membership = {
      organization_id: orgMembership.organization_id,
      organization_name: orgMembership.organization_name,
      plan_tier: orgMembership.plan_tier || 'free',
      seat_status: orgMembership.seat_status || 'inactive',
      invited_by: orgMembership.invited_by,
      joined_at: orgMembership.created_at,
    };
  }
  
  // Add permission checking methods
  profile.hasCapability = (capability: Capability): boolean => {
    return profile.capabilities?.includes(capability) || false;
  };
  
  profile.hasRole = (role: Role): boolean => {
    return normalizeRole(profile.role) === role;
  };
  
  profile.hasRoleOrHigher = (role: Role): boolean => {
    const userRole = normalizeRole(profile.role);
    if (!userRole) return false;
    
    return ROLES[userRole].level >= ROLES[role].level;
  };
  
  profile.isOrgMember = (orgId: string): boolean => {
    return profile.organization_membership?.organization_id === orgId;
  };
  
  profile.hasActiveSeat = (): boolean => {
    return profile.organization_membership?.seat_status === 'active';
  };
  
  return profile;
}

/**
 * Permission checking utilities for UI components
 */
export class PermissionChecker {
  constructor(private profile: EnhancedUserProfile | null) {
    // Security: Monitor creation of superadmin permission checkers
    if (this.profile && normalizeRole(this.profile.role) === 'super_admin') {
      track('edudash.security.superadmin_permissions_accessed', {
        user_id: this.profile.id,
        timestamp: new Date().toISOString(),
        context: 'permission_checker_created'
      });
    }
  }
  
  /**
   * Check if user has specific capability
   */
  can(capability: Capability): boolean {
    const hasCapability = this.profile?.hasCapability(capability) || false;
    
    // Security: Monitor access to sensitive capabilities
    const sensitiveCaps: Capability[] = [
      'view_all_organizations',
      'manage_organization', 
      'manage_billing',
      'manage_subscriptions',
      'access_admin_tools',
      'manage_feature_flags',
      'view_system_logs'
    ];
    
    if (hasCapability && sensitiveCaps.includes(capability) && this.profile) {
      track('edudash.security.sensitive_capability_accessed', {
        user_id: this.profile.id,
        capability,
        role: normalizeRole(this.profile.role),
        timestamp: new Date().toISOString()
      });
    }
    
    return hasCapability;
  }
  
  /**
   * Check if user has any of the specified capabilities
   */
  canAny(capabilities: Capability[]): boolean {
    return capabilities.some(cap => this.can(cap));
  }
  
  /**
   * Check if user has all specified capabilities
   */
  canAll(capabilities: Capability[]): boolean {
    return capabilities.every(cap => this.can(cap));
  }
  
  /**
   * Check if user has specific role
   */
  hasRole(role: Role): boolean {
    return this.profile?.hasRole(role) || false;
  }
  
  /**
   * Check if user has role or higher in hierarchy
   */
  hasRoleOrHigher(role: Role): boolean {
    return this.profile?.hasRoleOrHigher(role) || false;
  }
  
  /**
   * Check if user is member of specific organization
   */
  isMemberOf(orgId: string): boolean {
    return this.profile?.isOrgMember(orgId) || false;
  }
  
  /**
   * Check if user has active seat in their organization
   */
  hasActiveSeat(): boolean {
    return this.profile?.hasActiveSeat() || false;
  }
  
  /**
   * Get user's plan tier
   */
  getPlanTier(): PlanTier | null {
    return this.profile?.organization_membership?.plan_tier || null;
  }
  
  /**
   * Check if user's organization has specific plan tier or higher
   */
  hasPlanTier(tier: PlanTier): boolean {
    const userTier = this.getPlanTier();
    if (!userTier) return false;
    
    const tiers: PlanTier[] = ['free', 'starter', 'premium', 'enterprise'];
    const userTierIndex = tiers.indexOf(userTier);
    const requiredTierIndex = tiers.indexOf(tier);
    
    return userTierIndex >= requiredTierIndex;
  }
  
  /**
   * Get the enhanced profile (for backward compatibility)
   */
  get enhancedProfile(): EnhancedUserProfile | null {
    return this.profile;
  }
}

/**
 * Create permission checker instance
 */
export function createPermissionChecker(profile: EnhancedUserProfile | null): PermissionChecker {
  return new PermissionChecker(profile);
}

/**
 * Fetch complete user profile with organization membership and permissions
 */
export async function fetchEnhancedUserProfile(userId: string): Promise<EnhancedUserProfile | null> {
  try {
    console.log('Attempting to fetch profile for authenticated user');
    
    // SECURITY: Validate the requester identity as best as possible
    // Try multiple sources for current authenticated identity
    const { data: { session } } = await assertSupabase().auth.getSession();
    let sessionUserId: string | null = session?.user?.id ?? null;

    if (!sessionUserId) {
      // Fallback to getUser()
      try {
        const { data: { user } } = await assertSupabase().auth.getUser();
        if (user?.id) sessionUserId = user.id;
      } catch {}
    }

    // Also try stored session if needed
    let storedSession: import('@/lib/sessionManager').UserSession | null = null;
    if (!sessionUserId) {
      try {
        storedSession = await getCurrentSession();
        if (storedSession?.user_id) sessionUserId = storedSession.user_id;
      } catch {}
    }

    // If we have an authenticated identity and it mismatches, block
    if (sessionUserId && sessionUserId !== userId) {
      console.error('User ID mismatch - cannot fetch profile for different user');
      reportError(new Error('Profile fetch attempted for different user'), {
        requestedUserId: userId,
        sessionUserId,
      });
      return null;
    }
    
    // Try to get the profile with a more permissive approach
    // First, let's try without RLS constraints by using a function call
    let profile = null;
    let profileError = null;
    
    // Production: Use secure profile fetching without debug logging

    // Preferred: Use secure RPC that returns the caller's profile (bypasses RLS safely)
    const { data: rpcProfile, error: rpcError } = await assertSupabase()
      .rpc('get_my_profile')
      .single();

    if (rpcProfile && (rpcProfile as any).id) {
      profile = rpcProfile as any;
      console.log('RPC get_my_profile succeeded');
    } else {
      profileError = rpcError;
      console.log('RPC get_my_profile failed or returned null');
      
      // Try the direct bypass function as a test
      try {
        const { data: directProfile } = await assertSupabase()
          .rpc('debug_get_profile_direct', { target_auth_id: userId })
          .single();
        console.log('Direct profile fetch completed');
        if (directProfile && (directProfile as any).id) {
          profile = directProfile as any;
          console.log('Using direct profile as fallback');
        }
      } catch (directError) {
        console.log('Direct profile fetch failed:', directError);
      }
    }
    
    if (!profile) {
      console.error('Failed to fetch basic user profile:', profileError);
      
      // SECURITY: Check if fallback is allowed for this session
      const sessionToken = session?.access_token || storedSession?.access_token || '';
      const sessionId = sessionToken ? sessionToken.substring(0, 32) : '';
      if (!sessionId || !shouldAllowFallback(sessionId)) {
        console.error('SECURITY: Fallback profile not allowed - returning null');
        return null;
      }
      
      // Track fallback usage for rate limiting
      trackFallbackUsage(sessionId);
      
      // SECURITY: Create minimal fallback profile with restricted permissions
      // Use actual authenticated user data, not hardcoded values
      if (!session?.user) {
        return null;
      }
      const fallbackProfile: UserProfile = {
        id: session.user.id, // Use actual authenticated user ID
        email: session.user.email || 'unknown@example.com', // Use actual email
        role: 'parent' as any, // DEFAULT TO LOWEST PRIVILEGE ROLE
        first_name: 'User',
        last_name: '',
        avatar_url: undefined,
        organization_id: undefined,
        organization_name: undefined,
        seat_status: 'inactive' as any, // INACTIVE by default for security
        capabilities: [], // NO CAPABILITIES by default
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      
      const enhancedFallback = createEnhancedProfile(fallbackProfile, {
        organization_id: null,
        organization_name: null,
        plan_tier: 'free',
        seat_status: 'inactive', // INACTIVE seat status
        invited_by: null,
        created_at: new Date().toISOString(),
      });
      
      // Log security event for monitoring
      track('edudash.security.fallback_profile_used', {
        user_id: session.user.id,
        email: session.user.email,
        reason: 'database_access_failed',
        timestamp: new Date().toISOString(),
      });
      
      console.warn('SECURITY: Using fallback profile with minimal permissions');
      return enhancedFallback;
    }
    
    console.log('Successfully fetched profile');
    
    // Process the real profile data
    // Get organization membership if user has a preschool_id
    let orgMember = null;
    let org = null;
    
    if (profile.preschool_id) {
      // Try to get organization membership
      const { data: memberData, error: memberErr } = await assertSupabase()
        .rpc('get_my_org_member', { p_org_id: profile.preschool_id as any })
        .single();
      
      if (memberData) {
        orgMember = memberData as any;
        
        // Get organization details from preschools table
        const { data: orgData } = await assertSupabase()
          .from('preschools')
          .select('id, name')
          .eq('id', profile.preschool_id)
          .limit(1);
          
        if (orgData && orgData.length > 0) {
          org = { ...orgData[0], plan_tier: 'free' };
        }
      }
    }
    
    // Get capabilities based on role
    const capabilities = await getUserCapabilities(
      profile.role,
      org?.plan_tier || 'free',
      orgMember?.seat_status
    );
    
    // Create base profile from database data
    const baseProfile: UserProfile = {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      organization_id: orgMember?.organization_id || profile.preschool_id,
      organization_name: org?.name,
      seat_status: orgMember?.seat_status || 'active',
      capabilities,
      created_at: profile.created_at,
      last_login_at: profile.last_login_at,
    };
    
    // Create enhanced profile
    const enhancedProfile = createEnhancedProfile(baseProfile, {
      organization_id: orgMember?.organization_id || profile.preschool_id,
      organization_name: org?.name,
      plan_tier: org?.plan_tier || 'free',
      seat_status: orgMember?.seat_status || 'active',
      invited_by: orgMember?.invited_by,
      created_at: orgMember?.created_at,
    });
    
    // Track profile fetch for analytics with security monitoring
    track('edudash.rbac.profile_fetched', {
      user_id: userId,
      role: normalizeRole(profile.role) || 'unknown',
      has_org: !!orgMember || !!profile.preschool_id,
      seat_status: orgMember?.seat_status || 'active',
      plan_tier: org?.plan_tier || 'free',
      capabilities_count: capabilities.length,
      database_success: true,
    });
    
    // Special monitoring for superadmin access
    if (normalizeRole(profile.role) === 'super_admin') {
      track('edudash.security.superadmin_access', {
        user_id: userId,
        timestamp: new Date().toISOString(),
        session_source: 'profile_fetch'
      });
      
      console.warn('SECURITY: Super admin profile accessed - monitoring enabled');
    }
    
    return enhancedProfile;
  } catch (error) {
    console.error('Error in fetchEnhancedUserProfile:', error);
    reportError(new Error('Failed to fetch enhanced user profile'), {
      userId,
      error,
    });
    
    // SECURITY: Validate authentication before returning error fallback
    const { data: { session } } = await assertSupabase().auth.getSession();

    // Allow stored session for error fallback as well
    let sessionUserId: string | null = session?.user?.id ?? null;
    let storedSession: import('@/lib/sessionManager').UserSession | null = null;
    if (!sessionUserId) {
      try {
        storedSession = await getCurrentSession();
        if (storedSession?.user_id) sessionUserId = storedSession.user_id;
      } catch {}
    }

    if (!sessionUserId || sessionUserId !== userId) {
      console.error('Authentication validation failed in error handler');
      return null; // No fallback for unauthenticated users
    }

    // Return MINIMAL fallback profile on error
    if (!session?.user) {
      return null;
    }
    const fallbackProfile: UserProfile = {
      id: session.user.id,
      email: session.user.email || 'unknown@example.com',
      role: 'parent' as any, // LOWEST PRIVILEGE ROLE
      first_name: 'User',
      last_name: '',
      avatar_url: undefined,
      organization_id: undefined,
      organization_name: undefined,
      seat_status: 'inactive' as any, // INACTIVE for security
      capabilities: [], // NO CAPABILITIES
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    };
    
    const enhancedFallback = createEnhancedProfile(fallbackProfile, {
      organization_id: null,
      organization_name: null,
      plan_tier: 'free',
      seat_status: 'inactive',
      invited_by: null,
      created_at: new Date().toISOString(),
    });
    
    // Log security event
    const sessionToken = session?.access_token || storedSession?.access_token || '';
    const sessionId = sessionToken ? sessionToken.substring(0, 32) : '';
    if (sessionId) {
      trackFallbackUsage(sessionId);
    }

    track('edudash.security.error_fallback_profile_used', {
      user_id: sessionUserId,
      email: session?.user?.email || storedSession?.email,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
    
    console.warn('SECURITY: Using error fallback profile with minimal permissions');
    return enhancedFallback;
  }
}

/**
 * Audit permission changes
 */
export async function auditPermissionChange(
  userId: string,
  action: string,
  details: Record<string, any>
): Promise<void> {
  try {
    // Log to analytics
    track('edudash.rbac.permission_change', {
      user_id: userId,
      action,
      ...details,
      timestamp: new Date().toISOString(),
    });
    
    // Could also log to a dedicated audit table if needed
    console.log('Permission audit:', { userId, action, details });
  } catch (error) {
    reportError(new Error('Failed to audit permission change'), {
      userId,
      action,
      details,
      error,
    });
  }
}

/**
 * Create SecurityContext from EnhancedUserProfile
 * Used to integrate RBAC with security utilities
 */
export function createSecurityContext(profile: EnhancedUserProfile | null): any | null {
  if (!profile) return null;
  
  return {
    userId: profile.id,
    role: normalizeRole(profile.role) as Role,
    organizationId: profile.organization_id,
    capabilities: profile.capabilities,
    seatStatus: profile.seat_status,
  };
}

/**
 * Get secure database instance for user profile
 */
export function getSecureDatabase(profile: EnhancedUserProfile | null) {
  const context = createSecurityContext(profile);
  if (!context) {
    throw new Error('Cannot create secure database without valid user profile');
  }
  
  // Import dynamically to avoid circular dependencies
  const { createSecureDatabase } = require('@/lib/security');
  return createSecureDatabase(context);
}
