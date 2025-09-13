import * as SecureStore from 'expo-secure-store';
import { assertSupabase } from '@/lib/supabase';
import { track, identifyUser } from '@/lib/analytics';
import { identifyUserForFlags } from '@/lib/featureFlags';
import { reportError } from '@/lib/monitoring';

export interface UserSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id: string;
  role?: string;
  organization_id?: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'super_admin' | 'principal_admin' | 'principal' | 'teacher' | 'parent';
  organization_id?: string;
  organization_name?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  seat_status?: 'active' | 'inactive' | 'pending';
  capabilities?: string[];
  created_at?: string;
  last_login_at?: string;
}

const SESSION_STORAGE_KEY = 'edudash_session';
const PROFILE_STORAGE_KEY = 'edudash_profile';
const REFRESH_THRESHOLD = parseInt(process.env.EXPO_PUBLIC_SESSION_REFRESH_THRESHOLD || '300000'); // 5 minutes

let sessionRefreshTimer: any = null;

/**
 * Securely store session data
 */
async function storeSession(session: UserSession): Promise<void> {
  try {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    reportError(new Error('Failed to store session'), { error });
    throw error;
  }
}

/**
 * Retrieve stored session data
 */
async function getStoredSession(): Promise<UserSession | null> {
  try {
    const sessionData = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
    return sessionData ? JSON.parse(sessionData) : null;
  } catch (error) {
    console.error('Failed to retrieve session:', error);
    return null;
  }
}

/**
 * Securely store user profile
 */
async function storeProfile(profile: UserProfile): Promise<void> {
  try {
    await SecureStore.setItemAsync(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error('Failed to store profile:', error);
  }
}

/**
 * Retrieve stored user profile
 */
async function getStoredProfile(): Promise<UserProfile | null> {
  try {
    const profileData = await SecureStore.getItemAsync(PROFILE_STORAGE_KEY);
    return profileData ? JSON.parse(profileData) : null;
  } catch (error) {
    console.error('Failed to retrieve profile:', error);
    return null;
  }
}

/**
 * Clear stored session and profile data
 */
async function clearStoredData(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(SESSION_STORAGE_KEY),
      SecureStore.deleteItemAsync(PROFILE_STORAGE_KEY),
    ]);
  } catch (error) {
    console.error('Failed to clear stored data:', error);
  }
}

/**
 * Fetch user profile from database
 */
