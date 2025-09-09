import React from 'react';
import { Stack } from 'expo-router';
import EnhancedSubscriptionParentDashboard from '@/components/dashboard/EnhancedSubscriptionParentDashboard';

export default function ParentDashboardScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <EnhancedSubscriptionParentDashboard />
    </>
  );
}
