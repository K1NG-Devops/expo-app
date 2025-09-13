#!/usr/bin/env node

/**
 * Test script for Principal Hub API endpoints
 * Run: node scripts/test-principal-api.js
 */

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('- EXPO_PUBLIC_SUPABASE_URL');
  console.error('- EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function testPrincipalAPI() {
  console.log('🧪 Testing Principal Hub API...\n');
  console.log('URL:', SUPABASE_URL);

  const baseUrl = `${SUPABASE_URL}/functions/v1/principal-hub-api`;
  
  const endpoints = [
    'school-stats',
    'teachers',
    'financial-summary',
    'capacity-metrics',
    'enrollment-pipeline',
    'recent-activities'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📡 Testing ${endpoint}...`);
      
      const response = await fetch(`${baseUrl}/${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer fake-token-for-testing`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Success:', Object.keys(data));
      } else {
        const error = await response.text();
        console.log('❌ Error:', error);
      }
    } catch (err) {
      console.log('💥 Request failed:', err.message);
    }
  }
}

// Run the test
testPrincipalAPI().catch(console.error);
