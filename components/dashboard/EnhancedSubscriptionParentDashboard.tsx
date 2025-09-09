import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View, Text, RefreshControl, StyleSheet } from 'react-native';
import AdBanner from '@/components/ui/AdBanner';
import { DesignSystem } from '@/constants/DesignSystem';
import { supabase } from '@/lib/supabase';

function useTier() {
  // Temporary: derive from env or profiles; default to 'free'
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  useEffect(() => {
    const forced = (process.env.EXPO_PUBLIC_FORCE_TIER || '').toLowerCase();
    if (forced === 'pro' || forced === 'enterprise') setTier(forced as any);
    (async () => {
      try {
        const { data } = await supabase!.auth.getUser();
        const roleTier = (data.user?.user_metadata as any)?.subscription_tier as string | undefined;
        if (roleTier === 'pro' || roleTier === 'enterprise') setTier(roleTier as any);
      } catch {}
    })();
  }, []);
  return tier;
}

export default function EnhancedSubscriptionParentDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const [usage, setUsage] = useState<{ ai_help: number; ai_lessons: number; tutoring_sessions: number }>({ ai_help: 0, ai_lessons: 0, tutoring_sessions: 0 });
  const [limits, setLimits] = useState<{ ai_help: number | 'unlimited'; ai_lessons: number | 'unlimited'; tutoring_sessions: number | 'unlimited' }>({ ai_help: 10, ai_lessons: 5, tutoring_sessions: 2 });
  const tier = useTier();

  const isAndroid = Platform.OS === 'android';
  const adsEnabled = process.env.EXPO_PUBLIC_ENABLE_ADS !== '0';
  const showBanner = isAndroid && adsEnabled && tier === 'free';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // TODO: Wire usage fetch from Supabase usage logs
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  useEffect(() => {
    // Adjust limits by tier
    if (tier === 'pro') {
      setLimits({ ai_help: 100, ai_lessons: 50, tutoring_sessions: 10 });
    } else if (tier === 'enterprise') {
      setLimits({ ai_help: 'unlimited', ai_lessons: 'unlimited', tutoring_sessions: 'unlimited' });
    } else {
      setLimits({ ai_help: 10, ai_lessons: 5, tutoring_sessions: 2 });
    }
  }, [tier]);

  const Stat = ({ label, value, limit }: { label: string; value: number; limit: number | 'unlimited' }) => (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>
        {value}
        <Text style={styles.statLimit}> / {String(limit)}</Text>
      </Text>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
      <Text style={styles.title}>Parent Dashboard</Text>
      <Text style={styles.subtitle}>Tier: {tier.toUpperCase()}</Text>

      <View style={styles.statsRow}>
        <Stat label="AI Homework Help" value={usage.ai_help} limit={limits.ai_help} />
        <Stat label="AI Lessons" value={usage.ai_lessons} limit={limits.ai_lessons} />
        <Stat label="Tutoring Sessions" value={usage.tutoring_sessions} limit={limits.tutoring_sessions} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recent Activity</Text>
        <Text style={styles.cardBody}>Coming soon…</Text>
      </View>

      {showBanner ? <AdBanner /> : null}
    </ScrollView>
  );
}

const P = DesignSystem.spacing.md;
const R = 12;

const styles = StyleSheet.create({
  container: { padding: P, gap: P },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  statsRow: { flexDirection: 'row', gap: P, justifyContent: 'space-between' },
  statCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 20, fontWeight: '900', color: '#111827' },
  statLimit: { fontSize: 12, color: '#6B7280' },
  card: { backgroundColor: '#FFFFFF', borderRadius: R, padding: P, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#374151' },
});
