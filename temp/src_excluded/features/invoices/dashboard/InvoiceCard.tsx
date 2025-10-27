import React from 'react';
import { View, Text, TouchableOpacity, TouchableWithoutFeedback, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Invoice, InvoiceStatus } from '../../../types/invoice';
import { invoiceService } from '../../../services/invoiceService';
import { Card } from '../../../components/ui';

interface InvoiceCardProps {
  invoice: Invoice;
  selected: boolean;
  selectionMode: boolean;
  onPress: () => void;
  onLongPress: () => void;
  index: number;
}

const STATUS_COLORS = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  viewed: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  paid: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  overdue: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-300' },
};

const STATUS_LABELS = {
  draft: 'Draft',
  sent: 'Sent',
  viewed: 'Viewed',
  partial: 'Partial',
  paid: 'Paid',
  overdue: 'Overdue',
  cancelled: 'Cancelled',
};

export function InvoiceCard({
  invoice,
  selected,
  selectionMode,
  onPress,
  onLongPress,
  index,
}: InvoiceCardProps) {
  const queryClient = useQueryClient();

  // Quick mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: () => invoiceService.markAsPaid(invoice.id, invoice.total_amount),
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
      queryClient.invalidateQueries(['invoice-stats']);
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to mark as paid: ${_error.message}`);
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: () => invoiceService.sendPaymentReminder(invoice.id),
    onSuccess: () => {
      Alert.alert('Success', 'Payment reminder sent successfully');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to send reminder: ${_error.message}`);
    },
  });

  const handleQuickAction = (action: string, event: any) => {
    event.stopPropagation(); // Prevent card press
    
    switch (action) {
      case 'mark_paid':
        Alert.alert(
          'Mark as Paid',
          `Mark invoice ${invoice.invoice_number} as paid for ${formatCurrency(invoice.total_amount)}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Mark Paid', 
              onPress: () => markAsPaidMutation.mutate(),
              style: 'default'
            },
          ]
        );
        break;
      case 'send_reminder':
        sendReminderMutation.mutate();
        break;
    }
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilDue = () => {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const statusConfig = STATUS_COLORS[invoice.status as keyof typeof STATUS_COLORS] || STATUS_COLORS.draft;
  const daysUntilDue = getDaysUntilDue();
  const isOverdue = daysUntilDue < 0 && invoice.status !== 'paid';

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <Card
        className={`mb-3 overflow-hidden transition-all duration-200 ${
          selected ? 'border-2 border-blue-500 bg-blue-50' : 'border border-gray-200 bg-white'
        }`}
      >
        <View className="p-4">
          {/* Header Row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-3">
              {/* Selection Checkbox */}
              {selectionMode && (
                <TouchableOpacity
                  onPress={onPress}
                  className={`w-6 h-6 rounded border-2 items-center justify-center ${
                    selected 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {selected && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </TouchableOpacity>
              )}

              {/* Invoice Number */}
              <View>
                <Text className="text-lg font-semibold text-gray-900">
                  {invoice.invoice_number}
                </Text>
                <Text className="text-sm text-gray-500">
                  {invoice.student?.first_name} {invoice.student?.last_name}
                </Text>
              </View>
            </View>

            {/* Status Badge */}
            <View
              className={`px-3 py-1 rounded-full border ${statusConfig.bg} ${statusConfig.border}`}
            >
              <Text className={`text-xs font-medium ${statusConfig.text}`}>
                {STATUS_LABELS[invoice.status as keyof typeof STATUS_LABELS]}
              </Text>
            </View>
          </View>

          {/* Details Row */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <View className="flex-row items-center space-x-4">
                <View>
                  <Text className="text-xs text-gray-500 uppercase tracking-wide">
                    Amount
                  </Text>
                  <Text className="text-base font-semibold text-gray-900">
                    {formatCurrency(invoice.total_amount)}
                  </Text>
                </View>

                {invoice.paid_amount > 0 && (
                  <View>
                    <Text className="text-xs text-gray-500 uppercase tracking-wide">
                      Paid
                    </Text>
                    <Text className="text-base font-medium text-green-600">
                      {formatCurrency(invoice.paid_amount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            <View className="items-end">
              <Text className="text-xs text-gray-500 uppercase tracking-wide">
                Due Date
              </Text>
              <Text className={`text-sm font-medium ${
                isOverdue ? 'text-red-600' : 'text-gray-900'
              }`}>
                {formatDate(invoice.due_date)}
              </Text>
              {daysUntilDue !== 0 && (
                <Text className={`text-xs ${
                  isOverdue ? 'text-red-500' : daysUntilDue <= 7 ? 'text-yellow-600' : 'text-gray-500'
                }`}>
                  {isOverdue 
                    ? `${Math.abs(daysUntilDue)} days overdue`
                    : daysUntilDue === 1
                    ? 'Due tomorrow'
                    : daysUntilDue <= 7
                    ? `Due in ${daysUntilDue} days`
                    : ''
                  }
                </Text>
              )}
            </View>
          </View>

          {/* Progress Bar for Partial Payments */}
          {invoice.status === 'partial' && invoice.paid_amount > 0 && (
            <View className="mb-3">
              <View className="flex-row justify-between text-xs text-gray-500 mb-1">
                <Text>Payment Progress</Text>
                <Text>{Math.round((invoice.paid_amount / invoice.total_amount) * 100)}%</Text>
              </View>
              <View className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <View
                  className="h-full bg-green-500"
                  style={{ width: `${(invoice.paid_amount / invoice.total_amount) * 100}%` }}
                />
              </View>
            </View>
          )}

          {/* Quick Actions */}
          {!selectionMode && (
            <View className="flex-row items-center justify-between pt-3 border-t border-gray-100">
              <Text className="text-xs text-gray-500">
                Created {formatDate(invoice.created_at)}
              </Text>
              
              <View className="flex-row items-center space-x-2">
                {/* Send Reminder */}
                {(invoice.status === 'sent' || invoice.status === 'viewed' || invoice.status === 'overdue') && (
                  <TouchableOpacity
                    onPress={(e) => handleQuickAction('send_reminder', e)}
                    disabled={sendReminderMutation.isLoading}
                    className="flex-row items-center space-x-1 px-2 py-1 bg-blue-100 rounded"
                  >
                    <Ionicons 
                      name={sendReminderMutation.isLoading ? "hourglass-outline" : "mail-outline"} 
                      size={12} 
                      color="#1D4ED8" 
                    />
                    <Text className="text-blue-700 text-xs font-medium">
                      {sendReminderMutation.isLoading ? 'Sending...' : 'Remind'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Mark as Paid */}
                {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                  <TouchableOpacity
                    onPress={(e) => handleQuickAction('mark_paid', e)}
                    disabled={markAsPaidMutation.isLoading}
                    className="flex-row items-center space-x-1 px-2 py-1 bg-green-100 rounded"
                  >
                    <Ionicons 
                      name={markAsPaidMutation.isLoading ? "hourglass-outline" : "checkmark-circle-outline"} 
                      size={12} 
                      color="#059669" 
                    />
                    <Text className="text-green-700 text-xs font-medium">
                      {markAsPaidMutation.isLoading ? 'Updating...' : 'Mark Paid'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* View/Edit Arrow */}
                <Ionicons name="chevron-forward" size={16} color="#6B7280" />
              </View>
            </View>
          )}
        </View>
      </Card>
    </TouchableWithoutFeedback>
  );
}