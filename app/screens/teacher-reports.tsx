import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { Stack, router } from 'expo-router'
import { useTeacherDashboard } from '@/hooks/useDashboardData'
import { Ionicons } from '@expo/vector-icons'

export default function TeacherReportsScreen() {
  const { profile } = require('@/contexts/AuthContext') as any
  const hasActiveSeat = profile?.hasActiveSeat?.() || profile?.seat_status === 'active'
  const canViewAnalytics = hasActiveSeat || (!!profile?.hasCapability && profile.hasCapability('view_class_analytics' as any))
  const palette = { background: '#0b1220', text: '#FFFFFF', textSecondary: '#9CA3AF', outline: '#1f2937', surface: '#111827', primary: '#00f5ff' }
  const { data } = useTeacherDashboard()

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ 
        title: 'Reports', 
        headerStyle: { backgroundColor: palette.background }, 
        headerTitleStyle: { color: '#fff' }, 
        headerTintColor: palette.primary,
        headerBackVisible: true,
        headerBackTitleVisible: false
      }} />
      <StatusBar style="light" backgroundColor={palette.background} />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: palette.background }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.subtitle}>{data?.schoolName || '—'}</Text>

          {!canViewAnalytics && (
            <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
              <Text style={styles.cardTitle}>Access Restricted</Text>
              <Text style={{ color: '#9CA3AF' }}>Your seat does not permit viewing analytics yet. Please contact your administrator.</Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
            <Text style={styles.cardTitle}>Overview</Text>
            <View style={styles.metricsRow}>
              <Metric title="Students" value={String(data?.totalStudents ?? 0)} icon="people-outline" color="#4F46E5" />
              <Metric title="Classes" value={String(data?.totalClasses ?? 0)} icon="library-outline" color="#059669" />
              <Metric title="Pending grading" value={String(data?.pendingGrading ?? 0)} icon="document-text-outline" color="#DC2626" />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
            <Text style={styles.cardTitle}>Recent assignments</Text>
            {(data?.recentAssignments || []).length === 0 ? (
              <Text style={styles.muted}>No recent assignments.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {data?.recentAssignments?.map(a => (
                  <View key={a.id} style={styles.assignmentRow}>
                    <View>
                      <Text style={styles.assignmentTitle}>{a.title}</Text>
                      <Text style={styles.assignmentMeta}>Due: {a.dueDate} • {a.submitted}/{a.total} submitted • {a.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push('/screens/assign-homework')}>
                      <Text style={styles.link}>Manage</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.outline }]}>
            <Text style={styles.cardTitle}>Actions</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/screens/attendance')}>
                <Ionicons name="checkmark-done" size={18} color="#000" />
                <Text style={styles.actionText}>Take Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/screens/create-lesson')}>
                <Ionicons name="add-circle" size={18} color="#000" />
                <Text style={styles.actionText}>Create Lesson</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/screens/teacher-messages')}>
                <Ionicons name="chatbubbles" size={18} color="#000" />
                <Text style={styles.actionText}>Message Parents</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}

function Metric({ title, value, icon, color }: { title: string; value: string; icon: any; color: string }) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  subtitle: { color: '#9CA3AF' },
  card: { borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { color: '#fff', fontWeight: '800' },
  metricsRow: { flexDirection: 'row', gap: 12 },
  metric: { backgroundColor: '#0b1220', borderWidth: 1, borderColor: '#1f2937', borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 100, flex: 1 },
  metricIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  metricValue: { color: '#fff', fontWeight: '900', fontSize: 18 },
  metricTitle: { color: '#9CA3AF', fontSize: 12 },
  muted: { color: '#9CA3AF' },
  assignmentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  assignmentTitle: { color: '#fff', fontWeight: '700' },
  assignmentMeta: { color: '#9CA3AF', fontSize: 12 },
  link: { color: '#00f5ff', fontWeight: '800' },
  actionBtn: { backgroundColor: '#00f5ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  actionText: { color: '#000', fontWeight: '800' },
})

