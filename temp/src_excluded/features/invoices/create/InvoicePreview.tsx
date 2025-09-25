import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card, LoadingSpinner } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { invoiceService } from '../../../services/invoiceService';

export function InvoicePreview() {
  const { profile } = useAuth();
  const { watch } = useFormContext();
  
  const formData = watch();
  const items = formData.items || [];

  // Fetch school branding for preview
  const { data: branding, isLoading } = useQuery({
    queryKey: ['school-branding', profile?.preschool_id],
    queryFn: () => invoiceService.getSchoolBranding(profile!.preschool_id!),
    enabled: !!profile?.preschool_id,
  });

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

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const {
    primary_color = '#3B82F6',
    secondary_color = '#64748B',
    logo_url,
    footer_text = 'Thank you for your business',
    payment_terms: brandingPaymentTerms,
    tax_number,
    accepted_payment_methods = [],
  } = branding || { /* TODO: Implement */ };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const grandTotal = calculateGrandTotal();

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="space-y-6">
        <View>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            Invoice Preview
          </Text>
          <Text className="text-gray-600">
            This is how your invoice will appear to recipients
          </Text>
        </View>

        {/* Invoice Preview Card */}
        <Card className="overflow-hidden">
          {/* Header with Branding */}
          <View 
            className="p-6"
            style={{ backgroundColor: primary_color }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-4">
                {logo_url ? (
                  <View
                    className="w-16 h-16 rounded-lg overflow-hidden"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text className="text-white text-xs p-2 text-center">LOGO</Text>
                  </View>
                ) : (
                  <View
                    className="w-16 h-16 rounded-lg items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text className="text-white font-bold text-xs">LOGO</Text>
                  </View>
                )}
                
                <View>
                  <Text className="text-white font-bold text-xl">
                    {profile?.preschool?.name || 'School Name'}
                  </Text>
                  <Text className="text-white opacity-90 text-sm">
                    Educational Invoice
                  </Text>
                </View>
              </View>
              
              <View className="items-end">
                <Text className="text-white font-bold text-2xl">INVOICE</Text>
                <Text className="text-white opacity-90 text-sm">
                  #AUTO-GENERATED
                </Text>
              </View>
            </View>
          </View>

          {/* Invoice Body */}
          <View className="p-6">
            {/* Bill To and Invoice Info */}
            <View className="flex-row justify-between mb-6">
              <View className="flex-1">
                <Text className="font-semibold text-gray-900 mb-3">Bill To:</Text>
                <Text className="text-gray-700 font-medium">Parent/Guardian Name</Text>
                <Text className="text-gray-600 text-sm">For: Student Name</Text>
                <Text className="text-gray-600 text-sm">parent@email.com</Text>
              </View>
              
              <View className="items-end">
                <Text className="font-semibold text-gray-900 mb-3">Invoice Information:</Text>
                <View className="space-y-1">
                  <View className="flex-row space-x-4">
                    <Text className="text-gray-600 text-sm">Date:</Text>
                    <Text className="text-gray-900 text-sm">
                      {formData.issue_date ? formatDate(new Date(formData.issue_date)) : 'Not set'}
                    </Text>
                  </View>
                  <View className="flex-row space-x-4">
                    <Text className="text-gray-600 text-sm">Due:</Text>
                    <Text className="text-gray-900 text-sm">
                      {formData.due_date ? formatDate(new Date(formData.due_date)) : 'Not set'}
                    </Text>
                  </View>
                  <View className="flex-row space-x-4">
                    <Text className="text-gray-600 text-sm">Terms:</Text>
                    <Text className="text-gray-900 text-sm">
                      {formData.payment_terms || brandingPaymentTerms || '30 days'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Divider */}
            <View 
              className="h-px mb-4"
              style={{ backgroundColor: secondary_color, opacity: 0.3 }}
            />

            {/* Line Items Table Header */}
            <View className="flex-row bg-gray-50 p-3 rounded-lg mb-4">
              <Text className="flex-1 font-semibold text-gray-800 text-sm">Description</Text>
              <Text className="w-12 font-semibold text-gray-800 text-sm text-center">Qty</Text>
              <Text className="w-20 font-semibold text-gray-800 text-sm text-right">Amount</Text>
            </View>

            {/* Line Items */}
            <View className="space-y-2 mb-4">
              {items.map((item: any, index: number) => (
                <View key={index} className="flex-row py-2">
                  <View className="flex-1">
                    <Text className="text-gray-700 text-sm font-medium">{item.description}</Text>
                    <Text className="text-gray-500 text-xs capitalize">
                      {item.item_type || 'Service'} • {formatCurrency(item.unit_price)} per unit
                    </Text>
                  </View>
                  <Text className="w-12 text-gray-700 text-sm text-center">{item.quantity}</Text>
                  <Text className="w-20 text-gray-700 text-sm text-right font-medium">
                    {formatCurrency(calculateLineTotal(item))}
                  </Text>
                </View>
              ))}
            </View>

            {/* Totals Section */}
            <View 
              className="border-t pt-4"
              style={{ borderColor: secondary_color, opacity: 0.3 }}
            >
              <View className="items-end space-y-2">
                <View className="flex-row justify-between w-64">
                  <Text className="text-gray-600">Subtotal:</Text>
                  <Text className="text-gray-900 font-medium">{formatCurrency(subtotal)}</Text>
                </View>
                
                {totalTax > 0 && (
                  <View className="flex-row justify-between w-64">
                    <Text className="text-gray-600">
                      VAT {tax_number ? `(${tax_number})` : ''}:
                    </Text>
                    <Text className="text-gray-900 font-medium">{formatCurrency(totalTax)}</Text>
                  </View>
                )}
                
                <View 
                  className="h-px w-64"
                  style={{ backgroundColor: secondary_color, opacity: 0.3 }}
                />
                
                <View className="flex-row justify-between w-64">
                  <Text className="font-bold text-gray-900 text-lg">Total:</Text>
                  <Text 
                    className="font-bold text-lg"
                    style={{ color: primary_color }}
                  >
                    {formatCurrency(grandTotal)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Payment Methods */}
            {accepted_payment_methods.length > 0 && (
              <View className="mt-6 p-4 bg-gray-50 rounded-lg">
                <Text className="font-semibold text-gray-900 mb-3">Accepted Payment Methods:</Text>
                <View className="flex-row flex-wrap">
                  {accepted_payment_methods.map((method: string, index: number) => {
                    const methodNames: Record<string, string> = {
                      cash: 'Cash',
                      bank_transfer: 'Bank Transfer',
                      debit_order: 'Debit Order',
                      online: 'Online Payment',
                      check: 'Cheque',
                      eft: 'EFT',
                    };
                    
                    return (
                      <View key={index} className="bg-white px-3 py-1 rounded-full mr-2 mb-2 border border-gray-200">
                        <Text className="text-gray-700 text-xs">{methodNames[method] || method}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Notes */}
            {formData.notes && (
              <View className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Text className="font-semibold text-blue-900 mb-2">Notes:</Text>
                <Text className="text-blue-800 text-sm leading-relaxed">{formData.notes}</Text>
              </View>
            )}

            {/* Footer */}
            <View className="mt-6 pt-4 border-t border-gray-200 text-center">
              <Text 
                className="text-sm italic text-center"
                style={{ color: secondary_color }}
              >
                {footer_text}
              </Text>
              {tax_number && (
                <Text className="text-xs text-gray-500 mt-2 text-center">
                  VAT Registration Number: {tax_number}
                </Text>
              )}
            </View>
          </View>
        </Card>

        {/* Preview Actions */}
        <Card className="p-4">
          <Text className="font-semibold text-gray-900 mb-3">Preview Actions</Text>
          
          <View className="space-y-3">
            <TouchableOpacity className="flex-row items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <Ionicons name="document-text" size={20} color="#3B82F6" />
              <View className="flex-1">
                <Text className="font-medium text-blue-900">Generate PDF Preview</Text>
                <Text className="text-blue-700 text-sm">See how the PDF will look with your branding</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <Ionicons name="mail" size={20} color="#10B981" />
              <View className="flex-1">
                <Text className="font-medium text-green-900">Email Preview</Text>
                <Text className="text-green-700 text-sm">Preview the email that will be sent to parents</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Final Checklist */}
        <Card className="p-4 bg-green-50 border-green-200">
          <Text className="font-semibold text-green-900 mb-3">Final Checklist</Text>
          
          <View className="space-y-2">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-green-800 text-sm">Student information verified</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-green-800 text-sm">Line items added and calculated</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-green-800 text-sm">Payment terms and dates set</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle" size={16} color="#10B981" />
              <Text className="text-green-800 text-sm">School branding applied</Text>
            </View>
          </View>
          
          <Text className="text-green-700 text-sm mt-3 italic">
            Ready to create and send invoice!
          </Text>
        </Card>
      </View>
    </ScrollView>
  );
}