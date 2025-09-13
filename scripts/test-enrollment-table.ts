/**
 * Test enrollment_applications table directly
 * 
 * This script tests if the enrollment_applications table exists and is accessible
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testEnrollmentTable(): Promise<void> {
  console.log('🧪 Testing enrollment_applications table...');
  
  // Test with anonymous key first
  console.log('\n1. Testing with anonymous key:');
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    const { data, error, count } = await anonClient
      .from('enrollment_applications')
      .select('child_name,status,created_at', { count: 'exact' })
      .eq('preschool_id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1')
      .gte('created_at', '2025-09-05T23:27:56.698Z')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log(`   Error: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('404')) {
        console.log('   ❌ Table does not exist!');
      } else if (error.message.includes('permission') || error.message.includes('RLS')) {
        console.log('   ✅ Table exists but RLS is blocking access (expected)');
      } else {
        console.log(`   ⚠️ Other error: ${error.code}`);
      }
    } else {
      console.log(`   ✅ Query succeeded, returned ${count} records`);
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error}`);
  }
  
  // Test with service role if available
  if (SERVICE_ROLE_KEY) {
    console.log('\n2. Testing with service role:');
    const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    
    try {
      const { data, error, count } = await serviceClient
        .from('enrollment_applications')
        .select('child_name,status,created_at', { count: 'exact' })
        .eq('preschool_id', 'ba79097c-1b93-4b48-bcbe-df73878ab4d1')
        .gte('created_at', '2025-09-05T23:27:56.698Z')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.log(`   Error: ${error.message}`);
        if (error.message.includes('does not exist') || error.message.includes('404')) {
          console.log('   ❌ Table does not exist even with service role!');
        } else {
          console.log(`   ⚠️ Other error: ${error.code}`);
        }
      } else {
        console.log(`   ✅ Service role query succeeded, returned ${count} records`);
        if (data && data.length > 0) {
          console.log(`   📊 Sample data:`, data[0]);
        }
      }
    } catch (error) {
      console.log(`   ❌ Service role exception: ${error}`);
    }
    
    // Also test basic table existence
    console.log('\n3. Testing basic table existence:');
    try {
      const { data, error } = await serviceClient
        .from('enrollment_applications')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ Table access failed: ${error.message}`);
      } else {
        console.log('   ✅ Table exists and is accessible');
      }
    } catch (error) {
      console.log(`   ❌ Table existence check failed: ${error}`);
    }
  } else {
    console.log('\n2. Service role not available (SUPABASE_SERVICE_ROLE_KEY not set)');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 DIAGNOSIS');
  console.log('='.repeat(60));
  
  if (!SERVICE_ROLE_KEY) {
    console.log('⚠️ Cannot test service role access');
    console.log('   Set SUPABASE_SERVICE_ROLE_KEY to fully diagnose');
  }
}

if (require.main === module) {
  testEnrollmentTable().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

export { testEnrollmentTable };