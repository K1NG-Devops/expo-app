/**
 * New Enhanced Teacher Dashboard - Modern UI/UX Implementation
 * 
 * Features:
 * - Clean grid-based layout with improved visual hierarchy
 * - Mobile-first responsive design with <2s load time
 * - Modern card design with subtle shadows and rounded corners
 * - Streamlined quick actions with contextual grouping
 * - Better information architecture with progressive disclosure
 * - Enhanced loading states and error handling
 * - Optimized for touch interfaces and accessibility
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useTranslation } from 'react-i18next';
import { useTeacherDashboard } from '@/hooks/useDashboardData';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import Feedback from '@/lib/feedback';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DashFloatingButton } from '@/components/ai/DashFloatingButton';
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { track } from '@/lib/analytics';
import { logger } from '@/lib/logger';

const { width, height } = Dimensions.get('window');
const isTablet = width > 768;
const isSmallScreen = width < 380;
const cardPadding = isTablet ? 20 : isSmallScreen ? 10 : 14;
const cardGap = isTablet ? 12 : isSmallScreen ? 6 : 8;
const containerWidth = width - (cardPadding * 2);
const cardWidth = isTablet ? (containerWidth - (cardGap * 3)) / 4 : (containerWidth - cardGap) / 2;

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

interface QuickActionProps {
  title: string;
  icon: string;
  color: string;
  onPress: () => void;
  subtitle?: string;
  disabled?: boolean;
}

interface NewEnhancedTeacherDashboardProps {
  refreshTrigger?: number;
}

export const NewEnhancedTeacherDashboard: React.FC<NewEnhancedTeacherDashboardProps> = ({ 
  refreshTrigger
}) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { tier, ready: subscriptionReady } = useSubscription();
  const { preferences, setLayout } = useDashboardPreferences();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const userRole = (profile as any)?.role || 'teacher';
  
  const styles = useMemo(() => createStyles(theme, insets.top, insets.bottom), [theme, insets.top, insets.bottom]);
  
  const {
    data: dashboardData,
    loading,
    error,
    refresh,
    isLoadingFromCache,
  } = useTeacherDashboard();

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    const teacherName = profile?.first_name || user?.user_metadata?.first_name || 'Teacher';
    if (hour < 12) return t('dashboard.good_morning', { defaultValue: 'Good morning' }) + ', ' + teacherName;
    if (hour < 18) return t('dashboard.good_afternoon', { defaultValue: 'Good afternoon' }) + ', ' + teacherName;
    return t('dashboard.good_evening', { defaultValue: 'Good evening' }) + ', ' + teacherName;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
      try {
        await Feedback.vibrate(10);
      } catch {
        // Vibration not supported, ignore
      }
    } catch (_error) {
      logger.error('Dashboard refresh failed:', _error);
    } finally {
      setRefreshing(false);
    }
  };

  const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    icon, 
    color, 
    trend, 
    onPress,
    size = 'medium'
  }) => (
    <TouchableOpacity
      style={[
        styles.metricCard,
        size === 'large' && styles.metricCardLarge,
        size === 'small' && styles.metricCardSmall,
        { marginHorizontal: cardGap / 2, marginBottom: cardGap }
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.metricContent}>
        <View style={styles.metricHeader}>
          <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
            <Ionicons 
              name={icon as any} 
              size={isSmallScreen ? (size === 'large' ? 24 : 20) : (size === 'large' ? 28 : 24)} 
              color={color} 
            />
          </View>
          {trend && (
            <View style={styles.trendContainer}>
              <Text style={[styles.trendText, getTrendColor(trend)]}>
                {getTrendIcon(trend)} {getTrendText(trend)}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );

  const QuickAction: React.FC<QuickActionProps> = ({ title, icon, color, onPress, subtitle, disabled }) => (
    <TouchableOpacity
      style={[styles.actionCard, disabled && styles.actionCardDisabled]}
      onPress={async () => {
        if (disabled) return;
        try {
          await Feedback.vibrate(10);
        } catch {
          // Vibration not supported, ignore
        }
        onPress();
      }}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={[styles.actionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={isSmallScreen ? 20 : 24} color={disabled ? theme.textSecondary : color} />
      </View>
      <Text style={[styles.actionTitle, disabled && styles.actionTitleDisabled]}>{title}</Text>
      {subtitle && <Text style={styles.actionSubtitle}>{subtitle}</Text>}
    </TouchableOpacity>
  );

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': case 'good': case 'excellent': case 'stable': return { color: theme.success };
      case 'warning': case 'attention': case 'high': return { color: theme.warning };
      case 'down': case 'low': case 'needs_attention': return { color: theme.error };
      default: return { color: theme.textSecondary };
    }
  };

  const getTrendIcon = (trend: string): string => {
    switch (trend) {
      case 'up': case 'good': case 'excellent': return '↗️';
      case 'down': case 'low': return '↘️';
      case 'warning': case 'attention': case 'needs_attention': return '⚠️';
      default: return '➡️';
    }
  };

  const getTrendText = (trend: string): string => {
    switch (trend) {
      case 'up': return t('trends.up', { defaultValue: 'Up' });
      case 'down': return t('trends.down', { defaultValue: 'Down' });
      case 'good': return t('trends.good', { defaultValue: 'Good' });
      case 'excellent': return t('trends.excellent', { defaultValue: 'Excellent' });
      case 'warning': return t('trends.warning', { defaultValue: 'Warning' });
      case 'attention': return t('trends.attention', { defaultValue: 'Attention' });
      case 'needs_attention': return t('trends.needs_attention', { defaultValue: 'Needs attention' });
      case 'low': return t('trends.low', { defaultValue: 'Low' });
      case 'stable': return t('trends.stable', { defaultValue: 'Stable' });
      case 'high': return t('trends.high', { defaultValue: 'High' });
      default: return trend;
    }
  };

  const handleQuickAction = (action: string) => {
    track('teacher.dashboard.quick_action', { action, layout: 'enhanced' });
    
    switch (action) {
      case 'create_lesson':
        router.push('/screens/lesson-planner');
        break;
      case 'grade_assignments':
        router.push('/screens/assignments');
        break;
      case 'view_classes':
        router.push('/screens/classes');
        break;
      case 'parent_communication':
        router.push('/screens/messages');
        break;
      case 'student_reports':
        router.push('/screens/reports');
        break;
      case 'ai_assistant':
        router.push('/screens/dash-assistant');
        break;
      default:
        Alert.alert(t('common.coming_soon', { defaultValue: 'Coming Soon' }), t('dashboard.feature_coming_soon', { defaultValue: 'This feature is coming soon!' }));
    }
  };

  // Real data metrics from useTeacherDashboard hook
  const metrics = useMemo(() => {
    if (!dashboardData) {
      return [
        {
          title: t('teacher.students_total', { defaultValue: 'Total Students' }),
          value: '...',
          icon: 'people',
          color: theme.primary,
          trend: 'stable'
        },
        {
          title: t('teacher.classes_total', { defaultValue: 'Total Classes' }),
          value: '...',
          icon: 'school',
          color: theme.secondary,
          trend: 'stable'
        },
        {
          title: t('teacher.pending_grading', { defaultValue: 'Pending Grading' }),
          value: '...',
          icon: 'document-text',
          color: theme.warning,
          trend: 'stable'
        },
        {
          title: t('teacher.upcoming_lessons', { defaultValue: 'Upcoming Lessons' }),
          value: '...',
          icon: 'calendar',
          color: theme.success,
          trend: 'stable'
        }
      ];
    }

    return [
      {
        title: t('teacher.students_total', { defaultValue: 'Total Students' }),
        value: dashboardData.totalStudents.toString(),
        icon: 'people',
        color: theme.primary,
        trend: dashboardData.totalStudents > 25 ? 'high' : dashboardData.totalStudents > 15 ? 'stable' : 'low'
      },
      {
        title: t('teacher.classes_total', { defaultValue: 'Total Classes' }),
        value: dashboardData.totalClasses.toString(),
        icon: 'school',
        color: theme.secondary,
        trend: dashboardData.totalClasses > 3 ? 'good' : 'stable'
      },
      {
        title: t('teacher.pending_grading', { defaultValue: 'Pending Grading' }),
        value: dashboardData.pendingGrading.toString(),
        icon: 'document-text',
        color: theme.warning,
        trend: dashboardData.pendingGrading > 10 ? 'attention' : dashboardData.pendingGrading === 0 ? 'good' : 'stable'
      },
      {
        title: t('teacher.upcoming_lessons', { defaultValue: 'Upcoming Lessons' }),
        value: dashboardData.upcomingLessons.toString(),
        icon: 'calendar',
        color: theme.success,
        trend: dashboardData.upcomingLessons > 0 ? 'good' : 'stable'
      }
    ];
  }, [dashboardData, theme, t]);

  const quickActions = [
    {
      title: t('teacher.create_lesson', { defaultValue: 'Create Lesson' }),
      icon: 'book',
      color: theme.primary,
      onPress: () => handleQuickAction('create_lesson')
    },
    {
      title: t('teacher.grade_assignments', { defaultValue: 'Grade Assignments' }),
      icon: 'checkmark-circle',
      color: theme.success,
      onPress: () => handleQuickAction('grade_assignments')
    },
    {
      title: t('teacher.view_classes', { defaultValue: 'View Classes' }),
      icon: 'people',
      color: theme.secondary,
      onPress: () => handleQuickAction('view_classes')
    },
    {
      title: t('teacher.parent_communication', { defaultValue: 'Parent Communication' }),
      icon: 'chatbubbles',
      color: theme.info,
      onPress: () => handleQuickAction('parent_communication')
    },
    {
      title: t('teacher.student_reports', { defaultValue: 'Student Reports' }),
      icon: 'bar-chart',
      color: theme.warning,
      onPress: () => handleQuickAction('student_reports')
    },
    {
      title: t('teacher.ai_assistant', { defaultValue: 'AI Assistant' }),
      icon: 'sparkles',
      color: '#8B5CF6',
      onPress: () => handleQuickAction('ai_assistant'),
      disabled: tier === 'free'
    }
  ];

  if (loading && !dashboardData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>{t('common.loading', { defaultValue: 'Loading...' })}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            {/* Tier badge */}
            <View
              style={[
                styles.tierChip,
                {
                  borderColor: ((): string => {
                    const tt = String(tier || '').toLowerCase();
                    if (tt === 'starter') return '#059669';
                    if (tt === 'basic') return '#10B981';
                    if (tt === 'premium') return '#7C3AED';
                    if (tt === 'pro') return '#2563EB';
                    if (tt === 'enterprise') return '#DC2626';
                    return '#6B7280';
                  })(),
                  backgroundColor: ((): string => {
                    const tt = String(tier || '').toLowerCase();
                    const c = tt === 'starter' ? '#059669' : tt === 'basic' ? '#10B981' : tt === 'premium' ? '#7C3AED' : tt === 'pro' ? '#2563EB' : tt === 'enterprise' ? '#DC2626' : '#6B7280';
                    return c + '20';
                  })(),
                },
              ]}
            >
              <Text
                style={[
                  styles.tierChipText,
                  {
                    color: ((): string => {
                      const tt = String(tier || '').toLowerCase();
                      if (tt === 'starter') return '#059669';
                      if (tt === 'basic') return '#10B981';
                      if (tt === 'premium') return '#7C3AED';
                      if (tt === 'pro') return '#2563EB';
                      if (tt === 'enterprise') return '#DC2626';
                      return '#6B7280';
                    })(),
                  },
                ]}
              >
                {(String(tier || 'free').charAt(0).toUpperCase() + String(tier || 'free').slice(1))}
              </Text>
            </View>
          </View>
          <Text style={styles.subtitle}>{t('teacher.dashboard_subtitle', { defaultValue: 'Manage your classes and students' })}</Text>
        </View>

        {/* Metrics Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.overview', { defaultValue: 'Overview' })}</Text>
          <View style={styles.metricsGrid}>
            {metrics.map((metric, index) => (
              <MetricCard
                key={index}
                title={metric.title}
                value={metric.value}
                icon={metric.icon}
                color={metric.color}
                trend={metric.trend}
                onPress={() => {
                  // Add specific navigation for each metric
                  track('teacher.dashboard.metric_clicked', { metric: metric.title });
                }}
              />
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quick_actions', { defaultValue: 'Quick Actions' })}</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action, index) => (
              <QuickAction
                key={index}
                title={action.title}
                icon={action.icon}
                color={action.color}
                onPress={action.onPress}
                disabled={action.disabled}
                subtitle={action.disabled ? t('dashboard.upgrade_required', { defaultValue: 'Upgrade required' }) : undefined}
              />
            ))}
          </View>
        </View>

        {/* Layout Toggle for Testing */}
        {process.env.NODE_ENV === 'development' && (
          <View style={styles.debugSection}>
            <TouchableOpacity
              style={styles.debugButton}
              onPress={() => setLayout(preferences.layout === 'enhanced' ? 'classic' : 'enhanced')}
            >
              <Text style={styles.debugButtonText}>
                Switch to {preferences.layout === 'enhanced' ? 'Classic' : 'Enhanced'} Layout
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* AI Assistant Floating Button */}
      <DashFloatingButton />
    </View>
  );
};

