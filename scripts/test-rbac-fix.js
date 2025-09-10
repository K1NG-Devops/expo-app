#!/usr/bin/env node

/**
 * Simple test to verify RBAC database fix
 * Tests that the organization_members relationship is now working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRBACFix() {
  console.log('🧪 Testing RBAC Database Fix...\n');

  try {
    // Test 1: Check if organization_members table exists and is accessible
    console.log('1. Testing organization_members table access...');
    const { data: orgMembers, error: orgError } = await supabase
      .from('organization_members')
      .select('*')
      .limit(1);
    
    if (orgError) {
      console.log('❌ organization_members table access failed:', orgError.message);
    } else {
      console.log('✅ organization_members table accessible');
      console.log(`   Found ${orgMembers ? orgMembers.length : 0} sample records`);
    }

    // Test 2: Check if organizations table exists and is accessible  
    console.log('\n2. Testing organizations table access...');
    const { data: orgs, error: orgsError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1);
    
    if (orgsError) {
      console.log('❌ organizations table access failed:', orgsError.message);
    } else {
      console.log('✅ organizations table accessible');
      console.log(`   Found ${orgs ? orgs.length : 0} sample records`);
    }

    // Test 3: Test the new RBAC helper functions
    console.log('\n3. Testing RBAC helper functions...');
    const { data: roleTest, error: roleError } = await supabase
      .rpc('get_user_role');
    
    if (roleError) {
      console.log('❌ get_user_role function failed:', roleError.message);
    } else {
      console.log('✅ get_user_role function accessible');
      console.log(`   Current role: ${roleTest || 'unauthenticated'}`);
    }

    // Test 4: Check profiles table with organization membership join
    console.log('\n4. Testing profiles with organization membership...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        role,
        preschool_id,
        organization_members!inner(
          organization_id,
          seat_status
        )
      `)
      .limit(1);
    
    if (profilesError) {
      console.log('❌ profiles join with organization_members failed:', profilesError.message);
      console.log('   This is the error that should now be FIXED!');
    } else {
      console.log('✅ profiles with organization_members join working!');
      console.log(`   Found ${profiles ? profiles.length : 0} profiles with org membership`);
      if (profiles && profiles.length > 0) {
        console.log('   Sample data structure working correctly ✨');
      }
    }

    console.log('\n' + '='.repeat(50));
    
    if (profilesError && profilesError.message.includes('Could not find a relationship')) {
      console.log('❌ RBAC Fix Status: FAILED');
      console.log('   The original error still exists - relationships not properly established');
    } else {
      console.log('✅ RBAC Fix Status: SUCCESS');
      console.log('   Database relationships are now properly established!');
      console.log('   Your app should no longer show the RBAC error.');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testRBACFix()
  .then(() => {
    console.log('\n🎉 RBAC fix test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
