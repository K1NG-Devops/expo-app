import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { startMonitoring } from '@/lib/monitoring';
import { startAds } from '@/lib/ads';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';

export default function RootLayout() {
  useEffect(() => {
    startMonitoring();
    startAds();
  }, []);

  return (
    // Wrap in SubscriptionProvider so screens can access subscription data
    <SubscriptionProvider>
      <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#0b1220' },
        headerTitleStyle: { color: '#ffffff' },
        headerTintColor: '#00f5ff',
        contentStyle: { backgroundColor: '#0b1220' },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
    </SubscriptionProvider>
  );
}
