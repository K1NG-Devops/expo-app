import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Sentry from 'sentry-expo';
import { assertSupabase } from '@/lib/supabase';
import { getPostHog } from '@/lib/posthogClient';
import { track } from '@/lib/analytics';
import { Platform } from 'react-native';
import { routeAfterLogin } from '@/lib/routeAfterLogin';
import { 
  fetchEnhancedUserProfile, 
  createPermissionChecker,
  createEnhancedProfile,
  type EnhancedUserProfile,
  type PermissionChecker
} from '@/lib/rbac';
import { initializeSession, signOut } from '@/lib/sessionManager';
import { router } from 'expo-router';
import { securityAuditor } from '@/lib/security-audit';
import { initializeVisibilityHandler, destroyVisibilityHandler } from '@/lib/visibilityHandler';

export type AuthContextValue = {
  user: import('@supabase/supabase-js').User | null;
  session: import('@supabase/supabase-js').Session | null;
  profile: EnhancedUserProfile | null;
  permissions: PermissionChecker;
  loading: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  profile: null,
  permissions: createPermissionChecker(null),
  loading: true,
  profileLoading: false,
  refreshProfile: async () => {},
  signOut: async () => {},
});

function toEnhancedProfile(p: any | null): EnhancedUserProfile | null {
  if (!p) return null;
  
  // If already an enhanced profile, return as is
  if (typeof p.hasRole === 'function' && typeof p.hasCapability === 'function') {
    return p as EnhancedUserProfile;
  }
  
  // Create enhanced profile using the same logic as createEnhancedProfile
  const baseProfile = {
    id: p.id,
    email: p.email,
    role: p.role,
    first_name: p.first_name,
    last_name: p.last_name,
    avatar_url: p.avatar_url,
    organization_id: p.organization_id,
    organization_name: p.organization_name,
    seat_status: p.seat_status || 'active',
    capabilities: p.capabilities || [],
    created_at: p.created_at,
    last_login_at: p.last_login_at,
  } as any;
  
  // Use createEnhancedProfile from rbac to ensure all methods are attached
  return createEnhancedProfile(baseProfile, {
    organization_id: p.organization_id,
    organization_name: p.organization_name,
    plan_tier: p.plan_tier || 'free',
    seat_status: p.seat_status || 'active',
    invited_by: p.invited_by,
    created_at: p.created_at,
  });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionChecker>(createPermissionChecker(null));
  const [lastRefreshAttempt, setLastRefreshAttempt] = useState<number>(0);

  // Fetch enhanced user profile
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      setProfileLoading(true);
      const enhancedProfile = await fetchEnhancedUserProfile(userId);
      setProfile(enhancedProfile);
      setPermissions(createPermissionChecker(enhancedProfile));
      
      // Track profile load
      track('edudash.auth.profile_loaded', {
        user_id: userId,
        has_profile: !!enhancedProfile,
        role: enhancedProfile?.role,
        capabilities_count: enhancedProfile?.capabilities?.length || 0,
      });
      
      return enhancedProfile;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setProfile(null);
      setPermissions(createPermissionChecker(null));
      return null;
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // Refresh profile (useful when permissions change)
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id]);

  // Enhanced refresh for visibility handler
  const handleVisibilityRefresh = useCallback(async () => {
    const now = Date.now();
    // Avoid rapid successive refreshes
    if (now - lastRefreshAttempt < 2000) {
      return;
    }
    
    setLastRefreshAttempt(now);
    
    try {
      // Check if session is still valid
      const { data: { session: currentSession }, error } = await assertSupabase().auth.getSession();
      
      if (error || !currentSession) {
        console.log('Session invalid on visibility change, clearing auth state');
        setUser(null);
        setSession(null);
        setProfile(null);
        setPermissions(createPermissionChecker(null));
        return;
      }
      
      // Update session if it's different
      if (currentSession && (!session || session.access_token !== currentSession.access_token)) {
        setSession(currentSession);
        setUser(currentSession.user);
      }
      
      // Refresh profile if we have a user
      if (currentSession.user) {
        console.log('Refreshing profile on visibility change');
        const enhancedProfile = await fetchEnhancedUserProfile(currentSession.user.id);
        if (enhancedProfile) {
          setProfile(enhancedProfile);
          setPermissions(createPermissionChecker(enhancedProfile));
        }
      }
    } catch (error) {
      console.error('Visibility refresh failed:', error);
    }
  }, [session, lastRefreshAttempt]);

  // Enhanced sign out
  const handleSignOut = useCallback(async () => {
    try {
      // Security audit for logout
      if (user?.id) {
        securityAuditor.auditAuthenticationEvent(user.id, 'logout', {
          role: profile?.role,
          session_duration: session ? Date.now() - (session.user.created_at ? new Date(session.user.created_at).getTime() : Date.now()) : null,
        });
      }
      
      await signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
      setPermissions(createPermissionChecker(null));
    } catch (error) {
      console.error('Sign out failed:', error);
      
      // Security audit for failed logout
      if (user?.id) {
        securityAuditor.auditAuthenticationEvent(user.id, 'auth_failure', {
          action: 'logout',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }, [user?.id, profile?.role, session]);

  useEffect(() => {
    let unsub: { subscription?: { unsubscribe: () => void } } | null = null;
    let mounted = true;

    // Define a local fetch function to avoid dependency issues
    const fetchProfileLocal = async (userId: string) => {
      if (!mounted) return null;
      try {
        setProfileLoading(true);
        const enhancedProfile = await fetchEnhancedUserProfile(userId);
        if (mounted) {
          setProfile(enhancedProfile);
          setPermissions(createPermissionChecker(enhancedProfile));
          
          // Track profile load
          track('edudash.auth.profile_loaded', {
            user_id: userId,
            has_profile: !!enhancedProfile,
            role: enhancedProfile?.role,
            capabilities_count: enhancedProfile?.capabilities?.length || 0,
          });
          
          // Security audit for authentication
          if (enhancedProfile) {
            securityAuditor.auditAuthenticationEvent(userId, 'login', {
              role: enhancedProfile.role,
              organization: enhancedProfile.organization_id,
              capabilities_count: enhancedProfile.capabilities?.length || 0,
            });
          }
        }
        return enhancedProfile;
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        if (mounted) {
          setProfile(null);
          setPermissions(createPermissionChecker(null));
        }
        return null;
      } finally {
        if (mounted) {
          setProfileLoading(false);
        }
      }
    };

    // Theme fix: ensure theme provider doesn't flicker on refresh
    try {
      const root = (globalThis as any)?.document?.documentElement;
      if (root && typeof (globalThis as any).matchMedia === 'function') {
        const prefersDark = (globalThis as any).matchMedia('(prefers-color-scheme: dark)')?.matches;
        if (prefersDark) root.classList.add('dark'); else root.classList.remove('dark');
      }
    } catch {}

    (async () => {
      try {
        // Initialize session from storage first
        const { session: storedSession, profile: storedProfile } = await initializeSession();
        
        if (storedSession && storedProfile && mounted) {
          setSession({ 
            access_token: storedSession.access_token, 
            refresh_token: storedSession.refresh_token, 
            expires_at: storedSession.expires_at,
            user: { id: storedSession.user_id, email: storedSession.email } 
          } as any);
          setUser({ id: storedSession.user_id, email: storedSession.email } as any);
          const enhanced = toEnhancedProfile(storedProfile as any);
          setProfile(enhanced);
          setPermissions(createPermissionChecker(enhanced));
        }

        // Get current auth session
        const client = assertSupabase();
        const { data } = await client.auth.getSession();
        if (mounted) {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
        }

        // Always refresh profile on boot to avoid stale cached roles
        let currentProfile: EnhancedUserProfile | null = storedProfile as any;
        if (data.session?.user && mounted) {
          try {
            const fresh = await fetchProfileLocal(data.session.user.id);
            if (fresh) currentProfile = fresh;
          } catch (e) {
            console.debug('Initial profile refresh failed', e);
          }
        }

        // If there's a session, identify in monitoring tools
        if (data.session?.user && mounted) {
          try {
            const ph = getPostHog();
            const phProps: Record<string, any> = {
              ...(data.session.user.email ? { email: data.session.user.email } : {}),
              ...(currentProfile?.role ? { role: currentProfile.role } : {}),
              ...(currentProfile?.organization_id ? { organization_id: currentProfile.organization_id } : {}),
              ...(currentProfile?.organization_membership?.plan_tier ? { plan_tier: currentProfile.organization_membership.plan_tier } : {}),
            };
            ph?.identify(data.session.user.id, phProps);
          } catch (e) {
            console.debug('PostHog identify failed', e);
          }
          try {
            Sentry.Native.setUser({ 
              id: data.session.user.id, 
              email: data.session.user.email || undefined 
            } as any);
          } catch (e) {
            console.debug('Sentry setUser failed', e);
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }

      // Initialize visibility handler for browser tab focus/blur handling
      try {
        const allowWebFocusRefresh = process.env.EXPO_PUBLIC_WEB_FOCUS_REFRESH === 'true';
        const isWeb = Platform.OS === 'web';
        if (!isWeb || allowWebFocusRefresh) {
          initializeVisibilityHandler({
            onSessionRefresh: handleVisibilityRefresh,
            onVisibilityChange: (isVisible) => {
              if (isVisible && mounted) {
                // Get current state at the time of visibility change
                assertSupabase().auth.getSession().then(({ data: currentSessionData }) => {
                  track('auth.tab_focused', {
                    has_session: !!currentSessionData.session,
                    has_profile: !!profile,
                    timestamp: new Date().toISOString(),
                  });
                }).catch(() => {
                  // Fallback tracking if session check fails
                  track('auth.tab_focused', {
                    has_session: false,
                    has_profile: !!profile,
                    timestamp: new Date().toISOString(),
                  });
                });
              }
            },
            refreshDelay: 1000, // 1 second delay for superadmin dashboard
          });
        } else {
          console.log('[Visibility] Web focus refresh disabled by EXPO_PUBLIC_WEB_FOCUS_REFRESH');
        }
      } catch (e) {
        console.debug('Visibility handler initialization failed (mobile platform?)', e);
      }

      // Subscribe to auth changes
      const { data: listener } = assertSupabase().auth.onAuthStateChange(async (event, s) => {
        if (!mounted) return;
        
        setSession(s ?? null);
        setUser(s?.user ?? null);

        try {
          if (event === 'SIGNED_IN' && s?.user) {
            // Fetch enhanced profile on sign in
            const enhancedProfile = await fetchProfileLocal(s.user.id);

            // Register or update push token (best-effort)
            try {
              const { registerPushDevice } = await import('@/lib/notifications');
              const result = await registerPushDevice(assertSupabase(), s.user);
              
              // Log result for debugging (no sensitive data)
              if (result.status === 'error') {
                console.debug('Push registration failed:', result.reason);
              } else if (result.status === 'denied') {
                console.debug('Push permissions denied');
                // Could surface a non-blocking UI hint here in the future
              } else if (result.status === 'registered') {
                console.debug('Push registration successful');
              }
            } catch (e) {
              console.debug('Push registration exception:', e);
            }
            
            // Identify in monitoring tools
            if (mounted) {
              try {
                const ph = getPostHog();
                const phProps: Record<string, any> = {
                  ...(s.user.email ? { email: s.user.email } : {}),
                  ...(enhancedProfile?.role ? { role: enhancedProfile.role } : {}),
                  ...(enhancedProfile?.organization_id ? { organization_id: enhancedProfile.organization_id } : {}),
                  ...(enhancedProfile?.organization_membership?.plan_tier ? { plan_tier: enhancedProfile.organization_membership.plan_tier } : {}),
                };
                ph?.identify(s.user.id, phProps);
              } catch (e) {
                console.debug('PostHog identify (auth change) failed', e);
              }
              try {
                Sentry.Native.setUser({ 
                  id: s.user.id, 
                  email: s.user.email || undefined 
                } as any);
              } catch (e) {
                console.debug('Sentry setUser (auth change) failed', e);
              }

              track('edudash.auth.signed_in', {
                user_id: s.user.id,
                role: enhancedProfile?.role,
              });

              // Route user after successful sign in
              try {
                await routeAfterLogin(s.user, enhancedProfile);
              } catch (error) {
                console.error('Post-login routing failed:', error);
              }
            }
          }

          if (event === 'SIGNED_OUT' && mounted) {
            setProfile(null);
            setPermissions(createPermissionChecker(null));
            
            // Deregister push device
            try {
              const { deregisterPushDevice } = await import('@/lib/notifications');
              await deregisterPushDevice(assertSupabase(), { id: s?.user?.id || user?.id });
            } catch (e) {
              console.debug('Push deregistration failed', e);
            }
            
            try { await getPostHog()?.reset(); } catch (e) { console.debug('PostHog reset failed', e); }
            try { Sentry.Native.setUser(null as any); } catch (e) { console.debug('Sentry clear user failed', e); }
            
            track('edudash.auth.signed_out', {});
            
            // Ensure we fall back to the sign-in screen on sign out or session loss
            try { router.replace('/sign-in'); } catch (navErr) { console.debug('Navigation to sign-in failed', navErr); }
          }
        } catch (error) {
          console.error('Auth state change handler error:', error);
        }
      });
      unsub = listener;
    })();

    return () => {
      mounted = false;
      try { unsub?.subscription?.unsubscribe(); } catch (e) { console.debug('Auth listener unsubscribe failed', e); }
      try { destroyVisibilityHandler(); } catch (e) { console.debug('Visibility handler cleanup failed', e); }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      permissions,
      loading, 
      profileLoading,
      refreshProfile,
      signOut: handleSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Convenience hooks for common permission checks
export function usePermissions(): PermissionChecker {
  const { permissions } = useAuth();
  return permissions;
}

export function useUserProfile(): EnhancedUserProfile | null {
  const { profile } = useAuth();
  return profile;
}
