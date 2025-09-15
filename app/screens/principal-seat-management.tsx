import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { assertSupabase } from '@/lib/supabase';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { getEffectiveLimits } from '@/lib/ai/limits';
import { router } from 'expo-router';

export default function PrincipalSeatManagementScreen() {
  const params = useLocalSearchParams<{ school?: string }>();
  const routeSchoolId = (params?.school ? String(params.school) : null);
  const { seats, assignSeat, revokeSeat } = useSubscription();
  const [effectiveSchoolId, setEffectiveSchoolId] = useState<string | null>(routeSchoolId);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<{ id: string; email: string; hasSeat: boolean }[]>([]);

  // Resolve the school id if not provided in the route
  useEffect(() => {
    (async () => {
      if (effectiveSchoolId) return; // already set from route
      try {
        // Try user metadata first
        const { data: userRes } = await assertSupabase().auth.getUser();
        const metaSchool = (userRes?.user?.user_metadata as any)?.preschool_id as string | undefined;
        if (metaSchool) { setEffectiveSchoolId(metaSchool); return; }
        // Fallback to profiles table
        if (userRes?.user?.id) {
          const { data: prof } = await assertSupabase()
            .from('profiles')
            .select('preschool_id')
            .eq('id', userRes.user.id)
            .maybeSingle();
          if (prof?.preschool_id) { setEffectiveSchoolId(prof.preschool_id); }
        }
      } catch (e) {
        console.debug('Failed to resolve school id:', e);
      }
    })();
  }, [effectiveSchoolId]);

  const loadSubscription = useCallback(async () => {
    if (!effectiveSchoolId) return;
    try {
      setLoading(true); setError(null);
      const { data, error } = await assertSupabase().from('subscriptions').select('id').eq('owner_type','school').eq('school_id', effectiveSchoolId).maybeSingle();
      if (!error && data) setSubscriptionId((data as any).id);
    } catch (e: any) { setError(e?.message || 'Load failed'); }
    finally { setLoading(false); }
  }, [effectiveSchoolId]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const loadTeachers = useCallback(async () => {
    if (!effectiveSchoolId) return;
    try {
      // Fetch teacher identities from profiles first
      const { data: profs, error: profErr } = await assertSupabase()
        .from('profiles')
        .select('id,email,role,preschool_id')
        .eq('preschool_id', effectiveSchoolId)
        .eq('role', 'teacher');

      let teacherList: { id: string; email: string; hasSeat: boolean }[] = (profs || []).map((p: any) => ({ id: p.id, email: p.email, hasSeat: false }));

      // If none found (schema variance), fall back to users table by auth_user_id
      if ((!teacherList || teacherList.length === 0)) {
        try {
          const { data: users } = await assertSupabase()
            .from('users')
            .select('id, auth_user_id, email, role, preschool_id')
            .eq('preschool_id', effectiveSchoolId)
            .eq('role', 'teacher');
          teacherList = (users || []).map((u: any) => ({ id: u.auth_user_id || u.id, email: u.email, hasSeat: false }));
        } catch (fallbackErr) {
          console.debug('Fallback users query failed:', fallbackErr);
        }
      }

      // Overlay seat assignment if we have a subscription id
      let seatSet = new Set<string>();
      if (subscriptionId) {
        const { data: seatsRows } = await assertSupabase().from('subscription_seats').select('user_id').eq('subscription_id', subscriptionId);
        seatSet = new Set((seatsRows || []).map((r: any) => r.user_id as string));
      }

      setTeachers(teacherList.map(t => ({ ...t, hasSeat: seatSet.has(t.id) })));
    } catch (e) {
      console.debug('Failed to load teachers for seat management', e);
    }
  }, [effectiveSchoolId, subscriptionId]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadSubscription(); await loadTeachers(); setRefreshing(false); }, [loadSubscription, loadTeachers]);

  const findTeacherIdByEmail = async (email: string): Promise<string | null> => {
    try {
      const { data } = await assertSupabase().from('profiles').select('id,role,preschool_id').eq('email', email).maybeSingle();
      if (data && (data as any).id) return (data as any).id as string;
      // Fallback to users table if profiles lookup fails
      const { data: u } = await assertSupabase().from('users').select('auth_user_id,email').eq('email', email).maybeSingle();
      if (u && (u as any).auth_user_id) return (u as any).auth_user_id as string;
      return null;
    } catch { return null; }
  };

  const onAssign = async () => {
    if (!subscriptionId || !teacherEmail) return;
    const userId = await findTeacherIdByEmail(teacherEmail);
    if (!userId) { setError('Teacher not found by email'); return; }
    const ok = await assignSeat(subscriptionId, userId);
    if (!ok) setError('Failed to assign seat');
  };

  const onRevoke = async () => {
    if (!subscriptionId || !teacherEmail) return;
    const userId = await findTeacherIdByEmail(teacherEmail);
    if (!userId) { setError('Teacher not found by email'); return; }
    const ok = await revokeSeat(subscriptionId, userId);
    if (!ok) setError('Failed to revoke seat');
  };

  const [canManageAI, setCanManageAI] = useState(false);
  useEffect(() => { (async () => { try { const limits = await getEffectiveLimits(); setCanManageAI(!!limits.canOrgAllocate); } catch { /* noop */ } })(); }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Seat Management', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <Text style={styles.title}>Manage Seats</Text>
        <Text style={styles.subtitle}>School: {effectiveSchoolId || '—'}</Text>
        <Text style={styles.subtitle}>Seats: {seats ? `${seats.used}/${seats.total}` : '—'}</Text>

        {loading ? <Text style={styles.info}>Loading subscription…</Text> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Teacher email</Text>
          <TextInput
            placeholder="teacher@example.com"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="none"
            keyboardType="email-address"
            value={teacherEmail}
            onChangeText={setTeacherEmail}
            style={styles.input}
          />
        </View>

        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={onAssign}>
            <Text style={styles.btnPrimaryText}>Assign seat</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={onRevoke}>
            <Text style={styles.btnDangerText}>Revoke seat</Text>
          </TouchableOpacity>
        </View>

        {canManageAI && (
          <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={() => router.push('/screens/admin-ai-allocation')}>
            <Text style={styles.btnPrimaryText}>Manage AI Allocation</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.title, { marginTop: 12 }]}>Teachers</Text>
        {teachers.map((t) => (
          <View key={t.id} style={styles.teacherRow}>
            <Text style={styles.teacherEmail}>{t.email}</Text>
            {t.hasSeat ? (
              <TouchableOpacity style={[styles.smallBtn, styles.btnDanger]} onPress={async () => { const ok = await revokeSeat(String(subscriptionId), t.id); if (ok) loadTeachers(); }}>
                <Text style={styles.btnDangerText}>Revoke</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.smallBtn, styles.btnPrimary]} onPress={async () => { const ok = await assignSeat(String(subscriptionId), t.id); if (ok) loadTeachers(); }}>
                <Text style={styles.btnPrimaryText}>Assign</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#0b1220' },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#9CA3AF' },
  info: { color: '#9CA3AF' },
  error: { color: '#ff6b6b' },
  inputGroup: { gap: 6 },
  label: { color: '#FFFFFF' },
  input: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', padding: 12 },
  row: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12 },
  btnPrimary: { backgroundColor: '#00f5ff' },
  btnPrimaryText: { color: '#000', fontWeight: '800' },
  btnDanger: { backgroundColor: '#ff0080' },
  btnDangerText: { color: '#000', fontWeight: '800' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111827', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#1f2937' },
  teacherEmail: { color: '#fff' },
  smallBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
});
