/**
 * Principal Analytics Screen - Basic Stub
 * 
 * Advanced analytics for school performance, student outcomes,
 * and financial forecasting. Part of Principal Hub MVP completion.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSimplePullToRefresh } from '@/hooks/usePullToRefresh';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

const { width } = Dimensions.get('window');

export default function PrincipalAnalyticsScreen() {
  useTranslation(); // For future internationalization
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'financial' | 'teachers'>('overview');
  
  // Check if user has premium analytics access
  const hasAdvancedAnalytics = profile?.subscription_tier === 'enterprise' || profile?.subscription_tier === 'pro' || profile?.role === 'superadmin';
  
  // Create theme-aware styles
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Refresh function for analytics data
  const handleRefresh = async () => {
    // In a real app, this would refresh analytics data from the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  const { refreshing, onRefreshHandler } = useSimplePullToRefresh(handleRefresh, 'principal_analytics');

  const periods = [
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'quarter', label: 'This Quarter' },
    { id: 'year', label: 'This Year' },
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'analytics-outline' },
    { id: 'students', label: 'Students', icon: 'people-outline' },
    { id: 'financial', label: 'Financial', icon: 'card-outline' },
    { id: 'teachers', label: 'Teachers', icon: 'school-outline' },
  ];

  const analyticsCards = [
    {
      title: 'Student Performance Trends',
      icon: 'trending-up',
      color: '#10B981',
      description: 'Academic performance analytics and predictions',
      onPress: () => {
        if (hasAdvancedAnalytics) {
          Alert.alert(
            'Student Performance Analytics',
            'Detailed performance insights:\n\n📊 Current Statistics:\n• Overall Grade Average: 85.4%\n• Top Performing Subject: Mathematics (92%)\n• Improvement Needed: Science (78%)\n• Attendance Impact: +12% on grades\n\n🔍 Key Insights:\n• 23 students showing improvement\n• Early intervention needed for 5 students\n• Parent engagement correlates +15% with grades',
            [{ text: 'View Detailed Report', onPress: () => router.push('/screens/ai-progress-analysis' as any) }, { text: 'Close', style: 'cancel' }]
          );
        } else {
          Alert.alert(
            'Student Performance Analytics',
            'Comprehensive student performance insights:\n\n• Grade trends and predictions\n• Subject-wise performance analysis\n• Attendance correlation with grades\n• Early intervention recommendations\n• Parent engagement impact\n\nUpgrade to Enterprise for advanced analytics!',
            [
              { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
              { text: 'Close', style: 'cancel' },
            ]
          );
        }
      },
    },
    {
      title: 'Financial Forecasting',
      icon: 'bar-chart',
      color: '#4F46E5',
      description: 'Revenue predictions and budget optimization',
      onPress: () => {
        Alert.alert(
          'Financial Analytics',
          'Advanced financial insights:\n\n• Revenue forecasting (3-12 months)\n• Expense optimization recommendations\n• Enrollment impact on finances\n• Cash flow predictions\n• Budget variance analysis\n\nUpgrade to Enterprise for detailed financial analytics!',
          [
            { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      },
    },
    {
      title: 'Teacher Effectiveness',
      icon: 'people',
      color: '#7C3AED',
      description: 'Staff performance and development insights',
      onPress: () => {
        Alert.alert(
          'Teacher Analytics',
          'Comprehensive teacher effectiveness metrics:\n\n• Student outcome correlations\n• Professional development impact\n• Parent feedback analysis\n• Workload distribution insights\n• Retention predictions\n\nUpgrade to Enterprise for HR analytics!',
          [
            { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      },
    },
    {
      title: 'Enrollment Predictions',
      icon: 'trending-up',
      color: '#F59E0B',
      description: 'Future enrollment trends and capacity planning',
      onPress: () => {
        Alert.alert(
          'Enrollment Analytics',
          'Strategic enrollment insights:\n\n• Future enrollment predictions\n• Capacity planning recommendations\n• Market trend analysis\n• Competitive positioning\n• Marketing ROI analysis\n\nUpgrade to Enterprise for enrollment forecasting!',
          [
            { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      },
    },
    {
      title: 'Parent Engagement',
      icon: 'heart',
      color: '#EC4899',
      description: 'Family involvement and satisfaction metrics',
      onPress: () => {
        Alert.alert(
          'Parent Engagement Analytics',
          'Parent and community engagement insights:\n\n• Engagement level tracking\n• Communication effectiveness\n• Event participation trends\n• Satisfaction survey analysis\n• Community impact metrics\n\nUpgrade to Enterprise for engagement analytics!',
          [
            { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      },
    },
    {
      title: 'Operational Efficiency',
      icon: 'speedometer',
      color: '#0891B2',
      description: 'Resource utilization and process optimization',
      onPress: () => {
        Alert.alert(
          'Operational Analytics',
          'Operational efficiency insights:\n\n• Resource utilization analysis\n• Process bottleneck identification\n• Cost per student optimization\n• Technology usage patterns\n• Facility utilization metrics\n\nUpgrade to Enterprise for operational analytics!',
          [
            { text: 'Upgrade Now', onPress: () => router.push('/pricing' as any) },
            { text: 'Close', style: 'cancel' },
          ]
        );
      },
    },
  ];

  const quickStats = [
    { label: 'Overall Grade Average', value: '85.4%', trend: '+2.3%', color: '#10B981' },
    { label: 'Attendance Rate', value: '94.2%', trend: '+0.8%', color: '#4F46E5' },
    { label: 'Parent Engagement', value: '78%', trend: '+5.1%', color: '#7C3AED' },
    { label: 'Teacher Satisfaction', value: '92%', trend: '+1.2%', color: '#F59E0B' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Analytics Dashboard',
          headerStyle: { backgroundColor: theme.primary },
          headerTitleStyle: { color: theme.onPrimary },
          headerTintColor: theme.onPrimary,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={theme.onPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefreshHandler}
            tintColor={theme.primary}
            title="Refreshing analytics..."
          />
        }
      >
        {/* Simple Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>School Analytics</Text>
            <Text style={styles.headerSubtitle}>
              Data-driven insights for better decision making
            </Text>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.periodSelector}>
              {periods.map((period) => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.periodButton,
                    selectedPeriod === period.id && styles.periodButtonActive,
                  ]}
                  onPress={() => setSelectedPeriod(period.id as any)}
                >
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === period.id && styles.periodButtonTextActive,
                    ]}
                  >
                    {period.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Tab Navigation */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.tabBar}>
              {tabs.map((tab) => (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    activeTab === tab.id && styles.tabActive,
                  ]}
                  onPress={() => setActiveTab(tab.id as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.id ? '#4F46E5' : '#6B7280'}
                  />
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab.id && styles.tabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.statsGrid}>
            {quickStats.map((stat, index) => (
              <View key={index} style={styles.statCard}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <View style={styles.statTrend}>
                  <Ionicons
                    name="trending-up"
                    size={14}
                    color={stat.color}
                  />
                  <Text style={[styles.statTrendText, { color: stat.color }]}>
                    {stat.trend}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Analytics Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Analytics</Text>
          <View style={styles.analyticsGrid}>
            {analyticsCards.map((card, index) => (
              <TouchableOpacity
                key={index}
                style={styles.analyticsCard}
                onPress={card.onPress}
              >
                <View style={styles.analyticsCardHeader}>
                  <View style={[styles.analyticsIcon, { backgroundColor: card.color + '15' }]}>
                    <Ionicons name={card.icon as any} size={24} color={card.color} />
                  </View>
                  {!hasAdvancedAnalytics && (
                    <View style={styles.upgradeIndicator}>
                      <Ionicons name="diamond" size={12} color="#8B5CF6" />
                      <Text style={styles.upgradeText}>PRO</Text>
                    </View>
                  )}
                  {hasAdvancedAnalytics && (
                    <View style={styles.activeIndicator}>
                      <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                      <Text style={styles.activeText}>ACTIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.analyticsCardTitle}>{card.title}</Text>
                <Text style={styles.analyticsCardDescription}>{card.description}</Text>
                <View style={styles.analyticsCardFooter}>
                  <Text style={styles.analyticsCardAction}>View Details</Text>
                  <Ionicons name="chevron-forward" size={16} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* AI Insights Preview */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.aiInsightsCard}
            onPress={() => {
              Alert.alert(
                '🤖 AI-Powered Insights',
                'Get personalized recommendations based on your school data:\n\n• Predictive analytics for student outcomes\n• Automated anomaly detection\n• Smart resource allocation suggestions\n• Early intervention recommendations\n• Custom dashboards and reports\n\nUpgrade to unlock AI-powered insights!',
                [
                  { text: 'Learn More', onPress: () => router.push('/pricing' as any) },
                  { text: 'Close', style: 'cancel' },
                ]
              );
            }}
          >
            <View style={styles.aiInsightsHeader}>
              <View style={styles.aiInsightsIcon}>
                <Ionicons name="sparkles" size={24} color="#8B5CF6" />
              </View>
              <View style={styles.aiInsightsContent}>
                <Text style={styles.aiInsightsTitle}>AI-Powered Insights</Text>
                <Text style={styles.aiInsightsSubtitle}>
                  Get personalized recommendations and predictions
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8B5CF6" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  backButton: {
    padding: 8,
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: theme.cardBackground,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerContent: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    lineHeight: 24,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.accent || '#8B5CF6',
    marginLeft: 8,
  },
  section: {
    backgroundColor: theme.cardBackground,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  periodButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.surface,
    marginRight: 12,
  },
  periodButtonActive: {
    backgroundColor: theme.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  periodButtonTextActive: {
    color: theme.onPrimary,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  tabActive: {
    backgroundColor: theme.primaryLight + '20',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.textSecondary,
    marginLeft: 8,
  },
  tabTextActive: {
    color: theme.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  statCard: {
    width: (width - 64) / 2,
    backgroundColor: theme.surface,
    borderRadius: 12,
    padding: 16,
    margin: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  statLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.text,
    marginBottom: 8,
  },
  statTrend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statTrendText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  analyticsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  analyticsCard: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  analyticsCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  analyticsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: (theme.accent || '#8B5CF6') + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upgradeText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.accent || '#8B5CF6',
    marginLeft: 4,
  },
  analyticsCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
  },
  analyticsCardDescription: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  analyticsCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analyticsCardAction: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  aiInsightsCard: {
    backgroundColor: (theme.accent || '#8B5CF6') + '10',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: (theme.accent || '#8B5CF6') + '30',
  },
  aiInsightsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiInsightsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: (theme.accent || '#8B5CF6') + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  aiInsightsContent: {
    flex: 1,
  },
  aiInsightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 4,
  },
  aiInsightsSubtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    lineHeight: 20,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6' + '15',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  premiumBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981' + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
});
