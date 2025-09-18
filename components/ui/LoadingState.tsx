/**
 * LoadingState Component
 * 
 * Consistent loading state indicator
 */

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './Text';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  color?: string;
  style?: any;
  testID?: string;
}

export function LoadingState({
  message = 'Loading...',
  size = 'large',
  color = '#007AFF',
  style,
  testID,
  ...props
}: LoadingStateProps) {
  return (
    <View style={[styles.container, style]} testID={testID} {...props}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text variant="body" color="secondary" style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
  },
});