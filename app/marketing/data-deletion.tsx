import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Link } from 'expo-router';

export default function DataDeletionPage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.h1}>Request data deletion (keep account)</Text>
      <Text style={styles.lead}>Use this process to request deletion of selected data categories while keeping your EduDash Pro account active.</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>How to request (in‑app)</Text>
        <Text style={styles.p}>1. Open the app and sign in</Text>
        <Text style={styles.p}>2. Go to Settings → Security & Privacy</Text>
        <Text style={styles.p}>3. Tap “Request data deletion”</Text>
        <Text style={styles.p}>4. Select the categories to delete and submit</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>What you can request to delete</Text>
        <Text style={styles.p}>• Uploaded files & media (e.g., profile images or other uploads)</Text>
        <Text style={styles.p}>• Messages & communications</Text>
        <Text style={styles.p}>• Activity history & analytics</Text>
        <Text style={styles.p}>• AI-generated content (prompts and outputs)</Text>
        <Text style={styles.p}>• Non‑essential personal data (optional profile fields/preferences)</Text>
        <Text style={[styles.p, styles.mt8]}>Some records may need to be retained if we have a legal obligation (e.g., billing/invoices) or for security/fraud prevention. Such retention is minimized and time‑limited.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Timeline & processing</Text>
        <Text style={styles.p}>We typically start processing within 7 days. Soft-deleted records may be retained up to 30 days for recovery/security purposes before permanent removal, unless a longer legal retention period is required.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>Can’t access the app?</Text>
        <Text style={styles.p}>Email us from your account email with the subject “Partial data deletion request” and list the categories to delete.</Text>
        <Text style={styles.link} onPress={() => Linking.openURL('mailto:support@edudashpro.org.za?subject=Partial%20data%20deletion%20request')}>support@edudashpro.org.za</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.h2}>In‑app shortcuts</Text>
        <Text style={styles.p}>If you’re using the web version, you can navigate here:</Text>
        <Link href="/screens/settings" style={styles.link}>Open Settings</Link>
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
