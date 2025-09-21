const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking transaction status...');
  
  const { data, error } = await supabase
    .from('payment_transactions')
    .select('*')
    .eq('id', 'TEST_1758407093579')
    .single();
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Transaction status:', JSON.stringify(data, null, 2));
  }
  
  // Also check recent ITN logs
  const { data: logs } = await supabase
    .from('payfast_itn_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);
  
  console.log(`\nFound ${logs?.length || 0} recent ITN logs`);
  if (logs && logs.length > 0) {
    logs.forEach(log => {
      console.log(`- ${log.m_payment_id}: ${log.payment_status} (${log.processing_notes})`);
    });
  }
})();
