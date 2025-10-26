import React from 'react';
import { Stack } from 'expo-router';
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
      <RoleBasedHeader showBackButton={false} />
      <TeacherDashboardWrapper />
    </>
  );
}
