/**
 * Lessons Hub Screen
 * 
 * Main screen for the comprehensive lessons hub showing categories,
 * featured content, search, and navigation to detailed lesson views.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { LessonsHub } from '@/components/lessons/LessonsHub';

export default function LessonsHubScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          title: 'Lessons Hub'
        }} 
      />
      
      <LessonsHub />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});