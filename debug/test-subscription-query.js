#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionQuery() {
  try {
    console.log('🧪 Testing subscription query that was failing...\n');
    
    // Test the exact query that was failing in the logs
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('owner_type', 'school')
      .eq('school_id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1')
      .eq('status', 'active');
    
    if (error) {
      console.error('❌ Query failed:', _error);
      return;
    }
    
    console.log('✅ Query succeeded!');
    console.log(`Found ${subscriptions.length} active school subscriptions`);
    
    if (subscriptions.length > 0) {
      console.log('Subscription IDs:', subscriptions.map(s => s.id));
    }
    
    // Test basic subscription query without filters
    const { data: allSubs, error: allError } = await supabase
      .from('subscriptions')
      .select('id, owner_type, school_id, status')
      .limit(3);
      
    if (allError) {
      console.error('❌ Basic query failed:', allError);
      return;
    }
    
    console.log('\n📋 Sample subscriptions:');
    allSubs.forEach((sub, i) => {
      console.log(`${i + 1}. ID: ${sub.id}`);
      console.log(`   Owner Type: ${sub.owner_type}`);
      console.log(`   School ID: ${sub.school_id}`);
      console.log(`   Status: ${sub.status}\n`);
    });
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

testSubscriptionQuery();