#!/bin/bash

# Test WhatsApp function with minimal payload

ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2dnZqeXdybXBjcXJwdnVwdGRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwMzc4MzgsImV4cCI6MjA2ODYxMzgzOH0.mjXejyRHPzEJfMlhW46TlYI0qw9mtoSRJZhGsCkuvd8"

# The error log shows an authenticated user ID: a1fd12d2-5f09-4a23-822d-f3071bfc544b
# Let's test with a simple phone number request

echo "Testing WhatsApp send function..."
echo ""

curl -X POST https://lvvvjywrmpcqrpvuptdi.supabase.co/functions/v1/whatsapp-send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "apikey: ${ANON_KEY}" \
  -d '{
    "message_type": "text",
    "phone_number": "+12025551234",
    "content": "Test message"
  }' \
  -v 2>&1 | grep -E "(< HTTP|< |{|})"