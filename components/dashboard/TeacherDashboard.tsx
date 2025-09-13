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
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTeacherDashboard } from '@/hooks/useDashboardData';
import { router } from 'expo-router';
import { track } from '@/lib/analytics';
import { getFeatureFlagsSync } from '@/lib/featureFlags';
import { useSubscription } from '@/contexts/SubscriptionContext';
import {
  EmptyClassesState,
  EmptyAssignmentsState,
  EmptyEventsState,
} from '@/components/ui/EmptyState';
import { CacheIndicator } from '@/components/ui/CacheIndicator';
import { assertSupabase } from '@/lib/supabase';

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
  const flags = getFeatureFlagsSync();
  const AI_ENABLED = (process.env.EXPO_PUBLIC_AI_ENABLED === 'true') || (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES === 'true');
  const { tier } = useSubscription();
  const planAllowsAI = tier === 'pro' || tier === 'enterprise';
  const aiLessonEnabled = planAllowsAI && AI_ENABLED && flags.ai_lesson_generation !== false;
  const aiGradingEnabled = planAllowsAI && AI_ENABLED && flags.ai_grading_assistance !== false;
  const aiHelperEnabled = planAllowsAI && AI_ENABLED && flags.ai_homework_help !== false;
  const { user } = useAuth();
  const { t } = useTranslation();
  
  // Use the custom data hook
  const { data: dashboardData, loading: isLoading, error, refresh, isLoadingFromCache } = useTeacherDashboard();

  // Non-intrusive upgrade nudge (shown ~33% of the time if plan doesn't allow AI)
  const [showUpgradeNudge, setShowUpgradeNudge] = React.useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = React.useState(false);
  React.useEffect(() => {
    if (!planAllowsAI) {
      setShowUpgradeNudge(Math.random() < 0.33);
    } else {
      setShowUpgradeNudge(false);
    }
  }, [planAllowsAI]);

  // Admin org usage summary (for principals/admins)
  const [orgLimits, setOrgLimits] = React.useState<null | { used: { lesson_generation: number; grading_assistance: number; homework_help: number }, quotas: { lesson_generation: number; grading_assistance: number; homework_help: number } }>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.role === 'principal_admin') {
          const { data: userRes } = await assertSupabase().auth.getUser();
          const uid = userRes?.user?.id;
          // Fetch profile to get org id
          if (uid) {
            const { data: prof } = await assertSupabase().from('profiles').select('preschool_id').eq('id', uid).maybeSingle();
            const orgId = (prof as any)?.preschool_id;
            if (orgId) {
              const { data: limitsRes } = await assertSupabase().functions.invoke('ai-usage', { body: { action: 'org_limits', organization_id: orgId } as any });
              if (mounted && limitsRes && (limitsRes.used || limitsRes.quotas)) {
                setOrgLimits({
                  used: {
                    lesson_generation: Number(limitsRes.used?.lesson_generation || 0),
                    grading_assistance: Number(limitsRes.used?.grading_assistance || 0),
                    homework_help: Number(limitsRes.used?.homework_help || 0),
                  },
                  quotas: {
                    lesson_generation: Number(limitsRes.quotas?.lesson_generation || 0),
                    grading_assistance: Number(limitsRes.quotas?.grading_assistance || 0),
                    homework_help: Number(limitsRes.quotas?.homework_help || 0),
                  }
                });
              }
            }
          }
        }
      } catch { /* noop */ }
    })();
    return () => { mounted = false };
  }, [user?.role]);

  const metrics: TeacherMetric[] = dashboardData ? [
    {
      title: t('metrics.my_students'),
      value: dashboardData.totalStudents,
      subtitle: t('metrics.across_classes', { count: dashboardData.totalClasses }),
      icon: 'people-outline',
      color: '#4F46E5',
    },
    {
      title: t('metrics.pending_grading'),
      value: dashboardData.pendingGrading,
      subtitle: t('metrics.assignments_to_review'),
      icon: 'document-text-outline',
      color: '#DC2626',
    },
    {
      title: t('metrics.lessons_today'),
      value: dashboardData.upcomingLessons,
      subtitle: t('metrics.scheduled_classes'),
      icon: 'book-outline',
      color: '#059669',
    },
  ] : [];

  const openRequestFeatureEmail = (subject: string, body?: string) => {
    const to = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || process.env.EXPO_PUBLIC_SALES_EMAIL || 'support@example.com';
    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || '')}`;
    try { Linking.openURL(mailto); } catch { /* noop */ }
  };

  const aiTools = [
    {
      id: 'lesson-generator',
      title: 'AI Lesson Generator',
      subtitle: 'Create engaging lessons with AI',
      icon: 'bulb',
      color: '#4F46E5',
      onPress: () => {
        if (!aiLessonEnabled) { Alert.alert(t('dashboard.ai_upgrade_required_title', { defaultValue: 'Upgrade Required' }), t('dashboard.ai_upgrade_required_message', { defaultValue: 'Your plan does not include this AI feature. Start a trial or upgrade to continue.' })); return; }
        track('edudash.ai.lesson_generator_opened');
        router.push('/screens/ai-lesson-generator');
      },
    },
    {
      id: 'homework-grader',
      title: 'Grade Homework',
      subtitle: 'Auto-grade assignments with AI',
      icon: 'checkmark-circle',
      color: '#059669',
      onPress: () => {
        if (!aiGradingEnabled) { Alert.alert(t('dashboard.ai_upgrade_required_title', { defaultValue: 'Upgrade Required' }), t('dashboard.ai_upgrade_required_message', { defaultValue: 'Your plan does not include this AI feature. Start a trial or upgrade to continue.' })); return; }
        track('edudash.ai.homework_grader_opened');
        router.push('/screens/ai-homework-grader-live');
      },
    },
    {
      id: 'homework-helper',
      title: 'Homework Helper',
      subtitle: 'Child-safe, step-by-step guidance',
      icon: 'help-circle',
      color: '#2563EB',
      onPress: () => {
        if (!aiHelperEnabled) {
          Alert.alert('AI Tool Disabled', 'AI Homework Helper is not enabled for this build.'); return;
        }
        track('edudash.ai.homework_helper_opened');
        router.push('/screens/ai-homework-helper');
      },
    },
    {
      id: 'progress-analysis',
      title: 'Progress Analysis',
      subtitle: 'AI-powered student insights',
      icon: 'analytics',
      color: '#7C3AED',
      onPress: () => {
        // Navigate to AI Progress Analysis screen
        track('edudash.ai.progress_analysis_opened');
        router.push('/screens/ai-progress-analysis');
      },
    },
  ];

  const quickActions = [
    {
      id: 'take-attendance',
      title: 'Take Attendance',
      icon: 'checkmark-done',
      color: '#059669',
      onPress: () => { router.push('/screens/attendance'); },
    },
    {
      id: 'create-lesson',
      title: 'Create Lesson',
      icon: 'add-circle',
      color: '#4F46E5',
      onPress: () => { router.push('/screens/create-lesson'); },
    },
    {
      id: 'message-parents',
      title: 'Message Parents',
      icon: 'chatbubbles',
      color: '#7C3AED',
      onPress: () => { router.push('/screens/teacher-messages'); },
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      icon: 'document-text',
      color: '#DC2626',
      onPress: () => { router.push('/screens/teacher-reports'); },
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning');
    if (hour < 17) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
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
    <TouchableOpacity 
      key={classInfo.id} 
      style={styles.classCard}
      onPress={() => {
        // Navigate to class details with class ID
        router.push(`/screens/class-details?classId=${classInfo.id}&className=${encodeURIComponent(classInfo.name)}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open options for ${classInfo.name}`}
    >
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
      {(classInfo as any).presentToday !== undefined && (
        <View style={styles.attendanceInfo}>
          <View style={styles.attendanceBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.attendanceText}>
              {(classInfo as any).presentToday}/{classInfo.studentCount} present today
            </Text>
          </View>
          {(classInfo as any).attendanceRate !== undefined && (
            <Text style={styles.attendanceRate}>
              {(classInfo as any).attendanceRate}% attendance
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAssignmentCard = (assignment: Assignment) => (
    <TouchableOpacity 
      key={assignment.id} 
      style={styles.assignmentCard}
      onPress={() => {
        // Navigate to assignment details with assignment ID
        router.push(`/screens/assignment-details?assignmentId=${assignment.id}&title=${encodeURIComponent(assignment.title)}`);
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open options for ${assignment.title}`}
    >
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

  const renderAIToolCard = (tool: typeof aiTools[0]) => {
    const enabled = tool.id === 'lesson-generator' ? aiLessonEnabled
      : tool.id === 'homework-grader' ? aiGradingEnabled
      : tool.id === 'homework-helper' ? aiHelperEnabled
      : true;

    return (
      <TouchableOpacity
        key={tool.id}
        style={[styles.aiToolCard, { backgroundColor: tool.color + '10', opacity: enabled ? 1 : 0.5 }]}
        onPress={tool.onPress}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel={tool.title}
      >
        <View style={[styles.aiToolIcon, { backgroundColor: tool.color }]}>
          <Ionicons name={tool.icon as any} size={24} color="white" />
        </View>
        <View style={styles.aiToolContent}>
          <Text style={styles.aiToolTitle}>{tool.title}</Text>
          <Text style={styles.aiToolSubtitle}>{tool.subtitle}</Text>
          {!enabled && (
            <Text style={{ color: Colors.light.tabIconDefault, marginTop: 4 }}>
              {t('dashboard.ai_upgrade_required_cta', { defaultValue: 'Upgrade to use' })}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
      </TouchableOpacity>
    );
  };

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
        <View style={styles.loadingSkeleton}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonMetrics}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.skeletonMetric} />
            ))}
          </View>
          <View style={styles.skeletonSection} />
        </View>
      </View>
    );
  }

  if (error && !dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color="#DC2626" />
        <Text style={styles.errorTitle}>{t('dashboard.error_title')}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>{t('dashboard.retry_button')}</Text>
        </TouchableOpacity>
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
            <View style={{ flex: 1 }}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="briefcase" size={20} color={Colors.light.tint} style={{ marginRight: 6 }} />
                <Text style={styles.greeting}>
                  {getGreeting()}, {user?.user_metadata?.first_name || 'Teacher'}! 👩‍🏫
                </Text>
              </View>
              <View style={styles.subRow}>
                <Text style={styles.schoolName}>{t('dashboard.teaching_at_school', { schoolName: dashboardData?.schoolName || t('common.loading') })}</Text>
                <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{t('dashboard.teacher')}</Text></View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.headerMenuButton}
              onPress={() => setShowOptionsMenu(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

        {/* Cache Status Indicator */}
        <View style={styles.section}>
          <CacheIndicator 
            isLoadingFromCache={isLoadingFromCache}
            onRefresh={refresh}
            compact={true}
          />
        </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.todays_overview')}</Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quick_actions_section')}</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* AI Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.ai_teaching_tools')}</Text>
          {(!aiLessonEnabled || !aiGradingEnabled) ? (
            <Text style={{ color: Colors.light.tabIconDefault, marginBottom: 8 }}>
              {t('dashboard.ai_tools_disabled')}
            </Text>
          ) : (
            <Text style={{ color: Colors.light.tabIconDefault, marginBottom: 8 }}>
              {t('dashboard.ai_tools_enabled')}
            </Text>
          )}
          {/* Info badge: privacy and gating */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.light.tabIconDefault} />
            <Text style={{ color: Colors.light.tabIconDefault, marginLeft: 6, flex: 1 }}>
              {t('dashboard.ai_tools_info', {
                defaultValue: 'AI runs on a secure server. Access and usage are limited by your plan or trial.'
              })}
            </Text>
          </View>

          {/* Admin Org Usage Summary */}
          {user?.role === 'principal_admin' && orgLimits && (
            <View style={styles.orgUsageRow}>
              <Text style={styles.orgUsagePill}>Lessons: {orgLimits.used.lesson_generation}/{orgLimits.quotas.lesson_generation}</Text>
              <Text style={styles.orgUsagePill}>Grading: {orgLimits.used.grading_assistance}/{orgLimits.quotas.grading_assistance}</Text>
              <Text style={styles.orgUsagePill}>Helper: {orgLimits.used.homework_help}/{orgLimits.quotas.homework_help}</Text>
              <TouchableOpacity onPress={() => router.push('/screens/admin-ai-allocation')}>
                <Text style={styles.orgUsageLink}>Manage</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Occasional upgrade nudge */}
          {!planAllowsAI && showUpgradeNudge && (
            <View style={styles.upgradeNudge}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeNudgeText}>
                  {t('dashboard.ai_upgrade_nudge', { defaultValue: 'Unlock AI tools with Pro or Enterprise.' })}
                </Text>
                <TouchableOpacity onPress={() => router.push('/pricing')}>
                  <Text style={styles.upgradeNudgeLink}>{t('dashboard.see_plans', { defaultValue: 'See plans' })}</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => setShowUpgradeNudge(false)} accessibilityLabel="Dismiss upgrade message">
                <Ionicons name="close" size={16} color={Colors.light.tabIconDefault} />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.aiToolsContainer}>
            {aiTools.map(renderAIToolCard)}
          </View>
        </View>

        {/* My Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.my_classes')}</Text>
          <View style={styles.classesContainer}>
            {dashboardData?.myClasses && dashboardData.myClasses.length > 0 ? (
              dashboardData.myClasses.map(renderClassCard)
            ) : (
              <EmptyClassesState onCreateClass={() => {
                // Navigate to class creation screen
                router.push('/screens/create-class');
              }} />
            )}
          </View>
        </View>

        {/* Recent Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent_assignments')}</Text>
          <View style={styles.assignmentsContainer}>
            {dashboardData?.recentAssignments && dashboardData.recentAssignments.length > 0 ? (
              dashboardData.recentAssignments.map(renderAssignmentCard)
            ) : (
              <EmptyAssignmentsState onCreateAssignment={() => router.push('/screens/assign-homework')} />
            )}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t('dashboard.upcoming_events')}</Text>
            {dashboardData?.upcomingEvents && dashboardData.upcomingEvents.length > 0 ? (
              dashboardData.upcomingEvents.map((event) => (
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
              ))
            ) : (
              <EmptyEventsState onCreateEvent={() => {
                // Navigate to event creation screen
                router.push('/screens/create-event');
              }} />
            )}
          </View>
        </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Options Menu Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showOptionsMenu}
        onRequestClose={() => setShowOptionsMenu(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsMenu(false)}
        >
          <View style={styles.optionsMenuContent}>
            <View style={styles.optionsMenuHeader}>
              <Text style={styles.optionsMenuTitle}>Menu</Text>
              <TouchableOpacity onPress={() => setShowOptionsMenu(false)}>
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/screens/account');
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="person-outline" size={24} color="#4F46E5" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>My Profile</Text>
                  <Text style={styles.optionSubtitle}>Account settings, profile picture & biometrics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/screens/teacher-reports');
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="analytics-outline" size={24} color="#059669" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>My Reports</Text>
                  <Text style={styles.optionSubtitle}>View student progress & class analytics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/screens/teacher-messages');
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="chatbubbles-outline" size={24} color="#7C3AED" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Messages</Text>
                  <Text style={styles.optionSubtitle}>Communicate with parents & administration</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.light.tabIconDefault} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
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
  orgUsageRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  orgUsagePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'white',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    color: Colors.light.text,
    fontSize: 12,
    fontWeight: '600',
  },
  orgUsageLink: {
    color: Colors.light.tint,
    fontWeight: '700',
    fontSize: 12,
  },
  upgradeNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    marginBottom: 8,
  },
  upgradeNudgeText: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '600',
  },
  upgradeNudgeLink: {
    color: Colors.light.tint,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
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
  attendanceInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  attendanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  attendanceText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#059669',
    marginLeft: 4,
  },
  attendanceRate: {
    fontSize: 11,
    color: Colors.light.tabIconDefault,
    fontWeight: '500',
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
  // Loading skeleton styles
  loadingSkeleton: {
    padding: 16,
  },
  skeletonHeader: {
    height: 100,
    backgroundColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 16,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  skeletonMetric: {
    width: cardWidth,
    height: 80,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  skeletonSection: {
    height: 200,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
  },
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8fafc',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal and Menu Styles
  headerMenuButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(75, 85, 99, 0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  optionsMenuContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  optionsMenuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  optionsMenuTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.light.text,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    lineHeight: 20,
  },
});

export default TeacherDashboard;
