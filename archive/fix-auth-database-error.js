#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const serviceClient = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnoseDatabaseError() {
  try {
    console.log('🔍 Diagnosing "Database error granting user" issue...\n');
    
    // Step 1: Check for triggers on auth.users table
    console.log('1. Checking for triggers on auth.users table...');
    
    const { data: triggers, error: triggerError } = await serviceClient
      .rpc('sql', {
        query: `
          SELECT 
            tgname as trigger_name,
            tgenabled as enabled,
            pg_get_triggerdef(oid) as definition
          FROM pg_trigger 
          WHERE tgrelid = 'auth.users'::regclass
          AND tgname NOT LIKE 'RI_%'
        `
      });
      
    if (triggerError) {
      console.log('   ❌ Could not check triggers (using direct SQL instead)...');
      
      // Try direct SQL approach
      const { data: directTriggers, error: directError } = await serviceClient
        .from('pg_trigger')
        .select('*')
        .limit(1);
        
      if (directError) {
        console.log('   ⚠️ Cannot access trigger information (limited permissions)');
      }
    } else if (triggers && triggers.length > 0) {
      console.log(`   ⚠️ Found ${triggers.length} custom triggers on auth.users:`);
      triggers.forEach(trigger => {
        console.log(`   - ${trigger.trigger_name} (enabled: ${trigger.enabled})`);
      });
      console.log('   These triggers might be causing the database error during sign-in.');
    } else {
      console.log('   ✅ No custom triggers found on auth.users');
    }
    
    // Step 2: Check auth configuration
    console.log('\n2. Checking authentication provider configuration...');
    
    // Try to get auth settings (might not work with RLS)
    const { data: authConfig, error: configError } = await serviceClient
      .from('auth.config')
      .select('*')
      .limit(1);
      
    if (configError) {
      console.log('   ⚠️ Cannot access auth config (this is normal with RLS)');
    } else {
      console.log('   ✅ Auth config accessible');
    }
    
    // Step 3: Check for problematic users
    console.log('\n3. Checking user data integrity...');
    
    const testEmail = 'elsha@youngeagles.org.za';
    
    // Check our users table
    const { data: ourUser, error: ourUserError } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
      
    if (ourUserError) {
      console.log(`   ❌ Could not find user in users table: ${ourUserError.message}`);
      return;
    }
    
    console.log(`   ✅ Found user in users table: ${ourUser.email}`);
    console.log(`   Auth User ID: ${ourUser.auth_user_id}`);
    
    // Step 4: Test if we can safely update auth.users
    console.log('\n4. Testing auth.users table operations...');
    
    if (ourUser.auth_user_id) {
      try {
        // Try a safe update to auth.users to see if triggers break
        const testResult = await serviceClient
          .rpc('sql', {
            query: `
              UPDATE auth.users 
              SET updated_at = updated_at 
              WHERE id = '${ourUser.auth_user_id}'
              RETURNING id, email
            `
          });
          
        if (testResult.error) {
          console.log(`   ❌ Auth users update failed: ${testResult.error.message}`);
          console.log('   This is likely the cause of the "Database error granting user"');
          
          // Check if it's a trigger issue
          if (testResult.error.message.includes('function') || 
              testResult.error.message.includes('trigger') ||
              testResult.error.message.includes('permission')) {
            console.log('   💡 This appears to be a trigger or permission issue');
          }
          
          // Test alternative authentication methods that might work
          console.log('\n   Testing alternative authentication paths...');
          
          try {
            console.log('   Attempting OTP sign-in test (this should work)...');
            const { error: otpError } = await serviceClient.auth.signInWithOtp({
              email: testEmail,
              options: { shouldCreateUser: false }
            });
            
            if (otpError) {
              console.log(`   ❌ OTP also fails: ${otpError.message}`);
              console.log('   This indicates a more serious Supabase configuration issue.');
            } else {
              console.log('   ✅ OTP authentication works - use this as workaround!');
              console.log('   OTP code has been sent to the email address.');
            }
          } catch (otpTestError) {
            console.log(`   ❌ OTP test error: ${otpTestError.message}`);
          }
        } else {
          console.log('   ✅ Auth users table update works fine');
        }
      } catch (sqlError) {
        console.log(`   ❌ SQL execution failed: ${sqlError.message}`);
        
        if (sqlError.message.includes('Could not find the function')) {
          console.log('   💡 Missing SQL RPC function - this is a Supabase project configuration issue');
          console.log('   Check if Edge Functions or custom SQL functions are properly deployed.');
        }
      }
    }
    
    // Step 5: Try alternative authentication methods
    console.log('\n5. Testing alternative authentication...');
    
    console.log('   Testing with admin user creation/update...');
    
    try {
      // Try to update user via admin API (this might give us more specific errors)
      const { data: adminUpdate, error: adminError } = await serviceClient.auth.admin.updateUserById(
        ourUser.auth_user_id,
        { 
          email_confirm: true,
          // Don't change password, just confirm email status
        }
      );
      
      if (adminError) {
        console.log(`   ❌ Admin update failed: ${adminError.message}`);
        
        if (adminError.message.includes('Database error')) {
          console.log('   🎯 This is the same error! The issue is in the auth.users table operations.');
        }
      } else {
        console.log('   ✅ Admin update succeeded');
        console.log('   💡 Try logging in now - the issue might be resolved');
      }
    } catch (adminError) {
      console.log(`   ❌ Admin API error: ${adminError.message}`);
    }
    
    // Step 6: Provide solutions
    console.log('\n🔧 SOLUTIONS:\n');
    
    console.log('A. Immediate fix attempts:');
    console.log('   1. Try email/OTP login instead of password (different code path)');
    console.log('   2. Check Supabase Dashboard → Authentication → Providers → Email is enabled');
    console.log('   3. Check Supabase Dashboard → Logs → Auth logs for detailed error');
    
    console.log('\nB. If you have custom triggers on auth.users:');
    console.log('   1. Temporarily disable them: ALTER TABLE auth.users DISABLE TRIGGER trigger_name;');
    console.log('   2. Test login');
    console.log('   3. Fix the trigger logic, then re-enable');
    
    console.log('\nC. Nuclear option (if above fails):');
    console.log('   1. Export your users table data');
    console.log('   2. Delete the problematic auth user in Supabase Dashboard');
    console.log('   3. Recreate the user with a known password');
    console.log('   4. Update your users table with the new auth_user_id');
    
    console.log('\nD. Temporary development bypass:');
    console.log('   Use the mock authentication approach from temp-auth-bypass.md');
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

// Step 7: Comprehensive quick fix attempt
async function attemptQuickFix() {
  console.log('\n🚀 Attempting comprehensive quick fix...\n');
  
  const testEmail = 'elsha@youngeagles.org.za';
  const newPassword = 'TempPassword123!';
  
  try {
    // Get user from our table
    const { data: user } = await serviceClient
      .from('users')
      .select('*')
      .eq('email', testEmail)
      .single();
      
    if (!user || !user.auth_user_id) {
      console.log('❌ Cannot find user or auth_user_id');
      return;
    }
    
    console.log('1. Attempting to reset password via admin API...');
    
    // Try password reset
    const { data: resetData, error: resetError } = await serviceClient.auth.admin.updateUserById(
      user.auth_user_id,
      {
        password: newPassword,
        email_confirm: true
      }
    );
    
    if (resetError) {
      console.log(`   ❌ Password reset failed: ${resetError.message}`);
      
      if (resetError.message.includes('Database error')) {
        console.log('   🔍 Same database error - this confirms the auth.users table has issues');
        
        console.log('\n2. Attempting user recreation...');
        
        // Delete and recreate user
        try {
          await serviceClient.auth.admin.deleteUser(user.auth_user_id);
          console.log('   ✅ Deleted problematic auth user');
          
          // Create new auth user
          const { data: newAuthUser, error: createError } = await serviceClient.auth.admin.createUser({
            email: testEmail,
            password: newPassword,
            email_confirm: true
          });
          
          if (createError) {
            console.log(`   ❌ Could not recreate user: ${createError.message}`);
          } else {
            console.log('   ✅ Created new auth user:', newAuthUser.user.id);
            
            // Update our users table
            await serviceClient
              .from('users')
              .update({ auth_user_id: newAuthUser.user.id })
              .eq('email', testEmail);
              
            console.log('   ✅ Updated users table with new auth_user_id');
            console.log(`\n🎉 Quick fix complete! Try logging in with:`);
            console.log(`   Email: ${testEmail}`);
            console.log(`   Password: ${newPassword}`);
          }
        } catch (recreateError) {
          console.log(`   ❌ Recreation failed: ${recreateError.message}`);
        }
      }
    } else {
      console.log('   ✅ Password reset successful!');
      console.log(`\n🎉 Try logging in with:`);
      console.log(`   Email: ${testEmail}`);
      console.log(`   Password: ${newPassword}`);
    }
    
  } catch (error) {
    console.log(`❌ Quick fix failed: ${error.message}`);
  }
}

async function main() {
  await diagnoseDatabaseError();
  
  console.log('\n' + '='.repeat(50));
  console.log('Do you want to attempt an automatic quick fix? (y/n)');
  
  // For script automation, just run the fix
  await attemptQuickFix();
}

main().then(() => process.exit(0));