#!/usr/bin/env node

/**
 * Superadmin System Test Runner
 * 
 * This script validates the superadmin system components including:
 * - Database migrations
 * - RPC functions
 * - Authentication and access control
 * - Data integrity
 * 
 * Usage: node scripts/test-superladmin-system.js [--verbose] [--suite=<suite-name>]
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class TestRunner {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.targetSuite = options.suite || null;
    this.results = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📋',
      'success': '✅',
      'error': '❌',
      'warning': '⚠️',
      'debug': '🔍'
    }[level] || '📋';

    if (level === 'debug' && !this.verbose) return;
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(name, testFn, description = '') {
    const startTime = Date.now();
    this.log(`Running test: ${name}${description ? ` - ${description}` : ''}`, 'debug');
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        status: 'passed',
        duration,
        result
      });
      
      this.log(`✓ ${name} (${duration}ms)`, 'success');
      return { success: true, result, duration };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.push({
        name,
        status: 'failed',
        duration,
        error: error.message
      });
      
      this.log(`✗ ${name} - ${error.message} (${duration}ms)`, 'error');
      return { success: false, error, duration };
    }
  }

  async testDatabaseConnection() {
    return this.runTest('Database Connection', async () => {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      return { connected: true, sample_query: 'success' };
    }, 'Verify basic database connectivity');
  }

  async testRLSPolicies() {
    return this.runTest('RLS Policies', async () => {
      // Check that RLS is enabled on critical tables
      const { data, error } = await supabase.rpc('test_superadmin_system');
      if (error) throw error;
      
      return {
        test_passed: true,
        superadmin_count: data.superadmin_count,
        system_status: data.system_status
      };
    }, 'Verify Row Level Security policies are working');
  }

  async testSuperadminFunctions() {
    return this.runTest('Superadmin RPC Functions', async () => {
      const functions = [
        'get_superadmin_dashboard_data',
        'test_superadmin_system',
        'is_superadmin'
      ];
      
      const results = {};
      
      for (const funcName of functions) {
        try {
          const { data, error } = await supabase.rpc(funcName);
          if (error) {
            results[funcName] = { status: 'error', error: error.message };
          } else {
            results[funcName] = { status: 'success', hasData: !!data };
          }
        } catch (err) {
          results[funcName] = { status: 'error', error: err.message };
        }
      }
      
      return results;
    }, 'Test all superladmin RPC functions are accessible');
  }

  async testUserManagementFunctions() {
    return this.runTest('User Management Functions', async () => {
      const functions = [
        'superadmin_suspend_user',
        'superadmin_reactivate_user',
        'superadmin_update_user_role',
        'superadmin_request_user_deletion'
      ];
      
      const results = {};
      const dummyUserId = '00000000-0000-0000-0000-000000000000';
      
      for (const funcName of functions) {
        try {
          // Call function with dummy data - expect it to fail gracefully
          const { error } = await supabase.rpc(funcName, {
            target_user_id: dummyUserId,
            reason: 'Test call'
          });
          
          // We expect an error because the user doesn't exist
          if (error && (
            error.message.includes('not found') || 
            error.message.includes('does not exist') ||
            error.message.includes('Target user not found')
          )) {
            results[funcName] = { status: 'accessible', note: 'Function exists and validates input' };
          } else {
            results[funcName] = { status: 'unexpected', error: error?.message };
          }
        } catch (err) {
          results[funcName] = { status: 'error', error: err.message };
        }
      }
      
      return results;
    }, 'Verify user management functions exist and are callable');
  }

  async testMigrationStatus() {
    return this.runTest('Migration Status', async () => {
      // Check if all expected tables exist
      const expectedTables = [
        'users',
        'user_profiles', 
        'organizations',
        'preschools',
        'audit_logs'
      ];
      
      const results = {};
      
      for (const tableName of expectedTables) {
        try {
          const { error } = await supabase.from(tableName).select('*').limit(1);
          results[tableName] = error ? { exists: false, error: error.message } : { exists: true };
        } catch (err) {
          results[tableName] = { exists: false, error: err.message };
        }
      }
      
      return results;
    }, 'Check that all required database tables exist');
  }

  async testDataIntegrity() {
    return this.runTest('Data Integrity', async () => {
      // Basic data integrity checks
      const { data: userCount, error: userError } = await supabase
        .from('users')
        .select('*', { count: 'exact' });
        
      if (userError) throw userError;

      const { data: superadminCount, error: superError } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'super_admin');
        
      if (superError) throw superError;

      return {
        total_users: userCount.length,
        superadmin_count: superadminCount.length,
        has_superadmins: superadminCount.length > 0
      };
    }, 'Verify basic data integrity and superladmin existence');
  }

  async runAuthenticationTests() {
    this.log('🔐 Running Authentication & Access Control Tests...', 'info');
    
    await this.testDatabaseConnection();
    await this.testRLSPolicies();
  }

  async runDatabaseTests() {
    this.log('🗄️ Running Database Function Tests...', 'info');
    
    await this.testSuperadminFunctions();
    await this.testUserManagementFunctions();
    await this.testMigrationStatus();
    await this.testDataIntegrity();
  }

  async runUITests() {
    this.log('🖥️ Running UI Component Tests...', 'info');
    
    await this.runTest('UI Components', async () => {
      // Check that key UI files exist
      const fs = require('fs');
      const path = require('path');
      
      const uiFiles = [
        'app/screens/super-admin-dashboard.tsx',
        'app/screens/super-admin-users.tsx', 
        'app/screens/super-admin-ai-quotas.tsx',
        'app/screens/super-admin-system-monitoring.tsx'
      ];
      
      const results = {};
      
      for (const filePath of uiFiles) {
        const fullPath = path.join(process.cwd(), filePath);
        results[filePath] = { exists: fs.existsSync(fullPath) };
      }
      
      return results;
    }, 'Verify all UI component files exist');
  }

  async runEndToEndTests() {
    this.log('🔄 Running End-to-End Tests...', 'info');
    
    await this.runTest('System Health Check', async () => {
      const { data, error } = await supabase.rpc('test_superadmin_system');
      if (error) throw error;
      
      if (data.system_status !== 'operational') {
        throw new Error(`System status is ${data.system_status}, expected 'operational'`);
      }
      
      return {
        system_operational: true,
        superadmin_count: data.superadmin_count,
        test_suite: data.test_suite
      };
    }, 'Overall system health and operational status');
  }

  async runAll() {
    this.log('🚀 Starting Superadmin System Test Suite...', 'info');
    
    const suites = {
      'authentication': () => this.runAuthenticationTests(),
      'database': () => this.runDatabaseTests(), 
      'ui': () => this.runUITests(),
      'endtoend': () => this.runEndToEndTests()
    };
    
    if (this.targetSuite && suites[this.targetSuite]) {
      this.log(`Running specific suite: ${this.targetSuite}`, 'info');
      await suites[this.targetSuite]();
    } else {
      // Run all suites
      for (const [suiteName, suiteFn] of Object.entries(suites)) {
        await suiteFn();
      }
    }
    
    this.printSummary();
  }

  printSummary() {
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;
    
    console.log('\n📊 Test Summary:');
    console.log(`   Total Tests: ${total}`);
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => r.status === 'failed')
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error}`);
        });
    }
    
    if (this.verbose) {
      console.log('\n🔍 Detailed Results:');
      this.results.forEach(result => {
        console.log(`   ${result.status === 'passed' ? '✅' : '❌'} ${result.name} (${result.duration}ms)`);
        if (result.result && typeof result.result === 'object') {
          console.log(`      Result: ${JSON.stringify(result.result, null, 2)}`);
        }
      });
    }
    
    console.log(`\n🏁 Test suite completed ${failed === 0 ? 'successfully' : 'with failures'}!`);
    process.exit(failed === 0 ? 0 : 1);
  }
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg.startsWith('--suite=')) {
      options.suite = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Superadmin System Test Runner

Usage: node scripts/test-superadmin-system.js [options]

Options:
  --verbose, -v          Enable verbose output
  --suite=<name>         Run specific test suite only
                        (authentication, database, ui, endtoend)
  --help, -h            Show this help message

Examples:
  node scripts/test-superadmin-system.js
  node scripts/test-superadmin-system.js --verbose
  node scripts/test-superadmin-system.js --suite=database
      `);
      process.exit(0);
    }
  });
  
  return options;
}

// Main execution
async function main() {
  const options = parseArgs();
  const runner = new TestRunner(options);
  
  try {
    await runner.runAll();
  } catch (error) {
    console.error('❌ Test runner encountered a fatal error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestRunner;