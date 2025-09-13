#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = 'https://rpbxqgsqgaqwctzzjxui.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwYnhxZ3NxZ2Fxd2N0enpqeHVpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjYyNTUsImV4cCI6MjA1MTQwMjI1NX0.49CJcXTq5AO0HPEkqiRhq8NbO3RqPXnRSfmYPK5wIjQ';

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