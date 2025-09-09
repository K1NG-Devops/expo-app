import React, { useEffect } from 'react';
import { ActivityIndicator, Text, View, StyleSheet } from 'react-native';
import { routeAfterLogin } from '@/lib/routeAfterLogin';

export default function ProfilesGate() {
  useEffect(() => {
    routeAfterLogin();
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator color="#00f5ff" />
      <Text style={styles.text}>Loading your profile…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220', gap: 12, padding: 24 },
  text: { color: '#fff', textAlign: 'center' },
});

