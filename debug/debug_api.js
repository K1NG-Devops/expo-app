#!/usr/bin/env node

// Quick script to debug the API errors
const fetch = require('node-fetch');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Debugging Supabase API errors...');
console.log(`URL: ${SUPABASE_URL}`);

async function testEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing ${description}`);
    const response = await fetch(`${SUPABASE_URL}/rest/v1${_endpoint}`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });

    console.log(`Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error body: ${_errorText}`);
    } else {
      const data = await response.json();
      console.log(`Success: Found ${Array.isArray(data) ? data.length : 'N/A'} records`);
    }
  } catch (_error) {
    console._error(`❌ Error testing ${description}:`, _error.message);
  }
}

async function main() {
  // Test the problematic endpoints from your error logs
  // Original invalid UUID: ba79097c-1b55-4b5c0-9cf7-755bd1b9afbf (too many chars)
  // Using a valid UUID format instead
  await testEndpoint('/whatsapp_contacts?select=*&user_id=eq.ba79097c-1b93-4b48-bcbe-df73878ab4d1&preschool_id=eq.ba79097c-1b93-4b48-bcbe-df73878ab4d1', 'WhatsApp Contacts (fixed UUID)');
  
  await testEndpoint('/preschools?select=phone,settings&id=eq.ba79097c-1b93-4b48-bcbe-df73878ab4d1', 'Preschools phone/settings');
  
  // Test basic table access
  await testEndpoint('/whatsapp_contacts?limit=1', 'WhatsApp Contacts (basic)');
  await testEndpoint('/preschools?limit=1', 'Preschools (basic)');
  
  console.log('\n✅ API debugging complete');
}

main().catch(console.error);