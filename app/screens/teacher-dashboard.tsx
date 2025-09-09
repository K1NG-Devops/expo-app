import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';

export default function TeacherDashboardScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // TODO: replace with real refetch of classes/students/lessons
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: 'Teacher Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <Text style={styles.title}>Teacher Dashboard</Text>
        <Text style={styles.subtitle}>Static shell — we will wire live data next.</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Classes</Text><Text style={styles.cardBody}>No classes yet.</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Students</Text><Text style={styles.cardBody}>No students yet.</Text></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Lessons</Text><Text style={styles.cardBody}>No lessons yet.</Text></View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginBottom: 8 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 4 },
  cardBody: { fontSize: 14, color: '#374151' },
});
