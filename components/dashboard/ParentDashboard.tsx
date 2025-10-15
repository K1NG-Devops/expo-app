import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, View, Text, RefreshControl, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import AdBanner from '@/components/ui/AdBanner';
import { NativeAdCard } from '@/components/ads/NativeAdCard';
import { PLACEMENT_KEYS } from '@/lib/ads/placements';
import ErrorBanner from '@/components/ui/ErrorBanner';
// IconSymbol import removed - now using enhanced components
// Removed unused imports: WhatsAppStatusChip, WhatsAppQuickAction
import WhatsAppOptInModal from '@/components/whatsapp/WhatsAppOptInModal';
import OfflineBanner from '@/components/sync/OfflineBanner';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';
import { getCurrentLanguage, changeLanguage, getAvailableLanguages } from '@/lib/i18n';
// import claudeService from '@/lib/ai-gateway/claude-service';
import { useHomeworkGenerator } from '@/hooks/useHomeworkGenerator';
import { track } from '@/lib/analytics';
// Colors import removed - now using theme colors
import EnhancedHeader from './EnhancedHeader';
// import SimpleEnhancedHeader from './SimpleEnhancedHeader';
import { EnhancedStatsRow } from './EnhancedStats';
import { EnhancedQuickActions } from './EnhancedQuickActions';
import SkeletonLoader from '../ui/SkeletonLoader';
import { RoleBasedHeader } from '../RoleBasedHeader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUnreadMessageCount } from '@/hooks/useParentMessaging';
import { usePOPStats } from '@/hooks/usePOPUploads';
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

// Child Switcher Component
interface ChildSwitcherProps {
  children: any[];
  activeChildId: string | null;
  onChildChange: (childId: string) => void;
}

