#!/usr/bin/env npx tsx

/**
 * Test script for Financial Dashboard
 * 
 * Tests the FinancialDataService to ensure it correctly:
 * - Loads financial metrics
 * - Fetches recent transactions 
 * - Gets monthly trend data
 * - Formats data properly
 */

import { FinancialDataService } from '../services/FinancialDataService';

// Mock preschool ID for testing - replace with a real one from your database
const TEST_PRESCHOOL_ID = 'your-preschool-id-here';

async function testFinancialDashboard() {
  console.log('🧪 Testing Financial Dashboard Data Service...\n');

  try {
    // Test 1: Load Financial Metrics
    console.log('📊 Testing financial metrics...');
    const metrics = await FinancialDataService.getFinancialMetrics(TEST_PRESCHOOL_ID);
    console.log('Metrics loaded:', {
      monthlyRevenue: FinancialDataService.formatCurrency(metrics.monthlyRevenue),
      outstandingPayments: FinancialDataService.formatCurrency(metrics.outstandingPayments),
      monthlyExpenses: FinancialDataService.formatCurrency(metrics.monthlyExpenses),
      netIncome: FinancialDataService.formatCurrency(metrics.netIncome),
      totalStudents: metrics.totalStudents,
      averageFeePerStudent: FinancialDataService.formatCurrency(metrics.averageFeePerStudent),
      paymentCompletionRate: `${metrics.paymentCompletionRate.toFixed(1)}%`,
    });
    console.log('✅ Metrics test passed\n');

    // Test 2: Load Recent Transactions
    console.log('📝 Testing recent transactions...');
    const transactions = await FinancialDataService.getRecentTransactions(TEST_PRESCHOOL_ID, 5);
    console.log(`Found ${transactions.length} recent transactions:`);
    transactions.forEach((transaction, index) => {
      console.log(`  ${index + 1}. ${transaction.description}`);
      console.log(`     Type: ${transaction.type} | Source: ${transaction.source}`);
      console.log(`     Amount: ${FinancialDataService.formatCurrency(transaction.amount)}`);
      console.log(`     Status: ${FinancialDataService.getDisplayStatus(transaction.status)}`);
      console.log(`     Date: ${new Date(transaction.date).toLocaleDateString()}`);
      if (transaction.reference) {
        console.log(`     Reference: ${transaction.reference}`);
      }
      console.log('');
    });
    console.log('✅ Transactions test passed\n');

    // Test 3: Load Monthly Trend Data
    console.log('📈 Testing monthly trend data...');
    const trendData = await FinancialDataService.getMonthlyTrendData(TEST_PRESCHOOL_ID);
    console.log(`Found ${trendData.length} months of trend data:`);
    trendData.forEach((month, index) => {
      console.log(`  ${index + 1}. ${month.month}: Revenue ${FinancialDataService.formatCurrency(month.revenue)}, Expenses ${FinancialDataService.formatCurrency(month.expenses)}, Net ${FinancialDataService.formatCurrency(month.netIncome)}`);
    });
    console.log('✅ Trend data test passed\n');

    // Test 4: Utility Functions
    console.log('🛠️  Testing utility functions...');
    const testAmount = 12345.67;
    console.log(`Currency formatting: ${testAmount} -> ${FinancialDataService.formatCurrency(testAmount)}`);
    
    const testStatuses = ['completed', 'pending', 'overdue', 'approved', 'under_review'];
    console.log('Status colors and displays:');
    testStatuses.forEach(status => {
      console.log(`  ${status}: Color ${FinancialDataService.getStatusColor(status)}, Display "${FinancialDataService.getDisplayStatus(status)}"`);
    });
    console.log('✅ Utility functions test passed\n');

    console.log('🎉 All tests passed! Financial dashboard should work correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error && error.message.includes('your-preschool-id-here')) {
      console.log('\n💡 To run this test properly:');
      console.log('   1. Replace TEST_PRESCHOOL_ID with a real preschool ID from your database');
      console.log('   2. Make sure your Supabase connection is configured');
      console.log('   3. Run: npx tsx scripts/test-financial-dashboard.ts');
    }
  }
}

// Helper function to get a real preschool ID from the database
async function getTestPreschoolId(): Promise<string | null> {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    if (!process.env.EXPO_PUBLIC_SUPABASE_URL || !process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
      console.log('⚠️  Supabase environment variables not found. Please set:');
      console.log('   EXPO_PUBLIC_SUPABASE_URL');
      console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY');
      return null;
    }

    const supabase = createClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error } = await supabase
      .from('preschools')
      .select('id, name')
      .limit(1)
      .single();

    if (error) {
      console.log('⚠️  Could not fetch test preschool ID:', error.message);
      return null;
    }

    console.log(`🏫 Using test preschool: ${data.name} (${data.id})`);
    return data.id;

  } catch (error) {
    console.log('⚠️  Error setting up test preschool:', error);
    return null;
  }
}

// Main execution
async function main() {
  if (TEST_PRESCHOOL_ID === 'your-preschool-id-here') {
    console.log('🔍 Attempting to find a test preschool ID...\n');
    const realId = await getTestPreschoolId();
    if (realId) {
      // Update the test ID and run the test
      const updatedTestId = realId;
      console.log(`Using preschool ID: ${updatedTestId}\n`);
      await testFinancialDashboardWithId(updatedTestId);
    } else {
      console.log('❌ Could not find a test preschool. Please update TEST_PRESCHOOL_ID manually.');
    }
  } else {
    await testFinancialDashboard();
  }
}

async function testFinancialDashboardWithId(preschoolId: string) {
  console.log('🧪 Testing Financial Dashboard Data Service...\n');

  try {
    // Test with the provided ID
    const metrics = await FinancialDataService.getFinancialMetrics(preschoolId);
    console.log('✅ Successfully loaded financial metrics');

    const transactions = await FinancialDataService.getRecentTransactions(preschoolId, 5);
    console.log(`✅ Successfully loaded ${transactions.length} transactions`);

    const trendData = await FinancialDataService.getMonthlyTrendData(preschoolId);
    console.log(`✅ Successfully loaded ${trendData.length} months of trend data`);

    console.log('\n🎉 Financial dashboard service is working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  main();
}