import React from 'react';
import { View, Text } from 'react-native';
import { Controller, useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';

import { TextInput, DatePicker, Select, Card } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  parent_id?: string;
  guardian_id?: string;
}

export function InvoiceHeader() {
  const { profile } = useAuth();
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext();

  const issue_date = watch('issue_date');

  // Fetch students for the school
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students', profile?.preschool_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          parent_id,
          guardian_id
        `)
        .eq('preschool_id', profile!.preschool_id!)
        .order('first_name');

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!profile?.preschool_id,
  });

  // Auto-update due date when issue date changes
  React.useEffect(() => {
    if (issue_date) {
      const dueDate = new Date(issue_date);
      dueDate.setDate(dueDate.getDate() + 30); // Default 30 days
      setValue('due_date', dueDate);
    }
  }, [issue_date, setValue]);

  const studentOptions = students.map(student => ({
    label: `${student.first_name} ${student.last_name}`,
    value: student.id,
  }));

  return (
    <View className="space-y-6">
      <View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Invoice Details
        </Text>
        <Text className="text-gray-600">
          Enter the basic information for this invoice
        </Text>
      </View>

      {/* Student Selection */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Student Information
        </Text>
        
        <Controller
          control={control}
          name="student_id"
          render={({ field: { onChange, value } }) => (
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Select Student *
              </Text>
              <Select
                placeholder="Choose a student..."
                options={studentOptions}
                value={value}
                onSelect={onChange}
                loading={loadingStudents}
                searchable
                searchPlaceholder="Search students..."
              />
              {errors.student_id && (
                <Text className="text-red-500 text-sm mt-1">
                  {errors.student_id.message as string}
                </Text>
              )}
            </View>
          )}
        />
      </Card>

      {/* Date Information */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Date Information
        </Text>
        
        <View className="space-y-4">
          <Controller
            control={control}
            name="issue_date"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Issue Date *
                </Text>
                <DatePicker
                  value={value}
                  onDateChange={onChange}
                  mode="date"
                />
                {errors.issue_date && (
                  <Text className="text-red-500 text-sm mt-1">
                    {errors.issue_date.message as string}
                  </Text>
                )}
              </View>
            )}
          />

          <Controller
            control={control}
            name="due_date"
            render={({ field: { onChange, value } }) => (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </Text>
                <DatePicker
                  value={value}
                  onDateChange={onChange}
                  mode="date"
                  minimumDate={issue_date || new Date()}
                />
                {errors.due_date && (
                  <Text className="text-red-500 text-sm mt-1">
                    {errors.due_date.message as string}
                  </Text>
                )}
              </View>
            )}
          />
        </View>
      </Card>

      {/* Payment Terms */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Payment Information
        </Text>
        
        <View className="space-y-4">
          <Controller
            control={control}
            name="payment_terms"
            render={({ field: { onChange, onBlur, value } }) => (
              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </Text>
                <Select
                  placeholder="Select payment terms..."
                  options={[
                    { label: 'Due on receipt', value: 'Due on receipt' },
                    { label: 'Net 7 days', value: 'Net 7 days' },
                    { label: 'Net 15 days', value: 'Net 15 days' },
                    { label: 'Net 30 days', value: 'Net 30 days' },
                    { label: 'Net 60 days', value: 'Net 60 days' },
                    { label: 'Monthly', value: 'Monthly' },
                    { label: 'Quarterly', value: 'Quarterly' },
                  ]}
                  value={value || ''}
                  onSelect={onChange}
                  allowCustom
                  customPlaceholder="Enter custom terms..."
                />
              </View>
            )}
          />
        </View>
      </Card>

      {/* Notes */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Additional Information
        </Text>
        
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </Text>
              <TextInput
                placeholder="Add any additional notes or instructions..."
                value={value || ''}
                onBlur={onBlur}
                onChangeText={onChange}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          )}
        />
      </Card>

      {/* Quick Stats */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-medium text-blue-900">
              Days to Payment
            </Text>
            <Text className="text-2xl font-bold text-blue-600">
              {issue_date && watch('due_date') ? 
                Math.ceil((new Date(watch('due_date')).getTime() - new Date(issue_date).getTime()) / (1000 * 60 * 60 * 24))
                : '30'
              }
            </Text>
          </View>
          
          <View className="items-end">
            <Text className="text-sm font-medium text-blue-900">
              Invoice Number
            </Text>
            <Text className="text-lg font-semibold text-blue-600">
              Auto-generated
            </Text>
          </View>
        </View>
      </Card>
    </View>
  );
}