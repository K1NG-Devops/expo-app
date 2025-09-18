import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { Controller, useFormContext, useFieldArray } from 'react-hook-form';
import { Ionicons } from '@expo/vector-icons';

import { TextInput, Select, Card, Button } from '../../../components/ui';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  item_type?: string;
}

const ITEM_TYPES = [
  { label: 'Service', value: 'service' },
  { label: 'Product', value: 'product' },
  { label: 'Fee', value: 'fee' },
  { label: 'Tuition', value: 'tuition' },
  { label: 'Activity', value: 'activity' },
  { label: 'Materials', value: 'materials' },
  { label: 'Other', value: 'other' },
];

const COMMON_ITEMS = [
  { description: 'Monthly Tuition Fee', unit_price: 1500, item_type: 'tuition' },
  { description: 'Registration Fee', unit_price: 500, item_type: 'fee' },
  { description: 'Activity Fee', unit_price: 200, item_type: 'activity' },
  { description: 'Materials Fee', unit_price: 150, item_type: 'materials' },
  { description: 'Uniform', unit_price: 300, item_type: 'product' },
  { description: 'School Bag', unit_price: 180, item_type: 'product' },
  { description: 'Stationery Pack', unit_price: 120, item_type: 'materials' },
];

export function LineItemsEditor() {
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext();

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'items',
  });

  const items = watch('items') as LineItem[];

  const calculateLineTotal = (item: LineItem) => {
    const subtotal = item.quantity * item.unit_price;
    const taxRate = (item.tax_rate || 0) / 100;
    const taxAmount = subtotal * taxRate;
    return subtotal + taxAmount;
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const calculateTotalTax = () => {
    return items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unit_price;
      const taxRate = (item.tax_rate || 0) / 100;
      return sum + (subtotal * taxRate);
    }, 0);
  };

  const addNewItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 15,
      item_type: 'service',
    });
  };

  const addCommonItem = (commonItem: typeof COMMON_ITEMS[0]) => {
    append({
      description: commonItem.description,
      quantity: 1,
      unit_price: commonItem.unit_price,
      tax_rate: 15,
      item_type: commonItem.item_type,
    });
  };

  const removeItem = (index: number) => {
    if (fields.length === 1) {
      Alert.alert('Cannot Remove', 'At least one line item is required.');
      return;
    }
    
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this line item?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => remove(index) },
      ]
    );
  };

  const formatCurrency = (amount: number) => {
    return `R ${amount.toFixed(2)}`;
  };

  return (
    <View className="space-y-6">
      <View>
        <Text className="text-xl font-bold text-gray-900 mb-2">
          Line Items
        </Text>
        <Text className="text-gray-600">
          Add products, services, or fees to this invoice
        </Text>
      </View>

      {/* Quick Add Common Items */}
      <Card className="p-4">
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Quick Add Common Items
        </Text>
        <View className="flex-row flex-wrap">
          {COMMON_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => addCommonItem(item)}
              className="bg-blue-100 px-3 py-2 rounded-full mr-2 mb-2"
            >
              <Text className="text-blue-800 text-sm font-medium">
                {item.description} - {formatCurrency(item.unit_price)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Line Items */}
      <View className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id} className="p-4">
            <View className="flex-row items-start justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Item #{index + 1}
              </Text>
              <TouchableOpacity
                onPress={() => removeItem(index)}
                className="p-2 rounded-full bg-red-100"
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              {/* Description */}
              <Controller
                control={control}
                name={`items.${index}.description`}
                render={({ field: { onChange, onBlur, value } }) => (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </Text>
                    <TextInput
                      placeholder="Enter item description"
                      value={value}
                      onBlur={onBlur}
                      onChangeText={onChange}
                      error={errors.items?.[index]?.description?.message}
                    />
                  </View>
                )}
              />

              {/* Type */}
              <Controller
                control={control}
                name={`items.${index}.item_type`}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Item Type
                    </Text>
                    <Select
                      placeholder="Select type"
                      options={ITEM_TYPES}
                      value={value || 'service'}
                      onSelect={onChange}
                    />
                  </View>
                )}
              />

              {/* Quantity and Price Row */}
              <View className="flex-row space-x-3">
                <Controller
                  control={control}
                  name={`items.${index}.quantity`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </Text>
                      <TextInput
                        placeholder="1"
                        value={value?.toString() || ''}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          const num = parseFloat(text) || 0;
                          onChange(num);
                        }}
                        keyboardType="numeric"
                        error={errors.items?.[index]?.quantity?.message}
                      />
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name={`items.${index}.unit_price`}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <View className="flex-2">
                      <Text className="text-sm font-medium text-gray-700 mb-2">
                        Unit Price (R) *
                      </Text>
                      <TextInput
                        placeholder="0.00"
                        value={value?.toString() || ''}
                        onBlur={onBlur}
                        onChangeText={(text) => {
                          const num = parseFloat(text) || 0;
                          onChange(num);
                        }}
                        keyboardType="numeric"
                        error={errors.items?.[index]?.unit_price?.message}
                      />
                    </View>
                  )}
                />
              </View>

              {/* Tax Rate */}
              <Controller
                control={control}
                name={`items.${index}.tax_rate`}
                render={({ field: { onChange, value } }) => (
                  <View>
                    <Text className="text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </Text>
                    <Select
                      placeholder="Select tax rate"
                      options={[
                        { label: 'No Tax (0%)', value: '0' },
                        { label: 'Standard VAT (15%)', value: '15' },
                        { label: 'Custom Rate', value: 'custom' },
                      ]}
                      value={(value || 15).toString()}
                      onSelect={(selectedValue) => {
                        if (selectedValue === 'custom') {
                          // Show custom input
                          onChange(value || 15);
                        } else {
                          onChange(parseFloat(selectedValue));
                        }
                      }}
                      allowCustom
                      customPlaceholder="Enter custom rate..."
                    />
                  </View>
                )}
              />

              {/* Line Total */}
              <View className="bg-gray-50 p-3 rounded-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm font-medium text-gray-700">
                    Line Total (incl. tax):
                  </Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {formatCurrency(calculateLineTotal(items[index] || {
                      quantity: 0,
                      unit_price: 0,
                      tax_rate: 0,
                      description: '',
                    }))}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ))}
      </View>

      {/* Add Item Button */}
      <Button
        onPress={addNewItem}
        variant="outline"
        className="border-blue-500 border-2"
      >
        <View className="flex-row items-center space-x-2">
          <Ionicons name="add" size={20} color="#3B82F6" />
          <Text className="text-blue-600 font-medium">Add Another Item</Text>
        </View>
      </Button>

      {/* Invoice Totals */}
      <Card className="p-4 bg-gray-50">
        <Text className="text-lg font-semibold text-gray-900 mb-4">
          Invoice Summary
        </Text>
        
        <View className="space-y-2">
          <View className="flex-row justify-between">
            <Text className="text-gray-700">Subtotal:</Text>
            <Text className="text-gray-900 font-medium">
              {formatCurrency(calculateSubtotal())}
            </Text>
          </View>
          
          <View className="flex-row justify-between">
            <Text className="text-gray-700">Total Tax:</Text>
            <Text className="text-gray-900 font-medium">
              {formatCurrency(calculateTotalTax())}
            </Text>
          </View>
          
          <View className="h-px bg-gray-300 my-2" />
          
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-gray-900">Total:</Text>
            <Text className="text-lg font-bold text-blue-600">
              {formatCurrency(calculateGrandTotal())}
            </Text>
          </View>
        </View>
      </Card>

      {/* Validation Errors */}
      {errors.items && (
        <Card className="p-4 bg-red-50 border-red-200">
          <View className="flex-row items-center space-x-2">
            <Ionicons name="warning" size={20} color="#EF4444" />
            <Text className="font-semibold text-red-800">
              Line Items Required
            </Text>
          </View>
          <Text className="text-red-700 text-sm mt-1">
            {errors.items.message as string || 'Please add at least one line item to continue.'}
          </Text>
        </Card>
      )}
    </View>
  );
}