#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function authenticatedCheck() {
  try {
    console.log('🔐 Testing with authentication (login as superadmin)...\n');
    
    // Try to sign in as superadmin to bypass RLS restrictions
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'superadmin@edudashpro.org.za',
      password: '#Olivia@17'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError.message);
      console.log('Will proceed with anonymous access...\n');
    } else {
      console.log('✅ Authenticated as:', authData.user.email);
      console.log('   User ID:', authData.user.id);
      console.log('   Role: superadmin (should bypass RLS)\n');
    }
    
    // Now check data with potentially elevated permissions
    console.log('📊 Checking payment transactions with auth...');
    const { data: transactions, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (txError) {
      console.error('❌ Transaction query failed:', txError);
    } else {
      console.log(`Found ${transactions.length} payment transactions`);
      if (transactions.length > 0) {
        transactions.forEach((tx, i) => {
          console.log(`${i + 1}. ID: ${tx.id}`);
          console.log(`   Status: ${tx.status}`);
          console.log(`   Amount: ${tx.amount} ${tx.currency}`);
          console.log(`   School: ${tx.school_id}`);
          console.log(`   Created: ${tx.created_at}\n`);
        });
      }
    }
    
    console.log('📋 Checking subscriptions with auth...');
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (subError) {
      console.error('❌ Subscription query failed:', subError);
    } else {
      console.log(`Found ${subscriptions.length} subscriptions`);
      if (subscriptions.length > 0) {
        subscriptions.forEach((sub, i) => {
          console.log(`${i + 1}. ID: ${sub.id}`);
          console.log(`   School: ${sub.school_id}`);
          console.log(`   Status: ${sub.status}`);
          console.log(`   Owner Type: ${sub.owner_type}`);
          console.log(`   Seats: ${sub.seats_used}/${sub.seats_total}`);
          console.log(`   Created: ${sub.created_at}\n`);
        });
      }
    }
    
    console.log('🎫 Checking subscription seats...');
    const { data: seats, error: seatsError } = await supabase
      .from('subscription_seats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (seatsError) {
      console.error('❌ Seats query failed:', seatsError);
    } else {
      console.log(`Found ${seats.length} subscription seats`);
      if (seats.length > 0) {
        seats.forEach((seat, i) => {
          console.log(`${i + 1}. Subscription: ${seat.subscription_id}`);
          console.log(`   User: ${seat.user_id}`);
          console.log(`   Active: ${seat.is_active}`);
          console.log(`   Assigned: ${seat.assigned_at}\n`);
        });
      }
    }
    
    // Test the specific subscription that was getting 409 errors
    console.log('🔍 Checking specific subscription from logs (8f4fda38-d4f2-4234-ac4a-dd348c15e62f)...');
    const { data: specificSub, error: specificError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', '8f4fda38-d4f2-4234-ac4a-dd348c15e62f');
    
    if (specificError) {
      console.error('❌ Specific subscription query failed:', specificError);
    } else if (specificSub && specificSub.length > 0) {
      console.log('✅ Found specific subscription:');
      const sub = specificSub[0];
      console.log(`   ID: ${sub.id}`);
      console.log(`   School: ${sub.school_id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Seats: ${sub.seats_used}/${sub.seats_total}`);
      console.log(`   Plan: ${sub.plan_id}`);
      console.log(`   Owner Type: ${sub.owner_type}`);
    } else {
      console.log('❌ Specific subscription not found');
    }
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

authenticatedCheck();