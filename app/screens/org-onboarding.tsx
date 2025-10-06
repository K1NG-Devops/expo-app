import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';

// Minimal Org Onboarding (skills/tertiary/other organizations)
// Creates an organization and links the current user to it, then routes to Org Admin Dashboard
export default function OrgOnboardingScreen() {
  const { user, profile, refreshProfile } = useAuth();

  useEffect(() => {
    if (!user) {
      try { router.replace('/(auth)/sign-in'); } catch {}
    }
  }, [user]);

  type Step = 'type_selection' | 'details' | 'review';

  const [step, setStep] = useState<Step>('type_selection');
  const [creating, setCreating] = useState(false);
  const [orgId, setOrgId] = useState<string | null>((profile as any)?.organization_id || null);

  const [orgKind, setOrgKind] = useState<'skills' | 'tertiary' | 'org'>('skills');
  const [orgName, setOrgName] = useState<string>((profile as any)?.organization_name || '');
  const [adminName, setAdminName] = useState(`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim());
  const [phone, setPhone] = useState('');

  const canCreate = useMemo(() => Boolean(user?.id) && orgName.trim().length > 1, [user?.id, orgName]);

  const handleCreateOrg = useCallback(async () => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      // Insert organization
      const payload: any = {
        name: orgName.trim(),
        type: orgKind,
        phone: phone.trim() || null,
        created_by: user?.id,
        status: 'pending',
      };
      const { data: created, error } = await assertSupabase()
        .from('organizations')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      const newOrgId = created?.id as string;
      setOrgId(newOrgId);

      // Link profile to organization (best-effort)
      try {
        await assertSupabase()
          .from('profiles')
          .update({ organization_id: newOrgId })
          .eq('id', user?.id);
      } catch (e) { console.debug('Failed to set organization_id on profile', e); }

      try { await refreshProfile?.(); } catch (e) { console.debug('refreshProfile failed', e); }

      Alert.alert('Organization Requested', `${orgName} onboarding request has been submitted. We will set things up now!`);
      router.replace('/screens/org-admin-dashboard');
    } catch (e: any) {
      console.error('Create org failed', e);
      let msg = 'Failed to create organization';
      if (e?.message) msg = e.message;
      Alert.alert('Error', msg);
    } finally {
      setCreating(false);
    }
  }, [canCreate, creating, orgName, orgKind, phone, user?.id, refreshProfile]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Organization Onboarding' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Welcome, {adminName || profile?.first_name || 'Admin'}</Text>
        <Text style={styles.subheading}>
          {step === 'type_selection'
            ? 'Tell us what type of organization you represent.'
            : 'Provide your organization details to complete onboarding.'}
        </Text>

        {step === 'type_selection' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Organization Type</Text>
            <View style={styles.pillRow}>
              {(['skills', 'tertiary', 'org'] as const).map((k) => (
                <TouchableOpacity key={k} style={[styles.pill, orgKind === k && styles.pillActive]} onPress={() => setOrgKind(k)}>
                  <Text style={[styles.pillText, orgKind === k && styles.pillTextActive]}>
                    {k === 'skills' ? 'Skills/Training' : k === 'tertiary' ? 'Tertiary/Edu' : 'Organization'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={() => setStep('details')}>
              <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 'details' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Organization name</Text>
            <TextInput
              style={styles.input}
              value={orgName}
              onChangeText={setOrgName}
              placeholder="e.g. Future Skills Academy"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              value={adminName}
              onChangeText={setAdminName}
              placeholder="Admin full name"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Organization phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+27-.."
              keyboardType="phone-pad"
            />

            <TouchableOpacity disabled={!canCreate || creating} style={[styles.button, (!canCreate || creating) && styles.buttonDisabled]} onPress={handleCreateOrg}>
              {creating ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create organization</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setStep('type_selection')} style={styles.linkBtn}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16 },
  heading: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  subheading: { color: '#9CA3AF', marginBottom: 12 },
  label: { color: '#fff', marginTop: 8, marginBottom: 6 },
  input: { backgroundColor: '#111827', color: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', padding: 12 },
  button: { marginTop: 12, backgroundColor: '#00f5ff', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontWeight: '800' },
  pillRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#1f2937', backgroundColor: '#0b1220' },
  pillActive: { backgroundColor: '#00f5ff', borderColor: '#00f5ff' },
  pillText: { color: '#fff', fontWeight: '700' },
  pillTextActive: { color: '#000' },
  linkBtn: { marginTop: 8, alignItems: 'center' },
  linkText: { color: '#60A5FA', textDecorationLine: 'underline' },
});
