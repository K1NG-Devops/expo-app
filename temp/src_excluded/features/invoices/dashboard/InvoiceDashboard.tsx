import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';

import { Card, Button, LoadingSpinner } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { invoiceService } from '../../../services/invoiceService';
import { InvoiceFilters as IInvoiceFilters } from '../../../types/invoice';

import { InvoiceList } from './InvoiceList';
import { InvoiceFilters } from './InvoiceFilters';
import { RevenueWidget } from './RevenueWidget';
import { QuickActions } from './QuickActions';
import { BulkActions } from './BulkActions';

export function InvoiceDashboard() {
  const { profile } = useAuth();
  const navigation = useNavigation();
  
  const [filters, setFilters] = useState<IInvoiceFilters>({
    status: [],
    date_range: {
      start_date: null,
      end_date: null,
    },
    student_ids: [],
    search: '',
  });
  
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Fetch invoice statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['invoice-stats', profile?.preschool_id],
    queryFn: () => invoiceService.getInvoiceStats(profile!.preschool_id!),
    enabled: !!profile?.preschool_id,
  });

  // Fetch invoices with filters
  const { 
    data: invoicesResponse, 
    isLoading: invoicesLoading, 
    refetch: refetchInvoices 
  } = useQuery({
    queryKey: ['invoices', profile?.preschool_id, filters],
    queryFn: () => invoiceService.getInvoices({
      preschool_id: profile!.preschool_id!,
      ...filters,
    }),
    enabled: !!profile?.preschool_id,
    keepPreviousData: true,
  });

  const invoices = invoicesResponse?.data || [];
  const totalCount = invoicesResponse?.total || 0;

  // Calculate derived stats
  const derivedStats = useMemo(() => {
    if (!stats) return null;

    const overdueDays = stats.overdue_amount > 0 ? 
      Math.floor((Date.now() - new Date(stats.oldest_overdue_date || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const collectionRate = stats.total_invoiced > 0 ? 
      (stats.total_collected / stats.total_invoiced) * 100 : 0;

    return {
      ...stats,
      overdue_days: overdueDays,
      collection_rate: collectionRate,
    };
  }, [stats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchInvoices()]);
    setRefreshing(false);
  };

  const handleCreateInvoice = () => {
    navigation.navigate('CreateInvoice');
  };

  const handleBulkAction = (action: string) => {
    // Handle bulk actions
    switch (action) {
      case 'send_reminders':
        // Implement send reminders
        break;
      case 'export':
        // Implement export
        break;
      case 'mark_paid':
        // Implement mark as paid
        break;
      default:
        break;
    }
  };

  const isLoading = statsLoading || invoicesLoading;

  if (isLoading && !stats && !invoices.length) {
    return <LoadingSpinner />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="p-4 bg-white border-b border-gray-200">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Invoices</Text>
              <Text className="text-gray-600">
                {totalCount} total invoice{totalCount !== 1 ? 's' : ''}
              </Text>
            </View>
            <Button
              onPress={handleCreateInvoice}
              className="bg-blue-600"
            >
              <Text className="text-white font-medium">New Invoice</Text>
            </Button>
          </View>

          {/* Quick Stats Cards */}
          {derivedStats && (
            <View className="flex-row space-x-3 mb-4">
              <Card className="flex-1 p-3 bg-green-50 border-green-200">
                <Text className="text-green-800 text-xs font-medium uppercase tracking-wide">
                  This Month
                </Text>
                <Text className="text-2xl font-bold text-green-900 mt-1">
                  R {derivedStats.total_this_month.toLocaleString()}
                </Text>
                <Text className="text-green-700 text-sm">
                  {derivedStats.invoices_this_month} invoices
                </Text>
              </Card>

              <Card className="flex-1 p-3 bg-red-50 border-red-200">
                <Text className="text-red-800 text-xs font-medium uppercase tracking-wide">
                  Outstanding
                </Text>
                <Text className="text-2xl font-bold text-red-900 mt-1">
                  R {derivedStats.outstanding_amount.toLocaleString()}
                </Text>
                <Text className="text-red-700 text-sm">
                  {derivedStats.outstanding_count} invoices
                </Text>
              </Card>

              <Card className="flex-1 p-3 bg-blue-50 border-blue-200">
                <Text className="text-blue-800 text-xs font-medium uppercase tracking-wide">
                  Collection Rate
                </Text>
                <Text className="text-2xl font-bold text-blue-900 mt-1">
                  {derivedStats.collection_rate.toFixed(1)}%
                </Text>
                <Text className="text-blue-700 text-sm">
                  Last 30 days
                </Text>
              </Card>
            </View>
          )}

          {/* Revenue Widget */}
          <RevenueWidget stats={derivedStats} />
        </View>

        {/* Quick Actions */}
        <View className="p-4 bg-white border-b border-gray-200">
          <QuickActions
            onCreateInvoice={handleCreateInvoice}
            onViewReports={() => navigation.navigate('InvoiceReports')}
            onManageTemplates={() => navigation.navigate('InvoiceTemplates')}
            onSchoolBranding={() => navigation.navigate('SchoolBranding')}
          />
        </View>

        {/* Filters */}
        <View className="bg-white border-b border-gray-200">
          <InvoiceFilters
            filters={filters}
            onFiltersChange={setFilters}
            visible={showFilters}
            onToggle={() => setShowFilters(!showFilters)}
            resultCount={totalCount}
          />
        </View>

        {/* Bulk Actions */}
        {selectedInvoices.length > 0 && (
          <View className="p-4 bg-yellow-50 border-b border-yellow-200">
            <BulkActions
              selectedCount={selectedInvoices.length}
              onAction={handleBulkAction}
              onClearSelection={() => setSelectedInvoices([])}
            />
          </View>
        )}

        {/* Invoice List */}
        <View className="flex-1 p-4">
          <InvoiceList
            invoices={invoices}
            loading={invoicesLoading}
            selectedInvoices={selectedInvoices}
            onSelectionChange={setSelectedInvoices}
            onInvoicePress={(invoice) => navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
          />
        </View>

        {/* Empty State */}
        {!invoicesLoading && invoices.length === 0 && (
          <View className="flex-1 items-center justify-center p-8 min-h-96">
            <View className="items-center space-y-4">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center">
                <Text className="text-gray-400 text-2xl">📄</Text>
              </View>
              <Text className="text-xl font-semibold text-gray-900">
                {Object.values(filters).some(f => f && (Array.isArray(f) ? f.length > 0 : f)) 
                  ? 'No invoices match your filters' 
                  : 'No invoices yet'
                }
              </Text>
              <Text className="text-gray-600 text-center leading-relaxed">
                {Object.values(filters).some(f => f && (Array.isArray(f) ? f.length > 0 : f))
                  ? 'Try adjusting your search criteria or clearing filters to see more results.'
                  : 'Create your first invoice to start tracking payments and managing your school\'s billing.'
                }
              </Text>
              {!Object.values(filters).some(f => f && (Array.isArray(f) ? f.length > 0 : f)) && (
                <Button
                  onPress={handleCreateInvoice}
                  className="bg-blue-600 mt-4"
                >
                  <Text className="text-white font-medium">Create First Invoice</Text>
                </Button>
              )}
              {Object.values(filters).some(f => f && (Array.isArray(f) ? f.length > 0 : f)) && (
                <Button
                  onPress={() => setFilters({
                    status: [],
                    date_range: { start_date: null, end_date: null },
                    student_ids: [],
                    search: '',
                  })}
                  variant="outline"
                  className="mt-4"
                >
                  <Text className="text-blue-600 font-medium">Clear Filters</Text>
                </Button>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}