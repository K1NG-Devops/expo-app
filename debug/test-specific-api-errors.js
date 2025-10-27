#!/usr/bin/env node

// Test the exact API queries that are failing with 500 errors
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testFailingQueries() {
  console.log('🚀 Testing Specific Failing API Queries');
  console.log('=======================================');
  console.log(`📡 URL: ${supabaseUrl}`);

  // Query 1: profiles table with avatar_url selection and specific ID filter
  console.log('\n1. Testing profiles query (from error log)...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', '136cf31c-b37c-45c0-9cf7-755bd1b9afbf');
      
    if (error) {
      console.log('❌ profiles query failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
    } else {
      console.log('✅ profiles query succeeded');
      console.log('Data:', data);
    }
  } catch (_err) {
    console.log('❌ profiles query exception:', _err.message);
  }

  // Query 2: activity_logs with organization_id filter and ordering
  console.log('\n2. Testing activity_logs query (from error log)...');
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('activity_type,description,created_at,user_name')
      .eq('organization_id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1')
      .order('created_at', { ascending: false })
      .limit(8);
      
    if (error) {
      console.log('❌ activity_logs query failed:', error.message);
      console.log('Error code:', error.code);
      console.log('Error details:', error.details);
      console.log('Error hint:', error.hint);
    } else {
      console.log('✅ activity_logs query succeeded');
      console.log('Data count:', data ? data.length : 0);
    }
  } catch (_err) {
    console.log('❌ activity_logs query exception:', _err.message);
  }

  // Query 3: Test basic access to both tables
  console.log('\n3. Testing basic table access...');
  
  // Test profiles basic access
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ profiles basic access failed:', error.message);
    } else {
      console.log('✅ profiles basic access works');
    }
  } catch (_err) {
    console.log('❌ profiles basic access exception:', _err.message);
  }

  // Test activity_logs basic access
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('❌ activity_logs basic access failed:', error.message);
    } else {
      console.log('✅ activity_logs basic access works');
    }
  } catch (_err) {
    console.log('❌ activity_logs basic access exception:', _err.message);
  }

  // Query 4: Test if the organization ID exists
  console.log('\n4. Testing organization existence...');
  try {
    const { data, error } = await supabase
      .from('preschools')
      .select('id, name')
      .eq('id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1');
      
    if (error) {
      console.log('❌ organization lookup failed:', error.message);
    } else {
      if (data && data.length > 0) {
        console.log('✅ Organization exists:', data[0].name);
      } else {
        console.log('⚠️ Organization not found with that ID');
      }
    }
  } catch (_err) {
    console.log('❌ organization lookup exception:', _err.message);
  }

  // Query 5: Test if the user profile exists
  console.log('\n5. Testing profile existence...');
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', '136cf31c-b37c-45c0-9cf7-755bd1b9afbf');
      
    if (error) {
      console.log('❌ profile lookup failed:', error.message);
    } else {
      if (data && data.length > 0) {
        console.log('✅ Profile exists:', data[0].email);
      } else {
        console.log('⚠️ Profile not found with that ID');
      }
    }
  } catch (_err) {
    console.log('❌ profile lookup exception:', _err.message);
  }

  console.log('\n📋 Analysis:');
  console.log('The 500 errors are likely caused by:');
  console.log('1. RLS policies blocking access when specific filters are applied');
  console.log('2. Policies that fail when checking against non-existent organization_id');
  console.log('3. Missing service_role bypass for API operations');
  console.log('4. Policies referencing columns that might be NULL');
}

async function main() {
  await testFailingQueries();
}

main().catch(console.error);