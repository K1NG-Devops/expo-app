const crypto = require('crypto');

// PayFast sandbox credentials (override with env vars if set)
const merchantId = process.env.PAYFAST_MERCHANT_ID || '10041710';
const merchantKey = process.env.PAYFAST_MERCHANT_KEY || 'fdqf15u93s7qi';
const passphrase = process.env.PAYFAST_PASSPHRASE || 'SuperAdmin-EDU';

// Test transaction data
const testData = {
  merchant_id: merchantId,
  merchant_key: merchantKey,
  m_payment_id: `TEST_${Date.now()}`,
  pf_payment_id: `PF_${Date.now()}`,
  payment_status: 'COMPLETE',
  amount_gross: '150.00',
  item_name: 'Premium Plan',
  custom_str1: 'premium',
  custom_str2: 'user',
  custom_str3: 'test-user-id',
  custom_str4: '{"billing":"monthly","seats":1}'
};

// Generate signature (PayFast method)
function generateSignature(data, passphrase) {
  // Preserve field order and use RFC1738 encoding (spaces '+', uppercase percent-hex)
  const encodeRFC1738 = (v) => encodeURIComponent(v)
    .replace(/%20/g, '+')
    .replace(/%[0-9a-f]{2}/g, (m) => m.toUpperCase());

  const orderedQs = Object.keys(data)
    .map(key => `${key}=${encodeRFC1738(data[key])}`)
    .join('&');

  // Add passphrase
  const signatureString = orderedQs + `&passphrase=${encodeRFC1738(passphrase)}`;

  // Generate MD5 hash
  const signature = crypto.createHash('md5').update(signatureString).digest('hex');

  return signature;
}

const signature = generateSignature(testData, passphrase);
console.log('Generated signature:', signature);

// Add signature to data
testData.signature = signature;

// Build curl command
const formData = Object.keys(testData)
  .map(key => `${key}=${encodeURIComponent(testData[key])}`)
  .join('&');

console.log('\nTest with proper signature:');
console.log(`curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/payfast-webhook \\
  -H "Content-Type: application/x-www-form-urlencoded" \\
  -d "${formData}" \\
  -w "\\nStatus: %{http_code}\\n"`);
