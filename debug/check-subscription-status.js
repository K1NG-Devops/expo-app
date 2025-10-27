#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSubscriptionStatus() {
  console.log('🔍 Checking subscription status...\n');

  // Check all subscriptions
  console.log('1. Checking all subscriptions...');
  try {
    const { data: allSubs, error: subsError } = await supabase
      .from('subscriptions')
      .select(`
        *,
        preschools!subscriptions_school_id_fkey (
          id,
          name,
          tenant_slug,
          subscription_tier,
          email
        )
      `)
      .eq('owner_type', 'school')
      .order('created_at', { ascending: false })
      .limit(5);

    if (subsError) {
      console.log('❌ Error fetching subscriptions:', subsError);
    } else {
      console.log(`✅ Found ${allSubs.length} school subscriptions:`);
      allSubs.forEach(sub => {
        console.log(`  - ${sub.preschools?.name || 'Unknown'}: ${sub.status} (${sub.plan_id})`);
        console.log(`    Created: ${new Date(sub.created_at).toLocaleString()}`);
        console.log(`    School ID: ${sub.school_id}`);
      });
    }
  } catch (_e) {
    console.log('❌ Subscription check error:', _e.message);
  }

  // Check preschools subscription_tier
  console.log('\n2. Checking preschool subscription tiers...');
  try {
    const { data: schools, error: schoolsError } = await supabase
      .from('preschools')
      .select('id, name, subscription_tier, subscription_status, subscription_plan_id')
      .limit(5);

    if (schoolsError) {
      console.log('❌ Error fetching schools:', schoolsError);
    } else {
      console.log(`✅ Found ${schools.length} schools:`);
      schools.forEach(school => {
        console.log(`  - ${school.name}:`);
        console.log(`    Tier: ${school.subscription_tier || 'none'}`);
        console.log(`    Status: ${school.subscription_status || 'none'}`);
        console.log(`    Plan ID: ${school.subscription_plan_id || 'none'}`);
      });
    }
  } catch (_e) {
    console.log('❌ School check error:', _e.message);
  }

  // Check current user's school subscription
  console.log('\n3. Simulating principal dashboard subscription check...');
  console.log('   (Note: This uses anonymous role, so may not match exact principal logic)');
  
  try {
    // This simulates how principal dashboard might check for subscription
    const testSchoolId = 'ba79097c-1b93-4b48-bc0e-0f73870ab4d1'; // From your logs
    
    const { data: userSubscription, error: userSubError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('school_id', testSchoolId)
      .eq('status', 'active')
      .maybeSingle();

    if (userSubError && userSubError.code !== 'PGRST116') {
      console.log('❌ Error checking user subscription:', userSubError);
    } else if (userSubscription) {
      console.log('✅ Active subscription found for test school:');
      console.log(`  Plan: ${userSubscription.plan_id}`);
      console.log(`  Status: ${userSubscription.status}`);
      console.log(`  Seats: ${userSubscription.seats_used}/${userSubscription.seats_total}`);
    } else {
      console.log('⚠️  No active subscription found for test school');
    }

    // Check preschool record too
    const { data: schoolRecord, error: schoolError } = await supabase
      .from('preschools')
      .select('subscription_tier, subscription_status')
      .eq('id', testSchoolId)
      .single();

    if (schoolError) {
      console.log('❌ Error checking school record:', schoolError);
    } else {
      console.log('✅ School subscription fields:');
      console.log(`  Tier: ${schoolRecord.subscription_tier || 'none'}`);
      console.log(`  Status: ${schoolRecord.subscription_status || 'none'}`);
    }

  } catch (_e) {
    console.log('❌ User subscription check error:', _e.message);
  }

  console.log('\n📋 Possible reasons principal dashboard not updating:');
  console.log('1. Principal dashboard uses different school ID');
  console.log('2. Subscription created but preschools table not updated');
  console.log('3. Principal dashboard caching old data');
  console.log('4. RLS policies blocking principal from seeing subscription');
  console.log('5. Principal dashboard checking different subscription fields');
}

checkSubscriptionStatus().catch(console.error);