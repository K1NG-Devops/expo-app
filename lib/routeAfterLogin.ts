import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { track } from '@/lib/analytics';
import { reportError } from '@/lib/monitoring';
import { fetchEnhancedUserProfile, type EnhancedUserProfile, type Role } from '@/lib/rbac';
import type { User } from '@supabase/supabase-js';

function normalizeRole(r?: string | null): string | null {
  if (!r) return null;
  const s = String(r).trim().toLowerCase();
  // Map potential variants to canonical
  if (s.includes('super')) return 'superadmin';
  if (s.includes('principal')) return 'principal';
  if (s === 'admin' || s.includes('school admin')) return 'admin';
  if (s.includes('teacher')) return 'teacher';
  if (s.includes('parent')) return 'parent';
  return s as any;
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use fetchEnhancedUserProfile from RBAC instead
 */
export async function detectRoleAndSchool(user?: User | null): Promise<{ role: string | null; school: string | null }> {
  // Use provided user or fetch from auth
  let authUser = user;
  if (!authUser) {
    const { data: { user: fetchedUser } } = await supabase!.auth.getUser();
    authUser = fetchedUser;
  }
  
  const id = authUser?.id;
  let role: string | null = normalizeRole((authUser?.user_metadata as any)?.role ?? null);
  let school: string | null = (authUser?.user_metadata as any)?.preschool_id ?? null;

  // First fallback: check consolidated users table by auth_user_id
  if (id && (!role || school === null)) {
    try {
      const { data: udata, error: uerror } = await supabase!
        .from('users')
        .select('role,preschool_id')
        .eq('auth_user_id', id)
        .maybeSingle();
      if (!uerror && udata) {
        role = normalizeRole((udata as any).role ?? role);
        school = (udata as any).preschool_id ?? school;
      }
    } catch {}
  }

  // Second fallback: legacy profiles table by id/user_id
  if (id && (!role || school === null)) {
    try {
      let data: any = null; let error: any = null;
      ({ data, error } = await supabase!.from('profiles').select('role,preschool_id').eq('id', id).maybeSingle());
      if ((!data || error) && id) {
        ({ data, error } = await supabase!.from('profiles').select('role,preschool_id').eq('user_id', id).maybeSingle());
      }
      if (!error && data) {
        role = normalizeRole((data as any).role ?? role);
        school = (data as any).preschool_id ?? school;
      }
    } catch {}
  }
  return { role, school };
}

/**
 * Enhanced post-login routing with comprehensive RBAC integration
 * Routes users to appropriate dashboard based on their role, capabilities, and organization membership
 */
export async function routeAfterLogin(user?: User | null, profile?: EnhancedUserProfile | null) {
  try {
    const userId = user?.id;
    if (!userId) {
      console.error('No user ID provided for post-login routing');
      router.replace('/landing');
      return;
    }

    // Fetch enhanced profile if not provided
    let enhancedProfile = profile;
    if (!enhancedProfile) {
      enhancedProfile = await fetchEnhancedUserProfile(userId);
    }

    if (!enhancedProfile) {
      console.error('Failed to fetch user profile for routing');
      track('edudash.auth.route_failed', {
        user_id: userId,
        reason: 'no_profile',
      });
      router.replace('/profiles-gate'); // Route to profile setup
      return;
    }

    // Determine route based on enhanced profile
    const route = determineUserRoute(enhancedProfile);
    
    // Track routing decision
    track('edudash.auth.route_after_login', {
      user_id: userId,
      role: enhancedProfile.role,
      organization_id: enhancedProfile.organization_id,
      seat_status: enhancedProfile.seat_status,
      plan_tier: enhancedProfile.organization_membership?.plan_tier,
      route: route.path,
      has_params: !!route.params,
    });

    // Navigate to determined route (with params if needed)
    if (route.params) {
      router.replace({ pathname: route.path as any, params: route.params } as any);
    } else {
      router.replace(route.path as any);
    }
  } catch (error) {
    reportError(new Error('Post-login routing failed'), {
      userId: user?.id,
      error,
    });
    
    // Fallback to safe route
    router.replace('/landing');
  }
}

/**
 * Determine the appropriate route for a user based on their enhanced profile
 */
function determineUserRoute(profile: EnhancedUserProfile): { path: string; params?: Record<string, string> } {
  let role = normalizeRole(profile.role) as Role;
  
  // Safeguard: If role is null/undefined, default to parent
  if (!role || role === null) {
    console.warn('User role is null, defaulting to parent for routing');
    role = 'parent';
  }
  
  // Check if user has active access
  if (!profile.hasCapability('access_mobile_app')) {
    return { path: '/account' }; // Route to account settings to resolve access issues
  }

  // Route based on role and capabilities
  switch (role) {
    case 'superadmin':
    case 'super_admin':
      return { path: '/screens/super-admin-leads' };
    
    case 'principal':
    case 'principal_admin':
      // Check if they have school association
      if (profile.organization_id) {
        return { 
          path: '/screens/principal-dashboard',
          params: { school: profile.organization_id }
        };
      } else {
        // No school associated, route to setup or contact support
        return { path: '/account' };
      }
    
    case 'teacher':
      // Check seat status for teachers
      if (profile.seat_status === 'active') {
        return { path: '/screens/teacher-dashboard' };
      } else if (profile.seat_status === 'pending') {
        return { path: '/account' }; // Show pending seat activation
      } else {
        return { path: '/account' }; // Show seat issues
      }
    
    case 'parent':
      return { path: '/screens/parent-dashboard' };
    
    default:
      // Unknown role, route to profile setup
      console.warn('Unknown user role:', profile.role);
      return { path: '/profiles-gate' };
  }
}

/**
 * Check if user has valid access to the mobile app
 */
export function validateUserAccess(profile: EnhancedUserProfile | null): {
  hasAccess: boolean;
  reason?: string;
  suggestedAction?: string;
} {
  if (!profile) {
    return {
      hasAccess: false,
      reason: 'No user profile found',
      suggestedAction: 'Complete your profile setup',
    };
  }

  if (!profile.hasCapability('access_mobile_app')) {
    return {
      hasAccess: false,
      reason: 'Mobile app access not enabled',
      suggestedAction: 'Contact your administrator',
    };
  }

  // Check seat-based access for non-admin roles
  const role = normalizeRole(profile.role) as Role;
  if (role === 'teacher' && profile.seat_status !== 'active') {
    return {
      hasAccess: false,
      reason: `Teacher seat is ${profile.seat_status}`,
      suggestedAction: profile.seat_status === 'pending' 
        ? 'Wait for seat activation by your administrator'
        : 'Contact your administrator to activate your seat',
    };
  }

  return { hasAccess: true };
}

/**
 * Get the appropriate route path for a given role (without navigation)
 */
export function getRouteForRole(role: Role | string | null): string {
  const normalizedRole = normalizeRole(role as string) as Role;
  
  switch (normalizedRole) {
    case 'super_admin':
      return '/screens/super-admin-leads';
    case 'principal_admin':
      return '/screens/principal-dashboard';
    case 'teacher':
      return '/screens/teacher-dashboard';
    case 'parent':
      return '/screens/parent-dashboard';
    default:
      return '/landing';
  }
}

