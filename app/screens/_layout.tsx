import { Stack } from 'expo-router';
import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { signOutAndRedirect } from '@/lib/authActions';
import { testSentry, testPostHog } from '@/lib/telemetryDebug';

const DEBUG = process.env.EXPO_PUBLIC_DEBUG_TOOLS === '1';

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#0b1220' },
        headerTitleStyle: { color: '#ffffff' },
        headerTintColor: '#00f5ff',
        contentStyle: { backgroundColor: '#0b1220' },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {DEBUG ? (
              <>
                <TouchableOpacity onPress={testSentry} style={{ marginRight: 12 }}>
                  <Text style={{ color: '#fff' }}>Bug</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={testPostHog} style={{ marginRight: 12 }}>
                  <Text style={{ color: '#fff' }}>PH</Text>
                </TouchableOpacity>
              </>
            ) : null}
            <TouchableOpacity onPress={signOutAndRedirect}>
              <Text style={{ color: '#00f5ff', fontWeight: '700' }}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ),
      }}
    >
      <Stack.Screen name="teacher-dashboard" options={{ title: 'Teacher Dashboard' }} />
      <Stack.Screen name="parent-dashboard" options={{ title: 'Parent Dashboard' }} />
      <Stack.Screen name="principal-dashboard" options={{ title: 'Principal Dashboard' }} />
      <Stack.Screen name="principal-seat-management" options={{ title: 'Seat Management' }} />
      <Stack.Screen name="super-admin-leads" options={{ title: 'Sales/Leads' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
    </Stack>
  );
}