const ChildSwitcher: React.FC<ChildSwitcherProps> = ({ children, activeChildId, onChildChange }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  if (children.length <= 1) return null;

  return (
    <View style={{
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    }}>
      <Text style={{
        fontSize: 14,
        fontWeight: '600',
        color: theme.text,
        marginBottom: 12,
      }}>{t('parent.selectChild')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          {children.map((child) => {
            const isActive = child.id === activeChildId;
            return (
              <TouchableOpacity
                key={child.id}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isActive ? theme.primary : theme.elevated,
                  borderWidth: isActive ? 0 : 1,
                  borderColor: theme.border,
                }}
                onPress={() => onChildChange(child.id)}
              >
                <Text style={{
                  fontSize: 14,
                  fontWeight: isActive ? '600' : '500',
                  color: isActive ? theme.onPrimary : theme.text,
                }}>
                  {child.firstName} {child.lastName}
                </Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => router.push('/screens/parent-children')}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: theme.elevated,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{t('common.viewAll')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default function ParentDashboard() {
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, profile } = useAuth();
  const { data: unreadMessageCount = 0 } = useUnreadMessageCount();
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
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  
  // POP stats hook - must be after activeChildId is declared
  const { data: popStats } = usePOPStats(activeChildId || undefined);
  const [urgentMetrics, setUrgentMetrics] = useState<{
    feesDue: { amount: number; dueDate: string | null; overdue: boolean } | null;
    unreadMessages: number;
    pendingHomework: number;
    todayAttendance: 'present' | 'absent' | 'late' | 'unknown';
    upcomingEvents: number;
  }>({ 
    feesDue: null, 
    unreadMessages: 0, 
    pendingHomework: 0, 
    todayAttendance: 'unknown',
    upcomingEvents: 0 
  });

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load children (if any) - handle various parent-child relationship patterns
      if (user?.id) {
        const client = assertSupabase();
        
        // Try multiple approaches to find linked children
        let studentsData: any[] = [];
        
        try {
          // Resolve internal user id from auth uid
          const { data: me } = await client
            .from('users')
            .select('id, preschool_id')
            .eq('auth_user_id', user.id)
            .single();
          const internalUserId = me?.id;
          const mySchoolId = me?.preschool_id || (profile as any)?.organization_id || null;

          // Approach 1: Direct parent_id/guardian_id lookup with class names using internal user id
          const { data: directChildren } = internalUserId ? await client
            .from('students')
            .select(`
              id, first_name, last_name, class_id, is_active, preschool_id, date_of_birth, parent_id, guardian_id,
              classes!left(id, name, grade_level)
            `)
            .or(`parent_id.eq.${internalUserId},guardian_id.eq.${internalUserId}`)
            .eq('is_active', true)
            .maybeSingle() : { data: null } as any;

          let directChildrenList: any[] = [];
          if (directChildren) {
            directChildrenList = Array.isArray(directChildren) ? directChildren : [directChildren];
          }

          if (directChildrenList.length > 0) {
            studentsData = directChildrenList;
            console.log(`Found ${directChildrenList.length} children via direct parent/guardian link`);
          } else {
            // Approach 2: If no direct links and user is parent role, try preschool-based lookup
            if (profile?.role === 'parent' && mySchoolId) {
              console.log('No direct parent links found, trying preschool-based lookup');
              const { data: preschoolChildren } = await client
                .from('students')
                .select(`
                  id, first_name, last_name, class_id, is_active, preschool_id, date_of_birth, parent_id, guardian_id,
                  classes!left(id, name, grade_level)
                `)
                .eq('preschool_id', mySchoolId)
                .eq('is_active', true)
                .is('parent_id', null) // Only orphaned students
                .limit(5);
              
              if (preschoolChildren && preschoolChildren.length > 0) {
                studentsData = preschoolChildren;
                console.log(`Found ${preschoolChildren.length} potential children in same preschool (orphaned)`);
              }
            }
          }
        } catch (error) {
          console.error('Error loading children:', error);
        }
        
        const realChildren = studentsData || [];
        setChildren(realChildren);
        if (realChildren.length > 0) {
          setActiveChildId(realChildren[0].id);
        }

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
            dateOfBirth: child.date_of_birth,
            grade: child.classes?.grade_level || t('students.preschool'),
            className: child.classes?.name || (child.class_id ? `Class ${String(child.class_id).slice(-4)}` : null),
            lastActivity,
            homeworkPending,
            upcomingEvents,
            progressScore,
            status,
          };
        }

        const cards = await Promise.all(realChildren.map(buildCard));
        setChildrenCards(cards);
        
        // Set active child if not already set
        if (cards.length > 0 && !activeChildId) {
          const savedChildId = await AsyncStorage.getItem('@edudash_active_child_id');
          const validChildId = savedChildId && cards.find(c => c.id === savedChildId) ? savedChildId : cards[0].id;
          setActiveChildId(validChildId);
        }
        
        // Load urgent metrics for active child
        if (cards.length > 0) {
          const targetChild = cards.find(c => c.id === (activeChildId || cards[0].id));
          if (targetChild) {
            await loadUrgentMetrics(targetChild.id);
          }
        }

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
    }, [user?.id, t, activeChildId]);

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

  // Helper for greeting based on time
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.good_morning');
    if (hour < 18) return t('dashboard.good_afternoon');
    return t('dashboard.good_evening');
  };

  // Handle active child change and persist
  useEffect(() => {
    if (activeChildId) {
      AsyncStorage.setItem('@edudash_active_child_id', activeChildId).catch(() => {});
      // Reload metrics for the newly selected child
      if (activeChildId && childrenCards.find(c => c.id === activeChildId)) {
        loadUrgentMetrics(activeChildId);
      }
    }
  }, [activeChildId]);

  // Load urgent metrics for a specific child
  const loadUrgentMetrics = async (studentId: string) => {
    try {
      const client = assertSupabase();
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // Get the student's preschool_id for scoped queries
      const { data: studentData } = await client
        .from('students')
        .select('preschool_id, class_id')
        .eq('id', studentId)
        .single();
      
      if (!studentData) return;
      
      // 1. Check for fees due (mock for now - will be real when payments table exists)
      // TODO: Replace with real payment_records query
      const feesDue = {
        amount: Math.random() > 0.7 ? Math.floor(Math.random() * 5000) + 500 : 0,
        dueDate: Math.random() > 0.5 ? thirtyDaysFromNow : null,
        overdue: Math.random() > 0.8
      };
      
      // 2. Get real unread messages count
      const unreadMessages = unreadMessageCount;
      
      // 3. Get pending homework count
      let pendingHomework = 0;
      if (studentData.class_id) {
        const { data: assignments } = await client
          .from('homework_assignments')
          .select('id')
          .eq('class_id', studentData.class_id)
          .gte('due_date', today)
          .limit(10);
        
        if (assignments) {
          const assignmentIds = assignments.map(a => a.id);
          const { data: submissions } = await client
            .from('homework_submissions')
            .select('assignment_id')
            .eq('student_id', studentId)
            .in('assignment_id', assignmentIds);
          
          const submittedIds = new Set(submissions?.map(s => s.assignment_id) || []);
          pendingHomework = assignmentIds.filter(id => !submittedIds.has(id)).length;
        }
      }
      
      // 4. Get today's attendance
      let todayAttendance: 'present' | 'absent' | 'late' | 'unknown' = 'unknown';
      try {
        const { data: attendanceData } = await client
          .from('attendance_records')
          .select('status')
          .eq('student_id', studentId)
          .eq('date', today)
          .maybeSingle();
        
        if (attendanceData) {
          const status = String(attendanceData.status).toLowerCase();
          todayAttendance = ['present', 'absent', 'late'].includes(status) 
            ? status as 'present' | 'absent' | 'late' 
            : 'unknown';
        }
      } catch {}
      
      // 5. Get upcoming events count
      let upcomingEvents = 0;
      if (studentData.class_id) {
        try {
          const { count } = await client
            .from('class_events')
            .select('id', { count: 'exact', head: true })
            .eq('class_id', studentData.class_id)
            .gte('start_time', new Date().toISOString())
            .lte('start_time', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString());
          
          upcomingEvents = count || 0;
        } catch {}
      }
      
      setUrgentMetrics({
        feesDue: feesDue.amount > 0 ? feesDue : null,
        unreadMessages,
        pendingHomework,
        todayAttendance,
        upcomingEvents
      });
      
    } catch (error) {
      console.error('Failed to load urgent metrics:', error);
    }
  };

  // Helper function to calculate and display child age
  const getChildAgeText = (child: any): string => {
    if (!child.dateOfBirth && !child.date_of_birth) {
      return t('common.ageUnknown');
    }
    
    try {
      const birthDate = new Date(child.dateOfBirth || child.date_of_birth);
      const today = new Date();
      const ageInMs = today.getTime() - birthDate.getTime();
      const ageInYears = Math.floor(ageInMs / (365.25 * 24 * 60 * 60 * 1000));
      
      if (ageInYears < 0 || ageInYears > 10) {
        return t('common.ageUnknown');
      }
      
      return t('common.ageYears', { age: ageInYears });
    } catch {
      return t('common.ageUnknown');
    }
  };
  
  // Helper to format currency (South African Rand)
  const formatCurrency = (amount: number): string => {
    return `R ${amount.toLocaleString()}`;
  };

  // Helper functions for attendance status
  const getAttendanceColor = (): string => {
    switch (urgentMetrics.todayAttendance) {
      case 'present': return theme.success;
      case 'absent': return theme.error;
      case 'late': return theme.warning;
      default: return theme.textSecondary;
    }
  };

  const getAttendanceIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (urgentMetrics.todayAttendance) {
      case 'present': return 'checkmark-circle';
      case 'absent': return 'close-circle';
      case 'late': return 'time';
      default: return 'help-circle';
    }
  };

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
    const [response, setResponse] = useState('');
    const { loading: aiLoading, generate } = useHomeworkGenerator();
  
    const handleSubmit = async () => {
      if (!question.trim()) return;
  
      try {
        const start = Date.now();
        const text = await generate({
          question,
          subject: 'General Education',
          gradeLevel: children.length > 0 ? 8 : 10,
          difficulty: 'easy',
        });

        const content = typeof text === 'string' ? text : String(text ?? '');
        setResponse(content);
        track('edudash.ai.homework_help_completed', {
          user_id: user?.id,
          question_length: question.length,
          success: true,
          duration_ms: Date.now() - start,
          source: 'parent_dashboard',
          response_length: content.length,
        });
      } catch (error) {
        Alert.alert(t('common.error'), t('ai.homework.error'));
        console.error('Homework help error:', error);
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
              style={[styles.submitButton, (!question.trim() || aiLoading) && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!question.trim() || aiLoading}
            >
              <LinearGradient
                colors={loading ? ['#6B7280', '#9CA3AF'] : ['#00f5ff', '#0080ff']}
                style={styles.submitGradient}
              >
                {aiLoading ? (
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

  // Function to cycle through children when tapping header subtitle
  const cycleToNextChild = () => {
    if (children.length <= 1) return;
    
    const currentIndex = children.findIndex(child => child.id === activeChildId);
    const nextIndex = (currentIndex + 1) % children.length;
    const nextChild = children[nextIndex];
    
    if (nextChild) {
      setActiveChildId(nextChild.id);
      track('edudash.dashboard.child_cycled', {
        user_id: user?.id,
        from_child_id: activeChildId,
        to_child_id: nextChild.id,
        total_children: children.length,
        source: 'header_tap'
      });
    }
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
    // Enhanced Child Card Styles
    childCard: {
      backgroundColor: theme.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      shadowColor: theme.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    childHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    childInfo: {
      flex: 1,
    },
    childName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    childDetails: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
    },
    statusText: {
      fontSize: 12,
      fontWeight: '600',
      textTransform: 'capitalize',
    },
    childStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    statItem: {
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    childStatValue: {
      fontSize: 16,
      fontWeight: 'bold',
    },
    childActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flex: 1,
      marginHorizontal: 2,
      justifyContent: 'center',
    },
    actionText: {
      fontSize: 12,
      fontWeight: '600',
      marginLeft: 4,
    },
    lastActivityContainer: {
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    lastActivityText: {
      fontSize: 12,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    // Empty State Styles
    emptyState: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: theme.surface,
      borderRadius: 16,
      marginTop: 16,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.text,
      marginTop: 16,
      textAlign: 'center',
    },
    emptyStateSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      textAlign: 'center',
      marginTop: 8,
      lineHeight: 20,
    },
    emptyStateButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      marginTop: 20,
    },
    emptyStateButtonText: {
      color: theme.onPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    // Principal Dashboard Style Section Headers
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
    // Principal Dashboard Style Tool Cards
    toolsGrid: {
      gap: 12,
    },
    toolCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderLeftWidth: 4,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
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
    // Principal Dashboard Style Welcome Section
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
    welcomeSubtitle: {
      fontSize: 14,
      color: theme.onPrimary,
      opacity: 0.9,
      marginTop: 4,
    },
    welcomeHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    themeToggleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    // Urgent Cards Styling
    urgentCardsGrid: {
      gap: 12,
    },
    urgentCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      borderLeftWidth: 4,
    },
    urgentCardPayment: {
      borderLeftColor: theme.warning,
    },
    urgentCardMessage: {
      borderLeftColor: theme.primary,
    },
    urgentCardHomework: {
      borderLeftColor: theme.accent,
    },
    urgentCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    urgentIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    urgentCardContent: {
      flex: 1,
    },
    urgentCardTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 2,
    },
    urgentCardAmount: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 2,
    },
    urgentCardSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    // Daily Summary Styling
    dailySummaryCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    dailySummaryGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    dailySummaryItem: {
      alignItems: 'center',
      flex: 1,
    },
    dailySummaryIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    dailySummaryLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 4,
    },
    dailySummaryValue: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      textAlign: 'center',
    },
    // Professional Metric Cards - Principal Dashboard Style
    metricsGrid: {
      gap: 12,
    },
    metricsRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },
    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 12,
    },
    metricValue: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.text,
      marginBottom: 4,
    },
    metricLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.text,
      marginBottom: 4,
    },
    metricStatus: {
      fontSize: 12,
      fontWeight: '500',
      textTransform: 'lowercase',
    },
    // POP Actions Grid
    popActionsGrid: {
      gap: 12,
    },
    popActionCard: {
      backgroundColor: theme.surface,
      borderRadius: 12,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 2,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
      marginBottom: 12,
    },
    popActionIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    popActionContent: {
      flex: 1,
    },
    popActionTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 4,
    },
    popActionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 18,
    },
    popActionBadge: {
      marginTop: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      alignSelf: 'flex-start',
    },
    popActionBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: 'white',
    },
    // Timeline Styles
    timelineContainer: {
      paddingLeft: 16,
    },
    timelineItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    timelineDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 12,
      marginTop: 6,
    },
    timelineContent: {
      flex: 1,
    },
    timelineEvent: {
      fontSize: 14,
      color: theme.text,
      marginBottom: 2,
    },
    timelineTime: {
      fontSize: 12,
      color: theme.textSecondary,
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

      {/* Fixed Header - Hidden for cleaner UI */}
      
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
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

        {/* Professional Welcome Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>
                {getGreeting()}, {`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || t('roles.parent')}! 👋
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {(() => {
                  const active = (childrenCards || []).find(c => c.id === activeChildId) || (childrenCards.length === 1 ? childrenCards[0] : null);
if (active) return t('dashboard.managingChildren', { count: 1, defaultValue: `Managing ${active.firstName} ${active.lastName}` });
                  if (children.length > 0) return t('dashboard.managingChildrenPlural', { count: children.length });
                  return t('dashboard.welcome_generic', { defaultValue: 'Welcome to EduDash Pro' });
                })()}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.themeToggleButton}
              onPress={async () => {
                await toggleTheme();
                try { 
                  if (Platform.OS !== 'web') {
                    // Use platform-appropriate haptics
                    if (Platform.OS === 'ios') {
                      await require('expo-haptics').impactAsync(require('expo-haptics').ImpactFeedbackStyle.Light);
                    } else {
                      require('react-native').Vibration.vibrate(15);
                    }
                  }
                } catch {}
              }}
            >
              <Ionicons 
                name={isDark ? 'sunny' : 'moon'} 
                size={18} 
                color={theme.primary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Children Section (moved under welcome) */}
        {children.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('parent.myChildren')} ({children.length})</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push('/screens/parent-children')}
              >
                <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.primary} />
              </TouchableOpacity>
            </View>
            {children.length > 1 && (
              <View style={{ marginBottom: 12 }}>
                <ChildSwitcher 
                  children={childrenCards}
                  activeChildId={activeChildId}
                  onChildChange={setActiveChildId}
                />
              </View>
            )}
            {(children.length > 1 && activeChildId ? 
              childrenCards.filter(child => child.id === activeChildId) : 
              childrenCards
            ).map((child, index) => (
              <View key={child.id} style={styles.childCard}>
                <View style={styles.childHeader}>
                  <View style={styles.childInfo}>
                    <Text style={styles.childName}>{child.firstName} {child.lastName}</Text>
                    <Text style={styles.childDetails}>{getChildAgeText(child)} • {child.grade} • {child.className || t('common.noClass')}</Text>
                  </View>
                  <View style={[styles.statusBadge, 
                    child.status === 'active' ? { backgroundColor: theme.success + '20' } :
                    child.status === 'late' ? { backgroundColor: theme.warning + '20' } : 
                    { backgroundColor: theme.error + '20' }
                  ]}>
                    <Text style={[styles.statusText, 
                      child.status === 'active' ? { color: theme.success } :
                      child.status === 'late' ? { color: theme.warning } : 
                      { color: theme.error }
                    ]}>{child.status}</Text>
                  </View>
                </View>
                
                <View style={styles.childStats}>
                  <View style={styles.statItem}>
<Text style={styles.statLabel}>{t('parent.attendanceToday')}</Text>
                    <Text style={[styles.childStatValue, { color: theme.success }]}>{child.progressScore}%</Text>
                  </View>
                  <View style={styles.statItem}>
<Text style={styles.statLabel}>{t('parent.pendingHomework')}</Text>
                    <Text style={[styles.childStatValue, child.homeworkPending > 0 ? { color: theme.warning } : { color: theme.success }]}>
                      {child.homeworkPending}
                    </Text>
                  </View>
                  <View style={styles.statItem}>
<Text style={styles.statLabel}>{t('parent.upcomingEvents')}</Text>
                    <Text style={[styles.childStatValue, { color: theme.primary }]}>{child.upcomingEvents}</Text>
                  </View>
                </View>
                
                <View style={styles.childActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.primary + '10' }]}
                    onPress={() => console.log('View attendance for', child.id)}
                  >
                    <Ionicons name="calendar" size={16} color={theme.primary} />
<Text style={[styles.actionText, { color: theme.primary }]}>{t('parent.attendanceToday')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.success + '10' }]}
                    onPress={() => console.log('View homework for', child.id)}
                  >
                    <Ionicons name="book" size={16} color={theme.success} />
