#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl || 'MISSING');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'SET' : 'MISSING');
  process.exit(1);
}

console.log('🔍 Debugging Supabase Authentication');
console.log('URL:', supabaseUrl);
console.log('Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugAuth() {
  try {
    console.log('\n1. Testing basic connectivity...');
    
    // Test 1: Basic API health check
    const { data: healthCheck, error: healthError } = await supabase
      .from('profiles')
      .select('count(*)')
      .limit(1);
    
    if (healthError) {
      console.log('❌ API Health Check failed:', healthError.message);
    } else {
      console.log('✅ API connectivity working');
    }

    console.log('\n2. Testing auth settings...');
    
    // Test 2: Get auth settings
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    if (response.ok) {
      const settings = await response.json();
      console.log('✅ Auth settings retrieved:');
      console.log('  - Email auth enabled:', settings.external?.email);
      console.log('  - Signup disabled:', settings.disable_signup);
      console.log('  - Auto-confirm emails:', settings.mailer_autoconfirm);
    } else {
      console.log('❌ Failed to get auth settings:', response.status);
    }

    console.log('\n3. Testing signup with a new user...');
    
    // Test 3: Try to sign up a test user
    const testEmail = `test+${Date.now()}@example.com`;
    const testPassword = 'TestPass123!';
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    });
    
    if (signUpError) {
      console.log('❌ Signup failed:', signUpError.message);
      console.log('   Error code:', signUpError.status);
      
      if (signUpError.message.includes('Failed to fetch') || signUpError.message.includes('500')) {
        console.log('\n🚨 This looks like the same 500 error you encountered!');
        console.log('   Possible causes:');
        console.log('   - Database trigger error');
        console.log('   - RLS policy blocking profile creation');
        console.log('   - Missing database tables/functions');
      }
    } else {
      console.log('✅ Signup successful');
      console.log('   User ID:', signUpData.user?.id);
      console.log('   Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
    }

    console.log('\n4. Testing existing user login...');
    
    // Test 4: Try to login with a known user (if exists)
    // This will fail with invalid credentials but should give us a 400, not 500
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    
    if (signInError) {
      if (signInError.message.includes('Invalid login credentials')) {
        console.log('✅ Login endpoint working (expected invalid credentials error)');
      } else if (signInError.message.includes('500')) {
        console.log('❌ Login also returning 500 error - database issue confirmed');
      } else {
        console.log('❌ Login error:', signInError.message);
      }
    } else {
      console.log('✅ Unexpected successful login');
    }

    console.log('\n📋 Summary:');
    console.log('If you see 500 errors above, the issue is likely:');
    console.log('1. Database trigger error in profile creation');
    console.log('2. Missing or corrupted user_profiles table');
    console.log('3. RLS policy preventing profile insertion');
    console.log('\nRecommended fixes:');
    console.log('- Check Supabase dashboard logs');
    console.log('- Verify user_profiles table exists and has correct structure');
    console.log('- Check auth triggers in the database');

  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

debugAuth();