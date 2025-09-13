/**
 * Themed Stack Wrapper Component
 * 
 * Wraps the Stack navigator with theme-aware styling
 */

import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/contexts/ThemeContext';

export function ThemedStackWrapper() {
  const { theme, isDark } = useTheme();

  return (
    <>
      <StatusBar 
        style={isDark ? 'light' : 'dark'} 
        backgroundColor={theme.headerBackground} 
      />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: theme.headerBackground },
          headerTitleStyle: { color: theme.headerText },
          headerTintColor: theme.headerTint,
          contentStyle: { backgroundColor: theme.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
