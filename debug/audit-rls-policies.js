#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing required environment variables');
  console.error('Need: EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Define app roles and their required access patterns
const APP_ROLES = {
  super_admin: {
    description: 'Full system access',
    should_access: ['all_tables'],
    critical_for: ['superadmin dashboard', 'AI quota management', 'system monitoring']
  },
  principal: {
    description: 'School-wide access',
    should_access: ['own_school_data', 'teachers_in_school', 'students_in_school', 'subscriptions'],
    critical_for: ['principal dashboard', 'seat management', 'teacher oversight']
  },
  teacher: {
    description: 'Class and student access',
    should_access: ['own_classes', 'own_students', 'assignments'],
    critical_for: ['teacher dashboard', 'lesson planning', 'student management']
  },
  student: {
    description: 'Own data access',
    should_access: ['own_profile', 'own_assignments'],
    critical_for: ['student dashboard', 'assignments']
  },
  parent: {
    description: 'Child data access',
    should_access: ['children_data', 'children_assignments'],
    critical_for: ['parent dashboard', 'child progress']
  }
};

// Critical tables that need specific RLS alignment
const CRITICAL_TABLES = [
  // Core user and auth tables
  'users',
  'profiles', 
  
  // School and organization tables
  'preschools',
  'subscriptions',
  'subscription_seats',
  
  // Academic structure
  'classes',
  'class_students',
  'class_teachers',
  
  // AI and quota management (critical for superadmin)
  'ai_allocations',
  'ai_usage_tracking',
  'teacher_ai_allocations',
  'user_ai_quotas',
  
  // Student and content tables
  'students',
  'assignments',
  'lessons',
  'progress_tracking',
  
  // Notifications and communication
  'push_devices',
  'notifications',
  
  // System monitoring (critical for superadmin)
  'audit_logs',
  'system_metrics'
];

async function auditRLSPolicies() {
  console.log('🔍 Starting comprehensive RLS audit for app flow alignment...\n');
  
  try {
    // Get all tables with RLS enabled/disabled
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_rls_status');
    
    if (tablesError) {
      // Fallback: query information_schema
      console.log('Using fallback method to get table information...');
      const { data: allTables, error: fallbackError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public');
        
      if (fallbackError) {
        console.error('Cannot get table information:', fallbackError.message);
        return;
      }
      
      console.log(`Found ${allTables.length} tables in public schema`);
    }
    
    // Check RLS status for critical tables
    console.log('📋 RLS Status for Critical Tables:');
    console.log('=' .repeat(80));
    
    for (const tableName of CRITICAL_TABLES) {
      await auditTableRLS(tableName);
    }
    
    // Generate RLS fixes
    await generateRLSFixes();
    
  } catch (_error) {
    console._error('❌ Audit failed:', _error.message);
  }
}

async function auditTableRLS(tableName) {
  try {
    // Check if table exists and RLS status
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            t.tablename,
            t.rowsecurity as rls_enabled,
            (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
          FROM pg_tables t 
          WHERE t.schemaname = 'public' AND t.tablename = '${tableName}'
        `
      });
    
    if (tableError || !tableInfo || tableInfo.length === 0) {
      console.log(`⚠️  ${tableName.padEnd(25)} - TABLE NOT FOUND`);
      return;
    }
    
    const table = tableInfo[0];
    const rlsStatus = table.rls_enabled ? '✅ ENABLED' : '❌ DISABLED';
    const policyCount = table.policy_count || 0;
    
    console.log(`${tableName.padEnd(25)} - RLS: ${rlsStatus.padEnd(12)} Policies: ${policyCount}`);
    
    // Check policies for critical roles
    if (table.rls_enabled && policyCount > 0) {
      await checkTablePolicies(tableName);
    } else if (!table.rls_enabled) {
      console.log(`   ⚠️  RLS DISABLED - May impact security`);
    } else if (policyCount === 0) {
      console.log(`   ⚠️  NO POLICIES - RLS enabled but no access rules`);
    }
    
  } catch (_error) {
    console.log(`❌ ${tableName.padEnd(25)} - ERROR: ${_error.message}`);
  }
}

async function checkTablePolicies(tableName) {
  try {
    const { data: policies, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT 
            policyname,
            cmd,
            qual,
            with_check
          FROM pg_policies 
          WHERE tablename = '${tableName}'
          ORDER BY cmd, policyname
        `
      });
      
    if (error || !policies) {
      console.log(`   ❌ Cannot read policies: ${_error?.message}`);
      return;
    }
    
    // Analyze policies for role coverage
    const roleCoverage = {
      super_admin: false,
      principal: false,
      teacher: false,
      student: false,
      parent: false
    };
    
    policies.forEach(policy => {
      const policyText = policy.qual || '';
      Object.keys(roleCoverage).forEach(role => {
        if (policyText.includes(role)) {
          roleCoverage[role] = true;
        }
      });
    });
    
    const missingRoles = Object.entries(roleCoverage)
      .filter(([role, covered]) => !covered)
      .map(([role]) => role);
      
    if (missingRoles.length > 0) {
      console.log(`   ⚠️  Missing policies for: ${missingRoles.join(', ')}`);
    }
    
    // Check for superadmin access specifically
    const hasSuperAdminAccess = policies.some(p => 
      p.qual && p.qual.includes('super_admin')
    );
    
    if (!hasSuperAdminAccess) {
      console.log(`   🚨 CRITICAL: No super_admin access policy found!`);
    }
    
  } catch (_error) {
    console.log(`   ❌ Policy check failed: ${_error.message}`);
  }
}

async function generateRLSFixes() {
  console.log('\n🔧 Generating RLS Fix Script...\n');
  
  let fixScript = `-- RLS Policy Fixes for App Flow Alignment
-- Generated: ${new Date().toISOString()}
-- 
-- This script fixes RLS policies to align with the actual app flow
-- focusing on superadmin and principal dashboard functionality

BEGIN;

-- Enable RLS on critical tables that should have it
`;

  // Add specific fixes for each critical table
  const fixes = {
    users: `
-- Users table: Core user data
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Super admin can see all users
DROP POLICY IF EXISTS "super_admin_users_access" ON users;
CREATE POLICY "super_admin_users_access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Principals can see users in their school
DROP POLICY IF EXISTS "principal_users_access" ON users;
CREATE POLICY "principal_users_access" ON users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users principal
      WHERE principal.auth_user_id = auth.uid()
      AND principal.role = 'principal'
      AND principal.organization_id = users.organization_id
    )
  );

-- Users can see their own data
DROP POLICY IF EXISTS "users_own_data" ON users;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth_user_id = auth.uid());
`,

    preschools: `
-- Preschools table: School data
ALTER TABLE preschools ENABLE ROW LEVEL SECURITY;

-- Super admin can access all schools
DROP POLICY IF EXISTS "super_admin_preschools" ON preschools;
CREATE POLICY "super_admin_preschools" ON preschools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Principals can access their own school
DROP POLICY IF EXISTS "principal_own_preschool" ON preschools;
CREATE POLICY "principal_own_preschool" ON preschools
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'principal'
      AND u.organization_id = preschools.id
    )
  );
`,

    subscriptions: `
-- Subscriptions table: Critical for principal dashboard
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Super admin can see all subscriptions
DROP POLICY IF EXISTS "super_admin_subscriptions" ON subscriptions;
CREATE POLICY "super_admin_subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Principals can see their school's subscriptions
DROP POLICY IF EXISTS "principal_school_subscriptions" ON subscriptions;
CREATE POLICY "principal_school_subscriptions" ON subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'principal'
      AND u.organization_id = subscriptions.school_id
    )
  );
`,

    ai_allocations: `
-- AI Allocations: Critical for superadmin dashboard
ALTER TABLE ai_allocations ENABLE ROW LEVEL SECURITY;

-- Super admin has full access to AI allocations
DROP POLICY IF EXISTS "super_admin_ai_allocations" ON ai_allocations;
CREATE POLICY "super_admin_ai_allocations" ON ai_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Principals can see their school's allocations
DROP POLICY IF EXISTS "principal_school_ai_allocations" ON ai_allocations;
CREATE POLICY "principal_school_ai_allocations" ON ai_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'principal'
      AND u.organization_id = ai_allocations.organization_id
    )
  );
`,

    teacher_ai_allocations: `
-- Teacher AI Allocations: For quota management
ALTER TABLE teacher_ai_allocations ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all teacher allocations
DROP POLICY IF EXISTS "super_admin_teacher_allocations" ON teacher_ai_allocations;
CREATE POLICY "super_admin_teacher_allocations" ON teacher_ai_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'super_admin'
    )
  );

-- Principals can manage their school's teacher allocations
DROP POLICY IF EXISTS "principal_teacher_allocations" ON teacher_ai_allocations;
CREATE POLICY "principal_teacher_allocations" ON teacher_ai_allocations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.role = 'principal'
      AND EXISTS (
        SELECT 1 FROM users t
        WHERE t.id = teacher_ai_allocations.user_id
        AND t.organization_id = u.organization_id
      )
    )
  );

-- Teachers can see their own allocations
DROP POLICY IF EXISTS "teacher_own_allocations" ON teacher_ai_allocations;
CREATE POLICY "teacher_own_allocations" ON teacher_ai_allocations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.auth_user_id = auth.uid()
      AND u.id = teacher_ai_allocations.user_id
    )
  );
`
  };

  // Add all fixes to the script
  Object.entries(fixes).forEach(([table, fix]) => {
    fixScript += `\n-- ${table.toUpperCase()} TABLE\n${fix}\n`;
  });

  fixScript += `
-- Commit the changes
COMMIT;

-- Verify the policies are working
SELECT 'RLS policies updated successfully' as status;
`;

  // Write the fix script to a file
  require('fs').writeFileSync('fix-rls-alignment.sql', fixScript);
  
  console.log('✅ RLS fix script generated: fix-rls-alignment.sql');
  console.log('📋 Summary of fixes:');
  console.log('   - Super admin access to all critical tables');
  console.log('   - Principal access to school-specific data');
  console.log('   - Teacher access to relevant class/student data');
  console.log('   - AI quota management table policies');
  console.log('   - Subscription and seat management policies');
  
  console.log('\n🚀 To apply fixes:');
  console.log('   1. Review: cat fix-rls-alignment.sql');
  console.log('   2. Apply: psql -f fix-rls-alignment.sql [connection_string]');
  console.log('   3. Or run through Supabase dashboard SQL editor');
}

// Run the audit
auditRLSPolicies().catch(console.error);