import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { assertSupabase } from '@/lib/supabase';

export default function AuthDebugTest() {
  const [status, setStatus] = useState<string>('Testing...');
  const [details, setDetails] = useState<string[]>([]);
  
  const addDetail = (detail: string) => {
    setDetails(prev => [...prev, `${new Date().toLocaleTimeString()}: ${detail}`]);
  };

  const testAuth = async () => {
    setStatus('Testing authentication...');
    setDetails([]);
    
    try {
      // Test 1: Supabase client initialization
      addDetail('✅ Testing Supabase client initialization...');
      const client = assertSupabase();
      addDetail('✅ Supabase client initialized successfully');

      // Test 2: Get current session
      addDetail('🔍 Checking current session...');
      const { data: { session }, error: sessionError } = await client.auth.getSession();
      if (sessionError) {
        addDetail(`❌ Session error: ${sessionError.message}`);
      } else {
        addDetail(`✅ Session check: ${session ? 'Active session found' : 'No active session'}`);
        if (session) {
          addDetail(`📧 User email: ${session.user.email}`);
          addDetail(`🆔 User ID: ${session.user.id}`);
        }
      }

      // Test 3: Test database connection
      addDetail('🔍 Testing database connection...');
      const { data, error: dbError } = await client.from('profiles').select('count').limit(1);
      if (dbError) {
        addDetail(`❌ Database error: ${dbError.message}`);
      } else {
        addDetail('✅ Database connection successful');
      }

      // Test 4: Attempt demo sign-in
      addDetail('🔍 Testing sign-in with demo credentials...');
      const { data: signInData, error: signInError } = await client.auth.signInWithPassword({
        email: 'superadmin@edudashpro.org.za',
        password: 'password123'
      });
      
      if (signInError) {
        addDetail(`❌ Sign-in error: ${signInError.message}`);
        setStatus('Authentication test failed - check credentials');
      } else {
        addDetail('✅ Sign-in successful!');
        addDetail(`📧 Signed in as: ${signInData.user.email}`);
        setStatus('Authentication test passed!');
      }

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      addDetail(`❌ Critical error: ${errorMsg}`);
      setStatus(`Test failed: ${errorMsg}`);
      Alert.alert('Auth Test Failed', errorMsg);
    }
  };

  useEffect(() => {
    testAuth();
  }, []);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>EduDashPro Auth Debug Test</Text>
      
      <Text style={styles.status}>{status}</Text>
      
      <View style={styles.detailsContainer}>
        {details.map((detail, index) => (
          <Text key={index} style={styles.detail}>
            {detail}
          </Text>
        ))}
      </View>
      
      <Button title="Run Test Again" onPress={testAuth} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  status: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
    color: '#007AFF',
  },
  detailsContainer: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  detail: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#00ff00',
    marginBottom: 4,
  },
});