<Text style={[styles.actionText, { color: theme.success }]}>{t('parent.pendingHomework')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: theme.accent + '10' }]}
                    onPress={() => handleQuickMessage(child)}
                  >
                    <Ionicons name="chatbubble" size={16} color={theme.accent} />
<Text style={[styles.actionText, { color: theme.accent }]}>{t('parent.messages')}</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.lastActivityContainer}>
<Text style={styles.lastActivityText}>
                    {t('common.last_activity', { defaultValue: 'Last activity:' })} {child.lastActivity.toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{t('parent.noChildrenFound')}</Text>
            </View>
            <View style={styles.emptyState}>
              <Ionicons name="person-add" size={48} color={theme.textSecondary} />
              <Text style={styles.emptyStateTitle}>{t('parent.noChildrenLinked')}</Text>
              <Text style={styles.emptyStateSubtitle}>
                {t('parent.registerOrLinkChild')}
              </Text>
              <TouchableOpacity 
                style={styles.emptyStateButton}
                onPress={() => router.push('/screens/parent-child-registration')}
              >
                <Text style={styles.emptyStateButtonText}>{t('parent.registerChild')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Professional Metric Cards - Principal Dashboard Style */}
        <View style={styles.section}>
          <View style={styles.metricsGrid}>
            {/* Row 1: Core metrics */}
            <View style={styles.metricsRow}>
              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.primary + '30' }]}
                onPress={() => router.push('/messages')}
              >
                <View style={[styles.metricIcon, { backgroundColor: theme.primary }]}>
                  <Ionicons name="mail" size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>{unreadMessageCount}</Text>
