#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_DB_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env. Set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('📋 Checking existing database tables...');
  
  try {
    // Get list of tables in public schema
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
      
    if (error) {
      console.error('❌ Error fetching tables:', error);
      return;
    }
    
    console.log('\n✅ Existing tables in public schema:');
    data.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
    // Check specifically for Principal Hub tables
    const principalHubTables = [
      'principal_announcements', 
      'financial_transactions', 
      'teacher_performance_metrics'
    ];
    
    const existingTables = data.map(t => t.table_name);
    
    console.log('\n🎯 Principal Hub table status:');
    principalHubTables.forEach(tableName => {
      const exists = existingTables.includes(tableName);
      console.log(`${exists ? '✅' : '❌'} ${tableName}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

checkTables();