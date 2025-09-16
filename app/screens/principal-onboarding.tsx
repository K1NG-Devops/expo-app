import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { TenantService } from '@/lib/services/tenant';
import { TeacherInviteService } from '@/lib/services/teacherInviteService';

// Best-effort local persistence (works in native; silently no-ops on web if not available)
let AsyncStorage: any = null;
try { AsyncStorage = require('@react-native-async-storage/async-storage').default; } catch (e) { console.debug('AsyncStorage unavailable', e); }

 type Step = 'details' | 'invites' | 'templates' | 'review';

export default function PrincipalOnboardingScreen() {
  const { user, profile, refreshProfile } = useAuth();

  // Wizard state
  const [step, setStep] = useState<Step>('details');
  const [creating, setCreating] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(profile?.organization_id || null);

  // Details
  const [schoolName, setSchoolName] = useState(profile?.organization_name || '');
  const [adminName, setAdminName] = useState(`${profile?.first_name || ''} ${profile?.last_name || ''}`.trim());
  const [phone, setPhone] = useState('');
  const [planTier, setPlanTier] = useState<'free' | 'starter' | 'premium' | 'enterprise'>('free');

  // Invites
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [sentInvites, setSentInvites] = useState<{ email: string; status: 'pending' | 'sent' | 'error'; id?: string }[]>([]);

  // Templates (mock selections for now)
  const availableTemplates = useMemo(() => [
    { id: 'starter_classes', name: 'Starter Class Groups' },
    { id: 'starter_lessons', name: 'AI Lesson Starters' },
    { id: 'attendance_pack', name: 'Attendance + Reports Pack' },
  ], []);
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);

  // Load saved progress
  useEffect(() => {
    (async () => {
      if (!AsyncStorage) return;
      try {
        const raw = await AsyncStorage.getItem('onboarding_principal_state');
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved.step) setStep(saved.step);
          if (saved.schoolName) setSchoolName(saved.schoolName);
          if (saved.adminName) setAdminName(saved.adminName);
          if (saved.phone) setPhone(saved.phone);
          if (saved.planTier) setPlanTier(saved.planTier);
          if (saved.emails) setEmails(saved.emails);
          if (saved.selectedTemplates) setSelectedTemplates(saved.selectedTemplates);
          if (saved.schoolId) setSchoolId(saved.schoolId);
        }
      } catch (e) { console.debug('Load onboarding state failed', e); }
    })();
  }, []);

  // Save progress
  const persist = useCallback(async (next?: Partial<any>) => {
    if (!AsyncStorage) return;
    try {
      const state = {
        step,
        schoolName,
        adminName,
        phone,
        planTier,
        emails,
        selectedTemplates,
        schoolId,
        ...(next || {}),
      };
      await AsyncStorage.setItem('onboarding_principal_state', JSON.stringify(state));
    } catch (e) { console.debug('Persist onboarding state failed', e); }
  }, [step, schoolName, adminName, phone, planTier, emails, selectedTemplates, schoolId]);

  const canCreate = useMemo(() => Boolean(user?.id) && Boolean(schoolName.trim()), [user?.id, schoolName]);

  const handleCreateSchool = useCallback(async () => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      // Create school now so we can send invites on next step
      const id = await TenantService.createSchool({
        schoolName: schoolName.trim(),
        adminName: adminName.trim() || null,
        phone: phone.trim() || null,
        planTier,
      });
      setSchoolId(id);
      try { await refreshProfile(); } catch (e) { console.debug('refreshProfile failed', e); }
      Alert.alert('School created', 'Next: invite your teachers');
      setStep('invites');
      persist({ step: 'invites', schoolId: id });
    } catch (e: any) {
      console.error('Create school failed', e);
      Alert.alert('Error', e?.message || 'Failed to create school');
    } finally {
      setCreating(false);
    }
  }, [canCreate, creating, schoolName, adminName, phone, planTier, refreshProfile, persist]);

  const addEmail = useCallback(() => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (emails.includes(trimmed)) return;
    const next = [...emails, trimmed];
    setEmails(next);
    setEmailInput('');
    persist({ emails: next });
  }, [emailInput, emails, persist]);

  const removeEmail = useCallback((target: string) => {
    const next = emails.filter(e => e !== target);
    setEmails(next);
    persist({ emails: next });
  }, [emails, persist]);

  const sendInvites = useCallback(async () => {
    if (!schoolId || !user?.id) {
      Alert.alert('Missing school', 'Please create the school first.');
      return;
    }
    if (!emails.length) {
      setStep('templates');
      persist({ step: 'templates' });
      return;
    }
    try {
      setSendingInvites(true);
      const results: { email: string; status: 'pending' | 'sent' | 'error'; id?: string }[] = [];
      for (const email of emails) {
        try {
          const inv = await TeacherInviteService.createInvite({ schoolId, email, invitedBy: user.id });
          results.push({ email, status: 'sent', id: inv.id });
        } catch (e) {
          console.debug('Invite failed', e);
          results.push({ email, status: 'error' });
        }
      }
      setSentInvites(results);
      Alert.alert('Invites processed', `Sent: ${results.filter(r => r.status === 'sent').length}, Failed: ${results.filter(r => r.status === 'error').length}`);
      setStep('templates');
      persist({ step: 'templates', sentInvites: results });
    } finally {
      setSendingInvites(false);
    }
  }, [schoolId, user?.id, emails, persist]);

  const toggleTemplate = useCallback((id: string) => {
    const next = selectedTemplates.includes(id)
      ? selectedTemplates.filter(t => t !== id)
      : [...selectedTemplates, id];
    setSelectedTemplates(next);
    persist({ selectedTemplates: next });
  }, [selectedTemplates, persist]);

  const goReview = useCallback(() => {
    setStep('review');
    persist({ step: 'review' });
  }, [persist]);

  const finish = useCallback(() => {
    // In future: call seeding RPC for selectedTemplates
    Alert.alert('Setup complete', 'Your school is ready. You can adjust settings anytime.');
    try { AsyncStorage?.removeItem('onboarding_principal_state'); } catch (e) { console.debug('clear state failed', e); }
    router.replace('/screens/principal-dashboard');
  }, []);

  const StepIndicator = () => (
    <View style={styles.stepper}>
      {(['details', 'invites', 'templates', 'review'] as Step[]).map((s, idx) => (
        <View key={s} style={styles.stepItem}>
          <View style={[styles.stepDot, step === s ? styles.stepDotActive : styles.stepDotInactive]} />
          <Text style={[styles.stepLabel, step === s && styles.stepLabelActive]}>{idx + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Principal Onboarding' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Welcome, {adminName || profile?.first_name || 'Principal'}</Text>
        <Text style={styles.subheading}>Let’s set up your preschool in a few quick steps.</Text>

        <StepIndicator />

        {step === 'details' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>School name</Text>
            <TextInput
              style={styles.input}
              value={schoolName}
              onChangeText={(v) => { setSchoolName(v); persist({ schoolName: v }); }}
              placeholder="e.g. Bright Beginnings Preschool"
              autoCapitalize="words"
            />

            <Text style={styles.label}>Your name</Text>
            <TextInput
              style={styles.input}
              value={adminName}
              onChangeText={(v) => { setAdminName(v); persist({ adminName: v }); }}
              placeholder="Principal full name"
              autoCapitalize="words"
            />

            <Text style={styles.label}>School phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(v) => { setPhone(v); persist({ phone: v }); }}
              placeholder="+27-.."
              keyboardType="phone-pad"
            />

            <View style={{ marginTop: 12 }}>
              <Text style={styles.label}>Plan tier</Text>
              <View style={styles.pillRow}>
                {(['free', 'starter', 'premium', 'enterprise'] as const).map(t => (
                  <TouchableOpacity key={t} style={[styles.pill, planTier === t && styles.pillActive]} onPress={() => { setPlanTier(t); persist({ planTier: t }); }}>
                    <Text style={[styles.pillText, planTier === t && styles.pillTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity disabled={!canCreate || creating} style={[styles.button, (!canCreate || creating) && styles.buttonDisabled]} onPress={handleCreateSchool}>
              {creating ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Create school & Continue</Text>}
            </TouchableOpacity>
          </View>
        )}

        {step === 'invites' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Invite teachers (optional)</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={emailInput}
                onChangeText={setEmailInput}
                placeholder="teacher@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity style={styles.smallButton} onPress={addEmail}>
                <Text style={styles.smallButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {emails.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {emails.map((e) => (
                  <View key={e} style={styles.emailRow}>
                    <Text style={styles.emailText}>{e}</Text>
                    <TouchableOpacity onPress={() => removeEmail(e)}>
                      <Text style={[styles.emailText, { color: '#f87171' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity disabled={sendingInvites} style={[styles.button, sendingInvites && styles.buttonDisabled]} onPress={sendInvites}>
              {sendingInvites ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>{emails.length ? 'Send invites & Continue' : 'Skip & Continue'}</Text>}
            </TouchableOpacity>

            {sentInvites.length > 0 && (
              <View style={{ marginTop: 8 }}>
                {sentInvites.map((r, i) => (
                  <Text key={i} style={styles.hint}>• {r.email}: {r.status}</Text>
                ))}
              </View>
            )}

            <TouchableOpacity onPress={() => { setStep('details'); persist({ step: 'details' }); }} style={styles.linkBtn}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
          </View>
        )}

        {step === 'templates' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Starter templates (optional)</Text>
            {availableTemplates.map(t => (
              <TouchableOpacity key={t.id} style={styles.templateRow} onPress={() => toggleTemplate(t.id)}>
                <View style={[styles.checkbox, selectedTemplates.includes(t.id) && styles.checkboxChecked]} />
                <Text style={styles.templateText}>{t.name}</Text>
              </TouchableOpacity>
            ))}

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <TouchableOpacity style={[styles.button, { flex: 1 }]} onPress={goReview}>
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => { setSelectedTemplates([]); goReview(); }}>
                <Text style={styles.secondaryButtonText}>Skip</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => { setStep('invites'); persist({ step: 'invites' }); }} style={styles.linkBtn}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
          </View>
        )}

        {step === 'review' && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Review</Text>
            <Text style={styles.hint}>School: <Text style={{ color: '#fff' }}>{schoolName}</Text></Text>
            <Text style={styles.hint}>Plan: <Text style={{ color: '#fff' }}>{planTier}</Text></Text>
            <Text style={styles.hint}>Invites: <Text style={{ color: '#fff' }}>{emails.length}</Text></Text>
            <Text style={styles.hint}>Templates: <Text style={{ color: '#fff' }}>{selectedTemplates.length}</Text></Text>

            <TouchableOpacity style={[styles.button, { marginTop: 16 }]} onPress={finish}>
              <Text style={styles.buttonText}>Finish setup & Go to dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setStep('templates'); persist({ step: 'templates' }); }} style={styles.linkBtn}><Text style={styles.linkText}>Back</Text></TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220' },
  content: { padding: 16, paddingBottom: 40 },
  heading: { color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subheading: { color: '#9CA3AF', marginBottom: 16 },
  label: { color: '#E5E7EB', marginTop: 12, marginBottom: 6, fontWeight: '600' },
  input: { backgroundColor: '#111827', color: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', padding: 12 },
  button: { marginTop: 18, backgroundColor: '#00f5ff', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#000', fontWeight: '800' },
  hint: { color: '#9CA3AF', marginTop: 6, fontSize: 13 },

  // Stepper
  stepper: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepDot: { width: 10, height: 10, borderRadius: 5 },
  stepDotActive: { backgroundColor: '#00f5ff' },
  stepDotInactive: { backgroundColor: '#1f2937' },
  stepLabel: { color: '#9CA3AF', fontSize: 12 },
  stepLabelActive: { color: '#E5E7EB', fontWeight: '700' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: '#1f2937', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#0b1220' },
  pillActive: { backgroundColor: '#0ea5b6' },
  pillText: { color: '#9CA3AF' },
  pillTextActive: { color: '#001011', fontWeight: '800' },

  smallButton: { backgroundColor: '#00f5ff', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: '#000', fontWeight: '800' },

  emailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  emailText: { color: '#E5E7EB' },

  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  templateText: { color: '#E5E7EB' },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#1f2937', backgroundColor: '#0b1220' },
  checkboxChecked: { backgroundColor: '#00f5ff', borderColor: '#00f5ff' },

  secondaryButton: { marginTop: 18, backgroundColor: '#0b1220', borderWidth: 1, borderColor: '#1f2937', padding: 12, borderRadius: 10, alignItems: 'center' },
  secondaryButtonText: { color: '#E5E7EB', fontWeight: '700' },

  linkBtn: { marginTop: 10, alignSelf: 'flex-start' },
  linkText: { color: '#00f5ff', textDecorationLine: 'underline' },
});
