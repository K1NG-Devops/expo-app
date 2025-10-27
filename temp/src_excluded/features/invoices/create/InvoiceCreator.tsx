import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useForm, FormProvider } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Button, ProgressBar, Card } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { invoiceService } from '../../../services/invoiceService';
import { Invoice, InvoiceItem, InvoiceStatus } from '../../../types/invoice';

import { InvoiceHeader } from './InvoiceHeader';
import { LineItemsEditor } from './LineItemsEditor';
import { InvoicePreview } from './InvoicePreview';
import { TemplateSelector } from './TemplateSelector';
import { InvoiceSummary } from './InvoiceSummary';

// Form validation schema
const invoiceSchema = z.object({
  student_id: z.string().uuid('Please select a student'),
  issue_date: z.date(),
  due_date: z.date(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  template_id: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().min(0.01, 'Quantity must be greater than 0'),
    unit_price: z.number().min(0, 'Unit price must be positive'),
    tax_rate: z.number().min(0).max(100).optional(),
    item_type: z.string().optional(),
  })).min(1, 'At least one line item is required'),
});

type InvoiceFormData = z.infer<typeof invoiceSchema>;

interface InvoiceCreatorProps {
  editingInvoice?: Invoice;
  onClose?: () => void;
}

const STEPS = [
  { id: 'template', title: 'Template', description: 'Choose a template (optional)' },
  { id: 'details', title: 'Details', description: 'Invoice information' },
  { id: 'items', title: 'Line Items', description: 'Add products/services' },
  { id: 'summary', title: 'Summary', description: 'Review totals' },
  { id: 'preview', title: 'Preview', description: 'Final review' },
];

