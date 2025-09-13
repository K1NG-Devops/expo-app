import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';

export default function NotFound() {
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  
  useEffect(() => {
    console.log('🚨 [NOT-FOUND] Unmatched route detected!');
    console.log('🚨 [NOT-FOUND] Pathname:', pathname);
    console.log('🚨 [NOT-FOUND] Segments:', segments);
    console.log('🚨 [NOT-FOUND] Router state:', router);
    console.log('🚨 [NOT-FOUND] Full router object keys:', Object.keys(router));
    console.log('🚨 [NOT-FOUND] Router.canGoBack:', router.canGoBack?.());
    console.log('🚨 [NOT-FOUND] Window location:', typeof window !== 'undefined' ? window.location : 'N/A');
    
    // Try to extract more debugging info
    try {
      console.log('🚨 [NOT-FOUND] Router push function:', typeof router.push);
      console.log('🚨 [NOT-FOUND] Process.env.NODE_ENV:', process.env.NODE_ENV);
    } catch (error) {
      console.log('🚨 [NOT-FOUND] Error getting router debug info:', error);
    }
  }, []);
  
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Unmatched Route</Text>
        <Text style={styles.subtitle}>This path doesn't exist in the router.</Text>
        <Text style={styles.debugInfo}>Path: {pathname}</Text>
        <Text style={styles.debugInfo}>Segments: {JSON.stringify(segments)}</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}> 
          <Text style={styles.buttonText}>Go to landing</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0f', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#9ca3af', marginBottom: 20 },
  debugInfo: { fontSize: 12, color: '#6b7280', marginBottom: 5, textAlign: 'center' },
  button: { backgroundColor: '#00f5ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24, marginTop: 20 },
  buttonText: { color: '#000', fontWeight: '800' },
});
