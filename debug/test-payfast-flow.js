#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testPayFastFlow() {
  try {
    console.log('🧪 Testing PayFast checkout creation flow...\n');
    
    // Test 1: Check if subscription_plans exist
    console.log('1. 📋 Checking subscription plans...');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('id, tier, name, price_monthly, price_annual, is_active')
      .eq('is_active', true)
      .limit(3);
    
    if (plansError) {
      console.error('❌ Failed to fetch subscription plans:', plansError);
      return;
    }
    
    if (!plans || plans.length === 0) {
      console.log('❌ No active subscription plans found - this will cause checkout to fail');
      console.log('   The app needs subscription plans to create payment transactions');
      return;
    }
    
    console.log(`✅ Found ${plans.length} active subscription plans:`);
    plans.forEach(plan => {
      console.log(`   - ${plan.tier}: ${plan.name} (R${plan.price_monthly}/month)`);
    });
    
    // Test 2: Try to call the payments-create-checkout function
    console.log('\n2. 💳 Testing payments-create-checkout function...');
    
    // Find a paid plan (not free)
    const paidPlan = plans.find(p => p.tier !== 'free' && p.price_monthly > 0) || plans[1];
    console.log(`   Using plan: ${paidPlan?.tier} (R${paidPlan?.price_monthly}/month)`);
    
    const checkoutInput = {
      scope: 'school',
      schoolId: 'ba79097c-1b93-4b48-bcbe-df73878ab4d1', // From the logs
      planTier: paidPlan?.tier || plans[1]?.tier, // Use paid plan
      billing: 'monthly',
      seats: 5,
      return_url: 'https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments/return',
      cancel_url: 'https://bridge-edudashpro-g2818dbtv-k1ng-devops-projects.vercel.app/payments/cancel',
    };
    
    console.log('   Calling checkout function with:', JSON.stringify(checkoutInput, null, 2));
    
    const { data: checkoutResult, error: checkoutError } = await supabase.functions.invoke('payments-create-checkout', {
      body: checkoutInput
    });
    
    if (checkoutError) {
      console.error('❌ Checkout function failed:', checkoutError);
      return;
    }
    
    if (checkoutResult?.redirect_url) {
      console.log('✅ Checkout function succeeded!');
      console.log('   Redirect URL:', checkoutResult.redirect_url);
      
      // Now check if a payment transaction was created
      console.log('\n3. 🔍 Checking if payment transaction was created...');
      
      const { data: transactions, error: txError } = await supabase
        .from('payment_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (txError) {
        console.error('❌ Failed to check payment transactions:', txError);
        return;
      }
      
      if (transactions && transactions.length > 0) {
        console.log('✅ Payment transaction created successfully!');
        console.log('   Transaction ID:', transactions[0].id);
        console.log('   Amount:', transactions[0].amount, transactions[0].currency);
        console.log('   Status:', transactions[0].status);
      } else {
        console.log('❌ No payment transaction found - checkout function succeeded but didn\'t create transaction');
      }
      
    } else {
      console.log('❌ Checkout function returned success but no redirect_url');
      console.log('   Response:', JSON.stringify(checkoutResult, null, 2));
    }
    
    // Test 3: Check current subscriptions
    console.log('\n4. 🏫 Checking current subscriptions...');
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('id, school_id, plan_id, status, owner_type, seats_used, seats_total')
      .limit(3);
    
    if (subsError) {
      console.error('❌ Failed to check subscriptions:', subsError);
      return;
    }
    
    console.log(`Found ${subs.length} total subscriptions:`);
    subs.forEach(sub => {
      console.log(`   - ID: ${sub.id}, School: ${sub.school_id}, Status: ${sub.status}, Seats: ${sub.seats_used}/${sub.seats_total}`);
    });
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

testPayFastFlow();