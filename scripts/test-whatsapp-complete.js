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

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testWhatsAppFunction() {
  console.log('WhatsApp Function Complete Test\n');

  try {
    // 1. Get a valid preschool
    const { data: preschool } = await supabase
      .from('preschools')
      .select('id, name')
      .limit(1)
      .single();

    console.log('Using preschool:', preschool);

    // 2. Get a valid user
    const { data: user } = await supabase
      .from('users')
      .select('id, auth_user_id, email')
      .eq('preschool_id', preschool.id)
      .limit(1)
      .single();

    console.log('Using user:', user);

    // 3. Create or update a WhatsApp contact with opted_in status
    const testPhone = '+12025551234';
    const { data: existingContact } = await supabase
      .from('whatsapp_contacts')
      .select('*')
      .eq('phone_e164', testPhone)
      .single();

    let contact;
    if (existingContact) {
      // Update to opted in
      const { data: updated } = await supabase
        .from('whatsapp_contacts')
        .update({ 
          consent_status: 'opted_in',
          last_opt_in_at: new Date().toISOString()
        })
        .eq('id', existingContact.id)
        .select()
        .single();
      contact = updated;
      console.log('Updated existing contact to opted_in');
    } else {
      // Create new opted in contact
      const { data: created, error } = await supabase
        .from('whatsapp_contacts')
        .insert({
          preschool_id: preschool.id,
          user_id: user.auth_user_id,
          phone_e164: testPhone,
          consent_status: 'opted_in',
          last_opt_in_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('Error creating contact:', error);
        return;
      }
      contact = created;
      console.log('Created new opted_in contact');
    }

    console.log('Contact:', contact);

    // 4. Test sending a message
    console.log('\n--- Testing Text Message ---');
    const textPayload = {
      contact_id: contact.id,
      message_type: 'text',
      content: 'Hello from WhatsApp Edge Function test!'
    };

    const { data: textResult, error: textError } = await supabase.functions.invoke('whatsapp-send', {
      body: textPayload
    });

    if (textError) {
      console.error('Text message error:', textError);
    } else {
      console.log('Text message result:', textResult);
    }

    // 5. Test sending a template message
    console.log('\n--- Testing Template Message ---');
    const templatePayload = {
      contact_id: contact.id,
      message_type: 'template',
      template_name: 'hello_world',
      template_params: []
    };

    const { data: templateResult, error: templateError } = await supabase.functions.invoke('whatsapp-send', {
      body: templatePayload
    });

    if (templateError) {
      console.error('Template message error:', templateError);
    } else {
      console.log('Template message result:', templateResult);
    }

    // 6. Check WhatsApp messages table
    console.log('\n--- Checking WhatsApp Messages ---');
    const { data: messages } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('Recent messages:', messages);

  } catch (err) {
    console.error('Test failed:', err);
  }
}

// Run the test
testWhatsAppFunction();