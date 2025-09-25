import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';

import { TextInput, DatePicker, Select, Button, Card } from '../../../components/ui';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { InvoiceFilters as IInvoiceFilters, InvoiceStatus } from '../../../types/invoice';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onFiltersChange: (filters: IInvoiceFilters) => void;
  visible: boolean;
  onToggle: () => void;
  resultCount: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
}

const STATUS_OPTIONS = [
  { label: 'Draft', value: 'draft', color: '#6B7280' },
  { label: 'Sent', value: 'sent', color: '#3B82F6' },
  { label: 'Viewed', value: 'viewed', color: '#8B5CF6' },
  { label: 'Partial', value: 'partial', color: '#F59E0B' },
  { label: 'Paid', value: 'paid', color: '#10B981' },
  { label: 'Overdue', value: 'overdue', color: '#EF4444' },
  { label: 'Cancelled', value: 'cancelled', color: '#6B7280' },
];

const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'This Quarter', value: 'this_quarter' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Custom Range', value: 'custom' },
];

export function InvoiceFilters({
  filters,
  onFiltersChange,
  visible,
  onToggle,
  resultCount,
}: InvoiceFiltersProps) {
  const { profile } = useAuth();
  const [animatedHeight] = useState(new Animated.Value(0));
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [selectedDatePreset, setSelectedDatePreset] = useState('');

  // Fetch students for filtering
  const { data: students = [] } = useQuery({
    queryKey: ['students', profile?.preschool_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('preschool_id', profile!.preschool_id!)
        .order('first_name');

      if (error) throw error;
      return data as Student[];
    },
    enabled: !!profile?.preschool_id,
  });

  // Animate filter panel
  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: visible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [visible]);

  const handleStatusToggle = (status: InvoiceStatus) => {
    const currentStatuses = filters.status || [];
    let newStatuses: InvoiceStatus[];

    if (currentStatuses.includes(status)) {
      newStatuses = currentStatuses.filter(s => s !== status);
    } else {
      newStatuses = [...currentStatuses, status];
    }

    onFiltersChange({
      ...filters,
      status: newStatuses,
    });
  };

  const handleStudentToggle = (studentId: string) => {
    const currentStudents = filters.student_ids || [];
    let newStudents: string[];

    if (currentStudents.includes(studentId)) {
      newStudents = currentStudents.filter(id => id !== studentId);
    } else {
      newStudents = [...currentStudents, studentId];
    }

    onFiltersChange({
      ...filters,
      student_ids: newStudents,
    });
  };

  const handleDatePresetSelect = (preset: string) => {
    setSelectedDatePreset(preset);
    
    if (preset === 'custom') {
      setShowCustomDateRange(true);
      return;
    }

    setShowCustomDateRange(false);
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    switch (preset) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;
      case 'this_week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startDate = startOfWeek;
        endDate = new Date();
        break;
      }
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
        break;
      case 'last_30_days':
        startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        endDate = new Date();
        break;
      case 'this_quarter': {
        const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
        endDate = new Date();
        break;
      }
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date();
        break;
    }

    onFiltersChange({
      ...filters,
      date_range: {
        start_date: startDate,
        end_date: endDate,
      },
    });
  };

  const clearFilters = () => {
    setSelectedDatePreset('');
    setShowCustomDateRange(false);
    onFiltersChange({
      status: [],
      date_range: {
        start_date: null,
        end_date: null,
      },
      student_ids: [],
      search: '',
    });
  };

  const hasActiveFilters = () => {
    return (
      (filters.status?.length || 0) > 0 ||
      filters.date_range?.start_date ||
      filters.date_range?.end_date ||
      (filters.student_ids?.length || 0) > 0 ||
      (filters.search?.length || 0) > 0
    );
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status?.length) count += filters.status.length;
    if (filters.date_range?.start_date || filters.date_range?.end_date) count += 1;
    if (filters.student_ids?.length) count += filters.student_ids.length;
    if (filters.search) count += 1;
    return count;
  };

  return (
    <View>
      {/* Filter Toggle Button */}
      <TouchableOpacity
        onPress={onToggle}
        className="flex-row items-center justify-between p-4 bg-gray-50"
      >
        <View className="flex-row items-center space-x-3">
          <Ionicons name="filter-outline" size={20} color="#6B7280" />
          <Text className="text-gray-700 font-medium">
            Filters
            {hasActiveFilters() && (
              <Text className="text-blue-600"> ({getActiveFiltersCount()} active)</Text>
            )}
          </Text>
        </View>
        
        <View className="flex-row items-center space-x-2">
          <Text className="text-gray-500 text-sm">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </Text>
          <Ionicons 
            name={visible ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#6B7280" 
          />
        </View>
      </TouchableOpacity>

      {/* Filter Panel */}
      <Animated.View
        style={{
          opacity: animatedHeight,
          transform: [
            {
              scaleY: animatedHeight,
            },
          ],
        }}
        className="overflow-hidden"
      >
        <View className="p-4 bg-white border-b border-gray-200">
          {/* Search */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              Search Invoices
            </Text>
            <TextInput
              placeholder="Search by invoice number, student name..."
              value={filters.search || ''}
              onChangeText={(text) => onFiltersChange({ ...filters, search: text })}
              leftIcon="search-outline"
            />
          </View>

          {/* Status Filter */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Status ({(filters.status?.length || 0)} selected)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-2">
              <View className="flex-row space-x-2">
                {STATUS_OPTIONS.map((status) => {
                  const isSelected = filters.status?.includes(status.value as InvoiceStatus);
                  return (
                    <TouchableOpacity
                      key={status.value}
                      onPress={() => handleStatusToggle(status.value as InvoiceStatus)}
                      className={`px-3 py-2 rounded-full border flex-row items-center space-x-1 ${
                        isSelected
                          ? 'bg-blue-100 border-blue-500'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <View
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                      <Text className={`text-sm font-medium ${
                        isSelected ? 'text-blue-800' : 'text-gray-700'
                      }`}>
                        {status.label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={14} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Date Range Filter */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-3">
              Date Range
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="space-x-2 mb-3">
              <View className="flex-row space-x-2">
                {DATE_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    onPress={() => handleDatePresetSelect(preset.value)}
                    className={`px-3 py-2 rounded-lg border ${
                      selectedDatePreset === preset.value
                        ? 'bg-blue-100 border-blue-500'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text className={`text-sm font-medium ${
                      selectedDatePreset === preset.value ? 'text-blue-800' : 'text-gray-700'
                    }`}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Custom Date Range */}
            {(showCustomDateRange || (filters.date_range?.start_date && selectedDatePreset !== 'custom')) && (
              <View className="flex-row space-x-3">
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">Start Date</Text>
                  <DatePicker
                    value={filters.date_range?.start_date}
                    onDateChange={(date) => onFiltersChange({
                      ...filters,
                      date_range: {
                        ...filters.date_range,
                        start_date: date,
                      },
                    })}
                    mode="date"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-gray-500 mb-1">End Date</Text>
                  <DatePicker
                    value={filters.date_range?.end_date}
                    onDateChange={(date) => onFiltersChange({
                      ...filters,
                      date_range: {
                        ...filters.date_range,
                        end_date: date,
                      },
                    })}
                    mode="date"
                    minimumDate={filters.date_range?.start_date || undefined}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Student Filter */}
          {students.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-3">
                Students ({(filters.student_ids?.length || 0)} selected)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row space-x-2">
                  {students.map((student) => {
                    const isSelected = filters.student_ids?.includes(student.id);
                    return (
                      <TouchableOpacity
                        key={student.id}
                        onPress={() => handleStudentToggle(student.id)}
                        className={`px-3 py-2 rounded-full border ${
                          isSelected
                            ? 'bg-green-100 border-green-500'
                            : 'bg-white border-gray-300'
                        }`}
                      >
                        <Text className={`text-sm font-medium ${
                          isSelected ? 'text-green-800' : 'text-gray-700'
                        }`}>
                          {student.first_name} {student.last_name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row justify-between items-center pt-4 border-t border-gray-200">
            <Button
              onPress={clearFilters}
              variant="outline"
              disabled={!hasActiveFilters()}
            >
              <Text className="text-gray-600">Clear All</Text>
            </Button>
            
            <Text className="text-sm text-gray-500">
              {resultCount} invoice{resultCount !== 1 ? 's' : ''} found
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}