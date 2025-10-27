import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const AVAILABLE_PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'cash',
    name: 'Cash',
    description: 'Cash payments at school',
    icon: 'cash-outline',
  },
  {
    id: 'bank_transfer',
    name: 'Bank Transfer',
    description: 'Direct bank deposits',
    icon: 'card-outline',
  },
  {
    id: 'debit_order',
    name: 'Debit Order',
    description: 'Monthly automatic deductions',
    icon: 'calendar-outline',
  },
  {
    id: 'eft',
    name: 'EFT',
    description: 'Electronic funds transfer',
    icon: 'swap-horizontal-outline',
  },
  {
    id: 'online',
    name: 'Online Payment',
    description: 'PayFast online gateway',
    icon: 'globe-outline',
  },
  {
    id: 'check',
    name: 'Cheque',
    description: 'Bank cheques',
    icon: 'document-text-outline',
  },
];

interface PaymentMethodsConfigProps {
  selectedMethods: string[];
  onChange: (methods: string[]) => void;
}

export function PaymentMethodsConfig({ selectedMethods, onChange }: PaymentMethodsConfigProps) {
  const toggleMethod = (methodId: string) => {
    if (selectedMethods.includes(methodId)) {
      // Remove method
      onChange(selectedMethods.filter(id => id !== methodId));
    } else {
      // Add method
      onChange([...selectedMethods, methodId]);
    }
  };

  return (
    <View className="space-y-4">
      <View className="mb-2">
        <Text className="text-sm text-gray-600">
          Select the payment methods your school accepts. These will appear on invoices and payment instructions.
        </Text>
      </View>

      {AVAILABLE_PAYMENT_METHODS.map((method) => {
        const isSelected = selectedMethods.includes(method.id);
        
        return (
          <TouchableOpacity
            key={method.id}
            onPress={() => toggleMethod(method.id)}
            className={`p-4 rounded-lg border-2 flex-row items-center space-x-3 ${
              isSelected 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 bg-white'
            }`}
          >
            {/* Method Icon */}
            <View
              className={`w-10 h-10 rounded-full items-center justify-center ${
                isSelected ? 'bg-blue-500' : 'bg-gray-100'
              }`}
            >
              <Ionicons
                name={method.icon as any}
                size={20}
                color={isSelected ? 'white' : '#6B7280'}
              />
            </View>

            {/* Method Details */}
            <View className="flex-1">
              <Text className={`font-semibold ${
                isSelected ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {method.name}
              </Text>
              <Text className={`text-sm ${
                isSelected ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {method.description}
              </Text>
            </View>

            {/* Selection Indicator */}
            <View
              className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                isSelected
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 bg-white'
              }`}
            >
              {isSelected && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      {/* Bank Details Section */}
      {selectedMethods.includes('bank_transfer') && (
        <View className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <View className="flex-row items-center space-x-2 mb-3">
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text className="font-semibold text-yellow-800">
              Bank Transfer Setup
            </Text>
          </View>
          <Text className="text-yellow-700 text-sm leading-relaxed">
            When you select bank transfer, you'll need to provide your school's banking details in the business information section above. This information will appear on invoices to help parents make payments.
          </Text>
        </View>
      )}

      {/* Online Payment Notice */}
      {selectedMethods.includes('online') && (
        <View className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <View className="flex-row items-center space-x-2 mb-3">
            <Ionicons name="shield-checkmark" size={20} color="#22C55E" />
            <Text className="font-semibold text-green-800">
              Online Payments
            </Text>
          </View>
          <Text className="text-green-700 text-sm leading-relaxed">
            Online payments are processed securely through PayFast. Parents can pay with credit cards, debit cards, or instant EFT. Transaction fees may apply.
          </Text>
        </View>
      )}

      {/* No Methods Selected */}
      {selectedMethods.length === 0 && (
        <View className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text className="font-semibold text-red-800">
              No Payment Methods Selected
            </Text>
          </View>
          <Text className="text-red-700 text-sm mt-1">
            Please select at least one payment method to include on your invoices.
          </Text>
        </View>
      )}

      {/* Summary */}
      {selectedMethods.length > 0 && (
        <View className="mt-4 p-3 bg-gray-50 rounded-lg">
          <Text className="font-medium text-gray-900 mb-2">
            Selected Methods ({selectedMethods.length}):
          </Text>
          <View className="flex-row flex-wrap">
            {selectedMethods.map((methodId) => {
              const method = AVAILABLE_PAYMENT_METHODS.find(m => m.id === methodId);
              return method ? (
                <View
                  key={methodId}
                  className="bg-blue-100 px-2 py-1 rounded-full mr-2 mb-2"
                >
                  <Text className="text-blue-800 text-xs font-medium">
                    {method.name}
                  </Text>
                </View>
              ) : null;
            })}
          </View>
        </View>
      )}
    </View>
  );
}