#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const serviceClient = createClient(url, serviceKey);

async function checkUsers() {
  try {
    console.log('Checking users in database...\n');
    
    // Get all users from users table
    const { data: users, error: usersError } = await serviceClient
      .from('users')
      .select('id, email, role, preschool_id, auth_user_id, is_active, first_name, last_name')
      .order('email');
      
    if (usersError) {
      console.error('Error fetching users:', usersError.message);
      return;
    }
    
    console.log(`Found ${users.length} users in users table:`);
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Auth User ID: ${user.auth_user_id || 'none'}`);
      console.log(`   Active: ${user.is_active}`);
      console.log(`   Name: ${user.first_name || 'none'} ${user.last_name || 'none'}`);
      console.log();
    });
    
    // Try to check auth.users table (might fail due to RLS)
    console.log('Checking auth.users table...');
    try {
      const { data: authUsers, error: authError } = await serviceClient
        .from('auth.users')
        .select('id, email, email_confirmed_at, created_at')
        .order('email');
        
      if (authError) {
        console.log('Cannot access auth.users table (this is normal)');
      } else if (authUsers) {
        console.log(`Found ${authUsers.length} users in auth.users table:`);
        authUsers.forEach(user => {
          console.log(`- ${user.email} (confirmed: ${!!user.email_confirmed_at})`);
        });
      }
    } catch (_e) {
      console.log('Cannot access auth.users table (this is normal)');
    }
    
    // Check if any users in users table have matching auth_user_id
    const usersWithAuth = users.filter(u => u.auth_user_id);
    console.log(`\nUsers with auth_user_id: ${usersWithAuth.length}`);
    usersWithAuth.forEach(user => {
      console.log(`- ${user.email} -> ${user.auth_user_id}`);
    });
    
    if (usersWithAuth.length === 0) {
      console.log('\n⚠️ WARNING: No users have auth_user_id set!');
      console.log('This means the users table is not properly linked to Supabase auth.');
      console.log('Users need to be created in both auth.users and users tables.');
    }
    
    console.log('\nTo test login, you need:');
    console.log('1. A user that exists in auth.users (Supabase auth)');
    console.log('2. The same user in users table with matching auth_user_id');
    console.log('3. The correct password for that user');
    
  } catch (_error) {
    console._error('Error:', _error.message);
  }
}

checkUsers().then(() => process.exit(0));