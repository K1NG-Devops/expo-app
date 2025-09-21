const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://lvvvjywrmpcqrpvuptdi.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking preschools table schema...');
  
  const { data, error } = await supabase
    .from('preschools')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    if (data.length > 0) {
      console.log('Preschools table fields:', Object.keys(data[0]));
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    } else {
      console.log('No preschools found.');
    }
  }
})();
