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

async function createTestUser() {
  try {
    const testEmail = 'test@youngeagles.org.za';
    const testPassword = 'testpassword123';
    
    console.log('Creating test user...');
    console.log('Email:', testEmail);
    console.log('Password:', testPassword);
    
    // First check if user already exists
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('email, auth_user_id')
      .eq('email', testEmail)
      .single();
      
    if (existingUser) {
      console.log('Test user already exists:', existingUser);
      console.log('\nYou can try logging in with:');
      console.log(`Email: ${testEmail}`);
      console.log(`Password: ${testPassword}`);
      return;
    }
    
    // Create user in Supabase auth
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true // Skip email confirmation
    });
    
    if (authError) {
      console.error('Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✓ Auth user created with ID:', authData.user.id);
    
    // Now create corresponding entry in users table
    const { data: userData, error: userError } = await serviceClient
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: testEmail,
        role: 'teacher',
        first_name: 'Test',
        last_name: 'User',
        preschool_id: '136cf31c-b37c-45c0-9cf7-755bd1b9afbf', // Young Eagles preschool ID
        is_active: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (userError) {
      console.error('Error creating user profile:', userError.message);
      // Try to clean up auth user
      await serviceClient.auth.admin.deleteUser(authData.user.id);
      return;
    }
    
    console.log('✓ User profile created:', userData);
    
    console.log('\n🎉 Test user created successfully!');
    console.log('\nYou can now log in with:');
    console.log(`Email: ${testEmail}`);
    console.log(`Password: ${testPassword}`);
    
    // Test authentication
    console.log('\nTesting authentication...');
    const { data: signInData, error: signInError } = await serviceClient.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Test login failed:', signInError.message);
    } else {
      console.log('✓ Test login successful!');
      console.log('User ID:', signInData.user.id);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestUser().then(() => process.exit(0));