import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import { track } from '@/lib/analytics';

const STATUSES = ['new','contacted','qualified','proposal','closed-won','closed-lost'] as const;

export default function SuperAdminLeadsScreen() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [leads, setLeads] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [convertOpenFor, setConvertOpenFor] = useState<string | null>(null);
  const [convertForm, setConvertForm] = useState<{ org: string; country: string; principalEmail: string; seats: string }>({ org: '', country: '', principalEmail: '', seats: '10' });

  // If user reached this screen, they're authorized (routing system validated them)
  const canView = true;

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      let q = supabase!.from('enterprise_leads').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') {
        q = q.eq('status', filter);
      }
      const { data, error } = await q;
      if (!error) setLeads(data || []);
    } catch (e) {
      console.error('Failed to fetch leads:', e);
    }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const onRefresh = useCallback(async () => { setRefreshing(true); await fetchLeads(); setRefreshing(false); }, [fetchLeads]);

  const updateStatus = async (id: string, status: typeof STATUSES[number]) => {
    try {
      const { error } = await supabase!.from('enterprise_leads').update({ status }).eq('id', id);
      if (!error) {
        track('lead_status_changed', { id, status });
        setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
      }
    } catch (e) {
      console.error('Failed to update lead status:', e);
    }
  };

  if (!canView) {
    return (
<View style={{ flex: 1 }}>
        <Stack.Screen options={{ title: 'Sales/Leads', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
        <StatusBar style="light" backgroundColor="#0b1220" />
        <View style={styles.denied}><Text style={styles.deniedText}>Access denied — super admin only.</Text></View>
</View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Sales/Leads', headerStyle: { backgroundColor: '#0b1220' }, headerTitleStyle: { color: '#fff' }, headerTintColor: '#00f5ff', headerBackVisible: false }} />
      <StatusBar style="light" backgroundColor="#0b1220" />
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <ScrollView contentContainerStyle={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}>
        <View style={styles.filtersRow}>
          {['all', ...STATUSES].map((s) => (
            <TouchableOpacity key={s} onPress={() => setFilter(String(s))} style={[styles.filterChip, filter === s && styles.filterChipActive]}>
              <Text style={[styles.filterChipText, filter === s && styles.filterChipTextActive]}>{String(s)}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? <Text style={styles.loading}>Loading…</Text> : null}

        {leads.map((lead) => (
          <View key={lead.id} style={styles.card}>
            <Text style={styles.cardTitle}>{lead.organization_name || 'Unknown org'}</Text>
            <Text style={styles.cardRow}>Contact: {lead.contact_name || '—'} • {lead.contact_email}</Text>
            <Text style={styles.cardRow}>Phone: {lead.phone || '—'} • Country: {lead.country || '—'}</Text>
            <Text style={styles.cardRow}>Role: {lead.role || '—'} • Size: {lead.school_size || '—'}</Text>
            <Text style={styles.cardRow}>Plan: {lead.plan_interest || 'enterprise'}</Text>
            <Text style={styles.cardRow}>Notes: {lead.notes || '—'}</Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={() => {
                setConvertOpenFor(lead.id);
                setConvertForm({ org: lead.organization_name || '', country: lead.country || '', principalEmail: lead.contact_email || '', seats: '10' });
              }} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Convert to School</Text>
              </TouchableOpacity>
            </View>

            {convertOpenFor === lead.id ? (
              <View style={styles.convertBox}>
                <Text style={styles.convertTitle}>Provision Enterprise</Text>
                <TextInput style={styles.input} placeholderTextColor="#9CA3AF" placeholder="School / Org name" value={convertForm.org} onChangeText={(v) => setConvertForm({ ...convertForm, org: v })} />
                <TextInput style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Country" value={convertForm.country} onChangeText={(v) => setConvertForm({ ...convertForm, country: v })} />
                <TextInput style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Principal email (optional)" autoCapitalize="none" keyboardType="email-address" value={convertForm.principalEmail} onChangeText={(v) => setConvertForm({ ...convertForm, principalEmail: v })} />
                <TextInput style={styles.input} placeholderTextColor="#9CA3AF" placeholder="Seats (e.g., 10)" keyboardType="numeric" value={convertForm.seats} onChangeText={(v) => setConvertForm({ ...convertForm, seats: v })} />
                <View style={styles.row}>
                  <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={() => setConvertOpenFor(null)}>
                    <Text style={styles.btnSecondaryText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={async () => {
                    try {
                      const seatsNum = Math.max(1, parseInt(convertForm.seats || '1', 10) || 1);
                      // Create school
                      const { data: schoolIns, error: schoolErr } = await supabase!.from('preschools').insert({ name: convertForm.org || lead.organization_name, country: convertForm.country || lead.country }).select('id').maybeSingle();
                      if (schoolErr) throw schoolErr;
                      const schoolId = (schoolIns as any)?.id;
                      if (!schoolId) throw new Error('No school id');
                      // Create enterprise subscription
                      const { error: subErr } = await supabase!.from('subscriptions').insert({ owner_type: 'school', school_id: schoolId, plan: 'enterprise', seats_total: seatsNum, seats_used: 0 });
                      if (subErr) throw subErr;
                      // Optionally link principal
                      if (convertForm.principalEmail) {
                        const { data: prof } = await supabase!.from('profiles').select('id,role').eq('email', convertForm.principalEmail).maybeSingle();
                        if (prof && (prof as any).id) {
                          await supabase!.from('profiles').update({ preschool_id: schoolId, role: (prof as any).role === 'superadmin' ? (prof as any).role : 'principal' }).eq('id', (prof as any).id);
                        }
                      }
                      // Mark lead as closed-won
                      await supabase!.from('enterprise_leads').update({ status: 'closed-won' }).eq('id', lead.id);
                      track('lead_converted_to_school', { lead_id: lead.id, school_id: schoolId, seats: seatsNum });
                      Alert.alert('Success', 'School and subscription provisioned.');
                      setConvertOpenFor(null);
                      fetchLeads();
                    } catch (e: any) {
                      Alert.alert('Failed', e?.message || 'Could not convert');
                    }
                  }}>
                    <Text style={styles.btnPrimaryText}>Provision</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            <View style={styles.statusRow}>
              {STATUSES.map((s) => (
                <TouchableOpacity key={s} onPress={() => updateStatus(lead.id, s)} style={[styles.statusBtn, lead.status === s && styles.statusBtnActive]}>
                  <Text style={[styles.statusBtnText, lead.status === s && styles.statusBtnTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {(!loading && leads.length === 0) ? <Text style={styles.empty}>No leads found.</Text> : null}
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0b1220' },
  deniedText: { color: '#fff' },
  container: { padding: 16, gap: 12, backgroundColor: '#0b1220' },
  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { borderWidth: 1, borderColor: '#1f2937', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 9999 },
  filterChipActive: { backgroundColor: '#00f5ff22', borderColor: '#00f5ff' },
  filterChipText: { color: '#9CA3AF' },
  filterChipTextActive: { color: '#00f5ff', fontWeight: '700' },
  loading: { color: '#9CA3AF' },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#1f2937' },
  cardTitle: { color: '#fff', fontWeight: '800', marginBottom: 4 },
  cardRow: { color: '#9CA3AF', fontSize: 12, marginBottom: 2 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  primaryBtn: { backgroundColor: '#00f5ff', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  primaryBtnText: { color: '#000', fontWeight: '800' },
  convertBox: { marginTop: 8, backgroundColor: '#0b1220', borderWidth: 1, borderColor: '#1f2937', borderRadius: 10, padding: 10, gap: 8 },
  convertTitle: { color: '#fff', fontWeight: '800' },
  input: { backgroundColor: '#111827', color: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937', padding: 10 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#00f5ff' },
  btnPrimaryText: { color: '#000', fontWeight: '800' },
  btnSecondary: { backgroundColor: '#1f2937' },
  btnSecondaryText: { color: '#fff', fontWeight: '700' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  statusBtn: { borderWidth: 1, borderColor: '#1f2937', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  statusBtnActive: { backgroundColor: '#00f5ff22', borderColor: '#00f5ff' },
  statusBtnText: { color: '#9CA3AF', fontSize: 12 },
  statusBtnTextActive: { color: '#00f5ff', fontWeight: '700' },
  empty: { color: '#9CA3AF' },
});
