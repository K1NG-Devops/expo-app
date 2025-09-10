import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/contexts/AuthContext';
import { detectRoleAndSchool } from '@/lib/routeAfterLogin';
import EnhancedSubscriptionParentDashboard from '@/components/dashboard/EnhancedSubscriptionParentDashboard';

export default function ParentDashboardScreen() {
  const { user } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  
  const canView = role === 'parent';

  const loadRole = useCallback(async () => {
    try {
      const { role: detectedRole } = await detectRoleAndSchool(user);
      setRole(detectedRole);
    } catch {}
  }, [user]);

  useEffect(() => { loadRole(); }, [loadRole]);

  if (!canView) {
    return (
      <>
        <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <View style={styles.denied}><Text style={styles.deniedText}>Access denied — parent role required.</Text></View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Parent Dashboard', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <EnhancedSubscriptionParentDashboard />
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  deniedText: { color: '#fff' },
});
