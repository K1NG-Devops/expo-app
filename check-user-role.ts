#!/usr/bin/env tsx
/**
 * Check User Profile and Organization Creation Setup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const userId = '136cf31c-b37c-45c0-9cf7-755bd1b9afbf';

async function checkUser() {
  console.log('🔍 Checking User Profile\n');
  console.log('User ID:', userId);
  console.log('');

  // 1. Check profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('❌ Profile Error:', profileError);
    return;
  }

  console.log('📋 User Profile:');
  console.log('  Email:', profile.email);
  console.log('  Role:', profile.role);
  console.log('  First Name:', profile.first_name);
  console.log('  Last Name:', profile.last_name);
  console.log('  Preschool ID:', profile.preschool_id || '(none)');
  console.log('  Organization ID:', (profile as any).organization_id || '(none)');
  console.log('');

  // Check if role allows organization creation
  if (profile.role !== 'principal' && profile.role !== 'superadmin') {
    console.log('⚠️  WARNING: User role is NOT principal or superadmin!');
    console.log('   Current role:', profile.role);
    console.log('   This will prevent organization creation.');
    console.log('');
    console.log('💡 To fix, update the user role:');
    console.log(`   UPDATE profiles SET role = 'principal' WHERE id = '${userId}';`);
    console.log('');
  } else {
    console.log('✅ User role allows organization creation');
    console.log('');
  }

  // 2. Check if RPC function exists
  const { data: rpcCheck, error: rpcError } = await supabase.rpc('create_organization', {
    p_name: 'Test Org',
    p_type: 'skills',
    p_phone: null,
    p_status: 'pending',
  });

  if (rpcError) {
    console.log('🔍 RPC Function Test:');
    console.log('  Error Code:', rpcError.code);
    console.log('  Error Message:', rpcError.message);
    console.log('  Details:', rpcError.details);
    console.log('  Hint:', rpcError.hint);
    console.log('');

    if (rpcError.code === '42883') {
      console.log('❌ RPC function does not exist!');
    } else if (rpcError.code === '42501') {
      console.log('✅ RPC function exists (permission error expected with service role)');
    } else {
      console.log('⚠️  Unexpected error:', rpcError.message);
    }
  } else {
    console.log('✅ RPC executed successfully (unexpected with service role)');
    console.log('   Data:', rpcCheck);
  }

  console.log('');

  // 3. Check organizations table structure
  const { data: columns, error: colError } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_schema', 'public')
    .eq('table_name', 'organizations')
    .order('ordinal_position');

  if (!colError && columns) {
    console.log('📊 Organizations Table Columns:');
    columns.forEach((col: any) => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : ''}`);
    });
    console.log('');
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
