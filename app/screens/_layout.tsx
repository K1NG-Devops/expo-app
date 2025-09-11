import { Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { signOutAndRedirect } from '@/lib/authActions';
import { RoleBasedHeader } from '@/components/RoleBasedHeader';

export default function ScreensLayout() {
  const SignOutButton = (
    <TouchableOpacity onPress={signOutAndRedirect}>
      <Text style={{ color: '#00f5ff', fontWeight: '700' }}>Sign out</Text>
    </TouchableOpacity>
  );

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        contentStyle: { backgroundColor: '#0b1220' },
        // Use custom, role-based header across signed-in screens
        header: () => (
          <RoleBasedHeader
            rightComponent={SignOutButton}
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
