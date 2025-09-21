const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Creating test payment transaction...');
  
  const transactionId = `TEST_${Date.now()}`;
  
  const testTransaction = {
    id: transactionId,
    amount: 150.00,
    currency: 'ZAR',
    status: 'pending',
    payment_method: 'payfast',
    school_id: null, // For user subscription
    user_id: 'test-user-id', // Test user
    metadata: {
      plan_tier: 'premium',
      billing: 'monthly'
    }
  };
  
  const { data, error } = await supabase
    .from('payment_transactions')
    .insert([testTransaction])
    .select();
  
  if (error) {
    console.error('Error creating transaction:', error);
  } else {
    console.log('Created transaction:', data[0]);
    console.log(`\\nNow test webhook with m_payment_id: ${transactionId}`);
    
    // Generate new test command with this transaction ID
    const crypto = require('crypto');
    
    const testData = {
      merchant_id: '10041710',
      merchant_key: 'fdqf15u93s7qi',
      m_payment_id: transactionId,
      pf_payment_id: `PF_${Date.now()}`,
      payment_status: 'COMPLETE',
      amount_gross: '150.00',
      item_name: 'Premium Plan',
      custom_str1: 'premium',
      custom_str2: 'user',
      custom_str3: 'test-user-id',
      custom_str4: '{"billing":"monthly","seats":1}'
    };
    
    // Generate signature
    const sortedKeys = Object.keys(testData).sort();
    const queryString = sortedKeys
      .map(key => `${key}=${encodeURIComponent(testData[key])}`)
      .join('&');
    const signatureString = queryString + '&passphrase=' + encodeURIComponent('SuperAdmin-EDU');
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');
    
    testData.signature = signature;
    
    const formData = Object.keys(testData)
      .map(key => `${key}=${encodeURIComponent(testData[key])}`)
      .join('&');
    
    console.log('\\nTest command:');
    console.log(`curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook \\\\`);
    console.log(`  -H "Content-Type: application/x-www-form-urlencoded" \\\\`);
    console.log(`  -d "${formData}" \\\\`);
    console.log(`  -w "\\\\nStatus: %{http_code}\\\\n"`);
  }
})();
