#!/usr/bin/env node

// Comprehensive RLS fixes test - verify activity_logs and find other problematic tables
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tables mentioned in the conversation summary as potentially problematic
const criticalTables = [
  'activity_logs',
  'profiles', 
  'preschools',
  'users',
  'subscriptions',
  'classes',
  'homework_assignments',
  'lessons',
  'ai_generations',
  'billing_plans',
  'announcements',
  'petty_cash_transactions',
  'financial_transactions',
  'push_notifications',
  'push_devices'
];

async function testTableAccess(tableName) {
  console.log(`\n🔍 Testing ${tableName}...`);
  
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
      
    if (error) {
      if (error.message.includes('permission denied') || 
          error.message.includes('policy') || 
          error.code === '42501') {
        console.log(`  ❌ ${tableName}: RLS policy issue - ${_error.message}`);
        return { table: tableName, status: 'rls_error', error: error.message };
      } else if (error.message.includes('does not exist') || 
                 error.message.includes('relation') || 
                 error.code === '42P01') {
        console.log(`  ⚠️  ${tableName}: Table doesn't exist - ${_error.message}`);
        return { table: tableName, status: 'missing', error: error.message };
      } else {
        console.log(`  ❌ ${tableName}: Other error - ${_error.message}`);
        return { table: tableName, status: 'other_error', error: error.message };
      }
    } else {
      const recordCount = data ? data.length : 0;
      console.log(`  ✅ ${tableName}: Accessible (${recordCount} records found)`);
      return { table: tableName, status: 'success', recordCount };
    }
  } catch (_err) {
    console.log(`  ❌ ${tableName}: Exception - ${_err.message}`);
    return { table: tableName, status: 'exception', error: _err.message };
  }
}

async function checkRLSStatus() {
  console.log('\n📊 Checking RLS status of all tables...');
  
  // This will likely fail due to RLS on information_schema access, but worth trying
  try {
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT 
          t.table_name,
          CASE WHEN c.relrowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
        FROM information_schema.tables t
        LEFT JOIN pg_class c ON c.relname = t.table_name
        LEFT JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.table_schema = 'public' 
        AND n.nspname = 'public'
        ORDER BY t.table_name;
      `
    });
    
    if (error) {
      console.log('  ⚠️ Cannot query RLS status directly (expected with current permissions)');
    } else {
      console.log('  ✅ RLS Status:', data);
    }
  } catch (_err) {
    console.log('  ⚠️ RLS status check not available');
  }
}

async function testSpecificQueries() {
  console.log('\n🎯 Testing specific queries that were failing...');
  
  // Test activity_logs specific queries
  try {
    console.log('Testing activity_logs count...');
    const { data, error } = await supabase
      .from('activity_logs')
      .select('id, activity_type, user_name')
      .limit(5);
      
    if (error) {
      console.log(`❌ activity_logs query failed: ${_error.message}`);
    } else {
      console.log(`✅ activity_logs query succeeded: ${data.length} records`);
      if (data.length > 0) {
        console.log('Sample record:', JSON.stringify(data[0], null, 2));
      }
    }
  } catch (_err) {
    console.log(`❌ activity_logs query exception: ${_err.message}`);
  }
  
  // Test profiles queries
  try {
    console.log('Testing profiles count...');
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .limit(3);
      
    if (error) {
      console.log(`❌ profiles query failed: ${_error.message}`);
    } else {
      console.log(`✅ profiles query succeeded: ${data.length} records`);
    }
  } catch (_err) {
    console.log(`❌ profiles query exception: ${_err.message}`);
  }
}

async function main() {
  console.log('🚀 RLS Fixes Verification Test');
  console.log('==============================');
  console.log(`📡 Testing: ${supabaseUrl}`);
  
  const results = {
    success: [],
    rls_errors: [],
    missing_tables: [],
    other_errors: []
  };
  
  // Test each critical table
  for (const table of criticalTables) {
    const result = await testTableAccess(table);
    
    switch (result.status) {
      case 'success':
        results.success.push(result);
        break;
      case 'rls_error':
        results.rls_errors.push(result);
        break;
      case 'missing':
        results.missing_tables.push(result);
        break;
      default:
        results.other_errors.push(result);
    }
    
    // Small delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  await checkRLSStatus();
  await testSpecificQueries();
  
  console.log('\n📋 SUMMARY REPORT');
  console.log('==================');
  console.log(`✅ Accessible tables: ${results.success.length}`);
  console.log(`❌ RLS policy errors: ${results.rls_errors.length}`);
  console.log(`⚠️ Missing tables: ${results.missing_tables.length}`);
  console.log(`🔥 Other errors: ${results.other_errors.length}`);
  
  if (results.rls_errors.length > 0) {
    console.log('\n🚨 TABLES WITH RLS ERRORS (causing 500s):');
    results.rls_errors.forEach(r => {
      console.log(`  - ${r.table}: ${r.error}`);
    });
    console.log('\nThese tables need RLS policy fixes similar to activity_logs');
  }
  
  if (results.success.length > 0) {
    console.log('\n✅ WORKING TABLES:');
    results.success.forEach(r => {
      console.log(`  - ${r.table} (${r.recordCount || 0} records)`);
    });
  }
  
  if (results.missing_tables.length > 0) {
    console.log('\n⚠️ MISSING TABLES:');
    results.missing_tables.forEach(r => {
      console.log(`  - ${r.table}`);
    });
  }
  
  console.log('\n🎯 NEXT STEPS:');
  if (results.rls_errors.length === 0) {
    console.log('✅ No RLS errors found! The 500 errors should be resolved.');
    console.log('🔧 You can now remove the temporary debug policy:');
    console.log('   DROP POLICY "temp_anon_debug_access" ON activity_logs;');
  } else {
    console.log('❌ Additional tables need RLS policy fixes');
    console.log('📝 Create similar fixes for the tables listed above');
  }
}

main().catch(console.error);