<Text style={styles.metricLabel}>{t('parent.newMessages')}</Text>
                <Text style={[styles.metricStatus, { color: unreadMessageCount > 0 ? theme.warning : theme.textSecondary }]}>
{unreadMessageCount > 0 ? t('trends.needs_attention') : t('notifications.all_read', { defaultValue: 'all read' })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.success + '30' }]}
                onPress={() => router.push('/pop-history')}
              >
                <View style={[styles.metricIcon, { backgroundColor: theme.success }]}>
                  <Ionicons name="checkmark-circle" size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>{popStats?.proof_of_payment?.approved || 0}</Text>
<Text style={styles.metricLabel}>{t('parent.approvedPayments', { defaultValue: 'Approved Payments' })}</Text>
<Text style={[styles.metricStatus, { color: theme.success }]}>{t('common.verified', { defaultValue: 'verified' })}</Text>
              </TouchableOpacity>
            </View>

            {/* Row 2: POP metrics */}
            <View style={styles.metricsRow}>
              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.warning + '30' }]}
                onPress={() => router.push('/pop-history?type=proof_of_payment&status=pending')}
              >
                <View style={[styles.metricIcon, { backgroundColor: theme.warning }]}>
                  <Ionicons name="time" size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>{popStats?.proof_of_payment?.pending || 0}</Text>
