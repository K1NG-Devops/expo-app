import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { signOutAndRedirect } from '@/lib/authActions';

export default function AccountScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [school, setSchool] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase!.auth.getUser();
    const u = data.user;
    setEmail(u?.email ?? null);
    let r = (u?.user_metadata as any)?.role ?? null;
    let s = (u?.user_metadata as any)?.preschool_id ?? null;
    if (u?.id && (!r || !s)) {
      try {
        const { data: p } = await supabase!.from('profiles').select('role,preschool_id').eq('id', u.id).maybeSingle();
        r = r || (p as any)?.role || null;
        s = s || (p as any)?.preschool_id || null;
      } catch {}
    }
    setRole(r);
    setSchool(s);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await load(); setRefreshing(false); }, [load]);

  return (
    <>
      <Stack.Screen options={{ title: 'Account', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{email ?? '—'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>{role ?? '—'}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.label}>Preschool ID</Text>
          <Text style={styles.value}>{school ?? '—'}</Text>
        </View>

        <TouchableOpacity onPress={signOutAndRedirect} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  label: { color: '#9CA3AF', marginBottom: 4 },
  value: { color: '#FFFFFF', fontWeight: '800' },
  signOut: { alignSelf: 'center', borderWidth: 1, borderColor: '#00f5ff', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 12 },
  signOutText: { color: '#00f5ff', fontWeight: '800' },
});
