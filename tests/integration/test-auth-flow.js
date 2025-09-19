#!/usr/bin/env node

// Test authentication flow to diagnose the login issue
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey) {
  console.error('Missing required environment variables');
  console.log('EXPO_PUBLIC_SUPABASE_URL:', url ? '✓' : '✗');
  console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', anonKey ? '✓' : '✗');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✓' : '✗');
  process.exit(1);
}

console.log('Testing authentication flow...\n');

const client = createClient(url, anonKey);
const serviceClient = serviceKey ? createClient(url, serviceKey) : null;

async function testAuthFlow() {
  try {
    console.log('1. Testing basic database connectivity...');
    
    // Test with service role if available
    if (serviceClient) {
      const { data: usersCount, error: countError } = await serviceClient
        .from('users')
        .select('id', { count: 'exact' });
      
      if (countError) {
        console.log('   ✗ Service role query failed:', countError.message);
      } else {
        console.log(`   ✓ Found ${usersCount?.length || 0} users in database`);
      }

      // List a few users for testing
      const { data: sampleUsers, error: sampleError } = await serviceClient
        .from('users')
        .select('email, role, preschool_id, auth_user_id, is_active')
        .limit(3);
        
      if (!sampleError && sampleUsers) {
        console.log('   Sample users:');
        sampleUsers.forEach(user => {
          console.log(`     - ${user.email} (role: ${user.role}, active: ${user.is_active})`);
        });
      }
    }
    
    console.log('\n2. Testing authentication with anonymous client...');
    
    // Test sign in with a known user email
    const testEmail = 'eisha@youngeagles.org.za';  // This should exist based on previous tests
    const testPassword = 'testpassword123';  // You'll need to provide the correct password
    
    console.log(`   Attempting sign in with: ${testEmail}`);
    
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });
    
    if (authError) {
      console.log('   ✗ Authentication failed:', authError.message);
      console.log('   Error details:', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      
      // Try to understand what's happening by checking if user exists
      if (serviceClient) {
        const { data: userCheck, error: checkError } = await serviceClient
          .from('auth.users')
          .select('id, email, email_confirmed_at, created_at')
          .eq('email', testEmail)
          .single();
          
        if (checkError) {
          console.log('   Could not check auth.users table (expected for RLS)');
        } else if (userCheck) {
          console.log('   User exists in auth.users:', {
            id: userCheck.id,
            email: userCheck.email,
            confirmed: !!userCheck.email_confirmed_at
          });
        }
      }
    } else if (authData.user) {
      console.log('   ✓ Authentication successful!');
      console.log('   User ID:', authData.user.id);
      console.log('   Email:', authData.user.email);
      
      // Now test fetching the profile
      console.log('\n3. Testing profile fetch...');
      
      const userId = authData.user.id;
      
      // Test both approaches
      console.log('   Trying auth_user_id approach...');
      const { data: profileByAuth, error: authProfileError } = await client
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();
        
      if (authProfileError) {
        console.log('   ✗ auth_user_id query failed:', authProfileError.message);
      } else if (profileByAuth) {
        console.log('   ✓ Profile found by auth_user_id:', {
          id: profileByAuth.id,
          email: profileByAuth.email,
          role: profileByAuth.role
        });
      } else {
        console.log('   ⚠ No profile found by auth_user_id');
      }
      
      console.log('   Trying id approach...');
      const { data: profileById, error: idProfileError } = await client
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (idProfileError) {
        console.log('   ✗ id query failed:', idProfileError.message);
      } else if (profileById) {
        console.log('   ✓ Profile found by id:', {
          id: profileById.id,
          email: profileById.email,
          role: profileById.role
        });
      } else {
        console.log('   ⚠ No profile found by id');
      }
      
      // Test last_login_at update
      console.log('\n4. Testing last_login_at update...');
      
      const now = new Date().toISOString();
      const { error: updateError } = await client
        .from('users')
        .update({ last_login_at: now })
        .eq('auth_user_id', userId);
        
      if (updateError) {
        console.log('   ✗ Update failed:', updateError.message);
        
        // Try with id field
        const { error: updateError2 } = await client
          .from('users')
          .update({ last_login_at: now })
          .eq('id', userId);
          
        if (updateError2) {
          console.log('   ✗ Update by id also failed:', updateError2.message);
        } else {
          console.log('   ✓ Update by id succeeded');
        }
      } else {
        console.log('   ✓ Update by auth_user_id succeeded');
      }
    }
    
  } catch (error) {
    console.error('Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// If no password provided as argument, show instruction
if (process.argv[2]) {
  // Use provided password
  testAuthFlow().then(() => {
    console.log('\nTest completed');
    process.exit(0);
  });
} else {
  console.log('Usage: node test-auth-flow.js [password]');
  console.log('Example: node test-auth-flow.js yourpassword123');
  console.log('\nThis will test authentication with eisha@youngeagles.org.za');
  process.exit(1);
}