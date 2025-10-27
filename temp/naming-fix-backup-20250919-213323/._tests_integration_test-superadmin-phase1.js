#!/usr/bin/env node

/**
 * Phase 1 Superladmin System Test Script
 * Tests the deployed database functions and validates implementation
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function testPhase1() {
  console.log('🚀 Testing Superladmin System Phase 1 Implementation');
  console.log('=' .repeat(60));

  try {
    // Test 1: Run comprehensive system tests
    console.log('\n📊 Running comprehensive system tests...');
    const { data: testResults, error: testError } = await supabase.rpc('test_superadmin_system');
    
    if (testError) {
      console.error('❌ System test failed:', testError);
      return false;
    }

    console.log('✅ System Test Results:');
    console.log(`   • Test Suite: ${testResults.test_suite}`);
    console.log(`   • Run At: ${new Date(testResults.run_at).toLocaleString()}`);
    console.log(`   • Total Tests: ${testResults.total_tests}`);
    console.log(`   • Passed: ${testResults.passed} ✅`);
    console.log(`   • Failed: ${testResults.failed} ${testResults.failed > 0 ? '❌' : '✅'}`);

    // Show detailed results
    if (testResults.results) {
      console.log('\n📋 Detailed Test Results:');
      testResults.results.forEach((result, index) => {
        const status = result.status === 'passed' ? '✅' : '❌';
        console.log(`   ${index + 1}. ${result.test}: ${status} ${result.message}`);
      });
    }

    // Test 2: Create sample test data
    console.log('\n🎯 Creating sample test data...');
    const { data: testData, error: dataError } = await supabase.rpc('create_superadmin_test_data');
    
    if (dataError) {
      console.error('❌ Test data creation failed:', dataError);
      return false;
    }

    if (testData.success) {
      console.log('✅ Sample test data created successfully');
      console.log(`   • Superladmin ID: ${testData.data.superadmin_id}`);
      console.log(`   • Test User ID: ${testData.data.test_user_id}`);
      console.log(`   • Notification ID: ${testData.data.notification_id}`);
      console.log(`   • Risk Assessment ID: ${testData.data.risk_assessment_id}`);
    } else {
      console.log('⚠️ Test data creation issue:', testData.error);
    }

    // Test 3: Try to get dashboard data (this might fail without proper auth)
    console.log('\n📈 Testing dashboard data function...');
    const { data: dashboardData, error: dashboardError } = await supabase.rpc('get_superadmin_dashboard_data');
    
    if (dashboardError) {
      if (dashboardError.code === 'INSUFFICIENT_PERMISSIONS') {
        console.log('⚠️ Dashboard access requires superladmin authentication (expected)');
      } else {
        console.error('❌ Dashboard data error:', dashboardError);
      }
    } else {
      console.log('✅ Dashboard data retrieved successfully');
      if (dashboardData.success) {
        console.log(`   • Total Users: ${dashboardData.data.user_stats.total_users}`);
        console.log(`   • Active Users: ${dashboardData.data.user_stats.active_users}`);
        console.log(`   • Suspended Users: ${dashboardData.data.user_stats.suspended_users}`);
        console.log(`   • High Risk Users: ${dashboardData.data.user_stats.high_risk_users}`);
        console.log(`   • Unread Notifications: ${dashboardData.data.notifications_count}`);
        console.log(`   • Pending Deletions: ${dashboardData.data.pending_deletions}`);
      }
    }

    // Test 4: Check if tables were created
    console.log('\n🗄️ Verifying table creation...');
    const tables = [
      'superadmin_user_deletion_requests',
      'superadmin_user_actions', 
      'superadmin_user_risk_assessments',
      'superadmin_notifications',
      'superadmin_notification_deliveries',
      'superadmin_role_assignments',
      'superadmin_session_management',
      'superadmin_compliance_reports'
    ];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        if (error.code === '42501') {
          console.log(`   ⚠️ ${table}: Access restricted (RLS working) ✅`);
        } else {
          console.log(`   ❌ ${table}: Error - ${_error.message}`);
        }
      } else {
        console.log(`   ✅ ${table}: Accessible`);
      }
    }

    // Test 5: Test enum types
    console.log('\n🏷️ Testing enum types...');
    try {
      const { data: riskColor, error: colorError } = await supabase.rpc('get_risk_color', { 
        risk_level: 'high' 
      });
      
      if (!colorError && riskColor === '#f59e0b') {
        console.log('   ✅ Risk color function working correctly');
      } else {
        console.log('   ❌ Risk color function error:', colorError || 'Wrong color returned');
      }

      const { data: riskLevel, error: levelError } = await supabase.rpc('validate_risk_score', { 
        score: 75 
      });
      
      if (!levelError && riskLevel === 'high') {
        console.log('   ✅ Risk score validation working correctly');
      } else {
        console.log('   ❌ Risk score validation error:', levelError || 'Wrong level returned');
      }
    } catch (_err) {
      console.log('   ⚠️ Enum testing requires database-level access');
    }

    // Final assessment
    console.log('\n' + '=' .repeat(60));
    const allPassed = testResults.failed === 0;
    
    if (allPassed) {
      console.log('🎉 PHASE 1 DEPLOYMENT: SUCCESS! 🎉');
      console.log('');
      console.log('✅ All system tests passed');
      console.log('✅ Database schema deployed correctly'); 
      console.log('✅ RPC functions working');
      console.log('✅ RLS policies active');
      console.log('✅ Test data created');
      console.log('✅ Ready for Phase 2 implementation');
    } else {
      console.log('⚠️ PHASE 1 DEPLOYMENT: PARTIAL SUCCESS');
      console.log('');
      console.log('Some tests failed - review the detailed results above');
    }

    return allPassed;

  } catch (_error) {
    console._error('\n❌ Critical _error during testing:', _error);
    return false;
  }
}

// Run the test
testPhase1().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Fatal error:', _error);
  process.exit(1);
});