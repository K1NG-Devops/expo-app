import React from 'react';
import { View, Text } from 'react-native';
import { useFormContext } from 'react-hook-form';

import { Card } from '../../../components/ui';

export function InvoiceSummary() {
  const { watch } = useFormContext();
  
  const formData = watch();
  const items = formData.items || [];

  const calculateLineTotal = (item: any) => {
    const subtotal = item.quantity * item.unit_price;
    const taxRate = (item.tax_rate || 0) / 100;
    const taxAmount = subtotal * taxRate;
    return subtotal + taxAmount;
  };

  const calculateSubtotal = () => {
    return items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum: number, item: any) => {
      const subtotal = item.quantity * item.unit_price;
      const taxRate = (item.tax_rate || 0) / 100;
      return sum + (subtotal * taxRate);
    }, 0);
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum: number, item: any) => sum + calculateLineTotal(item), 0);
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const grandTotal = calculateGrandTotal();

  return (
    <View className="space-y-6">
      <View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Invoice Summary
        </Text>
        <Text className="text-gray-600">
          Review the invoice details before proceeding
        </Text>
      </View>

      {/* Invoice Details Summary */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Invoice Information
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Issue Date:</Text>
            <Text className="text-gray-900 font-medium">
              {formData.issue_date ? formatDate(new Date(formData.issue_date)) : '-'}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Due Date:</Text>
            <Text className="text-gray-900 font-medium">
              {formData.due_date ? formatDate(new Date(formData.due_date)) : '-'}
            </Text>
          </View>
          
          {formData.payment_terms && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600">Payment Terms:</Text>
              <Text className="text-gray-900 font-medium">{formData.payment_terms}</Text>
            </View>
          )}

          {formData.notes && (
            <View className="pt-2 border-t border-gray-200">
              <Text className="text-gray-600 text-sm mb-1">Notes:</Text>
              <Text className="text-gray-900 text-sm italic">{formData.notes}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Line Items Summary */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Line Items ({items.length})
        </Text>
        
        <View className="space-y-3">
          {items.map((item: any, index: number) => (
            <View key={index} className="p-3 bg-gray-50 rounded-lg">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-gray-900 font-medium flex-1">{item.description}</Text>
                <Text className="text-gray-900 font-semibold ml-3">
                  {formatCurrency(calculateLineTotal(item))}
                </Text>
              </View>
              
              <View className="flex-row justify-between text-sm text-gray-600">
                <Text>{item.quantity} × {formatCurrency(item.unit_price)}</Text>
                {item.tax_rate > 0 && (
                  <Text>VAT: {item.tax_rate}%</Text>
                )}
              </View>
              
              {item.item_type && (
                <Text className="text-xs text-gray-500 mt-1 capitalize">
                  Type: {item.item_type}
                </Text>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* Financial Summary */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <Text className="text-lg font-semibold text-blue-900 mb-4">
          Financial Summary
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row justify-between">
            <Text className="text-blue-800">Subtotal:</Text>
            <Text className="text-blue-900 font-medium">{formatCurrency(subtotal)}</Text>
          </View>
          
          {totalTax > 0 && (
            <View className="flex-row justify-between">
              <Text className="text-blue-800">Total VAT:</Text>
              <Text className="text-blue-900 font-medium">{formatCurrency(totalTax)}</Text>
            </View>
          )}
          
          <View className="h-px bg-blue-200 my-2" />
          
          <View className="flex-row justify-between">
            <Text className="text-xl font-bold text-blue-900">Total Amount:</Text>
            <Text className="text-xl font-bold text-blue-900">
              {formatCurrency(grandTotal)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Payment Information */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Payment Information
        </Text>
        
        <View className="space-y-3">
          <View className="flex-row items-center space-x-3">
            <View className="w-3 h-3 bg-green-500 rounded-full"></View>
            <Text className="text-gray-700">
              Invoice will be marked as <span className="font-semibold">Sent</span> after creation
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-3">
            <View className="w-3 h-3 bg-blue-500 rounded-full"></View>
            <Text className="text-gray-700">
              Payment tracking will be enabled automatically
            </Text>
          </View>
          
          <View className="flex-row items-center space-x-3">
            <View className="w-3 h-3 bg-purple-500 rounded-full"></View>
            <Text className="text-gray-700">
              Parents will receive email notifications
            </Text>
          </View>
        </View>
      </Card>

      {/* Validation Warnings */}
      {items.length === 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <View className="flex-row items-center space-x-2">
            <Text className="text-red-600 text-lg">⚠️</Text>
            <Text className="font-semibold text-red-800">Missing Line Items</Text>
          </View>
          <Text className="text-red-700 text-sm mt-1">
            Please go back to add at least one line item to the invoice.
          </Text>
        </Card>
      )}

      {grandTotal === 0 && items.length > 0 && (
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <View className="flex-row items-center space-x-2">
            <Text className="text-yellow-600 text-lg">⚠️</Text>
            <Text className="font-semibold text-yellow-800">Zero Amount Invoice</Text>
          </View>
          <Text className="text-yellow-700 text-sm mt-1">
            This invoice has a total amount of R 0.00. Please verify the line item amounts.
          </Text>
        </Card>
      )}

      {/* Success State */}
      {items.length > 0 && grandTotal > 0 && (
        <Card className="p-4 bg-green-50 border-green-200">
          <View className="flex-row items-center space-x-2">
            <Text className="text-green-600 text-lg">✅</Text>
            <Text className="font-semibold text-green-800">Ready to Create</Text>
          </View>
          <Text className="text-green-700 text-sm mt-1">
            Invoice is complete and ready to be sent. You can proceed to the final preview.
          </Text>
        </Card>
      )}
    </View>
  );
}