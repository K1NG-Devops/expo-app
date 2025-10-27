import React from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { TextInput, Button, Card, LoadingSpinner } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { invoiceService } from '../../../services/invoiceService';
import { SchoolBranding } from '../../../types/invoice';
import { LogoUploader } from './LogoUploader';
import { ColorPicker } from './ColorPicker';
import { PreviewCard } from './PreviewCard';
import { PaymentMethodsConfig } from './PaymentMethodsConfig';

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  secondary_color: z.string().regex(/^#[0-9A-F]{6}$/i, 'Invalid hex color'),
  font_family: z.string().min(1, 'Font family is required'),
  letterhead_html: z.string().optional(),
  footer_text: z.string().optional(),
  payment_terms: z.string().optional(),
  tax_number: z.string().optional(),
  accepted_payment_methods: z.array(z.string()),
  bank_details: z.object({
    bank_name: z.string().optional(),
    account_holder: z.string().optional(),
    account_number: z.string().optional(),
    branch_code: z.string().optional(),
  }).optional(),
});

type BrandingFormData = z.infer<typeof brandingSchema>;

interface SchoolBrandingFormProps {
  onSave?: () => void;
}

export function SchoolBrandingForm({ onSave }: SchoolBrandingFormProps) {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<BrandingFormData>({
    resolver: zodResolver(brandingSchema),
    defaultValues: {
      primary_color: '#3B82F6',
      secondary_color: '#64748B',
      font_family: 'Inter',
      payment_terms: '30 days',
      accepted_payment_methods: ['cash', 'bank_transfer'],
    },
  });

  const watchedValues = watch();

  // Fetch existing branding
  const { data: branding, isLoading } = useQuery({
    queryKey: ['school-branding', profile?.preschool_id],
    queryFn: () => invoiceService.getSchoolBranding(profile!.preschool_id!),
    enabled: !!profile?.preschool_id,
    onSuccess: (data) => {
      if (data) {
        // Populate form with existing data
        Object.entries(data).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            setValue(key as keyof BrandingFormData, value as any);
          }
        });
      }
    }
  });

  // Save branding mutation
  const saveBrandingMutation = useMutation({
    mutationFn: (data: Partial<SchoolBranding>) => 
      invoiceService.saveSchoolBranding(profile!.preschool_id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['school-branding']);
      Alert.alert('Success', 'School branding saved successfully');
      onSave?.();
    },
    onError: (error) => {
      Alert.alert('Error', `Failed to save branding: ${_error.message}`);
    }
  });

  const handleSave = async (data: BrandingFormData) => {
    try {
      await saveBrandingMutation.mutateAsync({
        ...data,
        preschool_id: profile!.preschool_id!,
      });
    } catch (_error) {
      console.error('Error saving branding:', _error);
    }
  };

  const handleLogoUpload = (logoUrl: string) => {
    setValue('logo_url' as any, logoUrl);
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-6">
        <View>
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            School Branding
          </Text>
          <Text className="text-gray-600">
            Customize your school's visual identity for invoices and documents
          </Text>
        </View>

        {/* Logo Upload Section */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            School Logo
          </Text>
          <LogoUploader
            currentLogo={branding?.logo_url}
            onUpload={handleLogoUpload}
          />
        </Card>

        {/* Colors Section */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Brand Colors
          </Text>
          <View className="space-y-4">
            <Controller
              control={control}
              name="primary_color"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Primary Color
                  </Text>
                  <ColorPicker
                    value={value}
                    onChange={onChange}
                    label="Primary Color"
                  />
                  {errors.primary_color && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.primary_color.message}
                    </Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="secondary_color"
              render={({ field: { onChange, value } }) => (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Secondary Color
                  </Text>
                  <ColorPicker
                    value={value}
                    onChange={onChange}
                    label="Secondary Color"
                  />
                  {errors.secondary_color && (
                    <Text className="text-red-500 text-xs mt-1">
                      {errors.secondary_color.message}
                    </Text>
                  )}
                </View>
              )}
            />
          </View>
        </Card>

        {/* Typography Section */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Typography
          </Text>
          <Controller
            control={control}
            name="font_family"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Font Family
                </Text>
                <TextInput
                  placeholder="e.g., Inter, Roboto, Open Sans"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  error={errors.font_family?.message}
                />
              </View>
            )}
          />
        </Card>

        {/* Business Information */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Business Information
          </Text>
          <View className="space-y-4">
            <Controller
              control={control}
              name="tax_number"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    VAT/Tax Number
                  </Text>
                  <TextInput
                    placeholder="Enter VAT registration number"
                    value={value || ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="payment_terms"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </Text>
                  <TextInput
                    placeholder="e.g., 30 days, Due on receipt"
                    value={value || ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="footer_text"
              render={({ field: { onChange, onBlur, value } }) => (
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Invoice Footer Text
                  </Text>
                  <TextInput
                    placeholder="Thank you for your business"
                    value={value || ''}
                    onBlur={onBlur}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            />
          </View>
        </Card>

        {/* Payment Methods Configuration */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Payment Methods
          </Text>
          <Controller
            control={control}
            name="accepted_payment_methods"
            render={({ field: { onChange, value } }) => (
              <PaymentMethodsConfig
                selectedMethods={value}
                onChange={onChange}
              />
            )}
          />
        </Card>

        {/* Preview Section */}
        <Card className="p-4">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Preview
          </Text>
          <PreviewCard
            branding={{
              ...watchedValues,
              logo_url: branding?.logo_url,
              preschool_id: profile?.preschool_id!,
            } as SchoolBranding}
          />
        </Card>

        {/* Save Button */}
        <Button
          onPress={handleSubmit(handleSave)}
          loading={isSubmitting || saveBrandingMutation.isLoading}
          className="bg-blue-600"
        >
          <Text className="text-white font-semibold">Save Branding Settings</Text>
        </Button>
      </View>
    </ScrollView>
  );
}