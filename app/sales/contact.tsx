import React, { useMemo, useState, useEffect } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { assertSupabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeRole } from '@/lib/rbac';

export default function SalesContactScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const initialPlan = useMemo(() => (params?.plan ? String(params.plan) : 'enterprise'), [params]);

  const { profile } = useAuth();
  const roleNorm = normalizeRole(String(profile?.role || ''));
  const [form, setForm] = useState({
    contact_name: '',
    contact_email: '',
    phone: '',
    organization_name: '',
    country: '',
    role: '',
    school_size: '',
    plan_interest: initialPlan,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (k: keyof typeof form, v: string) => setForm((p) => ({ ...p, [k]: v }));

  // Role-based gating: only principals or school admins (principal_admin) and super admins can submit
  const canSubmit = roleNorm === 'principal_admin' || roleNorm === 'super_admin';

  // Redirect non-principal/admin users to pricing if they reach this route directly
  useEffect(() => {
    if (!canSubmit) {
      router.replace('/pricing');
    }
  }, [canSubmit]);

  async function onSubmit() {
    if (!form.contact_email) {
      Alert.alert('Email required', 'Please provide a contact email.');
      return;
    }
    try {
      if (!canSubmit) {
        Alert.alert('Not allowed', 'Only principals or school admins can submit enterprise requests.');
        return;
      }
      setSubmitting(true);
      track('enterprise_cta_submitted', { plan: form.plan_interest, role: roleNorm });
      const { error } = await assertSupabase().from('enterprise_leads').insert({ ...form });
      if (error) throw error;
      try {
        await assertSupabase().functions.invoke('send-email', {
          body: {
            to: process.env.EXPO_PUBLIC_SALES_EMAIL || process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
            template: 'enterprise_lead',
            payload: form,
          },
        } as any);
      } catch { /* noop */ }
      Alert.alert('Thank you', 'Our team will contact you shortly.');
      setForm({ ...form, contact_name: '', contact_email: '', phone: '', organization_name: '', country: '', role: '', school_size: '', notes: '' });
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
<View style={{ flex: 1 }}>
      <Stack.Screen options={{
        title: 'Contact Sales',
        headerShown: true,
        headerStyle: { backgroundColor: '#0b1220' },
        headerTitleStyle: { color: '#fff' },
        headerTintColor: '#00f5ff',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 12 }}>
            <Text style={{ color: '#00f5ff', fontWeight: '700' }}>Back</Text>
          </TouchableOpacity>
        ),
      }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Talk to Sales</Text>
          <Text style={styles.subtitle}>Tell us about your school and needs. We’ll follow up shortly.</Text>

          {!canSubmit ? (
            <View style={{ width: '100%', backgroundColor: '#111827', borderWidth: 1, borderColor: '#1f2937', padding: 12, borderRadius: 10 }}>
              <Text style={{ color: '#ffb703', fontWeight: '700', marginBottom: 6 }}>Restricted</Text>
              <Text style={{ color: '#9CA3AF' }}>Only principals or school admins can submit enterprise contact requests.</Text>
              <TouchableOpacity onPress={() => router.push('/pricing')} style={[styles.button, { marginTop: 10 }]}>
                <Text style={styles.buttonText}>Back to Pricing</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <FormInput label="Name" value={form.contact_name} onChangeText={(v: string) => onChange('contact_name', v)} autoCapitalize="words" />
              <FormInput label="Email" value={form.contact_email} onChangeText={(v: string) => onChange('contact_email', v)} keyboardType="email-address" autoCapitalize="none" />
              <FormInput label="Phone" value={form.phone} onChangeText={(v: string) => onChange('phone', v)} keyboardType="phone-pad" />
              <FormInput label="Organization" value={form.organization_name} onChangeText={(v: string) => onChange('organization_name', v)} />
              <FormInput label="Country" value={form.country} onChangeText={(v: string) => onChange('country', v)} />
              <FormInput label="Your role" value={form.role} onChangeText={(v: string) => onChange('role', v)} placeholder="Principal / Admin / Teacher / Parent" />
              <FormInput label="School size" value={form.school_size} onChangeText={(v: string) => onChange('school_size', v)} placeholder="e.g., 200 students" />
              <FormInput label="Plan interest" value={form.plan_interest} onChangeText={(v: string) => onChange('plan_interest', v)} />
              <FormInput label="Notes" value={form.notes} onChangeText={(v: string) => onChange('notes', v)} multiline />

              <TouchableOpacity style={[styles.button, submitting && { opacity: 0.5 }]} disabled={submitting} onPress={onSubmit}>
                <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
</View>
  );
}

function FormInput({ label, multiline = false, style, ...rest }: any) {
  return (
    <View style={{ width: '100%' }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        style={[styles.input, multiline && { height: 100, textAlignVertical: 'top' }, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, backgroundColor: '#0b1220', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginBottom: 8 },
  label: { color: '#FFFFFF', marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', padding: 12 },
  button: { backgroundColor: '#00f5ff', padding: 14, alignItems: 'center', borderRadius: 12, marginTop: 8 },
  buttonText: { color: '#000', fontWeight: '800' },
});
