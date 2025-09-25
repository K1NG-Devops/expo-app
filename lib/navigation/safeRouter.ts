/**
 * Safe router wrapper that prevents navigation to invalid routes
 * This helps prevent "Unmatched Route" errors by validating routes before navigation
 */

import { router } from 'expo-router';

// List of known valid routes in the app
const VALID_ROUTES = new Set([
  '/',
  '/landing',
  '/index',
  '/(auth)/sign-in',
  '/(auth)/sign-up',
  '/profiles-gate',
  '/screens/teacher-dashboard',
  '/screens/parent-dashboard',
  '/screens/principal-dashboard',
  '/screens/super-admin-dashboard',
  '/screens/account',
  '/screens/settings',
  '/screens/student-management',
  '/screens/teacher-management',
  '/screens/financial-dashboard',
  // Add more routes as needed
]);

// Valid route patterns (for dynamic routes)
const VALID_PATTERNS = [
  /^\/screens\/student-detail/,
  /^\/screens\/teacher-detail/,
  /^\/screens\/activity-detail/,
  /^\/screens\/class-teacher-management/,
  // Add more patterns as needed
];

/**
 * Check if a route is valid
 */
function isValidRoute(route: string | null | undefined): boolean {
  if (!route || typeof route !== 'string') {
    return false;
  }

  // Remove query parameters for validation
  const cleanRoute = route.split('?')[0];

  // Check exact matches
  if (VALID_ROUTES.has(cleanRoute)) {
    return true;
  }

  // Check patterns
  return VALID_PATTERNS.some(pattern => pattern.test(cleanRoute));
}

/**
 * Safe navigation that validates routes before navigating
 */
export const safeRouter = {
  push(route: any) {
    try {
      // Handle object-based navigation
      if (typeof route === 'object' && route.pathname) {
        if (!isValidRoute(route.pathname)) {
          console.error(`[SafeRouter] Invalid route: ${route.pathname}`);
          router.push('/'); // Fallback to root
          return;
        }
        router.push(route);
        return;
      }

      // Handle string-based navigation
      if (!isValidRoute(route)) {
        console.error(`[SafeRouter] Invalid route: ${route}`);
        router.push('/'); // Fallback to root
        return;
      }

      router.push(route);
    } catch (error) {
      console.error('[SafeRouter] Navigation error:', error);
      router.push('/'); // Fallback to root
    }
  },

  replace(route: any) {
    try {
      // Handle object-based navigation
      if (typeof route === 'object' && route.pathname) {
        if (!isValidRoute(route.pathname)) {
          console.error(`[SafeRouter] Invalid route: ${route.pathname}`);
          router.replace('/'); // Fallback to root
          return;
        }
        router.replace(route);
        return;
      }

      // Handle string-based navigation
      if (!isValidRoute(route)) {
        console.error(`[SafeRouter] Invalid route: ${route}`);
        router.replace('/'); // Fallback to root
        return;
      }

      router.replace(route);
    } catch (error) {
      console.error('[SafeRouter] Navigation error:', error);
      router.replace('/'); // Fallback to root
    }
  },

  back() {
    try {
      const canGoBack = typeof router.canGoBack === 'function' ? router.canGoBack() : false;
      
      if (canGoBack) {
        router.back();
      } else {
        console.log('[SafeRouter] Cannot go back, navigating to root');
        router.replace('/');
      }
    } catch (error) {
      console.error('[SafeRouter] Back navigation error:', error);
      router.replace('/');
    }
  },

  canGoBack(): boolean {
    try {
      return typeof router.canGoBack === 'function' ? router.canGoBack() : false;
    } catch (error) {
      console.error('[SafeRouter] Error checking canGoBack:', error);
      return false;
    }
  }
};

/**
 * Register a valid route (useful for dynamically added routes)
 */
export function registerValidRoute(route: string) {
  VALID_ROUTES.add(route);
}

/**
 * Register a valid route pattern (for dynamic routes)
 */
export function registerValidPattern(pattern: RegExp) {
  VALID_PATTERNS.push(pattern);
}