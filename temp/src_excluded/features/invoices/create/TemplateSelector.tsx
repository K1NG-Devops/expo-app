import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button, LoadingSpinner } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { invoiceService } from '../../../services/invoiceService';
import { InvoiceTemplate } from '../../../types/invoice';

interface TemplateSelectorProps {
  onTemplateSelected: (templateData: any) => void;
  onSkip: () => void;
}

export function TemplateSelector({ onTemplateSelected, onSkip }: TemplateSelectorProps) {
  const { profile } = useAuth();

  // Fetch invoice templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['invoice-templates', profile?.preschool_id],
    queryFn: () => invoiceService.getInvoiceTemplates(profile!.preschool_id!),
    enabled: !!profile?.preschool_id,
  });

  const handleTemplateSelect = (template: InvoiceTemplate) => {
    onTemplateSelected({
      items: template.template_data?.items || [],
      payment_terms: template.template_data?.payment_terms || '',
      notes: template.template_data?.notes || '',
    });
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <View className="space-y-6">
      <View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Choose Template
        </Text>
        <Text className="text-gray-600">
          Select a template to start with, or skip to create from scratch
        </Text>
      </View>

      {templates.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="space-y-4">
            {templates.map((template) => (
              <TouchableOpacity
                key={template.id}
                onPress={() => handleTemplateSelect(template)}
                className="active:opacity-70"
              >
                <Card className="p-4 border-2 border-transparent hover:border-blue-500 transition-colors">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900">
                        {template.name}
                      </Text>
                      {template.description && (
                        <Text className="text-gray-600 text-sm mt-1">
                          {template.description}
                        </Text>
                      )}
                    </View>
                    
                    {template.is_default && (
                      <View className="bg-blue-100 px-2 py-1 rounded-full">
                        <Text className="text-blue-800 text-xs font-medium">Default</Text>
                      </View>
                    )}
                  </View>

                  {/* Template Preview */}
                  {template.template_data?.items && (
                    <View className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <Text className="font-medium text-gray-900 mb-2">
                        Items ({template.template_data.items.length}):
                      </Text>
                      {template.template_data.items.slice(0, 3).map((item: any, index: number) => (
                        <View key={index} className="flex-row justify-between items-center py-1">
                          <Text className="text-gray-700 text-sm flex-1">{item.description}</Text>
                          <Text className="text-gray-600 text-sm">
                            {formatCurrency(item.unit_price)}
                          </Text>
                        </View>
                      ))}
                      {template.template_data.items.length > 3 && (
                        <Text className="text-gray-500 text-xs mt-1">
                          +{template.template_data.items.length - 3} more items
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Template Stats */}
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-gray-200">
                    <Text className="text-gray-500 text-sm">
                      Last updated: {new Date(template.updated_at).toLocaleDateString()}
                    </Text>
                    <View className="flex-row items-center space-x-1">
                      <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                      <Text className="text-blue-600 font-medium text-sm">Use Template</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      ) : (
        // Empty state
        <View className="flex-1 items-center justify-center py-12">
          <View className="items-center space-y-4">
            <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center">
              <Ionicons name="document-outline" size={32} color="#9CA3AF" />
            </View>
            <Text className="text-lg font-semibold text-gray-900">No Templates Yet</Text>
            <Text className="text-gray-600 text-center leading-relaxed max-w-sm">
              You can create invoice templates after creating your first invoice to speed up future billing.
            </Text>
          </View>
        </View>
      )}

      {/* Skip Button */}
      <View className="pt-4 border-t border-gray-200">
        <Button onPress={onSkip} variant="outline" className="w-full">
          <View className="flex-row items-center justify-center space-x-2">
            <Ionicons name="add-circle-outline" size={16} color="#3B82F6" />
            <Text className="text-blue-600 font-medium">Start from Scratch</Text>
          </View>
        </Button>
      </View>

      {/* Create Template Hint */}
      <View className="bg-blue-50 p-4 rounded-lg">
        <View className="flex-row items-start space-x-3">
          <Ionicons name="bulb-outline" size={20} color="#3B82F6" />
          <View className="flex-1">
            <Text className="font-medium text-blue-900 mb-1">Pro Tip</Text>
            <Text className="text-blue-800 text-sm leading-relaxed">
              After creating an invoice, you can save it as a template for recurring fees like monthly tuition, 
              registration fees, or activity fees.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}