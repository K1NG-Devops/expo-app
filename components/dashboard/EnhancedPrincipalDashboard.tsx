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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAds } from '@/contexts/AdsContext';
import { useTranslation } from 'react-i18next';
import { usePrincipalHub } from '@/hooks/usePrincipalHub';
import { router } from 'expo-router';
import { AnnouncementModal, AnnouncementData } from '@/components/modals/AnnouncementModal';
import AnnouncementService from '@/lib/services/announcementService';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { useTheme } from '@/contexts/ThemeContext';
import { usePettyCashMetricCards } from '@/hooks/usePettyCashDashboard';
import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
import WhatsAppOptInModal from '@/components/whatsapp/WhatsAppOptInModal';
import WhatsAppStatusChip from '@/components/whatsapp/WhatsAppStatusChip';
import { Vibration } from 'react-native';
import Feedback from '@/lib/feedback';
import { track } from '@/lib/analytics';
import AdBannerWithUpgrade from '@/components/ui/AdBannerWithUpgrade';

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
  const { theme } = useTheme();
  const { tier, ready: subscriptionReady } = useSubscription();
  const { maybeShowInterstitial, offerRewarded } = useAds();
  const { metricCards: pettyCashCards } = usePettyCashMetricCards();
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  // Ad gating logic
  const showAds = subscriptionReady && tier === 'free';
  
  // Check if user has premium features
  const hasAdvancedFeatures = tier === 'enterprise' || tier === 'pro';
  
  // Upgrade prompt helper
  const promptUpgrade = () => {
    Alert.alert(
      '🎆 Upgrade to Premium',
      'Unlock powerful features for your school:\n\n• Advanced Analytics & Dashboards\n• AI-Powered Insights & Recommendations\n• Custom Reports & Forecasting\n• Real-time Financial Tracking\n• Smart Performance Analytics\n\nTransform your school management today!',
      [
        { text: 'Learn More', onPress: () => router.push('/pricing' as any) },
        { text: 'Upgrade Now 🚀', onPress: () => router.push('/screens/subscription-setup?planId=pro' as any) },
        { text: 'Later', style: 'cancel' },
      ]
    );
  };

  // Gate an action behind subscription
  const gate = (action: () => void, options?: { ai?: boolean }) => () => {
    const aiFeature = options?.ai === true;
    if (!subscriptionReady) {
      // Avoid gating until we know the tier
      action();
      return;
    }
    if (!hasAdvancedFeatures && aiFeature) {
      promptUpgrade();
      return;
    }
    action();
  };
  
  // WhatsApp integration
  const { isWhatsAppEnabled, getWhatsAppDeepLink } = useWhatsAppConnection();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Open WhatsApp using school deep link if available; fallback to support line
  const openWhatsAppWithFallback = async () => {
    try { await Feedback.vibrate(15); } catch {}
    const configuredLink = getWhatsAppDeepLink?.();
    if (configuredLink) {
      try {
        await Linking.openURL(configuredLink);
        return;
      } catch (err) {
        console.error('Failed to open configured WhatsApp link:', err);
      }
    }

    const message = encodeURIComponent('Hello, I need help with my school subscription and features on EduDash Pro.');
    const nativeUrl = `whatsapp://send?phone=27674770975&text=${message}`;
    const webUrl = `https://wa.me/27674770975?text=${message}`;
    try {
      const supported = await Linking.canOpenURL('whatsapp://send');
      if (supported) {
        await Linking.openURL(nativeUrl);
      } else {
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      Alert.alert('Error', 'Unable to open WhatsApp. Please contact support at support@edudashpro.com');
    }
  };

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
        try { await Feedback.vibrate(40); } catch {}
        try { await Feedback.playSuccess(); } catch {}
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
  
  // Combine standard metrics with petty cash metrics (hook already filters for meaningful data)
  const allMetrics = [...metrics, ...pettyCashCards];

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
        {/* Welcome Section with Subscription Badge */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                {getGreeting()}, {user?.user_metadata?.first_name || t('roles.principal')}! 👋
              </Text>
              <Text style={styles.welcomeSubtitle}>
                Managing {data.schoolName || 'your school'} • Dashboard Overview
              </Text>
            </View>
            <View style={styles.headerActions}>
              {/* Subscription Badge */}
              {subscriptionReady && (
                <View style={styles.subscriptionBadgeContainer}>
                  <View style={[
                    styles.subscriptionBadge, 
                    hasAdvancedFeatures ? styles.premiumSubscriptionBadge : styles.basicSubscriptionBadge
                  ]}>
                    <Ionicons 
                      name={hasAdvancedFeatures ? "diamond" : "flash"} 
                      size={12} 
                      color={hasAdvancedFeatures ? "#8B5CF6" : "#F59E0B"} 
                    />
                    <Text style={[
                      styles.subscriptionBadgeText,
                      hasAdvancedFeatures ? styles.premiumBadgeText : styles.basicBadgeText
                    ]}>
                      {tier.toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
              {/* WhatsApp Status */}
              {isWhatsAppEnabled() && (
                <TouchableOpacity onPress={() => setShowWhatsAppModal(true)}>
                  <WhatsAppStatusChip size="small" showText={false} />
                </TouchableOpacity>
              )}
            </View>
          </View>
          
          {/* Enhanced Prominent CTA for non-premium users */}
          {!hasAdvancedFeatures && subscriptionReady && (
            <View style={styles.upgradeBanner}>
              {/* Gradient Background Effect */}
              <View style={styles.upgradeBannerGradient}>
                {/* Header Content */}
                <View style={styles.upgradeBannerContent}>
                  <View style={styles.upgradeBannerIcon}>
                    <Ionicons name="diamond" size={24} color="#FFD700" />
                  </View>
                  <View style={styles.upgradeBannerText}>
                    <Text style={styles.upgradeBannerTitle}>🎆 Unlock Premium Power</Text>
                    <Text style={styles.upgradeBannerSubtitle}>Advanced analytics, AI insights & more • Transform your school today!</Text>
                  </View>
                </View>
                
                {/* CTA Button - Now below the content */}
                <TouchableOpacity
                  style={styles.upgradeBannerButton}
                  onPress={async () => {
                    try { await Feedback.vibrate(30); } catch {}
                    try { await Feedback.playSuccess(); } catch {}
                    
                    // Track navigation attempt
                    track('upgrade_cta_tapped', {
                      current_tier: tier || 'free',
                      user_role: profile?.role,
                    });
                    
                    // Safer object-based navigation with error handling
                    const href = {
                      pathname: '/screens/subscription-upgrade-post' as const,
                      params: {
                        currentTier: tier || 'free',
                        reason: 'manual_upgrade'
                      }
                    };
                    
                    try {
                      // Optional prefetch (non-blocking)
                      if (__DEV__) {
                        try {
                          router.prefetch(href as any);
                        } catch (e: any) {
                          console.warn('Prefetch failed (non-blocking):', e.message);
                        }
                      }
                      
                      // Navigate to upgrade screen
                      router.push(href as any);
                    } catch (e: any) {
                      // Log error and provide fallback
                      if (__DEV__) {
                        console.error('Upgrade navigation failed:', e);
                      }
                      
                      track('upgrade_nav_failed', {
                        error: e.message,
                        current_tier: tier || 'free',
                      });
                      
                      Alert.alert(
                        'Upgrade Unavailable',
                        'The upgrade screen is temporarily unavailable. Please try again in a moment.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <View style={styles.upgradeBannerButtonGlow}>
                    <Text style={styles.upgradeBannerButtonText}>Choose Your Plan</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
              </View>
              {/* Subtle pulse animation effect */}
              <View style={styles.upgradeBannerPulse} pointerEvents="none" />
            </View>
          )}
        </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.school_overview')}</Text>
        <View style={styles.metricsGrid}>
          {allMetrics.slice(0, 6).map((metric, index) => (
            <MetricCard
              key={index}
              {...metric}
              onPress={async () => {
                try { await Feedback.vibrate(15); } catch {}
                
                // Show interstitial ad before navigating (free tier only)
                await maybeShowInterstitial('principal_metrics_nav');
                
                // Navigate to proper management views
                if (metric.title.includes('Students') || metric.title.includes('Total Students')) {
                  router.push('/screens/student-management'); // Comprehensive student management
                } else if (metric.title.includes('Staff') || metric.title.includes('Teaching Staff')) {
                  router.push('/screens/teacher-management');
                } else if (metric.title.includes('Revenue') || metric.title.includes('Monthly Revenue')) {
                  router.push('/screens/financial-dashboard');
                } else if (metric.title.includes('Applications')) {
                  router.push('/screens/student-enrollment'); // Enrollment for applications
                } else if (metric.title.includes('Petty Cash') || metric.title.includes('Cash') || metric.title.includes('Expenses')) {
                  router.push('/screens/petty-cash'); // Petty cash management
                } else if (metric.title.includes('Pending') && metric.title.includes('Approval')) {
                  router.push('/screens/petty-cash'); // For pending approvals
                }
              }}
            />
          ))}
        </View>
      </View>

      {/* Second Ad Placement: After Quick Stats */}
      {showAds && (
        <AdBannerWithUpgrade
          screen="principal_dashboard"
          showUpgradeCTA={false}
          margin={10}
        />
      )}

      {/* Financial Summary */}
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

      {/* First Ad Placement: After Welcome/Upgrade Section */}
      {showAds && (
        <AdBannerWithUpgrade
          screen="principal_dashboard"
          showUpgradeCTA={true}
          margin={12}
        />
      )}

      {/* Teaching Staff */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Teaching Staff</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={async () => {
                await maybeShowInterstitial('principal_teacher_management_nav');
                router.push('/screens/teacher-management');
              }}
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
          
          {/* Real Petty Cash Balance - Only show when meaningful */}
          {data.financialSummary.pettyCashBalance > 50 && (
            <View style={styles.financialGrid}>
              <View style={styles.financialCard}>
                <Text style={styles.financialLabel}>Petty Cash Balance</Text>
                <Text style={[styles.financialValue, { color: '#F59E0B' }]}>
                  {formatCurrency(data.financialSummary.pettyCashBalance)}
                </Text>
              </View>
              <View style={styles.financialCard}>
                <Text style={styles.financialLabel}>Monthly Expenses</Text>
                <Text style={[styles.financialValue, { color: '#DC2626' }]}>
                  {formatCurrency(data.financialSummary.pettyCashExpenses || 0)}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}


      {/* AI Insights Banner */}
      <View style={styles.section}>
        <TouchableOpacity 
          style={[styles.aiInsightsBanner, (subscriptionReady && !hasAdvancedFeatures) ? styles.disabledCard : null]}
          onPress={gate(async () => {
            console.log('🚀 AI Analytics button pressed!');
            try { await Feedback.vibrate(15); } catch {}
            router.push('/screens/principal-analytics');
          }, { ai: true })}
        >
          <View style={styles.aiInsightsHeader}>
            <View style={styles.aiInsightsIcon}>
              <Ionicons name="sparkles" size={20} color={theme.accent || '#8B5CF6'} />
            </View>
            <View style={styles.aiInsightsContent}>
              <Text style={styles.aiInsightsTitle}>AI Analytics Available</Text>
              <Text style={styles.aiInsightsSubtitle}>Get data-driven insights • Tap to explore</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </View>
        </TouchableOpacity>
        
        {/* WhatsApp Contact Support Banner */}
        <TouchableOpacity 
          style={styles.whatsappContactBanner}
          onPress={openWhatsAppWithFallback}
        >
          <View style={styles.whatsappContactHeader}>
            <View style={styles.whatsappContactIcon}>
              <Ionicons name="logo-whatsapp" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.whatsappContactContent}>
              <Text style={styles.whatsappContactTitle}>Need Help?</Text>
              <Text style={styles.whatsappContactSubtitle}>Contact support via WhatsApp • Get instant help</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Financial Management Tools */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('dashboard.financial_management')}</Text>
        <View style={styles.toolsGrid}>
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#4F46E5' + '10' }]}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/financial-dashboard') }}
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
onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/financial-dashboard') }}
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
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/financial-reports') }}
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
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/petty-cash') }}
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
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/class-teacher-management') }}
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
            style={[styles.toolCard, { backgroundColor: '#8B5CF6' + '10' }, (subscriptionReady && !hasAdvancedFeatures) ? styles.disabledCard : null]}
            onPress={gate(() => {
              Alert.alert(
                '🤖 AI Insights & Recommendations',
                'Get AI-powered insights based on your school data:\n\n• Attendance pattern analysis\n• Financial trend insights\n• Teacher performance indicators\n• Student progress tracking\n• Enrollment optimization tips\n\nView detailed analytics now:',
                [
                  { text: 'View AI Insights', onPress: () => router.push('/screens/principal-analytics') },
                  { text: 'Create Lessons with AI', onPress: () => router.push('/screens/ai-lesson-generator') },
                  { text: 'Later', style: 'cancel' },
                ]
              );
            }, { ai: true })}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#8B5CF6' }]}>
              <Ionicons name="sparkles" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>AI Insights</Text>
              <Text style={styles.toolSubtitle}>Smart analytics & recommendations</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#EC4899' + '10' }, (subscriptionReady && !hasAdvancedFeatures) ? styles.disabledCard : null]}
            onPress={gate(() => {
              Alert.alert(
                '✨ AI Lesson Generator',
                'Create engaging educational content for your students:\n\n• Age-appropriate lesson plans\n• Interactive activity suggestions\n• Assessment templates\n• Learning objectives alignment\n\nStart creating lessons now:',
                [
                  { text: 'Create Lesson', onPress: () => router.push('/screens/ai-lesson-generator') },
                  { text: 'View AI Tools', onPress: () => router.push('/screens/ai-homework-grader-live') },
                  { text: 'Later', style: 'cancel' },
                ]
              )
            }, { ai: true })}
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
            style={[styles.toolCard, { backgroundColor: '#0891B2' + '10' }, (subscriptionReady && !hasAdvancedFeatures) ? styles.disabledCard : null]}
            onPress={gate(async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/principal-analytics') }, { ai: true })}
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
          
          <TouchableOpacity 
            style={[styles.toolCard, { backgroundColor: '#F59E0B' + '10' }, (subscriptionReady && !hasAdvancedFeatures) ? styles.disabledCard : null]}
            onPress={gate(async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/admin-ai-allocation') }, { ai: true })}
          >
            <View style={[styles.toolIcon, { backgroundColor: '#F59E0B' }]}>
              <Ionicons name="settings" size={20} color="white" />
            </View>
            <View style={styles.toolContent}>
              <Text style={styles.toolTitle}>AI Quota Management</Text>
              <Text style={styles.toolSubtitle}>Allocate AI credits & manage usage limits</Text>
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
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/student-enrollment') }}
          >
            <Ionicons name="person-add" size={24} color={theme.primary} />
            <Text style={styles.actionText}>Enroll Student</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/teacher-management') }}
          >
            <Ionicons name="people" size={24} color={theme.success} />
            <Text style={styles.actionText}>Manage Teachers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; handleCreateAnnouncement(); }}
          >
            <Ionicons name="megaphone" size={24} color={theme.accent} />
            <Text style={styles.actionText}>Send Announcement</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.actionsGrid, { marginTop: 12 }]}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/principal-parent-requests') }}
          >
            <Ionicons name="people-circle" size={24} color={theme.primary} />
            <Text style={styles.actionText}>Parent Requests</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/principal-seat-management') }}
          >
            <Ionicons name="id-card" size={24} color={theme.success} />
            <Text style={styles.actionText}>Seat Management</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/admin/data-export') }}
          >
            <Ionicons name="cloud-download" size={24} color={theme.accent} />
            <Text style={styles.actionText}>Export Data</Text>
          </TouchableOpacity>
        </View>
        
        <View style={[styles.actionsGrid, { marginTop: 12 }]}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/admin/school-settings') }}
          >
            <Ionicons name="settings" size={24} color={theme.textSecondary} />
            <Text style={styles.actionText}>School Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => {
              // Quick financial overview action
              Alert.alert(
'💰 Financial Overview',
                `Monthly Financial Summary:\n\n• Total Revenue: ${formatCurrency(data.financialSummary?.monthlyRevenue || 0)}\n• Net Profit: ${formatCurrency(data.financialSummary?.netProfit || 0)}\n• Petty Cash Balance: ${formatCurrency(data.financialSummary?.pettyCashBalance || 0)}\n• Monthly Expenses: ${formatCurrency(data.financialSummary?.pettyCashExpenses || 0)}\n\nLast updated: ${new Date().toLocaleString()}`,
                [
                  { text: 'View Details', onPress: () => router.push('/screens/principal-financial-reports') },
                  { text: 'Close', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="stats-chart" size={24} color={theme.accent} />
            <Text style={styles.actionText}>Financial Summary</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => {
              // Quick school stats action
              try { await Feedback.vibrate(15); } catch {}
              Alert.alert(
                '📊 School Stats Today',
                'Current Status:\n\n👥 Students Present: 87/92 (95%)\n👨‍🏫 Teachers Present: 8/9 (89%)\n📚 Active Classes: 6\n🍽️ Lunch Orders: 73\n🚌 Bus Routes: All on time\n\nLast updated: ' + new Date().toLocaleTimeString(),
                [
                  { text: 'View Details', onPress: () => router.push('/screens/principal-analytics') },
                  { text: 'Close', style: 'cancel' }
                ]
              );
            }}
          >
            <Ionicons name="analytics" size={24} color={theme.primary} />
            <Text style={styles.actionText}>Today's Stats</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Communications Quick Access */}
      <View style={styles.section}>
        <View style={styles.actionsGrid}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={async () => { try { await Feedback.vibrate(15); } catch {}; router.push('/screens/whatsapp-demo') }}
          >
            <Ionicons name="logo-whatsapp" size={24} color="#25D366" />
            <Text style={styles.actionText}>WhatsApp Integration</Text>
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
      
      {/* WhatsApp Modal */}
      <WhatsAppOptInModal
        visible={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onSuccess={() => {
          setShowWhatsAppModal(false);
          Alert.alert('WhatsApp Connected!', 'You can now receive school updates via WhatsApp.');
        }}
      />
    </>
  );
};

const createStyles = (theme: any) => {
  const isSmall = width <= 400;
  return StyleSheet.create({
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
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.onPrimary,
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: theme.onPrimary + '80',
    fontWeight: '400',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: (theme.success || '#059669') + '10',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: (theme.success || '#059669') + '20',
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
    backgroundColor: (theme.success || '#059669') + '15',
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
    color: theme.success || '#059669',
    fontWeight: '500',
  },
  // AI Insights Banner Styles
  aiInsightsBanner: {
    backgroundColor: (theme.accentLight || theme.accent + '15' || '#A78BFA15'),
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: (theme.accent || '#8B5CF6') + '20',
    shadowColor: theme.shadow || '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 12,
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiInsightsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: (theme.accent || '#8B5CF6') + '15',
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
    color: theme.text || '#111827',
    marginBottom: 2,
  },
  aiInsightsSubtitle: {
    fontSize: 14,
    color: theme.accentDark || theme.primary || '#4F46E5',
    fontWeight: '600',
  },
  // WhatsApp Contact Support Banner Styles
  whatsappContactBanner: {
    backgroundColor: '#25D366', // WhatsApp green
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#25D366',
    shadowColor: theme.shadow || '#00000020',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  whatsappContactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whatsappContactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  whatsappContactContent: {
    flex: 1,
  },
  whatsappContactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  whatsappContactSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
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
  disabledCard: {
    opacity: 0.55,
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
  
  // Enhanced Subscription Badge Styles
  subscriptionBadgeContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  premiumSubscriptionBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.9)', // More opaque purple
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  basicSubscriptionBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)', // More opaque orange
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  subscriptionBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  premiumBadgeText: {
    color: '#FFFFFF',
  },
  basicBadgeText: {
    color: '#FFFFFF',
  },
  
  // Enhanced Prominent Upgrade Banner Styles
  upgradeBanner: {
    borderRadius: 16,
    marginTop: 4,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  upgradeBannerGradient: {
    backgroundColor: '#1a1a2e', // Dark base
    borderRadius: 16,
    padding: isSmall ? 12 : 14,
    flexDirection: 'column', // Changed to column for vertical layout
    gap: isSmall ? 12 : 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.35)', // Gold border
    position: 'relative',
    overflow: 'hidden',
  },
  upgradeBannerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  upgradeBannerIcon: {
    width: isSmall ? 40 : 48,
    height: isSmall ? 40 : 48,
    borderRadius: isSmall ? 20 : 24,
    backgroundColor: 'rgba(255, 215, 0, 0.2)', // Gold background
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.4)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradeBannerText: {
    flex: 1,
  },
  upgradeBannerTitle: {
    fontSize: isSmall ? 14 : 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  upgradeBannerSubtitle: {
    fontSize: isSmall ? 12 : 13,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: isSmall ? 16 : 18,
    fontWeight: '500',
  },
  upgradeBannerButton: {
    borderRadius: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    alignSelf: 'stretch', // Full width button
  },
  upgradeBannerButtonGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B', // Bright red/orange
    paddingHorizontal: 16,
    paddingVertical: isSmall ? 8 : 10,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    minWidth: isSmall ? 100 : 110,
    justifyContent: 'center',
    flex: 1,
  },
  upgradeBannerButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  upgradeBannerPulse: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    zIndex: -1, // ensure it never captures touches
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    opacity: 0.6,
  },
});
};

export default EnhancedPrincipalDashboard;
