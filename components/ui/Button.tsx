/**
 * Button Component
 * 
 * Accessible button component with consistent styling
 * Complies with WARP.md accessibility and touch target requirements
 */

import React from 'react';
import { Pressable, StyleSheet, ViewStyle, ActivityIndicator, View } from 'react-native';
import { Text } from './Text';

export interface ButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const colors = {
  primary: '#007AFF',
  primaryPressed: '#0056CC',
  secondary: '#5856D6',
  secondaryPressed: '#4B44C4',
  outline: '#007AFF',
  outlinePressed: '#0056CC',
  ghost: 'transparent',
  ghostPressed: '#F2F2F7',
  disabled: '#C7C7CC',
  surface: '#FFFFFF',
  text: {
    primary: '#FFFFFF',
    secondary: '#FFFFFF', 
    outline: '#007AFF',
    ghost: '#007AFF',
    disabled: '#6D6D80',
  },
};

const sizes = {
  small: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 32,
    borderRadius: 8,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44, // WCAG minimum touch target
    borderRadius: 10,
  },
  large: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 52,
    borderRadius: 12,
  },
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  testID,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  const getBackgroundColor = (pressed: boolean) => {
    if (isDisabled) return colors.disabled;
    if (pressed) {
      switch (variant) {
        case 'primary': return colors.primaryPressed;
        case 'secondary': return colors.secondaryPressed;
        case 'outline': return colors.outlinePressed;
        case 'ghost': return colors.ghostPressed;
        default: return colors.primaryPressed;
      }
    }
    switch (variant) {
      case 'primary': return colors.primary;
      case 'secondary': return colors.secondary;
      case 'outline': return 'transparent';
      case 'ghost': return colors.ghost;
      default: return colors.primary;
    }
  };
  
  const getTextColor = () => {
    if (isDisabled) return colors.text.disabled;
    return colors.text[variant] || colors.text.primary;
  };
  
  const getBorderStyle = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 1,
        borderColor: isDisabled ? colors.disabled : colors.outline,
      };
    }
    return {};
  };

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        sizes[size],
        {
          backgroundColor: getBackgroundColor(pressed),
        },
        getBorderStyle(),
        style,
        isDisabled && styles.disabled,
      ]}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      <>
        <View style={styles.content}>
        {loading && (
          <ActivityIndicator 
            size="small" 
            color={getTextColor()} 
            style={styles.loader}
          />
        )}
        {typeof children === 'string' ? (
          <Text
            variant={size === 'small' ? 'caption1' : 'callout'}
            style={[styles.text, { color: getTextColor() }]}
          >
            {children}
          </Text>
        ) : (
          children
        )}
        </View>
      </>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // Minimum touch target of 44x44 for accessibility
    minWidth: 44,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  loader: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.6,
  },
});