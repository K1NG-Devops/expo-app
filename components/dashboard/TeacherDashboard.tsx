/**
 * Teacher Dashboard - Complete Teaching Interface
 * 
 * Features:
 * - Class overview and student management
 * - Lesson planning and AI tools
 * - Assignment and homework management  
 * - Student progress tracking
 * - Communication with parents
 * - Teaching resources and activities
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTeacherDashboard } from '@/hooks/useDashboardData';
import { router } from 'expo-router';
import { track } from '@/lib/analytics';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
  grade: string;
  room: string;
  nextLesson: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: 'pending' | 'graded' | 'overdue';
}

interface TeacherMetric {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

export const TeacherDashboard: React.FC = () => {
  const { user } = useAuth();
  
  // Use the custom data hook
  const { data: dashboardData, loading: isLoading, refresh } = useTeacherDashboard();
  const metrics: TeacherMetric[] = dashboardData ? [
    {
      title: 'My Students',
      value: dashboardData.totalStudents,
      subtitle: `across ${dashboardData.totalClasses} classes`,
      icon: 'people-outline',
      color: '#4F46E5',
    },
    {
      title: 'Pending Grading',
      value: dashboardData.pendingGrading,
      subtitle: 'assignments to review',
      icon: 'document-text-outline',
      color: '#DC2626',
    },
    {
      title: 'Lessons Today',
      value: dashboardData.upcomingLessons,
      subtitle: 'scheduled classes',
      icon: 'book-outline',
      color: '#059669',
    },
  ] : [];

  const aiTools = [
    {
      id: 'lesson-generator',
      title: 'AI Lesson Generator',
      subtitle: 'Create engaging lessons with AI',
      icon: 'bulb',
      color: '#4F46E5',
      onPress: () => { track('edudash.ai.lesson_generator_opened'); router.push('/screens/ai-lesson-generator'); },
    },
    {
      id: 'homework-grader',
      title: 'Grade Homework',
      subtitle: 'Auto-grade assignments with AI',
      icon: 'checkmark-circle',
      color: '#059669',
      onPress: () => { track('edudash.ai.homework_grader_opened'); router.push('/screens/ai-homework-grader-live'); },
    },
    {
      id: 'progress-analysis',
      title: 'Progress Analysis',
      subtitle: 'AI-powered student insights',
      icon: 'analytics',
      color: '#7C3AED',
      onPress: () => Alert.alert('AI Tools', 'Progress analysis coming soon'),
    },
  ];

  const quickActions = [
    {
      id: 'take-attendance',
      title: 'Take Attendance',
      icon: 'checkmark-done',
      color: '#059669',
      onPress: () => Alert.alert('Action', 'Attendance feature coming soon'),
    },
    {
      id: 'create-lesson',
      title: 'Create Lesson',
      icon: 'add-circle',
      color: '#4F46E5',
      onPress: () => Alert.alert('Action', 'Lesson creation coming soon'),
    },
    {
      id: 'message-parents',
      title: 'Message Parents',
      icon: 'chatbubbles',
      color: '#7C3AED',
      onPress: () => Alert.alert('Action', 'Messaging feature coming soon'),
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      icon: 'document-text',
      color: '#DC2626',
      onPress: () => Alert.alert('Action', 'Reports coming soon'),
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const renderMetricCard = (metric: TeacherMetric) => (
    <View key={metric.title} style={[styles.metricCard, { borderLeftColor: metric.color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={metric.icon as any} size={24} color={metric.color} />
        <Text style={styles.metricValue}>{metric.value}</Text>
      </View>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      {metric.subtitle && (
        <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
      )}
    </View>
  );

  const renderClassCard = (classInfo: ClassInfo) => (
    <TouchableOpacity key={classInfo.id} style={styles.classCard}>
      <View style={styles.classHeader}>
        <View>
          <Text style={styles.className}>{classInfo.name}</Text>
          <Text style={styles.classDetails}>{classInfo.grade} • {classInfo.room}</Text>
        </View>
        <View style={styles.studentCount}>
          <Ionicons name="people" size={16} color={Colors.light.tabIconDefault} />
          <Text style={styles.studentCountText}>{classInfo.studentCount}</Text>
        </View>
      </View>
      <View style={styles.nextLesson}>
        <Ionicons name="time-outline" size={16} color="#4F46E5" />
        <Text style={styles.nextLessonText}>{classInfo.nextLesson}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderAssignmentCard = (assignment: Assignment) => (
    <TouchableOpacity key={assignment.id} style={styles.assignmentCard}>
      <View style={styles.assignmentHeader}>
        <Text style={styles.assignmentTitle}>{assignment.title}</Text>
        <View style={[styles.statusBadge, {
          backgroundColor: assignment.status === 'graded' ? '#059669' : 
                         assignment.status === 'overdue' ? '#DC2626' : '#EA580C'
        }]}>
          <Text style={styles.statusText}>
            {assignment.status === 'graded' ? 'Graded' : 
             assignment.status === 'overdue' ? 'Overdue' : 'Pending'}
          </Text>
        </View>
      </View>
      <Text style={styles.assignmentDue}>Due: {assignment.dueDate}</Text>
      <View style={styles.assignmentProgress}>
        <Text style={styles.progressText}>
          {assignment.submitted}/{assignment.total} submitted
        </Text>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(assignment.submitted / assignment.total) * 100}%` }
            ]} 
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAIToolCard = (tool: typeof aiTools[0]) => (
    <TouchableOpacity
      key={tool.id}
      style={[styles.aiToolCard, { backgroundColor: tool.color + '10' }]}
      onPress={tool.onPress}
    >
      <View style={[styles.aiToolIcon, { backgroundColor: tool.color }]}>
        <Ionicons name={tool.icon as any} size={24} color="white" />
      </View>
      <View style={styles.aiToolContent}>
        <Text style={styles.aiToolTitle}>{tool.title}</Text>
        <Text style={styles.aiToolSubtitle}>{tool.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
    </TouchableOpacity>
  );

  const renderQuickAction = (action: typeof quickActions[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionButton, { backgroundColor: action.color }]}
      onPress={action.onPress}
    >
      <Ionicons name={action.icon as any} size={24} color="white" />
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading Teacher Dashboard...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View>
              <View style={styles.headerTitleRow}>
                <Ionicons name="briefcase" size={20} color={Colors.light.tint} style={{ marginRight: 6 }} />
                <Text style={styles.greeting}>
                  {getGreeting()}, {user?.user_metadata?.first_name || 'Teacher'}! 👩‍🏫
                </Text>
              </View>
              <View style={styles.subRow}>
                <Text style={styles.schoolName}>Teaching at {dashboardData?.schoolName || 'Loading...'}</Text>
                <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>Teacher</Text></View>
              </View>
            </View>
          </View>
        </View>
      </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Today's Overview</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* AI Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 AI Teaching Tools</Text>
          <View style={styles.aiToolsContainer}>
            {aiTools.map(renderAIToolCard)}
          </View>
        </View>

        {/* My Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📚 My Classes</Text>
          <View style={styles.classesContainer}>
            {dashboardData?.myClasses.map(renderClassCard)}
          </View>
        </View>

        {/* Recent Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Recent Homework Assignments</Text>
          <View style={styles.assignmentsContainer}>
            {dashboardData?.recentAssignments.map(renderAssignmentCard)}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>📅 Upcoming Events</Text>
            {dashboardData?.upcomingEvents.map((event) => (
              <View key={event.id} style={styles.eventItem}>
                <View style={[styles.eventIcon, {
                  backgroundColor: event.type === 'meeting' ? '#4F46E5' : 
                                 event.type === 'activity' ? '#059669' : '#DC2626'
                }]}>
                  <Ionicons 
                    name={event.type === 'meeting' ? 'people' : 
                         event.type === 'activity' ? 'color-palette' : 'document-text'} 
                    size={16} 
                    color="white" 
                  />
                </View>
                <View style={styles.eventContent}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>{event.time}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
  },
  header: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    marginLeft: 8,
    backgroundColor: Colors.light.tint + '10',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 4,
  },
  schoolName: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 16,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: cardWidth,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  metricTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  metricSubtitle: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionButton: {
    width: cardWidth,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  quickActionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  aiToolsContainer: {
    gap: 12,
  },
  aiToolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  aiToolIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiToolContent: {
    flex: 1,
  },
  aiToolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  aiToolSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  classesContainer: {
    gap: 12,
  },
  classCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  className: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 2,
  },
  classDetails: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  studentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  studentCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tabIconDefault,
    marginLeft: 4,
  },
  nextLesson: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  nextLessonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
    marginLeft: 8,
  },
  assignmentsContainer: {
    gap: 12,
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  assignmentTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  assignmentDue: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginBottom: 8,
  },
  assignmentProgress: {
    gap: 4,
  },
  progressText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  eventIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: Colors.light.background,
    borderRadius: 8,
  },
  modalContent: {
    flex: 1,
  },
});

export default TeacherDashboard;
