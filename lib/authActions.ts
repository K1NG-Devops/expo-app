import * as Sentry from 'sentry-expo';
import { router } from 'expo-router';
import { getPostHog } from '@/lib/posthogClient';
import { supabase } from '@/lib/supabase';

export async function signOutAndRedirect() {
  try {
    await supabase!.auth.signOut();
  } catch { /* noop */ void 0; }
  try {
    // Clear analytics identities
    await getPostHog()?.reset();
  } catch { /* noop */ void 0; }
  try {
    Sentry.Native.setUser(null as any);
  } catch { /* noop */ void 0; }
  router.replace('/');
}

