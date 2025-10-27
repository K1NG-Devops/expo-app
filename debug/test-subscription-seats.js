#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSubscriptionSeats() {
  try {
    console.log('🧪 Testing subscription_seats table access...\n');
    
    // Test query that was failing in the logs
    const { data: seats, error } = await supabase
      .from('subscription_seats')
      .select('user_id')
      .eq('subscription_id', '8f4fda38-d4f2-4234-ac4a-dd348c15e62f');
    
    if (error) {
      console.error('❌ Query failed:', _error);
      return;
    }
    
    console.log('✅ subscription_seats query succeeded!');
    console.log(`Found ${seats.length} seats for the subscription`);
    
    // Test basic table access
    const { data: allSeats, error: allError } = await supabase
      .from('subscription_seats')
      .select('*')
      .limit(3);
      
    if (allError) {
      console.error('❌ Basic seats query failed:', allError);
      return;
    }
    
    console.log(`Found ${allSeats.length} total subscription seats in database`);
    
    // Test assign_teacher_seat function exists (without actually calling it)
    console.log('\n🔧 Testing assign_teacher_seat function availability...');
    
    // We can't actually test the function without proper auth and valid data
    // but we can check if it would return a recognizable error
    const { data: funcTest, error: funcError } = await supabase
      .rpc('assign_teacher_seat', {
        p_subscription_id: '00000000-0000-0000-0000-000000000000',
        p_user_id: '00000000-0000-0000-0000-000000000000'
      });
      
    if (funcError) {
      if (funcError.code === '42883') {
        console.log('❌ assign_teacher_seat function not found');
      } else if (funcError.message && funcError.message.includes('Subscription not found')) {
        console.log('✅ assign_teacher_seat function exists and working (returned expected error)');
      } else {
        console.log('⚠️  Function exists but returned unexpected error:', funcError.message);
      }
    } else {
      console.log('✅ assign_teacher_seat function executed successfully');
    }
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

testSubscriptionSeats();