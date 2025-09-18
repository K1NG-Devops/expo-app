/**
 * Test AI Allocation Data Fetching
 * 
 * This script tests whether the AI allocation system can successfully
 * fetch real data from the database using the direct implementation.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const YOUNG_EAGLES_PRESCHOOL_ID = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';

async function testAIAllocationDataFetching() {
  console.log('🧪 Testing AI Allocation Data Fetching...\n');
  
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Test 1: Check preschools table
  console.log('1. Testing preschools table access:');
  try {
    const { data: preschools, error: preschoolError } = await client
      .from('preschools')
      .select('id, name, subscription_tier')
      .eq('id', YOUNG_EAGLES_PRESCHOOL_ID)
      .single();
    
    if (preschoolError) {
      console.log(`   ❌ Error: ${preschoolError.message}`);
    } else if (preschools) {
      console.log(`   ✅ Found preschool: ${preschools.name} (${preschools.subscription_tier})`);
      console.log(`   📊 Data:`, preschools);
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Test 2: Check users table
  console.log('\n2. Testing users table access:');
  try {
    const { data: users, error: usersError, count } = await client
      .from('users')
      .select('id, email, role, first_name, last_name, preschool_id', { count: 'exact' })
      .eq('preschool_id', YOUNG_EAGLES_PRESCHOOL_ID)
      .limit(5);
    
    if (usersError) {
      console.log(`   ❌ Error: ${usersError.message}`);
      console.log(`   📋 Error code: ${usersError.code}`);
      console.log(`   📋 Error details: ${usersError.details}`);
      console.log(`   📋 Error hint: ${usersError.hint}`);
    } else {
      console.log(`   ✅ Found ${count} users in preschool`);
      if (users && users.length > 0) {
        console.log(`   📊 Sample user:`, users[0]);
        console.log(`   📊 All users:`, users.map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`, role: u.role })));
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Test 3: Check specific teacher/principal users
  console.log('\n3. Testing teacher/principal user access:');
  try {
    const { data: teachers, error: teachersError } = await client
      .from('users')
      .select('id, email, role, first_name, last_name, is_active')
      .eq('preschool_id', YOUNG_EAGLES_PRESCHOOL_ID)
      .in('role', ['teacher', 'principal', 'principal_admin']);
    
    if (teachersError) {
      console.log(`   ❌ Error: ${teachersError.message}`);
    } else {
      console.log(`   ✅ Found ${teachers?.length || 0} teachers/principals`);
      if (teachers && teachers.length > 0) {
        teachers.forEach((teacher, index) => {
          console.log(`   👨‍🏫 ${index + 1}. ${teacher.first_name} ${teacher.last_name} (${teacher.role}) - ${teacher.is_active ? 'Active' : 'Inactive'}`);
        });
      }
    }
  } catch (error) {
    console.log(`   ❌ Exception: ${error.message}`);
  }
  
  // Test 4: Check if AI edge functions exist
  console.log('\n4. Testing AI edge functions:');
  try {
    const { data, error } = await client.functions.invoke('ai-usage', {
      body: {
        action: 'test',
        preschool_id: YOUNG_EAGLES_PRESCHOOL_ID,
      },
    });
    
    if (error) {
      console.log(`   ❌ Edge function error: ${error.message}`);
    } else {
      console.log(`   ✅ Edge function responded:`, data);
    }
  } catch (error) {
    console.log(`   ❌ Edge function not available: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY');
  console.log('='.repeat(60));
  console.log('The AI allocation system should work with:');
  console.log('• Direct database queries (fallback implementation)');
  console.log('• Mock allocation data based on real users');
  console.log('• Functional UI for quota management');
  console.log('\nNext: Open the app and navigate to Principal Dashboard > AI Quota Management');
}

if (require.main === module) {
  testAIAllocationDataFetching().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}

module.exports = { testAIAllocationDataFetching };