#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkPaymentStatus() {
  try {
    console.log('🔍 Checking recent payment transactions...\n');
    
    // Get recent payment transactions
    const { data: transactions, error: txError } = await supabase
      .from('payment_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (txError) {
      console.error('Error fetching transactions:', txError);
      return;
    }
    
    console.log('📊 Recent Payment Transactions:');
    transactions.forEach((tx, i) => {
      console.log(`${i + 1}. ID: ${tx.id}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Amount: ${tx.amount} ${tx.currency}`);
      console.log(`   School ID: ${tx.school_id}`);
      console.log(`   Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
      console.log(`   Created: ${tx.created_at}\n`);
    });
    
    console.log('🏫 Checking subscriptions...\n');
    
    // Get recent subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return;
    }
    
    console.log('📋 Recent Subscriptions:');
    subscriptions.forEach((sub, i) => {
      console.log(`${i + 1}. ID: ${sub.id}`);
      console.log(`   School ID: ${sub.school_id}`);
      console.log(`   Plan ID: ${sub.plan_id}`);
      console.log(`   Status: ${sub.status}`);
      console.log(`   Owner Type: ${sub.owner_type}`);
      console.log(`   Billing: ${sub.billing_frequency}`);
      console.log(`   Seats: ${sub.seats_used}/${sub.seats_total}`);
      console.log(`   Created: ${sub.created_at}`);
      console.log(`   Metadata: ${JSON.stringify(sub.metadata, null, 2)}\n`);
    });

    // Check if we have any pending transactions that might need webhook processing
    const pendingTx = transactions.filter(tx => tx.status === 'pending');
    if (pendingTx.length > 0) {
      console.log('⚠️  Found pending transactions that may need webhook processing:');
      pendingTx.forEach(tx => {
        console.log(`   - Transaction ID: ${tx.id} (Status: ${tx.status})`);
      });
    }
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

checkPaymentStatus();