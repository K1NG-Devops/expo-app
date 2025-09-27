const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking PayFast ITN logs...');
  
  const { data, error } = await supabase
    .from('payfast_itn_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} PayFast ITN log entries:`);
    data.forEach(log => {
      console.log(`- ${log.created_at}: ${log.m_payment_id} (${log.payment_status}) - Valid: ${log.is_valid}`);
    });
  }

  // Also check payment transactions
  const { data: transactions, error: txError } = await supabase
    .from('payment_transactions')
    .select('id, status, amount, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('Transaction Error:', txError);
  } else {
    console.log(`\\nFound ${transactions.length} payment transactions:`);
    transactions.forEach(tx => {
      console.log(`- ${tx.created_at}: ${tx.id} (${tx.status}) - R${tx.amount}`);
    });
  }
})();
