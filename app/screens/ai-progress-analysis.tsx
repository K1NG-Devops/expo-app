import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { getFeatureFlagsSync } from '@/lib/featureFlags';
import { canUseFeature, getQuotaStatus } from '@/lib/ai/limits';
import { router } from 'expo-router';

interface StudentProgress {
  id: string;
  name: string;
  recentGrades: number[];
  averageGrade: number;
  improvement: number;
  subjects: { [key: string]: number };
  lastAssignment: string;
}

interface ClassAnalytics {
  classId: string;
  className: string;
  totalStudents: number;
  averagePerformance: number;
  improvingStudents: number;
  strugglingStudents: number;
  recentTrends: string[];
}

export default function AIProgressAnalysisScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<{
    studentProgress: StudentProgress[];
    classAnalytics: ClassAnalytics[];
    insights: string[];
  } | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const flags = getFeatureFlagsSync();
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true');
  const aiAnalysisEnabled = AI_ENABLED && flags.ai_progress_analysis !== false;

  const fetchProgressData = async () => {
    try {
      setLoading(true);

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Check quota before proceeding (use grading assistance quota as proxy)
      const gate = await canUseFeature('grading_assistance', 1);
      if (!gate.allowed) {
        const status = await getQuotaStatus('grading_assistance');
        Alert.alert(
          'Monthly limit reached',
          `You have used ${status.used} of ${status.limit} progress analyses this month.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'See plans', onPress: () => router.push('/pricing') },
          ]
        );
        return;
      }

      // Get teacher's classes
      const { data: classes } = await assertSupabase()
        .from('classes')
        .select(`
          id,
          name,
          students!inner(
            id,
            first_name,
            last_name,
            assignment_submissions!left(
              id,
              grade,
              submitted_at,
              assignment:assignments!inner(
                title,
                subject,
                created_at
              )
            )
          )
        `)
        .eq('is_active', true);

      if (!classes || classes.length === 0) {
        setAnalysisData({
          studentProgress: [],
          classAnalytics: [],
          insights: ['No classes found. Create some classes and assignments to see progress analysis.']
        });
        return;
      }

      // Process the data into progress format
      const studentProgress: StudentProgress[] = [];
      const classAnalytics: ClassAnalytics[] = [];

      for (const classInfo of classes) {
        const students = (classInfo as any).students || [];
        const classGrades: number[] = [];
        
        for (const student of students as any[]) {
          const submissions: any[] = student.assignment_submissions || [];
          const grades = submissions
            .filter((s: any) => s.grade != null)
            .map((s: any) => parseFloat(s.grade))
            .filter((g: number) => !isNaN(g));

          if (grades.length > 0) {
            const averageGrade = grades.reduce((a, b) => a + b, 0) / grades.length;
            const recentGrades = grades.slice(-5); // Last 5 grades
            const improvement = recentGrades.length > 1 
              ? ((recentGrades[recentGrades.length - 1] - recentGrades[0]) / recentGrades[0]) * 100
              : 0;

            // Group by subject (collect arrays then compute averages)
            const subjectsGrades: Record<string, number[]> = {};
            submissions.forEach((sub: any) => {
              const assignmentMeta = Array.isArray(sub.assignment) ? sub.assignment[0] : sub.assignment;
              const subj = assignmentMeta?.subject;
              if (subj && sub.grade != null) {
                if (!subjectsGrades[subj]) subjectsGrades[subj] = [];
                subjectsGrades[subj].push(parseFloat(sub.grade));
              }
            });

            const subjects: { [key: string]: number } = {};
            Object.keys(subjectsGrades).forEach((subj) => {
              const arr = subjectsGrades[subj];
              subjects[subj] = arr.reduce((a: number, b: number) => a + b, 0) / arr.length;
            });

            const sorted = [...submissions].sort(
              (a: any, b: any) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
            );
            const latest = sorted[0];
            const latestAssignmentMeta = latest ? (Array.isArray(latest.assignment) ? latest.assignment[0] : latest.assignment) : null;
            const lastAssignment = latestAssignmentMeta?.title || 'No recent assignments';

            studentProgress.push({
              id: student.id,
              name: `${student.first_name} ${student.last_name}`,
              recentGrades,
              averageGrade,
              improvement,
              subjects,
              lastAssignment
            });

            classGrades.push(averageGrade);
          }
        }

        if (classGrades.length > 0) {
          const averagePerformance = classGrades.reduce((a, b) => a + b, 0) / classGrades.length;
          const improvingStudents = studentProgress.filter(s => s.improvement > 5).length;
          const strugglingStudents = studentProgress.filter(s => s.averageGrade < 60).length;

          classAnalytics.push({
            classId: classInfo.id,
            className: classInfo.name,
            totalStudents: students.length,
            averagePerformance,
            improvingStudents,
            strugglingStudents,
            recentTrends: [
              `Class average: ${averagePerformance.toFixed(1)}%`,
              `${improvingStudents} students improving`,
              `${strugglingStudents} students need support`
            ]
          });
        }
      }

      // Generate AI insights
      const insights = [
        `Analyzed ${studentProgress.length} students across ${classAnalytics.length} classes`,
        classAnalytics.length > 0 
          ? `Best performing class: ${classAnalytics.sort((a, b) => b.averagePerformance - a.averagePerformance)[0]?.className}`
          : 'No performance data available yet',
        studentProgress.filter(s => s.improvement > 10).length > 0
          ? `${studentProgress.filter(s => s.improvement > 10).length} students showing significant improvement`
          : 'Consider providing additional support for struggling students'
      ];

      setAnalysisData({
        studentProgress,
        classAnalytics,
        insights
      });

      track('edudash.ai.progress_analysis_completed', {
        classes_analyzed: classAnalytics.length,
        students_analyzed: studentProgress.length
      });

    } catch (error) {
      console.error('Failed to fetch progress data:', error);
      Alert.alert('Error', 'Failed to load progress analysis. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProgressData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProgressData();
  };

  const renderStudentCard = (student: StudentProgress) => (
    <View key={student.id} style={styles.studentCard}>
      <View style={styles.studentHeader}>
        <Text style={styles.studentName}>{student.name}</Text>
        <View style={[
          styles.improvementBadge,
          { backgroundColor: student.improvement > 0 ? '#10B981' : student.improvement < -5 ? '#EF4444' : '#6B7280' }
        ]}>
          <Ionicons 
            name={student.improvement > 0 ? 'trending-up' : student.improvement < -5 ? 'trending-down' : 'remove'} 
            size={12} 
            color="white" 
          />
          <Text style={styles.improvementText}>
            {student.improvement > 0 ? '+' : ''}{student.improvement.toFixed(1)}%
          </Text>
        </View>
      </View>
      
      <Text style={styles.averageGrade}>Average: {student.averageGrade.toFixed(1)}%</Text>
      <Text style={styles.lastAssignment}>Last: {student.lastAssignment}</Text>
      
      {Object.keys(student.subjects).length > 0 && (
        <View style={styles.subjectsContainer}>
          {Object.entries(student.subjects).slice(0, 3).map(([subject, grade]) => (
            <View key={subject} style={styles.subjectPill}>
              <Text style={styles.subjectText}>{subject}: {grade.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderClassCard = (classData: ClassAnalytics) => (
    <TouchableOpacity 
      key={classData.classId} 
      style={[styles.classCard, selectedClass === classData.classId && styles.selectedClassCard]}
      onPress={() => setSelectedClass(selectedClass === classData.classId ? null : classData.classId)}
    >
      <Text style={styles.className}>{classData.className}</Text>
      <Text style={styles.classStats}>
        {classData.totalStudents} students • {classData.averagePerformance.toFixed(1)}% avg
      </Text>
      
      <View style={styles.trendsContainer}>
        <View style={styles.trendItem}>
          <Ionicons name="trending-up" size={16} color="#10B981" />
          <Text style={styles.trendText}>{classData.improvingStudents} improving</Text>
        </View>
        <View style={styles.trendItem}>
          <Ionicons name="help-circle" size={16} color="#F59E0B" />
          <Text style={styles.trendText}>{classData.strugglingStudents} need support</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="AI Progress Analysis" subtitle="AI-powered student insights" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Analyzing student progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!aiAnalysisEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="AI Progress Analysis" subtitle="AI-powered student insights" />
        <View style={styles.disabledContainer}>
          <Ionicons name="analytics-outline" size={64} color={Colors.light.tabIconDefault} />
          <Text style={styles.disabledTitle}>AI Analysis Disabled</Text>
          <Text style={styles.disabledText}>
            Progress analysis is not enabled in this build or your plan.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="AI Progress Analysis" subtitle="AI-powered student insights" />
      
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.light.tint}
          />
        }
      >
        {/* Insights Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Insights</Text>
          {analysisData?.insights.map((insight, index) => (
            <View key={index} style={styles.insightCard}>
              <Ionicons name="bulb-outline" size={20} color={Colors.light.tint} />
              <Text style={styles.insightText}>{insight}</Text>
            </View>
          ))}
        </View>

        {/* Class Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Class Overview</Text>
          {analysisData?.classAnalytics.length === 0 ? (
            <Text style={styles.emptyText}>No class data available</Text>
          ) : (
            analysisData?.classAnalytics.map(renderClassCard)
          )}
        </View>

        {/* Student Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Progress</Text>
          {analysisData?.studentProgress.length === 0 ? (
            <Text style={styles.emptyText}>No student progress data available</Text>
          ) : (
            analysisData?.studentProgress
              .filter(() => !selectedClass || 
                analysisData.classAnalytics.find(c => c.classId === selectedClass))
              .slice(0, 10) // Show top 10 students
              .map(renderStudentCard)
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  disabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  disabledTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
    marginBottom: 16,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  insightText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: Colors.light.text,
    lineHeight: 20,
  },
  classCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedClassCard: {
    borderColor: Colors.light.tint,
  },
  className: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  classStats: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 12,
  },
  trendsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  studentCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  studentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  improvementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  improvementText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  averageGrade: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  lastAssignment: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
    marginBottom: 8,
  },
  subjectsContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  subjectPill: {
    backgroundColor: Colors.light.tint + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  subjectText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.light.tabIconDefault,
    fontStyle: 'italic',
    padding: 32,
  },
});