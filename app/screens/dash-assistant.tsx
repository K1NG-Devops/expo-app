/**
 * Dash AI Assistant Screen
 * 
 * Screen wrapper for the Dash AI Assistant component that integrates
 * with the app's navigation and provides a full-screen chat experience.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { DashAssistant } from '@/components/ai/DashAssistant';

export default function DashAssistantScreen() {
  const { theme } = useTheme();

  const handleClose = () => {
    // Navigate back to the previous screen
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }} 
      />
      
      <DashAssistant 
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});