import { Stack } from 'expo-router';
import React from 'react';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: '#0b1220' },
        // Use custom, role-based header across signed-in screens
        header: () => (
          <RoleBasedHeader
            backgroundColor="#0b1220"
            textColor="#ffffff"
          />
        ),
      }}
    >
      {/* Let expo-router auto-register child routes; per-screen titles are set in each screen file. */}
    </Stack>
  );
}
