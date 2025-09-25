#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client  
const supabaseUrl = process.env.SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const anonKey = process.env.SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!anonKey || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('Please set SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Use service role for data queries
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabaseClient = createClient(supabaseUrl, anonKey);

async function testWhatsAppFunction() {
  console.log('Testing WhatsApp send function with proper authentication...\n');

  try {
    // First, get valid preschool and user data
    const { data: preschools, error: preschoolError } = await supabaseAdmin
      .from('preschools')
      .select('id, name')
      .limit(1);

    if (preschoolError || !preschools?.length) {
      console.error('Could not fetch preschools:', preschoolError);
      return;
    }

    console.log('Using preschool:', preschools[0]);

    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id, email, preschool_id')
      .eq('preschool_id', preschools[0].id)
      .limit(1);

    if (userError || !users?.length) {
      console.error('Could not fetch users:', userError);
      return;
    }

    console.log('Found user:', users[0]);

    // Sign in as this user to get a proper auth token
    const { data: authData, error: signInError } = await supabaseClient.auth.signInWithPassword({
      email: users[0].email,
      password: 'Test123!' // This won't work unless we know the password
    });

    if (signInError) {
      console.log('Could not sign in (expected):', signInError.message);
      console.log('\nTesting with service role instead...');
      
      // Test with service role client instead
      const testPayload = {
        message_type: 'text',
        phone_number: '+12025551234',
        content: 'Test message from authenticated context'
      };

      console.log('\nSending test message...');
      console.log('Payload:', JSON.stringify(testPayload, null, 2));

      const { data, error } = await supabaseAdmin.functions.invoke('whatsapp-send', {
        body: testPayload,
        headers: {
          'x-preschool-id': preschools[0].id,
          'x-user-id': users[0].auth_user_id || users[0].id
        }
      });

      if (error) {
        console.error('\nError calling function:', error);
        return;
      }

      console.log('\nFunction response:', JSON.stringify(data, null, 2));
    } else {
      // If sign in worked, use the auth token
      const testPayload = {
        message_type: 'text',
        phone_number: '+12025551234',
        content: 'Test message from authenticated user'
      };

      const { data, error } = await supabaseClient.functions.invoke('whatsapp-send', {
        body: testPayload
      });

      if (error) {
        console.error('\nError calling function:', error);
        return;
      }

      console.log('\nFunction response:', JSON.stringify(data, null, 2));
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testWhatsAppFunction();