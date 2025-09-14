import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, View, Text, RefreshControl, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import AdBanner from '@/components/ui/AdBanner';
import ErrorBanner from '@/components/ui/ErrorBanner';
// IconSymbol import removed - now using enhanced components
// Removed unused imports: WhatsAppStatusChip, WhatsAppQuickAction
import WhatsAppOptInModal from '@/components/whatsapp/WhatsAppOptInModal';
import OfflineBanner from '@/components/sync/OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { getCurrentLanguage, changeLanguage, getAvailableLanguages } from '@/lib/i18n';
import claudeService from '@/lib/ai-gateway/claude-service';
import { track } from '@/lib/analytics';
// Colors import removed - now using theme colors
import EnhancedHeader from './EnhancedHeader';
// import SimpleEnhancedHeader from './SimpleEnhancedHeader';
import EnhancedChildrenGrid from './EnhancedChildrenGrid';
import { EnhancedStatsRow } from './EnhancedStats';
import { EnhancedQuickActions } from './EnhancedQuickActions';
import SkeletonLoader from '../ui/SkeletonLoader';
import { RoleBasedHeader } from '../RoleBasedHeader';
// import { useWhatsAppConnection } from '@/hooks/useWhatsAppConnection';

// Temporary mock WhatsApp connection for testing
const useMockWhatsAppConnection = () => {
  return {
    connectionStatus: {
      isConnected: false,
      isLoading: false,
      error: undefined
    },
    isLoading: false,
    error: undefined,
    optIn: async () => {},
    optOut: () => {},
    sendTestMessage: () => {},
    isOptingIn: false,
    isOptingOut: false,
    isSendingTest: false,
    getWhatsAppDeepLink: () => null,
    formatPhoneNumber: (phone: string) => phone,
    isWhatsAppEnabled: () => false,
    optInError: null,
    optOutError: null,
    testMessageError: null
  };
};

function useTier() {
  // Temporary: derive from env or profiles; default to 'free'
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  useEffect(() => {
    const forced = (process.env.EXPO_PUBLIC_FORCE_TIER || '').toLowerCase();
    if (forced === 'pro' || forced === 'enterprise') setTier(forced as any);
    (async () => {
      try {
const { data } = await assertSupabase().auth.getUser();
        const roleTier = (data.user?.user_metadata as any)?.subscription_tier as string | undefined;
        if (roleTier === 'pro' || roleTier === 'enterprise') setTier(roleTier as any);
      } catch (error) {
        console.warn('Failed to get tier from user metadata:', error);
      }
    })();
  }, []);
  return tier;
}