async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    // First get user profile
    const { data: profile, error: profileError } = await assertSupabase()
      .from('profiles')
      .select(`
        id,
        email,
        role,
        first_name,
        last_name,
        avatar_url,
        created_at,
        last_login_at,
        organization_members(
          organization_id,
          seat_status,
          organizations(
            id,
            name,
            plan_tier
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Failed to fetch user profile:', profileError);
      return null;
    }

    // Extract organization info
    const orgMember = profile.organization_members?.[0];
    const org = orgMember?.organizations as any;

    // Get user capabilities based on role and subscription
    const planTier = Array.isArray(org) ? org[0]?.plan_tier : org?.plan_tier;
    const capabilities = await getUserCapabilities(profile.role, planTier);

    return {
      id: profile.id,
      email: profile.email,
      role: profile.role,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      organization_id: orgMember?.organization_id,
      organization_name: Array.isArray(org) ? org[0]?.name : org?.name,
      seat_status: orgMember?.seat_status,
      capabilities,
      created_at: profile.created_at,
      last_login_at: profile.last_login_at,
    };
  } catch (error) {
    reportError(new Error('Failed to fetch user profile'), { userId, error });
    return null;
  }
}

/**
 * Get user capabilities based on role and subscription tier
 */
async function getUserCapabilities(role: string, planTier?: string): Promise<string[]> {
  // Default to parent for unknown/missing roles to allow minimal mobile access
  const normalizedRole = (String(role || 'parent').toLowerCase());
  const baseCapabilities: Record<string, string[]> = {
    super_admin: [
      'access_mobile_app',
      'view_all_organizations',
      'manage_organizations',
      'view_billing',
      'manage_subscriptions',
      'access_admin_tools',
    ],
    principal_admin: [
      'access_mobile_app',
      'view_school_metrics',
      'manage_teachers',
      'manage_students',
      'access_principal_hub',
      'generate_reports',
    ],
    principal: [
      'access_mobile_app',
      'view_school_metrics',
      'manage_teachers',
      'manage_students',
      'access_principal_hub',
      'generate_reports',
    ],
    teacher: [
      'access_mobile_app',
      'manage_classes',
      'create_assignments',
      'grade_assignments',
      'view_class_analytics',
    ],
    parent: [
      'access_mobile_app',
      'view_child_progress',
      'communicate_with_teachers',
      'access_homework_help',
    ],
  };

  const capabilities = baseCapabilities[normalizedRole] || baseCapabilities['parent'];

  // Add tier-specific capabilities
  if (planTier === 'premium' || planTier === 'enterprise') {
    capabilities.push('ai_lesson_generation', 'advanced_analytics');
  }

  if (planTier === 'enterprise') {
    capabilities.push(
      'ai_grading_assistance',
      'bulk_operations',
      'custom_reports',
      'sso_access',
      'priority_support'
    );
  }

  return capabilities;
}

/**
 * Check if session needs refresh
 */
function needsRefresh(session: UserSession): boolean {
  const now = Date.now();
  const timeUntilExpiry = session.expires_at * 1000 - now;
  return timeUntilExpiry < REFRESH_THRESHOLD;
}

/**
 * Refresh session token with exponential backoff
 */
async function refreshSession(
  refreshToken: string,
  attempt: number = 1,
  maxAttempts: number = 3
): Promise<UserSession | null> {
  try {
    const { data, error } = await assertSupabase().auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error) throw error;

    if (!data.session) {
      throw new Error('No session returned from refresh');
    }

    const newSession: UserSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || Date.now() / 1000 + 3600,
      user_id: data.session.user.id,
      email: data.session.user.email,
    };

    await storeSession(newSession);

    track('edudash.auth.session_refreshed', {
      attempt,
      success: true,
    });

    return newSession;
  } catch (error) {
    console.error(`Session refresh attempt ${attempt} failed:`, error);

    if (attempt < maxAttempts) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return refreshSession(refreshToken, attempt + 1, maxAttempts);
    }

    track('edudash.auth.session_refresh_failed', {
      attempts: attempt,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    reportError(new Error('Session refresh failed after all attempts'), { 
      attempts: attempt, 
      originalError: error 
    });

    return null;
  }
}

/**
 * Auto-refresh session management
 */
function setupAutoRefresh(session: UserSession): void {
  // Clear existing timer
  if (sessionRefreshTimer) {
    clearTimeout(sessionRefreshTimer);
  }

  if (process.env.EXPO_PUBLIC_SESSION_AUTO_REFRESH !== 'true') {
    return;
  }

  const now = Date.now();
  const timeUntilRefresh = session.expires_at * 1000 - now - REFRESH_THRESHOLD;

  if (timeUntilRefresh > 0) {
    sessionRefreshTimer = setTimeout(async () => {
      try {
        const currentSession = await getStoredSession();
        if (currentSession && needsRefresh(currentSession)) {
          const refreshedSession = await refreshSession(currentSession.refresh_token);
          if (refreshedSession) {
            setupAutoRefresh(refreshedSession);
          }
        }
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
    }, timeUntilRefresh);
  }
}

/**
 * Initialize session from stored data
 */
export async function initializeSession(): Promise<{
  session: UserSession | null;
  profile: UserProfile | null;
}> {
  try {
    const storedSession = await getStoredSession();
    const storedProfile = await getStoredProfile();

    if (!storedSession) {
      return { session: null, profile: null };
    }

    // Check if session is expired or needs refresh
    if (needsRefresh(storedSession)) {
      const refreshedSession = await refreshSession(storedSession.refresh_token);
      if (!refreshedSession) {
        await clearStoredData();
        return { session: null, profile: null };
      }
      
      setupAutoRefresh(refreshedSession);
      return { session: refreshedSession, profile: storedProfile };
    }

    setupAutoRefresh(storedSession);
    return { session: storedSession, profile: storedProfile };

  } catch (error) {
    reportError(new Error('Session initialization failed'), { error });
    await clearStoredData();
    return { session: null, profile: null };
  }
}

/**
 * Sign in and establish session
 */
export async function signInWithSession(
  email: string,
  password: string
): Promise<{
  session: UserSession | null;
  profile: UserProfile | null;
  error?: string;
}> {
  try {
    const { data, error } = await assertSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      track('edudash.auth.sign_in', {
        method: 'email',
        role: 'unknown',
        success: false,
        error: error.message,
      });
      return { session: null, profile: null, error: error.message };
    }

    if (!data.session || !data.user) {
      return { session: null, profile: null, error: 'Invalid credentials' };
    }

    // Create session object
    const session: UserSession = {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at || Date.now() / 1000 + 3600,
      user_id: data.user.id,
      email: data.user.email,
    };

    // Fetch user profile
    const profile = await fetchUserProfile(data.user.id);

    if (!profile) {
      return { session: null, profile: null, error: 'Failed to load user profile' };
    }

    // Store session and profile
    await Promise.all([
      storeSession(session),
      storeProfile(profile),
    ]);

    // Update last login
    await assertSupabase()
      .from('profiles')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id);

    // Set up monitoring and feature flags
    identifyUser(data.user.id, {
      role: profile.role,
      organization_id: profile.organization_id,
      seat_status: profile.seat_status,
    });

    identifyUserForFlags(data.user.id, {
      role: profile.role,
      organization_tier: profile.organization_id ? 'org_member' : 'individual',
      capabilities: profile.capabilities,
    });

    // Set up auto-refresh
    setupAutoRefresh(session);

    track('edudash.auth.sign_in', {
      method: 'email',
      role: profile.role,
      success: true,
    });

    return { session, profile };

  } catch (error) {
    reportError(new Error('Sign-in failed'), { email, error });
    return { 
      session: null, 
      profile: null, 
      error: error instanceof Error ? error.message : 'Sign-in failed' 
    };
  }
}

/**
 * Sign out and clear session
 */
export async function signOut(): Promise<void> {
  try {
    const session = await getStoredSession();
    const sessionDuration = session 
      ? Math.round((Date.now() - (session.expires_at * 1000 - 3600000)) / 1000 / 60)
      : 0;

    // Clear auto-refresh timer
    if (sessionRefreshTimer) {
      clearTimeout(sessionRefreshTimer);
      sessionRefreshTimer = null;
    }

    // Sign out from Supabase
    await assertSupabase().auth.signOut();

    // Clear stored data
    await clearStoredData();

    track('edudash.auth.sign_out', {
      session_duration_minutes: sessionDuration,
    });

  } catch (error) {
    reportError(new Error('Sign-out failed'), { error });
  }
}

/**
 * Get current session if valid
 */
export async function getCurrentSession(): Promise<UserSession | null> {
  const session = await getStoredSession();
  
  if (!session) return null;

  if (needsRefresh(session)) {
    const refreshedSession = await refreshSession(session.refresh_token);
    if (refreshedSession) {
      setupAutoRefresh(refreshedSession);
    }
    return refreshedSession;
  }

  return session;
}

/**
 * Get current user profile
 */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  return await getStoredProfile();
}

/**
 * Refresh user profile data
 */
export async function refreshProfile(): Promise<UserProfile | null> {
  const session = await getCurrentSession();
  if (!session) return null;

  const profile = await fetchUserProfile(session.user_id);
  if (profile) {
    await storeProfile(profile);
  }

  return profile;
}
