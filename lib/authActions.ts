import * as Sentry from 'sentry-expo';
import { router } from 'expo-router';
import { getPostHog } from '@/lib/posthogClient';
import { signOut as signOutSession } from '@/lib/sessionManager';
import { EnhancedBiometricAuth } from '@/services/EnhancedBiometricAuth';
import { BiometricAuthService } from '@/services/BiometricAuthService';
import { BiometricBackupManager } from '@/lib/BiometricBackupManager';

export async function signOutAndRedirect(): Promise<void>;
export async function signOutAndRedirect(event: any): Promise<void>;
export async function signOutAndRedirect(options: { clearBiometrics?: boolean; redirectTo?: string }): Promise<void>;
export async function signOutAndRedirect(optionsOrEvent?: { clearBiometrics?: boolean; redirectTo?: string } | any): Promise<void> {
  try {
    // Sign out via unified session manager: clears stored session/profile and Supabase auth
    await signOutSession();
  } catch { /* noop */ void 0; }

  // If invoked as onPress handler, first argument will be an event; ignore it
  const options = (optionsOrEvent && typeof optionsOrEvent === 'object' && (
    Object.prototype.hasOwnProperty.call(optionsOrEvent, 'clearBiometrics') ||
    Object.prototype.hasOwnProperty.call(optionsOrEvent, 'redirectTo')
  )) ? (optionsOrEvent as { clearBiometrics?: boolean; redirectTo?: string }) : undefined;

  if (options?.clearBiometrics) {
    // Optionally clear all biometric-related data so user must use password next time
    try { await EnhancedBiometricAuth.clearBiometricSession(); } catch { /* noop */ void 0; }
    try { await BiometricAuthService.disableBiometric(); } catch { /* noop */ void 0; }
    try { await BiometricBackupManager.disableBiometricBackup(); } catch { /* noop */ void 0; }
  }

  try {
    // Clear analytics identities
    await getPostHog()?.reset();
  } catch { /* noop */ void 0; }
  try {
    Sentry.Native.setUser(null as any);
  } catch { /* noop */ void 0; }

  router.replace(options?.redirectTo ?? '/');
}

