import React from 'react';
import { View, Text, Image } from 'react-native';
import { SchoolBranding } from '../../../types/invoice';

interface PreviewCardProps {
  branding: SchoolBranding;
}

export function PreviewCard({ branding }: PreviewCardProps) {
  const {
    primary_color = '#3B82F6',
    secondary_color = '#64748B',
    logo_url,
    footer_text = 'Thank you for your business',
    payment_terms = '30 days',
    tax_number,
  } = branding;

  return (
    <View className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header with branding */}
      <View 
        className="p-4"
        style={{ backgroundColor: primary_color }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-3">
            {logo_url ? (
              <Image
                source={{ uri: logo_url }}
                className="w-12 h-12 rounded"
                resizeMode="contain"
              />
            ) : (
              <View 
                className="w-12 h-12 rounded items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Text className="text-white font-bold text-xs">LOGO</Text>
              </View>
            )}
            
            <View>
              <Text className="text-white font-bold text-lg">
                Sample PreSchool
              </Text>
              <Text className="text-white opacity-90 text-sm">
                Invoice Preview
              </Text>
            </View>
          </View>
          
          <View className="items-end">
            <Text className="text-white font-bold text-xl">INVOICE</Text>
            <Text className="text-white opacity-90 text-sm">#INV-001</Text>
          </View>
        </View>
      </View>

      {/* Invoice Details */}
      <View className="p-4 space-y-4">
        {/* Bill To Section */}
        <View className="flex-row justify-between">
          <View>
            <Text className="font-semibold text-gray-900 mb-1">Bill To:</Text>
            <Text className="text-gray-700">John & Mary Smith</Text>
            <Text className="text-gray-600 text-sm">Parent/Guardian</Text>
            <Text className="text-gray-600 text-sm">For: Emma Smith</Text>
          </View>
          
          <View className="items-end">
            <View className="space-y-1">
              <View className="flex-row space-x-4">
                <Text className="text-gray-600 text-sm">Date:</Text>
                <Text className="text-gray-900 text-sm">15 Jan 2024</Text>
              </View>
              <View className="flex-row space-x-4">
                <Text className="text-gray-600 text-sm">Due:</Text>
                <Text className="text-gray-900 text-sm">14 Feb 2024</Text>
              </View>
              <View className="flex-row space-x-4">
                <Text className="text-gray-600 text-sm">Terms:</Text>
                <Text className="text-gray-900 text-sm">{payment_terms}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View 
          className="h-px"
          style={{ backgroundColor: secondary_color, opacity: 0.3 }}
        />

        {/* Line Items Header */}
        <View className="flex-row bg-gray-50 p-2 rounded">
          <Text className="flex-1 font-semibold text-gray-800 text-sm">Description</Text>
          <Text className="w-16 font-semibold text-gray-800 text-sm text-center">Qty</Text>
          <Text className="w-20 font-semibold text-gray-800 text-sm text-right">Amount</Text>
        </View>

        {/* Sample Line Items */}
        <View className="space-y-2">
          <View className="flex-row py-2">
            <Text className="flex-1 text-gray-700 text-sm">Monthly Tuition Fee</Text>
            <Text className="w-16 text-gray-700 text-sm text-center">1</Text>
            <Text className="w-20 text-gray-700 text-sm text-right">R 1,500.00</Text>
          </View>
          
          <View className="flex-row py-2">
            <Text className="flex-1 text-gray-700 text-sm">Activity Fee</Text>
            <Text className="w-16 text-gray-700 text-sm text-center">1</Text>
            <Text className="w-20 text-gray-700 text-sm text-right">R 200.00</Text>
          </View>
        </View>

        {/* Divider */}
        <View 
          className="h-px"
          style={{ backgroundColor: secondary_color, opacity: 0.3 }}
        />

        {/* Total Section */}
        <View className="space-y-1">
          <View className="flex-row justify-between">
            <Text className="text-gray-600">Subtotal:</Text>
            <Text className="text-gray-900">R 1,700.00</Text>
          </View>
          
          {tax_number && (
            <View className="flex-row justify-between">
              <Text className="text-gray-600">VAT (15%):</Text>
              <Text className="text-gray-900">R 255.00</Text>
            </View>
          )}
          
          <View 
            className="h-px my-1"
            style={{ backgroundColor: secondary_color, opacity: 0.3 }}
          />
          
          <View className="flex-row justify-between">
            <Text className="font-bold text-gray-900">Total:</Text>
            <Text 
              className="font-bold text-lg"
              style={{ color: primary_color }}
            >
              R {tax_number ? '1,955.00' : '1,700.00'}
            </Text>
          </View>
        </View>

        {/* Footer */}
        {footer_text && (
          <View className="mt-4 pt-4 border-t border-gray-200">
            <Text 
              className="text-center text-sm italic"
              style={{ color: secondary_color }}
            >
              {footer_text}
            </Text>
          </View>
        )}

        {/* Tax Information */}
        {tax_number && (
          <View className="mt-2">
            <Text className="text-xs text-gray-500 text-center">
              VAT Reg: {tax_number}
            </Text>
          </View>
        )}
      </View>

      {/* Preview Footer */}
      <View 
        className="p-2 border-t border-gray-200"
        style={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
      >
        <Text className="text-center text-xs text-gray-500">
          Invoice Preview - Colors and layout will appear as shown
        </Text>
      </View>
    </View>
  );
}