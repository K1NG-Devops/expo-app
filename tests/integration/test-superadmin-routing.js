#!/usr/bin/env node

/**
 * Test Superadmin Routing Logic
 * 
 * This script tests the routing logic for the superadmin user to identify
 * exactly where the redirect loop is occurring.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// Replicate the normalizeRole function from routeAfterLogin.ts
function normalizeRole(r) {
  if (!r) return null;
  const s = String(r).trim().toLowerCase();
  
  // Map potential variants to canonical Role types
  if (s.includes('super') || s === 'superadmin') return 'super_admin';
  if (s === 'principal' || s.includes('principal') || s === 'admin' || s.includes('school admin')) return 'principal_admin';
  if (s.includes('teacher')) return 'teacher';
  if (s.includes('parent')) return 'parent';
  
  // Handle exact matches for the canonical types
  if (['super_admin', 'principal_admin', 'teacher', 'parent'].includes(s)) {
    return s;
  }
  
  console.warn('Unrecognized role:', r, '-> normalized to null');
  return null;
}

// Replicate the determineUserRoute function
function determineUserRoute(profile) {
  let role = normalizeRole(profile.role);
  
  console.log('[ROUTE DEBUG] Original role:', profile.role, '-> normalized:', role);
  console.log('[ROUTE DEBUG] Profile organization_id:', profile.organization_id);
  console.log('[ROUTE DEBUG] Profile preschool_id:', profile.preschool_id);
  
  // Safeguard: If role is null/undefined, route to sign-in/profile setup
  if (!role || role === null) {
    console.warn('User role is null, routing to sign-in');
    return { path: '/(auth)/sign-in' };
  }
  
  // Check capabilities (simplified)
  const capabilities = JSON.parse(profile.capabilities || '[]');
  const hasAccessMobileApp = capabilities.includes('access_mobile_app');
  
  if (!hasAccessMobileApp) {
    console.log('[ROUTE DEBUG] User lacks access_mobile_app capability');
    return { path: '/screens/account' };
  }

  // Route based on role and capabilities
  switch (role) {
    case 'super_admin':
      console.log('[ROUTE DEBUG] Routing superadmin to dashboard');
      return { path: '/screens/super-admin-dashboard' };
    
    case 'principal_admin':
      console.log('[ROUTE DEBUG] Principal admin routing - organization_id:', profile.organization_id);
      
      if (profile.organization_id || profile.preschool_id) {
        console.log('[ROUTE DEBUG] Routing principal to dashboard with school:', profile.organization_id || profile.preschool_id);
        return { 
          path: '/screens/principal-dashboard',
          params: { school: profile.organization_id || profile.preschool_id }
        };
      } else {
        console.log('[ROUTE DEBUG] No organization_id, routing to principal onboarding');
        return { path: '/screens/principal-onboarding' };
      }
    
    case 'teacher':
      return { path: '/screens/teacher-dashboard' };
    
    case 'parent':
      return { path: '/screens/parent-dashboard' };
    
    default:
      console.warn('Unknown user role:', profile.role);
      return { path: '/profiles-gate' };
  }
}

async function testSuperadminRouting() {
  console.log('=== SUPERADMIN ROUTING TEST ===\n');
  
  try {
    // Get the superadmin profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'superadmin@edudashpro.org.za')
      .single();
      
    if (error) {
      console.error('Failed to fetch superadmin profile:', error);
      return;
    }
    
    console.log('Superadmin profile found:');
    console.log('  ID:', profile.id);
    console.log('  Email:', profile.email);
    console.log('  Role:', profile.role);
    console.log('  Organization ID:', profile.organization_id);
    console.log('  Preschool ID:', profile.preschool_id);
    console.log('  Capabilities:', profile.capabilities);
    
    console.log('\n--- Testing normalizeRole ---');
    const normalizedRole = normalizeRole(profile.role);
    console.log('Original role:', profile.role);
    console.log('Normalized role:', normalizedRole);
    
    console.log('\n--- Testing capabilities ---');
    const capabilities = JSON.parse(profile.capabilities || '[]');
    const hasAccessMobileApp = capabilities.includes('access_mobile_app');
    console.log('Has access_mobile_app:', hasAccessMobileApp);
    console.log('All capabilities:', capabilities);
    
    console.log('\n--- Testing route determination ---');
    const route = determineUserRoute(profile);
    console.log('Determined route:', route);
    
    console.log('\n--- Testing get_my_profile RPC ---');
    // Test the RPC function (will return null without auth context)
    const { data: rpcData, error: rpcError } = await supabase
      .rpc('get_my_profile');
    console.log('RPC data:', rpcData);
    console.log('RPC error:', rpcError);
    
    console.log('\n--- Analysis ---');
    
    if (normalizedRole === 'super_admin' && hasAccessMobileApp) {
      console.log('✅ SHOULD ROUTE TO: /screens/super-admin-dashboard');
      
      if (route.path === '/screens/super-admin-dashboard') {
        console.log('✅ Routing logic is CORRECT');
        console.log('❌ The issue must be in fetchEnhancedUserProfile or the auth flow');
      } else {
        console.log('❌ Routing logic has an issue');
        console.log('Expected: /screens/super-admin-dashboard');
        console.log('Got:', route.path);
      }
    } else {
      console.log('❌ Profile has issues:');
      if (normalizedRole !== 'super_admin') {
        console.log('  - Role normalization failed');
      }
      if (!hasAccessMobileApp) {
        console.log('  - Missing access_mobile_app capability');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Test the RPC function that fetchEnhancedUserProfile uses
async function testRPCFunction() {
  console.log('\n=== TESTING RPC FUNCTION ===');
  
  try {
    // Check if get_my_profile function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_name', 'get_my_profile')
      .eq('routine_schema', 'public');
      
    console.log('get_my_profile function exists:', !!functions?.length);
    console.log('Function query error:', funcError);
    
    // Try to call it (will fail without auth context)
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_my_profile');
      
    console.log('RPC call result:', rpcResult);
    console.log('RPC call error:', rpcError);
    
  } catch (error) {
    console.log('RPC test error:', error);
  }
}

// Run the tests
testSuperadminRouting()
  .then(() => testRPCFunction())
  .then(() => {
    console.log('\n=== TEST COMPLETE ===');
    console.log('\nNext steps if routing logic is correct:');
    console.log('1. Check why fetchEnhancedUserProfile returns null');
    console.log('2. Verify get_my_profile RPC function works with actual auth context');
    console.log('3. Check if RLS policies are blocking profile access');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });