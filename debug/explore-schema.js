#!/usr/bin/env node

/**
 * Explore Database Schema
 * 
 * This script explores the actual database structure to understand
 * table and column names.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function exploreSchema() {
  console.log('🔍 EduDash Pro Database Schema Explorer');
  console.log('======================================\n');

  try {
    // Try to get any rows from users to see actual columns
    console.log('1. Exploring users table...');
    const { data: userSample, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (userError) {
      console.error('❌ Error accessing users table:', userError);
    } else {
      console.log('✅ Users table accessible');
      if (userSample && userSample.length > 0) {
        const columns = Object.keys(userSample[0]);
        console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
        
        // Check for admin/principal users specifically
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('id, email, name, role, preschool_id')
          .or('role.ilike.%principal%,role.ilike.%admin%')
          .limit(5);
          
        if (!adminError && adminUsers) {
          console.log(`   Found ${adminUsers.length} admin/principal users:`);
          adminUsers.forEach(u => {
            console.log(`      - ${u.name} (${u.email}): role=${u.role}, preschool=${u.preschool_id}`);
          });
        }
      } else {
        console.log('   No user records found');
      }
    }

    // Try different possible table names for schools/organizations
    console.log('\n2. Exploring organization/school tables...');
    const possibleTables = ['preschools', 'organizations', 'schools', 'tenants'];
    
    for (const tableName of possibleTables) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!error && data) {
          console.log(`✅ Found table: ${tableName}`);
          if (data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
            
            // Get count of records
            const { count } = await supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true });
            console.log(`   Records: ${count || 0}`);
          } else {
            console.log(`   Table exists but is empty`);
          }
        }
      } catch (_e) {
        // Table doesn't exist, skip
      }
    }

    // Look for any table that might contain "principal" data
    console.log('\n3. Looking for principals in any form...');
    
    // Check if there's a profiles table
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
        
      if (!profileError && profileData) {
        console.log('✅ Found profiles table');
        if (profileData.length > 0) {
          const columns = Object.keys(profileData[0]);
          console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
        }
      }
    } catch (_e) {
      console.log('❌ No profiles table found');
    }

  } catch (_error) {
    console._error('❌ Schema exploration failed:', _error);
  }
}

// Run the exploration
exploreSchema().catch(console.error);