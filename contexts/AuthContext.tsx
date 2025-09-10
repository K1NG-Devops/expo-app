import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as Sentry from 'sentry-expo';
import { supabase } from '@/lib/supabase';
import { getPostHog } from '@/lib/posthogClient';
import { track } from '@/lib/analytics';
import { routeAfterLogin } from '@/lib/routeAfterLogin';
import { 
  fetchEnhancedUserProfile, 
  createPermissionChecker,
  type EnhancedUserProfile,
  type PermissionChecker 
} from '@/lib/rbac';
import { initializeSession, signOut } from '@/lib/sessionManager';
import { securityAuditor } from '@/lib/security-audit';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [session, setSession] = useState<AuthContextValue['session']>(null);
  const [profile, setProfile] = useState<EnhancedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [permissions, setPermissions] = useState<PermissionChecker>(createPermissionChecker(null));

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
          setProfile(storedProfile as any);
          setPermissions(createPermissionChecker(storedProfile as any));
        }

        // Get current auth session
        const { data } = await supabase!.auth.getSession();
        if (mounted) {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
        }

        // If there's a session and no existing profile, fetch it
        let currentProfile: EnhancedUserProfile | null = storedProfile as any;
        if (data.session?.user && !currentProfile && mounted) {
          currentProfile = await fetchProfileLocal(data.session.user.id);
        }

        // If there's a session, identify in monitoring tools
        if (data.session?.user && mounted) {
          try {
            const ph = getPostHog();
            ph?.identify(data.session.user.id, { 
              email: data.session.user.email, 
              role: currentProfile?.role,
              organization_id: currentProfile?.organization_id,
              plan_tier: currentProfile?.organization_membership?.plan_tier,
            });
          } catch {}
          try {
            Sentry.Native.setUser({ 
              id: data.session.user.id, 
              email: data.session.user.email || undefined 
            } as any);
          } catch {}
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }

      // Subscribe to auth changes
      const { data: listener } = supabase!.auth.onAuthStateChange(async (event, s) => {
        if (!mounted) return;
        
        setSession(s ?? null);
        setUser(s?.user ?? null);

        try {
          if (event === 'SIGNED_IN' && s?.user) {
            // Fetch enhanced profile on sign in
            const enhancedProfile = await fetchProfileLocal(s.user.id);
            
            // Identify in monitoring tools
            if (mounted) {
              try {
                const ph = getPostHog();
                ph?.identify(s.user.id, { 
                  email: s.user.email, 
                  role: enhancedProfile?.role,
                  organization_id: enhancedProfile?.organization_id,
                  plan_tier: enhancedProfile?.organization_membership?.plan_tier,
                });
              } catch {}
              try {
                Sentry.Native.setUser({ 
                  id: s.user.id, 
                  email: s.user.email || undefined 
                } as any);
              } catch {}

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
            
            try { await getPostHog()?.reset(); } catch {}
            try { Sentry.Native.setUser(null as any); } catch {}
            
            track('edudash.auth.signed_out', {});
          }
        } catch (error) {
          console.error('Auth state change handler error:', error);
        }
      });
      unsub = listener;
    })();

    return () => {
      mounted = false;
      try { unsub?.subscription?.unsubscribe(); } catch {}
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
