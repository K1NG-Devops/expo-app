import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function PricingScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Pricing', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Choose your plan</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Free</Text>
            <Text style={styles.cardText}>Get started with basic features.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pro</Text>
            <Text style={styles.cardText}>Advanced AI tools for educators.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Enterprise</Text>
            <Text style={styles.cardText}>Unlimited usage for schools. Seat-based licensing.</Text>
            <TouchableOpacity style={styles.cta} onPress={() => router.push('/sales/contact?plan=enterprise')}>
              <Text style={styles.ctaText}>Contact sales</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { color: '#fff', fontWeight: '800', marginBottom: 6 },
  cardText: { color: '#9CA3AF' },
  cta: { marginTop: 10, backgroundColor: '#00f5ff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, alignSelf: 'flex-start' },
  ctaText: { color: '#000', fontWeight: '800' },
});
