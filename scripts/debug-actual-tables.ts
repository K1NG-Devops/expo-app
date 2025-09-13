/**
 * Debug Actual Tables
 * 
 * Find out what tables actually exist and contain the teacher data,
 * and check if RLS is blocking access
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugActualTables(): Promise<void> {
  console.log('🔍 Debug: Finding tables with actual teacher data...');
  
  const youngEaglesId = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';
  
  // List of potential table names where teacher data might be
  const potentialTables = [
    'users',
    'profiles', 
    'teachers',
    'user_profiles',
    'members',
    'people',
    'accounts'
  ];
  
  for (const tableName of potentialTables) {
    console.log(`\\n📋 Testing ${tableName} table...`);
    
    try {
      // Try to get any records first
      const { data: allRecords, error: allError } = await supabase
        .from(tableName)
        .select('*')
        .limit(3);
      
      if (allError) {
        console.log(`❌ Error accessing ${tableName}:`, allError.message);
        continue;
      }
      
      console.log(`✅ ${tableName}: ${allRecords?.length || 0} accessible records`);
      
      if (allRecords && allRecords.length > 0) {
        console.log('Sample record fields:', Object.keys(allRecords[0]));
        
        // Look for teacher-like data
        const hasEmail = 'email' in allRecords[0];
        const hasName = 'name' in allRecords[0];
        const hasRole = 'role' in allRecords[0];
        const hasPreschoolId = 'preschool_id' in allRecords[0];
        
        console.log('Has email:', hasEmail);
        console.log('Has name:', hasName);
        console.log('Has role:', hasRole);
        console.log('Has preschool_id:', hasPreschoolId);
        
        // Check if any record looks like a teacher
        const teacherLikeRecords = allRecords.filter((record: any) => {
          return (
            (record.role === 'teacher') ||
            (record.email && record.email.includes('youngeagles')) ||
            (record.name && (record.name.includes('Marrion') || record.name.includes('Dimakatso')))
          );
        });
        
        if (teacherLikeRecords.length > 0) {
          console.log('🎯 FOUND TEACHER-LIKE DATA!');
          teacherLikeRecords.forEach((record: any, i: number) => {
            console.log(`${i + 1}. ${record.name || record.email} (role: ${record.role})`);
          });
        }
        
        // Try specific Young Eagles query
        if (hasPreschoolId) {
          console.log('\\nTesting Young Eagles specific query...');
          const { data: youngEaglesData, error: youngEaglesError } = await supabase
            .from(tableName)
            .select('*')
            .eq('preschool_id', youngEaglesId)
            .limit(10);
            
          if (youngEaglesError) {
            console.log('❌ Young Eagles query error:', youngEaglesError.message);
          } else {
            console.log('✅ Young Eagles records:', youngEaglesData?.length || 0);
            if (youngEaglesData && youngEaglesData.length > 0) {
              youngEaglesData.forEach((record: any, i: number) => {
                console.log(`${i + 1}. ${record.name || record.email} (${record.role})`);
              });
            }
          }
        }
      }
      
    } catch (err) {
      console.log(`⚠️ Exception accessing ${tableName}:`, err);
    }
  }
  
  console.log('\\n' + '='.repeat(60));
  console.log('🎯 TABLE ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  console.log('Look for the table that shows:');
  console.log('1. Marrion Makunyane with role=teacher');
  console.log('2. Dimakatso Mogashoa with role=teacher');  
  console.log('3. preschool_id = ba79097c-1b93-4b48-bcbe-df73878ab4d1');
  console.log('4. That table is what the dashboard should query');
}

if (require.main === module) {
  debugActualTables().catch(error => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });
}

export { debugActualTables };