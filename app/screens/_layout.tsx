import { Stack } from 'expo-router';
import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export default function ScreensLayout() {
  const { theme } = useTheme();
  
  return (
    <Stack
      screenOptions={{
        headerShown: false, // Hide default header - each screen manages its own RoleBasedHeader
        contentStyle: { backgroundColor: theme.background },
        presentation: 'card',
        animationTypeForReplace: 'push',
        headerTitle: '',
      }}
    >
      {/* Let expo-router auto-register child routes; each screen renders its own RoleBasedHeader */}
    </Stack>
  );
}
