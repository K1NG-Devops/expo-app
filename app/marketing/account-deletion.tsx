import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from 'expo-router';

export default function AccountDeletionPage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Request account deletion</Text>
      <Text style={styles.lead}>This page explains how to request deletion of your EduDash Pro account and associated data.</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>How to request account deletion (in‑app)</Text>
        <Text style={styles.p}>You can submit a deletion request directly from the app:</Text>
        <Text style={styles.li}>1. Open the app and sign in</Text>
        <Text style={styles.li}>2. Go to Settings → Security & Privacy</Text>
        <Text style={styles.li}>3. Tap “Request account deletion”</Text>
        <Text style={styles.li}>4. Confirm your request</Text>
        <Text style={[styles.p, styles.mt8]}>Alternatively, you can open Account → “Request account deletion”.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>What will be deleted</Text>
        <Text style={styles.p}>We delete your account and personal data stored in our systems. Some records may be retained where we have a legal obligation (e.g., billing/invoices) or for fraud prevention and security auditing. Such records are kept only as long as legally required and are separated from your account identity as far as possible.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Timeline & retention</Text>
        <Text style={styles.p}>• Your request is scheduled within 7 days and processed thereafter. Soft-deleted records may be retained up to 30 days for recovery/security purposes before permanent removal, unless we are required to retain specific records longer for legal compliance.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Need help?</Text>
        <Text style={styles.p}>If you cannot access the app, email our support team from your account email with the subject “Account deletion request”.</Text>
        <Text style={styles.link} onPress={() => Linking.openURL('mailto:support@edudashpro.org.za?subject=Account%20deletion%20request')}>support@edudashpro.org.za</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>In‑app shortcuts</Text>
        <Text style={styles.p}>If you’re using the web version, you can navigate here:</Text>
        <Link href="/screens/settings" style={styles.link}>Open Settings</Link>
        <Link href="/screens/account" style={styles.link}>Open Account</Link>
      </View>

      <Text style={styles.footer}>© {new Date().getFullYear()} EduDash Pro</Text>
    </ScrollView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme?.background || '#0b1220' },
    content: { padding: 20 },
    h1: { fontSize: 24, fontWeight: '700', color: theme?.text || '#fff', marginBottom: 8 },
    h2: { fontSize: 18, fontWeight: '600', color: theme?.text || '#fff', marginBottom: 6 },
    lead: { color: theme?.textSecondary || '#9ca3af', marginBottom: 16 },
    p: { color: theme?.text || '#e5e7eb', lineHeight: 20 },
    li: { color: theme?.text || '#e5e7eb', lineHeight: 20, marginTop: 2 },
    mt8: { marginTop: 8 },
    card: {
      backgroundColor: theme?.surface || '#111827',
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: theme?.divider || '#1f2937',
    },
    link: { color: theme?.primary || '#00f5ff', marginTop: 6 },
    footer: { color: theme?.textSecondary || '#9ca3af', marginTop: 24, fontSize: 12 },
  });
