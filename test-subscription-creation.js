const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Creating new test transaction and testing subscription creation...');
  
  // Get premium plan
  const { data: premiumPlan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('tier', 'premium')
    .single();
  
  const transactionId = `TEST_${Date.now()}`;
  
  // Create transaction for user subscription
  const testTransaction = {
    id: transactionId,
    school_id: null,
    subscription_plan_id: premiumPlan.id,
    amount: 150.00,
    currency: 'ZAR',
    status: 'pending',
    payment_method: 'payfast',
    metadata: {
      scope: 'user',
      billing: 'monthly',
      seats: 1
    }
  };
  
  const { error: insertError } = await supabase
    .from('payment_transactions')
    .insert([testTransaction]);
  
  if (insertError) {
    console.error('Error creating transaction:', insertError);
    return;
  }
  
  console.log(`Created transaction: ${transactionId}`);
  
  // Simulate PayFast webhook
  console.log('Simulating PayFast webhook...');
  
  const webhookData = new URLSearchParams({
    merchant_id: '10041710',
    merchant_key: 'fdqf15u93s7qi',
    m_payment_id: transactionId,
    pf_payment_id: `PF_${Date.now()}`,
    payment_status: 'COMPLETE',
    amount_gross: '150.00',
    item_name: 'Premium Plan',
    custom_str1: 'premium',
    custom_str2: 'user',
    custom_str3: 'test-user-123',
    custom_str4: '{"billing":"monthly","seats":1}',
    signature: 'test'
  });
  
  const response = await fetch('https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: webhookData
  });
  
  const result = await response.text();
  console.log(`Webhook response: ${response.status} - ${result}`);
  
  if (response.status === 200) {
    console.log('\\n✅ Webhook processed successfully!');
    
    // Check if subscription was created
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('owner_type', 'user');
    
    console.log(`\\nFound ${subscriptions?.length || 0} user subscriptions:`);
    if (subscriptions && subscriptions.length > 0) {
      const latest = subscriptions[subscriptions.length - 1];
      console.log('Latest subscription:', JSON.stringify(latest, null, 2));
    }
  }
})();