export function InvoiceCreator({ editingInvoice, onClose }: InvoiceCreatorProps) {
  const { profile } = useAuth();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [autoSaveKey, setAutoSaveKey] = useState('');

  const formMethods = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      issue_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 15, // Default South African VAT
          item_type: 'service',
        }
      ],
    },
    mode: 'onChange',
  });

  const { watch, trigger, getValues, setValue } = formMethods;
  const watchedData = watch();

  // Initialize auto-save key
  useEffect(() => {
    const key = editingInvoice 
      ? `invoice-edit-${_editingInvoice.id}` 
      : `invoice-draft-${Date.now()}`;
    setAutoSaveKey(key);
  }, [editingInvoice]);

  // Load existing invoice data or draft
  useEffect(() => {
    const loadData = async () => {
      if (editingInvoice) {
        // Load existing invoice for editing
        setValue('student_id', editingInvoice.student_id);
        setValue('issue_date', new Date(editingInvoice.issue_date));
        setValue('due_date', new Date(editingInvoice.due_date));
        setValue('payment_terms', editingInvoice.payment_terms || '');
        setValue('notes', editingInvoice.notes || '');
        
        // Load items from API
        const items = await invoiceService.getInvoiceItems(editingInvoice.id);
        setValue('items', items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate || 15,
          item_type: item.item_type || 'service',
        })));
      } else if (autoSaveKey) {
        // Load auto-saved draft
        try {
          const savedDraft = await AsyncStorage.getItem(autoSaveKey);
          if (savedDraft) {
            const draft = JSON.parse(savedDraft);
            Object.entries(draft).forEach(([key, value]) => {
              if (key === 'issue_date' || key === 'due_date') {
                setValue(key as keyof InvoiceFormData, new Date(value as string) as any);
              } else {
                setValue(key as keyof InvoiceFormData, value as any);
              }
            });
          }
        } catch (_error) {
          console.error('Error loading draft:', _error);
        }
      }
    };

    loadData();
  }, [editingInvoice, autoSaveKey, setValue]);

  // Auto-save functionality
  useEffect(() => {
    const saveTimer = setTimeout(async () => {
      if (autoSaveKey && watchedData.items?.length > 0) {
        try {
          await AsyncStorage.setItem(autoSaveKey, JSON.stringify(watchedData));
        } catch (_error) {
          console.error('Error auto-saving:', _error);
        }
      }
    }, 2000); // Save after 2 seconds of inactivity

    return () => clearTimeout(saveTimer);
  }, [watchedData, autoSaveKey]);

  // Create/update invoice mutation
  const saveInvoiceMutation = useMutation({
    mutationFn: async (data: InvoiceFormData & { status: InvoiceStatus }) => {
      const invoiceData = {
        ...data,
        preschool_id: profile!.preschool_id!,
        created_by: profile!.id,
      };

      if (editingInvoice) {
        return await invoiceService.updateInvoice(editingInvoice.id, invoiceData);
      } else {
        return await invoiceService.createInvoice(invoiceData);
      }
    },
    onSuccess: async (invoice) => {
      // Clear auto-save
      if (autoSaveKey) {
        await AsyncStorage.removeItem(autoSaveKey);
      }
      
      // Invalidate queries
      queryClient.invalidateQueries(['invoices']);
      
      // Navigate back or close
      if (onClose) {
        onClose();
      } else {
        navigation.goBack();
      }
      
      Alert.alert('Success', 'Invoice saved successfully');
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to save invoice: ${_error.message}`);
    },
  });

  const handleNext = async () => {
    const stepFields = getStepFields(currentStep);
    const isValid = await trigger(stepFields);
    
    if (isValid && currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    const data = getValues();
    await saveInvoiceMutation.mutateAsync({ ...data, status: 'draft' });
  };

  const handleSendInvoice = async () => {
    const isValid = await trigger();
    if (isValid) {
      const data = getValues();
      await saveInvoiceMutation.mutateAsync({ ...data, status: 'sent' });
    }
  };

  const handleTemplateSelected = (templateData: any) => {
    if (templateData.items) {
      setValue('items', templateData.items);
    }
    if (templateData.payment_terms) {
      setValue('payment_terms', templateData.payment_terms);
    }
    setCurrentStep(1); // Move to details step
  };

  const getStepFields = (step: number): (keyof InvoiceFormData)[] => {
    switch (step) {
      case 0: return []; // Template selection - no validation
      case 1: return ['student_id', 'issue_date', 'due_date'];
      case 2: return ['items'];
      case 3: return []; // Summary - no additional validation
      case 4: return []; // Preview - final validation handled separately
      default: return [];
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <TemplateSelector
            onTemplateSelected={handleTemplateSelected}
            onSkip={() => setCurrentStep(1)}
          />
        );
      case 1:
        return <InvoiceHeader />;
      case 2:
        return <LineItemsEditor />;
      case 3:
        return <InvoiceSummary />;
      case 4:
        return <InvoicePreview />;
      default:
        return null;
    }
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <FormProvider {...formMethods}>
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <Card className="p-4 border-b border-gray-200 bg-white">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">
              {editingInvoice ? 'Edit Invoice' : 'Create Invoice'}
            </Text>
            {onClose && (
              <Button variant="ghost" onPress={onClose}>
                <Text>Cancel</Text>
              </Button>
            )}
          </View>

          {/* Progress */}
          <View className="space-y-2">
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">
                {STEPS[currentStep].title}
              </Text>
              <Text className="text-sm text-gray-500">
                Step {currentStep + 1} of {STEPS.length}
              </Text>
            </View>
            <ProgressBar progress={progress} />
            <Text className="text-sm text-gray-600">
              {STEPS[currentStep].description}
            </Text>
          </View>
        </Card>

        {/* Content */}
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="p-4">
            {renderCurrentStep()}
          </View>
        </ScrollView>

        {/* Navigation */}
        <Card className="p-4 border-t border-gray-200 bg-white">
          <View className="flex-row justify-between space-x-3">
            {/* Previous Button */}
            <Button
              variant="outline"
              onPress={handlePrevious}
              disabled={currentStep === 0}
              className="flex-1"
            >
              <Text>Previous</Text>
            </Button>

            {/* Save Draft */}
            <Button
              variant="outline"
              onPress={handleSaveDraft}
              loading={saveInvoiceMutation.isLoading}
              className="flex-1"
            >
              <Text>Save Draft</Text>
            </Button>

            {/* Next/Finish */}
            {currentStep < STEPS.length - 1 ? (
              <Button
                onPress={handleNext}
                className="flex-1 bg-blue-600"
              >
                <Text className="text-white">Next</Text>
              </Button>
            ) : (
              <Button
                onPress={handleSendInvoice}
                loading={saveInvoiceMutation.isLoading}
                className="flex-1 bg-green-600"
              >
                <Text className="text-white">Send Invoice</Text>
              </Button>
            )}
          </View>
        </Card>
      </View>
    </FormProvider>
  );
}