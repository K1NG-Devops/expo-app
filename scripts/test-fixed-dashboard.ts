/**
 * Test Fixed Principal Dashboard
 * 
 * Test the corrected principal dashboard queries to verify it now shows 
 * the 2 teachers from Young Eagles preschool
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testFixedDashboard(): Promise<void> {
  console.log('🧪 Testing fixed principal dashboard queries...');
  
  // Young Eagles preschool ID from the data you showed
  const youngEaglesId = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';
  
  try {
    console.log('\\n1. Testing corrected teachers query...');
    const { data: teachers, error: teachersError } = await supabase
      .from('users')
      .select(`
        id, 
        auth_user_id,
        email,
        name,
        phone,
        role,
        preschool_id,
        is_active,
        created_at
      `)
      .eq('preschool_id', youngEaglesId)
      .eq('role', 'teacher')
      .eq('is_active', true);
      
    if (teachersError) {
      console.error('❌ Teachers query error:', teachersError);
    } else {
      console.log('✅ Teachers found:', teachers?.length || 0);
      if (teachers && teachers.length > 0) {
        teachers.forEach((teacher: any, i: number) => {
          console.log(`${i + 1}. ${teacher.name} (${teacher.email})`);
        });
      }
    }
    
    console.log('\\n2. Testing students query...');
    const { count: studentsCount, error: studentsError } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('preschool_id', youngEaglesId)
      .eq('is_active', true);
      
    if (studentsError) {
      console.error('❌ Students query error:', studentsError);
    } else {
      console.log('✅ Students found:', studentsCount || 0);
    }
    
    console.log('\\n3. Testing classes query...');
    const { count: classesCount, error: classesError } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('preschool_id', youngEaglesId)
      .eq('is_active', true);
      
    if (classesError) {
      console.error('❌ Classes query error:', classesError);
    } else {
      console.log('✅ Classes found:', classesCount || 0);
    }
    
    console.log('\\n4. Testing preschools query...');
    const { data: preschool, error: preschoolError } = await supabase
      .from('preschools')
      .select('name, capacity')
      .eq('id', youngEaglesId)
      .single();
      
    if (preschoolError) {
      console.error('❌ Preschool query error:', preschoolError);
    } else {
      console.log('✅ Preschool found:', preschool?.name || 'Unknown');
    }
    
    console.log('\\n' + '='.repeat(60));
    console.log('🎯 EXPECTED DASHBOARD RESULTS');
    console.log('='.repeat(60));
    console.log('School: Young Eagles (if preschools table has data)');
    console.log('Teachers: 2 (Marrion Makunyane, Dimakatso Mogashoa)');
    console.log('Students: Depends on students table data');
    console.log('Classes: Depends on classes table data');
    console.log('');
    console.log('📊 ACTUAL RESULTS:');
    console.log('Teachers:', teachers?.length || 0);
    console.log('Students:', studentsCount || 0); 
    console.log('Classes:', classesCount || 0);
    console.log('School name:', preschool?.name || 'Not found in preschools table');
    
    if (teachers?.length === 2) {
      console.log('\\n🎉 SUCCESS: Dashboard will now show 2 teachers instead of 0!');
    } else {
      console.log('\\n⚠️ Issue: Expected 2 teachers but got', teachers?.length || 0);
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

if (require.main === module) {
  testFixedDashboard().catch(error => {
    console.error('💥 Test script failed:', error);
    process.exit(1);
  });
}

export { testFixedDashboard };