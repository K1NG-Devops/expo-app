#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY');
  console.error('Please set this environment variable to run the test.');
  process.exit(1);
}

// Use service role for testing to bypass RLS
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testWhatsAppFunction() {
  console.log('Testing WhatsApp send function...\n');

  try {
    // First, let's check if we have any WhatsApp contacts in the database
    const { data: contacts, error: contactError } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .limit(5);

    if (contactError) {
      console.error('Error fetching contacts:', contactError);
      return;
    }

    console.log('Existing WhatsApp contacts:', contacts?.length || 0);
    if (contacts && contacts.length > 0) {
      console.log('Sample contact:', contacts[0]);
    }

    // Test payload - we'll use a dummy phone number since we're just testing the function
    const testPayload = {
      message_type: 'text',
      phone_number: '+12025551234', // Dummy US number
      content: 'Test message from debug script'
    };

    console.log('\nSending test message...');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('whatsapp-send', {
      body: testPayload
    });

    if (error) {
      console.error('\nError calling function:', error);
      return;
    }

    console.log('\nFunction response:', JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Run the test
testWhatsAppFunction();