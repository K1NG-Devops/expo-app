/**
 * Petty Cash Reconciliation Screen
 * 
 * Allows principals to reconcile physical cash with recorded transactions
 * Features:
 * - Manual cash counting interface
 * - Transaction comparison
 * - Variance identification
 * - Reconciliation approval
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface CashCount {
  denomination: number;
  count: number;
  total: number;
}

interface ReconciliationData {
  systemBalance: number;
  physicalCash: number;
  variance: number;
  lastReconciliation: string | null;
  transactionCount: number;
}

const CASH_DENOMINATIONS = [
  { value: 200, label: 'R200', color: '#8B5A2B' },
  { value: 100, label: 'R100', color: '#4A90E2' },
  { value: 50, label: 'R50', color: '#E94B3C' },
  { value: 20, label: 'R20', color: '#F5A623' },
  { value: 10, label: 'R10', color: '#7ED321' },
  { value: 5, label: 'R5', color: '#50E3C2' },
  { value: 2, label: 'R2', color: '#9013FE' },
  { value: 1, label: 'R1', color: '#BD10E0' },
  { value: 0.5, label: '50c', color: '#B8E986' },
  { value: 0.2, label: '20c', color: '#FFD93D' },
  { value: 0.1, label: '10c', color: '#FFA726' },
  { value: 0.05, label: '5c', color: '#FF7043' },
];

export default function PettyCashReconcileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reconciliationData, setReconciliationData] = useState<ReconciliationData>({
    systemBalance: 0,
    physicalCash: 0,
    variance: 0,
    lastReconciliation: null,
    transactionCount: 0,
  });
  
  const [cashCounts, setCashCounts] = useState<CashCount[]>(
    CASH_DENOMINATIONS.map(denom => ({
      denomination: denom.value,
      count: 0,
      total: 0,
    }))
  );
  
  const [notes, setNotes] = useState('');
  const [isReconciling, setIsReconciling] = useState(false);

  const loadReconciliationData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get user's preschool
      const { data: userProfile } = await supabase
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userProfile?.preschool_id) {
        Alert.alert('Error', 'No school assigned to your account');
        return;
      }

      // Get system balance
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Get approved transactions for current month
      const { data: transactions } = await supabase
        .from('petty_cash_transactions')
        .select('amount, type')
        .eq('preschool_id', userProfile.preschool_id)
        .eq('status', 'approved')
        .gte('created_at', currentMonth.toISOString());

      const expenses = (transactions || [])
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const replenishments = (transactions || [])
        .filter(t => t.type === 'replenishment')
        .reduce((sum, t) => sum + t.amount, 0);

      // Get opening balance from school settings
      const { data: settings } = await supabase
        .from('school_settings')
        .select('opening_balance')
        .eq('preschool_id', userProfile.preschool_id)
        .single();

      const openingBalance = settings?.opening_balance || 5000;
      const systemBalance = openingBalance + replenishments - expenses;

      // Get last reconciliation
      const { data: lastRecon } = await supabase
        .from('petty_cash_reconciliations')
        .select('created_at, physical_amount')
        .eq('preschool_id', userProfile.preschool_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setReconciliationData({
        systemBalance,
        physicalCash: 0,
        variance: 0,
        lastReconciliation: lastRecon?.created_at || null,
        transactionCount: (transactions || []).length,
      });

    } catch (error) {
      console.error('Error loading reconciliation data:', error);
      Alert.alert('Error', 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const updateCashCount = (index: number, count: string) => {
    const parsedCount = parseInt(count) || 0;
    const newCashCounts = [...cashCounts];
    newCashCounts[index] = {
      ...newCashCounts[index],
      count: parsedCount,
      total: newCashCounts[index].denomination * parsedCount,
    };
    setCashCounts(newCashCounts);

    // Calculate total physical cash
    const totalPhysical = newCashCounts.reduce((sum, item) => sum + item.total, 0);
    setReconciliationData(prev => ({
      ...prev,
      physicalCash: totalPhysical,
      variance: totalPhysical - prev.systemBalance,
    }));
  };

  const performReconciliation = async () => {
    if (!user) return;

    try {
      setIsReconciling(true);

      const { data: userProfile } = await supabase
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userProfile?.preschool_id) {
        Alert.alert('Error', 'No school assigned to your account');
        return;
      }

      // Save reconciliation record
      const { error } = await supabase
        .from('petty_cash_reconciliations')
        .insert({
          preschool_id: userProfile.preschool_id,
          system_amount: reconciliationData.systemBalance,
          physical_amount: reconciliationData.physicalCash,
          variance: reconciliationData.variance,
          cash_breakdown: cashCounts,
          notes: notes.trim() || null,
          reconciled_by: user.id,
        });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Reconciliation Complete',
        `Cash reconciliation has been recorded.\n\nVariance: ${formatCurrency(reconciliationData.variance)}`,
        [
          { text: 'View History', onPress: () => router.push('/screens/petty-cash-history') },
          { text: 'Done', onPress: () => router.back() },
        ]
      );

    } catch (error) {
      console.error('Error performing reconciliation:', error);
      Alert.alert('Error', 'Failed to save reconciliation');
    } finally {
      setIsReconciling(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance === 0) return '#10B981'; // Perfect match
    if (Math.abs(variance) <= 5) return '#F59E0B'; // Small variance
    return '#EF4444'; // Large variance
  };

  const getVarianceIcon = (variance: number) => {
    if (variance === 0) return 'checkmark-circle';
    if (variance > 0) return 'trending-up';
    return 'trending-down';
  };

  useEffect(() => {
    loadReconciliationData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadReconciliationData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="calculator-outline" size={48} color="#6B7280" />
          <Text style={styles.loadingText}>Loading reconciliation data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cash Reconciliation</Text>
        <TouchableOpacity 
          onPress={() => router.push('/screens/petty-cash-history')}
          disabled={loading}
        >
          <Ionicons name="time-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Balance Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Balance Comparison</Text>
          
          <View style={styles.balanceRow}>
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>System Balance</Text>
              <Text style={styles.systemBalance}>
                {formatCurrency(reconciliationData.systemBalance)}
              </Text>
            </View>
            
            <View style={styles.balanceItem}>
              <Text style={styles.balanceLabel}>Physical Cash</Text>
              <Text style={styles.physicalBalance}>
                {formatCurrency(reconciliationData.physicalCash)}
              </Text>
            </View>
          </View>
          
          <View style={styles.varianceSection}>
            <View style={styles.varianceHeader}>
              <Ionicons 
                name={getVarianceIcon(reconciliationData.variance) as any}
                size={20} 
                color={getVarianceColor(reconciliationData.variance)} 
              />
              <Text style={[styles.varianceLabel, { color: getVarianceColor(reconciliationData.variance) }]}>
                Variance: {formatCurrency(reconciliationData.variance)}
              </Text>
            </View>
            
            {reconciliationData.variance !== 0 && (
              <Text style={styles.varianceNote}>
                {reconciliationData.variance > 0 ? 'Physical cash exceeds system balance' : 'System balance exceeds physical cash'}
              </Text>
            )}
          </View>
        </View>

        {/* Cash Counting */}
        <View style={styles.countingCard}>
          <Text style={styles.cardTitle}>Count Physical Cash</Text>
          <Text style={styles.countingInstructions}>
            Count each denomination and enter the quantity below:
          </Text>
          
          {cashCounts.map((cashCount, index) => {
            const denomination = CASH_DENOMINATIONS[index];
            return (
              <View key={denomination.value} style={styles.denominationRow}>
                <View style={[styles.denominationChip, { backgroundColor: denomination.color + '20' }]}>
                  <Text style={[styles.denominationLabel, { color: denomination.color }]}>
                    {denomination.label}
                  </Text>
                </View>
                
                <View style={styles.countingSection}>
                  <TextInput
                    style={styles.countInput}
                    value={cashCount.count.toString()}
                    onChangeText={(text) => updateCashCount(index, text)}
                    keyboardType="number-pad"
                    placeholder="0"
                  />
                  <Text style={styles.multiplySign}>×</Text>
                  <Text style={styles.denominationValue}>
                    {formatCurrency(denomination.value)}
                  </Text>
                </View>
                
                <Text style={styles.lineTotal}>
                  {formatCurrency(cashCount.total)}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Notes */}
        <View style={styles.notesCard}>
          <Text style={styles.cardTitle}>Reconciliation Notes</Text>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about discrepancies or observations..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Info */}
        {reconciliationData.lastReconciliation && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Last Reconciliation</Text>
            <Text style={styles.infoText}>
              {new Date(reconciliationData.lastReconciliation).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionButton, styles.reconcileButton]}
            onPress={performReconciliation}
            disabled={isReconciling || reconciliationData.physicalCash === 0}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>
              {isReconciling ? 'Reconciling...' : 'Complete Reconciliation'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={() => router.back()}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
            <Text style={[styles.actionButtonText, { color: '#666' }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    marginTop: 16,
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
  summaryCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  systemBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4F46E5',
  },
  physicalBalance: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  varianceSection: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 16,
  },
  varianceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  varianceLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  varianceNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  countingCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countingInstructions: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  denominationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  denominationChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 60,
    alignItems: 'center',
  },
  denominationLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  countingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  countInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 6,
    padding: 8,
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  multiplySign: {
    fontSize: 16,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  denominationValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  lineTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    minWidth: 80,
    textAlign: 'right',
  },
  notesCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  infoCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsSection: {
    margin: 16,
    marginTop: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reconcileButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
});