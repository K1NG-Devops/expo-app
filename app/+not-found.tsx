import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function NotFound() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Not found', headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Unmatched Route</Text>
        <Text style={styles.subtitle}>This path doesn't exist in the router.</Text>
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
  button: { backgroundColor: '#00f5ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 24 },
  buttonText: { color: '#000', fontWeight: '800' },
});
