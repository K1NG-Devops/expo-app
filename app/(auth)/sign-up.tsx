import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function SignUpAlias() {
  useEffect(() => {
    // Use the same email OTP screen for sign-up and sign-in (shouldCreateUser=true)
    router.replace('/(auth)/sign-in');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' }}>
      <ActivityIndicator color="#00f5ff" />
    </View>
  );
}
