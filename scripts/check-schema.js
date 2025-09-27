const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSchema() {
  console.log('🔍 Checking subscription-related table schema...\n');

  try {
    // Check if subscription_plans table exists and its structure
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(0);

    if (plansError) {
      console.log('❌ subscription_plans table error:', plansError.message);
    } else {
      console.log('✅ subscription_plans table exists');
    }

    // Check if subscriptions table exists and its structure  
    const { data: subs, error: subsError } = await supabase
      .from('subscriptions')
      .select('*')
      .limit(0);

    if (subsError) {
      console.log('❌ subscriptions table error:', subsError.message);
    } else {
      console.log('✅ subscriptions table exists');
    }

    // Try to get schema information
    const { data: tableInfo, error: infoError } = await supabase
      .rpc('get_table_info', {
        table_name: 'subscription_plans'
      });

    if (infoError) {
      console.log('Note: Cannot get detailed schema info -', infoError.message);
    }

    // Check what tables exist
    console.log('\n📋 Available tables:');
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%subscription%'
      ORDER BY table_name;
    `;
    
    const { data: tables, error: tablesError } = await supabase.rpc('run_sql', {
      query: tablesQuery
    });

    if (tablesError) {
      console.log('Cannot query tables:', tablesError.message);
    } else if (tables) {
      console.log('Subscription-related tables:', tables);
    }

  } catch (error) {
    console.error('❌ Schema check failed:', error.message);
  }
}

checkSchema();