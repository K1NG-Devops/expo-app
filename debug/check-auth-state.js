#!/usr/bin/env node

/**
 * Debug script to check current authentication state
 * Run with: node debug/check-auth-state.js
 */

console.log('🔍 Checking Authentication State...\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log('EXPO_PUBLIC_SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL ? '✓ Set' : '❌ Missing');
console.log('EXPO_PUBLIC_SUPABASE_ANON_KEY:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? '✓ Set' : '❌ Missing');

// Check localStorage (web environment)
console.log('\n2️⃣ LocalStorage State:');
if (typeof window !== 'undefined' && window.localStorage) {
  const supabaseKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('supabase')) {
      supabaseKeys.push(key);
    }
  }
  
  console.log('Supabase-related keys:', supabaseKeys);
  
  // Check for session data
  supabaseKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        if (parsed.access_token || parsed.refresh_token) {
          console.log(`${key}:`, {
            hasAccessToken: !!parsed.access_token,
            hasRefreshToken: !!parsed.refresh_token,
            expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : 'Unknown'
          });
        }
      } catch (_e) {
        console.log(`${key}: [Non-JSON data]`);
      }
    }
  });
} else {
  console.log('Not running in web environment or localStorage not available');
}

// Check session manager storage
console.log('\n3️⃣ Session Manager State:');
const sessionKeys = [
  'edudash_user_session',
  'edudash_user_profile', 
  'biometric_session'
];

sessionKeys.forEach(key => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const parsed = JSON.parse(value);
        console.log(`${key}:`, {
          userId: parsed.user_id || parsed.userId || 'Unknown',
          email: parsed.email || 'Unknown',
          expiresAt: parsed.expires_at ? new Date(parsed.expires_at * 1000) : 'Unknown'
        });
      } catch (_e) {
        console.log(`${key}: [Invalid JSON]`);
      }
    } else {
      console.log(`${key}: Not found`);
    }
  }
});

console.log('\n✅ Check complete. If you see missing tokens, you need to sign in again.');