'use client';

import { createBrowserClient } from '@supabase/ssr';

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (browserClient) return browserClient;

  // Support both NEXT_PUBLIC_* and EXPO_PUBLIC_* env names
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    || process.env.EXPO_PUBLIC_SUPABASE_URL
    || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || '';

  if (!url || !anon) {
    console.error('[Supabase] Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_ equivalents).');
  }
  if (url && !url.includes('.supabase.co')) {
    console.warn('[Supabase] URL does not look like a Supabase project URL:', url);
  }

  browserClient = createBrowserClient(url, anon, {
    auth: {
      storageKey: 'edudash-auth-session',
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      debug: process.env.NEXT_PUBLIC_DEBUG_SUPABASE === 'true' || process.env.EXPO_PUBLIC_DEBUG_SUPABASE === 'true',
    },
  });

  // Minimal safe debugging (no secrets)
  if (process.env.NODE_ENV !== 'production') {
    try {
      const meta = {
        hasUrl: !!url,
        hasAnon: !!anon,
        urlLength: url?.length || 0,
        anonLength: anon?.length || 0,
      };
      console.log('[Supabase] Web client initialized', meta);
    } catch { /* noop */ }
  }

  // Global auth events
  try {
    browserClient.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try {
          localStorage.removeItem('edudash_user_session');
          localStorage.removeItem('edudash_user_profile');
          localStorage.removeItem('edudash_active_child_id');
        } catch { /* noop */ }
      }
    });
  } catch { /* noop */ }

  return browserClient;
}
