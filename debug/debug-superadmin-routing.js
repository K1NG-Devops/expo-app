#!/usr/bin/env node

/**
 * Debug Script: Superadmin Routing Issue
 * 
 * This script checks the database state for superadmin users to identify
 * why the routing logic is causing redirect loops.
 * 
 * Usage: node debug-superadmin-routing.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSuperadminUsers() {
  console.log('=== SUPERADMIN ROUTING DEBUG ===\n');
  
  try {
    console.log('1. Checking auth.users table for superadmin accounts...');
    
    // Check auth.users for known superadmin emails
    const superadminEmails = [
      'superadmin@edudashpro.org.za',
      'admin@edudashpro.com'
    ];
    
    for (const email of superadminEmails) {
      console.log(`\n--- Checking ${email} ---`);
      
      // Get auth user
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Auth users query error:', authError);
        continue;
      }
      
      const authUser = authUsers.users.find(u => u.email === email);
      console.log('Auth User Found:', !!authUser);
      console.log('Auth User ID:', authUser?.id);
      console.log('Auth User Metadata:', authUser?.user_metadata);
      console.log('Auth User App Metadata:', authUser?.app_metadata);
      
      if (!authUser) {
        console.log('❌ Auth user not found');
        continue;
      }
      
      // Check profiles table
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id);
        
      console.log('Profiles Query Error:', profileError);
      console.log('Profiles Found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('Profile Data:', profiles[0]);
      }
      
      // Check users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id);
        
      console.log('Users Query Error:', usersError);
      console.log('Users Found:', users?.length || 0);
      if (users && users.length > 0) {
        console.log('User Data:', users[0]);
      }
      
      // Check organizations table if preschool_id exists
      const profileOrOrgId = profiles?.[0]?.preschool_id || users?.[0]?.preschool_id;
      if (profileOrOrgId) {
        console.log(`Checking organization ${profileOrOrgId}...`);
        const { data: orgs, error: orgError } = await supabase
          .from('preschools')
          .select('*')
          .eq('id', profileOrOrgId);
          
        console.log('Organization Query Error:', orgError);
        console.log('Organizations Found:', orgs?.length || 0);
        if (orgs && orgs.length > 0) {
          console.log('Organization Data:', orgs[0]);
        }
      }
      
      // Test the get_my_profile RPC for this user
      console.log('\n--- Testing get_my_profile RPC ---');
      try {
        // Create a client with the user's token (if we can)
        const { data: session, error: sessionError } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: email
        });
        
        if (!sessionError && session.user) {
          // We can't easily simulate this without the actual session
          console.log('Would need actual session to test RPC...');
        } else {
          console.log('Session generation error:', sessionError);
        }
      } catch (rpcError) {
        console.log('RPC test error:', rpcError);
      }
    }
    
    console.log('\n=== DATABASE STATS ===');
    
    // Get table counts
    const tables = ['profiles', 'users', 'preschools', 'organizations'];
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        console.log(`${table}: ${count} records`);
      } catch (_e) {
        console.log(`${table}: Error getting count - ${_e.message}`);
      }
    }
    
    console.log('\n=== ROUTING ANALYSIS ===');
    
    // Analyze the routing logic issues
    console.log('Potential issues:');
    console.log('1. fetchEnhancedUserProfile returns null due to missing profile/user records');
    console.log('2. normalizeRole returns null for unrecognized role values');
    console.log('3. Profiles table missing records for authenticated users');
    console.log('4. RLS policies preventing profile access');
    console.log('5. Missing organization_id causing redirect to onboarding');
    
    console.log('\n=== RECOMMENDATIONS ===');
    console.log('1. Check if profiles exist for superadmin users');
    console.log('2. Verify role values match expected formats');
    console.log('3. Ensure preschool_id/organization_id is set');
    console.log('4. Check RLS policies on profiles table');
    console.log('5. Verify get_my_profile RPC function exists and works');
    
  } catch (_error) {
    console._error('Debug script _error:', _error);
  }
}

async function testRPCFunctions() {
  console.log('\n=== TESTING RPC FUNCTIONS ===');
  
  try {
    // Test get_my_profile (this will fail without proper auth context)
    console.log('Testing get_my_profile RPC...');
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_my_profile');
    
    console.log('RPC Result:', rpcData);
    console.log('RPC Error:', rpcError);
    
    // Check if function exists
    const { data: functions, error: funcError } = await supabase
      .from('pg_proc')
      .select('proname')
      .like('proname', '%get_my_profile%');
      
    console.log('Function exists check:', functions);
    console.log('Function query error:', funcError);
    
  } catch (_error) {
    console.log('RPC test _error:', _error);
  }
}

// Run the debug checks
checkSuperadminUsers()
  .then(() => testRPCFunctions())
  .then(() => {
    console.log('\n=== DEBUG COMPLETE ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', _error);
    process.exit(1);
  });