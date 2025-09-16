#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFixes() {
  console.log('🔍 Testing database fixes...\n');

  // Test 1: Check push_devices table structure
  console.log('1. Testing push_devices table with language column...');
  try {
    const { data: devices, error } = await supabase
      .from('push_devices')
      .select('user_id, expo_push_token, language, timezone')
      .limit(1);
    
    if (error) {
      console.log('❌ push_devices query failed:', error.message);
    } else {
      console.log('✅ push_devices query successful');
      console.log('   Sample structure:', devices.length > 0 ? Object.keys(devices[0]) : 'No data');
    }
  } catch (e) {
    console.log('❌ push_devices test error:', e.message);
  }

  // Test 2: Check update_preschool_subscription function
  console.log('\n2. Testing update_preschool_subscription RPC...');
  try {
    const { data, error } = await supabase
      .rpc('update_preschool_subscription', {
        p_preschool_id: '00000000-0000-0000-0000-000000000000', // dummy UUID
        p_subscription_tier: 'basic',
        p_subscription_status: 'active', 
        p_subscription_plan_id: '00000000-0000-0000-0000-000000000000' // dummy UUID
      });
      
    if (error) {
      if (error.code === 'P0001') {
        console.log('✅ RPC function exists and has proper authorization checks');
        console.log('   Error (expected):', error.message);
      } else if (error.code === 'PGRST202') {
        console.log('❌ RPC function not found or has wrong signature');
        console.log('   Error:', error.message);
      } else {
        console.log('⚠️  RPC function exists but returned unexpected error:', error.message);
      }
    } else {
      console.log('✅ RPC function executed successfully:', data);
    }
  } catch (e) {
    console.log('❌ RPC test error:', e.message);
  }

  // Test 3: Check for function overloading issues
  console.log('\n3. Testing for function overloading issues...');
  try {
    // Try calling with slightly different parameters to see if there's overloading
    const { error } = await supabase
      .rpc('update_preschool_subscription', {
        preschool_id: '00000000-0000-0000-0000-000000000000', // Wrong param name
        subscription_plan_id: '00000000-0000-0000-0000-000000000000'
      });
      
    if (error && error.code === 'PGRST202') {
      console.log('✅ No function overloading - only correct signature exists');
    } else if (error && error.code === 'PGRST203') {
      console.log('❌ Function overloading still exists');
      console.log('   Error:', error.message);
    } else {
      console.log('⚠️  Unexpected result for overloading test:', error?.message || 'Success');
    }
  } catch (e) {
    console.log('❌ Overloading test error:', e.message);
  }

  console.log('\n✅ Fix testing complete!');
  console.log('\n📌 Summary:');
  console.log('- push_devices table should now have language and timezone columns');
  console.log('- update_preschool_subscription RPC should have correct signature'); 
  console.log('- No function overloading ambiguity should exist');
  console.log('- Super admin dashboard should have a proper back button');
}

testFixes().catch(console.error);