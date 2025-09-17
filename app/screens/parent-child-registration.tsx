import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { assertSupabase } from '@/lib/supabase';

export default function ParentChildRegistrationScreen() {
  const { theme } = useTheme();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'Please enter your child\'s first and last name');
      return;
    }
    setLoading(true);
    try {
      // Create a registration request row (or directly insert a child profile if allowed)
      await assertSupabase().from('child_registration_requests').insert({
        first_name: firstName,
        last_name: lastName,
        date_of_birth: dob || null,
        status: 'pending',
      } as any);
      Alert.alert('Submitted', 'Your registration request has been sent to the school');
      setFirstName('');
      setLastName('');
      setDob('');
    } catch (e: any) {
      Alert.alert('Submission failed', e?.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, gap: 12, backgroundColor: theme.background },
    label: { color: theme.text },
    input: { backgroundColor: theme.surface, borderRadius: 10, padding: 12, color: theme.text },
    btn: { backgroundColor: theme.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
    btnText: { color: theme.onPrimary, fontWeight: '800' },
  });

  return (
    <View style={{ flex: 1 }}>
      <Stack.Screen options={{ title: 'Register a Child', headerStyle: { backgroundColor: theme.background }, headerTitleStyle: { color: theme.text }, headerTintColor: theme.primary }} />
      <SafeAreaView style={styles.container}>
        <Text style={styles.label}>First name</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} placeholder="e.g. Thandi" placeholderTextColor={theme.textSecondary} />
        <Text style={styles.label}>Last name</Text>
        <TextInput value={lastName} onChangeText={setLastName} style={styles.input} placeholder="e.g. Ndlovu" placeholderTextColor={theme.textSecondary} />
        <Text style={styles.label}>Date of birth (optional)</Text>
        <TextInput value={dob} onChangeText={setDob} style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor={theme.textSecondary} />
        <TouchableOpacity style={styles.btn} onPress={onSubmit} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={styles.btnText}>Submit</Text>}
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
