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

// WhatsApp integration
// Prefer real hook when available; otherwise gracefully degrade
import { useWhatsAppConnection as useRealWhatsAppConnection } from '@/hooks/useWhatsAppConnection';
const getMockWhatsAppConnection = () => ({
  connectionStatus: { isConnected: false, isLoading: false, error: undefined },
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
  testMessageError: null,
});

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
  
  // WhatsApp integration
  const realWhatsApp = useRealWhatsAppConnection();
  const whatsApp = realWhatsApp || getMockWhatsAppConnection();

  // Create profile initials for avatar

  const isAndroid = Platform.OS === 'android';
  const adsEnabled = process.env.EXPO_PUBLIC_ENABLE_ADS !== '0';
  const showBanner = isAndroid && adsEnabled && tier === 'free';

  // Load dashboard data
  const [childrenCards, setChildrenCards] = useState<any[]>([]);

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
        const realChildren = studentsData || [];
        setChildren(realChildren);

        // Derive child cards with real metrics (attendance-based progress, homework pending, upcoming events)
        const nowIso = new Date().toISOString();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        async function buildCard(child: any) {
          let lastActivity: Date = new Date();
          let status: 'active' | 'absent' | 'late' = 'active';
          let progressScore = 75;
          let homeworkPending = 0;
          let upcomingEvents = 0;

          try {
            // Attendance: latest record and 30-day rate
            const { data: latestAtt } = await client
              .from('attendance_records')
              .select('status, date, created_at')
              .eq('student_id', child.id)
              .order('date', { ascending: false })
              .limit(1);
            if (latestAtt && latestAtt[0]) {
              lastActivity = new Date(latestAtt[0].created_at || latestAtt[0].date);
              const st = String(latestAtt[0].status || '').toLowerCase();
              status = st === 'late' ? 'late' : st === 'absent' ? 'absent' : 'active';
            }
            const { data: windowAtt } = await client
              .from('attendance_records')
              .select('status')
              .eq('student_id', child.id)
              .gte('date', thirtyDaysAgo)
              .limit(1000);
            if (windowAtt && windowAtt.length > 0) {
              const present = windowAtt.filter((a: any) => String(a.status).toLowerCase() === 'present').length;
              const ratio = present / windowAtt.length; // 0..1
              progressScore = Math.max(60, Math.min(100, Math.round(60 + ratio * 40)));
            }
          } catch {}

          try {
            // Homework pending: assignments for class not yet submitted by this child
            if (child.class_id) {
              const { data: assignments } = await client
                .from('homework_assignments')
                .select('id, due_date')
                .eq('class_id', child.class_id)
                .gte('due_date', new Date(Date.now() - 7*24*60*60*1000).toISOString())
                .lte('due_date', new Date(Date.now() + 14*24*60*60*1000).toISOString());
              const assignmentIds = (assignments || []).map((a: any) => a.id);
              if (assignmentIds.length > 0) {
                const { data: subs } = await client
                  .from('homework_submissions')
                  .select('assignment_id')
                  .eq('student_id', child.id)
                  .in('assignment_id', assignmentIds);
                const submittedSet = new Set((subs || []).map((s: any) => s.assignment_id));
                homeworkPending = assignmentIds.filter((id: string) => !submittedSet.has(id)).length;
              } else {
                homeworkPending = 0;
              }
            }
          } catch {
            homeworkPending = 0;
          }

          try {
            // Upcoming events: attempt class_events, fallback to 0
            if (child.class_id) {
              const { data: events } = await client
                .from('class_events')
                .select('id, start_time')
                .eq('class_id', child.class_id)
                .gte('start_time', nowIso)
                .limit(3);
              upcomingEvents = (events || []).length;
            }
          } catch {
            upcomingEvents = 0;
          }

          return {
            id: child.id,
            firstName: child.first_name,
            lastName: child.last_name,
            age: 5,
            grade: t('students.preschool'),
            className: child.class_id ? `Class ${String(child.class_id).slice(-4)}` : undefined,
            lastActivity,
            homeworkPending,
            upcomingEvents,
            progressScore,
            status,
          };
        }

        const cards = await Promise.all(realChildren.map(buildCard));
        setChildrenCards(cards);

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
  }, [user?.id, t]);

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

      {/* PoP Upload (Proof of Payment) - OTA preview feature */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => router.push('/screens/parent-pop-upload')} style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Upload Proof of Payment</Text>
          <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Securely upload a receipt or POP for school fees</Text>
        </TouchableOpacity>
      </View>

      {/* Child Registration - OTA preview feature */}
      <View style={styles.section}>
        <TouchableOpacity onPress={() => router.push('/screens/parent-child-registration')} style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: theme.text, fontWeight: '600' }}>Register a Child</Text>
          <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Create a child profile and link to your account</Text>
        </TouchableOpacity>
      </View>
      
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
          onUpgradePress={() => { /* removed in OTA preview */ }}
        />

        {/* Link Child CTA */}
        <View style={styles.section}>
          <TouchableOpacity onPress={() => router.push('/screens/parent-link-child')} style={{ backgroundColor: theme.surface, padding: 12, borderRadius: 10 }}>
            <Text style={{ color: theme.text, fontWeight: '600' }}>Link your child to this account</Text>
          <Text style={{ color: theme.textSecondary, marginTop: 4 }}>Submit a request to your school to link your child or use the registration form</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Children Grid */}
        <EnhancedChildrenGrid
          childrenData={childrenCards}
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
