/**
 * Text Component
 * 
 * Consistent typography system for EduDash Pro
 * Complies with WARP.md accessibility standards
 */

import React from 'react';
import { Text as RNText, StyleSheet, TextStyle } from 'react-native';

export interface TextProps {
  children: React.ReactNode;
  variant?: 'title1' | 'title2' | 'title3' | 'headline' | 'subheadline' | 'body' | 'callout' | 'caption1' | 'caption2' | 'footnote';
  color?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'success' | 'warning';
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  testID?: string;
  accessibilityLabel?: string;
}

const colors = {
  primary: '#000000',
  secondary: '#6D6D80',
  tertiary: '#C7C7CC',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
};

const typography = {
  title1: {
    fontSize: 34,
    fontWeight: '700' as const,
    lineHeight: 41,
  },
  title2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  title3: {
    fontSize: 22,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  headline: {
    fontSize: 17,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  body: {
    fontSize: 17,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  callout: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 21,
  },
  caption1: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption2: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 13,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
};

export function Text({
  children,
  variant = 'body',
  color = 'primary',
  style,
  numberOfLines,
  ellipsizeMode = 'tail',
  testID,
  accessibilityLabel,
  ...props
}: TextProps) {
  const textStyle = [
    styles.base,
    typography[variant],
    { color: colors[color] },
    style,
  ];

  return (
    <RNText
      style={textStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});