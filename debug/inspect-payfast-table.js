#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectPayFastTable() {
  try {
    console.log('🔍 Inspecting payfast_itn_logs table structure...\n');
    
    // Try to get some sample data to understand the structure
    const { data: samples, error } = await supabase
      .from('payfast_itn_logs')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error querying table:', _error);
      
      if (error.code === '42P01') {
        console.log('Table does not exist.');
      } else if (error.code === '42501') {
        console.log('No permission to access table (RLS policy).');
      }
      return;
    }
    
    if (samples && samples.length > 0) {
      console.log('✅ Table exists with data:');
      console.log('Column names:', Object.keys(samples[0]));
      console.log('\nSample record:');
      console.log(JSON.stringify(samples[0], null, 2));
    } else {
      console.log('✅ Table exists but is empty');
      console.log('Need to check table schema from PostgreSQL directly');
    }
    
  } catch (_error) {
    console._error('Script _error:', _error);
  }
}

inspectPayFastTable();