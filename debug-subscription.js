#!/usr/bin/env node

// Debug script to test subscription creation
// This script helps identify common issues with subscription creation

console.log('🔍 Debugging Subscription Creation Issues...\n');

// Check 1: Environment Variables
console.log('1. Environment Variables:');
const requiredEnvVars = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY'
];

requiredEnvVars.forEach(env => {
  const value = process.env[env];
  console.log(`   ${env}: ${value ? '✅ Set' : '❌ Missing'}`);
});

console.log('\n2. Common Issues and Solutions:');
console.log(`
   ❌ Button not responding:
      - Check browser console for JavaScript errors
      - Verify button is not disabled by CSS
      - Look for overlapping elements blocking clicks

   ❌ Button clicks but nothing happens:
      - Check if createSubscription function is being called (console.log added)
      - Verify form validation (school_id and plan_tier must be set)
      - Check network tab for failed requests

   ❌ Database/API errors:
      - Verify Supabase connection and credentials
      - Check Row Level Security (RLS) policies
      - Ensure subscriptions table exists with correct schema

   ❌ Missing data:
      - Verify subscription plans are loaded
      - Check if schools are available for selection
      - Ensure user has proper permissions
`);

console.log('\n3. Debug Steps to Follow:');
console.log(`
   1. Open browser Developer Tools (F12)
   2. Go to Console tab
   3. Navigate to the subscription creation screen
   4. Select a school and plan
   5. Click "Create Subscription"
   6. Check console for these messages:
      - "Create Subscription button pressed!"
      - "createSubscription called with form:"
      - "Loaded subscription plans:"
      - Any error messages

   7. If no messages appear, check:
      - Network tab for failed requests
      - Elements tab for button styling issues
`);

console.log('\n4. Quick Tests:');
console.log(`
   Test 1: Button click detection
   - Add this in browser console:
     document.querySelector('[data-testid*="create"]')?.addEventListener('click', () => console.log('Button clicked!'))

   Test 2: Check if plans are loaded
   - Look for "Loaded subscription plans:" in console
   - If empty array, check database connection

   Test 3: Form validation
   - Try clicking without selecting school/plan
   - Should see "Please select a school and plan" alert
`);

console.log('\n✅ Debugging complete! Follow the steps above to identify the issue.');