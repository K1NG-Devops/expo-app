#!/usr/bin/env node

// Test script to diagnose Principal Dashboard database issues
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_DB_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test 1: Basic connection
    const { data: testData, error: testError } = await supabase
      .from('preschools')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Basic connection failed:', testError);
      return;
    }
    console.log('✅ Basic connection successful');

    // Test 2: Check preschools table structure
    console.log('\n🔍 Checking preschools table...');
    const { data: preschools, error: preschoolError } = await supabase
      .from('preschools')
      .select('id, name, tenant_slug')
      .limit(5);
      
    if (preschoolError) {
      console.error('❌ Preschools query failed:', preschoolError);
    } else {
      console.log('✅ Found preschools:', preschools);
    }

    // Test 3: Look for Young Eagles specifically
    console.log('\n🔍 Looking for Young Eagles...');
    const { data: youngEagles, error: yeError } = await supabase
      .from('preschools')
      .select('*')
      .or('tenant_slug.eq.young-eagles,name.ilike.%young%eagles%');
      
    if (yeError) {
      console.error('❌ Young Eagles search failed:', yeError);
    } else {
      console.log('✅ Young Eagles search results:', youngEagles);
    }

    // Test 4: Check organizations table
    console.log('\n🔍 Checking organizations table...');
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .limit(5);
      
    if (orgError) {
      console.error('❌ Organizations query failed:', orgError);
    } else {
      console.log('✅ Found organizations:', orgs);
    }

    // Test 5: Check RLS policies
    console.log('\n🔍 Testing RLS policies...');
    // This will fail if RLS blocks access
    const { data: rlsTest, error: rlsError } = await supabase
      .from('preschools')
      .select('id')
      .eq('id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1');
      
    if (rlsError) {
      console.error('❌ RLS test failed (this might be expected):', rlsError.message);
    } else {
      console.log('✅ RLS test passed:', rlsTest);
    }

  } catch (error) {
    console.error('❌ Test script error:', error);
  }
}

testConnection();
