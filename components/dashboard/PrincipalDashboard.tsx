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
  Alert,
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

  const metrics: DashboardMetric[] = dashboardData ? [
    {
      title: 'Total Students',
      value: dashboardData.totalStudents,
      icon: 'people-outline',
      color: '#4F46E5',
    },
    {
      title: 'Teaching Staff',
      value: dashboardData.totalTeachers,
      icon: 'school-outline',
      color: '#059669',
    },
    {
      title: 'Attendance Rate',
      value: `${dashboardData.attendanceRate}%`,
      icon: 'checkmark-circle-outline',
      color: '#DC2626',
    },
    {
      title: 'Monthly Revenue',
      value: `R${(dashboardData.monthlyRevenue / 1000).toFixed(0)}k`,
      icon: 'card-outline',
      color: '#7C3AED',
    },
  ] : [];

  const quickActions: QuickAction[] = [
    {
      id: 'manage-teachers',
      title: 'Manage Teachers',
      subtitle: 'Hire, evaluate, and manage staff',
      icon: 'people',
      color: '#4F46E5',
      onPress: () => Alert.alert('Feature', 'Teacher management coming soon'),
    },
    {
      id: 'student-enrollment',
      title: 'Student Enrollment',
      subtitle: 'Review applications and enroll students',
      icon: 'person-add',
      color: '#059669',
      onPress: () => Alert.alert('Feature', 'Student enrollment coming soon'),
    },
    {
      id: 'financial-reports',
      title: 'Financial Reports',
      subtitle: 'Revenue, expenses, and forecasting',
      icon: 'bar-chart',
      color: '#DC2626',
      onPress: () => Alert.alert('Feature', 'Financial reports coming soon'),
    },
    {
      id: 'meeting-rooms',
      title: 'Meeting Rooms',
      subtitle: 'Schedule meetings and video calls',
      icon: 'videocam',
      color: '#059669',
      onPress: () => setShowMeetingRooms(true),
    },
    {
      id: 'school-settings',
      title: 'School Settings',
      subtitle: 'Configure policies and preferences',
      icon: 'settings',
      color: '#7C3AED',
      onPress: () => Alert.alert('Feature', 'School settings coming soon'),
    },
    {
      id: 'create-announcement',
      title: 'Create Announcement',
      subtitle: 'Notify all parents and staff',
      icon: 'megaphone',
      color: '#EA580C',
      onPress: () => Alert.alert('Feature', 'Announcements coming soon'),
    },
    {
      id: 'view-analytics',
      title: 'School Analytics',
      subtitle: 'Performance insights and trends',
      icon: 'analytics',
      color: '#0891B2',
      onPress: () => Alert.alert('Feature', 'Analytics coming soon'),
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
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
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.noDataContainer}>
            <Ionicons name="pulse" size={32} color={Colors.light.tabIconDefault} />
            <Text style={styles.noDataText}>No school data available</Text>
          </View>
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
        <Text style={styles.loadingText}>Loading your dashboard...</Text>
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
              <Text style={styles.greeting}>{getGreeting()}, {user?.user_metadata?.first_name || 'Principal'}! 👋</Text>
              <Text style={styles.schoolName}>🏨 Managing {dashboardData?.schoolName || 'Loading...'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.languageButton}
              onPress={() => setShowLanguageSelector(true)}
            >
              <Ionicons name="language" size={20} color={Colors.light.tint} />
              <Text style={styles.languageButtonText}>Language</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>School Overview</Text>
          <View style={styles.metricsGrid}>
            {dashboardData && metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Principal Tools</Text>
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
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.light.tint + '10',
    borderRadius: 8,
    marginLeft: 16,
  },
  languageButtonText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
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
});

export default PrincipalDashboard;
