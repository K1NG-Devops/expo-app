import * as Sentry from 'sentry-expo';
import { router } from 'expo-router';
import PostHog from 'posthog-react-native';
import { supabase } from '@/lib/supabase';

export async function signOutAndRedirect() {
  try {
    await supabase!.auth.signOut();
  } catch {}
  try {
    // Clear analytics identities
    await PostHog.reset();
  } catch {}
  try {
    Sentry.Native.setUser(null as any);
  } catch {}
  router.replace('/');
}

