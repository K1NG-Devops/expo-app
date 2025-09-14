/**
 * Themed Stack Wrapper Component
 * 
 * Wraps the Stack navigator with theme-aware styling
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';
import { View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ThemedStackWrapper() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <>
      {/* Use translucent status bar and render our own underlay to control background */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'android' ? (0 as number) : insets.top,
          backgroundColor: theme.headerBackground,
          zIndex: 1,
        }}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTitleStyle: { color: theme.headerText },
          headerTintColor: theme.headerTint,
          contentStyle: { backgroundColor: theme.background, paddingTop: Platform.OS === 'android' ? 0 : insets.top },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
