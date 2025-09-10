import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { detectRoleAndSchool } from '@/lib/routeAfterLogin';

export default function TeacherDashboardScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const canView = role === 'teacher';

  const loadRole = useCallback(async () => {
    try {
      const { role: detectedRole } = await detectRoleAndSchool(user);
      setRole(detectedRole);
    } catch {}
  }, [user]);

  useEffect(() => { loadRole(); }, [loadRole]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: replace with real refetch of classes/students/lessons
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  if (!canView) {
    return (
      <>
        <Stack.Screen options={{ title: 'Teacher Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <View style={styles.denied}><Text style={styles.deniedText}>Access denied — teacher role required.</Text></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Teacher Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
          <Text style={styles.title}>Teacher Dashboard</Text>
          <Text style={styles.subtitle}>Static shell — we will wire live data next.</Text>
          <View style={styles.card}><Text style={styles.cardTitle}>Classes</Text><Text style={styles.cardBody}>No classes yet.</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Students</Text><Text style={styles.cardBody}>No students yet.</Text></View>
          <View style={styles.card}><Text style={styles.cardTitle}>Lessons</Text><Text style={styles.cardBody}>No lessons yet.</Text></View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  deniedText: { color: '#fff' },
  container: { padding: 16, gap: 12, backgroundColor: '#0b1220' },
  title: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#9CA3AF' },
});
