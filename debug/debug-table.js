require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugTable() {
  try {
    console.log('🔍 Debugging subscription_plans table...\n');
    
    // Try to get table structure
    console.log('📋 Checking table columns...');
    const { data: columns, error: colError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'subscription_plans')
      .eq('table_schema', 'public');
    
    if (columns) {
      console.log('✅ Table columns:');
      columns.forEach(col => {
        console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.log('❌ Could not fetch table columns:', colError);
    }
    
    // Try a simple select to see if we can read
    console.log('\n🔍 Testing SELECT permission...');
    const { data: selectData, error: selectError } = await supabase
      .from('subscription_plans')
      .select('*')
      .limit(1);
    
    if (selectError) {
      console.log('❌ SELECT failed:', selectError);
    } else {
      console.log('✅ SELECT works:', selectData?.length || 0, 'rows returned');
    }
    
    // Try to insert a minimal test record
    console.log('\n🧪 Testing INSERT permission with minimal data...');
    const testPlan = {
      name: 'Test Plan',
      tier: 'test',
      price_monthly: 0,
      is_active: true
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('subscription_plans')
      .insert(testPlan)
      .select();
    
    if (insertError) {
      console.log('❌ INSERT failed:', insertError.message);
      if (insertError.code === '42501') {
        console.log('🔐 This is a Row Level Security (RLS) policy violation');
        console.log('💡 You might need to:');
        console.log('   1. Disable RLS temporarily for seeding');
        console.log('   2. Use a service role key');
        console.log('   3. Insert data through Supabase dashboard');
        console.log('   4. Create an RLS policy that allows inserts');
      }
    } else {
      console.log('✅ INSERT works! Created:', insertData);
      
      // Clean up the test record
      await supabase
        .from('subscription_plans')
        .delete()
        .eq('tier', 'test');
      console.log('🧹 Cleaned up test record');
    }
    
  } catch (_err) {
    console.error('💥 Unexpected error:', _err);
  }
}

debugTable();