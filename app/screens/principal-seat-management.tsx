import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl, FlatList } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useSubscription } from '@/contexts/SubscriptionContext';

export default function PrincipalSeatManagementScreen() {
  const params = useLocalSearchParams<{ school?: string }>();
  const schoolId = (params?.school ? String(params.school) : null);
  const { seats, assignSeat, revokeSeat } = useSubscription();
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<{ id: string; email: string; hasSeat: boolean }[]>([]);

  const loadSubscription = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true); setError(null);
      const { data, error } = await supabase!.from('subscriptions').select('id').eq('owner_type','school').eq('school_id', schoolId).maybeSingle();
      if (!error && data) setSubscriptionId((data as any).id);
    } catch (e: any) { setError(e?.message || 'Load failed'); }
    finally { setLoading(false); }
  }, [schoolId]);

  useEffect(() => { loadSubscription(); }, [loadSubscription]);

  const loadTeachers = useCallback(async () => {
    if (!schoolId || !subscriptionId) return;
    try {
      const { data: profs } = await supabase!.from('profiles').select('id,email,role,preschool_id').eq('preschool_id', schoolId).eq('role', 'teacher');
      const teacherList: { id: string; email: string; hasSeat: boolean }[] = (profs || []).map((p: any) => ({ id: p.id, email: p.email, hasSeat: false }));
      const { data: seatsRows } = await supabase!.from('subscription_seats').select('user_id').eq('subscription_id', subscriptionId);
      const seatSet = new Set((seatsRows || []).map((r: any) => r.user_id as string));
      setTeachers(teacherList.map(t => ({ ...t, hasSeat: seatSet.has(t.id) })));
    } catch {}
  }, [schoolId, subscriptionId]);

  useEffect(() => { loadTeachers(); }, [loadTeachers]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await loadSubscription(); await loadTeachers(); setRefreshing(false); }, [loadSubscription, loadTeachers]);

  const findTeacherIdByEmail = async (email: string): Promise<string | null> => {
    try {
      const { data } = await supabase!.from('profiles').select('id,role,preschool_id').eq('email', email).maybeSingle();
      if (data && (data as any).id) return (data as any).id as string;
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

  return (
    <>
      <Stack.Screen options={{ title: 'Seat Management', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <Text style={styles.title}>Manage Seats</Text>
        <Text style={styles.subtitle}>School: {schoolId || '—'}</Text>
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
