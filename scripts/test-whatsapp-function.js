#!/usr/bin/env node

// Test script for WhatsApp send function
const https = require('https');

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDQ5NjY3MzgsImV4cCI6MjAyMDU0MjczOH0.mjXejygAWwl-K8CQ9V5KjQD3J2kN5oYjRd1S3rj0f3U';

// Service role key for testing (normally would not be in code)
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwNDk2NjczOCwiZXhwIjoyMDIwNTQyNzM4fQ.a73c9b6f54f9b7a0ba3c76c13a58975d390ff5e2bcd0fc60787bdcede163fdab';

// Your auth token from the browser (you'll need to get this from localStorage or cookies)
const AUTH_TOKEN = process.env.AUTH_TOKEN || '';

const testPayload = {
  message_type: 'text',
  phone_number: '+1234567890', // Replace with a valid test number  
  content: 'Test message from Edge Function'
};

const options = {
  hostname: 'lvvvjywrmpcqrpvuptdi.supabase.co',
  path: '/functions/v1/whatsapp-send',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': AUTH_TOKEN ? `Bearer ${AUTH_TOKEN}` : `Bearer ${ANON_KEY}`,
    'apikey': ANON_KEY
  }
};

console.log('Testing WhatsApp send function...');
console.log('URL:', `${options.hostname}${options.path}`);
console.log('Payload:', JSON.stringify(testPayload, null, 2));

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('\nResponse Status:', res.statusCode);
    console.log('Response Headers:', res.headers);
    console.log('Response Body:');
    try {
      console.log(JSON.stringify(JSON.parse(data), null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

req.write(JSON.stringify(testPayload));
req.end();