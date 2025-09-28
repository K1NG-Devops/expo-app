import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
      <StatusBar style="light" />
      <RoleBasedHeader showBackButton={false} />
      <TeacherDashboardWrapper />
    </>
  );
}
