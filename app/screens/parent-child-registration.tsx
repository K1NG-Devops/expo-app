import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { assertSupabase } from '@/lib/supabase';

export default function ParentChildRegistrationScreen() {
  const { theme } = useTheme();
  const { profile } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<string>('');
  const [dietary, setDietary] = useState('');
  const [medicalInfo, setMedicalInfo] = useState('');
  const [specialNeeds, setSpecialNeeds] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', "Please enter your child's first and last name");
      return false;
    }
    if (!dob.trim()) {
      Alert.alert('Missing date of birth', 'Please enter your child\'s date of birth (YYYY-MM-DD)');
      return false;
    }
    if (!profile?.id || !profile?.organization_id) {
      Alert.alert('Profile missing', 'We could not determine your school context. Please try again after reloading.');
      return false;
    }
    return true;
  };

  const onSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const relationshipNote = emergencyRelation ? `[EmergencyRelationship: ${emergencyRelation.trim()}]` : '';
      const combinedNotes = (relationshipNote + (notes ? ` ${notes}` : '')).trim();

      const payload = {
        child_first_name: firstName.trim(),
        child_last_name: lastName.trim(),
        child_birth_date: dob.trim(),
        child_gender: gender || null,
        dietary_requirements: dietary || null,
        medical_info: medicalInfo || null,
        special_needs: specialNeeds || null,
        emergency_contact_name: emergencyName || null,
        emergency_contact_phone: emergencyPhone || null,
        notes: combinedNotes || null,
        parent_id: profile?.id,
        preschool_id: profile?.organization_id,
        status: 'pending',
      } as const;

      const { error } = await assertSupabase().from('child_registration_requests').insert(payload as any);
      if (error) throw error;

      Alert.alert('Submitted', 'Your registration request has been sent to the school.');
      setFirstName('');
      setLastName('');
      setDob('');
      setGender('');
      setDietary('');
      setMedicalInfo('');
      setSpecialNeeds('');
      setEmergencyName('');
      setEmergencyPhone('');
      setNotes('');
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { flexGrow: 1, padding: 16, gap: 12 },
    label: { color: theme.text, fontWeight: '600', marginTop: 6 },
    input: { backgroundColor: theme.surface, borderRadius: 10, padding: 12, color: theme.text, borderWidth: 1, borderColor: theme.border },
    row: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    hint: { color: theme.textSecondary, fontSize: 12, marginBottom: 4 },
    section: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border },
    btn: { backgroundColor: theme.primary, padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
    btnText: { color: theme.onPrimary, fontWeight: '800' },
    headerTint: { backgroundColor: theme.background },
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Register a Child', headerStyle: styles.headerTint as any, headerTitleStyle: { color: theme.text }, headerTintColor: theme.primary }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>First name</Text>
          <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="e.g. Thandi" placeholderTextColor={theme.textSecondary} />

          <Text style={styles.label}>Last name</Text>
          <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="e.g. Ndlovu" placeholderTextColor={theme.textSecondary} />

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Date of birth</Text>
              <Text style={styles.hint}>Format: YYYY-MM-DD</Text>
              <TextInput value={dob} onChangeText={setDob} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Gender</Text>
              <TextInput value={gender} onChangeText={setGender} style={styles.input} placeholder="Male / Female / Other" placeholderTextColor={theme.textSecondary} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Dietary requirements</Text>
            <TextInput value={dietary} onChangeText={setDietary} style={styles.input} placeholder="e.g. Halal, Vegetarian, Gluten-free" placeholderTextColor={theme.textSecondary} />

            <Text style={styles.label}>Medical information</Text>
            <TextInput value={medicalInfo} onChangeText={setMedicalInfo} style={styles.input} placeholder="e.g. Asthma, Medication" placeholderTextColor={theme.textSecondary} />

            <Text style={styles.label}>Special needs</Text>
            <TextInput value={specialNeeds} onChangeText={setSpecialNeeds} style={styles.input} placeholder="e.g. Learning support, mobility" placeholderTextColor={theme.textSecondary} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Emergency contact name</Text>
            <TextInput value={emergencyName} onChangeText={setEmergencyName} style={styles.input} placeholder="e.g. Sipho Mthethwa" placeholderTextColor={theme.textSecondary} />

            <Text style={styles.label}>Emergency contact phone</Text>
            <TextInput value={emergencyPhone} onChangeText={setEmergencyPhone} style={styles.input} placeholder="e.g. +27 82 123 4567" keyboardType={Platform.OS === 'android' ? 'numeric' : 'phone-pad'} placeholderTextColor={theme.textSecondary} />

            <Text style={styles.label}>Emergency contact relationship (optional)</Text>
            <TextInput value={emergencyRelation} onChangeText={setEmergencyRelation} style={styles.input} placeholder="e.g. Mother, Father, Aunt" placeholderTextColor={theme.textSecondary} />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Additional notes</Text>
            <TextInput value={notes} onChangeText={setNotes} style={styles.input} placeholder="Anything else the school should know" placeholderTextColor={theme.textSecondary} />
          </View>

          <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnText}>Submit</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
