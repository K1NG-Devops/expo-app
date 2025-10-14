import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, Text, Platform, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { assertSupabase } from '@/lib/supabase';

// Central landing handler for deep links
// Supports flows:
// - Email confirmation: .../landing?type=email&token_hash=XYZ or .../landing?flow=email-confirm&token_hash=XYZ
// - Parent invite: .../landing?flow=invite-parent&code=ABCD1234
// - Generic: If opened inside the app, route to appropriate screen
export default function LandingHandler() {
  const params = useLocalSearchParams<any>();
  const [status, setStatus] = useState<'loading'|'ready'|'error'|'done'>('loading');
  const [message, setMessage] = useState<string>('');

  const isWeb = Platform.OS === 'web';
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.edudashpro';

  const query = useMemo(() => {
    const q: Record<string, string> = {};
    // Normalize incoming params (expo-router passes them as strings | string[])
    Object.entries(params || {}).forEach(([k, v]) => {
      if (Array.isArray(v)) q[k] = String(v[0]);
      else if (v != null) q[k] = String(v);
    });
    return q;
  }, [params]);

  // Attempt to open the native app via custom scheme with fallback to Play Store on web
  const tryOpenApp = (pathAndQuery: string) => {
    if (!isWeb) return; // Native environment already inside app
    const schemeUrl = `edudashpro://${pathAndQuery.replace(/^\//, '')}`;

    let didHide = false;
    const visibilityHandler = () => {
      if (document.hidden) didHide = true;
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Kick off scheme open
    window.location.href = schemeUrl;

    // After 1.2s, if we are still visible, assume app is not installed and go to Play Store
    setTimeout(() => {
      document.removeEventListener('visibilitychange', visibilityHandler);
      if (!didHide) {
        window.location.href = playStoreUrl;
      }
    }, 1200);
  };

  useEffect(() => {
    const run = async () => {
      try {
        const flow = (query.flow || query.type || '').toLowerCase();

        // EMAIL CONFIRMATION: verify via token_hash if provided
        const tokenHash = query.token_hash || query.token || '';
        if ((flow === 'email-confirm' || query.type === 'email') && tokenHash) {
          setMessage('Verifying your email...');
          try {
            const { data, error } = await assertSupabase().auth.verifyOtp({ token_hash: tokenHash, type: 'email' });
            if (error) throw error;
            setMessage('Email verified. Opening app...');
            setStatus('done');
            // On native, route to sign-in or dashboard
            if (!isWeb) {
              router.replace('/(auth)/sign-in');
              return;
            }
            // On web, try to open app with context
            tryOpenApp(`/post-verify`);
            return;
          } catch (e: any) {
            setStatus('error');
            setMessage(e?.message || 'Email verification failed.');
            // Still try to open the app so the user can continue there
            if (isWeb) tryOpenApp(`/post-verify-error`);
            return;
          }
        }

        // PARENT INVITE: code param
        const inviteCode = query.code || query.invitationCode || '';
        if (flow === 'invite-parent' && inviteCode) {
          // Inside native app: navigate directly to parent registration with code
          if (!isWeb) {
            router.replace(`/screens/parent-registration?invitationCode=${encodeURIComponent(inviteCode)}` as any);
            return;
          }
          // On web: attempt to open app with deep link to parent registration
          setMessage('Opening the app for parent registration...');
          setStatus('ready');
          tryOpenApp(`/screens/parent-registration?invitationCode=${encodeURIComponent(inviteCode)}`);
          return;
        }

        // STUDENT/MEMBER INVITE
        if ((flow === 'invite-student' || flow === 'invite-member') && inviteCode) {
          if (!isWeb) {
            router.replace(`/screens/student-join-by-code?code=${encodeURIComponent(inviteCode)}` as any);
            return;
          }
          setMessage('Opening the app to join by code...');
          setStatus('ready');
          tryOpenApp(`/screens/student-join-by-code?code=${encodeURIComponent(inviteCode)}`);
          return;
        }

        // Default: if native, go home; if web, show minimal UI and attempt to open app root
        if (!isWeb) {
          router.replace('/');
          return;
        }
        setMessage('Opening the app...');
        setStatus('ready');
        tryOpenApp('/');
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Something went wrong.');
      }
    };
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.token_hash, query.type, query.flow, query.code, query.invitationCode]);

  if (!isWeb) {
    // On native, we keep a tiny loader, navigation happens above
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' }}>
        <ActivityIndicator color="#00f5ff" />
      </View>
    );
  }

  // Minimal web UI (fallback) for when app isn't installed
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#0a0a0f' }}>
      <ActivityIndicator color="#00f5ff" />
      {!!message && <Text style={{ color: '#ffffff', textAlign: 'center' }}>{message}</Text>}
      <TouchableOpacity onPress={() => tryOpenApp('/')} style={{ backgroundColor: '#00f5ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 }}>
        <Text style={{ color: '#000', fontWeight: '800' }}>Open EduDash Pro App</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => Linking.openURL(playStoreUrl)}>
        <Text style={{ color: '#9CA3AF', textDecorationLine: 'underline' }}>Install from Google Play</Text>
      </TouchableOpacity>
    </View>
  );
}
