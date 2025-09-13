/**
 * Debug Teacher Query Issue
 * 
 * The dashboard shows 0 teachers but user says there should be 2 in Young Eagles
 * Let's check the profiles table and see what's happening
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugTeacherQuery(): Promise<void> {
  console.log('🔍 Debug: Investigating why teacher query returns 0...');
  
  try {
    // First, find the Young Eagles preschool ID
    console.log('\n1. Looking for Young Eagles preschool...');
    const { data: preschools, error: preschoolError } = await supabase
      .from('preschools')
      .select('id, name')
      .ilike('name', '%Young Eagles%');
    
    if (preschoolError) {
      console.error('❌ Preschool query error:', preschoolError);
      return;
    }
    
    console.log('✅ Found preschools:', preschools);
    
    if (!preschools || preschools.length === 0) {
      console.log('⚠️ No Young Eagles preschool found, checking all preschools...');
      const { data: allPreschools } = await supabase
        .from('preschools')
        .select('id, name')
        .limit(10);
      console.log('All preschools:', allPreschools);
      return;
    }
    
    const youngEaglesId = preschools[0].id;
    console.log('🎯 Young Eagles ID:', youngEaglesId);
    
    // Check what profiles exist for this preschool
    console.log('\n2. Checking ALL profiles for Young Eagles...');
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .eq('preschool_id', youngEaglesId);
    
    if (profilesError) {
      console.error('❌ Profiles query error:', profilesError);
    } else {
      console.log('✅ All profiles in Young Eagles:', allProfiles?.length || 0);
      if (allProfiles && allProfiles.length > 0) {
        console.log('📊 Profile breakdown:');
        const roleBreakdown = allProfiles.reduce((acc: any, profile: any) => {
          acc[profile.role || 'unknown'] = (acc[profile.role || 'unknown'] || 0) + 1;
          return acc;
        }, {});
        console.log(roleBreakdown);
        
        console.log('\n📝 Sample profiles:');
        allProfiles.slice(0, 3).forEach((profile: any, i: number) => {
          console.log(`${i + 1}. ${profile.first_name} ${profile.last_name} (${profile.role}) - Active: ${profile.is_active}`);
        });
      }
    }
    
    // Check specifically for teachers
    console.log('\n3. Checking teacher profiles specifically...');
    const { data: teachers, error: teacherError } = await supabase
      .from('profiles')
      .select(`
        id, 
        auth_user_id,
        email,
        first_name,
        last_name,
        full_name,
        role,
        is_active,
        preschool_id,
        subject_specialization,
        hire_date,
        created_at
      `)
      .eq('preschool_id', youngEaglesId)
      .eq('role', 'teacher');
      
    if (teacherError) {
      console.error('❌ Teacher query error:', teacherError);
    } else {
      console.log('✅ Teachers found:', teachers?.length || 0);
      if (teachers && teachers.length > 0) {
        teachers.forEach((teacher: any, i: number) => {
          console.log(`${i + 1}. ${teacher.first_name} ${teacher.last_name}`);
          console.log(`   Email: ${teacher.email}`);
          console.log(`   Role: ${teacher.role}`);
          console.log(`   Active: ${teacher.is_active}`);
          console.log(`   Preschool ID: ${teacher.preschool_id}`);
          console.log('');
        });
      } else {
        console.log('⚠️ No teachers found with role="teacher"');
        
        // Check if there are profiles with different role values
        console.log('\n4. Checking for profiles with other role values...');
        const { data: otherRoles } = await supabase
          .from('profiles')
          .select('role, count(*)')
          .eq('preschool_id', youngEaglesId)
          .neq('role', 'teacher');
          
        console.log('Other roles in Young Eagles:', otherRoles);
      }
    }
    
    // Check if teachers might be in a different table
    console.log('\n5. Checking if there\'s a separate teachers table...');
    const { data: teachersTable, error: teachersTableError } = await supabase
      .from('teachers')
      .select('*')
      .eq('preschool_id', youngEaglesId);
      
    if (teachersTableError) {
      console.log('ℹ️ No teachers table or access denied (this is expected if using profiles)');
    } else {
      console.log('✅ Teachers table records:', teachersTable?.length || 0);
      if (teachersTable && teachersTable.length > 0) {
        teachersTable.forEach((teacher: any, i: number) => {
          console.log(`${i + 1}. ${teacher.first_name} ${teacher.last_name} (${teacher.email})`);
        });
      }
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEACHER QUERY DEBUG SUMMARY');
    console.log('='.repeat(60));
    console.log(`Preschool: ${preschools[0].name} (${youngEaglesId})`);
    console.log(`Total profiles: ${allProfiles?.length || 0}`);
    console.log(`Teacher profiles: ${teachers?.length || 0}`);
    console.log(`Teachers table records: ${teachersTable?.length || 0}`);
    console.log('');
    console.log('🔧 The issue is likely:');
    console.log('1. Teachers have a different role value (not "teacher")');
    console.log('2. Teachers are in a separate teachers table');
    console.log('3. Teachers have is_active = false');
    console.log('4. Wrong preschool_id reference');
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

if (require.main === module) {
  debugTeacherQuery().catch(error => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  });
}

export { debugTeacherQuery };