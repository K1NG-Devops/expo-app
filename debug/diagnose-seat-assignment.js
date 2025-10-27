#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function diagnoseSeatingIssues() {
  console.log('🔍 Diagnosing seat assignment and user table issues...\n');
  
  const youngEaglesId = 'ba79097c-1b93-4b48-bcbe-df73878ab4d1';
  
  // 1. Check subscription seats
  console.log('1. Checking subscription seats...');
  try {
    const { data: seats, error } = await supabase
      .from('subscription_seats')
      .select('*');
    
    if (error) {
      console.log('❌ Error fetching subscription seats:', error.message);
    } else {
      console.log(`✅ Found ${seats.length} seat assignments:`);
      seats.forEach(seat => {
        console.log(`   - User: ${seat.user_id}, Subscription: ${seat.subscription_id}`);
        console.log(`     Assigned: ${seat.assigned_at}`);
      });
    }
  } catch (_e) {
    console.log('❌ Subscription seats error:', _e.message);
  }

  // 2. Check users table structure
  console.log('\n2. Checking users table structure...');
  try {
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'users')
      .eq('table_schema', 'public')
      .order('ordinal_position');
      
    if (error) {
      console.log('❌ Error checking users table:', error.message);
    } else {
      console.log('✅ Users table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    }
  } catch (_e) {
    console.log('❌ Users table check error:', _e.message);
  }

  // 3. Check profiles table structure (if exists)
  console.log('\n3. Checking profiles table structure...');
  try {
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'profiles')
      .eq('table_schema', 'public')
      .order('ordinal_position');
      
    if (error && error.code !== 'PGRST116') {
      console.log('❌ Error checking profiles table:', error.message);
    } else if (columns && columns.length > 0) {
      console.log('✅ Profiles table columns:');
      columns.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️  Profiles table not found or empty');
    }
  } catch (_e) {
    console.log('❌ Profiles table check error:', _e.message);
  }

  // 4. Check teacher users
  console.log('\n4. Checking teacher users...');
  try {
    // Try users table first
    const { data: teacherUsers, error: userError } = await supabase
      .from('users')
      .select('id, auth_user_id, email, name, role, preschool_id')
      .eq('preschool_id', youngEaglesId)
      .eq('role', 'teacher');
      
    if (userError) {
      console.log('❌ Error fetching teacher users:', userError.message);
    } else {
      console.log(`✅ Found ${teacherUsers.length} teachers in users table:`);
      teacherUsers.forEach(teacher => {
        console.log(`   - ${teacher.email}: ${teacher.name || 'No name'} (${teacher.id})`);
      });
    }

    // Try profiles table as fallback
    const { data: teacherProfiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, role, preschool_id')
      .eq('preschool_id', youngEaglesId)
      .eq('role', 'teacher');
      
    if (profileError && profileError.code !== 'PGRST116') {
      console.log('❌ Error fetching teacher profiles:', profileError.message);
    } else if (teacherProfiles && teacherProfiles.length > 0) {
      console.log(`✅ Found ${teacherProfiles.length} teachers in profiles table:`);
      teacherProfiles.forEach(teacher => {
        console.log(`   - ${teacher.email}: ${teacher.first_name || ''} ${teacher.last_name || ''} (${teacher.id})`);
      });
    }
  } catch (_e) {
    console.log('❌ Teacher users check error:', _e.message);
  }

  // 5. Check subscription status and seat count
  console.log('\n5. Checking subscription status...');
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id, seats_total, seats_used, status')
      .eq('school_id', youngEaglesId)
      .eq('status', 'active')
      .single();
      
    if (error) {
      console.log('❌ Error fetching subscription:', error.message);
    } else {
      console.log('✅ Subscription status:');
      console.log(`   - ID: ${subscription.id}`);
      console.log(`   - Seats: ${subscription.seats_used}/${subscription.seats_total}`);
      console.log(`   - Status: ${subscription.status}`);
    }
  } catch (_e) {
    console.log('❌ Subscription check error:', _e.message);
  }

  console.log('\n🔧 Potential Issues & Solutions:');
  console.log('1. If users table missing first_name/last_name: Add columns or use profiles table');
  console.log('2. If seats_used not updating: Check trigger on subscription_seats table');
  console.log('3. If teacher dashboard not updating: Check subscription detection logic');
  console.log('4. If principal dashboard wrong counts: Check seat counting queries');
}

diagnoseSeatingIssues().catch(console.error);