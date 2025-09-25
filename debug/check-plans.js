require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
console.log('Supabase Key:', supabaseKey ? 'Set' : 'Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSubscriptionPlans() {
  try {
    console.log('\n🔍 Checking subscription_plans table...');
    
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(10);
    
    if (error) {
      console.error('❌ Error querying subscription_plans:', _error);
      
      // Check if table exists by trying to describe it
      console.log('\n🔍 Checking if table exists...');
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'subscription_plans');
        
      if (tablesError) {
        console.error('❌ Error checking table existence:', tablesError);
      } else {
        console.log('📋 Table existence check:', tables?.length > 0 ? 'EXISTS' : 'NOT FOUND');
      }
      
      return;
    }
    
    console.log('✅ Query successful!');
    console.log(`📊 Found ${data?.length || 0} subscription plans:`);
    
    if (data && data.length > 0) {
      data.forEach((plan, index) => {
        console.log(`\n${index + 1}. ${plan.name || 'Unnamed Plan'}`);
        console.log(`   ID: ${plan.id}`);
        console.log(`   Tier: ${plan.tier || 'No tier'}`);
        console.log(`   Price (monthly): ${plan.price_monthly || 'N/A'}`);
        console.log(`   Max teachers: ${plan.max_teachers || 'N/A'}`);
        console.log(`   Active: ${plan.is_active ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('📝 No subscription plans found in the database');
      console.log('🛠️  You may need to seed the database with subscription plans');
    }
    
  } catch (_err) {
    console.error('💥 Unexpected error:', _err);
  }
}

checkSubscriptionPlans();