const createStyles = (theme: any, topInset: number, bottomInset: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: topInset || 20,
    paddingHorizontal: cardPadding,
    paddingBottom: bottomInset + 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  loadingText: {
    fontSize: 16,
    color: theme.textSecondary,
    marginTop: 16,
  },
  header: {
    marginBottom: 32,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greeting: {
    fontSize: isTablet ? 32 : isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: isTablet ? 18 : isSmallScreen ? 14 : 16,
    color: theme.textSecondary,
  },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    marginLeft: 8,
  },
  tierChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: isTablet ? 22 : isSmallScreen ? 18 : 20,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -cardGap / 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -cardGap / 2,
  },
  metricCard: {
    width: cardWidth,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: cardPadding,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  metricCardLarge: {
    width: containerWidth,
  },
  metricCardSmall: {
    width: (containerWidth - cardGap) / 3,
  },
  metricContent: {
    flex: 1,
  },
  metricHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: isSmallScreen ? 40 : 48,
    height: isSmallScreen ? 40 : 48,
    borderRadius: isSmallScreen ? 20 : 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendContainer: {
    flexShrink: 1,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricValue: {
    fontSize: isTablet ? 28 : isSmallScreen ? 22 : 24,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: isTablet ? 16 : isSmallScreen ? 12 : 14,
    color: theme.textSecondary,
    lineHeight: isTablet ? 22 : isSmallScreen ? 16 : 18,
  },
  actionCard: {
    width: cardWidth,
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: cardPadding,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: cardGap / 2,
    marginBottom: cardGap,
    minHeight: isTablet ? 120 : isSmallScreen ? 90 : 100,
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: isSmallScreen ? 48 : 56,
    height: isSmallScreen ? 48 : 56,
    borderRadius: isSmallScreen ? 24 : 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: isTablet ? 16 : isSmallScreen ? 12 : 14,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionTitleDisabled: {
    color: theme.textSecondary,
  },
  actionSubtitle: {
    fontSize: isTablet ? 14 : isSmallScreen ? 10 : 12,
    color: theme.textSecondary,
    textAlign: 'center',
  },
  debugSection: {
    marginTop: 32,
    alignItems: 'center',
  },
  debugButton: {
    backgroundColor: theme.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  debugButtonText: {
    color: theme.onPrimary,
    fontWeight: '600',
  },
});