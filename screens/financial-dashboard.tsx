import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
// Define types locally
interface School {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
}

interface FinancialTransaction {
  id: string;
  preschool_id: string;
  student_id?: string;
  type: 'fee_payment' | 'expense' | 'refund';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  students?: {
    first_name: string;
    last_name: string;
  };
}

interface FinancialMetrics {
  monthlyRevenue: number;
  outstandingPayments: number;
  totalStudents: number;
  averageFeePerStudent: number;
  paymentCompletionRate: number;
  monthlyExpenses: number;
  netIncome: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

const FinancialDashboard: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    monthlyRevenue: 0,
    outstandingPayments: 0,
    totalStudents: 0,
    averageFeePerStudent: 0,
    paymentCompletionRate: 0,
    monthlyExpenses: 0,
    netIncome: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFinancialData = async () => {
    if (!user || !supabase) return;

    try {
      setLoading(true);

      // Get school info
      const { data: schoolData, error: schoolError } = await supabase
        .from('preschools')
        .select('*')
        .eq('created_by', user.id)
        .single();

      if (schoolError && schoolError.code !== 'PGRST116') {
        console.error('Error loading school:', schoolError);
        return;
      }

      if (schoolData) {
        setSchool(schoolData);

        // Get financial transactions
        const { data: transactions, error: transactionError } = await supabase!
          .from('financial_transactions')
          .select(`
            *,
            students (
              first_name,
              last_name
            )
          `)
          .eq('preschool_id', schoolData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionError) {
          console.error('Error loading transactions:', transactionError);
        } else {
          setRecentTransactions(transactions || []);
        }

        // Get student count
        const { count: studentCount } = await supabase!
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('preschool_id', schoolData.id)
          .eq('status', 'active');

        // Calculate financial metrics
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();

        // Monthly revenue (fees paid this month)
        const { data: monthlyRevenue } = await supabase!
          .from('financial_transactions')
          .select('amount')
          .eq('preschool_id', schoolData.id)
          .eq('type', 'fee_payment')
          .eq('status', 'completed')
          .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
          .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

        const totalRevenue = monthlyRevenue?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // Outstanding payments
        const { data: outstanding } = await supabase!
          .from('financial_transactions')
          .select('amount')
          .eq('preschool_id', schoolData.id)
          .eq('type', 'fee_payment')
          .eq('status', 'pending');

        const totalOutstanding = outstanding?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // Monthly expenses
        const { data: monthlyExpenses } = await supabase!
          .from('financial_transactions')
          .select('amount')
          .eq('preschool_id', schoolData.id)
          .eq('type', 'expense')
          .gte('created_at', `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`)
          .lt('created_at', `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-01`);

        const totalExpenses = monthlyExpenses?.reduce((sum, t) => sum + t.amount, 0) || 0;

        const averageFee = studentCount && studentCount > 0 ? totalRevenue / studentCount : 0;
        const paymentRate = totalRevenue > 0 ? (totalRevenue / (totalRevenue + totalOutstanding)) * 100 : 0;

        setMetrics({
          monthlyRevenue: totalRevenue,
          outstandingPayments: totalOutstanding,
          totalStudents: studentCount || 0,
          averageFeePerStudent: averageFee,
          paymentCompletionRate: paymentRate,
          monthlyExpenses: totalExpenses,
          netIncome: totalRevenue - totalExpenses,
        });

        // Get monthly data for last 6 months
        const monthlyDataArray: MonthlyData[] = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const month = date.getMonth() + 1;
          const year = date.getFullYear();
          
          const { data: monthRevenue } = await supabase!
            .from('financial_transactions')
            .select('amount')
            .eq('preschool_id', schoolData.id)
            .eq('type', 'fee_payment')
            .eq('status', 'completed')
            .gte('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
            .lt('created_at', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

          const { data: monthExpenses } = await supabase!
            .from('financial_transactions')
            .select('amount')
            .eq('preschool_id', schoolData.id)
            .eq('type', 'expense')
            .gte('created_at', `${year}-${month.toString().padStart(2, '0')}-01`)
            .lt('created_at', `${year}-${(month + 1).toString().padStart(2, '0')}-01`);

          const revenue = monthRevenue?.reduce((sum, t) => sum + t.amount, 0) || 0;
          const expenses = monthExpenses?.reduce((sum, t) => sum + t.amount, 0) || 0;

          monthlyDataArray.push({
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            revenue,
            expenses,
            netIncome: revenue - expenses,
          });
        }

        setMonthlyData(monthlyDataArray);
      }
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Error', 'Failed to load financial data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFinancialData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'failed': return '#EF4444';
      default: return '#6B7280';
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading financial data...</Text>
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
        <Text style={styles.headerTitle}>Financial Dashboard</Text>
        <TouchableOpacity onPress={() => router.push('/screens/financial-reports')}>
          <Ionicons name="document-text" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Key Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Metrics</Text>
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(metrics.monthlyRevenue)}</Text>
              <Text style={styles.metricLabel}>Monthly Revenue</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(metrics.outstandingPayments)}</Text>
              <Text style={styles.metricLabel}>Outstanding</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{formatCurrency(metrics.netIncome)}</Text>
              <Text style={[styles.metricLabel, { color: metrics.netIncome >= 0 ? '#10B981' : '#EF4444' }]}>Net Income</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricValue}>{metrics.paymentCompletionRate.toFixed(1)}%</Text>
              <Text style={styles.metricLabel}>Payment Rate</Text>
            </View>
          </View>
        </View>

        {/* Monthly Trend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6-Month Trend</Text>
          <View style={styles.trendContainer}>
            {monthlyData.map((month, index) => (
              <View key={index} style={styles.monthColumn}>
                <Text style={styles.monthLabel}>{month.month}</Text>
                <View style={[styles.revenueBar, { height: Math.max(month.revenue / 1000, 10) }]} />
                <Text style={styles.monthValue}>{formatCurrency(month.revenue)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/screens/financial-transactions')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction, index) => (
              <View key={index} style={styles.transactionCard}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionDescription}>
                    {transaction.description || `${transaction.type.replace('_', ' ').toUpperCase()}`}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {new Date(transaction.created_at).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'expense' ? '#EF4444' : '#10B981' }
                  ]}>
                    {transaction.type === 'expense' ? '-' : '+'}{formatCurrency(transaction.amount)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) }]}>
                    <Text style={styles.statusText}>{transaction.status}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/screens/add-transaction')}
            >
              <Ionicons name="add-circle" size={32} color="#007AFF" />
              <Text style={styles.actionText}>Add Transaction</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/screens/payment-reminders')}
            >
              <Ionicons name="notifications" size={32} color="#F59E0B" />
              <Text style={styles.actionText}>Send Reminders</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/screens/financial-reports')}
            >
              <Ionicons name="bar-chart" size={32} color="#10B981" />
              <Text style={styles.actionText}>Generate Report</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/screens/expense-categories')}
            >
              <Ionicons name="pie-chart" size={32} color="#8B5CF6" />
              <Text style={styles.actionText}>Expenses</Text>
            </TouchableOpacity>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  viewAllText: {
    color: '#007AFF',
    fontWeight: '500',
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
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    paddingBottom: 20,
  },
  monthColumn: {
    alignItems: 'center',
    flex: 1,
  },
  monthLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  revenueBar: {
    width: 20,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginBottom: 8,
  },
  monthValue: {
    fontSize: 10,
    color: '#333',
    textAlign: 'center',
  },
  transactionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  transactionLeft: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#666',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default FinancialDashboard;