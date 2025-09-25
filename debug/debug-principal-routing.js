#!/usr/bin/env node

/**
 * Debug Principal Routing Issues
 * 
 * This script helps identify why principals are being redirected to onboarding
 * instead of their dashboard.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugPrincipalRouting() {
  console.log('🔍 EduDash Pro Principal Routing Debug');
  console.log('=====================================\n');

  try {
    // 1. Check for principal users
    console.log('1. Looking for principal users...');
    const { data: principals, error: principalError } = await supabase
      .from('users')
      .select(`
        id,
        auth_user_id,
        email,
        name,
        role,
        preschool_id,
        created_at
      `)
      .or('role.ilike.%principal%,role.ilike.%admin%');

    if (principalError) {
      console.error('❌ Error fetching principals:', principalError);
      return;
    }

    console.log(`✅ Found ${principals?.length || 0} principal users:`);
    principals?.forEach((principal, index) => {
      console.log(`\n   👤 Principal ${index + 1}:`);
      console.log(`      Name: ${principal.name}`);
      console.log(`      Email: ${principal.email}`);
      console.log(`      Role: ${principal.role}`);
      console.log(`      Preschool ID: ${principal.preschool_id || 'MISSING ⚠️'}`);
      console.log(`      Auth User ID: ${principal.auth_user_id}`);
    });

    // 2. Check for preschools/organizations
    console.log('\n\n2. Looking for preschools/organizations...');
    const { data: preschools, error: preschoolError } = await supabase
      .from('preschools')
      .select(`
        id,
        name,
        plan_tier,
        is_active,
        created_at
      `)
      .eq('is_active', true);

    if (preschoolError) {
      console.error('❌ Error fetching preschools:', preschoolError);
    } else {
      console.log(`✅ Found ${preschools?.length || 0} active preschools:`);
      preschools?.forEach((school, index) => {
        console.log(`\n   🏦 School ${index + 1}:`);
        console.log(`      Name: ${school.name}`);
        console.log(`      ID: ${school.id}`);
        console.log(`      Plan: ${school.plan_tier}`);
        console.log(`      Active: ${school.is_active}`);
        console.log(`      Created: ${school.created_at}`);
      });
    }

    // 3. Check for orphaned principals (principals without preschool_id but schools exist)
    console.log('\n\n3. Checking for data consistency issues...');
    
    if (principals && preschools) {
      const orphanedPrincipals = principals.filter(p => !p.preschool_id);
      const schoolsWithoutPrincipals = preschools.filter(s => 
        !principals.some(p => p.preschool_id === s.id)
      );

      console.log(`\n   🚨 Issues Found:`);
      console.log(`      Principals without schools: ${orphanedPrincipals.length}`);
      console.log(`      Schools without principals: ${schoolsWithoutPrincipals.length}`);

      if (orphanedPrincipals.length > 0) {
        console.log('\n   ⚠️  Orphaned Principals:');
        orphanedPrincipals.forEach(p => {
          console.log(`      - ${p.name} (${p.email}) - Missing preschool_id`);
        });
      }

      if (schoolsWithoutPrincipals.length > 0) {
        console.log('\n   ⚠️  Orphaned Schools:');
        schoolsWithoutPrincipals.forEach(s => {
          console.log(`      - ${s.name} (ID: ${s.id}) - No linked principal`);
        });
      }
    }

    // 4. Check auth.users table metadata
    console.log('\n\n4. Checking auth metadata (if accessible)...');
    
    // This may not work with RLS, but let's try
    const { data: authUsers, error: authError } = await supabase.auth.admin?.listUsers?.();
    
    if (!authError && authUsers) {
      console.log(`✅ Found ${authUsers.users?.length || 0} auth users`);
      const principalAuthUsers = authUsers.users?.filter(u => 
        u.user_metadata?.role?.includes('principal') || 
        principals?.some(p => p.auth_user_id === u.id)
      );
      
      console.log(`   Principal auth users: ${principalAuthUsers?.length || 0}`);
      principalAuthUsers?.forEach(u => {
        console.log(`      - ${u.email}: role=${u.user_metadata?.role}, metadata=${JSON.stringify(u.user_metadata)}`);
      });
    } else {
      console.log('⚠️  Cannot access auth.users (requires service role)');
    }

  } catch (_error) {
    console._error('❌ Debug failed:', _error);
  }

  console.log('\n\n🔧 Suggested Fixes:');
  console.log('==================');
  console.log('1. If principals exist but missing preschool_id:');
  console.log('   - Update users.preschool_id to match their school');
  console.log('');
  console.log('2. If routing logic is faulty:');
  console.log('   - Check routeAfterLogin.ts line 186-188');
  console.log('   - Ensure preschool_id is properly set in user profiles');
  console.log('');
  console.log('3. If profile data is stale:');
  console.log('   - Force refresh user profile in app');
  console.log('   - Clear auth cache and re-login');
  console.log('');
  console.log('4. Create fix script to link principals to schools');
}

// Run the debug
debugPrincipalRouting().catch(console.error);