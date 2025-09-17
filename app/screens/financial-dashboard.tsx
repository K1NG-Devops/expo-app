/**
 * Modern Financial Management Dashboard
 * 
 * Features:
 * - Interactive charts with react-native-chart-kit
 * - Real-time export functionality (CSV, PDF, Excel)
 * - Responsive design with touch interactions
 * - Clean architecture with service separation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

import { FinancialDataService } from '@/services/FinancialDataService';
import { ChartDataService } from '@/lib/services/finance/ChartDataService';
import { ExportService } from '@/lib/services/finance/ExportService';
import type { FinanceOverviewData, TransactionRecord } from '@/services/FinancialDataService';
import type { ExportFormat } from '@/lib/services/finance/ExportService';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 32;

export default function FinanceDashboard() {
  const { profile } = useAuth();
  
  const [overview, setOverview] = useState<FinanceOverviewData | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeChart, setActiveChart] = useState<'cashflow' | 'categories' | 'comparison'>('cashflow');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const canAccessFinances = (): boolean => {
    return profile?.role === 'principal' || profile?.role === 'principal_admin';
  };

  const loadDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(!forceRefresh);
      if (forceRefresh) setRefreshing(true);

      // Load financial overview
      const overviewData = await FinancialDataService.getOverview();
      setOverview(overviewData);

      // Load recent transactions (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const transactionData = await FinancialDataService.getTransactions({
        from: thirtyDaysAgo.toISOString(),
        to: new Date().toISOString(),
      });
      setTransactions(transactionData);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      Alert.alert('Error', 'Failed to load financial dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleExport = (format: ExportFormat) => {
    if (!overview || !transactions.length) {
      Alert.alert('No Data', 'No financial data available to export');
      return;
    }

    const summary = {
      revenue: overview.keyMetrics.monthlyRevenue,
      expenses: overview.keyMetrics.monthlyExpenses,
      cashFlow: overview.keyMetrics.cashFlow,
    };

    ExportService.exportFinancialData(transactions, summary, {
      format,
      dateRange: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      includeCharts: true,
    });
  };

  const formatCurrency = (amount: number): string => {
    return `R${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
  };

  const renderMetricCard = (title: string, value: string, subtitle: string, color: string, icon: string) => (
    <View style={[styles.metricCard, { width: (screenWidth - 48) / 2 }]}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon as any} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  );

  const renderChart = () => {
    if (!overview) return null;

    const chartConfig = ChartDataService.getCommonChartConfig();

    switch (activeChart) {
      case 'cashflow': {
        const cashFlowData = ChartDataService.formatCashFlowTrend(overview);
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Cash Flow Trend (Last 6 Months)</Text>
            <LineChart
              data={cashFlowData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
        );
      }

      case 'categories': {
        const categoriesData = ChartDataService.formatCategoriesBreakdown(overview);
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Expense Categories</Text>
            <PieChart
              data={categoriesData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              center={[10, 0]}
              style={styles.chart}
            />
          </View>
        );
      }

      case 'comparison': {
        const comparisonData = ChartDataService.formatMonthlyComparison(overview);
        return (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Monthly Comparison</Text>
            <BarChart
              data={comparisonData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              yAxisLabel="R"
              yAxisSuffix="k"
            />
          </View>
        );
      }

      default:
        return null;
    }
  };

  const renderChartSelector = () => (
    <View style={styles.chartSelector}>
      {[
        { key: 'cashflow', label: 'Cash Flow', icon: 'trending-up' },
        { key: 'categories', label: 'Categories', icon: 'pie-chart' },
        { key: 'comparison', label: 'Compare', icon: 'bar-chart' },
      ].map(({ key, label, icon }) => (
        <TouchableOpacity
          key={key}
          style={[
            styles.chartTab,
            activeChart === key && styles.chartTabActive,
          ]}
          onPress={() => setActiveChart(key as any)}
        >
          <Ionicons 
            name={icon as any} 
            size={16} 
            color={activeChart === key ? Colors.light.tint : Colors.light.tabIconDefault} 
          />
          <Text 
            style={[
              styles.chartTabText,
              activeChart === key && styles.chartTabTextActive,
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderExportOptions = () => (
    <View style={styles.exportContainer}>
      <Text style={styles.sectionTitle}>Export Data</Text>
      <View style={styles.exportButtons}>
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('csv')}
        >
          <Ionicons name="document-text" size={20} color={Colors.light.tint} />
          <Text style={styles.exportButtonText}>CSV</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('excel')}
        >
          <Ionicons name="grid" size={20} color={Colors.light.tint} />
          <Text style={styles.exportButtonText}>Excel</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => handleExport('pdf')}
        >
          <Ionicons name="document" size={20} color={Colors.light.tint} />
          <Text style={styles.exportButtonText}>PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/screens/financial-transactions')}
        >
          <Ionicons name="list" size={24} color={Colors.light.tint} />
          <Text style={styles.actionText}>View Transactions</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push('/screens/financial-reports')}
        >
          <Ionicons name="analytics" size={24} color={Colors.light.tint} />
          <Text style={styles.actionText}>Detailed Reports</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!canAccessFinances()) {
    return (
      <View style={styles.accessDenied}>
        <Ionicons name="lock-closed" size={64} color={Colors.light.tabIconDefault} />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          Only school principals can access the financial dashboard.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
        <Text style={styles.loadingText}>Loading financial dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Finance Dashboard</Text>
        <TouchableOpacity onPress={() => loadDashboardData(true)}>
          <Ionicons name="refresh" size={24} color={Colors.light.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadDashboardData(true)} />
        }
        showsVerticalScrollIndicator={false}
      >
        {overview && (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Monthly Revenue',
                formatCurrency(overview.keyMetrics.monthlyRevenue),
                'This month',
                '#059669',
                'trending-up'
              )}
              {renderMetricCard(
                'Monthly Expenses', 
                formatCurrency(overview.keyMetrics.monthlyExpenses),
                'This month',
                '#DC2626',
                'trending-down'
              )}
              {renderMetricCard(
                'Net Cash Flow',
                formatCurrency(overview.keyMetrics.cashFlow),
                overview.keyMetrics.cashFlow >= 0 ? 'Positive' : 'Negative',
                overview.keyMetrics.cashFlow >= 0 ? '#059669' : '#DC2626',
                'wallet'
              )}
              {renderMetricCard(
                'Total Transactions',
                transactions.length.toString(),
                'Last 30 days',
                '#4F46E5',
                'receipt'
              )}
            </View>

            {/* Chart Section */}
            {renderChartSelector()}
            {renderChart()}

            {/* Export Options */}
            {renderExportOptions()}

            {/* Quick Actions */}
            {renderQuickActions()}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.light.text,
  },
  content: {
    flex: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 16,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.light.tabIconDefault,
    marginLeft: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 8,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chartTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 4,
    gap: 4,
  },
  chartTabActive: {
    backgroundColor: Colors.light.tint + '20',
  },
  chartTabText: {
    fontSize: 12,
    color: Colors.light.tabIconDefault,
  },
  chartTabTextActive: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  exportContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint + '10',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.tint,
  },
  quickActions: {
    margin: 16,
    marginTop: 0,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 8,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.light.text,
    marginTop: 16,
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.light.tabIconDefault,
    marginTop: 16,
  },
});