export default function ParentDashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [usage, setUsage] = useState<{ ai_help: number; ai_lessons: number; tutoring_sessions: number }>({ ai_help: 0, ai_lessons: 0, tutoring_sessions: 0 });
  const [limits, setLimits] = useState<{ ai_help: number | 'unlimited'; ai_lessons: number | 'unlimited'; tutoring_sessions: number | 'unlimited' }>({ ai_help: 10, ai_lessons: 5, tutoring_sessions: 2 });
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tier = useTier();
  
  // WhatsApp integration - using mock for now
  const whatsApp = useMockWhatsAppConnection();

  // Create profile initials for avatar

  const isAndroid = Platform.OS === 'android';
  const adsEnabled = process.env.EXPO_PUBLIC_ENABLE_ADS !== '0';
  const showBanner = isAndroid && adsEnabled && tier === 'free';

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load children (if any)
      if (user?.id) {
        const client = assertSupabase();
        const { data: studentsData } = await client
          .from('students')
          .select('id, first_name, last_name, class_id, is_active')
          .or(`parent_id.eq.${user.id},guardian_id.eq.${user.id}`)
          .eq('is_active', true)
          .limit(5);
        
        // Use real data if available, otherwise show mock data for demonstration
        const realChildren = studentsData || [];
        
        // Add some mock children for demonstration if no real children exist
        const mockChildren = realChildren.length === 0 ? [
          {
            id: 'mock-1',
            first_name: 'Emma',
            last_name: 'Johnson',
            class_id: 'cls_2024_001',
            is_active: true
          },
          {
            id: 'mock-2', 
            first_name: 'Liam',
            last_name: 'Johnson',
            class_id: 'cls_2024_002',
            is_active: true
          },
          {
            id: 'mock-3',
            first_name: 'Sophia',
            last_name: 'Johnson', 
            class_id: 'cls_2024_003',
            is_active: true
          }
        ] : [];
        
        setChildren([...realChildren, ...mockChildren]);

        // Load AI usage for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: usageData } = await client
          .from('ai_usage_logs')
          .select('service_type')
          .eq('user_id', user.id)
          .gte('created_at', startOfMonth.toISOString());

        if (usageData) {
          const homeworkCount = usageData.filter(u => u.service_type === 'homework_help').length;
          const lessonCount = usageData.filter(u => u.service_type === 'lesson_generation').length;
          setUsage({ ai_help: homeworkCount, ai_lessons: lessonCount, tutoring_sessions: 0 });
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    const refreshStart = Date.now();
    setRefreshing(true);
    
    try {
      await loadDashboardData();
      
      // Track successful refresh
      track('edudash.dashboard.refresh', {
        role: 'parent',
        user_id: user?.id,
        load_time_ms: Date.now() - refreshStart,
        children_count: children.length,
        ai_usage_count: usage.ai_help + usage.ai_lessons,
        platform: Platform.OS,
        tier: 'free', // This dashboard is only for free tier
      });
    } catch (error) {
      // Track failed refresh
      track('edudash.dashboard.refresh_failed', {
        role: 'parent',
        user_id: user?.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        platform: Platform.OS,
      });
    } finally {
      setRefreshing(false);
    }
  }, [loadDashboardData, user?.id, children.length, usage.ai_help, usage.ai_lessons]);

  useEffect(() => {
    // Adjust limits by tier
    if (tier === 'pro') {
      setLimits({ ai_help: 100, ai_lessons: 50, tutoring_sessions: 10 });
    } else if (tier === 'enterprise') {
      setLimits({ ai_help: 'unlimited', ai_lessons: 'unlimited', tutoring_sessions: 'unlimited' });
    } else {
      setLimits({ ai_help: 10, ai_lessons: 5, tutoring_sessions: 2 });
    }
  }, [tier]);

  // Removed unused Stat component - now using EnhancedStatsRow

  // Removed unused QuickActionProps interface

  // Removed unused QuickAction component - now using EnhancedQuickActions

  const LanguageModal = () => (
    <Modal visible={showLanguageModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('settings.language')}</Text>
          {getAvailableLanguages().map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[
                styles.languageOption,
                getCurrentLanguage() === lang.code && styles.activeLanguageOption
              ]}
              onPress={async () => {
                const previousLang = getCurrentLanguage();
                await changeLanguage(lang.code);
                
                // Track language change from parent dashboard
                track('edudash.language.changed', {
                  user_id: user?.id,
                  from: previousLang,
                  to: lang.code,
                  source: 'parent_dashboard',
                  role: 'parent',
                });
                
                setShowLanguageModal(false);
              }}
            >
              <Text style={styles.languageText}>{lang.nativeName}</Text>
              <Text style={styles.languageSubtext}>{lang.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowLanguageModal(false)}
          >
            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  interface HomeworkModalProps {
    visible: boolean;
    onClose: () => void;
  }

  const HomeworkModal: React.FC<HomeworkModalProps> = ({ visible, onClose }) => {
    const [question, setQuestion] = useState('');
    const [loading, setLoading] = useState(false);
    const [response, setResponse] = useState('');
  
    const handleSubmit = async () => {
      if (!question.trim()) return;
  
      setLoading(true);
      try {
        const start = Date.now();
        const aiResponse = await claudeService.generateResponse({
          id: `homework-${Date.now()}`,
          userId: user?.id || '',
          serviceType: 'homework_help',
          provider: 'claude',
          prompt: question,
          metadata: {
            studentAge: children.length > 0 ? 8 : 10, // Default age based on preschool range
            subject: 'General Education',
            difficulty: 'beginner', // More appropriate for preschool level
            childrenCount: children.length
          },
          requestedAt: new Date(),
        });

        setResponse(aiResponse.content);
        track('edudash.ai.homework_help_completed', {
          user_id: user?.id,
          question_length: question.length,
          tokens_used: aiResponse.tokensUsed,
          success: true,
          duration_ms: Date.now() - start,
          source: 'parent_dashboard',
          response_length: aiResponse.content.length,
        });
      } catch (error) {
        Alert.alert(t('common.error'), t('ai.homework.error'));
        console.error('Homework help error:', error);
      } finally {
        setLoading(false);
      }
    };
  
    const handleClose = () => {
      setQuestion('');
      setResponse('');
      onClose();
    };
  
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>{t('ai.homework.title')}</Text>
            
            <TextInput
              style={styles.textInput}
              placeholder={t('ai.homework.questionPlaceholder')}
              value={question}
              onChangeText={setQuestion}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
  
            <TouchableOpacity
              style={[styles.submitButton, (!question.trim() || loading) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!question.trim() || loading}
            >
              <LinearGradient
                colors={loading ? ['#6B7280', '#9CA3AF'] : ['#00f5ff', '#0080ff']}
                style={styles.submitGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitText}>{t('ai.homework.getHelp')}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
  
            {response && (
              <ScrollView style={styles.responseContainer}>
                <Text style={styles.responseTitle}>{t('ai.homework.explanation')}</Text>
                <Text style={styles.responseText}>{response}</Text>
              </ScrollView>
            )}
  
            <TouchableOpacity style={styles.modalCloseButton} onPress={handleClose}>
              <Text style={styles.modalCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const handleQuickAction = (action: string) => {
    track('edudash.dashboard.quick_action', {
      action,
      user_id: user?.id,
      role: 'parent',
      children_count: children.length,
      platform: Platform.OS,
      tier: 'free',
    });

    switch (action) {
case 'homework':
        track('edudash.parent.homework_help_requested', {
          subject: 'General Education',
          child_age: children.length > 0 ? 8 : 10,
          user_id: user?.id,
          children_count: children.length,
          source: 'dashboard_quick_action',
        } as any);
        setShowHomeworkModal(true);
        break;
      case 'whatsapp':
        track('edudash.whatsapp.connect_requested', {
          user_id: user?.id,
          source: 'dashboard_quick_action',
        });
        setShowWhatsAppModal(true);
        break;
      case 'language':
        track('edudash.language.selector_opened', {
          user_id: user?.id,
          current_language: getCurrentLanguage(),
          source: 'parent_dashboard',
        });
        setShowLanguageModal(true);
        break;
      case 'upgrade':
        track('edudash.billing.upgrade_viewed', {
          user_id: user?.id,
          current_tier: 'free',
          target_tier: 'pro',
        });
        // Navigate to pricing screen instead of showing placeholder alert
        router.push('/pricing');
        break;
    }
  };
  
  // Enhanced WhatsApp message handler for children
  const handleQuickMessage = async (child: any) => {
    track('child_quick_message', { 
      child_id: child.id, 
      source: 'dashboard_quick_action',
      whatsapp_connected: whatsApp.connectionStatus.isConnected 
    });
    
    // Check if WhatsApp is connected
    if (!whatsApp.connectionStatus.isConnected) {
      // Show WhatsApp opt-in modal if not connected
      setShowWhatsAppModal(true);
      return;
    }
    
    // If connected, show the WhatsApp modal with context of the child
    setShowWhatsAppModal(true);
  };

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.background,
    },
    loadingText: {
      color: theme.text,
      marginTop: 12,
    },
    section: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    statGradient: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginTop: 8,
    },
    statTitle: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 4,
    },
    statSubtitle: {
      fontSize: 12,
      color: theme.textTertiary,
      marginTop: 2,
    },
    quickActionsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 12,
    },
    quickActionCard: {
      width: cardWidth,
      borderRadius: 12,
      overflow: 'hidden',
      shadowColor: theme.shadow || '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 10,
    },
    disabledCard: {
      opacity: 0.6,
      shadowOpacity: 0.05,
      elevation: 2,
    },
    quickActionGradient: {
      padding: 16,
      alignItems: 'center',
      minHeight: 120,
      justifyContent: 'center',
      borderRadius: 12,
    },
    quickActionTitle: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    quickActionDescription: {
      color: 'rgba(255, 255, 255, 0.8)',
      fontSize: 12,
      marginTop: 4,
      textAlign: 'center',
    },
    activityCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
    },
    activityText: {
      color: theme.textSecondary,
      fontSize: 14,
    },
    upgradeButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      marginTop: 12,
      alignSelf: 'flex-start',
    },
    upgradeButtonText: {
      color: theme.background,
      fontWeight: 'bold',
      fontSize: 12,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    languageOption: {
      padding: 12,
      borderRadius: 8,
      marginBottom: 8,
      backgroundColor: theme.elevated,
    },
    activeLanguageOption: {
      backgroundColor: theme.primary + '20',
    },
    languageText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    languageSubtext: {
      fontSize: 14,
      color: theme.textSecondary,
      marginTop: 2,
    },
    modalCloseButton: {
      padding: 12,
      alignItems: 'center',
    },
    modalCloseText: {
      color: theme.textSecondary,
      fontSize: 16,
    },
    textInput: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.background,
      marginBottom: 16,
      minHeight: 100,
    },
    submitButton: {
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 16,
    },
    disabledButton: {
      opacity: 0.5,
    },
    submitGradient: {
      padding: 12,
      alignItems: 'center',
    },
    submitText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
    },
    responseContainer: {
      maxHeight: 200,
      marginBottom: 16,
    },
    responseTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 8,
    },
    responseText: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    emptyCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    emptyTitle: {
      color: theme.text,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 6,
    },
    emptySubtitle: {
      color: theme.textSecondary,
      fontSize: 13,
      textAlign: 'center',
    },
    profileMenuOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.15)',
      justifyContent: 'flex-start',
      alignItems: 'flex-end',
      paddingTop: 80,
      paddingRight: 16,
    },
    profileMenuContainer: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      paddingVertical: 8,
      minWidth: 200,
      shadowColor: theme.shadow || '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 8,
    },
    profileMenuHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    profileMenuTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: theme.text,
    },
    profileRoleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: theme.warning + '20',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
    },
    profileFreeText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.warning,
    },
    profileMenuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      gap: 12,
    },
    profileMenuItemText: {
      fontSize: 14,
      color: theme.textSecondary,
      flex: 1,
    },
    profileMenuDivider: {
      height: 1,
      backgroundColor: theme.border,
      marginVertical: 4,
    },
  }), [theme]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 16 }}>
          <SkeletonLoader width="100%" height={120} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={80} borderRadius={12} style={{ marginBottom: 16 }} />
          <SkeletonLoader width="100%" height={200} borderRadius={16} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Fixed Header */}
      <RoleBasedHeader 
        title={t('dashboard.parentDashboard')}
        subtitle={`Managing ${children.length} ${children.length === 1 ? 'child' : 'children'}`}
      />
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00f5ff"
          />
        }
      >
        {/* Error Banner */}
        {error && (
          <ErrorBanner
            message={t('dashboard.loadError')}
            onRetry={() => loadDashboardData()}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Enhanced Welcome Banner - Now Scrollable */}
        <EnhancedHeader
          userName={`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || t('roles.parent')}
          userRole={t('roles.parent')}
          tier={tier}
          childrenCount={children.length}
          onWhatsAppPress={() => setShowWhatsAppModal(true)}
        />

        {/* Enhanced Usage Stats */}
        <EnhancedStatsRow
          aiHelp={usage.ai_help}
          aiHelpLimit={limits.ai_help}
          aiLessons={usage.ai_lessons}
          aiLessonsLimit={limits.ai_lessons}
        />

        {/* Enhanced Quick Actions */}
        <EnhancedQuickActions
          aiHelpUsage={usage.ai_help}
          aiHelpLimit={limits.ai_help}
          onHomeworkPress={() => handleQuickAction('homework')}
          onWhatsAppPress={() => handleQuickAction('whatsapp')}
          onUpgradePress={() => handleQuickAction('upgrade')}
        />

        {/* Enhanced Children Grid */}
        <EnhancedChildrenGrid
          childrenData={children.map(child => ({
            id: child.id,
            firstName: child.first_name,
            lastName: child.last_name,
            age: 5, // Default preschool age
            grade: t('students.preschool'),
            className: child.class_id ? `Class ${child.class_id.slice(-4)}` : undefined,
            lastActivity: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // Mock recent activity
            homeworkPending: Math.floor(Math.random() * 4), // Mock homework count
            upcomingEvents: Math.floor(Math.random() * 3), // Mock events
            progressScore: Math.floor(60 + Math.random() * 40), // Mock progress 60-100%
            status: Math.random() > 0.8 ? 'absent' : Math.random() > 0.9 ? 'late' : 'active'
          }))}
          loading={loading}
          onChildPress={(child) => {
            track('child_details_view', { child_id: child.id, source: 'dashboard_grid' });
            // Navigate to child details - TODO: Fix route when available
            console.log('Navigate to child details:', child.id);
            // router.push(`/child/${child.id}`);
          }}
          onViewHomework={(child) => {
            track('child_homework_view', { child_id: child.id, source: 'dashboard_quick_action' });
            // Navigate to homework for this child - TODO: Fix route when available
            console.log('Navigate to homework for child:', child.id);
            // router.push(`/homework/${child.id}`);
          }}
          onViewProgress={(child) => {
            track('child_progress_view', { child_id: child.id, source: 'dashboard_quick_action' });
            // Navigate to progress for this child - TODO: Fix route when available
            console.log('Navigate to progress for child:', child.id);
            // router.push(`/progress/${child.id}`);
          }}
          onQuickMessage={handleQuickMessage}
        />

        {/* Ad Banner for Free Tier */}
        {showBanner && (
          <View style={styles.section}>
            <AdBanner />
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              {usage.ai_help > 0 
                ? t('dashboard.aiHelpUsed', { count: usage.ai_help })
                : t('dashboard.noActivity')
              }
            </Text>
            {usage.ai_help >= (limits.ai_help as number) && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => handleQuickAction('upgrade')}
              >
                <Text style={styles.upgradeButtonText}>{t('dashboard.upgradeLimitReached')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Homework Modal */}
      <HomeworkModal visible={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
      
      {/* Language Modal */}
      <LanguageModal />
      
      {/* WhatsApp Modal */}
      <WhatsAppOptInModal visible={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} />
    </View>
  );
}

const { width } = require('react-native').Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap
