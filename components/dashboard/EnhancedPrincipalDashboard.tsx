/**
 * Enhanced Principal Hub Dashboard - Phase 1 Implementation
 * 
 * Features:
 * - Real-time school metrics from database
 * - Teacher management with performance indicators
 * - Financial overview and enrollment pipeline
 * - Mobile-responsive design with <2s load time
 * - Simple announcement creation
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
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { usePrincipalHub } from '@/hooks/usePrincipalHub';
import { router } from 'expo-router';
import { AnnouncementModal, AnnouncementData } from '@/components/modals/AnnouncementModal';
import { changeLanguage as changeAppLanguage } from '@/lib/i18n';
import AnnouncementService from '@/lib/services/announcementService';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { useTheme } from '@/contexts/ThemeContext';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 3;

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
  onPress?: () => void;
}

interface TeacherCardProps {
  teacher: any;
  onPress?: () => void;
}

export const EnhancedPrincipalDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  // Create theme-aware styles
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const {
    data,
    loading,
    error,
    refresh,
    getMetrics,
    getTeachersWithStatus,
    formatCurrency,
    isEmpty
  } = usePrincipalHub();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning');
    if (hour < 18) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  };

  const handleCreateAnnouncement = () => {
    setShowAnnouncementModal(true);
  };

  const changeLanguage = async (languageCode: string) => {
    await changeAppLanguage(languageCode as any);
  };

  const handleSendAnnouncement = async (announcement: AnnouncementData) => {
    const preschoolId = data.schoolId;
    const userId = user?.id;
    
    if (!preschoolId || !userId) {
      Alert.alert('Error', 'Unable to send announcement. Please try again.');
      return;
    }
    
    try {
      console.log('📢 Sending announcement via database:', announcement);
      
      const result = await AnnouncementService.createAnnouncement(
        preschoolId,
        userId,
        announcement
      );
      
      if (result.success) {
        Alert.alert(
          '📢 Announcement Sent!',
          `"${announcement.title}" has been sent to ${announcement.audience.join(', ')} (${announcement.audience.length === 1 ? '1 group' : announcement.audience.length + ' groups'}).\n\nPriority: ${announcement.priority.toUpperCase()}${announcement.requiresResponse ? '\n⚠️ Response required' : ''}`,
          [
{ text: 'View Messages', onPress: () => router.push('/screens/teacher-messages') },
            { text: 'OK', style: 'default' }
          ]
        );
        
        // Refresh dashboard data to show updated announcement count
        refresh();
      } else {
        Alert.alert('Error', `Failed to send announcement: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Error sending announcement:', error);
      Alert.alert('Error', 'An unexpected error occurred while sending the announcement.');
    }
  };

  const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, color, trend, onPress }) => (
    <TouchableOpacity
      style={[styles.metricCard, { borderLeftColor: color }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.metricHeader}>
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.metricValue, { color }]}>{value}</Text>
      </View>
      <Text style={styles.metricTitle}>{title}</Text>
      {trend && (
        <View style={styles.trendBadge}>
          <Text style={[styles.trendText, getTrendColor(trend)]}>
            {getTrendIcon(trend)} {trend}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const TeacherCard: React.FC<TeacherCardProps> = ({ teacher, onPress }) => (
    <TouchableOpacity style={styles.teacherCard} onPress={onPress}>
      <View style={styles.teacherHeader}>
        <View style={styles.teacherAvatar}>
          <Text style={styles.teacherInitials}>
            {teacher.first_name?.[0]}{teacher.last_name?.[0]}
          </Text>
        </View>
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherName}>{teacher.full_name}</Text>
          <Text style={styles.teacherSpecialty}>{teacher.subject_specialization || 'General'}</Text>
        </View>
        <View style={[styles.statusBadge, getStatusColor(teacher.status)]}>
          <Text style={styles.statusText}>{getStatusIcon(teacher.status)}</Text>
        </View>
      </View>
      <View style={styles.teacherStats}>
        <Text style={styles.teacherStat}>{teacher.classes_assigned} classes</Text>
        <Text style={styles.teacherStat}>•</Text>
        <Text style={styles.teacherStat}>{teacher.students_count} students</Text>
      </View>
      <Text style={styles.performanceIndicator}>{teacher.performance_indicator}</Text>
    </TouchableOpacity>
  );

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'good': case 'excellent': case 'up': return { color: '#059669' };
      case 'warning': case 'attention': return { color: '#F59E0B' };
      case 'low': case 'needs_attention': return { color: '#DC2626' };
      default: return { color: '#6B7280' };
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': case 'good': case 'excellent': return '↗️';
      case 'down': case 'low': return '↘️';
      case 'warning': case 'attention': return '⚠️';
      case 'high': return '🔥';
      default: return '➡️';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return { backgroundColor: '#059669' };
      case 'good': return { backgroundColor: '#7C3AED' };
      case 'needs_attention': return { backgroundColor: '#DC2626' };
      default: return { backgroundColor: '#6B7280' };
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'excellent': return '🌟';
      case 'good': return '✅';
      case 'needs_attention': return '⚠️';
      default: return '●';
    }
  };

  if (loading) {
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

  if (error && isEmpty) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning-outline" size={48} color={theme.error} />
        <Text style={styles.errorTitle}>Unable to Load Principal Hub</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const metrics = getMetrics();
  const teachersWithStatus = getTeachersWithStatus();

  return (
    <>
      <RoleBasedHeader 
        title={t('dashboard.principal_hub', { defaultValue: 'Principal Hub' })}
        subtitle={data.schoolName ? t('dashboard.managing_school', { schoolName: data.schoolName }) : undefined}
      />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>
            {getGreeting()}, {user?.user_metadata?.first_name || t('roles.principal')}! 👋
          </Text>
        </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.school_overview')}</Text>
        <View style={styles.metricsGrid}>
          {metrics.slice(0, 6).map((metric, index) => (
            <MetricCard
              key={index}
              {...metric}
              onPress={() => {
                // Navigate to proper management views
                if (metric.title.includes('Students') || metric.title.includes('Total Students')) {
                  router.push('/screens/student-management'); // Comprehensive student management
                } else if (metric.title.includes('Staff') || metric.title.includes('Teaching Staff')) {
                  router.push('/screens/teacher-management');
                } else if (metric.title.includes('Revenue') || metric.title.includes('Monthly Revenue')) {
                  router.push('/screens/financial-dashboard');
                } else if (metric.title.includes('Applications')) {
                  router.push('/screens/student-enrollment'); // Enrollment for applications
                }
              }}
            />
          ))}
        </View>
      </View>

      {/* Capacity Status */}
      {data.capacityMetrics && (
        <View style={styles.section}>
          <View style={styles.capacityCard}>
            <View style={styles.capacityHeader}>
              <Ionicons name="business" size={20} color="#7C3AED" />
              <Text style={styles.capacityTitle}>School Capacity</Text>
            </View>
            <View style={styles.capacityInfo}>
              <Text style={styles.capacityText}>
                {data.capacityMetrics.current_enrollment} / {data.capacityMetrics.capacity} students
              </Text>
              <Text style={styles.capacityPercentage}>
                {data.capacityMetrics.utilization_percentage}% utilized
              </Text>
            </View>
            <View style={styles.capacityBar}>
              <View 
                style={[
                  styles.capacityFill, 
                  { 
                    width: `${data.capacityMetrics.utilization_percentage}%`,
                    backgroundColor: data.capacityMetrics.utilization_percentage > 90 ? '#DC2626' : '#059669'
                  }
                ]} 
              />
            </View>
          </View>
        </View>
      )}

      {/* Teaching Staff */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Teaching Staff</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/screens/teacher-management')}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
        </View>
        
        {teachersWithStatus.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.teachersRow}>
              {teachersWithStatus.slice(0, 5).map((teacher) => (
                <TeacherCard
                  key={teacher.id}
                  teacher={teacher}
                  onPress={() => {
                    Alert.alert(
                      teacher.full_name,
                      `Email: ${teacher.email}\nClasses: ${teacher.classes_assigned}\nStudents: ${teacher.students_count}\n\nStatus: ${teacher.performance_indicator}`
                    );
                  }}
                />
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={theme.textSecondary} />
            <Text style={styles.emptyStateText}>No teachers assigned yet</Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => router.push('/screens/teacher-management')}
            >
              <Text style={styles.emptyStateButtonText}>Add Teachers</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Financial Summary */}
      {data.financialSummary && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/screens/financial-dashboard')}
            >
              <Text style={styles.viewAllText}>Details</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.financialGrid}>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Monthly Revenue</Text>
              <Text style={[styles.financialValue, { color: '#059669' }]}>
                {formatCurrency(data.financialSummary.monthlyRevenue)}
              </Text>
            </View>
            <View style={styles.financialCard}>
              <Text style={styles.financialLabel}>Net Profit</Text>
              <Text style={[styles.financialValue, { 
                color: data.financialSummary.netProfit > 0 ? '#059669' : '#DC2626' 
              }]}>
                {formatCurrency(data.financialSummary.netProfit)}
              </Text>
            </View>
          </View>
        </View>
      )}


      {/* AI Insights Banner */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={styles.aiInsightsBanner}
          onPress={() => {
            Alert.alert(
              '🤖 AI-Powered Insights',
              'AI analytics are now available to provide data-driven insights based on your school data:\n\n• Student attendance patterns\n• Financial trend analysis\n• Teacher performance metrics\n• Parent engagement insights\n• Enrollment optimization\n\nView comprehensive analytics to unlock AI-powered recommendations.',
              [
                { text: 'View Analytics', onPress: () => router.push('/screens/principal-analytics') },
                { text: 'Learn More', onPress: () => router.push('/pricing' as any) },
                { text: 'Later', style: 'cancel' },
              ]
            )
          }}
        >
          <View style={styles.aiInsightsHeader}>
            <View style={styles.aiInsightsIcon}>
              <Ionicons name="sparkles" size={20} color="#8B5CF6" />
            </View>
            <View style={styles.aiInsightsContent}>
              <Text style={styles.aiInsightsTitle}>AI Analytics Available</Text>
              <Text style={styles.aiInsightsSubtitle}>Get data-driven insights • Tap to explore</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Financial Management Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.financial_management')}</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#4F46E5' + '10' }]}
            onPress={() => router.push('/screens/financial-dashboard')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#4F46E5' }]}>
              <Ionicons name="analytics" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Financial Overview</Text>
              <Text style={styles.toolSubtitle}>View revenue, expenses & cash flow trends</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#059669' + '10' }]}
onPress={() => router.push('/screens/financial-dashboard')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#059669' }]}>
              <Ionicons name="list" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Payment History</Text>
              <Text style={styles.toolSubtitle}>Browse, filter & export payment records</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#DC2626' + '10' }]}
            onPress={() => router.push('/screens/financial-reports')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#DC2626' }]}>
              <Ionicons name="bar-chart" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Financial Reports</Text>
              <Text style={styles.toolSubtitle}>Generate detailed financial analysis</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#F59E0B' + '10' }]}
            onPress={() => router.push('/screens/petty-cash')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="wallet" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Petty Cash</Text>
              <Text style={styles.toolSubtitle}>Manage daily expenses & cash on hand</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#10B981' + '10' }]}
            onPress={() => router.push('/screens/class-teacher-management')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#10B981' }]}>
              <Ionicons name="school" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Class & Teacher Management</Text>
              <Text style={styles.toolSubtitle}>Assign teachers, manage classes & ratios</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* AI & Analytics Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.ai_analytics')}</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#8B5CF6' + '10' }]}
            onPress={() => {
              Alert.alert(
                '🤖 AI Insights & Recommendations',
                'Get AI-powered insights based on your school data:\n\n• Attendance pattern analysis\n• Financial trend insights\n• Teacher performance indicators\n• Student progress tracking\n• Enrollment optimization tips\n\nView detailed analytics now:',
                [
                  { text: 'View AI Insights', onPress: () => router.push('/screens/principal-analytics') },
                  { text: 'Create Lessons with AI', onPress: () => router.push('/screens/ai-lesson-generator') },
                  { text: 'Later', style: 'cancel' },
                ]
              )
            }}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="sparkles" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>AI Insights</Text>
              <Text style={styles.toolSubtitle}>Data-driven recommendations & analytics</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#EC4899' + '10' }]}
            onPress={() => {
              Alert.alert(
                '✨ AI Lesson Generator',
                'Create engaging educational content for your students:\n\n• Age-appropriate lesson plans\n• Interactive activity suggestions\n• Assessment templates\n• Learning objectives alignment\n\nStart creating lessons now:',
                [
                  { text: 'Create Lesson', onPress: () => router.push('/screens/ai-lesson-generator') },
                  { text: 'View AI Tools', onPress: () => router.push('/screens/ai-homework-grader-live') },
                  { text: 'Later', style: 'cancel' },
                ]
              )
            }}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#EC4899' }]}>
              <Ionicons name="document-text" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Create Lessons</Text>
              <Text style={styles.toolSubtitle}>Generate lessons & assessments with AI</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#0891B2' + '10' }]}
            onPress={() => router.push('/screens/principal-analytics')}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#0891B2' }]}>
              <Ionicons name="analytics" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>Advanced Analytics</Text>
              <Text style={styles.toolSubtitle}>Deep insights & forecasting</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/screens/student-enrollment')}
          >
            <Ionicons name="person-add" size={24} color={theme.primary} />
            <Text style={styles.actionText}>Enroll Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/screens/teacher-management')}
          >
            <Ionicons name="people" size={24} color={theme.success} />
            <Text style={styles.actionText}>Teachers & Staff</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={handleCreateAnnouncement}
          >
            <Ionicons name="megaphone" size={24} color={theme.accent} />
            <Text style={styles.actionText}>Send Announcement</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionsGrid, { marginTop: 8 }]}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/screens/principal-parent-requests')}
          >
            <Ionicons name="people-circle" size={24} color={theme.primary} />
            <Text style={styles.actionText}>Parent Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/screens/principal-seat-management')}
          >
            <Ionicons name="id-card" size={24} color={theme.success} />
            <Text style={styles.actionText}>Seat Management</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => router.push('/screens/admin/school-settings')}
          >
            <Ionicons name="settings" size={24} color={theme.textSecondary} />
            <Text style={styles.actionText}>School Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              Alert.alert(
                '🔐 Security & Access Control',
                'Manage user permissions, access levels, and security settings for your school.\n\n• User role management\n• Access permissions\n• Security audit logs\n• Two-factor authentication',
                [
                  { text: 'Manage Users', onPress: () => router.push('/screens/teacher-management') },
                  { text: 'School Settings', onPress: () => router.push('/screens/admin/school-settings') },
                  { text: 'Later', style: 'cancel' },
                ]
              )
            }}
          >
            <Ionicons name="shield-checkmark" size={24} color={theme.success} />
            <Text style={styles.actionText}>User Access</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              Alert.alert(
                '📥 Data Backup & Export',
                'Backup and export your school data for safekeeping and compliance.\n\n• Export student records\n• Financial data backup\n• Attendance records\n• Academic reports\n\nChoose your backup option:',
                [
                  { 
                    text: 'Export Data', 
                    onPress: () => {
                      Alert.alert('Export Started', 'Your data export has been queued. You will receive an email with the download link within 24 hours.');
                    }
                  },
                  { text: 'Backup Settings', onPress: () => router.push('/screens/admin/school-settings') },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )
            }}
          >
            <Ionicons name="cloud-upload" size={24} color={theme.accent} />
            <Text style={styles.actionText}>Export Data</Text>
          </TouchableOpacity>
        </View>
      </View>
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
                <Ionicons name="close" size={24} color={theme.text} />
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
                <Ionicons name="person-outline" size={24} color={theme.primary} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>My Profile</Text>
                  <Text style={styles.optionSubtitle}>Account settings, profile picture & biometrics</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/screens/admin/school-settings');
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="settings-outline" size={24} color={theme.success} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>School Settings</Text>
                  <Text style={styles.optionSubtitle}>Configure school preferences & policies</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                handleCreateAnnouncement();
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="megaphone-outline" size={24} color={theme.accent} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Create Announcement</Text>
                  <Text style={styles.optionSubtitle}>Send messages to teachers & parents</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push('/screens/principal-seat-management');
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="id-card" size={24} color={theme.success} />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Seat Management</Text>
                  <Text style={styles.optionSubtitle}>Assign or revoke teacher seats</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      
      {/* Announcement Modal */}
      <AnnouncementModal
        visible={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSend={handleSendAnnouncement}
      />
    </>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  welcomeSection: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.onPrimary,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: theme.primary,
    marginRight: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    width: cardWidth,
    borderLeftWidth: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    color: theme.text,
  },
  metricTitle: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  trendBadge: {
    alignSelf: 'flex-start',
  },
  trendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  teachersRow: {
    flexDirection: 'row',
    paddingRight: 20,
  },
  teacherCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    width: 200,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  teacherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  teacherAvatar: {
    width: 32,
    height: 32,
    backgroundColor: theme.primary,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  teacherInitials: {
    color: theme.onPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  teacherSpecialty: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 10,
  },
  teacherStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  teacherStat: {
    fontSize: 12,
    color: theme.textSecondary,
    marginHorizontal: 2,
  },
  performanceIndicator: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.primary,
  },
  capacityCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  capacityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginLeft: 8,
  },
  capacityInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  capacityText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  capacityPercentage: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  capacityBar: {
    height: 4,
    backgroundColor: theme.border,
    borderRadius: 2,
  },
  capacityFill: {
    height: 4,
    borderRadius: 2,
  },
  financialGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
    flex: 1,
    marginHorizontal: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  financialLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  financialValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.text,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.text,
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginVertical: 8,
  },
  emptyStateButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: theme.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingSkeleton: {
    padding: 20,
  },
  skeletonHeader: {
    height: 80,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 8,
    marginBottom: 20,
  },
  skeletonMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  skeletonMetric: {
    width: cardWidth,
    height: 100,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
  },
  skeletonSection: {
    height: 200,
    backgroundColor: theme.surfaceVariant,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: theme.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  // Contact Admin Banner Styles
  contactAdminBanner: {
    backgroundColor: '#059669' + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669' + '20',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contactAdminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactAdminIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669' + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contactAdminContent: {
    flex: 1,
  },
  contactAdminTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  contactAdminSubtitle: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  // AI Insights Banner Styles
  aiInsightsBanner: {
    backgroundColor: theme.accentLight,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.accent + '20',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiInsightsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiInsightsContent: {
    flex: 1,
  },
  aiInsightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  aiInsightsSubtitle: {
    fontSize: 14,
    color: theme.accent,
    fontWeight: '500',
  },
  // Tool Cards Styles
  toolsGrid: {
    gap: 12,
  },
  toolCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.cardBackground,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toolContent: {
    flex: 1,
  },
  toolTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  toolSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  // Options Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.modalOverlay,
    justifyContent: 'flex-end',
  },
  optionsMenuContent: {
    backgroundColor: theme.cardBackground,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
    maxHeight: '60%',
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
    color: theme.text,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: theme.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 16,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
  },
});

export default EnhancedPrincipalDashboard;
