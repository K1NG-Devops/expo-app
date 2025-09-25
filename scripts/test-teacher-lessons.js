#!/usr/bin/env node

/**
 * Test Teacher Lessons Script
 * 
 * This script tests the getTeacherGeneratedLessons method functionality.
 * Run with: node scripts/test-teacher-lessons.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testTeacherLessons() {
  console.log('🧪 Testing teacher lessons functionality...\n');

  try {
    // Test 1: Check all lessons with AI flag
    console.log('1. Testing AI-generated lessons query...');
    const { data: aiLessons, error: aiError } = await supabase
      .from('lessons')
      .select('id, title, teacher_id, is_ai_generated')
      .eq('is_ai_generated', true)
      .order('created_at', { ascending: false });

    if (aiError) {
      console.error('   ❌ Error:', aiError.message);
    } else {
      console.log(`   ✅ Found ${aiLessons?.length || 0} AI-generated lessons`);
      if (aiLessons && aiLessons.length > 0) {
        console.log('   📋 Sample titles:');
        aiLessons.slice(0, 3).forEach(lesson => {
          console.log(`      - ${lesson.title}`);
        });
      }
    }

    // Test 2: Check lessons for specific teacher
    const teacherId = '48f8086a-3c88-44a2-adcd-570d97d3a580';
    console.log(`\n2. Testing lessons for teacher ${teacherId}...`);
    
    const { data: teacherLessons, error: teacherError } = await supabase
      .from('lessons')
      .select('id, title, teacher_id, is_ai_generated')
      .eq('teacher_id', teacherId)
      .eq('is_ai_generated', true)
      .order('created_at', { ascending: false });

    if (teacherError) {
      console.error('   ❌ Error:', teacherError.message);
    } else {
      console.log(`   ✅ Found ${teacherLessons?.length || 0} lessons for this teacher`);
    }

    // Test 3: Check published lessons
    console.log('\n3. Testing published lessons...');
    const { data: publishedLessons, error: publishedError } = await supabase
      .from('lessons')
      .select('id, title, status, is_ai_generated')
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (publishedError) {
      console.error('   ❌ Error:', publishedError.message);
    } else {
      console.log(`   ✅ Found ${publishedLessons?.length || 0} published lessons`);
    }

    // Test 4: Check RLS with anonymous key
    console.log('\n4. Testing RLS with anonymous access...');
    const anonSupabase = createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: anonLessons, error: anonError } = await anonSupabase
      .from('lessons')
      .select('id, title')
      .eq('status', 'published')
      .limit(3);

    if (anonError) {
      console.log(`   ⚠️  RLS blocking: ${anonError.message}`);
      console.log('   💡 This is expected until users authenticate with JWT claims');
    } else {
      console.log(`   ✅ Anonymous access working: Found ${anonLessons?.length || 0} lessons`);
    }

    console.log('\n📊 SUMMARY:');
    console.log('   - If AI lessons are found: LessonsService should show them');
    console.log('   - If RLS is blocking anon access: Users need to sign in');
    console.log('   - The "My Generated Lessons" should now show available lessons');

  } catch (error) {
    console.error('💥 Error:', error.message);
  }
}

// Run the test
testTeacherLessons().then(() => {
  console.log('\n🏁 Teacher lessons test complete!');
}).catch((error) => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});