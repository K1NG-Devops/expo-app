#!/usr/bin/env node

/**
 * Debug script to check lessons database and add sample data if needed
 * Run with: node scripts/debug-lessons.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLessons() {
  console.log('🔍 Checking lessons database...\n');

  try {
    // Check if lessons table exists and get total count
    const { data: lessons, error: lessonsError, count } = await supabase
      .from('lessons')
      .select('*', { count: 'exact' })
      .limit(5);

    if (lessonsError) {
      console.error('❌ Error fetching lessons:', lessonsError.message);
      return;
    }

    console.log(`📊 Found ${count || 0} lessons in database`);
    
    if (lessons && lessons.length > 0) {
      console.log('\n📋 Sample lessons:');
      lessons.forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.title}`);
        console.log(`   ID: ${lesson.id}`);
        console.log(`   Status: ${lesson.status}`);
        console.log(`   Subject: ${lesson.subject}`);
        console.log(`   Age Group: ${lesson.age_group}`);
        console.log(`   Duration: ${lesson.duration_minutes} minutes`);
        console.log(`   Preschool ID: ${lesson.preschool_id}`);
        console.log('');
      });
    } else {
      console.log('📝 No lessons found. Creating sample data...\n');
      await createSampleLessons();
    }

    // Check users table to see available preschool_ids
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, preschool_id, role')
      .not('preschool_id', 'is', null)
      .limit(3);

    if (!usersError && users && users.length > 0) {
      console.log('\n👥 Sample users with preschool_ids:');
      users.forEach((user, index) => {
        console.log(`${index + 1}. User ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Preschool ID: ${user.preschool_id}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

async function createSampleLessons() {
  try {
    // Get a sample user to use as teacher
    const { data: teachers } = await supabase
      .from('users')
      .select('id, preschool_id')
      .eq('role', 'teacher')
      .not('preschool_id', 'is', null)
      .limit(1);

    if (!teachers || teachers.length === 0) {
      console.log('⚠️ No teachers found with preschool_id. Creating sample lessons with dummy data...');
    }

    const teacher = teachers?.[0] || { id: '00000000-0000-0000-0000-000000000000', preschool_id: '00000000-0000-0000-0000-000000000000' };

    const sampleLessons = [
      {
        title: 'Colors and Shapes Adventure',
        description: 'Learn about basic colors and shapes through fun activities and games.',
        content: {
          activities: [
            'Color sorting game',
            'Shape matching puzzle',
            'Creative drawing time'
          ],
          materials: ['Colored blocks', 'Shape cards', 'Crayons']
        },
        objectives: ['Identify primary colors', 'Recognize basic shapes', 'Develop fine motor skills'],
        age_group: '3-4',
        subject: 'art',
        duration_minutes: 30,
        status: 'active',
        teacher_id: teacher.id,
        preschool_id: teacher.preschool_id
      },
      {
        title: 'Counting Fun with Numbers',
        description: 'Introduction to numbers 1-10 with hands-on counting activities.',
        content: {
          activities: [
            'Number song',
            'Counting with toys',
            'Number tracing'
          ],
          materials: ['Number cards', 'Counting bears', 'Worksheets']
        },
        objectives: ['Count from 1 to 10', 'Recognize number symbols', 'Practice number writing'],
        age_group: '4-5',
        subject: 'mathematics',
        duration_minutes: 25,
        status: 'active',
        teacher_id: teacher.id,
        preschool_id: teacher.preschool_id
      },
      {
        title: 'Letter Sounds and Reading',
        description: 'Practice letter recognition and phonics through interactive games.',
        content: {
          activities: [
            'Letter sound games',
            'Phonics songs',
            'Simple word building'
          ],
          materials: ['Letter cards', 'Phonics book', 'Magnetic letters']
        },
        objectives: ['Recognize letter sounds', 'Build simple words', 'Improve reading skills'],
        age_group: '5-6',
        subject: 'literacy',
        duration_minutes: 35,
        status: 'active',
        teacher_id: teacher.id,
        preschool_id: teacher.preschool_id
      },
      {
        title: 'Nature Discovery Walk',
        description: 'Explore the outdoors and learn about plants, animals, and weather.',
        content: {
          activities: [
            'Nature scavenger hunt',
            'Weather observation',
            'Leaf collection'
          ],
          materials: ['Collection bags', 'Magnifying glass', 'Nature journal']
        },
        objectives: ['Observe nature', 'Learn about seasons', 'Develop curiosity'],
        age_group: '3-6',
        subject: 'science',
        duration_minutes: 45,
        status: 'active',
        teacher_id: teacher.id,
        preschool_id: teacher.preschool_id
      },
      {
        title: 'Musical Movement Time',
        description: 'Dance, sing, and move to develop rhythm and coordination.',
        content: {
          activities: [
            'Action songs',
            'Rhythm instruments',
            'Movement games'
          ],
          materials: ['Music player', 'Scarves', 'Rhythm sticks']
        },
        objectives: ['Develop rhythm', 'Improve coordination', 'Express creativity'],
        age_group: '3-6',
        subject: 'music',
        duration_minutes: 20,
        status: 'active',
        teacher_id: teacher.id,
        preschool_id: teacher.preschool_id
      }
    ];

    const { data, error } = await supabase
      .from('lessons')
      .insert(sampleLessons)
      .select();

    if (error) {
      console.error('❌ Error creating sample lessons:', error.message);
      return;
    }

    console.log(`✅ Created ${data?.length || 0} sample lessons successfully!`);
    
    if (data && data.length > 0) {
      console.log('\n📋 Created lessons:');
      data.forEach((lesson, index) => {
        console.log(`${index + 1}. ${lesson.title} (${lesson.subject})`);
      });
    }

  } catch (error) {
    console.error('💥 Error creating sample lessons:', error);
  }
}

// Run the debug
debugLessons().then(() => {
  console.log('\n🏁 Debug complete!');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Debug failed:', error);
  process.exit(1);
});