/**
 * Teacher Dashboard - Complete Teaching Interface
 *
 * Features:
 * - Class overview and student management
 * - Lesson planning and AI tools
 * - Assignment and homework management
 * - Student progress tracking
 * - Communication with parents
 * - Teaching resources and activities
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
  Linking,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useAds } from "@/contexts/AdsContext";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/contexts/ThemeContext";
import { useTeacherDashboard } from "@/hooks/useDashboardData";
import { router } from "expo-router";
import { track } from "@/lib/analytics";
import { getFeatureFlagsSync } from "@/lib/featureFlags";
import {
  EmptyClassesState,
  EmptyAssignmentsState,
  EmptyEventsState,
} from "@/components/ui/EmptyState";
import { CacheIndicator } from "@/components/ui/CacheIndicator";
import { assertSupabase } from "@/lib/supabase";
import { createCheckout } from "@/lib/payments";
import { RoleBasedHeader } from "../RoleBasedHeader";
import { useWhatsAppConnection } from "@/hooks/useWhatsAppConnection";
import WhatsAppOptInModal from "@/components/whatsapp/WhatsAppOptInModal";
import AdBannerWithUpgrade from "@/components/ui/AdBannerWithUpgrade";
import { useTeacherHasSeat } from "@/lib/hooks/useSeatLimits";
import { useDashboardPreferences } from '@/contexts/DashboardPreferencesContext';
import { DashFloatingButton } from '@/components/ai/DashFloatingButton';
import Feedback from '@/lib/feedback';

const { width, height } = Dimensions.get("window");
const isSmallScreen = width < 380;
const isTablet = width > 768;
const cardWidth = (width - 48) / 2;

// Dynamic scaling functions
const getScaledSize = (baseSize: number) => {
  if (isTablet) return baseSize * 1.2;
  if (isSmallScreen) return baseSize * 0.85;
  return baseSize;
};

const getResponsivePadding = (basePadding: number) => {
  if (isTablet) return basePadding * 1.5;
  if (isSmallScreen) return basePadding * 0.8;
  return basePadding;
};

interface ClassInfo {
  id: string;
  name: string;
  studentCount: number;
  grade: string;
  room: string;
  nextLesson: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  submitted: number;
  total: number;
  status: "pending" | "graded" | "overdue";
}

interface TeacherMetric {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: string;
  color: string;
}

export const TeacherDashboard: React.FC = () => {
  const flags = getFeatureFlagsSync();
  // Default to AI enabled unless explicitly disabled by env
  const AI_ENABLED =
    (process.env.EXPO_PUBLIC_AI_ENABLED !== "false") &&
    (process.env.EXPO_PUBLIC_ENABLE_AI_FEATURES !== "false");
  const { user, profile, refreshProfile } = useAuth();
  const { ready: subscriptionReady, tier } = useSubscription();
  const hasPremiumOrHigher = ['premium','pro','enterprise'].includes(String(tier || '')) as boolean;
  const { maybeShowInterstitial, offerRewarded } = useAds();
  const { preferences, setLayout } = useDashboardPreferences();
  
  // Ad gating logic
  const showAds = subscriptionReady && tier === 'free';
  
  // Temporary AI tool unlocks via rewarded ads (ephemeral)
  const [aiTempUnlocks, setAiTempUnlocks] = React.useState<Record<string, number>>({});

  // Seat and plan status must be computed before capability gating
  const seatStatus = profile?.seat_status || "inactive";
  const teacherHasSeat = useTeacherHasSeat(user?.id || "");
  const hasActiveSeat = teacherHasSeat || profile?.hasActiveSeat?.() || seatStatus === "active";
  const planTier = (profile as any)?.organization_membership?.plan_tier || (profile as any)?.plan_tier || 'unknown';

  // Capability-driven AI gating (seat + plan tier via capabilities)
  const aiLessonCap = !!profile?.hasCapability?.("ai_lesson_generation" as any);
  const aiGradingCap = !!profile?.hasCapability?.(
    "ai_grading_assistance" as any,
  );
  const aiHelperCap = !!profile?.hasCapability?.("ai_homework_helper" as any);

  // Fallback: if teacher has an active seat, enable core AI tools even if plan tier is unknown
  const aiLessonEnabled =
    (aiLessonCap || hasActiveSeat) && AI_ENABLED && flags.ai_lesson_generation !== false;
  const aiGradingEnabled =
    (aiGradingCap || hasActiveSeat) && AI_ENABLED && flags.ai_grading_assistance !== false;
  const aiHelperEnabled =
    (aiHelperCap || hasActiveSeat) && AI_ENABLED && flags.ai_homework_help !== false;
  const { t } = useTranslation();
  const { theme, isDark, toggleTheme } = useTheme();
  const styles = getStyles(theme, isDark);

  // Teacher info for header
  const teacherName = profile?.first_name
    ? profile.first_name
    : user?.user_metadata?.first_name
      ? user.user_metadata.first_name
      : profile?.email?.split("@")[0] || "Teacher";
  const schoolName = profile?.organization_name || "School";

  // Dev console debug for capabilities / seat / tier
  React.useEffect(() => {
    const show = true; // Force enable debug for troubleshooting
    if (!show) return;
    try {
      // Avoid noisy logs by summarizing
      const caps = Array.isArray((profile as any)?.capabilities) ? (profile as any).capabilities : [];
      console.log('[TeacherDashboard debug]', {
        user_id: user?.id,
        seat_status: seatStatus,
        teacherHasSeat_hook: teacherHasSeat,
        profile_hasActiveSeat: profile?.hasActiveSeat?.(),
        combined_hasActiveSeat: hasActiveSeat,
        plan_tier: planTier,
        ai_caps: {
          ai_lesson_generation: !!caps.includes?.('ai_lesson_generation'),
          ai_grading_assistance: !!caps.includes?.('ai_grading_assistance'),
          ai_homework_helper: !!caps.includes?.('ai_homework_helper'),
        },
        all_caps_count: caps?.length || 0,
      });
    } catch {}
  }, [user?.id, seatStatus, teacherHasSeat, hasActiveSeat, planTier, (profile as any)?.capabilities]);

  // Use the custom data hook
  const {
    data: dashboardData,
    loading: isLoading,
    error,
    refresh,
    isLoadingFromCache,
  } = useTeacherDashboard();

  // Capability gating (teacher features depend on active seat)
  const hasCap = React.useCallback(
    (cap: string) => {
      // If seat is active, enable all basic teacher capabilities
      if (hasActiveSeat) {
        const basicTeacherCaps = [
          "manage_classes",
          "create_assignments",
          "grade_assignments",
          "view_class_analytics",
          "communicate_with_parents",
        ];
        if (basicTeacherCaps.includes(cap)) return true;
      }
      // Otherwise check the profile capabilities
      return !!profile?.hasCapability && profile.hasCapability(cap as any);
    },
    [profile, hasActiveSeat],
  );
  // const canManageClasses = hasCap('manage_classes');
  const canCreateAssignments = hasCap("create_assignments");
  const canGradeAssignments = hasCap("grade_assignments");
  const canViewAnalytics = hasCap("view_class_analytics");
  // const canMessageParents = hasCap('communicate_with_parents');

  // Non-intrusive upgrade nudge (shown ~33% of the time if plan doesn't allow AI)
  const [showUpgradeNudge, setShowUpgradeNudge] = React.useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = React.useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = React.useState(false);
  const [upgrading, setUpgrading] = React.useState(false);
  
  // WhatsApp integration
  const { connectionStatus, isWhatsAppEnabled } = useWhatsAppConnection();
  const [showWhatsAppModal, setShowWhatsAppModal] = React.useState(false);
  React.useEffect(() => {
    const isTeacher = String(profile?.role || "")
      .toLowerCase()
      .includes("teacher");
    const hasSchoolSeats = !!profile?.organization_membership || hasActiveSeat;
    const hasAnyAICap = aiLessonCap || aiGradingCap;

    // Teachers on school-owned subscriptions shouldn't see a self-upgrade nudge
    if (isTeacher && hasSchoolSeats) {
      setShowUpgradeNudge(false);
      return;
    }

    if (!hasAnyAICap) {
      setShowUpgradeNudge(Math.random() < 0.33);
    } else {
      setShowUpgradeNudge(false);
    }
  }, [
    aiLessonCap,
    aiGradingCap,
    profile?.role,
    hasActiveSeat,
    profile?.organization_membership,
  ]);

  // Admin org usage summary (for principals/admins)
  const [orgLimits, setOrgLimits] = React.useState<null | {
    used: {
      lesson_generation: number;
      grading_assistance: number;
      homework_help: number;
    };
    quotas: {
      lesson_generation: number;
      grading_assistance: number;
      homework_help: number;
    };
  }>(null);
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (user?.role === "principal_admin") {
          const { data: userRes } = await assertSupabase().auth.getUser();
          const uid = userRes?.user?.id;
          // Fetch profile to get org id
          if (uid) {
            const { data: prof } = await assertSupabase()
              .from("profiles")
              .select("preschool_id")
              .eq("id", uid)
              .maybeSingle();
            const orgId = (prof as any)?.preschool_id;
            if (orgId) {
              const { data: limitsRes } =
                await assertSupabase().functions.invoke("ai-usage", {
                  body: { action: "org_limits", organization_id: orgId } as any,
                });
              if (
                mounted &&
                limitsRes &&
                (limitsRes.used || limitsRes.quotas)
              ) {
                setOrgLimits({
                  used: {
                    lesson_generation: Number(
                      limitsRes.used?.lesson_generation || 0,
                    ),
                    grading_assistance: Number(
                      limitsRes.used?.grading_assistance || 0,
                    ),
                    homework_help: Number(limitsRes.used?.homework_help || 0),
                  },
                  quotas: {
                    lesson_generation: Number(
                      limitsRes.quotas?.lesson_generation || 0,
                    ),
                    grading_assistance: Number(
                      limitsRes.quotas?.grading_assistance || 0,
                    ),
                    homework_help: Number(limitsRes.quotas?.homework_help || 0),
                  },
                });
              }
            }
          }
        }
      } catch {
        /* noop */
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const metrics: TeacherMetric[] = dashboardData
    ? [
        {
          title: t("metrics.my_students"),
          value: dashboardData.totalStudents,
          subtitle: t("metrics.across_classes", {
            count: dashboardData.totalClasses,
          }),
          icon: "people-outline",
          color: "#4F46E5",
        },
        {
          title: t("metrics.pending_grading"),
          value: dashboardData.pendingGrading,
          subtitle: t("metrics.assignments_to_review"),
          icon: "document-text-outline",
          color: "#DC2626",
        },
        {
          title: t("metrics.lessons_today"),
          value: dashboardData.upcomingLessons,
          subtitle: t("metrics.scheduled_classes"),
          icon: "book-outline",
          color: "#059669",
        },
      ]
    : [];

  // const openRequestFeatureEmail = (subject: string, body?: string) => {
  //   const to = process.env.EXPO_PUBLIC_SUPPORT_EMAIL || process.env.EXPO_PUBLIC_SALES_EMAIL || 'support@example.com';
  //   const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body || '')}`;
  //   try { Linking.openURL(mailto); } catch { /* noop */ }
  // };

  const aiTools = [
    {
      id: "lesson-generator",
      title: "AI Lesson Generator",
      subtitle: "Create engaging lessons with AI",
      icon: "bulb",
      color: "#4F46E5",
      onPress: () => {
        if (!hasActiveSeat && (!aiLessonEnabled || !canCreateAssignments)) {
          Alert.alert(
            t("dashboard.ai_upgrade_required_title", {
              defaultValue: "Upgrade Required",
            }),
            t("dashboard.ai_upgrade_required_message", {
              defaultValue:
                "Your plan does not include this AI feature or your seat is not active.",
            }),
          );
          return;
        }
        if (hasActiveSeat && !aiLessonEnabled) {
          Alert.alert(
            "AI Feature Disabled",
            "AI Lesson Generator is not enabled in this build.",
          );
          return;
        }
        track("edudash.ai.lesson_generator_opened");
        router.push("/screens/ai-lesson-generator");
      },
    },
    {
      id: "homework-grader",
      title: "Grade Homework",
      subtitle: "Auto-grade assignments with AI",
      icon: "checkmark-circle",
      color: "#059669",
      onPress: () => {
        if (!hasActiveSeat && (!aiGradingEnabled || !canGradeAssignments)) {
          Alert.alert(
            t("dashboard.ai_upgrade_required_title", {
              defaultValue: "Upgrade Required",
            }),
            t("dashboard.ai_upgrade_required_message", {
              defaultValue:
                "Your plan does not include this AI feature or your seat is not active.",
            }),
          );
          return;
        }
        if (hasActiveSeat && !aiGradingEnabled) {
          Alert.alert(
            "AI Feature Disabled",
            "AI Homework Grader is not enabled in this build.",
          );
          return;
        }
        track("edudash.ai.homework_grader_opened");
        router.push("/screens/ai-homework-grader-live");
      },
    },
    {
      id: "homework-helper",
      title: "Homework Helper",
      subtitle: "Child-safe, step-by-step guidance",
      icon: "help-circle",
      color: "#2563EB",
      onPress: () => {
        if (!aiHelperEnabled) {
          Alert.alert(
            "AI Tool Disabled",
            "AI Homework Helper is not enabled for this build.",
          );
          return;
        }
        track("edudash.ai.homework_helper_opened");
        router.push("/screens/ai-homework-helper");
      },
    },
    {
      id: "progress-analysis",
      title: "Progress Analysis",
      subtitle: "AI-powered student insights",
      icon: "analytics",
      color: "#7C3AED",
      onPress: () => {
        if (!hasActiveSeat && !canViewAnalytics) {
          Alert.alert(
            "Unavailable",
            "Your seat does not permit access to analytics yet.",
          );
          return;
        }
        // Navigate to AI Progress Analysis screen
        track("edudash.ai.progress_analysis_opened");
        router.push("/screens/ai-progress-analysis");
      },
    },
  ];

  // Quick actions are filtered by capabilities
  const quickActions = [
    {
      id: "take-attendance",
      title: "Take Attendance",
      icon: "checkmark-done",
      color: "#059669",
      onPress: () => {
        router.push("/screens/attendance");
      },
      requiredCap: "manage_classes",
    },
    {
      id: "lessons-hub",
      title: "Lessons Hub",
      icon: "library-outline",
      color: "#4F46E5",
      onPress: async () => {
        await maybeShowInterstitial('teacher_dashboard_lessons_hub');
        router.push("/screens/lessons-hub");
      },
      requiredCap: "create_assignments",
    },
    {
      id: "saved-lessons",
      title: "Saved Lessons",
      icon: "library",
      color: "#EC4899",
      onPress: async () => {
        await maybeShowInterstitial('teacher_dashboard_saved_lessons');
        router.push("/screens/lessons-hub");
      },
      requiredCap: "create_assignments",
    },
    {
      id: "message-parents",
      title: "Message Parents",
      icon: "chatbubbles",
      color: "#7C3AED",
      onPress: async () => {
        await maybeShowInterstitial('teacher_dashboard_message_parents');
        router.push("/screens/teacher-messages");
      },
      requiredCap: "communicate_with_parents",
    },
    {
      id: "view-reports",
      title: "View Reports",
      icon: "document-text",
      color: "#DC2626",
      onPress: async () => {
        await maybeShowInterstitial('teacher_dashboard_view_reports');
        router.push("/screens/teacher-reports");
      },
      requiredCap: "view_class_analytics",
    },
    {
      id: "whatsapp-connect",
      title: connectionStatus.isConnected ? "WhatsApp Connected" : "Connect WhatsApp",
      icon: "logo-whatsapp",
      color: "#25D366",
      onPress: () => {
        track('edudash.whatsapp.quick_action_pressed', {
          connected: connectionStatus.isConnected,
          timestamp: new Date().toISOString()
        });
        setShowWhatsAppModal(true);
      },
      // Show only if WhatsApp integration is enabled
      show: isWhatsAppEnabled(),
    },
  ].filter((action: any) => (!action.requiredCap || hasCap(action.requiredCap)) && (action.show !== false));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t("dashboard.good_morning");
    if (hour < 17) return t("dashboard.good_afternoon");
    return t("dashboard.good_evening");
  };

  const renderMetricCard = (metric: TeacherMetric) => (
    <View
      key={metric.title}
      style={[styles.metricCard, { borderLeftColor: metric.color }]}
    >
      <View style={styles.metricHeader}>
        <Ionicons name={metric.icon as any} size={24} color={metric.color} />
        <Text style={styles.metricValue}>{metric.value}</Text>
      </View>
      <Text style={styles.metricTitle}>{metric.title}</Text>
      {metric.subtitle && (
        <Text style={styles.metricSubtitle}>{metric.subtitle}</Text>
      )}
    </View>
  );

  const renderClassCard = (classInfo: ClassInfo) => (
    <TouchableOpacity
      key={classInfo.id}
      style={styles.classCard}
      onPress={() => {
        // Navigate to class details with class ID
        router.push(
          `/screens/class-details?classId=${classInfo.id}&className=${encodeURIComponent(classInfo.name)}`,
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open options for ${classInfo.name}`}
    >
      <View style={styles.classHeader}>
        <View>
          <Text style={styles.className}>{classInfo.name}</Text>
          <Text style={styles.classDetails}>
            {classInfo.grade} • {classInfo.room}
          </Text>
        </View>
        <View style={styles.studentCount}>
          <Ionicons name="people" size={16} color={theme.textSecondary} />
          <Text style={styles.studentCountText}>{classInfo.studentCount}</Text>
        </View>
      </View>
      <View style={styles.nextLesson}>
        <Ionicons name="time-outline" size={16} color={theme.primary} />
        <Text style={styles.nextLessonText}>{classInfo.nextLesson}</Text>
      </View>
      {(classInfo as any).presentToday !== undefined && (
        <View style={styles.attendanceInfo}>
          <View style={styles.attendanceBadge}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" />
            <Text style={styles.attendanceText}>
              {(classInfo as any).presentToday}/{classInfo.studentCount} present
              today
            </Text>
          </View>
          {(classInfo as any).attendanceRate !== undefined && (
            <Text style={styles.attendanceRate}>
              {(classInfo as any).attendanceRate}% attendance
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  const renderAssignmentCard = (assignment: Assignment) => (
    <TouchableOpacity
      key={assignment.id}
      style={styles.assignmentCard}
      onPress={() => {
        // Navigate to assignment details with assignment ID
        router.push(
          `/screens/assignment-details?assignmentId=${assignment.id}&title=${encodeURIComponent(assignment.title)}`,
        );
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open options for ${assignment.title}`}
    >
      <View style={styles.assignmentHeader}>
        <Text style={styles.assignmentTitle}>{assignment.title}</Text>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                assignment.status === "graded"
                  ? "#059669"
                  : assignment.status === "overdue"
                    ? "#DC2626"
                    : "#EA580C",
            },
          ]}
        >
          <Text style={styles.statusText}>
            {assignment.status === "graded"
              ? "Graded"
              : assignment.status === "overdue"
                ? "Overdue"
                : "Pending"}
          </Text>
        </View>
      </View>
      <Text style={styles.assignmentDue}>Due: {assignment.dueDate}</Text>
      <View style={styles.assignmentProgress}>
        <Text style={styles.progressText}>
          {assignment.submitted}/{assignment.total} submitted
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(assignment.submitted / assignment.total) * 100}%` },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderAIToolCard = (tool: (typeof aiTools)[0]) => {
    // If seat is active, enable all tools (subject to AI feature flags)
    const enabled = hasActiveSeat
      ? tool.id === "lesson-generator"
        ? aiLessonEnabled
        : tool.id === "homework-grader"
          ? aiGradingEnabled
          : tool.id === "homework-helper"
            ? aiHelperEnabled
            : tool.id === "progress-analysis"
              ? true // Analytics doesn't require external AI
              : true
      : tool.id === "lesson-generator"
        ? aiLessonEnabled && canCreateAssignments
        : tool.id === "homework-grader"
          ? aiGradingEnabled && canGradeAssignments
          : tool.id === "homework-helper"
            ? aiHelperEnabled
            : tool.id === "progress-analysis"
              ? (canViewAnalytics && hasPremiumOrHigher)
              : true;
              
    // Check if tool has temporary unlock from rewarded ad
    const hasTemporaryUnlock = aiTempUnlocks[tool.id] > 0;
    const isActuallyEnabled = enabled || hasTemporaryUnlock;

    const handlePress = async () => {
      if (hasTemporaryUnlock) {
        // Consume one temporary unlock
        setAiTempUnlocks(prev => ({
          ...prev,
          [tool.id]: Math.max(0, prev[tool.id] - 1)
        }));
      }
      tool.onPress();
    };

    return (
      <TouchableOpacity
        key={tool.id}
        style={[
          styles.aiToolCard,
          { backgroundColor: tool.color + "10", opacity: isActuallyEnabled ? 1 : 0.5 },
        ]}
        onPress={handlePress}
        disabled={!isActuallyEnabled}
        accessibilityRole="button"
        accessibilityLabel={tool.title}
      >
        <View style={[styles.aiToolIcon, { backgroundColor: tool.color }]}>
          <Ionicons name={tool.icon as any} size={24} color="white" />
        </View>
        <View style={styles.aiToolContent}>
          <Text style={styles.aiToolTitle}>{tool.title}</Text>
          <Text style={styles.aiToolSubtitle}>{tool.subtitle}</Text>
          {!enabled && hasTemporaryUnlock && (
            <Text style={{ color: "#10B981", marginTop: 4, fontWeight: '600' }}>
              {aiTempUnlocks[tool.id]} trial use{aiTempUnlocks[tool.id] !== 1 ? 's' : ''} remaining
            </Text>
          )}
          {!enabled && !hasTemporaryUnlock && tool.id !== 'progress-analysis' && (
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
              {t("dashboard.ai_upgrade_required_cta", {
                defaultValue: "Upgrade to use",
              })}
            </Text>
          )}
          {!enabled && tool.id === 'progress-analysis' && (
            <TouchableOpacity
              style={{ marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#7C3AED', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 }}
              onPress={(e) => {
                e.stopPropagation();
                router.push('/screens/subscription-upgrade-post?reason=ai_progress');
              }}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 12 }}>Upgrade</Text>
            </TouchableOpacity>
          )}
          {/* Rewarded ad offer for disabled premium AI tools */}
          {!enabled && !hasTemporaryUnlock && showAds && ['lesson-generator', 'homework-grader'].includes(tool.id) && (
            <TouchableOpacity
              style={{ marginTop: 6, paddingVertical: 4 }}
              onPress={async (e) => {
                e.stopPropagation();
                const { shown, rewarded } = await offerRewarded(`ai_tool_${tool.id}`);
                if (rewarded) {
                  setAiTempUnlocks(prev => ({ ...prev, [tool.id]: 1 }));
                  Alert.alert('Unlocked!', 'You can try this AI tool once for free.');
                }
              }}
            >
              <Text style={{ color: theme.primary, fontWeight: '600', fontSize: 12 }}>
                📺 Watch ad to try once
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={theme.textSecondary}
        />
      </TouchableOpacity>
    );
  };

  const renderQuickAction = (action: (typeof quickActions)[0]) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionButton, { backgroundColor: action.color }]}
      onPress={action.onPress}
    >
      <Ionicons name={action.icon as any} size={24} color="white" />
      <Text style={styles.quickActionText}>{action.title}</Text>
    </TouchableOpacity>
  );

  const seatPendingBanner = (
    <View
      style={{
        backgroundColor: "#FEF3C7",
        borderColor: "#FCD34D",
        borderWidth: 1,
        padding: 10,
        borderRadius: 10,
        marginBottom: 12,
      }}
    >
      <Text style={{ color: "#92400E", fontWeight: "700" }}>
        {seatStatus === "pending"
          ? "Access Restricted - Seat Pending"
          : "Access Restricted - No Active Seat"}
      </Text>
      <Text style={{ color: "#92400E" }}>
        {seatStatus === "pending"
          ? "Your teacher seat is pending approval. Ask your administrator to assign a seat."
          : "Your teacher account needs an active seat to access all features. Request a seat from your administrator."}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <TouchableOpacity
          style={{
            backgroundColor: "#FDE68A",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
          onPress={() => router.push("/screens/account")}
        >
          <Text style={{ color: "#92400E", fontWeight: "700" }}>Account</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: "#FDE68A",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
          onPress={() => refresh()}
        >
          <Text style={{ color: "#92400E", fontWeight: "700" }}>Refresh</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            backgroundColor: "#FDE68A",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 8,
          }}
          onPress={async () => {
            try {
              const { data: userRes } = await assertSupabase().auth.getUser();
              const uid = userRes?.user?.id;
              if (!uid) return;
              const { data: prof } = await assertSupabase()
                .from("profiles")
                .select("preschool_id,email,organization_id")
                .eq("id", uid)
                .maybeSingle();
              const orgId =
                (prof as any)?.preschool_id || (prof as any)?.organization_id;
              const email = (prof as any)?.email || user?.email;
              if (orgId) {
                const { notifySeatRequestCreated } = await import(
                  "@/lib/notify"
                );
                await notifySeatRequestCreated(orgId, email);
                Alert.alert(
                  "Request Sent",
                  "Your administrator has been notified.",
                );
              } else {
                Alert.alert("Unavailable", "Could not determine your school.");
              }
            } catch (e: any) {
              Alert.alert("Failed", e?.message || "Could not send request");
            }
          }}
        >
          <Text style={{ color: "#92400E", fontWeight: "700" }}>
            Request Seat
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Seat pending banner display: use profile from AuthContext
  const showSeatPending =
    profile?.role &&
    String(profile.role).toLowerCase().includes("teacher") &&
    (profile?.seat_status === "pending" || !hasActiveSeat);

  // Live updates for seat status: subscribe to profile updates for current user
  React.useEffect(() => {
    let channelProfile: any;
    let channelSeats: any;
    (async () => {
      try {
        const id = user?.id;
        if (!id) return;
        const client = assertSupabase();
        // Profile updates
        channelProfile = client
          .channel("seat-status-profile")
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "profiles",
              filter: `id=eq.${id}`,
            },
            async () => {
              try {
                await refreshProfile();
                await refresh();
              } catch (err) {
                console.warn("Failed to refresh profile:", err);
              }
            },
          )
          .subscribe();
        // Teacher seats assignment updates (seat assigned/revoked)
        channelSeats = client
          .channel("seat-status-teacher-seats")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "subscription_seats",
              filter: `user_id=eq.${id}`,
            },
            async () => {
              try {
                await refreshProfile();
                await refresh();
              } catch (err) {
                console.warn("Failed to refresh after seat change:", err);
              }
            },
          )
          .subscribe();
      } catch (err) {
        console.warn("Failed to set up subscriptions:", err);
      }
    })();
    return () => {
      try { channelProfile?.unsubscribe?.(); } catch (err) { console.warn("Failed to unsubscribe profile:", err); }
      try { channelSeats?.unsubscribe?.(); } catch (err) { console.warn("Failed to unsubscribe seats:", err); }
    };
  }, [user?.id, refreshProfile, refresh]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingSkeleton}>
          <View style={styles.skeletonHeader} />
          <View style={styles.skeletonMetrics}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonMetric} />
            ))}
          </View>
          <View style={styles.skeletonSection} />
        </View>
      </View>
    );
  }

  if (error && !dashboardData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="warning-outline"
          size={48}
          color={theme.error || "#DC2626"}
        />
        <Text style={styles.errorTitle}>{t("dashboard.error_title")}</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>
            {t("dashboard.retry_button")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={styles.headerWithToggle}>
        <TouchableOpacity
          style={styles.dashboardToggleInHeader}
          onPress={() => {
            const newLayout = preferences.layout === 'classic' ? 'enhanced' : 'classic';
            setLayout(newLayout);
            try { Feedback.vibrate(15); } catch {}
          }}
          accessibilityLabel={`Switch to ${preferences.layout === 'classic' ? 'enhanced' : 'classic'} layout`}
          accessibilityHint="Toggles between classic and enhanced dashboard layouts"
        >
          <Ionicons 
            name={preferences.layout === 'enhanced' ? 'grid-outline' : 'apps-outline'} 
            size={16} 
            color={theme.primary} 
          />
        </TouchableOpacity>
      </View>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        {/* Teacher Greeting Header */}
        <View style={styles.header}>
          <View style={styles.headerCard}>
            <View style={styles.headerContent}>
              <View style={{ flex: 1 }}>
                <View style={styles.headerTitleRow}>
                  <Ionicons
                    name="school"
                    size={20}
                    color={theme.primary}
                    style={{ marginRight: 6 }}
                  />
                <Text style={styles.greeting}>
                  {getGreeting()}, {teacherName}! 👩‍🏫
                </Text>
              </View>
              <View style={styles.subRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>
                      {profile?.role === "teacher"
                        ? "Teacher"
                        : "Teacher"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        backgroundColor: hasActiveSeat
                          ? "#10B98120"
                          : seatStatus === "pending"
                            ? "#F59E0B20"
                            : "#DC262620",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.roleBadgeText,
                        {
                          color: hasActiveSeat
                            ? "#10B981"
                            : seatStatus === "pending"
                              ? "#F59E0B"
                              : "#DC2626",
                        },
                      ]}
                    >
                      Seat:{" "}
                      {hasActiveSeat
                        ? "Active"
                        : seatStatus === "pending"
                          ? "Pending"
                          : "Inactive"}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.headerActions}>
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
                    size={20} 
                    color={theme.primary} 
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.headerMenuButton}
                  onPress={() => setShowOptionsMenu(true)}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={24}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Seat pending banner */}
        {showSeatPending && (
          <View style={styles.section}>{seatPendingBanner}</View>
        )}

        {/* Cache Status Indicator */}
        <View style={styles.section}>
          <CacheIndicator
            isLoadingFromCache={isLoadingFromCache}
            onRefresh={refresh}
            compact={true}
          />
        </View>

        {/* Dev capability debug chip */}
        {((process.env.EXPO_PUBLIC_SHOW_DEBUG_CAPS === 'true') || (typeof __DEV__ !== 'undefined' && __DEV__)) && (
          <View style={styles.section}>
            <View style={[styles.sectionCard, { padding: 8, backgroundColor: '#0f172a', borderColor: '#1f2937', borderWidth: 1 }]}> 
              <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                Seat: {hasActiveSeat ? 'active' : String(seatStatus)} | Plan: {String(planTier)} | Caps: LG={String(aiLessonCap)} GH={String(aiGradingCap)} HH={String(aiHelperCap)}
              </Text>
            </View>
          </View>
        )}

        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("dashboard.todays_overview")}
          </Text>
          <View style={styles.metricsGrid}>
            {metrics.map(renderMetricCard)}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("dashboard.quick_actions_section")}
          </Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* First Ad Placement: Below Quick Actions */}
        {showAds && (
          <AdBannerWithUpgrade
            screen="teacher_dashboard"
            showUpgradeCTA={true}
            margin={12}
          />
        )}

        {/* AI Tools */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("dashboard.ai_teaching_tools")}
          </Text>
          {(aiLessonEnabled || aiHelperEnabled || aiGradingEnabled) ? (
            <Text
              style={{ color: Colors.light.tabIconDefault, marginBottom: 8 }}
            >
              {t("dashboard.ai_tools_enabled")}
            </Text>
          ) : (
            <Text
              style={{ color: Colors.light.tabIconDefault, marginBottom: 8 }}
            >
              {t("dashboard.ai_tools_disabled")}
            </Text>
          )}
          {/* Info badge: privacy and gating */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={Colors.light.tabIconDefault}
            />
            <Text
              style={{
                color: Colors.light.tabIconDefault,
                marginLeft: 6,
                flex: 1,
              }}
            >
              {t("dashboard.ai_tools_info", {
                defaultValue:
                  "AI runs on a secure server. Access and usage are limited by your plan or trial.",
              })}
            </Text>
          </View>

          {/* Admin Org Usage Summary */}
          {user?.role === "principal_admin" && orgLimits && (
            <View style={styles.orgUsageRow}>
              <Text style={styles.orgUsagePill}>
                Lessons: {orgLimits.used.lesson_generation}/
                {orgLimits.quotas.lesson_generation}
              </Text>
              <Text style={styles.orgUsagePill}>
                Grading: {orgLimits.used.grading_assistance}/
                {orgLimits.quotas.grading_assistance}
              </Text>
              <Text style={styles.orgUsagePill}>
                Helper: {orgLimits.used.homework_help}/
                {orgLimits.quotas.homework_help}
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/screens/admin-ai-allocation")}
              >
                <Text style={styles.orgUsageLink}>Manage</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Occasional upgrade nudge */}
          {!(aiLessonCap || aiGradingCap) && showUpgradeNudge && (
            <View style={styles.upgradeNudge}>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeNudgeText}>
                  {t("dashboard.ai_upgrade_nudge", {
                    defaultValue: "Unlock AI tools with Basic, Premium or Pro.",
                  })}
                </Text>
                <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                  <TouchableOpacity onPress={() => setShowUpgradeModal(true)}>
                    <Text style={styles.upgradeNudgeLink}>
                      {t("dashboard.upgrade_now", {
                        defaultValue: "Upgrade now",
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push("/pricing")}>
                    <Text style={styles.upgradeNudgeLink}>
                      {t("dashboard.see_plans", { defaultValue: "See plans" })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setShowUpgradeNudge(false)}
                accessibilityLabel="Dismiss upgrade message"
              >
                <Ionicons
                  name="close"
                  size={16}
                  color={Colors.light.tabIconDefault}
                />
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.aiToolsContainer}>
            {aiTools.map(renderAIToolCard)}
          </View>
        </View>

        {/* My Classes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("dashboard.my_classes")}</Text>
          <View style={styles.classesContainer}>
            {dashboardData?.myClasses && dashboardData.myClasses.length > 0 ? (
              dashboardData.myClasses.map((classCard, index) => {
                // Insert mid-feed ad after first 2 classes for scrollers
                if (showAds && index === 2 && dashboardData.myClasses.length > 2) {
                  return (
                    <React.Fragment key={`class-${classCard.id}`}>
                      {renderClassCard(classCard)}
                      <AdBannerWithUpgrade
                        screen="teacher_dashboard"
                        showUpgradeCTA={false}
                        margin={8}
                      />
                    </React.Fragment>
                  );
                }
                return renderClassCard(classCard);
              })
            ) : (
              <EmptyClassesState
                onCreateClass={() => {
                  // Navigate to class & teacher management (create class modal inside)
                  router.push("/screens/class-teacher-management");
                }}
              />
            )}
          </View>
        </View>

        {/* Recent Assignments */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t("dashboard.recent_assignments")}
          </Text>
          <View style={styles.assignmentsContainer}>
            {dashboardData?.recentAssignments &&
            dashboardData.recentAssignments.length > 0 ? (
              dashboardData.recentAssignments.map(renderAssignmentCard)
            ) : (
              <EmptyAssignmentsState
                onCreateAssignment={() =>
                  router.push("/screens/assign-homework")
                }
              />
            )}
          </View>
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              {t("dashboard.upcoming_events")}
            </Text>
            {dashboardData?.upcomingEvents &&
            dashboardData.upcomingEvents.length > 0 ? (
              dashboardData.upcomingEvents.map((event) => (
                <View key={event.id} style={styles.eventItem}>
                  <View
                    style={[
                      styles.eventIcon,
                      {
                        backgroundColor:
                          event.type === "meeting"
                            ? "#4F46E5"
                            : event.type === "activity"
                              ? "#059669"
                              : "#DC2626",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        event.type === "meeting"
                          ? "people"
                          : event.type === "activity"
                            ? "color-palette"
                            : "document-text"
                      }
                      size={16}
                      color="white"
                    />
                  </View>
                  <View style={styles.eventContent}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventTime}>{event.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyEventsState
                onCreateEvent={() => {
                  // Navigate to teacher reports as a placeholder for event creation
                  router.push("/screens/teacher-reports");
                }}
              />
            )}
          </View>
        </View>

        {/* Bottom Ad Placement: For long sessions */}
        {showAds && (
          <AdBannerWithUpgrade
            screen="teacher_dashboard"
            showUpgradeCTA={false}
            margin={16}
          />
        )}

        {/* Bottom Padding */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showUpgradeModal}
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUpgradeModal(false)}
        >
          <View style={styles.upgradeModalContent}>
            <Text style={styles.optionsMenuTitle}>Upgrade Plan</Text>
            <Text style={{ color: theme.textSecondary, marginBottom: 12 }}>
              Choose a plan to unlock AI tools:
            </Text>
            <TouchableOpacity
              style={[
                styles.optionItem,
                { borderColor: "#e5e7eb", borderWidth: 1 },
              ]}
              disabled={upgrading}
              onPress={async () => {
                try {
                  setUpgrading(true);
                  const { data: userRes } =
                    await assertSupabase().auth.getUser();
                  const uid = userRes?.user?.id;
                  const res = await createCheckout({
                    scope: "user",
                    userId: uid || undefined,
                    planTier: "basic",
                    billing: "monthly",
                    seats: 1,
                  });
                  if (res?.redirect_url) {
                    try {
                      await Linking.openURL(res.redirect_url);
                    } catch (err) {
                      console.warn("Failed to open URL:", err);
                    }
                  }
                  setShowUpgradeModal(false);
                } catch (e: any) {
                  Alert.alert(
                    "Upgrade failed",
                    e?.message || "Please try again",
                  );
                } finally {
                  setUpgrading(false);
                }
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="sparkles" size={24} color="#4F46E5" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Basic</Text>
                  <Text style={styles.optionSubtitle}>
                    Great value, core AI tools
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionItem,
                { borderColor: "#e5e7eb", borderWidth: 1 },
              ]}
              disabled={upgrading}
              onPress={async () => {
                try {
                  setUpgrading(true);
                  const { data: userRes } =
                    await assertSupabase().auth.getUser();
                  const uid = userRes?.user?.id;
                  const res = await createCheckout({
                    scope: "user",
                    userId: uid || undefined,
                    planTier: "pro",
                    billing: "monthly",
                    seats: 1,
                  });
                  if (res?.redirect_url) {
                    try {
                      await Linking.openURL(res.redirect_url);
                    } catch (err) {
                      console.warn("Failed to open URL:", err);
                    }
                  }
                  setShowUpgradeModal(false);
                } catch (e: any) {
                  Alert.alert(
                    "Upgrade failed",
                    e?.message || "Please try again",
                  );
                } finally {
                  setUpgrading(false);
                }
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="rocket" size={24} color="#10B981" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Pro</Text>
                  <Text style={styles.optionSubtitle}>
                    Full AI suite for teachers
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
                router.push("/screens/account");
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="person-outline" size={24} color="#4F46E5" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>My Profile</Text>
                  <Text style={styles.optionSubtitle}>
                    Account settings, profile picture & biometrics
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push("/screens/teacher-reports");
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons name="analytics-outline" size={24} color="#059669" />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>My Reports</Text>
                  <Text style={styles.optionSubtitle}>
                    View student progress & class analytics
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => {
                setShowOptionsMenu(false);
                router.push("/screens/teacher-messages");
              }}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={24}
                  color="#7C3AED"
                />
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>Messages</Text>
                  <Text style={styles.optionSubtitle}>
                    Communicate with parents & administration
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WhatsApp Modal */}
      <WhatsAppOptInModal
        visible={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onSuccess={() => {
          setShowWhatsAppModal(false);
          Alert.alert('WhatsApp Connected!', 'You can now receive school updates via WhatsApp.');
        }}
      />

      {/* Dash AI Floating Button */}
      <DashFloatingButton
        position="bottom-right"
        onPress={() => router.push('/screens/dash-assistant')}
      />
    </>
  );
};

const getStyles = (theme: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: theme.background,
    },
    loadingText: {
      fontSize: 16,
      color: theme.textSecondary,
    },
    header: {
      backgroundColor: "transparent",
      padding: 16,
    },
    headerCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: getResponsivePadding(16),
      padding: getResponsivePadding(20),
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
    },
    headerTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    subRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    roleBadge: {
      marginLeft: 8,
      backgroundColor: theme.primary + "10",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
    },
    roleBadgeText: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: "600",
      textTransform: "capitalize",
    },
    greeting: {
      fontSize: getScaledSize(16),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 4,
    },
    schoolName: {
      fontSize: getScaledSize(16),
      color: theme.textSecondary,
      fontWeight: "500",
    },
    section: {
      padding: getResponsivePadding(16),
    },
    sectionTitle: {
      fontSize: getScaledSize(18),
      fontWeight: "bold",
      color: theme.text,
      marginBottom: getResponsivePadding(16),
    },
    sectionCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 20,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    metricsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    metricCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: getResponsivePadding(12),
      padding: getResponsivePadding(16),
      width: cardWidth,
      borderLeftWidth: 4,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    metricHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    metricValue: {
      fontSize: getScaledSize(24),
      fontWeight: "bold",
      color: theme.text,
    },
    metricTitle: {
      fontSize: getScaledSize(14),
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    metricSubtitle: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    quickActionsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    quickActionButton: {
      width: cardWidth,
      padding: getResponsivePadding(16),
      borderRadius: getResponsivePadding(12),
      alignItems: "center",
      justifyContent: "center",
      minHeight: getScaledSize(80),
    },
    quickActionText: {
      color: theme.onPrimary || "white",
      fontSize: getScaledSize(14),
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
    },
    aiToolsContainer: {
      gap: 12,
    },
    orgUsageRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    orgUsagePill: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      color: theme.text,
      fontSize: 12,
      fontWeight: "600",
    },
    orgUsageLink: {
      color: theme.primary,
      fontWeight: "700",
      fontSize: 12,
    },
    upgradeNudge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 12,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.border,
      backgroundColor: theme.cardBackground,
      marginBottom: 8,
    },
    upgradeNudgeText: {
      color: theme.text,
      fontSize: 13,
      fontWeight: "600",
    },
    upgradeNudgeLink: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 4,
    },
    aiToolCard: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      backgroundColor: theme.cardBackground,
    },
    aiToolIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    aiToolContent: {
      flex: 1,
    },
    aiToolTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    aiToolSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    classesContainer: {
      gap: 12,
    },
    classCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    classHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    className: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.text,
      marginBottom: 2,
    },
    classDetails: {
      fontSize: 14,
      color: theme.textSecondary,
    },
    studentCount: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: isDark ? theme.border + "40" : "#f1f5f9",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    studentCountText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.textSecondary,
      marginLeft: 4,
    },
    nextLesson: {
      flexDirection: "row",
      alignItems: "center",
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? theme.border : "#f1f5f9",
    },
    nextLessonText: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.primary,
      marginLeft: 8,
    },
    attendanceInfo: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: isDark ? theme.border : "#f1f5f9",
    },
    attendanceBadge: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 4,
    },
    attendanceText: {
      fontSize: 12,
      fontWeight: "500",
      color: "#059669",
      marginLeft: 4,
    },
    attendanceRate: {
      fontSize: 11,
      color: theme.textSecondary,
      fontWeight: "500",
    },
    assignmentsContainer: {
      gap: 12,
    },
    assignmentCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    assignmentHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    assignmentTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginRight: 12,
    },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
    },
    statusText: {
      fontSize: 12,
      fontWeight: "600",
      color: "white",
    },
    assignmentDue: {
      fontSize: 14,
      color: theme.textSecondary,
      marginBottom: 8,
    },
    assignmentProgress: {
      gap: 4,
    },
    progressText: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    progressBar: {
      height: 4,
      backgroundColor: isDark ? theme.border + "40" : "#f1f5f9",
      borderRadius: 2,
    },
    progressFill: {
      height: "100%",
      backgroundColor: theme.primary,
      borderRadius: 2,
    },
    eventItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? theme.border : "#f1f5f9",
    },
    eventIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    eventContent: {
      flex: 1,
    },
    eventTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    eventTime: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: theme.background,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 24,
      paddingVertical: 20,
      paddingTop: 60,
      backgroundColor: theme.cardBackground,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.text,
    },
    modalCloseButton: {
      padding: 8,
      backgroundColor: theme.background,
      borderRadius: 8,
    },
    modalContent: {
      flex: 1,
    },
    // Loading skeleton styles
    loadingSkeleton: {
      padding: 16,
    },
    skeletonHeader: {
      height: 100,
      backgroundColor: isDark ? theme.border : "#E5E7EB",
      borderRadius: 16,
      marginBottom: 16,
    },
    skeletonMetrics: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      marginBottom: 16,
    },
    skeletonMetric: {
      width: cardWidth,
      height: 80,
      backgroundColor: isDark ? theme.border : "#E5E7EB",
      borderRadius: 12,
    },
    skeletonSection: {
      height: 200,
      backgroundColor: isDark ? theme.border : "#E5E7EB",
      borderRadius: 12,
    },
    // Error state styles
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 32,
      backgroundColor: theme.background,
    },
    errorTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: theme.error || "#DC2626",
      marginTop: 16,
      marginBottom: 8,
      textAlign: "center",
    },
    errorText: {
      fontSize: 16,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    retryButton: {
      backgroundColor: theme.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    retryButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    // Modal and Menu Styles
    headerMenuButton: {
      padding: 8,
      borderRadius: 8,
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.1)"
        : "rgba(75, 85, 99, 0.1)",
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    themeToggleButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.surfaceVariant || theme.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    headerWithToggle: {
      position: 'relative',
    },
    dashboardToggleInHeader: {
      position: 'absolute',
      top: 10,
      right: 90, // Adjusted to prevent overlap with header icons
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: theme.primaryLight || theme.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      zIndex: 10,
      shadowColor: theme.shadow || '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
      padding: 16,
    },
    upgradeModalContent: {
      backgroundColor: theme.cardBackground,
      borderRadius: 12,
      padding: 16,
      margin: 24,
      gap: 8,
    },
    optionsMenuContent: {
      backgroundColor: theme.cardBackground,
      borderRadius: 16,
      padding: 20,
      maxHeight: "80%",
    },
    optionsMenuHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
    },
    optionsMenuTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.text,
    },
    optionItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    optionLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    optionText: {
      marginLeft: 12,
      flex: 1,
    },
    optionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.text,
      marginBottom: 2,
    },
    optionSubtitle: {
      fontSize: 14,
      color: theme.textSecondary,
      lineHeight: 20,
    },
  });

export default TeacherDashboard;
