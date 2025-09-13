import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, View, Text, RefreshControl, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import AdBanner from '@/components/ui/AdBanner';
import ErrorBanner from '@/components/ui/ErrorBanner';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCurrentLanguage, changeLanguage, getAvailableLanguages } from '@/lib/i18n';
import claudeService from '@/lib/ai-gateway/claude-service';
import { track } from '@/lib/analytics';
import { Colors } from '@/constants/Colors';

function useTier() {
  // Temporary: derive from env or profiles; default to 'free'
  const [tier, setTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  useEffect(() => {
    const forced = (process.env.EXPO_PUBLIC_FORCE_TIER || '').toLowerCase();
    if (forced === 'pro' || forced === 'enterprise') setTier(forced as any);
    (async () => {
      try {
        const { data } = await supabase!.auth.getUser();
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
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [usage, setUsage] = useState<{ ai_help: number; ai_lessons: number; tutoring_sessions: number }>({ ai_help: 0, ai_lessons: 0, tutoring_sessions: 0 });
  const [limits, setLimits] = useState<{ ai_help: number | 'unlimited'; ai_lessons: number | 'unlimited'; tutoring_sessions: number | 'unlimited' }>({ ai_help: 10, ai_lessons: 5, tutoring_sessions: 2 });
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tier = useTier();

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
      if (supabase && user?.id) {
        const { data: studentsData } = await supabase
          .from('students')
          .select('id, first_name, last_name, class_id, is_active')
          .or(`parent_id.eq.${user.id},guardian_id.eq.${user.id}`)
          .eq('is_active', true)
          .limit(5);
        
        setChildren(studentsData || []);

        // Load AI usage for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: usageData } = await supabase
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

  const Stat = ({ label, value, limit }: { label: string; value: number; limit: number | 'unlimited' }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={['#00f5ff', '#0080ff']} style={styles.statGradient}>
        <IconSymbol name="chart.bar" size={20} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{label}</Text>
      <Text style={styles.statSubtitle}>/ {String(limit)}</Text>
    </View>
  );

  interface QuickActionProps {
    icon: string;
    title: string;
    description: string;
    color: readonly [string, string, ...string[]];
    onPress: () => void;
    disabled?: boolean;
  }

  const QuickAction: React.FC<QuickActionProps> = ({ icon, title, description, color, onPress, disabled = false }) => (
    <TouchableOpacity
      style={[styles.quickActionCard, disabled && styles.disabledCard]}
      onPress={onPress}
      disabled={disabled}
    >
      <LinearGradient colors={color} style={styles.quickActionGradient}>
        <IconSymbol name={icon} size={24} color="#FFFFFF" />
        <Text style={styles.quickActionTitle}>{title}</Text>
        <Text style={styles.quickActionDescription}>{description}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );

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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00f5ff" />
        <Text style={styles.loadingText}>{t('dashboard.loading')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={styles.headerText}>
                <View style={styles.headerTitleRow}>
                  <View style={{ marginRight: 6 }}>
                    <IconSymbol name="heart" size={20} color={Colors.light.tint} />
                  </View>
                  <Text style={styles.greeting}>
                    {t('dashboard.welcome', { name: profile?.first_name || 'Parent' })} 👨‍👩‍👧‍👦
                  </Text>
                </View>
                <View style={styles.subRow}>
                  <Text style={styles.subtitleText}>Free Tier • Upgrade for more</Text>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>Parent</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Usage Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Usage Limits</Text>
          <View style={styles.statsRow}>
            <Stat label="AI Homework Help" value={usage.ai_help} limit={limits.ai_help} />
            <Stat label="AI Lessons" value={usage.ai_lessons} limit={limits.ai_lessons} />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="brain"
              title={t('ai.homework.title')}
              description={`${Number(limits.ai_help) - Number(usage.ai_help)} requests left`}
              color={['#00f5ff', '#0080ff']}
              onPress={() => handleQuickAction('homework')}
              disabled={usage.ai_help >= (limits.ai_help as number)}
            />
            <QuickAction
              icon="crown"
              title="Upgrade to Pro"
              description="Unlimited AI help & more features"
              color={['#ff8000', '#ff0080']}
              onPress={() => handleQuickAction('upgrade')}
            />
          </View>
        </View>

        {/* Children */}
        {children.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('students.title')}</Text>
            {children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <LinearGradient
                  colors={['#0b1220', '#111827']}
                  style={styles.childGradient}
                >
                  <IconSymbol name="person" size={24} color="#6B7280" />
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.first_name} {child.last_name}
                    </Text>
                    <Text style={styles.childClass}>
                      {child.class_id ? `Class: ${child.class_id}` : 'No class assigned'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>{t('dashboard.noChildren')}</Text>
              <Text style={styles.emptySubtitle}>{t('dashboard.noChildrenDescription')}</Text>
            </View>
          </View>
        )}

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
                ? `Used AI homework help ${usage.ai_help} times this month`
                : t('dashboard.noActivity')
              }
            </Text>
            {usage.ai_help >= (limits.ai_help as number) && (
              <TouchableOpacity 
                style={styles.upgradeButton}
                onPress={() => handleQuickAction('upgrade')}
              >
                <Text style={styles.upgradeButtonText}>Upgrade for unlimited access</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Homework Modal */}
      <HomeworkModal visible={showHomeworkModal} onClose={() => setShowHomeworkModal(false)} />
      
      {/* Language Modal */}
      <LanguageModal />
    </View>
  );
}

const { width } = require('react-native').Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1220',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1220',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
  },
  header: {
    backgroundColor: 'transparent',
    padding: 16,
  },
  headerCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitleText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  roleBadge: {
    backgroundColor: Colors.light.tint + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleBadgeText: {
    color: Colors.light.tint,
    fontSize: 12,
    fontWeight: '700',
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.tint + '20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.light.tint + '40',
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#111827',
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
    color: '#FFFFFF',
    marginTop: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6B7280',
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
    shadowColor: '#000',
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
  childCard: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  childGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  childInfo: {
    marginLeft: 12,
    flex: 1,
  },
  childName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  childClass: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
  },
  activityText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  upgradeButton: {
    backgroundColor: '#00f5ff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  upgradeButtonText: {
    color: '#000000',
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
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  languageOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#1F2937',
  },
  activeLanguageOption: {
    backgroundColor: Colors.light.tint + '20',
  },
  languageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  languageSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  modalCloseButton: {
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#FFFFFF',
    backgroundColor: '#0b1220',
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
    color: '#FFFFFF',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: '#9CA3AF',
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
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 8,
    minWidth: 200,
    shadowColor: '#000',
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
    borderBottomColor: '#1F2937',
  },
  profileMenuTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileRoleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ff800020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  profileFreeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ff8000',
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
    color: '#D1D5DB',
    flex: 1,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 4,
  },
});
