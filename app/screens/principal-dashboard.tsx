import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { DesignSystem } from '@/constants/DesignSystem';
export default function PrincipalDashboardScreen() {
  const params = useLocalSearchParams<{ school?: string }>();
  const schoolId = (params?.school ? String(params.school) : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [counts, setCounts] = useState<{teachers: number|null; students: number|null; classes: number|null}>({teachers: null, students: null, classes: null});

  const fetchCounts = useCallback(async () => {
    if (!schoolId) return;
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
    const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
    if (!url || !anon) return;
    try {
      setLoading(true); setError(null);
      const q = async (table: string): Promise<number|null> => {
        const endpoint = `${url}/rest/v1/${table}?select=id&preschool_id=eq.${schoolId}`;
        const res = await fetch(endpoint, {
          headers: {
            apikey: anon,
            Authorization: `Bearer ${anon}`,
            Prefer: 'count=exact',
          },
        });
        if (!res.ok) return null;
        const cr = res.headers.get('content-range');
        if (!cr) return null;
        const match = /\/(\d+)$/g.exec(cr);
        return match ? Number(match[1]) : null;
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

  return (
    <>
      <Stack.Screen options={{ title: 'Principal Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <Text style={styles.title}>School Overview</Text>
        <Text style={styles.subtitle}>
          {schoolId ? (loading ? 'Loading metrics…' : (error ? `Error: ${error}` : 'Metrics loaded (read-only).')) : 'Add ?school={id} to the URL or sign in to load metrics.'}
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

        <TouchableOpacity style={styles.cta} onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.ctaText}>Sign in to load data</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.cta, { marginTop: 8 }]} onPress={() => router.push({ pathname: '/screens/principal-seat-management', params: schoolId ? { school: String(schoolId) } : {} } as any)}>
          <Text style={styles.ctaText}>Seat Management</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const P = DesignSystem.spacing.md; // consistent padding
const R = 12; // consistent radius

const styles = StyleSheet.create({
  container: { padding: P, gap: P },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  metricsRow: { flexDirection: 'row', gap: P, justifyContent: 'space-between' },
  metricCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  metricLabel: { fontSize: 12, color: '#6B7280' },
  metricValue: { fontSize: 24, fontWeight: '900', color: '#111827', marginTop: 4 },
  card: { backgroundColor: '#FFFFFF', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#374151' },
  cta: { alignSelf: 'center', borderWidth: 1, borderColor: '#00e5ff', borderRadius: 20, paddingHorizontal: DesignSystem.spacing.lg, paddingVertical: DesignSystem.spacing.sm },
  ctaText: { color: '#00e5ff', fontWeight: '800' },
});
