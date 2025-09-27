#!/usr/bin/env node

/**
 * Test Lessons Queries Script
 * 
 * This script tests the exact queries that the LessonsService uses.
 * Run with: node scripts/test-lessons-queries.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing EXPO_PUBLIC_SUPABASE_URL');
  process.exit(1);
}

// Test with both service role (bypasses RLS) and anon key (uses RLS)
const supabaseService = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const supabaseAnon = supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

async function testLessonsQueries() {
  console.log('🧪 Testing lessons queries that LessonsService uses...\n');

  const queries = [
    {
      name: 'Featured Lessons Query',
      query: (supabase) => supabase
        .from('lessons')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6)
    },
    {
      name: 'Popular Lessons Query', 
      query: (supabase) => supabase
        .from('lessons')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(8)
    },
    {
      name: 'Search Lessons Query',
      query: (supabase) => supabase
        .from('lessons')
        .select('*')
        .neq('status', 'draft')
        .order('created_at', { ascending: false })
        .range(0, 7)
    },
    {
      name: 'Teacher Generated Lessons Query',
      query: (supabase) => supabase
        .from('lessons')
        .select('*')
        .eq('teacher_id', '48f8086a-3c88-44a2-adcd-570d97d3a580') // Use actual teacher ID
        .order('created_at', { ascending: false })
        .limit(50)
    }
  ];

  for (const testQuery of queries) {
    console.log(`🔍 Testing: ${testQuery.name}`);
    
    // Test with service role
    if (supabaseService) {
      try {
        const { data, error } = await testQuery.query(supabaseService);
        if (error) {
          console.log(`   ❌ Service Role Error: ${error.message}`);
        } else {
          console.log(`   ✅ Service Role: Found ${data?.length || 0} lessons`);
          if (data && data.length > 0) {
            console.log(`      Sample: "${data[0].title}" (${data[0].status})`);
          }
        }
      } catch (e) {
        console.log(`   💥 Service Role Exception: ${e.message}`);
      }
    }

    // Test with anon key (RLS applied)
    if (supabaseAnon) {
      try {
        const { data, error } = await testQuery.query(supabaseAnon);
        if (error) {
          console.log(`   ❌ Anon Key Error: ${error.message}`);
          if (error.message.includes('permission denied') || error.message.includes('RLS')) {
            console.log(`      💡 This indicates RLS is blocking - JWT hook needed`);
          }
        } else {
          console.log(`   ✅ Anon Key: Found ${data?.length || 0} lessons`);
        }
      } catch (e) {
        console.log(`   💥 Anon Key Exception: ${e.message}`);
      }
    }
    
    console.log('');
  }

  // Summary and next steps
  console.log('📋 SUMMARY:');
  console.log('   - If Service Role queries work: Database schema is correct ✅');
  console.log('   - If Anon Key queries fail: RLS policies need JWT claims hook');
  console.log('\n🎯 NEXT STEP: Enable JWT Claims Hook');
  console.log('   1. Go to Supabase Dashboard > Authentication > Hooks');
  console.log('   2. Add Hook: public.custom_access_token_hook');
  console.log('   3. Type: Custom Access Token');
  console.log('   4. After enabling, users need to sign out and back in');
  console.log('\n🔧 TEMPORARY WORKAROUND:');
  console.log('   The app should work for users with valid preschool_id once they sign in');
  console.log('   Even without the hook, fallback queries in current_preschool_id() may work');
}

// Run the test
testLessonsQueries().then(() => {
  console.log('\n🏁 Query testing complete!');
}).catch((error) => {
  console.error('💥 Testing failed:', error);
});