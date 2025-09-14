/**
 * Petty Cash Management System
 * 
 * Essential Principal Hub feature for managing:
 * - Small daily expenses (stationery, maintenance, refreshments)
 * - Cash on hand tracking
 * - Expense categories and receipts
 * - Reimbursements and float management
 * - Monthly reconciliation
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
// import * as DocumentPicker from 'expo-document-picker';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
// Removed Picker import to fix ViewManager error

interface PettyCashTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'expense' | 'replenishment';
  receipt_number?: string;
  created_at: string;
  created_by: string;
  approved_by?: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface PettyCashSummary {
  opening_balance: number;
  current_balance: number;
  total_expenses: number;
  total_replenishments: number;
  pending_approval: number;
}

const EXPENSE_CATEGORIES = [
  'Stationery & Supplies',
  'Refreshments',
  'Maintenance & Repairs',
  'Travel & Transport',
  'Communication',
  'Medical & First Aid',
  'Cleaning Supplies',
  'Utilities (small amounts)',
  'Emergency Expenses',
  'Other',
];

export default function PettyCashScreen() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  
  const [transactions, setTransactions] = useState<PettyCashTransaction[]>([]);
  const [summary, setSummary] = useState<PettyCashSummary>({
    opening_balance: 0,
    current_balance: 0,
    total_expenses: 0,
    total_replenishments: 0,
    pending_approval: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // const [selectedPeriod, setSelectedPeriod] = useState('current_month'); // For future period filtering
  
  // Modals
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showReplenishment, setShowReplenishment] = useState(false);
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: '',
    receipt_number: '',
  });
  
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const loadPettyCashData = async () => {
    if (!user || !supabase) return;

    try {
      setLoading(true);

      // Get user's preschool
      const { data: userProfile } = await supabase!
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userProfile?.preschool_id) {
        Alert.alert('Error', 'No school assigned to your account');
        return;
      }

      // Load petty cash transactions
      const { data: transactionsData, error: transError } = await supabase!
        .from('petty_cash_transactions')
        .select('*')
        .eq('preschool_id', userProfile.preschool_id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transError) {
        console.error('Error loading transactions:', transError);
      } else {
        setTransactions(transactionsData || []);
      }

      // Calculate summary
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);

      const monthlyTransactions = (transactionsData || []).filter(t => 
        new Date(t.created_at) >= currentMonthStart
      );

      const expenses = monthlyTransactions
        .filter(t => t.type === 'expense' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0);

      const replenishments = monthlyTransactions
        .filter(t => t.type === 'replenishment' && t.status === 'approved')
        .reduce((sum, t) => sum + t.amount, 0);

      const pending = monthlyTransactions
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

      // Get opening balance (this would typically be set by admin)
      const { data: settingsData } = await supabase!
        .from('school_settings')
        .select('petty_cash_limit, opening_balance')
        .eq('preschool_id', userProfile.preschool_id)
        .single();

      const openingBalance = settingsData?.opening_balance ?? 0; // No mock fallback
      const currentBalance = openingBalance + replenishments - expenses;

      setSummary({
        opening_balance: openingBalance,
        current_balance: currentBalance,
        total_expenses: expenses,
        total_replenishments: replenishments,
        pending_approval: pending,
      });

    } catch (error) {
      console.error('Error loading petty cash data:', error);
      Alert.alert('Error', 'Failed to load petty cash information');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.amount || !expenseForm.description || !expenseForm.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amount > summary.current_balance) {
      Alert.alert('Error', 'Insufficient petty cash balance');
      return;
    }

    try {
      setUploadingReceipt(true);
      
      const { data: userProfile } = await supabase!
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user?.id)
        .single();

      // First, insert the transaction
      const { data: transactionData, error: transactionError } = await supabase!
        .from('petty_cash_transactions')
        .insert({
          preschool_id: userProfile?.preschool_id,
          amount,
          description: expenseForm.description.trim(),
          category: expenseForm.category,
          type: 'expense',
          receipt_number: expenseForm.receipt_number.trim() || null,
          created_by: user?.id,
          status: 'approved', // In a real system, this might need approval
        })
        .select()
        .single();

      if (transactionError) {
        Alert.alert('Error', 'Failed to add expense');
        return;
      }

      // Upload receipt if one was selected
      let receiptPath = null;
      if (receiptImage && transactionData) {
        receiptPath = await uploadReceiptImage(receiptImage, transactionData.id);
        
        if (receiptPath) {
          // Update transaction with receipt path
          await supabase!
            .from('petty_cash_transactions')
            .update({ receipt_image_path: receiptPath })
            .eq('id', transactionData.id);
        }
      }

      Alert.alert('Success', `Expense added successfully${receiptPath ? ' with receipt' : ''}`);
      setShowAddExpense(false);
      setExpenseForm({
        amount: '',
        description: '',
        category: '',
        receipt_number: '',
      });
      setReceiptImage(null);
      loadPettyCashData();
    } catch {
      Alert.alert('Error', 'Failed to add expense');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleReplenishment = async () => {
    if (!expenseForm.amount) {
      Alert.alert('Error', 'Please enter replenishment amount');
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!supabase) {
      Alert.alert('Error', 'Database connection not available');
      return;
    }

    try {
      const { data: userProfile } = await supabase!
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user?.id)
        .single();

      const { error } = await supabase!
        .from('petty_cash_transactions')
        .insert({
          preschool_id: userProfile?.preschool_id,
          amount,
          description: `Petty cash replenishment - ${new Date().toLocaleDateString()}`,
          category: 'Replenishment',
          type: 'replenishment',
          created_by: user?.id,
          status: 'approved',
        });

      if (error) {
        Alert.alert('Error', 'Failed to record replenishment');
        return;
      }

      Alert.alert('Success', 'Replenishment recorded successfully');
      setShowReplenishment(false);
      setExpenseForm({
        amount: '',
        description: '',
        category: '',
        receipt_number: '',
      });
      loadPettyCashData();
    } catch {
      Alert.alert('Error', 'Failed to record replenishment');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return theme?.success || '#10B981';
      case 'pending': return theme?.warning || '#F59E0B';
      case 'rejected': return theme?.error || '#EF4444';
      default: return theme?.textSecondary || '#6B7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Stationery & Supplies': return 'library';
      case 'Refreshments': return 'cafe';
      case 'Maintenance & Repairs': return 'construct';
      case 'Travel & Transport': return 'car';
      case 'Communication': return 'call';
      case 'Medical & First Aid': return 'medical';
      case 'Cleaning Supplies': return 'sparkles';
      case 'Utilities (small amounts)': return 'flash';
      case 'Emergency Expenses': return 'alert-circle';
      case 'Replenishment': return 'add-circle';
      default: return 'receipt';
    }
  };

  const uploadReceiptImage = async (imageUri: string, transactionId: string) => {
    if (!supabase) return null;
    
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileExt = imageUri.split('.').pop();
      const fileName = `receipt_${transactionId}_${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase!.storage
        .from('receipts')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          cacheControl: '3600',
        });
      
      if (error) throw error;
      
      return data.path;
    } catch (error) {
      console.error('Error uploading receipt:', error);
      return null;
    }
  };

  const selectReceiptImage = () => {
    Alert.alert(
      'Add Receipt',
      'Choose how to add your receipt:',
      [
        { 
          text: 'Take Photo', 
          onPress: () => takeReceiptPhoto() 
        },
        { 
          text: 'Choose from Gallery', 
          onPress: () => pickReceiptFromGallery() 
        },
        { 
          text: 'Cancel', 
          style: 'cancel' 
        }
      ]
    );
  };

  const takeReceiptPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const pickReceiptFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Gallery permission is needed to select photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setReceiptImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const removeReceiptImage = () => {
    setReceiptImage(null);
  };

  useEffect(() => {
    loadPettyCashData();
  }, [user]);

  // Helpers for cancel/delete/reverse
  const canDelete = async (): Promise<boolean> => {
    try {
      const { data } = await supabase!
        .from('users')
        .select('role')
        .eq('auth_user_id', user?.id)
        .single();
      return data?.role === 'principal_admin';
    } catch {
      return false;
    }
  };

  const handleCancelTransaction = async (transactionId: string) => {
    try {
      const { error } = await supabase!
        .from('petty_cash_transactions')
        .update({ status: 'rejected' })
        .eq('id', transactionId)
        .eq('status', 'pending');
      if (error) throw error;
      loadPettyCashData();
    } catch (e) {
      Alert.alert('Error', 'Failed to cancel transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    try {
      const allowed = await canDelete();
      if (!allowed) {
        Alert.alert('Not allowed', 'Only principals can delete transactions');
        return;
      }
      const { error } = await supabase!
        .from('petty_cash_transactions')
        .delete()
        .eq('id', transactionId);
      if (error) throw error;
      loadPettyCashData();
    } catch (e) {
      Alert.alert('Error', 'Failed to delete transaction');
    }
  };

  const handleReverseTransaction = async (t: PettyCashTransaction) => {
    try {
      const { data: userProfile } = await supabase!
        .from('users')
        .select('preschool_id')
        .eq('auth_user_id', user?.id)
        .single();

      const oppositeType = t.type === 'expense' ? 'replenishment' : 'expense';
      const { error } = await supabase!
        .from('petty_cash_transactions')
        .insert({
          preschool_id: userProfile?.preschool_id,
          amount: t.amount,
          description: `Reversal of ${t.type} (${t.id}) - ${t.description}`,
          category: 'Other',
          type: oppositeType as any,
          created_by: user?.id,
          status: 'approved',
          metadata: { reversed_of: t.id },
        });
      if (error) throw error;
      loadPettyCashData();
    } catch (e) {
      Alert.alert('Error', 'Failed to create reversal');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPettyCashData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="wallet-outline" size={48} color="#6B7280" />
          <Text style={styles.loadingText}>Loading petty cash data...</Text>
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
        <Text style={styles.headerTitle}>Petty Cash</Text>
<TouchableOpacity onPress={() => router.push('/screens/financial-reports')}>
          <Ionicons name="document-text" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Balance Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Current Balance</Text>
          <Text style={[
            styles.currentBalance,
            { color: summary.current_balance < 1000 ? '#EF4444' : '#10B981' }
          ]}>
            {formatCurrency(summary.current_balance)}
          </Text>
          
          {summary.current_balance < 1000 && (
            <View style={styles.lowBalanceWarning}>
              <Ionicons name="warning" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>Low balance - consider replenishment</Text>
            </View>
          )}

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.total_expenses)}
              </Text>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.pending_approval)}
              </Text>
              <Text style={styles.summaryLabel}>Pending Approval</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowAddExpense(true)}
            >
              <Ionicons name="remove-circle" size={24} color="#EF4444" />
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowReplenishment(true)}
            >
              <Ionicons name="add-circle" size={24} color="#10B981" />
              <Text style={styles.actionText}>Replenish Cash</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/screens/petty-cash-reconcile')}
            >
              <Ionicons name="calculator" size={24} color="#8B5CF6" />
              <Text style={styles.actionText}>Reconcile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
onPress={() => router.push('/screens/petty-cash-reconcile')}
            >
              <Ionicons name="bar-chart" size={24} color="#007AFF" />
              <Text style={styles.actionText}>View Report</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        <View style={styles.transactionsCard}>
          <View style={styles.transactionsHeader}>
            <Text style={styles.transactionsTitle}>Recent Transactions</Text>
            <TouchableOpacity onPress={() => router.push('/screens/petty-cash-history')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptySubtitle}>Add your first expense or replenishment</Text>
            </View>
          ) : (
            transactions.slice(0, 10).map((transaction) => (
              <View 
                key={transaction.id} 
                style={styles.transactionItem}
                onTouchEnd={() => {}}
                onStartShouldSetResponder={() => false}
                onResponderRelease={() => {}}
              >
                <View style={styles.transactionLeft}>
                  <Ionicons
                    name={getCategoryIcon(transaction.category) as any}
                    size={20}
                    color={transaction.type === 'expense' ? '#EF4444' : '#10B981'}
                  />
                  <View style={styles.transactionDetails}>
                    <Text style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                    <Text style={styles.transactionCategory}>
                      {transaction.category}
                    </Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'expense' ? '#EF4444' : '#10B981' }
                  ]}>
                    {transaction.type === 'expense' ? '-' : '+'}
                    {formatCurrency(transaction.amount)}
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(transaction.status) }
                  ]}>
                    <Text style={styles.statusText}>{transaction.status}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    const options: any[] = [];
                    if (transaction.status === 'pending') {
                      options.push({ text: 'Cancel (reject)', onPress: () => handleCancelTransaction(transaction.id) });
                    }
                    options.push({ text: 'Reverse', onPress: () => handleReverseTransaction(transaction) });
                    const allowDelete = await canDelete();
                    if (allowDelete) {
                      options.push({ text: 'Delete', style: 'destructive', onPress: () => handleDeleteTransaction(transaction.id) });
                    }
                    options.push({ text: 'Close', style: 'cancel' });
                    Alert.alert('Transaction Options', 'Choose an action', options, { cancelable: true });
                  }}
                >
                  <Ionicons name="ellipsis-vertical" size={18} color={theme?.textSecondary || '#6B7280'} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal
        visible={showAddExpense}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddExpense(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddExpense(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Expense</Text>
            <TouchableOpacity 
              onPress={handleAddExpense}
              disabled={uploadingReceipt}
            >
              <Text style={[styles.modalSave, uploadingReceipt && { opacity: 0.5 }]}>
                {uploadingReceipt ? 'Uploading...' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Amount (ZAR) *</Text>
              <TextInput
                style={styles.formInput}
                value={expenseForm.amount}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, amount: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.formInput, { height: 80 }]}
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, description: text }))}
                placeholder="What was this expense for?"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Category *</Text>
              <TouchableOpacity 
                style={styles.categorySelector}
                onPress={() => {
                  Alert.alert(
                    'Select Category',
                    'Choose an expense category:',
                    [
                      ...EXPENSE_CATEGORIES.map(category => ({
                        text: category,
                        onPress: () => setExpenseForm(prev => ({ ...prev, category }))
                      })),
                      { text: 'Cancel', style: 'cancel' }
                    ],
                    { cancelable: true }
                  );
                }}
              >
                <Text style={[styles.categoryText, !expenseForm.category && styles.placeholder]}>
                  {expenseForm.category || 'Select category...'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Receipt Number (Optional)</Text>
              <TextInput
                style={styles.formInput}
                value={expenseForm.receipt_number}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, receipt_number: text }))}
                placeholder="Receipt or reference number"
              />
            </View>

            {/* Receipt Upload Section */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Receipt Image (Optional)</Text>
              
              {receiptImage ? (
                <View style={styles.receiptPreviewContainer}>
                  <Image source={{ uri: receiptImage }} style={styles.receiptPreview} />
                  <TouchableOpacity 
                    style={styles.removeReceiptButton}
                    onPress={removeReceiptImage}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.uploadReceiptButton}
                  onPress={selectReceiptImage}
                >
                  <Ionicons name="camera" size={24} color="#6B7280" />
                  <Text style={styles.uploadReceiptText}>Add Receipt Photo</Text>
                  <Text style={styles.uploadReceiptSubtext}>Tap to take photo or select from gallery</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Available Balance:</Text>
              <Text style={styles.balanceAmount}>
                {formatCurrency(summary.current_balance)}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Replenishment Modal */}
      <Modal
        visible={showReplenishment}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowReplenishment(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReplenishment(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Replenish Petty Cash</Text>
            <TouchableOpacity onPress={handleReplenishment}>
              <Text style={styles.modalSave}>Record</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Replenishment Amount (ZAR) *</Text>
              <TextInput
                style={styles.formInput}
                value={expenseForm.amount}
                onChangeText={(text) => setExpenseForm(prev => ({ ...prev, amount: text }))}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.replenishmentInfo}>
              <Text style={styles.infoTitle}>Current Status</Text>
              <Text style={styles.infoText}>
                Current Balance: {formatCurrency(summary.current_balance)}
              </Text>
              <Text style={styles.infoText}>
                Recommended replenishment when balance falls below R1,000
              </Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#f8f9fa',
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
    backgroundColor: theme?.surface || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#e1e5e9',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme?.text || '#333',
  },
  scrollView: {
    flex: 1,
  },
  summaryCard: {
    margin: 16,
    backgroundColor: theme?.cardBackground || '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 16,
    color: theme?.textSecondary || '#6B7280',
    marginBottom: 8,
  },
  currentBalance: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 12,
  },
  lowBalanceWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme?.warningLight || '#FEF3C7',
    padding: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 12,
    color: theme?.warning || '#92400E',
    marginLeft: 4,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: theme?.textSecondary || '#6B7280',
  },
  actionsCard: {
    margin: 16,
    backgroundColor: theme?.cardBackground || '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme?.surfaceVariant || '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
  },
  actionText: {
    fontSize: 12,
    color: theme?.text || '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  transactionsCard: {
    margin: 16,
    backgroundColor: theme?.cardBackground || '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: theme?.shadow || '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transactionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  transactionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
  },
  viewAllText: {
    color: theme?.primary || '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionDetails: {
    marginLeft: 12,
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: theme?.text || '#333',
    marginBottom: 2,
  },
  transactionCategory: {
    fontSize: 12,
    color: theme?.accent || '#8B5CF6',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 11,
    color: theme?.textSecondary || '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 14,
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
  modalContainer: {
    flex: 1,
    backgroundColor: theme?.modalBackground || '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme?.surface || '#fff',
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme?.text || '#333',
  },
  modalCancel: {
    fontSize: 16,
    color: theme?.textSecondary || '#6B7280',
  },
  modalSave: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.primary || '#007AFF',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme?.text || '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: theme?.inputBorder || '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: theme?.inputBackground || '#fff',
    color: theme?.inputText || '#111827',
  },
  categorySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme?.inputBorder || '#e1e5e9',
    borderRadius: 8,
    padding: 12,
    backgroundColor: theme?.inputBackground || '#fff',
  },
  categoryText: {
    fontSize: 16,
    color: theme?.inputText || '#333',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  uploadReceiptButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme?.border || '#e1e5e9',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    backgroundColor: theme?.surfaceVariant || '#f8f9fa',
  },
  uploadReceiptText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 8,
  },
  uploadReceiptSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  receiptPreviewContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  receiptPreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeReceiptButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 2,
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme?.surfaceVariant || '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  balanceLabel: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.text || '#333',
  },
  replenishmentInfo: {
    backgroundColor: theme?.surfaceVariant || '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme?.text || '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme?.textSecondary || '#6B7280',
    marginBottom: 4,
  },
});