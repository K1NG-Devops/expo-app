import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { assertSupabase } from '@/lib/supabase';

export default function AuthCallback() {
  const handled = useRef(false);
  const [message, setMessage] = useState('Finalizing sign-in…');

  async function handle(urlStr?: string | null) {
    if (handled.current) return;
    handled.current = true;
    try {
      // Try to extract tokens from hash fragment first
      if (urlStr && urlStr.includes('#')) {
        const hash = urlStr.slice(urlStr.indexOf('#') + 1);
        const h = new URLSearchParams(hash);
        const access_token = h.get('access_token');
        const refresh_token = h.get('refresh_token');
        if (access_token && refresh_token) {
const { error } = await assertSupabase().auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          router.replace('/profiles-gate');
          return;
        }
      }

      // Fallback: check query params for token_hash + type (magiclink/recovery/signup)
      if (urlStr) {
        const qIndex = urlStr.indexOf('?');
        if (qIndex !== -1) {
          const q = new URLSearchParams(urlStr.slice(qIndex + 1));
          const token_hash = q.get('token_hash');
          const type = (q.get('type') || 'magiclink') as any;
          if (token_hash) {
const { error } = await assertSupabase().auth.verifyOtp({ token_hash, type });
            if (error) throw error;
            router.replace('/profiles-gate');
            return;
          }
        }
      }

      setMessage('Could not parse sign-in link. Please return and use the 6-digit code.');
    } catch (e: any) {
      setMessage(e?.message || 'Sign-in failed.');
    }
  }

  useEffect(() => {
    // Handle current URL (this route was opened by a link)
    Linking.getInitialURL().then((u) => handle(u));
    // Also handle any subsequent url events
    const sub = Linking.addEventListener('url', ({ url }) => handle(url));
    return () => sub.remove();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#00f5ff" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220', gap: 12, padding: 24 },
  text: { color: '#fff', textAlign: 'center' },
});

