/**
 * Comprehensive Parent Dashboard
 * 
 * Visual, interactive dashboard with real AI functionality for parents.
 * Features homework help, progress tracking, language switching, and more.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { DesignSystem } from '@/constants/DesignSystem';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getCurrentLanguage, changeLanguage, getAvailableLanguages } from '@/lib/i18n';
import claudeService from '@/lib/ai-gateway/claude-service';
import { track } from '@/lib/analytics';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // Account for padding and gap

interface QuickActionProps {
  icon: string;
  title: string;
  description: string;
  color: readonly [string, string, ...string[]];
  onPress: () => void;
  disabled?: boolean;
}

interface StatCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: readonly [string, string, ...string[]];
}

interface HomeworkModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ComprehensiveParentDashboard() {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [aiUsage, setAiUsage] = useState({ homework: 0, lessons: 0 });
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
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
          setAiUsage({ homework: homeworkCount, lessons: lessonCount });
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const handleQuickAction = (action: string) => {
    track('edudash.dashboard.quick_action', {
      action,
      user_id: user?.id,
      role: 'parent',
    });

    switch (action) {
      case 'homework':
        setShowHomeworkModal(true);
        break;
      case 'language':
        setShowLanguageModal(true);
        break;
      case 'progress':
        Alert.alert(t('common.info'), 'Progress tracking coming soon!');
        break;
      case 'calendar':
        Alert.alert(t('common.info'), 'Calendar view coming soon!');
        break;
    }
  };

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

  const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => (
    <View style={styles.statCard}>
      <LinearGradient colors={color} style={styles.statGradient}>
        <IconSymbol name={icon} size={20} color="#FFFFFF" />
      </LinearGradient>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statSubtitle}>{subtitle}</Text>
    </View>
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
                await changeLanguage(lang.code);
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
        {/* Header */}
        <LinearGradient
          colors={['#0b1220', '#1a0a2e', '#16213e']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>
                {t('dashboard.welcome', { name: profile?.first_name || 'Parent' })}
              </Text>
              <Text style={styles.headerSubtext}>
                {t('dashboard.quickActions')}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => setShowLanguageModal(true)}
            >
              <IconSymbol name="globe" size={20} color="#00f5ff" />
              <Text style={styles.languageButtonText}>
                {getCurrentLanguage().toUpperCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.quickActions')}</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction
              icon="brain"
              title={t('ai.homework.title')}
              description={t('ai.homework.description')}
              color={['#00f5ff', '#0080ff']}
              onPress={() => handleQuickAction('homework')}
            />
            <QuickAction
              icon="chart.bar"
              title={t('reports.progress')}
              description="Track your child's progress"
              color={['#8000ff', '#ff0080']}
              onPress={() => handleQuickAction('progress')}
            />
            <QuickAction
              icon="calendar"
              title="Schedule"
              description="View upcoming assignments"
              color={['#ff0080', '#ff8000']}
              onPress={() => handleQuickAction('calendar')}
            />
            <QuickAction
              icon="message"
              title="Messages"
              description="Chat with teachers"
              color={['#00c851', '#007e33']}
              onPress={() => handleQuickAction('messages')}
            />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('ai.usage.title')}</Text>
          <View style={styles.statsRow}>
            <StatCard
              title={t('ai.usage.requests')}
              value={aiUsage.homework.toString()}
              subtitle={t('ai.usage.monthly')}
              icon="brain"
              color={['#00f5ff', '#0080ff']}
            />
            <StatCard
              title="Lessons"
              value={aiUsage.lessons.toString()}
              subtitle={t('ai.usage.monthly')}
              icon="book"
              color={['#8000ff', '#ff0080']}
            />
          </View>
        </View>

        {/* Children */}
        {children.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('students.title')}</Text>
            {children.map((child) => (
              <View key={child.id} style={styles.childCard}>
                <LinearGradient
                  colors={['#F9FAFB', '#F3F4F6']}
                  style={styles.childGradient}
                >
                  <IconSymbol name="person" size={24} color="#6B7280" />
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>
                      {child.first_name} {child.last_name}
                    </Text>
                    <Text style={styles.childClass}>
                      Class ID: {child.class_id}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              {aiUsage.homework > 0 
                ? `Used AI homework help ${aiUsage.homework} times this month`
                : t('dashboard.noActivity')
              }
            </Text>
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

const HomeworkModal: React.FC<HomeworkModalProps> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');

  const handleSubmit = async () => {
    if (!question.trim()) return;

    setLoading(true);
    try {
      const aiResponse = await claudeService.generateResponse({
        id: `homework-${Date.now()}`,
        userId: user?.id || '',
        serviceType: 'homework_help',
        provider: 'claude',
        prompt: question,
        metadata: {
          studentAge: 12, // Default age, could be customized
          subject: 'General',
          difficulty: 'intermediate'
        },
        requestedAt: new Date(),
      });

      setResponse(aiResponse.content);
      track('edudash.ai.homework_help_used', {
        user_id: user?.id,
        question_length: question.length,
        tokens_used: aiResponse.tokensUsed,
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
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  languageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  languageButtonText: {
    color: '#00f5ff',
    marginLeft: 6,
    fontWeight: 'bold',
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
  },
  disabledCard: {
    opacity: 0.5,
  },
  quickActionGradient: {
    padding: 16,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
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
    color: '#111827',
  },
  childClass: {
    fontSize: 14,
    color: '#6B7280',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
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
    color: '#111827',
    marginBottom: 8,
  },
  responseText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalCloseButton: {
    padding: 12,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#6B7280',
    fontSize: 16,
  },
  languageOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
  },
  activeLanguageOption: {
    backgroundColor: '#E0F2FE',
  },
  languageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  languageSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
});
