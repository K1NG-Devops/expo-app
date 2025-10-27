#!/usr/bin/env node

// Check current subscription and seat data using service role
const { createClient } = require('@supabase/supabase-js');

// Try to read service role key from .env.migration file
const fs = require('fs');
let serviceRoleKey = null;

try {
  const envContent = fs.readFileSync('.env.migration', 'utf8');
  const match = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/);
  if (match) {
    serviceRoleKey = match[1];
  }
} catch (_e) {
  console.log('Could not read service role key from .env.migration');
}

const supabaseUrl = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || serviceRoleKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  console.log('🔍 Checking subscription and seat data...\n');

  // 1. Check subscriptions
  console.log('1. Checking subscriptions...');
  try {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error) {
      console.log('❌ Error fetching subscriptions:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} subscriptions:`);
      data?.forEach((sub, idx) => {
        console.log(`   [${idx}] ID: ${sub.id}`);
        console.log(`       Owner: ${sub.owner_type}, School: ${sub.school_id}`);
        console.log(`       Status: ${sub.status}, Seats: ${sub.seats_used}/${sub.seats_total}`);
        console.log(`       Plan: ${sub.plan_id}, Created: ${sub.created_at}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscriptions:', _e.message);
  }

  // 2. Check subscription_seats
  console.log('\n2. Checking subscription_seats...');
  try {
    const { data, error } = await supabase.from('subscription_seats').select('*');
    if (error) {
      console.log('❌ Error fetching subscription_seats:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} seat assignments:`);
      data?.forEach((seat, idx) => {
        console.log(`   [${idx}] Subscription: ${seat.subscription_id}`);
        console.log(`       User: ${seat.user_id}`);
        console.log(`       Assigned: ${seat.assigned_at}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscription_seats:', _e.message);
  }

  // 3. Check subscription_plans
  console.log('\n3. Checking subscription_plans...');
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*');
    if (error) {
      console.log('❌ Error fetching subscription_plans:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} subscription plans:`);
      data?.forEach((plan, idx) => {
        console.log(`   [${idx}] ID: ${plan.id}, Name: ${plan.name}`);
        console.log(`       Monthly: ${plan.price_monthly}, Annual: ${plan.price_annual}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscription_plans:', _e.message);
  }

  // 4. Check Young Eagles school specifically
  console.log('\n4. Checking Young Eagles school data...');
  const youngEaglesSchoolId = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';
  
  try {
    // Check preschool
    const { data: school, error: schoolError } = await supabase
      .from('preschools')
      .select('*')
      .eq('id', youngEaglesSchoolId)
      .single();
    
    if (schoolError) {
      console.log('❌ Error fetching Young Eagles school:', schoolError.message);
    } else {
      console.log('✅ Young Eagles school found:');
      console.log(`   Name: ${school.name}, Slug: ${school.tenant_slug}`);
      console.log(`   Active: ${school.is_active}`);
    }

    // Check subscriptions for this school
    const { data: subs, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('school_id', youngEaglesSchoolId);
    
    if (subError) {
      console.log('❌ Error fetching subscriptions for Young Eagles:', subError.message);
    } else {
      console.log(`✅ Found ${subs?.length || 0} subscriptions for Young Eagles`);
    }

  } catch (_e) {
    console.log('❌ Exception checking Young Eagles data:', _e.message);
  }
}

checkData().catch(console.error);