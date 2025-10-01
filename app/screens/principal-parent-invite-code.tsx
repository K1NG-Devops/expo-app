import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Switch } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { InviteCodeService, SchoolInvitationCode } from '@/lib/services/inviteCodeService';

let Clipboard: any = null;
try { Clipboard = require('expo-clipboard'); } catch (e) { /* optional */ }

export default function PrincipalParentInviteCodeScreen() {
  const { user, profile } = useAuth();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const schoolId = (profile?.organization_id as string) || (profile as any)?.preschool_id || null;

  const [codes, setCodes] = useState<SchoolInvitationCode[]>([]);
  const [loading, setLoading] = useState(false);

  // New code form
  const [unlimited, setUnlimited] = useState(true);
  const [maxUses, setMaxUses] = useState('50');
  const [expiryDays, setExpiryDays] = useState('30');

  const load = useCallback(async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const list = await InviteCodeService.listParentCodes(schoolId);
      setCodes(list);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const onGenerate = async () => {
    if (!schoolId || !user?.id) {
      Alert.alert('Missing context', 'You need a school to create invites.');
      return;
    }
    try {
      setLoading(true);
      const uses = unlimited ? null : Number(maxUses) > 0 ? Number(maxUses) : 1;
      const days = Number(expiryDays);
      const expiresAt = isFinite(days) && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
        : null;

      const created = await InviteCodeService.createParentCode({
        preschoolId: schoolId,
        invitedBy: user.id,
        maxUses: uses,
        expiresAt,
        description: 'Parent school-wide invite',
      });
      // Optimistically show the new/active code at the top while we refresh from server
      setCodes(prev => [created, ...prev.filter(c => c.id !== created.id)]);
      await load();
      Alert.alert('Invite created', `Code: ${created.code}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to create invite');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (value: string) => {
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(value);
        Alert.alert('Copied', 'Invite code copied to clipboard');
      } else {
        throw new Error('Clipboard not available');
      }
    } catch {
      Alert.alert('Copy failed', 'Clipboard not available on this platform');
    }
  };

  const toggleActive = async (item: SchoolInvitationCode) => {
    try {
      setLoading(true);
      await InviteCodeService.setActive(item.id, !(item.is_active ?? false));
      await load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Create School-wide Invite',
          headerShown: false,
          headerBackVisible: false,
        }} 
      />
      <ScrollView contentContainerStyle={styles.content}>
        {!schoolId ? (
          <Text style={styles.text}>No school found on your profile. Create a school first.</Text>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Create a School-wide Invite</Text>
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Unlimited uses</Text>
                <Switch value={unlimited} onValueChange={setUnlimited} />
              </View>
              {!unlimited && (
                <View style={styles.fieldRow}>
                  <Text style={styles.inputLabel}>Max uses</Text>
                  <TextInput
                    keyboardType="number-pad"
                    value={maxUses}
                    onChangeText={setMaxUses}
                    placeholder="e.g. 50"
                    style={styles.input}
                  />
                </View>
              )}
              <View style={styles.fieldRow}>
                <Text style={styles.inputLabel}>Expires in (days)</Text>
                <TextInput
                  keyboardType="number-pad"
                  value={expiryDays}
                  onChangeText={setExpiryDays}
                  placeholder="30"
                  style={styles.input}
                />
              </View>
              <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={onGenerate} disabled={loading}>
                <Text style={styles.buttonText}>{loading ? 'Working…' : 'Generate Invite Code'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Existing Codes</Text>
            {codes.length === 0 ? (
              <Text style={styles.muted}>No invite codes yet.</Text>
            ) : (
              codes.map((item) => {
                const active = !!item.is_active;
                const usesText = item.max_uses ? `${item.current_uses || 0}/${item.max_uses}` : `${item.current_uses || 0}/∞`;
                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.code}>{item.code}</Text>
                      <View style={[styles.badge, active ? styles.badgeActive : styles.badgeInactive]}>
                        <Text style={styles.badgeText}>{active ? 'ACTIVE' : 'INACTIVE'}</Text>
                      </View>
                    </View>
                    <Text style={styles.text}>Uses: {usesText}</Text>
                    <Text style={styles.text}>Expires: {item.expires_at ? new Date(item.expires_at).toLocaleString() : 'No expiry'}</Text>
                    <View style={styles.row}>
                      <TouchableOpacity style={styles.smallButton} onPress={() => copyToClipboard(item.code)}>
                        <Text style={styles.smallButtonText}>Copy</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.smallButton, active ? styles.deactivate : styles.activate]} onPress={() => toggleActive(item)}>
                        <Text style={[styles.smallButtonText, styles.smallButtonTextDark]}>{active ? 'Deactivate' : 'Activate'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme?.background || '#0b1220' },
  content: { padding: 16 },
  text: { color: theme?.text || '#fff' },
  muted: { color: theme?.textSecondary || '#9CA3AF', marginBottom: 12 },
  sectionTitle: { color: theme?.text || '#fff', fontSize: 16, fontWeight: '700', marginVertical: 8 },
  card: { backgroundColor: theme?.surface || '#111827', borderRadius: 12, padding: 12, borderColor: theme?.border || '#1f2937', borderWidth: 1, marginBottom: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  fieldRow: { marginBottom: 12 },
  label: { color: theme?.text || '#fff' },
  inputLabel: { color: theme?.text || '#fff', marginBottom: 6 },
  input: { backgroundColor: theme?.surface || '#0b1220', color: theme?.text || '#fff', borderRadius: 8, borderWidth: 1, borderColor: theme?.border || '#1f2937', padding: 10 },
  button: { marginTop: 12, backgroundColor: theme?.primary || '#00f5ff', padding: 12, borderRadius: 10, alignItems: 'center' },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: theme?.onPrimary || '#000', fontWeight: '800' },
  code: { color: theme?.text || '#fff', fontSize: 18, fontWeight: '800' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeActive: { backgroundColor: '#059669' },
  badgeInactive: { backgroundColor: '#6B7280' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 10 },
  smallButton: { flex: 1, backgroundColor: theme?.surface || '#0b1220', padding: 10, borderRadius: 10, alignItems: 'center', borderColor: theme?.border || '#1f2937', borderWidth: 1 },
  smallButtonText: { color: theme?.text || '#fff', fontWeight: '700' },
  smallButtonTextDark: { color: '#000' },
  deactivate: { backgroundColor: '#F59E0B' },
  activate: { backgroundColor: '#22C55E' },
});
