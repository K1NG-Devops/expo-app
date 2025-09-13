import { Stack } from 'expo-router';
import React from 'react';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';
import { useTheme } from '@/contexts/ThemeContext';

export default function ScreensLayout() {
  const { theme } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: theme.background },
        // Use custom, role-based header across signed-in screens
        header: () => (
          <RoleBasedHeader />
        ),
      }}
    >
      {/* Let expo-router auto-register child routes; per-screen titles are set in each screen file. */}
    </Stack>
  );
}
