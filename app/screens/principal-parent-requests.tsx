import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ParentJoinService, GuardianRequest } from '@/lib/services/parentJoinService';

export default function PrincipalParentRequestsScreen() {
  const { user, profile } = useAuth();
  const schoolId = (profile?.organization_id as string) || null;
  const [requests, setRequests] = useState<GuardianRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [studentIdMap, setStudentIdMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!schoolId) return;
    const data = await ParentJoinService.listPendingForSchool(schoolId);
    setRequests(data);
  }, [schoolId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const approve = async (req: GuardianRequest) => {
    const studentId = studentIdMap[req.id] || req.student_id || '';
    if (!studentId) {
      Alert.alert('Student required', 'Enter the student ID to link the parent.');
      return;
    }
    try {
      await ParentJoinService.approve(req.id, studentId, user?.id || '');
      Alert.alert('Approved', 'Parent linked to student');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to approve');
    }
  };

  const reject = async (req: GuardianRequest) => {
    try {
      await ParentJoinService.reject(req.id, user?.id || '');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to reject');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Parent Requests' }} />
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f5ff" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.text}>Parent: {item.parent_email || item.parent_auth_id}</Text>
            <Text style={styles.text}>Child: {item.child_full_name || '—'}</Text>
            <Text style={styles.text}>Requested: {new Date(item.created_at).toLocaleString()}</Text>
            <TextInput
              style={styles.input}
              value={studentIdMap[item.id] ?? ''}
              onChangeText={(v) => setStudentIdMap((m) => ({ ...m, [item.id]: v }))}
              placeholder={item.student_id || 'Enter student ID'}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.btn, styles.approve]} onPress={() => approve(item)}>
                <Text style={styles.btnTextDark}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.reject]} onPress={() => reject(item)}>
                <Text style={styles.btnTextDark}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b1220', padding: 12 },
  card: { backgroundColor: '#111827', borderRadius: 12, padding: 12, borderColor: '#1f2937', borderWidth: 1, marginBottom: 10 },
  text: { color: '#fff', marginBottom: 4 },
  input: { backgroundColor: '#0b1220', color: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#1f2937', padding: 10, marginTop: 8 },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  btn: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 10 },
  approve: { backgroundColor: '#00f5ff' },
  reject: { backgroundColor: '#ff0080' },
  btnTextDark: { color: '#000', fontWeight: '800' },
  empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
});