#!/usr/bin/env node

/**
 * Check Lessons Table Schema
 * 
 * This script checks the actual structure of the lessons table.
 * Run with: node scripts/check-lessons-schema.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkLessonsSchema() {
  console.log('🔍 Checking lessons table schema...\n');

  try {
    // Query the information_schema to get table structure
    const { data: columns, error } = await supabase
      .rpc('exec_sql', { 
        sql: `
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            character_maximum_length
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
            AND table_name = 'lessons'
          ORDER BY ordinal_position;
        `
      });

    if (error) {
      console.log('⚠️  Could not query schema via RPC, trying direct approach...');
      
      // Try to get a sample lesson to see the actual structure
      const { data: sampleLesson, error: sampleError } = await supabase
        .from('lessons')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.error('❌ Error fetching sample lesson:', sampleError.message);
        console.log('\n🔧 Let\'s check if the table exists at all...');
        
        // Check if table exists
        const { data: tableExists, error: tableError } = await supabase
          .from('lessons')
          .select('count(*)', { count: 'exact', head: true });
        
        if (tableError) {
          console.error('❌ Lessons table error:', tableError.message);
          console.log('💡 The lessons table might not exist or have RLS issues');
        } else {
          console.log(`✅ Lessons table exists with ${tableExists} records`);
        }
        return;
      }

      if (sampleLesson && sampleLesson.length > 0) {
        console.log('📋 Sample lesson structure:');
        const lesson = sampleLesson[0];
        Object.keys(lesson).forEach(key => {
          const value = lesson[key];
          const type = typeof value;
          console.log(`  ${key}: ${type} = ${JSON.stringify(value).substring(0, 100)}${JSON.stringify(value).length > 100 ? '...' : ''}`);
        });
      } else {
        console.log('📊 Table exists but no lessons found');
      }
      return;
    }

    if (columns && columns.length > 0) {
      console.log('📋 Lessons table columns:');
      columns.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
      });
      
      // Check if status column exists
      const statusColumn = columns.find(col => col.column_name === 'status');
      if (statusColumn) {
        console.log(`\n✅ Status column exists: ${statusColumn.data_type}`);
      } else {
        console.log('\n❌ Status column is missing!');
        console.log('💡 This explains the query errors');
      }
    } else {
      console.log('❌ No column information found');
    }

    // Also try to get table constraints
    console.log('\n🔍 Checking table constraints...');
    const { data: constraints } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT 
            constraint_name,
            constraint_type,
            check_clause
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
          WHERE tc.table_schema = 'public' 
            AND tc.table_name = 'lessons';
        `
      });

    if (constraints && constraints.length > 0) {
      console.log('📋 Table constraints:');
      constraints.forEach(constraint => {
        console.log(`  ${constraint.constraint_name} (${constraint.constraint_type})`);
        if (constraint.check_clause) {
          console.log(`    Check: ${constraint.check_clause}`);
        }
      });
    }

  } catch (error) {
    console.error('💥 Error checking schema:', error.message);
  }
}

// Run the check
checkLessonsSchema().then(() => {
  console.log('\n🏁 Schema check complete!');
}).catch((error) => {
  console.error('💥 Schema check failed:', error);
});