<Text style={styles.metricLabel}>{t('parent.pendingPayments', { defaultValue: 'Pending Payments' })}</Text>
<Text style={[styles.metricStatus, { color: theme.warning }]}>{t('common.review_needed', { defaultValue: 'review needed' })}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.accent + '30' }]}
                onPress={() => router.push('/pop-history?type=picture_of_progress')}
              >
                <View style={[styles.metricIcon, { backgroundColor: theme.accent }]}>
                  <Ionicons name="images" size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>{(popStats?.picture_of_progress?.pending || 0) + (popStats?.picture_of_progress?.approved || 0)}</Text>
                <Text style={styles.metricLabel}>Progress Photos</Text>
                <Text style={[styles.metricStatus, { color: theme.accent }]}>shared</Text>
              </TouchableOpacity>
            </View>

            {/* Row 3: Activity metrics */}
            <View style={styles.metricsRow}>
              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.error + '30' }]}
                onPress={() => router.push('/homework')}
              >
                <View style={[styles.metricIcon, { backgroundColor: theme.error }]}>
                  <Ionicons name="book" size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>{urgentMetrics.pendingHomework}</Text>
                <Text style={styles.metricLabel}>Pending Homework</Text>
                <Text style={[styles.metricStatus, { color: urgentMetrics.pendingHomework > 0 ? theme.error : theme.textSecondary }]}>
                  {urgentMetrics.pendingHomework > 0 ? 'overdue' : 'up to date'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.metricCard, { borderColor: theme.primary + '30' }]}
                onPress={() => router.push('/attendance')}
              >
                <View style={[styles.metricIcon, { backgroundColor: getAttendanceColor() }]}>
                  <Ionicons name={getAttendanceIcon()} size={20} color="white" />
                </View>
                <Text style={styles.metricValue}>Today</Text>
                <Text style={styles.metricLabel}>Attendance</Text>
                <Text style={[styles.metricStatus, { color: getAttendanceColor() }]}>
                  {urgentMetrics.todayAttendance === 'unknown' ? 'not recorded' : urgentMetrics.todayAttendance}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* POP Upload Actions - Prominent section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📸 Upload & Share</Text>
          <View style={styles.popActionsGrid}>
            <TouchableOpacity 
              style={[styles.popActionCard, { backgroundColor: theme.warning + '10', borderColor: theme.warning }]}
              onPress={() => {
                if (activeChildId) {
                  const child = childrenCards.find(c => c.id === activeChildId);
                  router.push(`/screens/parent-proof-of-payment?studentId=${activeChildId}&studentName=${encodeURIComponent(`${child?.firstName || ''} ${child?.lastName || ''}`.trim())}`);
                } else {
                  router.push('/screens/parent-proof-of-payment');
                }
              }}
            >
              <View style={[styles.popActionIcon, { backgroundColor: theme.warning }]}>
                <Ionicons name="receipt" size={28} color="white" />
              </View>
              <View style={styles.popActionContent}>
                <Text style={styles.popActionTitle}>Upload Proof of Payment</Text>
                <Text style={styles.popActionSubtitle}>Share receipts & payment confirmations</Text>
                {popStats?.proof_of_payment?.pending && popStats.proof_of_payment.pending > 0 && (
                  <View style={[styles.popActionBadge, { backgroundColor: theme.warning }]}>
                    <Text style={styles.popActionBadgeText}>{popStats.proof_of_payment.pending} pending</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.popActionCard, { backgroundColor: theme.accent + '10', borderColor: theme.accent }]}
              onPress={() => {
                if (activeChildId) {
                  const child = childrenCards.find(c => c.id === activeChildId);
                  router.push(`/picture-of-progress?studentId=${activeChildId}&studentName=${encodeURIComponent(`${child?.firstName || ''} ${child?.lastName || ''}`.trim())}`);
                } else {
                  router.push('/picture-of-progress');
                }
              }}
            >
              <View style={[styles.popActionIcon, { backgroundColor: theme.accent }]}>
                <Ionicons name="camera" size={28} color="white" />
              </View>
              <View style={styles.popActionContent}>
                <Text style={styles.popActionTitle}>Share Progress Pictures</Text>
                <Text style={styles.popActionSubtitle}>Document your child's learning journey</Text>
                {popStats?.picture_of_progress?.recent && popStats.picture_of_progress.recent > 0 && (
                  <View style={[styles.popActionBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.popActionBadgeText}>{popStats.picture_of_progress.recent} this week</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.popActionCard, { backgroundColor: theme.primary + '10', borderColor: theme.primary }]}
              onPress={() => router.push('/pop-history')}
            >
              <View style={[styles.popActionIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="folder-open" size={28} color="white" />
              </View>
              <View style={styles.popActionContent}>
                <Text style={styles.popActionTitle}>View Upload History</Text>
                <Text style={styles.popActionSubtitle}>Manage all your uploads & approvals</Text>
                {popStats?.total_pending && popStats.total_pending > 0 && (
                  <View style={[styles.popActionBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.popActionBadgeText}>{popStats.total_pending} to review</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Native Ad - Inline in content stream */}
        {showBanner && (
          <View style={styles.section}>
            <NativeAdCard 
              placement={PLACEMENT_KEYS.NATIVE_PARENT_FEED}
              style={{ alignSelf: 'center' }}
              itemIndex={1}
              showFallback={true}
            />
          </View>
        )}

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

        {/* Ad Banner for Free Tier - Middle placement */}
        {showBanner && (
          <View style={styles.section}>
            <AdBanner />
          </View>
        )}

        
        {/* Communication Hub - Principal Dashboard Style */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('parent.communicationHub')}</Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => router.push('/screens/parent-messages')}
            >
              <Text style={styles.viewAllText}>{t('common.viewAll')}</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.toolsGrid}>
            <TouchableOpacity 
              style={[styles.toolCard, { backgroundColor: theme.primary + '10', borderLeftColor: theme.primary, shadowColor: theme.primary }]}
              onPress={() => router.push('/screens/parent-messages')}
            >
              <View style={[styles.toolIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="mail" size={20} color="white" />
              </View>
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{t('parent.messages')}</Text>
                <Text style={styles.toolSubtitle}>{t('parent.teacherCommunication')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toolCard, { backgroundColor: theme.success + '10', borderLeftColor: theme.success, shadowColor: theme.success }]}
              onPress={() => router.push('/screens/parent-announcements')}
            >
              <View style={[styles.toolIcon, { backgroundColor: theme.success }]}>
                <Ionicons name="megaphone" size={20} color="white" />
              </View>
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{t('parent.announcements')}</Text>
                <Text style={styles.toolSubtitle}>{t('parent.schoolUpdates')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.toolCard, { backgroundColor: theme.warning + '10', borderLeftColor: theme.warning, shadowColor: theme.warning }]}
              onPress={() => router.push('/screens/parent-meetings')}
            >
              <View style={[styles.toolIcon, { backgroundColor: theme.warning }]}>
                <Ionicons name="calendar" size={20} color="white" />
              </View>
              <View style={styles.toolContent}>
                <Text style={styles.toolTitle}>{t('parent.scheduleMeeting')}</Text>
                <Text style={styles.toolSubtitle}>{t('parent.teacherMeeting')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
            
            {/* Native Ad - List context */}
            {showBanner && (
              <NativeAdCard 
                placement={PLACEMENT_KEYS.NATIVE_PARENT_LIST}
                style={{ marginVertical: 8 }}
                itemIndex={3}
                showFallback={true}
              />
            )}
          </View>
        </View>
        
        {/* Banner Ad - Messages/Communication context */}
        {showBanner && (
          <View style={styles.section}>
            <AdBanner 
              placement={PLACEMENT_KEYS.BANNER_PARENT_MESSAGES}
              style={{ marginVertical: 8 }}
              showFallback={true}
            />
          </View>
        )}
        
        {/* Recent Activity Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recentActivity')}</Text>
          <View style={styles.timelineContainer}>
            {(() => {
              const recentActivities = [];
              
              // Add AI help usage if any
              if (usage.ai_help > 0) {
                recentActivities.push({
                  time: 'Today',
                  event: t('dashboard.aiHelpUsed', { count: usage.ai_help }),
                  type: 'success'
                });
              }
              
              // Add children activities if any
              if (children.length > 0) {
                recentActivities.push({
                  time: '1 day ago',
                  event: `Monitoring ${children.length} ${children.length === 1 ? 'child' : 'children'}`,
                  type: 'info'
                });
              }
              
              // Add usage limit warning if needed
              if (usage.ai_help >= (limits.ai_help as number)) {
                recentActivities.push({
                  time: 'Now',
                  event: t('dashboard.upgradeLimitReached'),
                  type: 'warning'
                });
              }
              
              // Fallback activities if no real data
              if (recentActivities.length === 0) {
                recentActivities.push(
                  { time: 'Welcome!', event: 'Account created successfully', type: 'success' },
                  { time: 'Next', event: 'Link your children to start tracking progress', type: 'info' }
                );
              }
              
              return recentActivities.slice(0, 4).map((item, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={[
                    styles.timelineDot,
                    { backgroundColor: 
                      item.type === 'success' ? theme.success :
                      item.type === 'warning' ? theme.warning :
                      theme.primary
                    }
                  ]} />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineEvent}>{item.event}</Text>
                    <Text style={styles.timelineTime}>{item.time}</Text>
                  </View>
                </View>
              ));
            })()
            }
            
            {/* Upgrade CTA if usage limit reached */}
            {usage.ai_help >= (limits.ai_help as number) && (
              <View style={styles.timelineItem}>
                <View style={[styles.timelineDot, { backgroundColor: theme.warning }]} />
                <View style={styles.timelineContent}>
                  <TouchableOpacity 
                    style={styles.upgradeButton}
                    onPress={() => handleQuickAction('upgrade')}
                  >
                    <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Ad Banner for Free Tier - Main Dashboard bottom placement */}
        {showBanner && (
          <View style={styles.section}>
            <AdBanner 
              placement={PLACEMENT_KEYS.BANNER_PARENT_DASHBOARD}
              style={{ marginBottom: 16 }}
              showFallback={true}
            />
          </View>
        )}

        {/* Additional spacing for bottom navigation */}
        <View style={{ height: 20 }} />

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
