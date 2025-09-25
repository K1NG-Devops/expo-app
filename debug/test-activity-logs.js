#!/usr/bin/env node

// Test activity_logs table access to diagnose 500 errors
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables:');
  console.error('  EXPO_PUBLIC_SUPABASE_URL');
  console.error('  EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

console.log('🔍 Testing activity_logs table access...');
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testActivityLogs() {
  console.log('\n1. Testing anonymous access (should fail)...');
  
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ Anonymous access failed (expected):', error.message);
      console.log('Error details:', _error);
    } else {
      console.log('✅ Anonymous access worked (unexpected)');
      console.log('Records found:', data?.length || 0);
    }
  } catch (_err) {
    console.log('❌ Exception during anonymous access:', _err.message);
  }

  console.log('\n2. Testing authenticated access...');
  
  try {
    // Try to sign in with a test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'elsha@youngeagles.org.za',
      password: 'password'
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    
    // Now try the activity_logs query with auth
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(5);
      
    if (error) {
      console.log('❌ Authenticated access to activity_logs failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
      
      // This is likely the 500 error cause
      if (error.message.includes('permission denied') || error.message.includes('policy')) {
        console.log('\n🔍 This looks like an RLS policy issue');
        console.log('The table has RLS enabled but policies might be too restrictive');
      }
    } else {
      console.log('✅ Authenticated access worked!');
      console.log('Records found:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('Sample record:', JSON.stringify(data[0], null, 2));
      }
    }
    
    // Test insertion
    console.log('\n3. Testing activity_logs insertion...');
    const { data: insertData, error: insertError } = await supabase
      .from('activity_logs')
      .insert({
        activity_type: 'test',
        description: 'Test log entry from debug script',
        user_id: authData.user.id,
        organization_id: '00000000-0000-0000-0000-000000000000' // placeholder
      })
      .select();
      
    if (insertError) {
      console.log('❌ Insertion failed:', insertError.message);
      console.log('Insert error details:', insertError);
    } else {
      console.log('✅ Insertion succeeded');
      console.log('Inserted record:', insertData);
    }
    
  } catch (_err) {
    console.log('❌ Exception during authenticated test:', _err.message);
  }
}

async function checkPolicies() {
  console.log('\n4. Attempting to check policies via service role...');
  
  // This would require service role key which we might not have
  console.log('(This would require SUPABASE_SERVICE_ROLE_KEY environment variable)');
}

async function main() {
  console.log('🚀 Activity Logs Debug Test');
  console.log('===========================');
  
  try {
    await testActivityLogs();
    await checkPolicies();
    
    console.log('\n📋 Summary:');
    console.log('If you see "permission denied" or RLS policy errors above,');
    console.log('that explains the 500 errors in your frontend.');
    console.log('\nThe activity_logs table has RLS enabled and 3 policies,');
    console.log('but they might be too restrictive or have incorrect logic.');
    
  } catch (_error) {
    console._error('❌ Test failed:', _error.message);
  }
}

main().catch(console.error);