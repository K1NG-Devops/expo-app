#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const client = createClient(url, anonKey);

async function testAuth() {
  try {
    console.log('Testing basic Supabase connection...');
    
    // Test a simple query first (should work without auth)
    const { data: healthCheck, error: healthError } = await client
      .from('preschools')
      .select('name')
      .limit(1);
      
    if (healthError) {
      console.log('❌ Basic query failed:', healthError.message);
      console.log('This suggests a fundamental connectivity issue');
      return;
    }
    
    console.log('✅ Basic Supabase connection works');
    
    console.log('\nTesting authentication with different approaches...');
    
    // Try with a test email/password that definitely exists
    const testCases = [
      { email: 'elsha@youngeagles.org.za', password: 'password' },
      { email: 'elsha@youngeagles.org.za', password: 'password123' },
      { email: 'admin@youngeagles.org.za', password: 'password' },
      { email: 'admin@youngeagles.org.za', password: 'password123' }
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTrying: ${testCase.email} with password: ${testCase.password}`);
      
      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: testCase.email,
        password: testCase.password
      });
      
      if (authError) {
        console.log(`   ❌ ${authError.message}`);
      } else {
        console.log(`   ✅ SUCCESS! Authenticated as: ${authData.user.email}`);
        console.log(`   User ID: ${authData.user.id}`);
        
        // Test profile fetch
        console.log('   Testing profile fetch...');
        const { data: profile, error: profileError } = await client
          .from('users')
          .select('*')
          .eq('auth_user_id', authData.user.id)
          .single();
          
        if (profileError) {
          console.log(`   ❌ Profile fetch failed: ${profileError.message}`);
        } else {
          console.log(`   ✅ Profile loaded: ${profile.email} (${profile.role})`);
        }
        
        // Sign out for next test
        await client.auth.signOut();
        return; // Stop after first successful login
      }
    }
    
    console.log('\n❌ All authentication attempts failed');
    console.log('\nPossible issues:');
    console.log('1. Users don\'t have passwords set in Supabase auth');
    console.log('2. Email confirmation required but not completed');
    console.log('3. Auth policies blocking sign in');
    console.log('4. Incorrect password (try resetting via Supabase dashboard)');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testAuth().then(() => process.exit(0));