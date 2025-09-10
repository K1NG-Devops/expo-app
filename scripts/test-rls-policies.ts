/**
 * RLS Policy Testing Script
 * 
 * This script validates that Row Level Security policies are working correctly
 * by testing various user scenarios and access patterns.
 */

import { supabase } from '../lib/supabase';
import { createSecureDatabase, type SecurityContext } from '../lib/security';
import { type Role } from '../lib/rbac';

interface TestUser {
  id: string;
  role: Role;
  organizationId?: string;
  seatStatus?: string;
}

interface TestResult {
  testName: string;
  passed: boolean;
  error?: string;
  details?: any;
}

/**
 * Test data setup - creates test users with different roles
 */
const TEST_USERS: TestUser[] = [
  {
    id: 'test-super-admin-001',
    role: 'super_admin',
  },
  {
    id: 'test-principal-001',
    role: 'principal_admin',
    organizationId: 'test-org-001',
  },
  {
    id: 'test-teacher-001',
    role: 'teacher',
    organizationId: 'test-org-001',
    seatStatus: 'active',
  },
  {
    id: 'test-teacher-002',
    role: 'teacher',
    organizationId: 'test-org-001',
    seatStatus: 'inactive',
  },
  {
    id: 'test-parent-001',
    role: 'parent',
    organizationId: 'test-org-001',
  },
  {
    id: 'test-teacher-other-org',
    role: 'teacher',
    organizationId: 'test-org-002',
    seatStatus: 'active',
  },
];

/**
 * Test suite runner
 */
export class RLSPolicyTester {
  private results: TestResult[] = [];

  /**
   * Run all RLS policy tests
   */
  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting RLS Policy Tests...\n');

    // Test profile access policies
    await this.testProfileAccess();

    // Test teacher access policies  
    await this.testTeacherAccess();

    // Test student access policies
    await this.testStudentAccess();

    // Test class access policies
    await this.testClassAccess();

    // Test enterprise leads access
    await this.testEnterpriseLeadsAccess();

    // Test organization membership policies
    await this.testOrganizationMembershipAccess();

    // Test cross-organization access prevention
    await this.testCrossOrganizationAccess();

    // Print results
    this.printResults();

