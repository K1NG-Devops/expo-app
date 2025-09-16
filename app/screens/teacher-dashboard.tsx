import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { TeacherDashboard } from '@/components/dashboard/TeacherDashboard';

export default function TeacherDashboardScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Teacher Dashboard',
          headerStyle: { backgroundColor: '#0b1220' },
          headerTitleStyle: { color: '#fff' },
          headerTintColor: '#00f5ff'
        }} 
      />
      <StatusBar style="light" />
      <TeacherDashboard />
    </>
  );
}
