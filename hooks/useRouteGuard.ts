/**
 * Route Guard Hooks
 * 
 * Provides authentication and mobile-web PWA gating guards using Expo Router hooks.
 * Uses hard redirects on web to avoid history back-loop issues.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  isMobilePhone,
  isStandalonePWA,
  isPublicRoute,
  isMobileWebGuardEnabled,
} from '@/lib/utils/pwa';

/**
 * Mobile Web Guard Hook
 * 
 * Redirects mobile phone browsers (not tablets) to /pwa-install page
 * unless they are:
 * - Already on the PWA install page
 * - Running in standalone PWA mode
 * - On a public route (landing, auth, legal, marketing, invites)
 * 
 * Tablets (width ≥768px or tablet UA) are not restricted.
 * Can be disabled via EXPO_PUBLIC_MOBILE_WEB_GUARD=0 environment variable.
 */
export const useMobileWebGuard = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Only run on web platform
    if (Platform.OS !== 'web') return;

    // Check feature flag (default enabled)
    if (!isMobileWebGuardEnabled()) {
      if (__DEV__) {
        console.log('[MobileWebGuard] Guard disabled via feature flag');
      }
      return;
    }

    const mobile = isMobilePhone();
    const standalone = isStandalonePWA();
    const isPublic = isPublicRoute(pathname);

    if (__DEV__) {
      console.log('[MobileWebGuard]', {
        pathname,
        mobile,
        standalone,
        isPublic,
      });
    }

    // Block mobile phones (not tablets) that aren't in standalone PWA mode
    if (mobile && !standalone && !isPublic) {
      if (typeof window !== 'undefined' && pathname !== '/pwa-install') {
        console.log(
          '[MobileWebGuard] Redirecting mobile web user to PWA install page'
        );
        // Use hard redirect to avoid back-loop
        (window as any).location.href = '/pwa-install';
      }
    }
  }, [pathname]);
};

/**
 * Authentication Guard Hook
 * 
 * Redirects unauthenticated users away from protected routes to the landing page.
 * Public routes (landing, auth, legal, etc.) are accessible without authentication.
 * 
 * Uses same public route detection as mobile web guard for consistency.
 */
export const useAuthGuard = () => {
  const pathname = usePathname();
  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to load before making decisions
    if (authLoading) return;

    const isPublic = isPublicRoute(pathname);

    if (__DEV__) {
      console.log('[AuthGuard]', {
        pathname,
        hasSession: !!session,
        isPublic,
        authLoading,
      });
    }

    // Redirect to landing if no session and not on public route
    if (!session && !isPublic) {
      console.log('[AuthGuard] No session, redirecting to landing page');

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        // Use hard redirect on web for immediate redirect
        (window as any).location.href = '/';
      }
      // On native, the AuthContext already handles navigation
    }
  }, [session, authLoading, pathname]);
};