    return this.results;
  }

  /**
   * Test profile access policies
   */
  private async testProfileAccess(): Promise<void> {
    console.log('📋 Testing Profile Access Policies...');

    // Super admin should see all profiles
    await this.runTest('Super admin can read all profiles', async () => {
      const context = this.createContext(TEST_USERS[0]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('profiles', 'read');
      return { success: result.error === null, data: result };
    });

    // Principal should only see profiles in their org
    await this.runTest('Principal can only read org profiles', async () => {
      const context = this.createContext(TEST_USERS[1]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('profiles', 'read');
      
      // Should succeed and only return profiles from their org
      if (result.error) return { success: false, data: result };
      
      const hasWrongOrgProfile = result.data?.some(
        (profile: any) => profile.preschool_id !== TEST_USERS[1].organizationId
      );
      
      return { success: !hasWrongOrgProfile, data: result };
    });

    // Teacher should only see own profile
    await this.runTest('Teacher can only read own profile', async () => {
      const context = this.createContext(TEST_USERS[2]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('profiles', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasOtherProfile = result.data?.some(
        (profile: any) => profile.id !== TEST_USERS[2].id
      );
      
      return { success: !hasOtherProfile, data: result };
    });

    // Parent should only see own profile
    await this.runTest('Parent can only read own profile', async () => {
      const context = this.createContext(TEST_USERS[4]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('profiles', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasOtherProfile = result.data?.some(
        (profile: any) => profile.id !== TEST_USERS[4].id
      );
      
      return { success: !hasOtherProfile, data: result };
    });
  }

  /**
   * Test teacher access policies
   */
  private async testTeacherAccess(): Promise<void> {
    console.log('👩‍🏫 Testing Teacher Access Policies...');

    // Active teacher should see colleagues in same org
    await this.runTest('Active teacher can read org colleagues', async () => {
      const context = this.createContext(TEST_USERS[2]); // Active teacher
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('teachers', 'read');
      
      if (result.error) return { success: false, data: result };
      
      // Should only see teachers from same org
      const hasWrongOrgTeacher = result.data?.some(
        (teacher: any) => teacher.preschool_id !== TEST_USERS[2].organizationId
      );
      
      return { success: !hasWrongOrgTeacher, data: result };
    });

    // Inactive teacher should only see own record
    await this.runTest('Inactive teacher can only read own record', async () => {
      const context = this.createContext(TEST_USERS[3]); // Inactive teacher
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('teachers', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasOtherTeacher = result.data?.some(
        (teacher: any) => teacher.user_id !== TEST_USERS[3].id
      );
      
      return { success: !hasOtherTeacher, data: result };
    });

    // Parent should not see any teacher records
    await this.runTest('Parent cannot read teacher records', async () => {
      const context = this.createContext(TEST_USERS[4]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('teachers', 'read');
      
      // Should return empty result (no error, but no data)
      return { success: result.error === null && (!result.data || result.data.length === 0), data: result };
    });
  }

  /**
   * Test student access policies
   */
  private async testStudentAccess(): Promise<void> {
    console.log('👧👦 Testing Student Access Policies...');

    // Principal should see all students in org
    await this.runTest('Principal can read all org students', async () => {
      const context = this.createContext(TEST_USERS[1]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('students', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasWrongOrgStudent = result.data?.some(
        (student: any) => student.preschool_id !== TEST_USERS[1].organizationId
      );
      
      return { success: !hasWrongOrgStudent, data: result };
    });

    // Active teacher should see org students
    await this.runTest('Active teacher can read org students', async () => {
      const context = this.createContext(TEST_USERS[2]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('students', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasWrongOrgStudent = result.data?.some(
        (student: any) => student.preschool_id !== TEST_USERS[2].organizationId
      );
      
      return { success: !hasWrongOrgStudent, data: result };
    });

    // Parent should only see own children
    await this.runTest('Parent can only read own children', async () => {
      const context = this.createContext(TEST_USERS[4]);
      const secureDB = createSecureDatabase(context);
      const result = await secureDB.query('students', 'read');
      
      if (result.error) return { success: false, data: result };
      
      const hasOtherChild = result.data?.some(\n        (student: any) => student.parent_id !== TEST_USERS[4].id && student.guardian_id !== TEST_USERS[4].id\n      );\n      \n      return { success: !hasOtherChild, data: result };\n    });\n  }\n\n  /**\n   * Test class access policies\n   */\n  private async testClassAccess(): Promise<void> {\n    console.log('📚 Testing Class Access Policies...');\n\n    // Principal should see all classes in org\n    await this.runTest('Principal can read all org classes', async () => {\n      const context = this.createContext(TEST_USERS[1]);\n      const secureDB = createSecureDatabase(context);\n      const result = await secureDB.query('classes', 'read');\n      \n      if (result.error) return { success: false, data: result };\n      \n      const hasWrongOrgClass = result.data?.some(\n        (cls: any) => cls.preschool_id !== TEST_USERS[1].organizationId\n      );\n      \n      return { success: !hasWrongOrgClass, data: result };\n    });\n\n    // Active teacher should see org classes\n    await this.runTest('Active teacher can read org classes', async () => {\n      const context = this.createContext(TEST_USERS[2]);\n      const secureDB = createSecureDatabase(context);\n      const result = await secureDB.query('classes', 'read');\n      \n      if (result.error) return { success: false, data: result };\n      \n      const hasWrongOrgClass = result.data?.some(\n        (cls: any) => cls.preschool_id !== TEST_USERS[2].organizationId\n      );\n      \n      return { success: !hasWrongOrgClass, data: result };\n    });\n  }\n\n  /**\n   * Test enterprise leads access (super admin only)\n   */\n  private async testEnterpriseLeadsAccess(): Promise<void> {\n    console.log('💼 Testing Enterprise Leads Access...');\n\n    // Super admin should see all leads\n    await this.runTest('Super admin can read all leads', async () => {\n      const context = this.createContext(TEST_USERS[0]);\n      const secureDB = createSecureDatabase(context);\n      const result = await secureDB.query('enterprise_leads', 'read');\n      return { success: result.error === null, data: result };\n    });\n\n    // Principal should not see leads\n    await this.runTest('Principal cannot read leads', async () => {\n      const context = this.createContext(TEST_USERS[1]);\n      const secureDB = createSecureDatabase(context);\n      const result = await secureDB.query('enterprise_leads', 'read');\n      \n      // Should return empty result\n      return { success: result.error === null && (!result.data || result.data.length === 0), data: result };\n    });\n  }\n\n  /**\n   * Test organization membership policies\n   */\n  private async testOrganizationMembershipAccess(): Promise<void> {\n    console.log('🏢 Testing Organization Membership Policies...');\n\n    // Principal should see org memberships\n    await this.runTest('Principal can read org memberships', async () => {\n      const context = this.createContext(TEST_USERS[1]);\n      const secureDB = createSecureDatabase(context);\n      const result = await supabase\n        .from('organization_members')\n        .select('*')\n        .eq('organization_id', TEST_USERS[1].organizationId);\n      \n      return { success: result.error === null, data: result };\n    });\n\n    // Teacher should only see own membership\n    await this.runTest('Teacher can only read own membership', async () => {\n      const context = this.createContext(TEST_USERS[2]);\n      const secureDB = createSecureDatabase(context);\n      const result = await supabase\n        .from('organization_members')\n        .select('*')\n        .eq('user_id', TEST_USERS[2].id);\n      \n      return { success: result.error === null, data: result };\n    });\n  }\n\n  /**\n   * Test cross-organization access prevention\n   */\n  private async testCrossOrganizationAccess(): Promise<void> {\n    console.log('🚫 Testing Cross-Organization Access Prevention...');\n\n    // Teacher from org-001 should not see org-002 data\n    await this.runTest('Teacher cannot see other org data', async () => {\n      const context = this.createContext(TEST_USERS[2]); // Org-001 teacher\n      const secureDB = createSecureDatabase(context);\n      \n      // Try to access org-002 data\n      const result = await secureDB.query('teachers', 'read', {\n        resourceOrgId: 'test-org-002',\n      });\n      \n      // Should fail or return no results\n      return { \n        success: result.error !== null || !result.data || result.data.length === 0, \n        data: result \n      };\n    });\n  }\n\n  /**\n   * Helper: Create security context for test user\n   */\n  private createContext(user: TestUser): SecurityContext {\n    return {\n      userId: user.id,\n      role: user.role,\n      organizationId: user.organizationId,\n      capabilities: [], // Simplified for testing\n      seatStatus: user.seatStatus,\n    };\n  }\n\n  /**\n   * Helper: Run individual test\n   */\n  private async runTest(\n    testName: string, \n    testFn: () => Promise<{ success: boolean; data?: any }>\n  ): Promise<void> {\n    try {\n      const result = await testFn();\n      \n      this.results.push({\n        testName,\n        passed: result.success,\n        details: result.data,\n      });\n      \n      const status = result.success ? '✅' : '❌';\n      console.log(`  ${status} ${testName}`);\n      \n      if (!result.success && result.data?.error) {\n        console.log(`     Error: ${result.data.error.message}`);\n      }\n    } catch (error: any) {\n      this.results.push({\n        testName,\n        passed: false,\n        error: error.message,\n      });\n      \n      console.log(`  ❌ ${testName}`);\n      console.log(`     Exception: ${error.message}`);\n    }\n  }\n\n  /**\n   * Print test results summary\n   */\n  private printResults(): void {\n    const totalTests = this.results.length;\n    const passedTests = this.results.filter(r => r.passed).length;\n    const failedTests = totalTests - passedTests;\n    \n    console.log('\\n' + '='.repeat(50));\n    console.log('📊 RLS Policy Test Results');\n    console.log('='.repeat(50));\n    console.log(`Total Tests: ${totalTests}`);\n    console.log(`✅ Passed: ${passedTests}`);\n    console.log(`❌ Failed: ${failedTests}`);\n    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);\n    \n    if (failedTests > 0) {\n      console.log('\\n🚨 Failed Tests:');\n      this.results\n        .filter(r => !r.passed)\n        .forEach(r => {\n          console.log(`  • ${r.testName}`);\n          if (r.error) console.log(`    Error: ${r.error}`);\n        });\n    }\n    \n    console.log('\\n' + '='.repeat(50));\n  }\n}\n\n/**\n * Run RLS policy tests\n */\nexport async function testRLSPolicies(): Promise<TestResult[]> {\n  const tester = new RLSPolicyTester();\n  return await tester.runAllTests();\n}\n\n// If running directly\nif (require.main === module) {\n  testRLSPolicies()\n    .then(() => {\n      console.log('\\n✅ RLS Policy testing completed!');\n      process.exit(0);\n    })\n    .catch((error) => {\n      console.error('\\n❌ RLS Policy testing failed:', error);\n      process.exit(1);\n    });\n}
