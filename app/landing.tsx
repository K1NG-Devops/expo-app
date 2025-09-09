import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function LandingAlias() {
  useEffect(() => {
    // Redirect old /landing links to the root page
    router.replace('/');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f' }}>
      <ActivityIndicator color="#00f5ff" />
    </View>
  );
}
