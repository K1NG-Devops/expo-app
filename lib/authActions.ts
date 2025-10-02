import { router } from 'expo-router';

// Prevent duplicate sign-out calls
let isSigningOut = false;

/**
 * Simplified sign-out: just navigate to sign-in screen
 * The sign-in process will handle clearing the old session when user signs in again
 * This avoids lock contention and makes the flow more reliable
 */
export async function signOutAndRedirect(optionsOrEvent?: { clearBiometrics?: boolean; redirectTo?: string } | any): Promise<void> {
  if (isSigningOut) {
    console.log('[authActions] Sign-out already in progress, skipping...');
    return;
  }
  isSigningOut = true;
  
  // If invoked as onPress handler, first argument will be an event; ignore it
  const options = (optionsOrEvent && typeof optionsOrEvent === 'object' && (
    Object.prototype.hasOwnProperty.call(optionsOrEvent, 'clearBiometrics') ||
    Object.prototype.hasOwnProperty.call(optionsOrEvent, 'redirectTo')
  )) ? (optionsOrEvent as { clearBiometrics?: boolean; redirectTo?: string }) : undefined;

  const targetRoute = options?.redirectTo ?? '/(auth)/sign-in';
  
  // Simply navigate to sign-in - that's it!
  console.log('[authActions] Sign-out: navigating to sign-in screen');
  try {
    router.replace(targetRoute);
  } catch (navError) {
    console.error('[authActions] Navigation failed:', navError);
    // Try fallback routes
    try { router.replace('/(auth)/sign-in'); } catch {}
    try { router.replace('/sign-in'); } catch {}
  }
  
  // Reset flag immediately
  setTimeout(() => {
    isSigningOut = false;
  }, 100);
}

