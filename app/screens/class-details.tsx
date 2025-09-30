/**
 * Class Details Screen
 * 
 * Shows detailed information about a specific class including:
 * - Class overview and schedule
 * - Student list and attendance
 * - Recent assignments
 * - Class analytics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { assertSupabase } from '@/lib/supabase';

interface ClassDetails {
  id: string;
  name: string;
  grade: string;
  room: string;
  studentCount: number;
  teacher: string;
  schedule: string;
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  attendanceRate: number;
  lastAttendance: string;
}

export default function ClassDetailsScreen() {
  const { classId, className } = useLocalSearchParams<{ classId: string; className: string }>();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadClassDetails = async () => {
    try {
      setError(null);
      
      // Fetch class details
      const { data: classData, error: classError } = await assertSupabase()
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();

      if (classError) throw classError;

      setClassDetails({
        id: classData.id,
        name: classData.name,
        grade: classData.grade || 'N/A',
        room: classData.room || 'N/A',
        studentCount: classData.student_count || 0,
        teacher: classData.teacher_name || 'Not assigned',
        schedule: classData.schedule || 'Not set',
      });

      // Fetch students in this class
      const { data: studentsData, error: studentsError } = await assertSupabase()
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .limit(50);

      if (studentsError) throw studentsError;

      setStudents(
        (studentsData || []).map((s: any) => ({
          id: s.id,
          firstName: s.first_name,
          lastName: s.last_name,
          attendanceRate: 95, // Placeholder
          lastAttendance: 'Today',
        }))
      );
    } catch (err: any) {
      console.error('Error loading class details:', err);
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadClassDetails();
    }
  }, [classId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadClassDetails();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Loading...', headerShown: true }} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={styles.loadingText}>Loading class details...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Error', headerShown: true }} />
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle" size={48} color={theme.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadClassDetails}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: className || 'Class Details',
          headerShown: true,
          headerBackTitle: 'Back',
        }} 
      />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Class Overview Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="school" size={24} color={theme.primary} />
            <Text style={styles.cardTitle}>Class Overview</Text>
          </View>
          
          {classDetails && (
            <View style={styles.cardContent}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Class Name:</Text>
                <Text style={styles.infoValue}>{classDetails.name}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Grade:</Text>
                <Text style={styles.infoValue}>{classDetails.grade}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Room:</Text>
                <Text style={styles.infoValue}>{classDetails.room}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Students:</Text>
                <Text style={styles.infoValue}>{classDetails.studentCount}</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Teacher:</Text>
                <Text style={styles.infoValue}>{classDetails.teacher}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="flash" size={24} color={theme.primary} />
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/screens/attendance')}
            >
              <Ionicons name="checkmark-circle" size={32} color="#059669" />
              <Text style={styles.actionText}>Take Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/screens/assign-homework')}
            >
              <Ionicons name="create" size={32} color="#4F46E5" />
              <Text style={styles.actionText}>Create Assignment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/screens/teacher-messages')}
            >
              <Ionicons name="chatbubbles" size={32} color="#7C3AED" />
              <Text style={styles.actionText}>Message Parents</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/screens/teacher-reports')}
            >
              <Ionicons name="stats-chart" size={32} color="#DC2626" />
              <Text style={styles.actionText}>View Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Students List */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={24} color={theme.primary} />
            <Text style={styles.cardTitle}>Students ({students.length})</Text>
          </View>
          
          {students.length > 0 ? (
            <View style={styles.cardContent}>
              {students.map((student) => (
                <TouchableOpacity
                  key={student.id}
                  style={styles.studentItem}
                  onPress={() => router.push(`/screens/student-detail?studentId=${student.id}`)}
                >
                  <View style={styles.studentAvatar}>
                    <Text style={styles.studentInitials}>
                      {student.firstName[0]}{student.lastName[0]}
                    </Text>
                  </View>
                  
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={styles.studentMeta}>
                      {student.attendanceRate}% attendance • {student.lastAttendance}
                    </Text>
                  </View>
                  
                  <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="person-add" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyText}>No students enrolled yet</Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => router.push('/screens/student-enrollment')}
              >
                <Text style={styles.emptyButtonText}>Add Students</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollView: {
      flex: 1,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    loadingText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
    },
    errorText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.error,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      paddingHorizontal: 32,
      paddingVertical: 12,
      backgroundColor: theme.primary,
      borderRadius: 8,
    },
    retryButtonText: {
      color: theme.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    card: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      margin: 16,
      marginBottom: 0,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginLeft: 8,
    },
    cardContent: {
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    infoLabel: {
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    infoValue: {
      fontSize: 14,
      color: theme.text,
      fontWeight: '600',
    },
    actionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 8,
    },
    actionButton: {
      flex: 1,
      minWidth: '45%',
      aspectRatio: 1.2,
      backgroundColor: theme.elevated,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionText: {
      marginTop: 8,
      fontSize: 12,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    studentItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    studentAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    studentInitials: {
      color: theme.onPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    studentInfo: {
      flex: 1,
    },
    studentName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    studentMeta: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    emptyText: {
      marginTop: 16,
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    emptyButton: {
      marginTop: 16,
      paddingHorizontal: 24,
      paddingVertical: 12,
      backgroundColor: theme.primary,
      borderRadius: 8,
    },
    emptyButtonText: {
      color: theme.onPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
  });