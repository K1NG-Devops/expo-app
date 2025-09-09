import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

export default function SalesContactScreen() {
  const params = useLocalSearchParams<{ plan?: string }>();
  const initialPlan = useMemo(() => (params?.plan ? String(params.plan) : 'enterprise'), [params]);

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

  async function onSubmit() {
    if (!form.contact_email) {
      Alert.alert('Email required', 'Please provide a contact email.');
      return;
    }
    try {
      setSubmitting(true);
      track('enterprise_cta_submitted', { plan: form.plan_interest });
      const { error } = await supabase!.from('enterprise_leads').insert({ ...form });
      if (error) throw error;
      try {
        await supabase!.functions.invoke('send-email', {
          body: {
            to: process.env.EXPO_PUBLIC_SALES_EMAIL || process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
            template: 'enterprise_lead',
            payload: form,
          },
        } as any);
      } catch {}
      Alert.alert('Thank you', 'Our team will contact you shortly.');
      setForm({ ...form, contact_name: '', contact_email: '', phone: '', organization_name: '', country: '', role: '', school_size: '', notes: '' });
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again later.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Contact Sales', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff' }} />
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Talk to Sales</Text>
          <Text style={styles.subtitle}>Tell us about your school and needs. We’ll follow up shortly.</Text>

          <FormInput label="Name" value={form.contact_name} onChangeText={(v) => onChange('contact_name', v)} autoCapitalize="words" />
          <FormInput label="Email" value={form.contact_email} onChangeText={(v) => onChange('contact_email', v)} keyboardType="email-address" autoCapitalize="none" />
          <FormInput label="Phone" value={form.phone} onChangeText={(v) => onChange('phone', v)} keyboardType="phone-pad" />
          <FormInput label="Organization" value={form.organization_name} onChangeText={(v) => onChange('organization_name', v)} />
          <FormInput label="Country" value={form.country} onChangeText={(v) => onChange('country', v)} />
          <FormInput label="Your role" value={form.role} onChangeText={(v) => onChange('role', v)} placeholder="Principal / Admin / Teacher / Parent" />
          <FormInput label="School size" value={form.school_size} onChangeText={(v) => onChange('school_size', v)} placeholder="e.g., 200 students" />
          <FormInput label="Plan interest" value={form.plan_interest} onChangeText={(v) => onChange('plan_interest', v)} />
          <FormInput label="Notes" value={form.notes} onChangeText={(v) => onChange('notes', v)} multiline />

          <TouchableOpacity style={[styles.button, submitting && { opacity: 0.5 }]} disabled={submitting} onPress={onSubmit}>
            <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
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
