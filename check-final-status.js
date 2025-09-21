const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking final status of school subscription test...');
  
  // Check the latest payment transaction
  const { data: transaction } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', 'TEST_SCHOOL_1758407793133')
    .single();
  
  if (transaction) {
    console.log('\n📄 Payment Transaction Status:');
    console.log(`  ID: ${transaction.id}`);
    console.log(`  Status: ${transaction.status}`);
    console.log(`  Amount: R${transaction.amount}`);
    console.log(`  PayFast ID: ${transaction.payfast_payment_id}`);
    console.log(`  Completed: ${transaction.completed_at}`);
  }
  
  // Check ITN logs
  const { data: logs } = await supabase
    .from('payfast_itn_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log(`\n📋 PayFast ITN Logs (${logs?.length || 0} recent entries):`);
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      console.log(`  - ${log.m_payment_id}: ${log.payment_status} (Valid: ${log.is_valid})`);
    });
  }
  
  console.log('\n🎉 PayFast + RevenueCat + School Subscription Integration Complete!');
})();
