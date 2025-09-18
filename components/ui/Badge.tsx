/**
 * Badge Component
 * 
 * Small status indicator component
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text } from './Text';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  testID?: string;
}

const colors = {
  primary: { bg: '#007AFF', text: '#FFFFFF' },
  secondary: { bg: '#6D6D80', text: '#FFFFFF' },
  success: { bg: '#34C759', text: '#FFFFFF' },
  warning: { bg: '#FF9500', text: '#FFFFFF' },
  error: { bg: '#FF3B30', text: '#FFFFFF' },
};

const sizes = {
  small: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  medium: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  large: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
};

export function Badge({
  children,
  variant = 'primary',
  size = 'medium',
  style,
  testID,
  ...props
}: BadgeProps) {
  return (
    <View
      style={[
        styles.base,
        sizes[size],
        { backgroundColor: colors[variant].bg },
        style,
      ]}
      testID={testID}
      {...props}
    >
      {typeof children === 'string' ? (
        <Text
          variant={size === 'small' ? 'caption2' : 'caption1'}
          style={{ color: colors[variant].text, fontWeight: '600' }}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
});