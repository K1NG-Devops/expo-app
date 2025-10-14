import { assertSupabase } from '@/lib/supabase';

export interface RealtimeTokenResponse {
  token: string;
  url: string;
  expiresIn?: number;
}

/**
 * Fetch an ephemeral realtime provider token and WS URL from Edge Function.
 * Never exposes provider secrets client-side.
 */
export async function getRealtimeToken(): Promise<RealtimeTokenResponse | null> {
  try {
    const supabase = assertSupabase();
    const { data, error } = await (supabase as any).functions.invoke('openai-realtime-token');
    if (error) {
      console.warn('[RealtimeToken] Failed to fetch token:', error);
      return null;
    }
    if (!data?.token || !data?.url) {
      console.warn('[RealtimeToken] Missing token/url in response');
      return null;
    }
    return { token: data.token, url: data.url, expiresIn: data.expiresIn };
  } catch (e) {
    console.warn('[RealtimeToken] invoke error:', e);
    return null;
  }
}