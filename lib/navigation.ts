/**
 * Navigation utilities for consistent back button behavior across the app
 */

import { router } from 'expo-router';

/**
 * Smart back navigation that handles different scenarios:
 * - Uses router.back() if can go back
 * - Falls back to appropriate main screen based on user context
 */
export function navigateBack(fallbackRoute?: string) {
  try {
    // Check if we can go back in the navigation stack
    if (router.canGoBack && router.canGoBack()) {
      router.back();
      return;
    }
    
    // If we can't go back and have a fallback, use it
    if (fallbackRoute) {
      router.replace(fallbackRoute as any);
      return;
    }
    
    // Default fallback to main landing/dashboard
    router.replace('/');
  } catch (error) {
    console.error('Navigation back failed:', error);
    // Last resort - go to root
    router.replace('/');
  }
}

/**
 * Navigate to main dashboard based on user role
 */
export function navigateToMainDashboard() {
  // For now, navigate to root - this will be enhanced with role-based routing
  router.replace('/');
}

/**
 * Type-safe navigation helpers for common routes
 */
export const navigateTo = {
  back: (fallbackRoute?: string) => navigateBack(fallbackRoute),
  dashboard: () => navigateToMainDashboard(),
  teacherManagement: () => router.push('/screens/teacher-management' as any),
  studentManagement: () => router.push('/screens/student-management' as any),
  account: () => router.push('/screens/account' as any),
  settings: () => router.push('/screens/settings' as any),
  
  // Detail screens
  studentDetail: (id: string) => router.push(`/screens/student-detail?id=${id}` as any),
  teacherDetail: (id: string) => router.push(`/screens/teachers-detail?id=${id}` as any),
  activityDetail: (id: string) => router.push(`/screens/activity-detail?id=${id}` as any),
  
  // Financial screens
  financialDashboard: () => router.push('/screens/financial-dashboard' as any),
  financialReports: () => router.push('/screens/financial-reports' as any),
  pettyCash: () => router.push('/screens/petty-cash' as any),
  
  // Admin screens
  schoolSettings: () => router.push('/screens/admin/school-settings' as any),
};

/**
 * Determine if a back button should be shown based on current route
 * This implements the business rule about hiding back buttons on main screens
 */
export function shouldShowBackButton(routeName: string, isUserSignedIn: boolean): boolean {
  // If not signed in, show back button based on navigation state
  if (!isUserSignedIn) {
    return router.canGoBack?.() ?? false;
  }
  
  // If user is signed in, use intelligent logic
  const isMainScreen = routeName.includes('dashboard') || 
                      routeName === 'index' || 
                      routeName === 'landing' || 
                      routeName.includes('(tabs)');
  
  // Hide on main screens per business rule, show on detail screens
  if (isMainScreen) {
    return false;
  }
  
  // Show on detail/management screens if we can go back
  return router.canGoBack?.() ?? false;
}