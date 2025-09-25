#!/usr/bin/env node

// Check what tables exist in the database
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  const tablesToCheck = [
    'profiles',
    'users', 
    'preschools',
    'subscriptions',
    'subscription_seats',
    'subscription_plans'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`❌ Table "${table}": ${_error.message}`);
      } else {
        console.log(`✅ Table "${table}": exists and accessible`);
      }
    } catch (_e) {
      console.log(`❌ Table "${table}": ${_e.message}`);
    }
  }

  // Try to check table schema using information_schema
  console.log('\n📋 Checking table structures...');
  try {
    const { data, error } = await supabase.rpc('exec_sql', { 
      query: `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `
    });
    
    if (error) {
      console.log('❌ Cannot check table list:', error.message);
    } else {
      console.log('✅ Available tables:', data?.map(r => r.table_name).join(', '));
    }
  } catch (_e) {
    console.log('ℹ️ Cannot query information_schema (expected with anon role)');
  }
}

checkSchema().catch(console.error);