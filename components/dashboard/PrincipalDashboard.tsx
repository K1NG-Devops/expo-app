/**
 * Principal Dashboard - Complete School Management Interface
 * 
 * Features:
 * - School overview and statistics
 * - Teacher and staff management
 * - Student enrollment and analytics
 * - Financial overview
 * - Administrative tools
 * - Quick actions and notifications
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { usePrincipalDashboard } from '@/hooks/useDashboardData';
import MeetingRoomSystem from '@/components/features/MeetingRoomSystem';
import RealtimeActivityFeed from '@/components/dashboard/RealtimeActivityFeed';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { router } from 'expo-router';
import {
  EmptyStudentsState,
  EmptyActivityState,
} from '@/components/ui/EmptyState';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2;

interface DashboardMetric {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: string;
  color: string;
}

interface QuickAction {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  onPress: () => void;
}

export const PrincipalDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [showMeetingRooms, setShowMeetingRooms] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  // Use the custom data hook
  const { data: dashboardData, loading: isLoading, error, refresh } = usePrincipalDashboard();

  const formatCurrency = (amount: number): string => {
    if (amount >= 1000000) {
      return `R${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `R${(amount / 1000).toFixed(0)}k`;
    } else {
      return `R${amount.toFixed(0)}`;
    }
  };

  const metrics: DashboardMetric[] = dashboardData ? [
    {
      title: t('metrics.total_students'),
      value: dashboardData.totalStudents,
      icon: 'people-outline',
      color: '#4F46E5',
    },
    {
      title: t('metrics.teaching_staff'),
      value: dashboardData.totalTeachers,
      icon: 'school-outline',
      color: '#059669',
    },
    {
      title: t('metrics.attendance_rate'),
      value: `${dashboardData.attendanceRate}%`,
      icon: 'checkmark-circle-outline',
      color: '#DC2626',
    },
    {
      title: t('metrics.monthly_revenue'),
      value: formatCurrency(dashboardData.monthlyRevenue),
      icon: 'card-outline',
      color: '#7C3AED',
    },
  ] : [];

  const quickActions: QuickAction[] = [
    {
      id: 'manage-teachers',
      title: t('quick_actions.manage_teachers'),
      subtitle: t('quick_actions.manage_teachers_subtitle'),
      icon: 'people',
      color: '#4F46E5',
      onPress: () => router.push('/screens/teacher-management'),
    },
    {
      id: 'student-enrollment',
      title: t('quick_actions.student_enrollment'),
      subtitle: t('quick_actions.student_enrollment_subtitle'),
      icon: 'person-add',
      color: '#059669',
      onPress: () => router.push('/screens/student-enrollment'),
    },
    {
      id: 'financial-reports',
      title: t('quick_actions.financial_reports'),
      subtitle: t('quick_actions.financial_reports_subtitle'),
      icon: 'bar-chart',
      color: '#DC2626',
      onPress: () => {}, // Will be implemented in financial reports screen
    },
    {
      id: 'meeting-rooms',
      title: t('quick_actions.meeting_rooms'),
      subtitle: t('quick_actions.meeting_rooms_subtitle'),
      icon: 'videocam',
      color: '#059669',
      onPress: () => setShowMeetingRooms(true),
    },
    {
      id: 'school-settings',
      title: t('quick_actions.school_settings'),
      subtitle: t('quick_actions.school_settings_subtitle'),
      icon: 'settings',
      color: '#7C3AED',
      onPress: () => {}, // Will be implemented in school settings screen
    },
    {
      id: 'create-announcement',
      title: t('quick_actions.create_announcement'),
      subtitle: t('quick_actions.create_announcement_subtitle'),
      icon: 'megaphone',
      color: '#EA580C',
      onPress: () => {}, // Will be implemented in announcements screen
    },
    {
      id: 'view-analytics',
      title: t('quick_actions.school_analytics'),
      subtitle: t('quick_actions.school_analytics_subtitle'),
      icon: 'analytics',
      color: '#0891B2',
      onPress: () => {}, // Will be implemented in analytics screen
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning');
    if (hour < 17) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  };

  const renderMetricCard = (metric: DashboardMetric) => (
    <View key={metric.title} style={[styles.metricCard, { borderLeftColor: metric.color }]}>
      <View style={styles.metricHeader}>
        <Ionicons name={metric.icon as any} size={24} color={metric.color} />
        <Text style={styles.metricValue}>{metric.value}</Text>
      </View>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      {metric.change && (
        <Text style={[
          styles.metricChange,
          { color: metric.changeType === 'positive' ? '#059669' : '#DC2626' }
        ]}>
          {metric.change}
        </Text>
      )}
    </View>
  );

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionCard, { backgroundColor: action.color + '10' }]}
      onPress={action.onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: action.color }]}>
        <Ionicons name={action.icon as any} size={24} color="white" />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{action.title}</Text>
        <Text style={styles.quickActionSubtitle}>{action.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.light.tabIconDefault} />
    </TouchableOpacity>
  );

  const renderRealtimeActivity = () => {
    if (!dashboardData?.schoolId) {
      return (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
          <EmptyActivityState />
        </View>
      );
    }
    
    return (
      <View style={[styles.sectionCard, { paddingHorizontal: 0, paddingVertical: 0 }]}>
        <RealtimeActivityFeed 
          schoolId={dashboardData.schoolId}
          maxItems={8}
          autoRefresh={true}
          showHeader={true}
          embedded={true}
        />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSkeleton}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonMetrics}>
            {[1, 2, 3, 4].map(i => (
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
            <View style={styles.headerText}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="school" size={20} color={Colors.light.tint} style={{ marginRight: 6 }} />
                <Text style={styles.greeting}>{getGreeting()}, {user?.user_metadata?.first_name || 'Principal'}! 👋</Text>
              </View>
              <View style={styles.subRow}>
              <Text style={styles.schoolName}>{t('dashboard.managing_school', { schoolName: dashboardData?.schoolName || t('common.loading') })}</Text>
                <View style={styles.roleBadge}><Text style={styles.roleBadgeText}>{t('dashboard.principal')}</Text></View>
              </View>
            </View>
          </View>
        </View>
      </View>

        {/* Key Metrics */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.school_overview')}</Text>
          <View style={styles.metricsGrid}>
            {dashboardData && metrics.length > 0 ? (
              metrics.map(renderMetricCard)
            ) : dashboardData && (
              dashboardData.totalStudents === 0 && dashboardData.totalTeachers === 0 ? (
                <View style={styles.emptyMetricsContainer}>
                  <EmptyStudentsState onEnrollStudent={() => router.push('/screens/student-enrollment')} />
                </View>
              ) : (
                metrics.map(renderMetricCard)
              )
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.principal_tools')}</Text>
          <View style={styles.quickActionsContainer}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

      {/* Live Activity Feed */}
      <View style={styles.section}>
        {renderRealtimeActivity()}
      </View>

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>
      
      {/* Meeting Room System Modal */}
      {showMeetingRooms && (
        <MeetingRoomSystem
          onClose={() => setShowMeetingRooms(false)}
          schoolId={dashboardData?.schoolId || ''}
        />
      )}
      
      {/* Language Selector Modal */}
      {showLanguageSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity 
                onPress={() => setShowLanguageSelector(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={Colors.light.text} />
              </TouchableOpacity>
            </View>
            <LanguageSelector 
              onLanguageSelect={() => setShowLanguageSelector(false)}
              showComingSoon={true}
            />
          </View>
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
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
    fontSize: 20,
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
    color: Colors.light.tabIconDefault,
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActionsContainer: {
    gap: 12,
  },
  quickActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'white',
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityMessage: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    maxHeight: '80%',
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
  },
  closeButton: {
    padding: 4,
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
  emptyMetricsContainer: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default PrincipalDashboard;
