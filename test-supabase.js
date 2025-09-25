#!/usr/bin/env node
// Test script to verify Supabase initialization

require('dotenv').config();

console.log('🔧 Testing Supabase initialization...\n');

console.log('Environment variables:');
console.log('  EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('  EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  EAS_BUILD_PROFILE:', process.env.EAS_BUILD_PROFILE || 'not set');

if (process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.log('  URL Preview:', process.env.EXPO_PUBLIC_SUPABASE_URL.substring(0, 30) + '...');
}

if (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('  Key Length:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY.length);
}

console.log('\n🧪 Testing Supabase client initialization...');

try {
  // Simulate the same initialization logic as lib/supabase.ts
  const { createClient } = require('@supabase/supabase-js');
  
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  
  if (!url || !anon) {
    throw new Error('Missing environment variables');
  }
  
  const client = createClient(url, anon, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  
  console.log('✅ Supabase client initialized successfully!');
  console.log('  Client URL:', client.supabaseUrl);
  console.log('  Client Key Preview:', client.supabaseKey.substring(0, 20) + '...');
  
} catch (error) {
  console.log('❌ Supabase client initialization failed:');
  console.log('  Error:', error.message);
}

console.log('\n📝 Next steps:');
console.log('  1. If this test passes, restart your Expo development server');
console.log('  2. Clear cache: npx expo start --clear');
console.log('  3. Check that your app loads without Supabase errors');