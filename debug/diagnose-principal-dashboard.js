#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnosePrincipalDashboard() {
  console.log('🔍 Diagnosing Principal Dashboard Subscription Detection...\n');
  
  // Known school IDs from your data
  const schoolIds = [
    'ba79097c-1b93-4b48-bcbe-df73878ab4d1', // Young Eagles
    '2c37b53d-9092-46a2-955e-6f657368a756', // Fringe
  ];
  
  for (const schoolId of schoolIds) {
    console.log(`\n🏫 Checking school: ${schoolId}`);
    
    // Get school name
    try {
      const { data: school } = await supabase
        .from('preschools')
        .select('name, subscription_status, subscription_tier')
        .eq('id', schoolId)
        .single();
        
      if (school) {
        console.log(`   Name: ${school.name}`);
        console.log(`   Subscription Status: ${school.subscription_status}`);
        console.log(`   Subscription Tier: ${school.subscription_tier}`);
      }
    } catch (_e) {
      console.log(`   ❌ Could not fetch school details: ${_e.message}`);
    }
    
    // Test the EXACT query used by principal-seat-management.tsx (line 58)
    console.log('   Testing principal dashboard subscription query...');
    try {
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('owner_type', 'school')
        .eq('school_id', schoolId)
        .eq('status', 'active')
        .maybeSingle();
        
      if (error) {
        console.log(`   ❌ Subscription query error: ${_error.message}`);
      } else if (subscription) {
        console.log(`   ✅ Active subscription found: ${subscription.id}`);
      } else {
        console.log(`   ⚠️  No active subscription found`);
      }
    } catch (_e) {
      console.log(`   ❌ Subscription query failed: ${_e.message}`);
    }
    
    // Test a broader subscription query
    console.log('   Testing broader subscription query...');
    try {
      const { data: allSubs } = await supabase
        .from('subscriptions')
        .select('id, status, owner_type')
        .eq('school_id', schoolId);
        
      console.log(`   Found ${allSubs?.length || 0} total subscriptions for this school`);
      allSubs?.forEach(sub => {
        console.log(`     - ${sub.id}: ${sub.status} (${sub.owner_type})`);
      });
    } catch (_e) {
      console.log(`   ❌ Broad subscription query failed: ${_e.message}`);
    }
  }
  
  console.log('\n📋 Diagnostic Summary:');
  console.log('If subscriptions are found but principal dashboard shows "No Active Subscription":');
  console.log('1. Check if principal is logged in with correct school ID');
  console.log('2. Clear browser cache/localStorage');
  console.log('3. Refresh the principal dashboard page');
  console.log('4. Check RLS policies for principal role');
  console.log('5. Verify principal user profile has correct preschool_id');
  
  // Test current user's auth state (if any)
  console.log('\n🔐 Checking current auth state...');
  try {
    const { data: authData } = await supabase.auth.getSession();
    if (authData.session?.user) {
      console.log(`Current user: ${authData.session.user.email}`);
      console.log(`User ID: ${authData.session.user.id}`);
      
      // Try to get their profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, preschool_id')
        .eq('id', authData.session.user.id)
        .single();
        
      if (profile) {
        console.log(`Role: ${profile.role}`);
        console.log(`Preschool ID: ${profile.preschool_id}`);
      }
    } else {
      console.log('No authenticated user (using anonymous access)');
    }
  } catch (_e) {
    console.log('Could not check auth state');
  }
}

diagnosePrincipalDashboard().catch(console.error);