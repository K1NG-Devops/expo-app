#!/usr/bin/env node

/**
 * Debug AI Proxy Integration
 * 
 * More detailed testing to understand why content is empty
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://lvvvjywrmpcqrpvuptdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8';

const TEST_EMAIL = 'superadmin@edudashpro.org.za';
const TEST_PASSWORD = '#Olivia@17';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugAIProxy() {
  console.log('🔍 Debugging AI Proxy Integration...\n');

  try {
    // Sign in
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    if (signInError || !authData.session?.access_token) {
      throw new Error(`Authentication failed: ${signInError?.message}`);
    }

    console.log('✅ Authenticated successfully\n');

    // Test with verbose request/response logging
    const testRequest = {
      scope: 'principal',
      service_type: 'lesson_generation',
      payload: {
        prompt: 'What is 2 + 2? Please provide a simple answer.',
        context: 'Basic arithmetic'
      },
      metadata: {
        test: true,
        debug: 'Simple math question'
      }
    };

    console.log('📤 Sending AI request...');
    console.log('Request payload:', JSON.stringify(testRequest, null, 2));

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(testRequest)
    });

    console.log('\n📥 Response received:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log('Headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const result = await response.json();
    console.log('\nResponse body:', JSON.stringify(result, null, 2));

    // Check if there are any usage logs created
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for logs to be written

    const { data: logs, error: logsError } = await supabase
      .from('ai_usage_logs')
      .select('*')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log('\n📊 Recent usage logs:');
    if (logsError) {
      console.log('Error fetching logs:', logsError);
    } else if (!logs || logs.length === 0) {
      console.log('No usage logs found');
    } else {
      logs.forEach((log, i) => {
        console.log(`\n${i + 1}. Usage Log:`);
        console.log(`   ID: ${log.id}`);
        console.log(`   Service: ${log.service_type}`);
        console.log(`   Status: ${log.status}`);
        console.log(`   Created: ${log.created_at}`);
        console.log(`   Input Tokens: ${log.input_tokens || 'N/A'}`);
        console.log(`   Output Tokens: ${log.output_tokens || 'N/A'}`);
        console.log(`   Total Cost: ${log.total_cost || 'N/A'}`);
        console.log(`   Response Time: ${log.response_time_ms || 'N/A'}ms`);
        if (log.metadata) {
          console.log(`   Metadata:`, JSON.stringify(log.metadata, null, 4));
        }
      });
    }

    // Test a homework help request (different service type)
    console.log('\n🔄 Testing homework help request...');
    
    const homeworkRequest = {
      scope: 'parent',
      service_type: 'homework_help',
      payload: {
        prompt: 'My child needs help with basic addition. Can you explain 5 + 3?'
      }
    };

    const hwResponse = await fetch(`${SUPABASE_URL}/functions/v1/ai-proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authData.session.access_token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(homeworkRequest)
    });

    const hwResult = await hwResponse.json();
    console.log(`Homework help response status: ${hwResponse.status}`);
    console.log('Content length:', hwResult.content?.length || 0);
    
    if (hwResult.content && hwResult.content.length > 0) {
      console.log('✅ Content received! Preview:', hwResult.content.substring(0, 100));
    } else {
      console.log('⚠️  Still no content received');
    }

    await supabase.auth.signOut();

  } catch (_error) {
    console._error('❌ Debug failed:', _error);
  }
}

debugAIProxy().catch(console.error);