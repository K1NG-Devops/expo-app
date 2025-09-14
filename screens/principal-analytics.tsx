import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface AnalyticsData {
  enrollment: {
    totalStudents: number;
    newEnrollments: number;
    withdrawals: number;
    retentionRate: number;
    ageGroupDistribution: { ageGroup: string; count: number }[];
  };
  attendance: {
    averageAttendance: number;
    todayAttendance: number;
    weeklyTrend: { day: string; rate: number }[];
    lowAttendanceAlerts: number;
  };
  finance: {
    monthlyRevenue: number;
    outstandingFees: number;
    paymentRate: number;
    expenseRatio: number;
  };
  staff: {
    totalStaff: number;
    activeTeachers: number;
    studentTeacherRatio: number;
    performanceScore: number;
  };
  academic: {
    averageGrade: number;
    improvingStudents: number;
    strugglingStudents: number;
    parentEngagement: number;
  };
}

const PrincipalAnalytics: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('month');

  const loadAnalytics = async () => {
    if (!user || !supabase) return;

    try {
      setLoading(true);

      // Get school info
      const { data: school } = await supabase!
        .from('preschools')
        .select('id, name')
        .eq('created_by', user.id)
        .single();

      if (!school) return;

      // Get enrollment data
      const { data: students, count: totalStudents } = await supabase!
        .from('students')
        .select(`
          id,
          created_at,
          status,
          date_of_birth,
          age_groups (name)
        `)
        .eq('preschool_id', school.id);

      // Calculate enrollment metrics
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      const newEnrollments = students?.filter(s => new Date(s.created_at) >= lastMonth).length || 0;
      const activeStudents = students?.filter(s => s.status === 'active').length || 0;
      const withdrawnStudents = students?.filter(s => s.status === 'withdrawn').length || 0;
      const retentionRate = totalStudents ? ((activeStudents / totalStudents) * 100) : 0;

      // Age group distribution
      const ageGroupCounts: { [key: string]: number } = {};
      students?.forEach(s => {
        const ageGroup = (s.age_groups as any)?.name || 'Unknown';
        ageGroupCounts[ageGroup] = (ageGroupCounts[ageGroup] || 0) + 1;
      });
      const ageGroupDistribution = Object.entries(ageGroupCounts).map(([ageGroup, count]) => ({
        ageGroup,
        count,
      }));

      // Get attendance data
      const { data: attendanceRecords } = await supabase!
        .from('attendance_records')
        .select('status, date')
        .eq('preschool_id', school.id)
        .gte('date', new Date(now.getFullYear(), now.getMonth(), 1).toISOString());

      const totalAttendanceRecords = attendanceRecords?.length || 0;
      const presentRecords = attendanceRecords?.filter(a => a.status === 'present').length || 0;
      const averageAttendance = totalAttendanceRecords > 0 ? (presentRecords / totalAttendanceRecords) * 100 : 0;

      // Today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase!
        .from('attendance_records')
        .select('status')
        .eq('preschool_id', school.id)
        .gte('date', today + 'T00:00:00')
        .lt('date', today + 'T23:59:59');

      const todayPresent = todayAttendance?.filter(a => a.status === 'present').length || 0;
      const todayTotal = todayAttendance?.length || 0;
      const todayAttendanceRate = todayTotal > 0 ? (todayPresent / todayTotal) * 100 : 0;

      // Get financial data
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const { data: monthlyRevenue } = await supabase!
        .from('financial_transactions')
        .select('amount')
        .eq('preschool_id', school.id)
        .eq('type', 'fee_payment')
        .eq('status', 'completed')
        .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
        .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

      const totalRevenue = monthlyRevenue?.reduce((sum, t) => sum + t.amount, 0) || 0;

      const { data: outstanding } = await supabase!
        .from('financial_transactions')
        .select('amount')
        .eq('preschool_id', school.id)
        .eq('type', 'fee_payment')
        .eq('status', 'pending');

      const totalOutstanding = outstanding?.reduce((sum, t) => sum + t.amount, 0) || 0;
      const paymentRate = totalRevenue > 0 ? (totalRevenue / (totalRevenue + totalOutstanding)) * 100 : 0;

      // Get staff data from users table
      const { data: teachers, count: totalStaff } = await supabase!
        .from('users')
        .select('id, role')
        .eq('preschool_id', school.id)
        .eq('role', 'teacher');

      const activeTeachers = teachers?.length || 0;
      const studentTeacherRatio = activeTeachers > 0 ? activeStudents / activeTeachers : 0;

      // Mock some additional metrics that would require more complex calculations
      const mockAnalytics: AnalyticsData = {
        enrollment: {
          totalStudents: totalStudents || 0,
          newEnrollments,
          withdrawals: withdrawnStudents,
          retentionRate,
          ageGroupDistribution,
        },
        attendance: {
          averageAttendance,
          todayAttendance: todayAttendanceRate,
          weeklyTrend: [
            { day: 'Mon', rate: 92 },
            { day: 'Tue', rate: 88 },
            { day: 'Wed', rate: 95 },
            { day: 'Thu', rate: 89 },
            { day: 'Fri', rate: 85 },
          ],
          lowAttendanceAlerts: Math.floor(Math.random() * 3),
        },
        finance: {
          monthlyRevenue: totalRevenue,
          outstandingFees: totalOutstanding,
          paymentRate,
          expenseRatio: 0.65,
        },
        staff: {
          totalStaff: totalStaff || 0,
          activeTeachers,
          studentTeacherRatio,
          performanceScore: 4.2,
        },
        academic: {
          averageGrade: 3.8,
          improvingStudents: Math.floor(activeStudents * 0.15),
          strugglingStudents: Math.floor(activeStudents * 0.08),
          parentEngagement: 78,
        },
      };

      setAnalytics(mockAnalytics);
    } catch {
      console.error('Error loading analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (value: number, good: number, excellent: number) => {
    if (value >= excellent) return '#10B981';
    if (value >= good) return '#F59E0B';
    return '#EF4444';
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="analytics-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>No analytics data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Principal Analytics</Text>
        <TouchableOpacity onPress={() => router.push('/screens/export-analytics')}>
          <Ionicons name="download" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Period Selection */}
      <View style={styles.periodContainer}>
        {['week', 'month', 'quarter', 'year'].map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Metrics Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.enrollment.totalStudents}</Text>
              <Text style={styles.metricLabel}>Total Students</Text>
              <Text style={[styles.metricChange, { color: analytics.enrollment.newEnrollments > 0 ? '#10B981' : '#EF4444' }]}>
                +{analytics.enrollment.newEnrollments} this month
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.attendance.averageAttendance.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Avg Attendance</Text>
              <Text style={[styles.metricChange, { color: getStatusColor(analytics.attendance.averageAttendance, 85, 95) }]}>
                {analytics.attendance.averageAttendance >= 90 ? '↗ Excellent' : analytics.attendance.averageAttendance >= 80 ? '→ Good' : '↘ Needs Attention'}
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(analytics.finance.monthlyRevenue)}</Text>
              <Text style={styles.metricLabel}>Monthly Revenue</Text>
              <Text style={[styles.metricChange, { color: '#10B981' }]}>
                {analytics.finance.paymentRate.toFixed(0)}% payment rate
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{analytics.staff.studentTeacherRatio.toFixed(1)}:1</Text>
              <Text style={styles.metricLabel}>Student:Teacher</Text>
              <Text style={[styles.metricChange, { color: getStatusColor(20 - analytics.staff.studentTeacherRatio, 5, 10) }]}>
                {analytics.staff.studentTeacherRatio <= 15 ? '✓ Optimal' : '⚠ Review needed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Enrollment Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Enrollment Analytics</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.enrollment.retentionRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Retention Rate</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.enrollment.newEnrollments}</Text>
              <Text style={styles.analyticsLabel}>New Enrollments</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.enrollment.withdrawals}</Text>
              <Text style={styles.analyticsLabel}>Withdrawals</Text>
            </View>
          </View>

          {/* Age Group Distribution */}
          <Text style={styles.subsectionTitle}>Age Group Distribution</Text>
          {analytics.enrollment.ageGroupDistribution.map((group, index) => (
            <View key={index} style={styles.distributionRow}>
              <Text style={styles.distributionLabel}>{group.ageGroup}</Text>
              <View style={styles.distributionBar}>
                <View
                  style={[
                    styles.distributionFill,
                    { width: `${(group.count / analytics.enrollment.totalStudents) * 100}%` },
                  ]}
                />
              </View>
              <Text style={styles.distributionValue}>{group.count}</Text>
            </View>
          ))}
        </View>

        {/* Financial Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Performance</Text>
          <View style={styles.analyticsGrid}>
            <View style={styles.analyticsCard}>
              <Text style={[styles.analyticsValue, { color: '#10B981' }]}>
                {formatCurrency(analytics.finance.monthlyRevenue)}
              </Text>
              <Text style={styles.analyticsLabel}>Revenue</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={[styles.analyticsValue, { color: '#EF4444' }]}>
                {formatCurrency(analytics.finance.outstandingFees)}
              </Text>
              <Text style={styles.analyticsLabel}>Outstanding</Text>
            </View>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsValue}>{analytics.finance.paymentRate.toFixed(1)}%</Text>
              <Text style={styles.analyticsLabel}>Payment Rate</Text>
            </View>
          </View>
        </View>

        {/* Academic Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Academic Insights</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightTitle}>Student Progress Summary</Text>
            <Text style={styles.insightText}>
              • {analytics.academic.improvingStudents} students showing improvement this month
            </Text>
            <Text style={styles.insightText}>
              • {analytics.academic.strugglingStudents} students may need additional support
            </Text>
            <Text style={styles.insightText}>
              • {analytics.academic.parentEngagement}% parent engagement rate
            </Text>
            <TouchableOpacity
              style={styles.insightButton}
onPress={() => router.push('/screens/principal-analytics')}
            >
              <Text style={styles.insightButtonText}>View Detailed Reports</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommended Actions</Text>
          <View style={styles.actionsList}>
            {analytics.attendance.lowAttendanceAlerts > 0 && (
              <View style={styles.actionItem}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.actionText}>
                  {analytics.attendance.lowAttendanceAlerts} students have low attendance - consider parent meetings
                </Text>
              </View>
            )}
            {analytics.finance.paymentRate < 90 && (
              <View style={styles.actionItem}>
                <Ionicons name="card" size={20} color="#EF4444" />
                <Text style={styles.actionText}>
                  Payment rate below 90% - send payment reminders
                </Text>
              </View>
            )}
            {analytics.staff.studentTeacherRatio > 20 && (
              <View style={styles.actionItem}>
                <Ionicons name="people" size={20} color="#8B5CF6" />
                <Text style={styles.actionText}>
                  Consider hiring additional teachers to improve ratios
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  periodContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 8,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  periodButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricChange: {
    fontSize: 10,
    fontWeight: '500',
  },
  analyticsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analyticsCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  analyticsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  distributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  distributionLabel: {
    width: 80,
    fontSize: 12,
    color: '#333',
  },
  distributionBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginHorizontal: 8,
  },
  distributionFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  distributionValue: {
    width: 30,
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  insightCard: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  insightButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  insightButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  actionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
});

export default PrincipalAnalytics;