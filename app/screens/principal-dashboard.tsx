import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { EnhancedPrincipalDashboard } from '@/components/dashboard/EnhancedPrincipalDashboard';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function PrincipalDashboardScreen() {
  const { profile } = useAuth();

  const orgId = profile?.organization_id;

  useEffect(() => {
    if (orgId == null) {
      // No school linked — send to onboarding
      try { router.replace('/screens/principal-onboarding'); } catch (e) {
        console.debug('Redirect to onboarding failed', e);
      }
    }
  }, [orgId]);

  if (!orgId) {
    return (
      <View style={styles.empty}>
        <Text style={styles.text}>No school found. Redirecting to onboarding…</Text>
        <TouchableOpacity onPress={() => {
          try { router.replace('/screens/principal-onboarding'); } catch (e) { console.debug('Redirect failed', e); }
        }}>
          <Text style={[styles.text, { textDecorationLine: 'underline' }]}>Go now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <EnhancedPrincipalDashboard />;
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  text: { color: '#E5E7EB' },
});
