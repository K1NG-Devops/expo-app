/**
 * ProgressBar Component
 * 
 * Progress indicator with customizable colors and animation
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

export interface ProgressBarProps {
  progress: number; // 0 to 1
  color?: string;
  backgroundColor?: string;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
  testID?: string;
}

export function ProgressBar({
  progress,
  color = '#007AFF',
  backgroundColor = '#E5E5EA',
  height = 4,
  style,
  animated = true,
  testID,
  ...props
}: ProgressBarProps) {
  const progressPercent = Math.max(0, Math.min(1, progress)) * 100;
  
  return (
    <View
      style={[
        styles.container,
        { height, backgroundColor },
        style,
      ]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: progressPercent,
      }}
      {...props}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${progressPercent}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
});