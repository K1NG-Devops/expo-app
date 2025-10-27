import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TextInput } from '../../../components/ui';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

// Predefined color palette for schools
const PRESET_COLORS = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Slate', value: '#64748B' },
];

export function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [customColor, setCustomColor] = useState(value);

  const handleColorSelect = (color: string) => {
    onChange(color);
    setCustomColor(color);
    setModalVisible(false);
  };

  const handleCustomColorSubmit = () => {
    if (/^#[0-9A-F]{6}$/i.test(customColor)) {
      onChange(customColor);
      setModalVisible(false);
    }
  };

  const isValidHex = (color: string) => /^#[0-9A-F]{6}$/i.test(color);

  return (
    <>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        className="flex-row items-center space-x-3 p-3 bg-white border border-gray-300 rounded-lg"
      >
        {/* Color Preview */}
        <View
          className="w-8 h-8 rounded-full border-2 border-gray-300"
          style={{ backgroundColor: value }}
        />
        
        {/* Color Value */}
        <View className="flex-1">
          <Text className="text-gray-900 font-medium">{value.toUpperCase()}</Text>
          <Text className="text-gray-500 text-sm">
            {PRESET_COLORS.find(c => c.value === value)?.name || 'Custom'}
          </Text>
        </View>

        {/* Chevron Icon */}
        <Ionicons name="chevron-forward" size={20} color="#6B7280" />
      </TouchableOpacity>

      {/* Color Picker Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          {/* Header */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <Text className="text-lg font-semibold text-gray-900">
              Select {label}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 p-4">
            {/* Current Color Display */}
            <View className="items-center mb-6">
              <View
                className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                style={{ backgroundColor: value }}
              />
              <Text className="mt-2 text-lg font-semibold text-gray-900">
                {value.toUpperCase()}
              </Text>
            </View>

            {/* Preset Colors Grid */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-3">
                Preset Colors
              </Text>
              <View className="flex-row flex-wrap">
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    onPress={() => handleColorSelect(color.value)}
                    className="p-2 m-1"
                  >
                    <View
                      className={`w-12 h-12 rounded-full border-4 ${
                        value === color.value ? 'border-gray-800' : 'border-gray-200'
                      }`}
                      style={{ backgroundColor: color.value }}
                    />
                    <Text className="text-xs text-center mt-1 text-gray-600">
                      {color.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Color Input */}
            <View className="mb-6">
              <Text className="text-base font-medium text-gray-900 mb-3">
                Custom Color
              </Text>
              <View className="space-y-3">
                <TextInput
                  placeholder="#3B82F6"
                  value={customColor}
                  onChangeText={setCustomColor}
                  maxLength={7}
                  autoCapitalize="characters"
                />
                
                {/* Preview of custom color */}
                {isValidHex(customColor) && (
                  <View className="flex-row items-center space-x-3">
                    <View
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: customColor }}
                    />
                    <Text className="text-gray-600">Preview</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleCustomColorSubmit}
                  disabled={!isValidHex(customColor)}
                  className={`p-3 rounded-lg ${
                    isValidHex(customColor) 
                      ? 'bg-blue-600' 
                      : 'bg-gray-300'
                  }`}
                >
                  <Text className={`text-center font-medium ${
                    isValidHex(customColor) 
                      ? 'text-white' 
                      : 'text-gray-500'
                  }`}>
                    Use Custom Color
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color Guidelines */}
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="font-medium text-gray-900 mb-2">
                Color Guidelines:
              </Text>
              <Text className="text-sm text-gray-600 leading-relaxed">
                • Choose colors that represent your school's identity{'\n'}
                • Ensure good contrast for readability on invoices{'\n'}
                • Primary color is used for headers and highlights{'\n'}
                • Secondary color is used for accents and borders{'\n'}
                • Use hex format (e.g., #3B82F6) for custom colors
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}