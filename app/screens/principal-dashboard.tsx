import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { DesignSystem } from '@/constants/DesignSystem';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { detectRoleAndSchool } from '@/lib/routeAfterLogin';
export default function PrincipalDashboardScreen() {
  const { user, session } = useAuth();
  const params = useLocalSearchParams<{ school?: string }>();
  const [role, setRole] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(params?.school ? String(params.school) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{teachers: number|null; students: number|null; classes: number|null}>({teachers: null, students: null, classes: null});

  const canView = role === 'principal' || role === 'admin';
  const signedIn = !!session && !!user;

  const loadRole = useCallback(async () => {
    try {
      const { role: detectedRole, school } = await detectRoleAndSchool(user);
      setRole(detectedRole);
      if (school && !schoolId) setSchoolId(String(school));
    } catch {}
  }, [user, schoolId]);

  useEffect(() => { loadRole(); }, [loadRole]);

  const fetchCounts = useCallback(async () => {
    if (!schoolId || !supabase) return;
    try {
      setLoading(true); setError(null);
      const q = async (table: string): Promise<number|null> => {
        const { count, error: err } = await supabase
          .from(table)
          .select('id', { count: 'exact', head: true })
          .eq('preschool_id', schoolId);
        if (err) return null;
        return typeof count === 'number' ? count : null;
      };
      const [t, s, c] = await Promise.all([
        q('teachers'), q('students'), q('classes')
      ]);
      setCounts({ teachers: t, students: s, classes: c });
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const valueDisplay = (v: number|null) => v === null ? '—' : String(v);
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchCounts(); setRefreshing(false); }, [fetchCounts]);

  if (!canView) {
    return (
      <>
        <Stack.Screen options={{ title: 'Principal Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <View style={styles.denied}><Text style={styles.deniedText}>Access denied — principal or admin role required.</Text></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Principal Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <Text style={styles.title}>School Overview</Text>
        <Text style={styles.subtitle}>
          {schoolId ? (loading ? 'Loading metrics…' : (error ? `Error: ${error}` : signedIn ? 'Metrics loaded.' : 'Metrics loaded (anon).')) : (signedIn ? 'No school selected — sign out/admin to pick one.' : 'Add ?school={id} to the URL or sign in to load metrics.')}
        </Text>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Teachers</Text>
            <Text style={styles.metricValue}>{valueDisplay(counts.teachers)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Students</Text>
            <Text style={styles.metricValue}>{valueDisplay(counts.students)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Classes</Text>
            <Text style={styles.metricValue}>{valueDisplay(counts.classes)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Activity</Text>
          <Text style={styles.cardBody}>No activity available.</Text>
        </View>

        {!signedIn ? (
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.ctaText}>Sign in to load data</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={[styles.cta, { marginTop: 8 }]} onPress={() => router.push({ pathname: '/screens/principal-seat-management', params: schoolId ? { school: String(schoolId) } : {} } as any)}>
          <Text style={styles.ctaText}>Seat Management</Text>
        </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const P = DesignSystem.spacing.md; // consistent padding
const R = 12; // consistent radius

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  deniedText: { color: '#fff' },
  container: { padding: P, gap: P, backgroundColor: '#0b1220' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#9CA3AF' },
  metricsRow: { flexDirection: 'row', gap: P, justifyContent: 'space-between' },
  metricCard: { flex: 1, backgroundColor: '#111827', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#1f2937', alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#9CA3AF' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 4 },
  card: { backgroundColor: '#111827', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#9CA3AF' },
  cta: { alignSelf: 'center', borderWidth: 1, borderColor: '#00e5ff', borderRadius: 20, paddingHorizontal: DesignSystem.spacing.lg, paddingVertical: DesignSystem.spacing.sm },
  ctaText: { color: '#00e5ff', fontWeight: '800' },
});
