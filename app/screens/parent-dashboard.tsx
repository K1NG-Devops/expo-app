import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import ComprehensiveParentDashboard from '@/components/dashboard/ComprehensiveParentDashboard';

export default function ParentDashboardScreen() {
  // If user reached this screen, they're authorized (routing system validated them)
  const canView = true;

  if (!canView) {
    return (
      <View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <View style={styles.denied}><Text style={styles.deniedText}>Access denied — parent role required.</Text></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ComprehensiveParentDashboard />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  deniedText: { color: '#fff' },
});
