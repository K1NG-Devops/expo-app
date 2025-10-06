import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';

export default function OrgAdminDashboard() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Organization Admin' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Organization Overview</Text>
        <View style={styles.kpiRow}>
          <KPI title="Active Learners" value="--" />
          <KPI title="Completion Rate" value="--%" />
          <KPI title="Cert Pipeline" value="--" />
          <KPI title="MRR" value="$--" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.row}>
          <ActionBtn label="Programs" />
          <ActionBtn label="Cohorts" />
          <ActionBtn label="Instructors" />
          <ActionBtn label="Enrollments" />
        </View>
        <View style={styles.row}>
          <ActionBtn label="Certifications" />
          <ActionBtn label="Placements" />
          <ActionBtn label="Invoices" />
          <ActionBtn label="Settings" />
        </View>
      </ScrollView>
    </View>
  );
}

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );
}

function ActionBtn({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.action} onPress={onPress}>
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16, gap: 12 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '800' },
  kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  kpi: { flexBasis: '48%', backgroundColor: '#111827', padding: 12, borderRadius: 12, borderColor: '#1f2937', borderWidth: 1 },
  kpiValue: { color: '#fff', fontSize: 22, fontWeight: '800' },
  kpiTitle: { color: '#9CA3AF', marginTop: 4 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexBasis: '48%', backgroundColor: '#111827', padding: 14, borderRadius: 12, borderColor: '#1f2937', borderWidth: 1, alignItems: 'center' },
  actionText: { color: '#fff', fontWeight: '700' },
});
