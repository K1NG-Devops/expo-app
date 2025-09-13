/**
 * Debug Dashboard ID Usage
 * 
 * Find out what preschool ID the dashboard is actually using
 * and why it shows data when the database is empty
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugDashboardId(): Promise<void> {
  console.log('🔍 Debug: Understanding dashboard data source...');
  
  try {
    // Try to simulate what the dashboard does to get preschool ID
    console.log('\\n1. Checking auth session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.log('❌ Session error:', sessionError.message);
    } else if (session) {
      console.log('✅ Session exists for user:', session.user.id);
      console.log('User metadata:', session.user.user_metadata);
      
      // Check if user has preschool_id in metadata
      const preschoolId = session.user.user_metadata?.preschool_id;
      if (preschoolId) {
        console.log('🎯 Found preschool_id in user metadata:', preschoolId);
        
        // Try the same queries the dashboard would use
        console.log('\\n2. Testing dashboard queries with this ID...');
        
        const [
          studentsResult,
          teachersResult, 
          classesResult,
          preschoolResult
        ] = await Promise.allSettled([
          supabase
            .from('students')
            .select('id', { count: 'exact', head: true })
            .eq('preschool_id', preschoolId)
            .eq('is_active', true),
          supabase
            .from('profiles')  
            .select('*')
            .eq('preschool_id', preschoolId)
            .eq('role', 'teacher'),
          supabase
            .from('classes')
            .select('id', { count: 'exact', head: true })
            .eq('preschool_id', preschoolId),
          supabase
            .from('preschools')
            .select('name, capacity')
            .eq('id', preschoolId)
            .single()
        ]);
        
        console.log('Students query:', studentsResult);
        console.log('Teachers query:', teachersResult);  
        console.log('Classes query:', classesResult);
        console.log('Preschool query:', preschoolResult);
        
      } else {
        console.log('⚠️ No preschool_id in user metadata');
      }
      
    } else {
      console.log('⚠️ No active session');
      
      // Check if there might be sample data with a hardcoded ID
      console.log('\\n3. Looking for any data with common test IDs...');
      const testIds = [
        'ba79097c-1b93-4b48-bcbe-df73878ab4d1', // From our previous tests
        'young-eagles-id',
        'test-preschool'
      ];
      
      for (const testId of testIds) {
        console.log(`\\nTesting ID: ${testId}`);
        try {
          const { data: students } = await supabase
            .from('students') 
            .select('*')
            .eq('preschool_id', testId)
            .limit(3);
          
          if (students && students.length > 0) {
            console.log('🎯 Found students with this ID:', students.length);
            console.log('Sample student:', students[0]);
          } else {
            console.log('No students found');
          }
        } catch (err) {
          console.log('Error querying:', err);
        }
      }
    }
    
    console.log('\\n4. Checking if there are any records at all in any table...');
    const tables = ['students', 'profiles', 'preschools', 'classes', 'attendance_records'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`${table}: Error - ${error.message}`);
        } else {
          console.log(`${table}: ${count} total records`);
        }
      } catch (err) {
        console.log(`${table}: Exception - ${err}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Debug failed:', error);
  }
}

if (require.main === module) {
  debugDashboardId().catch(error => {
    console.error('💥 Debug script failed:', error);
    process.exit(1);
  });
}

export { debugDashboardId };