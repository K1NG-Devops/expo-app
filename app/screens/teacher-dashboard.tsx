import React from 'react';
import { Stack } from 'expo-router';
import ThemedStatusBar from '@/components/ui/ThemedStatusBar';
import TeacherDashboardWrapper from '@/components/dashboard/TeacherDashboardWrapper';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';

export default function TeacherDashboardScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false
        }} 
      />
      <ThemedStatusBar />
      <RoleBasedHeader showBackButton={false} />
      <TeacherDashboardWrapper />
    </>
  );
}
