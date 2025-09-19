#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const serviceClient = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createProperTestUser() {
  try {
    const testEmail = 'testuser@youngeagles.org.za';
    const testPassword = 'TestPassword123!';
    
    console.log('Creating a proper test user...');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    
    // Check if test user already exists in users table
    const { data: existingUser, error: existingError } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .maybeSingle();
      
    if (existingUser) {
      console.log('⚠️ Test user already exists in users table');
      console.log('Deleting existing test user first...');
      
      // Delete from users table
      const { error: deleteUserError } = await serviceClient
        .from('users')
        .delete()
        .eq('email', testEmail);
        
      if (deleteUserError) {
        console.log('Warning: Could not delete existing user from users table:', deleteUserError.message);
      }
      
      // Delete from auth if auth_user_id exists
      if (existingUser.auth_user_id) {
        try {
          await serviceClient.auth.admin.deleteUser(existingUser.auth_user_id);
          console.log('✓ Deleted existing auth user');
        } catch (authDeleteError) {
          console.log('Warning: Could not delete existing auth user:', authDeleteError.message);
        }
      }
    }
    
    console.log('\nStep 1: Creating user in Supabase Auth...');
    
    // Create user in Supabase auth with service role
    const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email confirmation
      user_metadata: {
        first_name: 'Test',
        last_name: 'User'
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created successfully');
    console.log(`   Auth User ID: ${authUser.user.id}`);
    console.log(`   Email: ${authUser.user.email}`);
    
    console.log('\nStep 2: Creating user profile in users table...');
    
    // Create corresponding entry in users table
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email: testEmail,
        role: 'principal',
        first_name: 'Test',
        last_name: 'User',
        preschool_id: '136cf31c-b37c-45c0-9cf7-755bd1b9afbf', // Young Eagles
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (userError) {
      console.error('❌ Error creating user profile:', userError.message);
      console.log('Cleaning up auth user...');
      await serviceClient.auth.admin.deleteUser(authUser.user.id);
      return;
    }
    
    console.log('✅ User profile created successfully');
    console.log(`   User ID: ${userData.id}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Preschool: ${userData.preschool_id}`);
    
    console.log('\nStep 3: Testing authentication...');
    
    // Test authentication with anonymous client
    const anonClient = createClient(url, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Authentication test failed:', signInError.message);
      return;
    }
    
    console.log('✅ Authentication test successful!');
    console.log(`   Authenticated as: ${signInData.user.email}`);
    console.log(`   Auth ID: ${signInData.user.id}`);
    
    console.log('\nStep 4: Testing profile fetch...');
    
    const { data: profile, error: profileError } = await anonClient
      .from('users')
      .select('*')
      .eq('auth_user_id', signInData.user.id)
      .single();
      
    if (profileError) {
      console.error('❌ Profile fetch failed:', profileError.message);
      return;
    }
    
    console.log('✅ Profile fetch successful!');
    console.log(`   Profile: ${profile.first_name} ${profile.last_name}`);
    console.log(`   Role: ${profile.role}`);
    console.log(`   Email: ${profile.email}`);
    
    // Sign out
    await anonClient.auth.signOut();
    
    console.log('\n🎉 Test user created and verified successfully!');
    console.log('\n📋 Login credentials:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\nYou can now use these credentials to test login in the web app.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

createProperTestUser().then(() => process.exit(0));