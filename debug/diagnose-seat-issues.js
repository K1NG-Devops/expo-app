#!/usr/bin/env node

// Comprehensive diagnosis of seat management issues
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('🔍 Comprehensive Seat Management Diagnosis...\n');

  // 1. Check subscriptions table structure and data
  console.log('1. Checking subscriptions...');
  try {
    const { data, error } = await supabase.from('subscriptions').select('*');
    if (error) {
      console.log('❌ Error fetching subscriptions:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} subscriptions:`);
      data?.forEach(sub => {
        console.log(`   - ID: ${sub.id}, Owner: ${sub.owner_type}, School: ${sub.school_id}, Status: ${sub.status}, Seats: ${sub.seats_used}/${sub.seats_total}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscriptions:', _e.message);
  }

  // 2. Check subscription_seats table
  console.log('\n2. Checking subscription_seats...');
  try {
    const { data, error } = await supabase.from('subscription_seats').select('*');
    if (error) {
      console.log('❌ Error fetching subscription_seats:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} seat assignments:`);
      data?.forEach(seat => {
        console.log(`   - Subscription: ${seat.subscription_id}, User: ${seat.user_id}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscription_seats:', _e.message);
  }

  // 3. Check users table
  console.log('\n3. Checking users table...');
  try {
    const { data, error } = await supabase.from('users').select('*').limit(5);
    if (error) {
      console.log('❌ Error fetching users:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} users (showing first 5):`);
      data?.forEach(user => {
        console.log(`   - ID: ${user.id || user.auth_user_id}, Email: ${user.email}, Role: ${user.role}, School: ${user.preschool_id}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking users table:', _e.message);
  }

  // 4. Check profiles table
  console.log('\n4. Checking profiles table...');
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(5);
    if (error) {
      console.log('❌ Error fetching profiles:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} profiles (showing first 5):`);
      data?.forEach(profile => {
        console.log(`   - ID: ${profile.id}, Email: ${profile.email}, Role: ${profile.role}, School: ${profile.preschool_id}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking profiles table:', _e.message);
  }

  // 5. Check preschools table
  console.log('\n5. Checking preschools table...');
  try {
    const { data, error } = await supabase.from('preschools').select('*').limit(5);
    if (error) {
      console.log('❌ Error fetching preschools:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} preschools (showing first 5):`);
      data?.forEach(school => {
        console.log(`   - ID: ${school.id}, Name: ${school.name || school.tenant_slug}, Status: ${school.is_active}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking preschools table:', _e.message);
  }

  // 6. Check subscription_plans table (related to superadmin error)
  console.log('\n6. Checking subscription_plans table...');
  try {
    const { data, error } = await supabase.from('subscription_plans').select('*');
    if (error) {
      console.log('❌ Error fetching subscription_plans:', error.message);
    } else {
      console.log(`✅ Found ${data?.length || 0} subscription plans:`);
      data?.forEach(plan => {
        console.log(`   - ID: ${plan.id}, Name: ${plan.name}, Monthly: ${plan.price_monthly}, Annual: ${plan.price_annual}`);
      });
    }
  } catch (_e) {
    console.log('❌ Exception checking subscription_plans table:', _e.message);
  }

  // 7. Check RLS policies on key tables
  console.log('\n7. Checking RLS policies...');
  try {
    const { data, error } = await supabase.rpc('get_table_rls_status');
    if (error) {
      console.log('❌ Error checking RLS status:', error.message);
    } else {
      console.log('✅ RLS status retrieved');
    }
  } catch (_e) {
    console.log('❌ RLS check not available (expected)');
  }

  // 8. Test specific seat management query
  console.log('\n8. Testing seat management queries...');
  try {
    // Try to find a school ID first
    const { data: schools } = await supabase.from('preschools').select('id').limit(1);
    if (schools && schools.length > 0) {
      const schoolId = schools[0].id;
      console.log(`   Testing with school ID: ${schoolId}`);
      
      // Test teachers query
      const { data: teachers, error: teacherErr } = await supabase
        .from('profiles')
        .select('id,email,role,preschool_id')
        .eq('preschool_id', schoolId)
        .eq('role', 'teacher');
      
      if (teacherErr) {
        console.log('   ❌ Error fetching teachers:', teacherErr.message);
      } else {
        console.log(`   ✅ Found ${teachers?.length || 0} teachers for this school`);
      }

      // Test subscription query
      const { data: subs, error: subErr } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('owner_type', 'school')
        .eq('school_id', schoolId)
        .eq('status', 'active');
      
      if (subErr) {
        console.log('   ❌ Error fetching subscription:', subErr.message);
      } else {
        console.log(`   ✅ Found ${subs?.length || 0} active subscriptions for this school`);
      }
    } else {
      console.log('   ⚠️ No schools found to test with');
    }
  } catch (_e) {
    console.log('   ❌ Exception testing queries:', _e.message);
  }

  console.log('\n🔧 Summary and Recommendations:');
  console.log('1. If "No Teachers Found": Check if teachers exist in profiles/users tables');
  console.log('2. If seat count mismatch: Check subscription_seats trigger updates');
  console.log('3. If 500 errors: Check RLS policies and table permissions');
  console.log('4. If 400 errors: Check subscription_plans table structure');
}

diagnose().catch(console.error);